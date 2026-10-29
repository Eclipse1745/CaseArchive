// File storage on Supabase Storage. Layout: <workspace>/uploads/<file> and <workspace>/originals/<file>
const { supabase, BUCKET } = require('./db');
const { sha256 } = require('./hashChain');

const MISSING = 'FILE_MISSING';
const TTL_MS = 15000;
const hashCache = new Map();

const keyFor = (ws, kind, fileName) => `${ws}/${kind}/${fileName}`;
const cacheKey = (ws, docId) => `${ws}:${docId}`;
const isNotFound = (e) =>
  /not.?found/i.test(e?.message || '') || e?.status === 404 || String(e?.statusCode) === '404';

async function put(ws, kind, fileName, buffer, contentType) {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(keyFor(ws, kind, fileName), buffer, {
      contentType: contentType || 'application/octet-stream',
      upsert: true,
    });
  if (error) throw error;
}

async function get(ws, kind, fileName) {
  const { data, error } = await supabase.storage.from(BUCKET).download(keyFor(ws, kind, fileName));
  if (error) throw error;
  return Buffer.from(await data.arrayBuffer());
}

async function remove(ws, kind, fileName) {
  await supabase.storage.from(BUCKET).remove([keyFor(ws, kind, fileName)]);
}

function invalidate(ws, docId) {
  hashCache.delete(cacheKey(ws, docId));
}

// Download the stored file and hash it. A missing file counts as a failed check, not a crash.
async function readWithHash(ws, doc) {
  try {
    const buffer = await get(ws, 'uploads', doc.fileName);
    const hash = sha256(buffer);
    hashCache.set(cacheKey(ws, doc.id), { hash, at: Date.now() });
    return { buffer, hash };
  } catch (e) {
    if (!isNotFound(e)) throw e;
    hashCache.delete(cacheKey(ws, doc.id));
    return { buffer: null, hash: MISSING };
  }
}

// Cached for a few seconds so listing cases does not re-download every file on every request.
async function currentHash(ws, doc, { fresh = false } = {}) {
  if (!fresh) {
    const hit = hashCache.get(cacheKey(ws, doc.id));
    if (hit && Date.now() - hit.at < TTL_MS) return hit.hash;
  }
  return (await readWithHash(ws, doc)).hash;
}

async function clearWorkspace(ws) {
  for (const kind of ['uploads', 'originals']) {
    for (let i = 0; i < 50; i++) {
      const { data, error } = await supabase.storage.from(BUCKET).list(`${ws}/${kind}`, { limit: 100 });
      if (error) throw error;
      if (!data || data.length === 0) break;
      const { error: rmErr } = await supabase.storage
        .from(BUCKET)
        .remove(data.map((f) => `${ws}/${kind}/${f.name}`));
      if (rmErr) throw rmErr;
    }
  }
  for (const k of [...hashCache.keys()]) if (k.startsWith(`${ws}:`)) hashCache.delete(k);
}

module.exports = { MISSING, put, get, remove, invalidate, readWithHash, currentHash, clearWorkspace };
