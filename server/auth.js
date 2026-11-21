const { supabase, run } = require('./db');
const { h } = require('./util');

// The browser sends its access token in a header. The server looks up the workspace, role and name
// that token was issued for, so none of them can be chosen by the person making the request.
const cache = new Map(); // token -> { access, exp }
const CACHE_MS = 30000;

const requireAccess = h(async (req, res, next) => {
  const token = req.get('x-access-token');
  if (!token || token.length > 100) return res.status(401).json({ error: 'Please sign in.' });

  let access;
  const hit = cache.get(token);
  if (hit && hit.exp > Date.now()) {
    access = hit.access;
  } else {
    const row = await run(
      supabase.from('access_tokens').select('workspace_id, role, name').eq('token', token).maybeSingle()
    );
    if (!row) return res.status(401).json({ error: 'This session or invite link is no longer valid.' });
    access = { workspaceId: row.workspace_id, actor: { role: row.role, name: row.name } };
    if (cache.size > 500) cache.clear();
    cache.set(token, { access, exp: Date.now() + CACHE_MS });
  }

  req.workspaceId = access.workspaceId;
  req.actor = access.actor;
  next();
});

// Only the Investigator (workspace owner) can change anything. Prosecutors and Court Clerks are read-only.
function requireInvestigator(req, res, next) {
  if (req.actor.role === 'Investigator') return next();
  res.status(403).json({ error: `The ${req.actor.role} role is read-only.` });
}

module.exports = { requireAccess, requireInvestigator };
