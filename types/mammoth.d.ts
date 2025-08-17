// types/mammoth.d.ts
declare module 'mammoth' {
  export function extractRawText(options: { buffer: Buffer }): Promise<{ value: string }>;
  // Ajoutez d'autres exports si nécessaire
}
