require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const { requireAccess } = require('./auth');
const sessionRouter = require('./routes/session');
const casesRouter = require('./routes/cases');
const documentsRouter = require('./routes/documents');
const auditRouter = require('./routes/audit');
const evidenceRouter = require('./routes/evidence');

const PORT = process.env.PORT || 4000;

const app = express();
app.set('trust proxy', 1);
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/session', sessionRouter);

// Everything below needs a valid access token (it decides the workspace and the role).
app.use('/api', requireAccess);

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
