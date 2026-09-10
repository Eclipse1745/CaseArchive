const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const db = require('./db');
const { seed } = require('./seed');

const casesRouter = require('./routes/cases');
const documentsRouter = require('./routes/documents');
const auditRouter = require('./routes/audit');
const evidenceRouter = require('./routes/evidence');

const PORT = process.env.PORT || 4000;

db.reset(seed());

const app = express();
app.use(cors());
app.use(express.json());

const tmpUploads = path.join(__dirname, 'tmp_uploads');
if (!fs.existsSync(tmpUploads)) fs.mkdirSync(tmpUploads, { recursive: true });

app.use('/api/cases', casesRouter);
app.use('/api', documentsRouter);
app.use('/api', auditRouter);
app.use('/api', evidenceRouter);

app.get('/api/health', (req, res) => res.json({ ok: true }));

const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Case Archive server running on http://localhost:${PORT}`);
});
