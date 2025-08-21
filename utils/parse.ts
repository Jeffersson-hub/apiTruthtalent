// utils/parse.ts

import { error } from "console";
import { ResumeParser } from "./resumeParser";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

const resumeParser = new ResumeParser();

export async function parseCV(fileBuffer: Buffer, fileName: string) {
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

    if (error) throw error;

    return { success: true };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}
function createClient(arg0: string, arg1: string) {
  throw new Error("Function not implemented.");
}

