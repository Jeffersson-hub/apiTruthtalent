//api/lib/extractCVData.ts

import fs from "fs";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import textract from "textract";

/**
 * Analyse un fichier (PDF, DOCX, DOC) et retourne les données structurées
 */
export async function extractCVData(buffer: Buffer<ArrayBuffer>, filePath: string): Promise<any> {
  const ext = filePath.split('.').pop()?.toLowerCase();
  let rawText = '';

  if (ext === 'pdf') {
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    rawText = data.text;
  } else if (ext === 'docx') {
    const buffer = fs.readFileSync(filePath);
    const result = await mammoth.extractRawText({ buffer });
    rawText = result.value;
  } else if (ext === 'doc') {
    rawText = await new Promise((resolve, reject) => {
      textract.fromFileWithPath(filePath, (error, result) => {
        if (error) reject(error);
        else resolve(result);
      });
    }) as string;
  } else {
    throw new Error("Format non supporté");
  }

  return parseText(rawText);
}

/**
 * Transforme un texte brut en objet structuré (candidat)
 */
function parseText(text: string) {
  return {
    nom: guessNom(text),
    prenom: guessPrenom(text),
    email: extractEmail(text),
    telephone: extractTelephone(text),
    adresse: extractAdresse(text),
    linkedin: extractLinkedIn(text),
    portfolio: extractPortfolio(text),
    competences: extractCompetences(text),
    experiences: extractExperiences(text),
    autres: {
      texte_complet: text.slice(0, 5000)
    }
  };
}

// --- Fonctions d'extraction simples ---

function extractEmail(text: string): string | null {
  const match = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/);
  return match ? match[0] : null;
}

function extractTelephone(text: string): string | null {
  const match = text.match(/(\+33|0)[1-9](\s?\d{2}){4}/);
  return match ? match[0] : null;
}

function extractLinkedIn(text: string): string | null {
  const match = text.match(/https?:\/\/(www\.)?linkedin\.com\/[^\s)]+/);
  return match ? match[0] : null;
}

function extractPortfolio(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s]+\.(dev|me|com|io)/);
  return match ? match[0] : null;
}

// À améliorer avec NLP ou heuristiques
function guessNom(text: string) { return null; }
function guessPrenom(text: string) { return null; }
function extractAdresse(text: string) { return null; }
function extractCompetences(text: string): string[] { return []; }
function extractExperiences(text: string): string[] { return []; }
