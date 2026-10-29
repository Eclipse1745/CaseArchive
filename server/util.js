function getActor(req) {
  return {
    role: req.headers['x-actor-role'] || 'Investigator',
    name: req.headers['x-actor-name'] || 'System User',
  };
}

// Express 4 does not catch rejected promises, so wrap every async handler.
const h = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function intParam(v) {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

module.exports = { getActor, h, intParam };
