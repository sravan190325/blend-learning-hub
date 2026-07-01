/**
 * Blend Learning Hub — Simple Server (NO AUTH)
 * Anyone can view, edit and earn certificates. Identifies users by name only.
 */
const express = require('express');
const cors    = require('cors');
const crypto  = require('crypto');
const fs      = require('fs');
const path    = require('path');
const certificates = require('./certificates');

const app  = express();
const PORT = process.env.PORT || 3000;

// DATA_DIR can be overridden via env var (e.g. Render persistent disk mount point).
// Defaults to the server folder. The folder is created if it doesn't exist.
const DATA_DIR  = process.env.DATA_DIR || __dirname;
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const DATA_FILE = path.join(DATA_DIR, 'data.json');
const HTML_DIR  = path.join(__dirname, '..');

app.use(cors());
app.use(express.json({ limit: '5mb' }));

// ─── Serialized write queue (prevents file corruption) ───
let writeQueue = Promise.resolve();
function enqueueWrite(fn) {
  writeQueue = writeQueue.then(fn).catch(e => console.error('Write error:', e));
  return writeQueue;
}

// ─── Data helpers ───
function readData()  { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
function writeData(d){ fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2), 'utf8'); }

// ─── Seed data.json from HTML DEFAULT_MODULES ───
function extractDefaultModules(htmlFile) {
  const html = fs.readFileSync(htmlFile, 'utf8');
  const match = html.match(/const DEFAULT_MODULES\s*=\s*(\[[\s\S]*?\n\];)/);
  if (!match) return [];
  try {
    return new Function('return ' + match[1].replace(/;$/, ''))();
  } catch (e) {
    console.error('Failed to parse DEFAULT_MODULES from', htmlFile, e.message);
    return [];
  }
}

function seedData() {
  const forceReseed = process.env.FORCE_RESEED === '1';
  if (forceReseed && fs.existsSync(DATA_FILE)) {
    console.log('FORCE_RESEED=1 — wiping data.json and reseeding...');
    fs.unlinkSync(DATA_FILE);
  }
  if (fs.existsSync(DATA_FILE)) {
    console.log('data.json exists — preserving all user edits.');
    return;
  }
  console.log('Seeding data.json from HTML files...');
  const data = {
    users: {},
    modules: {
      foundation: extractDefaultModules(path.join(HTML_DIR, 'foundation.html')),
      advanced:   extractDefaultModules(path.join(HTML_DIR, 'advanced.html')),
      enterprise: extractDefaultModules(path.join(HTML_DIR, 'enterprise.html'))
    },
    progress: {},
    certificates: {}
  };
  writeData(data);
  console.log(`Seeded: ${data.modules.foundation.length} foundation, ${data.modules.advanced.length} advanced, ${data.modules.enterprise.length} enterprise modules.`);
}
seedData();

// ─── User identification (no auth — just name) ───
// Every request carries x-user-id and x-user-name headers.
// First time we see a userId, we register them.
function identifyUser(req, res, next) {
  const userId   = req.headers['x-user-id'];
  const userName = req.headers['x-user-name'] || 'Anonymous';
  if (!userId) {
    return res.status(400).json({ error: 'Missing x-user-id header' });
  }
  const data = readData();
  if (!data.users[userId]) {
    // Register on first sight
    enqueueWrite(() => {
      const d = readData();
      if (!d.users[userId]) {
        d.users[userId] = {
          id: userId,
          name: userName,
          createdAt: Date.now(),
          lastSeen: Date.now()
        };
        d.progress[userId] = { foundation: {}, advanced: {}, enterprise: {} };
        writeData(d);
      }
    });
    req.user = { id: userId, name: userName, createdAt: Date.now(), lastSeen: Date.now() };
  } else {
    // Update name if changed + lastSeen
    if (data.users[userId].name !== userName || Date.now() - (data.users[userId].lastSeen || 0) > 60000) {
      enqueueWrite(() => {
        const d = readData();
        if (d.users[userId]) {
          d.users[userId].name = userName;
          d.users[userId].lastSeen = Date.now();
          writeData(d);
        }
      });
    }
    req.user = data.users[userId];
  }
  next();
}

