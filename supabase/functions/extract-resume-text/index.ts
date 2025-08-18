// supabase/functions/extract-resume/index.ts

/// <reference lib="deno.core" />
/// <reference lib="deno.unstable" />


import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { getDocument } from "https://esm.sh/pdfjs-dist@3.4.120/legacy/build/pdf.mjs";

serve(async (req) => {
  const headers = new Headers({
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  })

  try {
    const { fileName, bucketName = "truthtalent" } = await req.json()

    if (!fileName) {
      return new Response(JSON.stringify({ error: "fileName is required" }), { status: 400, headers })
    }

    // Connexion Supabase (Edge → Deno.env)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    // Téléchargement fichier
    const { data: fileData, error } = await supabase.storage
      .from(bucketName)
      .download(fileName)

    if (error || !fileData) {
      return new Response(JSON.stringify({ error: "Download failed", details: error?.message }), { status: 500, headers })
    }

    // Conversion ArrayBuffer pour PDF.js
    const arrayBuffer = await fileData.arrayBuffer()
    const typedArray = new Uint8Array(arrayBuffer)

    const pdf = await getDocument(typedArray).promise
    let fullText = ""

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      const pageText = textContent.items.map((it: any) => it.str ?? "").join(" ")
      fullText += pageText + "\n"
    }

    // Extraire infos
    const infos = extractInfos(fullText)

    // Insertion en BDD
    const { error: insertError } = await supabase
      .from("candidats")
      .insert([infos])

    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), { status: 500, headers })
    }

    return new Response(JSON.stringify({ text: fullText }), { headers })
  } catch (e) {
    return new Response(JSON.stringify({ error: req.message }), { status: 500, headers })
  }
})
