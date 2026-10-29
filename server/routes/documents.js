const express = require('express');
const path = require('path');
const multer = require('multer');
const { supabase, run, logAudit, mapDoc } = require('../db');
const { sha256, computeBlockHash, GENESIS_HASH } = require('../hashChain');
const { inferFileType } = require('../fileTypes');
const { analyze } = require('../insights');
const files = require('../files');
const { getActor, h, intParam } = require('../util');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

async function findDoc(ws, id) {
  if (!id) return null;
  return run(supabase.from('documents').select('*').eq('workspace_id', ws).eq('id', id).maybeSingle());
}

const verificationOf = (doc, hash) => ({
  verified: hash === doc.originalHash,
  currentHash: hash,
  sealedHash: doc.originalHash,
});

router.post('/cases/:id/documents', upload.single('file'), h(async (req, res) => {
  const ws = req.workspaceId;
  const caseId = intParam(req.params.id);
  const c = caseId
    ? await run(supabase.from('cases').select('id').eq('workspace_id', ws).eq('id', caseId).maybeSingle())
    : null;
  if (!c) return res.status(404).json({ error: 'Case not found' });
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const actor = getActor(req);
  const { docType, title } = req.body;

  const last = await run(
    supabase
      .from('documents')
      .select('chain_index, block_hash')
      .eq('workspace_id', ws)
      .eq('case_id', caseId)
      .order('chain_index', { ascending: false })
      .limit(1)
  );
  const chainIndex = last.length ? last[0].chain_index + 1 : 0;
  const prevBlockHash = last.length ? last[0].block_hash : GENESIS_HASH;

  const documentId = await run(supabase.rpc('next_document_id'));
  const rawExt = path.extname(req.file.originalname).toLowerCase();
  const ext = /^\.[a-z0-9]{1,8}$/.test(rawExt) ? rawExt : '.txt';
  const fileName = `case${caseId}_doc${documentId}${ext}`;

  const originalHash = sha256(req.file.buffer);
  const sealedAt = new Date().toISOString();
  const blockHash = computeBlockHash({ chainIndex, prevBlockHash, originalHash, sealedAt, documentId });

  await files.put(ws, 'uploads', fileName, req.file.buffer, req.file.mimetype);
  await files.put(ws, 'originals', fileName, req.file.buffer, req.file.mimetype);

  let row;
  try {
    row = await run(
      supabase
        .from('documents')
        .insert({
          id: documentId,
          workspace_id: ws,
          case_id: caseId,
          doc_type: docType || 'Other',
          title: title || req.file.originalname,
          uploader: actor.name,
          sealed_at: sealedAt,
          file_name: fileName,
          file_type: inferFileType(fileName),
          original_hash: originalHash,
          chain_index: chainIndex,
          prev_block_hash: prevBlockHash,
          block_hash: blockHash,
        })
        .select()
        .single()
    );
  } catch (e) {
    await files.remove(ws, 'uploads', fileName);
    await files.remove(ws, 'originals', fileName);
    if (e.code === '23505') {
      return res.status(409).json({ error: 'Another document was sealed at the same moment. Please upload again.' });
    }
    throw e;
  }

  await logAudit(ws, {
    caseId,
    documentId,
    actor,
    action: 'DOCUMENT_UPLOADED',
    details: `"${row.title}" uploaded and sealed (SHA-256: ${originalHash.slice(0, 12)}...), block #${chainIndex}.`,
  });

  res.status(201).json({ document: mapDoc(row) });
}));

router.get('/documents/:id', h(async (req, res) => {
  const ws = req.workspaceId;
  const row = await findDoc(ws, intParam(req.params.id));
  if (!row) return res.status(404).json({ error: 'Document not found' });
  const doc = mapDoc(row);

  const { buffer, hash } = await files.readWithHash(ws, doc);
  let content = null;
  let insights = null;
  if (doc.fileType === 'text' && buffer) {
    content = buffer.toString('utf-8');
    insights = analyze(content);
  }

  res.json({ document: doc, verification: verificationOf(doc, hash), content, insights });
}));

// Inline viewing is limited to safe types so an uploaded .html file can never run on our origin.
router.get('/documents/:id/view', h(async (req, res) => {
  const ws = req.workspaceId;
  const row = await findDoc(ws, intParam(req.params.id));
  if (!row) return res.status(404).json({ error: 'Document not found' });
  const doc = mapDoc(row);

  const { buffer } = await files.readWithHash(ws, doc);
  if (!buffer) return res.status(404).json({ error: 'File is missing from storage' });

  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (doc.fileType === 'text') {
    res.type('text/plain; charset=utf-8');
  } else if (doc.fileType === 'pdf' || doc.fileType === 'image') {
    res.type(path.extname(doc.fileName));
  } else {
    return res.status(415).json({ error: 'No inline preview for this file type. Use Download.' });
  }
  res.setHeader('Content-Disposition', `inline; filename="${doc.fileName}"`);
  res.send(buffer);
}));

router.post('/documents/:id/verify', h(async (req, res) => {
  const ws = req.workspaceId;
  const row = await findDoc(ws, intParam(req.params.id));
  if (!row) return res.status(404).json({ error: 'Document not found' });
  const doc = mapDoc(row);

  const actor = getActor(req);
  const { hash } = await files.readWithHash(ws, doc);
  const result = verificationOf(doc, hash);

  await logAudit(ws, {
    caseId: doc.caseId,
    documentId: doc.id,
    actor,
    action: result.verified ? 'INTEGRITY_VERIFIED_PASS' : 'INTEGRITY_VERIFIED_FAIL',
    details: result.verified
      ? `Hash verified OK for "${doc.title}".`
      : `MISMATCH for "${doc.title}". Sealed hash ${result.sealedHash.slice(0, 12)}... vs current ${result.currentHash.slice(0, 12)}...`,
  });

  res.json({ verification: result });
}));

router.get('/documents/:id/download', h(async (req, res) => {
  const ws = req.workspaceId;
  const row = await findDoc(ws, intParam(req.params.id));
  if (!row) return res.status(404).json({ error: 'Document not found' });
  const doc = mapDoc(row);

  const { buffer } = await files.readWithHash(ws, doc);
  if (!buffer) return res.status(404).json({ error: 'File is missing from storage' });

  await logAudit(ws, {
    caseId: doc.caseId,
    documentId: doc.id,
    actor: getActor(req),
    action: 'DOCUMENT_DOWNLOADED',
    details: `"${doc.title}" downloaded.`,
  });

  res.attachment(doc.title.replace(/[^a-z0-9\-_]+/gi, '_') + path.extname(doc.fileName));
  res.send(buffer);
}));

module.exports = router;
