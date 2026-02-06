module.exports = function setupRoutes(app, config) {
  app.get('/setup.sh', (req, res) => {
    const script = `#!/bin/sh
set -e

SERVER_URL="${config.serverUrl}"
SHARED_SECRET="${config.sharedSecret}"

# 1. Preflight
if [ "$(uname)" != "Darwin" ]; then echo "Error: macOS required"; exit 1; fi
if [ "$(id -u)" = "0" ]; then echo "Error: do not run as root"; exit 1; fi
command -v curl >/dev/null || { echo "Error: curl required"; exit 1; }
command -v python3 >/dev/null || { echo "Error: python3 required"; exit 1; }

# 2. Detect arch
ARCH=$(uname -m)
if [ "$ARCH" = "arm64" ]; then
  API_ARCH="arm64"
elif [ "$ARCH" = "x86_64" ]; then
  API_ARCH="x64"
else
  echo "Error: unsupported architecture: $ARCH"; exit 1
fi

HOSTNAME_RAW=$(hostname -s)

# 3. Register with server
echo "Registering runner..."
REGISTER_RESPONSE=$(curl -fsSL -X POST "$SERVER_URL/api/register" \\
  -H "Authorization: Bearer $SHARED_SECRET" \\
  -H "Content-Type: application/json" \\
  -d "{\\"hostname\\":\\"$HOSTNAME_RAW\\",\\"arch\\":\\"$API_ARCH\\",\\"os\\":\\"darwin\\",\\"osVersion\\":\\"$(sw_vers -productVersion)\\"}")

# Parse JSON with python3
parse_json() { echo "$REGISTER_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['$1'])"; }

TOKEN=$(parse_json token)
ORG_URL=$(parse_json orgUrl)
RUNNER_NAME=$(parse_json runnerName)
DOWNLOAD_URL=$(parse_json downloadUrl)

echo "Runner name: $RUNNER_NAME"

# 4. Download runner
RUNNER_DIR="$HOME/actions-runner"
mkdir -p "$RUNNER_DIR"
cd "$RUNNER_DIR"

echo "Downloading runner..."
curl -fsSL -o actions-runner.tar.gz "$DOWNLOAD_URL"
tar xzf actions-runner.tar.gz
rm actions-runner.tar.gz

# 5. Configure
echo "Configuring runner..."
./config.sh --url "$ORG_URL" --token "$TOKEN" --name "$RUNNER_NAME" --labels managed --unattended --replace

# 6. Install launchd service
echo "Installing service..."
./svc.sh install
./svc.sh start

# 7. Install heartbeat
cat > "$RUNNER_DIR/heartbeat.sh" << 'HEARTBEAT_EOF'
#!/bin/sh
# Source metadata
. "$HOME/actions-runner/.runner-meta"

# Determine status
STATUS="idle"
if pgrep -f "Runner.Listener" >/dev/null 2>&1; then
  STATUS="idle"
  if pgrep -f "Runner.Worker" >/dev/null 2>&1; then
    STATUS="busy"
  fi
fi

curl -fsSL -X POST "$SERVER_URL/api/heartbeat" \\
  -H "Authorization: Bearer $SHARED_SECRET" \\
  -H "Content-Type: application/json" \\
  -d "{\\"runnerName\\":\\"$RUNNER_NAME\\",\\"hostname\\":\\"$(hostname -s)\\",\\"arch\\":\\"$(uname -m)\\",\\"os\\":\\"darwin\\",\\"status\\":\\"$STATUS\\"}" >/dev/null 2>&1
HEARTBEAT_EOF
chmod +x "$RUNNER_DIR/heartbeat.sh"

# LaunchAgent plist for heartbeat
PLIST_PATH="$HOME/Library/LaunchAgents/com.github-runner.heartbeat.plist"
mkdir -p "$HOME/Library/LaunchAgents"
cat > "$PLIST_PATH" << PLIST_EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.github-runner.heartbeat</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/sh</string>
        <string>\${RUNNER_DIR}/heartbeat.sh</string>
    </array>
    <key>StartInterval</key>
    <integer>60</integer>
    <key>RunAtLoad</key>
    <true/>
    <key>StandardOutPath</key>
    <string>\${RUNNER_DIR}/heartbeat.log</string>
    <key>StandardErrorPath</key>
    <string>\${RUNNER_DIR}/heartbeat.log</string>
</dict>
</plist>
PLIST_EOF
launchctl load "$PLIST_PATH"

# 8. Save metadata
cat > "$RUNNER_DIR/.runner-meta" << META_EOF
SERVER_URL="$SERVER_URL"
SHARED_SECRET="$SHARED_SECRET"
RUNNER_NAME="$RUNNER_NAME"
META_EOF

# 9. Run initial heartbeat
sh "$RUNNER_DIR/heartbeat.sh"

echo ""
echo "==================================="
echo "  Runner installed successfully!"
echo "  Name: $RUNNER_NAME"
echo "==================================="
echo ""
echo "To uninstall: curl -fsSL $SERVER_URL/api/uninstall.sh | sh"
`;

    res.type('text/plain').send(script);
  });
};
