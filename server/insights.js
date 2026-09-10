const KEYWORDS = [
  'forced entry', 'fingerprint', 'CCTV', 'UPI', 'transaction', 'withdrawal',
  'tool mark', 'AFIS', 'shutter', 'warehouse', 'deposit', 'chain of custody',
  'server', 'gateway', 'perimeter', 'inventory',
];

function extractDates(text) {
  const matches = text.match(/\b\d{1,2}-[A-Za-z]{3}-\d{4}\b/g) || [];
  return [...new Set(matches)];
}

function extractTimes(text) {
  const matches = text.match(/\b\d{1,2}:\d{2}\s?(hrs|UTC)?\b/g) || [];
  return [...new Set(matches.map((m) => m.trim()))];
}

function extractNames(text) {
  const STOP = new Set([
    'First Information', 'Police Station', 'Case No', 'Charge Sheet',
    'Digital Evidence', 'Forensic Analysis', 'Forensic Science',
    'Evidence Log', 'Preliminary Charge', 'Badge No', 'Rack Section',
    'Investigating Officer', 'Station House', 'Reference Cyb',
  ]);
  const matches = text
    .split('\n')
    .flatMap((line) => line.match(/\b[A-Z][a-z]+(?:[ ][A-Z][a-z.]+){1,2}\b/g) || []);
  return [...new Set(matches)].filter((m) => !STOP.has(m)).slice(0, 8);
}

function extractKeywords(text) {
  const lower = text.toLowerCase();
  return KEYWORDS.filter((k) => lower.includes(k.toLowerCase()));
}

function analyze(text) {
  return {
    dates: extractDates(text),
    times: extractTimes(text),
    likelyNames: extractNames(text),
    flaggedKeywords: extractKeywords(text),
    method: 'rule-based (offline, deterministic)',
  };
}

module.exports = { analyze };
