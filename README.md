# mac-github-runners

A central server for managing GitHub Actions self-hosted runners on company Macs. Provides a web dashboard and API for registering, monitoring, and managing runners running locally on macOS machines.

## Features

- **Runner registration** with GitHub API integration and automatic token provisioning
- **Heartbeat monitoring** to track runner status (idle, busy, offline)
- **Web dashboard** with real-time stats and per-runner details (auto-refreshes every 10s)
- **One-line setup** via a dynamically generated install script (`curl | sh`)
- **Runner uninstall** script for clean removal
- Bearer token auth, rate limiting, and security headers

## Prerequisites

- Node.js 20+
- A GitHub Personal Access Token with org runner management permissions
- A publicly accessible URL for the server (so Macs can reach it)

## Setup

1. Clone the repo and install dependencies:

   ```bash
   git clone https://github.com/mhenrichsen/mac-github-runners.git
   cd mac-github-runners
   npm install
   ```

2. Create a `.env` file (see `.env.example`):

   ```
   GITHUB_PAT=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   GITHUB_ORG=your-org-name
   SERVER_URL=https://runners.example.com
   SHARED_SECRET=        # optional, auto-generated if not set
   PORT=3000             # optional, default 3000
   ```

3. Start the server:

   ```bash
   # production
   npm start

   # development (auto-reload on file changes)
   npm run dev
   ```

## Docker

```bash
# copy and fill in your .env
cp .env.example .env

docker compose up -d
```

## Registering a runner

Once the server is running, set up a new macOS runner with:

```bash
curl -fsSL https://runners.example.com/setup.sh | sh
```

The setup script detects the Mac's architecture (arm64/x64), installs the GitHub Actions runner, and configures a LaunchAgent for automatic heartbeats.

## API

| Method | Endpoint             | Description                     |
| ------ | -------------------- | ------------------------------- |
| GET    | `/health`            | Health check                    |
| GET    | `/`                  | Web dashboard                   |
| GET    | `/setup.sh`          | Dynamic install script          |
| POST   | `/api/register`      | Register a new runner           |
| POST   | `/api/heartbeat`     | Runner status heartbeat         |
| GET    | `/api/runners`       | List all runners with summary   |
| POST   | `/api/remove-token`  | Get a GitHub runner remove token|
| GET    | `/api/uninstall.sh`  | Runner uninstall script         |

## Project structure

```
server/
  index.js              # Express app entry point
  config.js             # Environment config loader
  github.js             # GitHub API integration
  runners.js            # Runner state management
  middleware/auth.js     # Bearer token auth
  routes/api.js         # API endpoints
  routes/dashboard.js   # Dashboard route
  routes/setup.js       # Setup script generation
  views/dashboard.html  # Web dashboard UI
scripts/
  uninstall.sh          # Runner uninstall script
```
