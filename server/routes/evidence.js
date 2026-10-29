const express = require('express');
const { supabase, run, logAudit, mapEvidence } = require('../db');
const { getActor, h, intParam } = require('../util');

const router = express.Router();

router.get('/cases/:id/evidence', h(async (req, res) => {
  const caseId = intParam(req.params.id);
  if (!caseId) return res.json({ evidence: [] });
  const rows = await run(
    supabase
      .from('evidence')
      .select('*')
      .eq('workspace_id', req.workspaceId)
      .eq('case_id', caseId)
      .order('logged_at')
  );
  res.json({ evidence: rows.map(mapEvidence) });
}));

router.post('/cases/:id/evidence', h(async (req, res) => {
  const ws = req.workspaceId;
  const caseId = intParam(req.params.id);
  const c = caseId
    ? await run(supabase.from('cases').select('id').eq('workspace_id', ws).eq('id', caseId).maybeSingle())
    : null;
  if (!c) return res.status(404).json({ error: 'Case not found' });

  const { evidenceNumber, itemType, description, status, custodian, location } = req.body || {};
  if (!evidenceNumber || !itemType || !description) {
    return res.status(400).json({ error: 'Evidence number, type, and description are required.' });
  }

  const actor = getActor(req);
  const now = new Date().toISOString();
  const initialStatus = status || 'Collected';
  const initialCustodian = String(custodian || actor.name).trim();
  const initialLocation = String(location || 'Not specified').trim();

  const row = await run(
    supabase
      .from('evidence')
      .insert({
        workspace_id: ws,
        case_id: caseId,
        evidence_number: String(evidenceNumber).trim(),
        item_type: itemType,
        description: String(description).trim(),
        status: initialStatus,
        current_custodian: initialCustodian,
        current_location: initialLocation,
        logged_by: actor.name,
        custody_log: [
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
      })
      .select()
      .single()
  );

  await logAudit(ws, {
    caseId,
    evidenceId: row.id,
    actor,
    action: 'EVIDENCE_LOGGED',
    details: `Evidence "${row.evidence_number}" (${itemType}) logged — ${initialStatus}, with ${initialCustodian}.`,
  });

  res.status(201).json({ evidence: mapEvidence(row) });
}));

async function findEvidence(ws, id) {
  if (!id) return null;
  return run(supabase.from('evidence').select('*').eq('workspace_id', ws).eq('id', id).maybeSingle());
}

router.get('/evidence/:id', h(async (req, res) => {
  const item = await findEvidence(req.workspaceId, intParam(req.params.id));
  if (!item) return res.status(404).json({ error: 'Evidence item not found' });
  res.json({ evidence: mapEvidence(item) });
}));

router.post('/evidence/:id/transfer', h(async (req, res) => {
  const ws = req.workspaceId;
  const item = await findEvidence(ws, intParam(req.params.id));
  if (!item) return res.status(404).json({ error: 'Evidence item not found' });

  const { status, custodian, location, notes } = req.body || {};
  if (!status || !custodian || !location) {
    return res.status(400).json({ error: 'Status, custodian, and location are required.' });
  }

  const actor = getActor(req);
  const now = new Date().toISOString();
  const newCustodian = String(custodian).trim();
  const newLocation = String(location).trim();
  const log = item.custody_log || [];

  const updated = await run(
    supabase
      .from('evidence')
      .update({
        status,
        current_custodian: newCustodian,
        current_location: newLocation,
        custody_log: [
          ...log,
          {
            id: log.length + 1,
            timestamp: now,
            status,
            custodian: newCustodian,
            location: newLocation,
            notes: String(notes || '').trim(),
            actorRole: actor.role,
            actorName: actor.name,
          },
        ],
      })
      .eq('workspace_id', ws)
      .eq('id', item.id)
      .select()
      .single()
  );

  await logAudit(ws, {
    caseId: item.case_id,
    evidenceId: item.id,
    actor,
    action: 'EVIDENCE_CUSTODY_UPDATED',
    details: `Custody of "${item.evidence_number}" transferred to ${newCustodian} (${newLocation}) — status: ${status}.`,
  });

  res.json({ evidence: mapEvidence(updated) });
}));

module.exports = router;
