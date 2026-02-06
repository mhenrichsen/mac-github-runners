const API_BASE = 'https://api.github.com';

async function githubRequest(method, path, pat, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${pat}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API ${method} ${path} failed (${res.status}): ${text}`);
  }

  return res.json();
}

async function getRegistrationToken(org, pat) {
  const data = await githubRequest('POST', `/orgs/${org}/actions/runners/registration-token`, pat);
  return data.token;
}

async function getRunnerDownloadUrl(org, pat, arch) {
  const downloads = await githubRequest('GET', `/orgs/${org}/actions/runners/downloads`, pat);
  const ghArch = arch === 'arm64' ? 'arm64' : 'x64';
  const match = downloads.find((d) => d.os === 'osx' && d.architecture === ghArch);
  if (!match) {
    throw new Error(`No runner download found for osx/${ghArch}`);
  }
  return match.download_url;
}

async function getRemoveToken(org, pat) {
  const data = await githubRequest('POST', `/orgs/${org}/actions/runners/remove-token`, pat);
  return data.token;
}

module.exports = { getRegistrationToken, getRunnerDownloadUrl, getRemoveToken };
