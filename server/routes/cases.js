const express = require('express');
const db = require('../db');
const { verifyChain } = require('../hashChain');

const router = express.Router();

function getActor(req) {
  return {
    role: req.headers['x-actor-role'] || 'Investigator',
    name: req.headers['x-actor-name'] || 'System User',
  };
}

function caseSummary(c) {
  const docs = db.state.documents.filter((d) => d.caseId === c.id);
  const evidenceCount = db.state.evidence.filter((e) => e.caseId === c.id).length;
  const { chainIntact, blocks } = verifyChain(docs);
  const contentOk = blocks.every((b) => b.contentVerified);
  return {
    ...c,
    documentCount: docs.length,
    evidenceCount,
    integrityStatus: chainIntact && contentOk ? 'verified' : 'compromised',
  };
}

router.get('/', (req, res) => {
  const cases = db.state.cases
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map(caseSummary);
  res.json({ cases });
});

router.post('/', (req, res) => {
  const { caseNumber, title, description, status } = req.body || {};
  if (!caseNumber || !caseNumber.trim() || !title || !title.trim()) {
    return res.status(400).json({ error: 'Case number and title are required.' });
  }

  const actor = getActor(req);
  const id = db.nextId('case');
  const now = new Date().toISOString();

  const newCase = {
    id,
    caseNumber: caseNumber.trim(),
    title: title.trim(),
    description: (description || '').trim(),
    status: status || 'Under Investigation',
    createdAt: now,
    createdBy: actor.name,
  };
  db.state.cases.push(newCase);

  db.state.auditLog.push({
    id: db.nextId('audit'),
    caseId: id,
    documentId: null,
    evidenceId: null,
    actorRole: actor.role,
    actorName: actor.name,
    action: 'CASE_CREATED',
    details: `Case "${newCase.title}" (${newCase.caseNumber}) was filed.`,
    timestamp: now,
  });
  db.save();

  res.status(201).json({ case: caseSummary(newCase) });
});

router.get('/:id', (req, res) => {
  const caseId = Number(req.params.id);
  const c = db.state.cases.find((x) => x.id === caseId);
  if (!c) return res.status(404).json({ error: 'Case not found' });

  const docs = db.state.documents
    .filter((d) => d.caseId === caseId)
    .sort((a, b) => a.chainIndex - b.chainIndex);
  const { chainIntact, blocks } = verifyChain(docs);

  const documents = docs.map((d) => {
    const block = blocks.find((b) => b.documentId === d.id);
    return {
      id: d.id,
      caseId: d.caseId,
      docType: d.docType,
      title: d.title,
      uploader: d.uploader,
      sealedAt: d.sealedAt,
      chainIndex: d.chainIndex,
      originalHash: d.originalHash,
      blockHash: d.blockHash,
      prevBlockHash: d.prevBlockHash,
      currentHash: block.currentHash,
      contentVerified: block.contentVerified,
      linkIntact: block.linkIntact,
    };
  });

  res.json({
    case: caseSummary(c),
    documents,
    chain: { chainIntact },
  });
});

module.exports = router;
