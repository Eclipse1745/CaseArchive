// Pattern-based, offline extraction. No machine learning: every result is reproducible.
const KEYWORDS = [
  'forced entry', 'fingerprint', 'CCTV', 'UPI', 'transaction', 'withdrawal', 'tool mark', 'AFIS',
  'shutter', 'warehouse', 'deposit', 'chain of custody', 'server', 'gateway', 'perimeter', 'inventory',
  'FIR', 'charge sheet', 'chargesheet', 'remand', 'bail', 'arrest', 'seizure memo', 'panchnama',
  'post-mortem', 'postmortem', 'FSL', 'DNA', 'ballistic', 'CDR', 'IMEI', 'IP address', 'phishing',
  'ransomware', 'bank statement', 'confession', 'eyewitness', 'alibi', 'recovery', 'search warrant',
  'digital evidence', 'cyber',
];

const ACTS = 'IPC|BNSS|BNS|CrPC|BSA|NDPS|POCSO|IT Act|Arms Act';
const CANON = { ipc: 'IPC', bnss: 'BNSS', bns: 'BNS', crpc: 'CrPC', bsa: 'BSA', ndps: 'NDPS', pocso: 'POCSO', 'it act': 'IT Act', 'arms act': 'Arms Act' };
const NUM = '\\d{1,3}[A-Z]?(?:\\(\\d+\\))?';
const SECTION_RE = new RegExp(
  `\\b(?:Sections?|Sec\\.?|u\\/ss?)\\s*(${NUM}(?:\\s*(?:,|&|and|\\/)\\s*${NUM})*)\\s*(?:of\\s+(?:the\\s+)?)?(${ACTS})\\b`,
  'gi'
);

const ROLE_WORDS = ['accused', 'suspect', 'criminal', 'complainant', 'witness', 'victim', 'informant'];
// Case-insensitive role word only, so the name itself still has to start with a capital letter.
const ROLE = ROLE_WORDS.map((w) => `[${w[0].toUpperCase()}${w[0]}]${w.slice(1)}`).join('|');
const ROLE_FIRST = new RegExp(`\\b(${ROLE})\\s*(?:[:\\-]|is|named)?\\s+(?:(?:Mr|Mrs|Ms|Shri|Smt|Dr)\\.?\\s+)?([A-Z][a-z]+(?:\\s[A-Z][a-z]+){0,2})`, 'g');
const NAME_FIRST = new RegExp(`\\b([A-Z][a-z]+(?:\\s[A-Z][a-z]+){0,2})\\s+(?:is|was)\\s+(?:the\\s+|an?\\s+)?(${ROLE})\\b`, 'g');
const RANKED = /\b(?:Mr|Mrs|Ms|Shri|Smt|Dr|SI|ASI|Inspector|Constable|Adv|Advocate)\.?\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+){0,2})/g;

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const unique = (arr) => [...new Set(arr)];

function extractDates(text) {
  return unique(text.match(/\b\d{1,2}-[A-Za-z]{3}-\d{4}\b/g) || []);
}

function extractTimes(text) {
  const matches = text.match(/\b\d{1,2}:\d{2}\s?(hrs|UTC)?\b/g) || [];
  return unique(matches.map((m) => m.trim()));
}

function extractSections(text) {
  const found = [];
  for (const m of text.matchAll(SECTION_RE)) {
    const nums = m[1].replace(/\s+/g, ' ').trim();
    found.push(`Section ${nums} ${CANON[m[2].toLowerCase()] || m[2]}`);
  }
  return unique(found);
}

function extractParties(text) {
  const out = [];
  const lower = (r) => r.charAt(0).toUpperCase() + r.slice(1).toLowerCase();
  for (const m of text.matchAll(ROLE_FIRST)) out.push({ role: lower(m[1]), name: m[2] });
  for (const m of text.matchAll(NAME_FIRST)) out.push({ role: lower(m[2]), name: m[1] });
  const seen = new Set();
  return out.filter((p) => !seen.has(p.role + p.name) && seen.add(p.role + p.name)).slice(0, 8);
}

function extractNames(text) {
  const STOP = new Set([
    'First Information', 'Police Station', 'Case No', 'Charge Sheet', 'Digital Evidence',
    'Forensic Analysis', 'Forensic Science', 'Evidence Log', 'Preliminary Charge', 'Badge No',
    'Rack Section', 'Investigating Officer', 'Station House', 'Reference Cyb',
  ]);
  const ranked = [...text.matchAll(RANKED)].map((m) => m[1]);
  const generic = text
    .split('\n')
    .flatMap((line) => line.match(/\b[A-Z][a-z]+(?:[ ][A-Z][a-z.]+){1,2}\b/g) || []);
  const noise = /^(?:Accused|Suspect|Criminal|Complainant|Witness|Victim|Informant)\b|\b(?:Mr|Mrs|Ms|Dr|Shri|Smt)\b/;
  return unique([...ranked, ...generic]).filter((m) => !STOP.has(m) && !noise.test(m)).slice(0, 8);
}

function extractKeywords(text) {
  return KEYWORDS.filter((k) => new RegExp(`\\b${escapeRe(k)}\\b`, 'i').test(text));
}

function analyze(text) {
  return {
    dates: extractDates(text),
    times: extractTimes(text),
    legalSections: extractSections(text),
    parties: extractParties(text),
    likelyNames: extractNames(text),
    flaggedKeywords: extractKeywords(text),
    method: 'pattern-based (offline, deterministic)',
  };
}

module.exports = { analyze };
