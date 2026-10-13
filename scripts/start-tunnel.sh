#!/bin/bash
# Start cloudflared tunnel and register Neon Auth webhook.
# Runs automatically before `pnpm dev` to ensure OTP emails are delivered.

set -e

METRICS_PORT=4444
TUNNEL_LOG="/tmp/cloudflared.log"
TUNNEL_PID_FILE="/tmp/cloudflared.pid"

# Kill any existing tunnel
if [ -f "$TUNNEL_PID_FILE" ]; then
  OLD_PID=$(cat "$TUNNEL_PID_FILE")
  if kill -0 "$OLD_PID" 2>/dev/null; then
    echo "Stopping existing tunnel (PID $OLD_PID)..."
    kill "$OLD_PID" 2>/dev/null || true
    sleep 1
  fi
  rm -f "$TUNNEL_PID_FILE"
fi

# Also kill any process on the metrics port
if lsof -ti :$METRICS_PORT >/dev/null 2>&1; then
  echo "Killing process on port $METRICS_PORT..."
  kill $(lsof -ti :$METRICS_PORT) 2>/dev/null || true
  sleep 1
fi

echo "Starting cloudflared tunnel..."
cloudflared tunnel --url http://localhost:8000 --metrics 127.0.0.1:$METRICS_PORT > "$TUNNEL_LOG" 2>&1 &
TUNNEL_PID=$!
echo "$TUNNEL_PID" > "$TUNNEL_PID_FILE"

# Wait for tunnel to be ready (up to 15 seconds)
echo "Waiting for tunnel to be ready..."
for i in $(seq 1 15); do
  if curl -s "http://127.0.0.1:$METRICS_PORT/metrics" 2>/dev/null | grep -q "userHostname"; then
    break
  fi
  sleep 1
done

# Extract hostname from metrics
HOSTNAME=$(curl -s "http://127.0.0.1:$METRICS_PORT/metrics" 2>/dev/null | grep "userHostname" | sed 's/.*userHostname="//;s/".*//')

if [ -z "$HOSTNAME" ]; then
  echo "ERROR: Could not get tunnel hostname"
  echo "Check $TUNNEL_LOG for details"
  exit 1
fi

echo "Tunnel ready: $HOSTNAME"

# Register webhook
echo "Registering Neon Auth webhook..."
neon neon-auth config webhook update \
  --enabled true \
  --url "$HOSTNAME/api/v1/auth/webhooks/neon" \
  --enabled-events send.otp send.magic_link

echo "Webhook registered successfully"
echo "Tunnel PID: $TUNNEL_PID (saved to $TUNNEL_PID_FILE)"
