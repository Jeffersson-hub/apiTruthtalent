import { createClient } from 'npm:@supabase/supabase-js';

Deno.serve(async (req: Request) => {
  // Créer un client Supabase
  const supabase = createClient(
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  );

  // Données de test
  const testCandidat = {
    nom: 'Dupont',
    prenom: 'Jean',
    email: 'jean.dupont@example.com',
    telephone: '+33612345678',
    competences: ['Python', 'SQL', 'Machine Learning'],
    experience: JSON.stringify([
      { 
        entreprise: 'TechCorp', 
        poste: 'Data Scientist', 
        duree: '2020-2023' 
      }
    ]),
    formation: JSON.stringify([
      { 
        etablissement: 'Université Paris', 
        diplome: 'Master en Data Science', 
        annee: 2020 
      }
    ])
  };

  // Insérer le candidat
  const { data, error } = await supabase
    .from('candidats')
    .insert(testCandidat)
    .select();

  if (error) {
    console.error('Erreur insertion:', error);
    return new Response(JSON.stringify({ 
      status: 'error', 
      message: error.message 
    }), { status: 500 });
  }

  return new Response(JSON.stringify({ 
    status: 'success', 
    data: data 
  }), { 
    headers: { 'Content-Type': 'application/json' } 
  });
});