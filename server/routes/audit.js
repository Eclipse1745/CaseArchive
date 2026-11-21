const express = require('express');
const { supabase, run, mapAudit } = require('../db');
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
      .or(`case_id.eq.${caseId},case_id.is.null`)
      .order('ts', { ascending: false })
  );
  res.json({ entries: rows.map(mapAudit) });
}));

module.exports = router;
