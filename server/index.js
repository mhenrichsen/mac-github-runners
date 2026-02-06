const express = require('express');
const fs = require('fs');
const path = require('path');
const { loadConfig } = require('./config');
const { dashboardAuth, safeCompare, createSessionCookie } = require('./middleware/dashboardAuth');

const config = loadConfig();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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

// Login / logout routes
const loginTemplatePath = path.join(__dirname, 'views/login.html');
const loginTemplate = fs.readFileSync(loginTemplatePath, 'utf8');

app.get('/login', (req, res) => {
  const errorBlock = req.query.error
    ? '<div class="error-msg">Invalid password. Please try again.</div>'
    : '';
  res.type('text/html').send(loginTemplate.replace('{{ERROR_BLOCK}}', errorBlock));
});

app.post('/login', (req, res) => {
  const password = req.body.password || '';
  if (!config.dashboardPassword || !safeCompare(password, config.dashboardPassword)) {
    return res.redirect('/login?error=1');
  }
  const cookie = createSessionCookie(config.dashboardPassword);
  res.setHeader('Set-Cookie', `dashboard_session=${cookie}; HttpOnly; Path=/; SameSite=Lax`);
  res.redirect('/');
});

app.post('/logout', (req, res) => {
  res.setHeader('Set-Cookie', 'dashboard_session=; HttpOnly; Path=/; Max-Age=0');
  res.redirect('/login');
});

// Dashboard auth middleware for protected routes
const requireDashboardAuth = dashboardAuth(config);

// Mount routes
const setupRoutes = require('./routes/setup');
const dashboardRoutes = require('./routes/dashboard');
const apiRoutes = require('./routes/api');

// Protect dashboard and setup script behind password (when configured)
app.get('/', requireDashboardAuth);
app.get('/setup.sh', requireDashboardAuth);

setupRoutes(app, config);
dashboardRoutes(app, config);
apiRoutes(app, config);

app.listen(config.port, () => {
  console.log(`Runner manager listening on port ${config.port}`);
  console.log(`Dashboard: ${config.serverUrl}`);
  console.log(`Setup:     curl -fsSL ${config.serverUrl}/setup.sh | sh`);
});
