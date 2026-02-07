#!/usr/bin/env bash
set -euo pipefail

PORT=5173

if ! command -v ngrok >/dev/null 2>&1; then
  echo "ngrok not found. Install it first: https://ngrok.com/download" >&2
  exit 1
fi

if ! ngrok config check >/dev/null 2>&1; then
  echo "ngrok not configured. Run: ngrok config add-authtoken <TOKEN>" >&2
  exit 1
fi

echo "Starting ngrok for http://localhost:${PORT}"
ngrok http ${PORT}
