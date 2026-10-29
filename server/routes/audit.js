const express = require('express');
const { supabase, run, mapAudit } = require('../db');
const files = require('../files');
const { h, intParam } = require('../util');

const router = express.Router();

router.get('/cases/:id/audit', h(async (req, res) => {
  const caseId = intParam(req.params.id);
  if (!caseId) return res.json({ entries: [] });
  const rows = await run(
    supabase
      .from('audit_log')
      .select('*')
      .eq('workspace_id', req.workspaceId)
      .eq('case_id', caseId)
      .order('ts', { ascending: false })
  );
  res.json({ entries: rows.map(mapAudit) });
}));

// Clears only THIS workspace, never anyone else's data.
router.post('/reset', h(async (req, res) => {
  const ws = req.workspaceId;
  await run(supabase.from('audit_log').delete().eq('workspace_id', ws));
  await run(supabase.from('evidence').delete().eq('workspace_id', ws));
  await run(supabase.from('documents').delete().eq('workspace_id', ws));
  await run(supabase.from('cases').delete().eq('workspace_id', ws));
  await files.clearWorkspace(ws);
  res.json({ ok: true });
}));

module.exports = router;
