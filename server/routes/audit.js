const express = require('express');
const db = require('../db');
const { seed } = require('../seed');

const router = express.Router();

router.get('/cases/:id/audit', (req, res) => {
  const caseId = Number(req.params.id);
  const entries = db.state.auditLog
    .filter((a) => a.caseId === caseId)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  res.json({ entries });
});

router.post('/reset', (req, res) => {
  db.reset(seed());
  res.json({ ok: true });
});

module.exports = router;
