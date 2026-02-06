const crypto = require('crypto');

function loadConfig() {
  const { GITHUB_PAT, GITHUB_ORG, SERVER_URL, SHARED_SECRET, PORT } = process.env;

  if (!GITHUB_PAT) throw new Error('GITHUB_PAT is required');
  if (!GITHUB_ORG) throw new Error('GITHUB_ORG is required');
  if (!SERVER_URL) throw new Error('SERVER_URL is required');

  return {
    githubPat: GITHUB_PAT,
    githubOrg: GITHUB_ORG,
    serverUrl: SERVER_URL.replace(/\/+$/, ''),
    sharedSecret: SHARED_SECRET || crypto.randomBytes(32).toString('hex'),
    port: parseInt(PORT, 10) || 3000,
  };
}

module.exports = { loadConfig };
