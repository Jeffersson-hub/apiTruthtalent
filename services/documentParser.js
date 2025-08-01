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

module.exports = { parseDocument };
