const crypto = require('crypto');

function parseCookie(header, name) {
  if (!header) return null;
  const match = header.split(';').find((c) => c.trim().startsWith(name + '='));
  return match ? match.split('=').slice(1).join('=').trim() : null;
}

function sign(payload, secret) {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

function verify(cookieValue, secret) {
  const idx = cookieValue.lastIndexOf('.');
  if (idx === -1) return false;
  const payload = cookieValue.slice(0, idx);
  const sig = cookieValue.slice(idx + 1);
  const expected = sign(payload, secret);
  if (sig.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

function createSessionCookie(secret) {
  const payload = String(Date.now());
  return payload + '.' + sign(payload, secret);
}

function safeCompare(a, b) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function dashboardAuth(config) {
  return (req, res, next) => {
    if (!config.dashboardPassword) return next();

    // Allow ?token= query param (for curl one-liners)
    if (req.query.token && safeCompare(req.query.token, config.dashboardPassword)) {
      return next();
    }

    const cookie = parseCookie(req.headers.cookie, 'dashboard_session');
    if (cookie && verify(cookie, config.dashboardPassword)) {
      return next();
    }

    res.redirect('/login');
  };
}

module.exports = { parseCookie, sign, verify, createSessionCookie, safeCompare, dashboardAuth };