// ─── Modules ───
const VALID_TRACKS = ['foundation', 'advanced', 'enterprise'];

app.get('/api/modules/:track', identifyUser, (req, res) => {
  if (!VALID_TRACKS.includes(req.params.track)) {
    return res.status(400).json({ error: 'Invalid track' });
  }
  const data = readData();
  res.json(data.modules[req.params.track] || []);
});

// Save the entire modules array (used when adding/deleting modules)
app.put('/api/modules/:track', identifyUser, (req, res) => {
  if (!VALID_TRACKS.includes(req.params.track)) {
    return res.status(400).json({ error: 'Invalid track' });
  }
  enqueueWrite(() => {
    const data = readData();
    data.modules[req.params.track] = req.body;
    writeData(data);
    res.json({ ok: true });
  });
});

// Update single module
app.put('/api/modules/:track/:id', identifyUser, (req, res) => {
  if (!VALID_TRACKS.includes(req.params.track)) {
    return res.status(400).json({ error: 'Invalid track' });
  }
  const modId = parseInt(req.params.id);
  enqueueWrite(() => {
    const data = readData();
    const mods = data.modules[req.params.track] || [];
    const idx  = mods.findIndex(m => m.id === modId);
    if (idx === -1) {
      res.status(404).json({ error: 'Module not found' });
      return;
    }
    mods[idx] = { ...mods[idx], ...req.body, id: modId };
    writeData(data);
    res.json(mods[idx]);
  });
});

// ─── Progress ───
app.get('/api/progress', identifyUser, (req, res) => {
  const data = readData();
  res.json(data.progress[req.user.id] || { foundation: {}, advanced: {}, enterprise: {} });
});

app.get('/api/progress/:track', identifyUser, (req, res) => {
  if (!VALID_TRACKS.includes(req.params.track)) {
    return res.status(400).json({ error: 'Invalid track' });
  }
  const data = readData();
  const userProgress = data.progress[req.user.id] || {};
  res.json(userProgress[req.params.track] || {});
});

app.put('/api/progress/:track', identifyUser, (req, res) => {
  if (!VALID_TRACKS.includes(req.params.track)) {
    return res.status(400).json({ error: 'Invalid track' });
  }
  enqueueWrite(() => {
    const data = readData();
    if (!data.progress[req.user.id]) {
      data.progress[req.user.id] = { foundation: {}, advanced: {}, enterprise: {} };
    }
    data.progress[req.user.id][req.params.track] = req.body;
    writeData(data);
    res.json({ ok: true });
  });
});

// ─── Dashboard ───
app.get('/api/dashboard', identifyUser, (req, res) => {
  const data = readData();
  const userProgress = data.progress[req.user.id] || {};
  const result = {};
  for (const track of VALID_TRACKS) {
    const tp   = userProgress[track] || {};
    const mods = data.modules[track] || [];
    const completed = mods.filter(m => (tp[m.id] || {}).completed).length;
    const total     = mods.length;
    const earnedXP  = mods.reduce((s, m) => s + ((tp[m.id] || {}).completed ? m.xp : 0), 0);
    const totalXP   = mods.reduce((s, m) => s + m.xp, 0);
    const isCompleted = total > 0 && completed === total;
    const hasCert = certificates.hasCertificate(req.user.id, track);
    result[track] = {
      completed, total, earnedXP, totalXP,
      isCompleted,
      certificateAvailable: isCompleted && hasCert
    };
  }
  res.json(result);
});

