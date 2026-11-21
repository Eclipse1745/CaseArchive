const crypto = require('crypto');
const express = require('express');
const { supabase, run } = require('../db');
const { requireAccess, requireInvestigator, forget } = require('../auth');
const { h } = require('../util');

const router = express.Router();

const newSecret = () => crypto.randomBytes(24).toString('base64url');
const INVITE_TTL_MS = 7 * 24 * 3600 * 1000; // an unused invite link expires after a week

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

// Before an invitee confirms their name, the owner's private label is not shown back to them.
router.get('/me', requireAccess, (req, res) => {
  res.json({ name: req.claimed ? req.actor.name : null, role: req.actor.role, claimed: req.claimed });
});

// The invitee types their own name, once. It is not verified, and records say so.
router.post('/claim', requireAccess, h(async (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim().slice(0, 80) : '';
  if (!name) return res.status(400).json({ error: 'Please enter your name.' });
  const token = req.get('x-access-token');
  const rows = await run(
    supabase.from('access_tokens').update({ name, claimed_at: new Date().toISOString() })
      .eq('token', token).neq('role', 'Investigator').is('claimed_at', null).select('token')
  );
  if (rows.length === 0) return res.status(409).json({ error: 'The name for this invite is already confirmed.' });
  forget(token);
  res.json({ name, role: req.actor.role, claimed: true });
}));

// The owner invites a read-only colleague into the SAME workspace. The role is fixed in the token; the owner's
// typed name is only a private label, and the invitee types their own name when they accept (POST /claim).
router.post('/invites', requireAccess, requireInvestigator, h(async (req, res) => {
  const role = req.body?.role;
  if (!['Prosecutor', 'Court Clerk'].includes(role)) {
    return res.status(400).json({ error: 'Invites can only be for a Prosecutor or a Court Clerk.' });
  }
  // The label is optional and only for the owner; the invitee types their own name when they accept.
  const typed = typeof req.body?.name === 'string' ? req.body.name.trim().slice(0, 80) : '';
  const name = typed || `${role} invite`;
  // The link carries a one-time invite code, not a login token: /redeem swaps it for a session token.
  const code = newSecret();
  await run(
    supabase.from('invites').insert({
      code,
      workspace_id: req.workspaceId,
      role,
      label: name,
      invited_by: req.actor.name,
      expires_at: new Date(Date.now() + INVITE_TTL_MS).toISOString(),
    })
  );
  res.status(201).json({ token: code, name, role });
}));

// Opening an invite link. Public (the invitee has no session yet). The single UPDATE only matches an unused,
// unexpired code, and Postgres applies it to one request only, so two people racing on the same link
// cannot both get in.
router.post('/redeem', h(async (req, res) => {
  const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';
  if (!code || code.length > 100) return res.status(400).json({ error: 'Missing invite code.' });

  const now = new Date().toISOString();
  const rows = await run(
    supabase.from('invites').update({ redeemed_at: now })
      .eq('code', code).is('redeemed_at', null).gt('expires_at', now)
      .select('workspace_id, role, label, invited_by')
  );
  if (rows.length === 0) {
    return res.status(410).json({ error: 'This invite link was already used or has expired. Ask the workspace owner for a new one.' });
  }

  const inv = rows[0];
  const token = newSecret();
  try {
    await run(
      supabase.from('access_tokens').insert({
        token, workspace_id: inv.workspace_id, role: inv.role, name: inv.label, label: inv.label, invited_by: inv.invited_by,
      })
    );
  } catch (err) {
    // Do not burn the invite if we failed to issue the session.
    await supabase.from('invites').update({ redeemed_at: null }).eq('code', code);
    throw err;
  }
  res.json({ token, role: inv.role });
}));

module.exports = router;
