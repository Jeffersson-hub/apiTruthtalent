import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import axios from 'axios';
import { extractInfoFromText } from './extractInfo'; // On le crée à part

async function extractTextFromPDF(url: string): Promise<string> {
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  const data = await pdfParse(response.data);
  return data.text;
}

async function extractTextFromDOCX(url: string): Promise<string> {
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  const result = await mammoth.extractRawText({ buffer: response.data });
  return result.value;
}

export async function extractCVData(fileUrl: string): Promise<any> {
  let text = '';

  try {
    if (fileUrl.endsWith('.pdf')) {
      text = await extractTextFromPDF(fileUrl);
    } else if (fileUrl.endsWith('.docx') || fileUrl.endsWith('.doc')) {
      text = await extractTextFromDOCX(fileUrl);
    } else {
      throw new Error('Unsupported file type');
    }

    const extractedData = extractInfoFromText(text); // ici on appelle les fonctions de parsing
    return {
      ...extractedData,
      fichier_cv_url: fileUrl,
    };
  } catch (error) {
    console.error('Error parsing CV:', error);
    return null;
  }
}