// ─── Certificates ───
app.get('/api/certificates/status/:track', identifyUser, (req, res) => {
  if (!VALID_TRACKS.includes(req.params.track)) {
    return res.status(400).json({ error: 'Invalid track' });
  }
  try {
    const data = readData();
    const mods = data.modules[req.params.track] || [];
    const tp   = (data.progress[req.user.id] || {})[req.params.track] || {};
    const total = mods.length;
    const completed = mods.filter(m => (tp[m.id] || {}).completed).length;
    const isCompleted = total > 0 && completed === total;
    const certMetadata = certificates.getCertificateMetadata(req.user.id, req.params.track);
    let status = 'not-started';
    if (isCompleted) status = 'completed';
    else if (completed > 0) status = 'in-progress';
    res.json({
      track: req.params.track,
      status, isCompleted,
      progress: { completed, total },
      certificate: certMetadata || null
    });
  } catch (e) {
    console.error('cert status error:', e);
    res.status(500).json({ error: 'Failed to get certificate status' });
  }
});

app.get('/api/certificates/all', identifyUser, (req, res) => {
  try {
    const certs = certificates.getUserCertificates(req.user.id);
    res.json({ certificates: certs });
  } catch (e) {
    console.error('cert list error:', e);
    res.status(500).json({ error: 'Failed to get certificates' });
  }
});

app.post('/api/certificates/generate/:track', identifyUser, async (req, res) => {
  if (!VALID_TRACKS.includes(req.params.track)) {
    return res.status(400).json({ error: 'Invalid track' });
  }
  try {
    const data  = readData();
    const track = req.params.track;
    const mods  = data.modules[track] || [];
    const tp    = (data.progress[req.user.id] || {})[track] || {};
    const total = mods.length;
    const completed = mods.filter(m => (tp[m.id] || {}).completed).length;
    if (total === 0 || completed !== total) {
      return res.status(400).json({
        error: 'Track not completed',
        message: 'You must complete 100% of the learning track to earn a certificate'
      });
    }
    const trackData = { title: `${track.charAt(0).toUpperCase() + track.slice(1)} Track`, level: track };
    const certMetadata = certificates.getOrCreateCertificate(
      req.user.id, track, req.user, trackData
    );
    res.json({ success: true, certificate: certMetadata, message: 'Certificate generated successfully' });
  } catch (e) {
    console.error('cert gen error:', e);
    res.status(500).json({ error: 'Failed to generate certificate' });
  }
});

app.get('/api/certificates/download/:track', identifyUser, async (req, res) => {
  if (!VALID_TRACKS.includes(req.params.track)) {
    return res.status(400).json({ error: 'Invalid track' });
  }
  try {
    const data  = readData();
    const track = req.params.track;
    const mods  = data.modules[track] || [];
    const tp    = (data.progress[req.user.id] || {})[track] || {};
    const total = mods.length;
    const completed = mods.filter(m => (tp[m.id] || {}).completed).length;
    if (total === 0 || completed !== total) {
      return res.status(403).json({ error: 'Track not completed' });
    }
    const trackData = { title: `${track.charAt(0).toUpperCase() + track.slice(1)} Track`, level: track };
    const certMetadata = certificates.getOrCreateCertificate(req.user.id, track, req.user, trackData);
    const pdfBuffer = await certificates.generateCertificatePDF({
      userName: req.user.name,
      trackName: trackData.title || `${track} Learning Track`,
      completionDate: new Date(certMetadata.completionDate),
      certificateId: certMetadata.certificateId,
      trackLevel: track
    });
    const filename = `${req.user.name.replace(/\s+/g, '_')}_${track}_Certificate_${new Date().getFullYear()}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (e) {
    console.error('cert download error:', e);
    res.status(500).json({ error: 'Failed to download certificate' });
  }
});

// ─── Health check ───
app.get('/api/health', (req, res) => res.json({ ok: true, ts: Date.now() }));

// ─── Serve static files ───
app.use(express.static(HTML_DIR));

app.listen(PORT, () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Blend Learning Hub running');
  console.log(`  Open: http://localhost:${PORT}`);
  console.log('  No login required — anyone can view & edit');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});
