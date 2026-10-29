const express = require('express');
const { supabase, run, logAudit, mapCase, mapDoc } = require('../db');
const { verifyChain } = require('../hashChain');
const files = require('../files');
const { getActor, h, intParam } = require('../util');

const router = express.Router();

// Builds list summaries with a handful of queries instead of several per case.
async function summarize(ws, caseRows) {
  if (caseRows.length === 0) return [];
  const ids = caseRows.map((c) => c.id);
  const [docRows, evRows] = await Promise.all([
    run(supabase.from('documents').select('*').eq('workspace_id', ws).in('case_id', ids)),
    run(supabase.from('evidence').select('id, case_id').eq('workspace_id', ws).in('case_id', ids)),
  ]);
  const getHash = (d) => files.currentHash(ws, d);

  return Promise.all(
    caseRows.map(async (c) => {
      const docs = docRows.filter((d) => d.case_id === c.id).map(mapDoc);
      const { chainIntact, blocks } = await verifyChain(docs, getHash);
      return {
        ...mapCase(c),
        documentCount: docs.length,
        evidenceCount: evRows.filter((e) => e.case_id === c.id).length,
        integrityStatus: chainIntact && blocks.every((b) => b.contentVerified) ? 'verified' : 'compromised',
      };
    })
  );
}

router.get('/', h(async (req, res) => {
  const rows = await run(
    supabase.from('cases').select('*').eq('workspace_id', req.workspaceId).order('created_at', { ascending: false })
  );
  res.json({ cases: await summarize(req.workspaceId, rows) });
}));

router.post('/', h(async (req, res) => {
  const { caseNumber, title, description, status } = req.body || {};
  if (typeof caseNumber !== 'string' || !caseNumber.trim() || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'Case number and title are required.' });
  }
  const ws = req.workspaceId;
  const actor = getActor(req);

  const row = await run(
    supabase
      .from('cases')
      .insert({
        workspace_id: ws,
        case_number: caseNumber.trim(),
        title: title.trim(),
        description: typeof description === 'string' ? description.trim() : '',
        status: status || 'Under Investigation',
        created_by: actor.name,
      })
      .select()
      .single()
  );

  await logAudit(ws, {
    caseId: row.id,
    actor,
    action: 'CASE_CREATED',
    details: `Case "${row.title}" (${row.case_number}) was filed.`,
  });

  const [summary] = await summarize(ws, [row]);
  res.status(201).json({ case: summary });
}));

router.get('/:id', h(async (req, res) => {
  const ws = req.workspaceId;
  const caseId = intParam(req.params.id);
  const c = caseId
    ? await run(supabase.from('cases').select('*').eq('workspace_id', ws).eq('id', caseId).maybeSingle())
    : null;
  if (!c) return res.status(404).json({ error: 'Case not found' });

  const docRows = await run(
    supabase.from('documents').select('*').eq('workspace_id', ws).eq('case_id', caseId).order('chain_index')
  );
  const docs = docRows.map(mapDoc);
  const { chainIntact, blocks } = await verifyChain(docs, (d) => files.currentHash(ws, d));

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

  const [summary] = await summarize(ws, [c]);
  res.json({ case: summary, documents, chain: { chainIntact } });
}));

module.exports = router;
