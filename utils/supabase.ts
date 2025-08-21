import { createClient } from '@supabase/supabase-js';
import { Candidat, Experience, InsertCandidatResult } from './types';

export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export async function insertCandidatData(candidat: Candidat): Promise<InsertCandidatResult> {
  try {
    // 1. Insérer dans 'candidats'
    const { data: insertedCandidat, error: candidatError } = await supabase
      .from('candidats')
      .insert(candidat)
      .select()
      .single();

    if (candidatError) throw new Error(candidatError.message);

    // 2. Insérer les expériences dans 'jobs' (si le tableau n'est pas vide)
    if (candidat.experiences && candidat.experiences.length > 0) {
      const jobsData = candidat.experiences.map((exp: Experience) => ({
        poste: exp.poste,
        description: exp.description,
        entreprise: exp.entreprise,
        periode: exp.periode,
        candidat_id: insertedCandidat.id,
      }));
      const { error: jobsError } = await supabase.from('jobs').insert(jobsData);
      if (jobsError) console.error('Erreur insertion jobs:', jobsError.message);
    }

    // 3. Insérer les compétences dans 'skills' (si le tableau n'est pas vide)
    if (candidat.competences && candidat.competences.length > 0) {
      const skillsData = candidat.competences.map((competence: string) => ({
        nom: competence,
        candidat_id: insertedCandidat.id,
      }));
      const { error: skillsError } = await supabase.from('skills').insert(skillsData);
      if (skillsError) console.error('Erreur insertion skills:', skillsError.message);
    }

    return { success: true, candidatId: insertedCandidat.id };
  } catch (error) {
    console.error('Erreur globale:', error);
    return { success: false, error: error as Error };
  }
}
