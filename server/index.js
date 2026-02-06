const express = require('express');
const path = require('path');
const { loadConfig } = require('./config');

const config = loadConfig();

const app = express();
app.use(express.json());

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'self' data:;"
  );
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Mount routes
const setupRoutes = require('./routes/setup');
const dashboardRoutes = require('./routes/dashboard');
const apiRoutes = require('./routes/api');

setupRoutes(app, config);
dashboardRoutes(app, config);
apiRoutes(app, config);

app.listen(config.port, () => {
  console.log(`Runner manager listening on port ${config.port}`);
  console.log(`Dashboard: ${config.serverUrl}`);
  console.log(`Setup:     curl -fsSL ${config.serverUrl}/setup.sh | sh`);
});
