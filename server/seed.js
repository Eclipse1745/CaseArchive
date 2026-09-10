const fs = require('fs');
const path = require('path');

const UPLOADS_DIR = path.join(__dirname, 'uploads');
const ORIGINALS_DIR = path.join(__dirname, 'originals');

function resetDirs() {
  for (const dir of [UPLOADS_DIR, ORIGINALS_DIR]) {
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
  }
}

function seed() {
  resetDirs();
  return {
    cases: [],
    documents: [],
    evidence: [],
    auditLog: [],
    nextIds: { case: 1, document: 1, audit: 1, evidence: 1 },
  };
}

module.exports = { seed, UPLOADS_DIR, ORIGINALS_DIR };
