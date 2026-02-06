const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const runners = require('../runners');
const authMiddleware = require('../middleware/auth');

function rateLimit(maxRequests, windowMs) {
  const hits = new Map();
  let lastReset = Date.now();

  return (req, res, next) => {
    const now = Date.now();
    if (now - lastReset > windowMs) {
      hits.clear();
      lastReset = now;
    }

    const ip = req.ip;
    const count = (hits.get(ip) || 0) + 1;
    hits.set(ip, count);

    if (count > maxRequests) {
      return res.status(429).json({ error: 'Too many requests' });
    }

    next();
  };
}

function slugify(hostname) {
  return hostname
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

module.exports = function apiRoutes(app, config) {
  const auth = authMiddleware(config);

  app.post('/api/register', auth, rateLimit(10, 60_000), async (req, res) => {
    try {
      const { hostname, arch, os, osVersion } = req.body;
      const slug = slugify(hostname);
      const suffix = crypto.randomBytes(2).toString('hex');
      const runnerName = `${slug}-${suffix}`;

      const github = require('../github');
      const token = await github.getRegistrationToken(config.githubOrg, config.githubPat);
      const downloadUrl = await github.getRunnerDownloadUrl(config.githubOrg, config.githubPat, arch);

      runners.register(runnerName, { hostname, arch, os, osVersion, status: 'idle' });

      res.json({
        token,
        orgUrl: 'https://github.com/' + config.githubOrg,
        runnerName,
        downloadUrl,
        labels: ['managed'],
        heartbeatIntervalSeconds: 60,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/heartbeat', auth, rateLimit(120, 60_000), (req, res) => {
    try {
      const { runnerName, hostname, arch, os, status } = req.body;
      runners.heartbeat(runnerName, { hostname, arch, os, status });
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/runners', auth, (req, res) => {
    try {
      res.json({ runners: runners.getAll(), summary: runners.getSummary() });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/remove-token', auth, async (req, res) => {
    try {
      const github = require('../github');
      const token = await github.getRemoveToken(config.githubOrg, config.githubPat);
      res.json({ token });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/uninstall.sh', (req, res) => {
    const scriptPath = path.join(__dirname, '../../scripts/uninstall.sh');
    fs.readFile(scriptPath, 'utf8', (err, data) => {
      if (err) {
        return res.status(404).json({ error: 'Script not found' });
      }
      res.type('text/plain').send(data);
    });
  });
};
