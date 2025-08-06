const axios = require('axios');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const { parseOfficeAsync } = require('officeparser');

async function parseDocument(buffer, mimetype) {
  if (mimetype === 'application/pdf') {
    const data = await pdf(buffer);
    return data.text;
  } else if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } else if (
    mimetype === 'application/msword' ||
    mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    const result = await parseOfficeAsync(buffer);
    return result.text || '';
  } else {
    throw new Error('Type de fichier non pris en charge : ' + mimetype);
  }
}

async function parseBuffer(buffer) {
  // Identifier le type de fichier
  const isPdf = buffer.slice(0, 4).toString() === '%PDF';
  const isDocx = buffer.slice(0, 2).toString('hex') === '504b'; // ZIP header

  if (isPdf) {
    const data = await pdfParse(buffer);
    return data.text;
  }

  if (isDocx) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  throw new Error('Format de fichier non supporté (PDF ou DOCX uniquement)');
}

async function parseFromUrl(fileUrl) {
  const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
  const buffer = Buffer.from(response.data);

  if (fileUrl.endsWith('.pdf')) {
    const data = await pdfParse(buffer);
    return data.text;
  } else if (fileUrl.endsWith('.docx')) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } else {
    throw new Error('Format de fichier non supporté');
  }
}

module.exports = { parseFromUrl };

module.exports = {
  parseBuffer,
};

module.exports = { parseDocument };
