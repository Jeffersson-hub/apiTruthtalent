// utils/resumeParser.ts
import * as mammoth from 'mammoth';
import { Buffer } from 'buffer';
import { getDocument } from 'pdfjs-dist';

// Désactivez les fonctionnalités qui nécessitent le DOM
// getDocument.disableWorker = true;

// Fonction utilitaire pour convertir Buffer en ArrayBuffer
function bufferToArrayBuffer(buffer: Buffer): ArrayBuffer {
  const arrayBuffer = new ArrayBuffer(buffer.length);
  const view = new Uint8Array(arrayBuffer);
  for (let i = 0; i < buffer.length; ++i) {
    view[i] = buffer[i];
  }
  return arrayBuffer;
}

// Interface pour les parseurs de fichiers
interface FileParser {
  supportedExtensions: string[];
  parse: (buffer: Buffer) => Promise<string>;
}

// Parseur PDF
const pdfParser: FileParser = {
  supportedExtensions: ['.pdf'],
  parse: async (buffer: Buffer): Promise<string> => {
    const arrayBuffer = bufferToArrayBuffer(buffer);
    const typedArray = new Uint8Array(arrayBuffer);

    try {
      const loadingTask = getDocument(typedArray);
      const pdf = await loadingTask.promise;

      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
        .map((item: any) => {
          if ('str' in item) {
            return item.str;
          }
          return '';
        })
        .join(' ');

        fullText += pageText + '\n';
      }
      return fullText;
    } catch (error) {
      console.error('Erreur lors de l\'extraction du PDF:', error);
      throw new Error('Erreur lors de l\'extraction du PDF');
    }
  }
};

// Parseur DOCX
const docxParser: FileParser = {
  supportedExtensions: ['.docx', '.doc'],
  parse: async (buffer: Buffer): Promise<string> => {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
};

// Parseur TXT
const txtParser: FileParser = {
  supportedExtensions: ['.txt'],
  parse: async (buffer: Buffer): Promise<string> => {
    return buffer.toString('utf8');
  }
};

// Liste des parseurs
const fileParsers: FileParser[] = [pdfParser, docxParser, txtParser];

// Classe ResumeParser
export class ResumeParser {
  [x: string]: any;


  // Extraction des compétences
  extractSkills(text: string): string[] {
    const tokens = this.tokenizer.tokenize(text.toLowerCase());
    const stemmedTokens = tokens.map((token: any) => this.stemmer.stem(token));

    const skillTaxonomy = [
      'python', 'javascript', 'typescript', 'react', 'node', 'sql',
      'machine learning', 'data science', 'aws', 'azure', 'gcp',
      'docker', 'kubernetes', 'git', 'linux', 'tensorflow',
      'pytorch', 'spark', 'hadoop', 'c++', 'java', 'scala',
      'communication', 'leadership', 'teamwork', 'problem solving',
      'critical thinking', 'adaptability', 'creativity', 'time management',
      'agile', 'scrum', 'project management', 'ui/ux', 'design',
      'marketing', 'sales', 'customer service'
    ];

    return skillTaxonomy.filter(skill =>
      skill.split(' ').some(word =>
        stemmedTokens.includes(this.stemmer.stem(word))
      )
    );
  }

  // Extraction des informations de contact
  extractContactInfo(text: string) {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
    const phoneRegex = /(\+\d{1,2}\s?)?(\(?\d{3}\)?[\s.-]?)?\d{3}[\s.-]?\d{4}/;
    const linkedInRegex = /https:\/\/www\.linkedin\.com\/in\/[a-zA-Z0-9-]+/;

    return {
      email: text.match(emailRegex)?.[0],
      phone: text.match(phoneRegex)?.[0],
      linkedin: text.match(linkedInRegex)?.[0]
    };
  }

  // Extraction des informations sur l'éducation
  extractEducation(text: string) {
    const educationKeywords = [
      'bachelor', 'master', 'phd', 'degree', 'university',
      'college', 'graduate', 'education'
    ];

    const educationSections = text.split(/\n/)
      .filter(line =>
        educationKeywords.some(keyword =>
          line.toLowerCase().includes(keyword)
        )
      );

    return educationSections.map(section => ({
      institution: section.split(',')[0].trim(),
      degree: educationKeywords.find(keyword =>
        section.toLowerCase().includes(keyword)
      ),
      year: section.match(/\d{4}/)?.[0]
    })).filter(edu => edu.institution);
  }

  // Extraction de l'expérience professionnelle
  extractWorkExperience(text: string) {
    const experienceKeywords = [
      'work experience', 'professional experience', 'employment',
      'job', 'position', 'company'
    ];

    const roles = text.split(/\n/)
      .filter(line =>
        experienceKeywords.some(keyword =>
          line.toLowerCase().includes(keyword)
        )
      );

    return roles.map(role => ({
      company: role.split(',')[0].trim(),
      position: role.split('-')[0].trim(),
      duration: role.match(/(\d{4}\s*-\s*\d{4}|\d{4}\s*-\s*present)/i)?.[0]
    })).filter(exp => exp.company);
  }

  // Calcul du score de confiance
  calculateConfidenceScore(parsedData: any): number {
    let score = 0;

    if (parsedData.contactInfo?.email) score += 20;
    if (parsedData.contactInfo?.phone) score += 15;
    if (parsedData.skills?.length > 0) score += 25;
    if (parsedData.education?.length > 0) score += 20;
    if (parsedData.workExperience?.length > 0) score += 20;

    return Math.min(Math.max(score, 0), 100);
  }

  // Extraction du texte en fonction du type de fichier
  async extractTextFromFile(buffer: Buffer, fileExtension: string): Promise<string> {
    const parser = fileParsers.find(p =>
      p.supportedExtensions.includes(`.${fileExtension.toLowerCase()}`)
    );

    if (!parser) {
      throw new Error(`Unsupported file type: .${fileExtension}`);
    }

    return parser.parse(buffer);
  }
}
