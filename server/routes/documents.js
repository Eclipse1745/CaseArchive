const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const db = require('../db');
const { hashFile, computeBlockHash, verifyDocument, GENESIS_HASH } = require('../hashChain');
const { inferFileType } = require('../fileTypes');
const { analyze } = require('../insights');
const { UPLOADS_DIR, ORIGINALS_DIR } = require('../seed');

const router = express.Router();
const upload = multer({ dest: path.join(__dirname, '..', 'tmp_uploads') });

function logAudit({ caseId, documentId, actor, action, details }) {
  const entry = {
    id: db.nextId('audit'),
    caseId,
    documentId,
    actorRole: actor.role,
    actorName: actor.name,
    action,
    details,
    timestamp: new Date().toISOString(),
  };
  db.state.auditLog.push(entry);
  db.save();
  return entry;
}

function getActor(req) {
  return {
    role: req.headers['x-actor-role'] || 'Investigator',
    name: req.headers['x-actor-name'] || 'System User',
  };
}

router.post('/cases/:id/documents', upload.single('file'), (req, res) => {
  const caseId = Number(req.params.id);
  const c = db.state.cases.find((x) => x.id === caseId);
  if (!c) return res.status(404).json({ error: 'Case not found' });
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const actor = getActor(req);
  const { docType, title } = req.body;

  const existingDocs = db.state.documents.filter((d) => d.caseId === caseId);
  const chainIndex = existingDocs.length;
  const prevBlockHash = chainIndex === 0
    ? GENESIS_HASH
    : existingDocs.sort((a, b) => a.chainIndex - b.chainIndex)[existingDocs.length - 1].blockHash;

  const documentId = db.nextId('document');
  const fileName = `case${caseId}_doc${documentId}${path.extname(req.file.originalname) || '.txt'}`;
  const filePath = path.join(UPLOADS_DIR, fileName);
  const originalPath = path.join(ORIGINALS_DIR, fileName);

  fs.copyFileSync(req.file.path, filePath);
  fs.copyFileSync(req.file.path, originalPath);
  fs.unlinkSync(req.file.path);

  const originalHash = hashFile(filePath);
  const sealedAt = new Date().toISOString();
  const blockHash = computeBlockHash({ chainIndex, prevBlockHash, originalHash, sealedAt, documentId });

  const doc = {
    id: documentId,
    caseId,
    docType: docType || 'Other',
    title: title || req.file.originalname,
    uploader: actor.name,
    sealedAt,
    filePath,
    originalPath,
    fileName,
    fileType: inferFileType(fileName),
    originalHash,
    chainIndex,
    prevBlockHash,
    blockHash,
  };
  db.state.documents.push(doc);
  db.save();

  logAudit({
    caseId,
    documentId,
    actor,
    action: 'DOCUMENT_UPLOADED',
    details: `"${doc.title}" uploaded and sealed (SHA-256: ${originalHash.slice(0, 12)}...), block #${chainIndex}.`,
  });

  res.status(201).json({ document: doc });
});

router.get('/documents/:id', (req, res) => {
  const docId = Number(req.params.id);
  const doc = db.state.documents.find((d) => d.id === docId);
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  const verification = verifyDocument(doc);
  let content = null;
  let insights = null;
  if (doc.fileType === 'text') {
    try {
      content = fs.readFileSync(doc.filePath, 'utf-8');
      insights = analyze(content);
    } catch (e) {
      content = null;
    }
  }

  res.json({
    document: { ...doc, filePath: undefined, originalPath: undefined },
    verification,
    content,
    insights,
  });
});

router.get('/documents/:id/view', (req, res) => {
  const docId = Number(req.params.id);
  const doc = db.state.documents.find((d) => d.id === docId);
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  res.setHeader('Content-Disposition', `inline; filename="${doc.fileName}"`);
  res.sendFile(doc.filePath);
});

router.post('/documents/:id/verify', (req, res) => {
  const docId = Number(req.params.id);
  const doc = db.state.documents.find((d) => d.id === docId);
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  const actor = getActor(req);
  const result = verifyDocument(doc);

  logAudit({
    caseId: doc.caseId,
    documentId: doc.id,
    actor,
    action: result.verified ? 'INTEGRITY_VERIFIED_PASS' : 'INTEGRITY_VERIFIED_FAIL',
    details: result.verified
      ? `Hash verified OK for "${doc.title}".`
      : `MISMATCH for "${doc.title}". Sealed hash ${result.sealedHash.slice(0, 12)}... vs current ${result.currentHash.slice(0, 12)}...`,
  });

  res.json({ verification: result });
});

router.get('/documents/:id/download', (req, res) => {
  const docId = Number(req.params.id);
  const doc = db.state.documents.find((d) => d.id === docId);
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  const actor = getActor(req);
  logAudit({
    caseId: doc.caseId,
    documentId: doc.id,
    actor,
    action: 'DOCUMENT_DOWNLOADED',
    details: `"${doc.title}" downloaded.`,
  });

  res.download(doc.filePath, doc.title.replace(/[^a-z0-9\-_]+/gi, '_') + path.extname(doc.fileName));
});

router.post('/documents/:id/tamper', (req, res) => {
  const docId = Number(req.params.id);
  const doc = db.state.documents.find((d) => d.id === docId);
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  const actor = getActor(req);
  const original = fs.readFileSync(doc.filePath, 'utf-8');
  const tampered = original.replace(
    /\n\n(?=[A-Z][a-z]+(?:\s[A-Z][a-z]*)*:)/,
    '\n\n[ALTERED] Amount/detail silently modified after filing.\n\n'
  );
  const finalText = tampered !== original ? tampered : original + '\n\n[ALTERED] Unauthorized addition appended after sealing.';
  fs.writeFileSync(doc.filePath, finalText, 'utf-8');

  logAudit({
    caseId: doc.caseId,
    documentId: doc.id,
    actor,
    action: 'TAMPER_SIMULATED',
    details: `Integrity self-test triggered a controlled modification on "${doc.title}".`,
  });

  const verification = verifyDocument(doc);
  res.json({ verification });
});

router.post('/documents/:id/restore', (req, res) => {
  const docId = Number(req.params.id);
  const doc = db.state.documents.find((d) => d.id === docId);
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  const actor = getActor(req);
  fs.copyFileSync(doc.originalPath, doc.filePath);

  logAudit({
    caseId: doc.caseId,
    documentId: doc.id,
    actor,
    action: 'DOCUMENT_RESTORED',
    details: `"${doc.title}" restored to its sealed original state.`,
  });

  const verification = verifyDocument(doc);
  res.json({ verification });
});

module.exports = router;
