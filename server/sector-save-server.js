const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3001;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'dev-token';

// Rate limiting and validation defaults (tunable via env)
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS) || 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 30; // per IP per window
const MAX_SECTORS = Number(process.env.MAX_SECTORS) || 2000;
const MAX_POINTS_PER_SECTOR = Number(process.env.MAX_POINTS_PER_SECTOR) || 2000;

app.use(express.json({ limit: process.env.BODY_LIMIT || '10mb' }));

function ensureStorage() {
  const dir = path.join(__dirname, 'storage');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// Simple in-memory rate limiter (dev only)
const rateMap = new Map();
function rateLimit(req, res, next) {
  try {
    const ip = req.ip || req.connection && req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW_MS;
    const arr = rateMap.get(ip) || [];
    const recent = arr.filter((ts) => ts > windowStart);
    if (recent.length >= RATE_LIMIT_MAX_REQUESTS) {
      return res.status(429).json({ error: 'rate limit exceeded' });
    }
    recent.push(now);
    rateMap.set(ip, recent);
    // simple pruning to avoid unbounded growth
    if (rateMap.size > 20000) rateMap.clear();
  } catch (e) {
    // ignore rate limiter errors
  }
  next();
}

function isValidAdminTokenReq(req) {
  const header = req.header('x-admin-token') || (req.header('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!header || !ADMIN_TOKEN) return false;
  try {
    const a = crypto.createHash('sha256').update(String(header)).digest();
    const b = crypto.createHash('sha256').update(String(ADMIN_TOKEN)).digest();
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch (e) {
    return false;
  }
}

function validateTerritories(territories) {
  if (!Array.isArray(territories)) return 'territories must be an array';
  if (territories.length > MAX_SECTORS) return `too many sectors (max ${MAX_SECTORS})`;
  for (let i = 0; i < territories.length; i++) {
    const t = territories[i];
    if (!t || typeof t !== 'object') return `territory[${i}] invalid`; 
    if (t.id === undefined || t.id === null) return `territory[${i}].id missing`;
    const pid = String(t.id);
    if (pid.length > 128) return `territory[${i}].id too long`;
    const poly = t.polygon;
    if (!Array.isArray(poly)) return `territory[${i}].polygon missing or invalid`;
    if (poly.length < 3) return `territory[${i}].polygon must have >=3 points`;
    if (poly.length > MAX_POINTS_PER_SECTOR) return `territory[${i}].polygon too large (max ${MAX_POINTS_PER_SECTOR})`;
    for (let j = 0; j < poly.length; j++) {
      const p = poly[j];
      if (!Array.isArray(p) || p.length !== 2) return `territory[${i}].polygon[${j}] invalid`;
      const x = Number(p[0]);
      const y = Number(p[1]);
      if (!isFinite(x) || !isFinite(y)) return `territory[${i}].polygon[${j}] not numbers`;
      if (x < 0 || x > 1 || y < 0 || y > 1) return `territory[${i}].polygon[${j}] out of range [0,1]`;
    }
    // optional curves validation
    if (t.curves) {
      if (!Array.isArray(t.curves)) return `territory[${i}].curves invalid`;
      // curves length should match polygon length or be empty/null entries
      for (let k = 0; k < t.curves.length; k++) {
        const c = t.curves[k];
        if (!c) continue;
        if (!c.c1 || !c.c2) return `territory[${i}].curves[${k}] missing control points`;
        const c1x = Number(c.c1[0]); const c1y = Number(c.c1[1]);
        const c2x = Number(c.c2[0]); const c2y = Number(c.c2[1]);
        if (![c1x,c1y,c2x,c2y].every(isFinite)) return `territory[${i}].curves[${k}] controls not numbers`;
        if (c1x < 0 || c1x > 1 || c1y < 0 || c1y > 1 || c2x < 0 || c2x > 1 || c2y < 0 || c2y > 1) return `territory[${i}].curves[${k}] controls out of range`;
      }
    }
  }
  return null;
}

app.post('/admin/api/sectors/save', (req, res) => {
  // auth + rate limit
  if (!isValidAdminTokenReq(req)) return res.status(401).json({ error: 'unauthorized' });
  try { rateLimit(req, res, () => {}); } catch (e) {}
  const body = req.body;
  if (!body || !body.territories) {
    return res.status(400).json({ error: 'missing territories' });
  }
  // validate structure to avoid accidental or malicious payloads
  const validationErr = validateTerritories(body.territories);
  if (validationErr) return res.status(400).json({ error: 'invalid payload', detail: validationErr });
  try {
    const dir = ensureStorage();
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `sectors-${ts}.json`;
    const filepath = path.join(dir, filename);
    fs.writeFileSync(filepath, JSON.stringify(body, null, 2), 'utf8');
    // maintain a latest copy
    const latestPath = path.join(dir, 'latest.json');
    fs.writeFileSync(latestPath, JSON.stringify(body, null, 2), 'utf8');
    return res.json({ ok: true, file: filename });
  } catch (err) {
    console.error('Save error', err);
    return res.status(500).json({ error: 'failed to save', detail: String(err) });
  }
});

app.get('/admin/api/sectors/backups', (req, res) => {
  if (!isValidAdminTokenReq(req)) return res.status(401).json({ error: 'unauthorized' });
  try {
    const dir = ensureStorage();
    const files = fs.readdirSync(dir)
      .filter((f) => {
        if (f === 'latest.json') return true;
        if (f.startsWith('sectors-') && f.endsWith('.json') && !f.includes('/') && !f.includes('..')) return true;
        return false;
      })
      .sort()
      .reverse();
    return res.json({ ok: true, backups: files });
  } catch(err) {
    return res.status(500).json({ error: 'failed to list backups' });
  }
});

// Return the contents of a single backup file (safe for dev use)
app.get('/admin/api/sectors/backup/:name', (req, res) => {
  const authHeader = req.header('x-admin-token') || (req.header('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!authHeader || authHeader !== ADMIN_TOKEN) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  try {
    const dir = ensureStorage();
    const name = req.params.name;
    if (!name || typeof name !== 'string') return res.status(400).json({ error: 'missing name' });
    // Resolve and ensure the file is inside the storage directory
    const filePath = path.resolve(dir, name);
    const rel = path.relative(dir, filePath);
    if (rel.startsWith('..') || path.isAbsolute(rel)) {
      return res.status(400).json({ error: 'invalid file name' });
    }
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'not found' });
    const content = fs.readFileSync(filePath, 'utf8');
    let parsed = null;
    try { parsed = JSON.parse(content); } catch (e) { parsed = content; }
    return res.json({ ok: true, file: name, data: parsed });
  } catch (err) {
    console.error('Read backup error', err);
    return res.status(500).json({ error: 'failed to read backup', detail: String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`Sector save server listening on ${PORT}`);
  console.log(`Use ADMIN_TOKEN env to secure endpoint. Current token: ${ADMIN_TOKEN}`);
});
