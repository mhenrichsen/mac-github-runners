const ONLINE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes

const runners = new Map();

function register(runnerName, info) {
  const now = new Date().toISOString();
  runners.set(runnerName, {
    runnerName,
    hostname: info.hostname,
    arch: info.arch,
    os: info.os,
    osVersion: info.osVersion,
    status: info.status || 'idle',
    registeredAt: now,
    lastSeen: now,
  });
}

function heartbeat(runnerName, info) {
  if (!runners.has(runnerName)) {
    register(runnerName, info);
    return;
  }
  const entry = runners.get(runnerName);
  entry.lastSeen = new Date().toISOString();
  if (info.status) entry.status = info.status;
  if (info.hostname) entry.hostname = info.hostname;
  if (info.arch) entry.arch = info.arch;
  if (info.os) entry.os = info.os;
}

function isOnline(entry) {
  return Date.now() - new Date(entry.lastSeen).getTime() < ONLINE_THRESHOLD_MS;
}

function getAll() {
  return Array.from(runners.values()).map((r) => ({
    ...r,
    online: isOnline(r),
  }));
}

function getSummary() {
  let total = 0;
  let online = 0;
  let offline = 0;
  let busy = 0;
  for (const r of runners.values()) {
    total++;
    if (!isOnline(r)) {
      offline++;
    } else {
      online++;
      if (r.status === 'busy') busy++;
    }
  }
  return { total, online, offline, busy };
}

module.exports = { register, heartbeat, getAll, getSummary };
