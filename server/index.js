require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const casesRouter = require('./routes/cases');
const documentsRouter = require('./routes/documents');
const auditRouter = require('./routes/audit');
const evidenceRouter = require('./routes/evidence');

const PORT = process.env.PORT || 4000;

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));

// Every request belongs to a workspace (a private sandbox per browser, or a shared one via ?workspace=).
// The browser sends it as a header; <img>/<iframe>/download links send it as ?ws=.
app.use('/api', (req, res, next) => {
  const ws = req.get('x-workspace-id') || req.query.ws;
  if (!ws || !/^[A-Za-z0-9_-]{6,64}$/.test(ws)) {
    return res.status(400).json({ error: 'Missing or invalid workspace id.' });
  }
  req.workspaceId = ws;
  next();
});

app.use('/api/cases', casesRouter);
app.use('/api', documentsRouter);
app.use('/api', auditRouter);
app.use('/api', evidenceRouter);

const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use((err, req, res, next) => {
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large (max 20 MB).' });
  }
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

app.listen(PORT, () => {
  console.log(`Case Archive server running on http://localhost:${PORT}`);
});
