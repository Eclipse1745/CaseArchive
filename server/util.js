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

module.exports = { getActor, h, intParam };
