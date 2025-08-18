// utils/parse.ts
import { supabase } from './supabaseClient';
import { Candidat, InsertCandidatResult } from './types';
import { extractCVData } from './extractCVData';

export async function insertCandidatData(candidat: Candidat): Promise<InsertCandidatResult> {
  try {
    const { data: insertedCandidat, error } = await supabase
      .from('candidats')
      .insert(candidat)
      .select()
      .single();

    if (error) throw error;
    return { success: true, candidatId: insertedCandidat.id };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}

export async function processCV(fileBuffer: Buffer, fileName: string): Promise<InsertCandidatResult> {
  try {
    const candidat = await extractCVData(fileBuffer, fileName);
    return await insertCandidatData(candidat);
  } catch (error) {
    return { success: false, error: error as Error };
  }
}
