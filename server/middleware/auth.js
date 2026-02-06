const crypto = require('crypto');

function authMiddleware(config) {
  return (req, res, next) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const tokenBuf = Buffer.from(token);
    const secretBuf = Buffer.from(config.sharedSecret);

    if (tokenBuf.length !== secretBuf.length || !crypto.timingSafeEqual(tokenBuf, secretBuf)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    next();
  };
}

module.exports = authMiddleware;
