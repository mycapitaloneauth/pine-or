#!/usr/bin/env bash
set -euo pipefail

# railway-deploy.sh
# Usage:
# 1) Install Railway CLI and login: https://docs.railway.app/develop/cli
# 2) Export the required env vars in your shell or edit this script to set them.
#    Required: BOT_TOKEN, ADMIN_CHAT_ID, DETA_PROJECT_ID, DETA_PROJECT_KEY
#    Optional: ADMIN_TOKEN, SUBMIT_DELAY_MS
# 3) Run: ./railway-deploy.sh

if ! command -v railway >/dev/null 2>&1; then
  echo "railway CLI not found. Install it and login first: npm i -g @railway/cli" >&2
  exit 1
fi

: "${BOT_TOKEN:?Please set BOT_TOKEN environment variable before running this script}" 
: "${ADMIN_CHAT_ID:?Please set ADMIN_CHAT_ID environment variable before running this script}" 
: "${DETA_PROJECT_ID:?Please set DETA_PROJECT_ID environment variable before running this script}" 
: "${DETA_PROJECT_KEY:?Please set DETA_PROJECT_KEY environment variable before running this script}" 

echo "Setting Railway variables..."
railway variables set BOT_TOKEN "${BOT_TOKEN}"
railway variables set ADMIN_CHAT_ID "${ADMIN_CHAT_ID}"
railway variables set DETA_PROJECT_ID "${DETA_PROJECT_ID}"
railway variables set DETA_PROJECT_KEY "${DETA_PROJECT_KEY}"
if [ -n "${ADMIN_TOKEN:-}" ]; then
  railway variables set ADMIN_TOKEN "${ADMIN_TOKEN}"
fi
if [ -n "${SUBMIT_DELAY_MS:-}" ]; then
  railway variables set SUBMIT_DELAY_MS "${SUBMIT_DELAY_MS}"
fi

echo "Starting deploy (this will build and upload your service)..."
railway up

echo
echo "Deploy complete. To finish, set Telegram webhook with your Railway service URL."
echo "Get your Railway URL with: railway status"
echo "Then run (replace <RAILWAY_URL>):"
echo "  curl \"https://api.telegram.org/bot\$BOT_TOKEN/setWebhook?url=https://<RAILWAY_URL>/telegram_webhook\""
