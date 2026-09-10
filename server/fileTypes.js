const path = require('path');

const TEXT_EXT = new Set(['.txt', '.md', '.csv', '.log']);
const PDF_EXT = new Set(['.pdf']);
const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp']);

function inferFileType(filenameOrExt) {
  const ext = filenameOrExt.startsWith('.') ? filenameOrExt.toLowerCase() : path.extname(filenameOrExt).toLowerCase();
  if (TEXT_EXT.has(ext)) return 'text';
  if (PDF_EXT.has(ext)) return 'pdf';
  if (IMAGE_EXT.has(ext)) return 'image';
  return 'other';
}

module.exports = { inferFileType };
