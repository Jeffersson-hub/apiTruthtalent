// utils/parse.ts@supabase/supabase-js
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { ResumeParser } from './resumeParser';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

const resumeParser = new ResumeParser();

export async function processCV(fileBuffer: Buffer, fileName: string) {
  try {
    const fileExtension = fileName.split('.').pop() || '';
    const extractedText = await resumeParser.extractTextFromFile(fileBuffer, fileExtension);

    const parsedData = {
      contactInfo: resumeParser.extractContactInfo(extractedText),
      skills: resumeParser.extractSkills(extractedText),
      education: resumeParser.extractEducation(extractedText),
      workExperience: resumeParser.extractWorkExperience(extractedText)
    };

    const confidenceScore = resumeParser.calculateConfidenceScore(parsedData);

    const { data: { publicUrl } } = supabase
      .storage
      .from('truthtalent')
      .getPublicUrl(`cvs/${fileName}`);

    const { data: insertedCandidat, error } = await supabase
      .from('candidats')
      .insert({
        full_name: parsedData.contactInfo?.email?.split('@')[0],
        email: parsedData.contactInfo?.email,
        phone: parsedData.contactInfo?.phone,
        skills: parsedData.skills,
        education: parsedData.education,
        work_experience: parsedData.workExperience,
        resume_url: publicUrl,
        confidence_score: confidenceScore
      })
      .select()
      .single();

    if (error) throw error;

    return { success: true, candidatId: insertedCandidat.id };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}
