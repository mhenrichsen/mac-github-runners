#!/bin/sh
set -e

RUNNER_DIR="$HOME/actions-runner"
META_FILE="$RUNNER_DIR/.runner-meta"
PLIST_PATH="$HOME/Library/LaunchAgents/com.github-runner.heartbeat.plist"

echo "Uninstalling GitHub Actions runner..."

# 1. Stop and remove heartbeat LaunchAgent
if [ -f "$PLIST_PATH" ]; then
  echo "Removing heartbeat service..."
  launchctl unload "$PLIST_PATH" 2>/dev/null || true
  rm -f "$PLIST_PATH"
fi

# 2. Stop and uninstall runner service
if [ -d "$RUNNER_DIR" ]; then
  cd "$RUNNER_DIR"

  if [ -f "./svc.sh" ]; then
    echo "Stopping runner service..."
    ./svc.sh stop 2>/dev/null || true
    ./svc.sh uninstall 2>/dev/null || true
  fi

  # 3. Get remove token and deregister from GitHub
  if [ -f "$META_FILE" ]; then
    echo "Deregistering from GitHub..."
    . "$META_FILE"

    REMOVE_RESPONSE=$(curl -fsSL -X POST "$SERVER_URL/api/remove-token" \
      -H "Authorization: Bearer $SHARED_SECRET" \
      -H "Content-Type: application/json" 2>/dev/null) || true

    if [ -n "$REMOVE_RESPONSE" ]; then
      REMOVE_TOKEN=$(echo "$REMOVE_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])" 2>/dev/null) || true
      if [ -n "$REMOVE_TOKEN" ] && [ -f "./config.sh" ]; then
        ./config.sh remove --token "$REMOVE_TOKEN" 2>/dev/null || true
      fi
    fi
  fi

  # 4. Remove runner directory
  cd "$HOME"
  echo "Removing runner files..."
  rm -rf "$RUNNER_DIR"
fi

echo ""
echo "==================================="
echo "  Runner uninstalled successfully!"
echo "==================================="
