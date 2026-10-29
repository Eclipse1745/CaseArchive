const { createClient } = require('@supabase/supabase-js');

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. See server/.env.example.');
  process.exit(1);
}

// Service-role key: server side only. Never expose it to the client.
const supabase = createClient(url, key, { auth: { persistSession: false } });
const BUCKET = process.env.SUPABASE_BUCKET || 'case-files';

// Await a Supabase query and return its data, throwing on error.
async function run(query) {
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

const iso = (v) => (v ? new Date(v).toISOString() : null);

const mapCase = (r) => ({
  id: r.id,
  caseNumber: r.case_number,
  title: r.title,
  description: r.description,
  status: r.status,
  createdAt: iso(r.created_at),
  createdBy: r.created_by,
});

const mapDoc = (r) => ({
  id: r.id,
  caseId: r.case_id,
  docType: r.doc_type,
  title: r.title,
  uploader: r.uploader,
  sealedAt: r.sealed_at,
  fileName: r.file_name,
  fileType: r.file_type,
  originalHash: r.original_hash,
  chainIndex: r.chain_index,
  prevBlockHash: r.prev_block_hash,
  blockHash: r.block_hash,
});

const mapEvidence = (r) => ({
  id: r.id,
  caseId: r.case_id,
  evidenceNumber: r.evidence_number,
  itemType: r.item_type,
  description: r.description,
  status: r.status,
  currentCustodian: r.current_custodian,
  currentLocation: r.current_location,
  loggedBy: r.logged_by,
  loggedAt: iso(r.logged_at),
  custodyLog: r.custody_log || [],
});

const mapAudit = (r) => ({
  id: r.id,
  caseId: r.case_id,
  documentId: r.document_id,
  evidenceId: r.evidence_id,
  actorRole: r.actor_role,
  actorName: r.actor_name,
  action: r.action,
  details: r.details,
  timestamp: iso(r.ts),
});

async function logAudit(ws, { caseId, documentId = null, evidenceId = null, actor, action, details }) {
  const row = await run(
    supabase
      .from('audit_log')
      .insert({
        workspace_id: ws,
        case_id: caseId,
        document_id: documentId,
        evidence_id: evidenceId,
        actor_role: actor.role,
        actor_name: actor.name,
        action,
        details,
      })
      .select()
      .single()
  );
  return mapAudit(row);
}

module.exports = { supabase, BUCKET, run, logAudit, mapCase, mapDoc, mapEvidence, mapAudit };
