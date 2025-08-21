import { createClient } from "npm:@supabase/supabase-js@2.39.3";

Deno.serve(async (req: Request) => {
  // Vérifier que c'est un appel interne
  if (req.headers.get('x-supabase-trigger') !== 'true') {
    return new Response('Unauthorized', { status: 403 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!, 
    Deno.env.get('SUPABASE_ANON_KEY')!
  );

  try {
    const payload = await req.json();
    const { bucket, object } = payload;

    // Vérifier que c'est bien le bon bucket
    if (bucket !== 'truthtalent') {
      return new Response('Wrong bucket', { status: 400 });
    }

    // URL du fichier dans le storage
    const fileUrl = object.key;

    // Extraire l'extension
    const extension = fileUrl.split('.').pop().toLowerCase();
    const allowedExtensions = ['pdf', 'docx', 'doc', 'txt'];

    if (!allowedExtensions.includes(extension)) {
      console.log(`Unsupported file type: ${extension}`);
      return new Response('Unsupported file type', { status: 400 });
    }

    // Appeler la fonction d'extraction de CV
    const extractResponse = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/extract-resume`, 
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
        },
        body: JSON.stringify({ 
          file_url: fileUrl,
          user_id: object.owner // Supposant que l'owner est l'utilisateur qui a uploadé
        })
      }
    );

    const result = await extractResponse.json();

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Resume upload handling error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});