const crypto = require('crypto');
const express = require('express');
const { supabase, run } = require('../db');
const { requireAccess, requireInvestigator } = require('../auth');
const { h } = require('../util');

const router = express.Router();

const newSecret = () => crypto.randomBytes(24).toString('base64url');

// Light abuse guard for the one public endpoint (anyone can start a workspace).
const hits = new Map();
function tooMany(ip) {
  const now = Date.now();
  const rec = hits.get(ip) && hits.get(ip).reset > now ? hits.get(ip) : { n: 0, reset: now + 3600000 };
  rec.n += 1;
  hits.set(ip, rec);
  return rec.n > 100;
}

// Start a brand-new workspace. The creator is its Investigator (owner).
router.post('/start', h(async (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim().slice(0, 80) : '';
  if (!name) return res.status(400).json({ error: 'Please enter your name.' });
  if (tooMany(req.ip)) return res.status(429).json({ error: 'Too many new workspaces from this network. Try again later.' });

  const token = newSecret();
  await run(
    supabase.from('access_tokens').insert({
      token,
      workspace_id: crypto.randomBytes(12).toString('hex'),
      role: 'Investigator',
      name,
    })
  );
  res.status(201).json({ token, name, role: 'Investigator' });
}));

router.get('/me', requireAccess, (req, res) => {
  res.json({ name: req.actor.name, role: req.actor.role });
});

// The owner invites a read-only colleague into the SAME workspace. Name and role are fixed in the token.
router.post('/invites', requireAccess, requireInvestigator, h(async (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim().slice(0, 80) : '';
  const role = req.body?.role;
  if (!name) return res.status(400).json({ error: 'Enter the invitee\'s name.' });
  if (!['Prosecutor', 'Court Clerk'].includes(role)) {
    return res.status(400).json({ error: 'Invites can only be for a Prosecutor or a Court Clerk.' });
  }
  const token = newSecret();
  await run(supabase.from('access_tokens').insert({ token, workspace_id: req.workspaceId, role, name }));
  res.status(201).json({ token, name, role });
}));

module.exports = router;
