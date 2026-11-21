// Set by requireAccess from the access token. Never read from request headers.
function getActor(req) {
  return req.actor;
}

// Express 4 does not catch rejected promises, so wrap every async handler.
const h = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function intParam(v) {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// Names are typed by people and never checked, so records from invitees say so (and who invited them).
function auditNote(actor) {
  if (actor.role === 'Investigator') return null;
  return `${actor.invitedBy ? `invited by ${actor.invitedBy} · ` : ''}name and role not verified`;
}

// An invitee must confirm their own name before touching anything. Investigators are always confirmed.
function requireClaimed(req, res, next) {
  if (req.claimed) return next();
  res.status(403).json({ error: 'Confirm your name to join this workspace first.' });
}

module.exports = { getActor, h, intParam, auditNote, requireClaimed };
