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
module.exports = { extractInfo };
