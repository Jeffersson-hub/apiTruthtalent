function extractInfo(text) {
  const info = {};
  let match;

  if ((match = text.match(/[A-ZÀ-Ÿ][A-Za-zÀ-ÿ'\-]+\s+[A-ZÀ-Ÿ][A-Za-zÀ-ÿ'\-]+/))) {
    info.name = match[0];
  }
  if ((match = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/))) {
    info.email = match[0];
  }
  if ((match = text.match(/0[1-9](?:[\s.-]\d{2}){4}/))) {
    info.phone = match[0];
  }

  return info;
}

function extractEmail(text) {
  const match = text.match(/[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return match ? match[0] : null;
}

function extractPhone(text) {
  const match = text.match(/(?:\+?\d{1,3}[ .-]?)?(?:\(?\d{2,4}\)?[ .-]?)?\d{3}[ .-]?\d{3,4}/);
  return match ? match[0] : null;
}

function extractName(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  return lines[0]; // suppose que le nom est sur la première ligne
}

function extractSkills(text) {
  const skillsDB = ['javascript', 'react', 'node', 'python', 'excel', 'sql', 'css', 'html'];
  const lowerText = text.toLowerCase();
  return skillsDB.filter(skill => lowerText.includes(skill));
}

function extractInfo(text) {
  return {
    name: extractName(text),
    email: extractEmail(text),
    phone: extractPhone(text),
    skills: extractSkills(text),
    raw_text: text,
    parsed_at: new Date().toISOString(),
  };
}

module.exports = {
  extractInfo,
};

// module.exports = { extractInfo };
module.exports.extractInfo = (text) => {
  const name = extractName(text); // à écrire
  const email = extractEmail(text); // à écrire
  const skills = extractSkills(text); // à écrire
  return {
    name,
    email,
    skills,
    raw_text: text,
    parsed_at: new Date().toISOString(),
  };
};
