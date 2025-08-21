// supabase/functions/extract-resume-text/index.ts


// Variables d'environnement
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  try {
    const { filePath } = await req.json();
    console.log("➡️ Fichier reçu:", filePath);

    // 1️⃣ Téléchargement
    const { data: dl, error } = await supabase.storage
      .from("truthtalent")
      .download(filePath);

    if (error || !dl) {
      console.error("❌ Erreur download:", error);
      return new Response(JSON.stringify({ error: "Erreur téléchargement" }), { status: 400 });
    }

    const text = await dl.text();

    // 2️⃣ Extraction simple
    const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? null;
    const telephone = text.match(/(\+?\d[\d .-]{7,}\d)/)?.[0] ?? null;

    const firstLine = text.split("\n")[0].trim();
    let [prenom, nom] = firstLine.split(" ");
    if (!nom) {
      nom = prenom ?? null;
      prenom = null;
    }

    console.log("📌 Extraction:", { nom, prenom, email, telephone });

    // 3️⃣ Insert table
    const { error: insertError } = await supabase.from("candidats").insert([
      { nom, prenom, email, telephone, cv_url: filePath },
    ]);

    if (insertError) {
      console.error("❌ Erreur insert:", insertError);
      return new Response(JSON.stringify({ error: "Erreur insertion" }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true, nom, prenom, email, telephone }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("❌ Exception:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
