#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${REPO_DIR:-$HOME/irctc-auto-ticket}"
BACKEND_DIR="$REPO_DIR/backend"

echo "[deploy] repo: $REPO_DIR"

cd "$REPO_DIR"
git fetch origin main
git reset --hard origin/main

if [[ ! -f "$BACKEND_DIR/.env" ]]; then
  echo "[deploy] ERROR: $BACKEND_DIR/.env not found."
  echo "[deploy] Create it manually on the server before deploying."
  exit 1
fi

cd "$BACKEND_DIR"

if command -v pm2 >/dev/null 2>&1; then
  echo "[deploy] stopping PM2 processes (free port 3000)"
  pm2 delete all 2>/dev/null || true
fi

echo "[deploy] building and starting Docker container"
docker compose -f docker-compose.prod.yml up -d --build

echo "[deploy] waiting for health check"
sleep 3
curl -sf http://localhost:3000/health | grep -q '"db".*"connected"' || {
  echo "[deploy] ERROR: health check failed"
  docker logs rail-ticket-api --tail 50
  exit 1
}

echo "[deploy] pruning unused Docker images"
docker image prune -f

echo "[deploy] done"
