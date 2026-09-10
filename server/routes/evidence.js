const express = require('express');
const db = require('../db');

const router = express.Router();

function getActor(req) {
  return {
    role: req.headers['x-actor-role'] || 'Investigator',
    name: req.headers['x-actor-name'] || 'System User',
  };
}

function logAudit({ caseId, evidenceId, actor, action, details }) {
  const entry = {
    id: db.nextId('audit'),
    caseId,
    documentId: null,
    evidenceId,
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

router.get('/cases/:id/evidence', (req, res) => {
  const caseId = Number(req.params.id);
  const items = db.state.evidence
    .filter((e) => e.caseId === caseId)
    .sort((a, b) => new Date(a.loggedAt) - new Date(b.loggedAt));
  res.json({ evidence: items });
});

router.post('/cases/:id/evidence', (req, res) => {
  const caseId = Number(req.params.id);
  const c = db.state.cases.find((x) => x.id === caseId);
  if (!c) return res.status(404).json({ error: 'Case not found' });

  const { evidenceNumber, itemType, description, status, custodian, location } = req.body || {};
  if (!evidenceNumber || !itemType || !description) {
    return res.status(400).json({ error: 'Evidence number, type, and description are required.' });
  }

  const actor = getActor(req);
  const id = db.nextId('evidence');
  const now = new Date().toISOString();
  const initialStatus = status || 'Collected';
  const initialCustodian = (custodian || actor.name).trim();
  const initialLocation = (location || 'Not specified').trim();

  const item = {
    id,
    caseId,
    evidenceNumber: evidenceNumber.trim(),
    itemType,
    description: description.trim(),
    status: initialStatus,
    currentCustodian: initialCustodian,
    currentLocation: initialLocation,
    loggedBy: actor.name,
    loggedAt: now,
    custodyLog: [
      {
        id: 1,
        timestamp: now,
        status: initialStatus,
        custodian: initialCustodian,
        location: initialLocation,
        notes: 'Evidence item logged into the system.',
        actorRole: actor.role,
        actorName: actor.name,
      },
    ],
  };
  db.state.evidence.push(item);
  db.save();

  logAudit({
    caseId,
    evidenceId: id,
    actor,
    action: 'EVIDENCE_LOGGED',
    details: `Evidence "${item.evidenceNumber}" (${itemType}) logged — ${initialStatus}, with ${initialCustodian}.`,
  });

  res.status(201).json({ evidence: item });
});

router.get('/evidence/:id', (req, res) => {
  const id = Number(req.params.id);
  const item = db.state.evidence.find((e) => e.id === id);
  if (!item) return res.status(404).json({ error: 'Evidence item not found' });
  res.json({ evidence: item });
});

router.post('/evidence/:id/transfer', (req, res) => {
  const id = Number(req.params.id);
  const item = db.state.evidence.find((e) => e.id === id);
  if (!item) return res.status(404).json({ error: 'Evidence item not found' });

  const { status, custodian, location, notes } = req.body || {};
  if (!status || !custodian || !location) {
    return res.status(400).json({ error: 'Status, custodian, and location are required.' });
  }

  const actor = getActor(req);
  const now = new Date().toISOString();

  item.status = status;
  item.currentCustodian = custodian.trim();
  item.currentLocation = location.trim();
  item.custodyLog.push({
    id: item.custodyLog.length + 1,
    timestamp: now,
    status,
    custodian: item.currentCustodian,
    location: item.currentLocation,
    notes: (notes || '').trim(),
    actorRole: actor.role,
    actorName: actor.name,
  });
  db.save();

  logAudit({
    caseId: item.caseId,
    evidenceId: id,
    actor,
    action: 'EVIDENCE_CUSTODY_UPDATED',
    details: `Custody of "${item.evidenceNumber}" transferred to ${item.currentCustodian} (${item.currentLocation}) — status: ${status}.`,
  });

  res.json({ evidence: item });
});

module.exports = router;
