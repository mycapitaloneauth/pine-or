<#
.SYNOPSIS
  Railway deploy helper (PowerShell)

#>
if (-not (Get-Command railway -ErrorAction SilentlyContinue)) {
  Write-Error "railway CLI not found. Install via 'npm i -g @railway/cli' and login first."
  exit 1
}

if (-not $env:BOT_TOKEN) { Write-Error 'Please set BOT_TOKEN environment variable.'; exit 1 }
if (-not $env:ADMIN_CHAT_ID) { Write-Error 'Please set ADMIN_CHAT_ID environment variable.'; exit 1 }
if (-not $env:DETA_PROJECT_ID) { Write-Error 'Please set DETA_PROJECT_ID environment variable.'; exit 1 }
if (-not $env:DETA_PROJECT_KEY) { Write-Error 'Please set DETA_PROJECT_KEY environment variable.'; exit 1 }

Write-Output 'Setting Railway variables...'
railway variables set BOT_TOKEN $env:BOT_TOKEN
railway variables set ADMIN_CHAT_ID $env:ADMIN_CHAT_ID
railway variables set DETA_PROJECT_ID $env:DETA_PROJECT_ID
railway variables set DETA_PROJECT_KEY $env:DETA_PROJECT_KEY
if ($env:ADMIN_TOKEN) { railway variables set ADMIN_TOKEN $env:ADMIN_TOKEN }
if ($env:SUBMIT_DELAY_MS) { railway variables set SUBMIT_DELAY_MS $env:SUBMIT_DELAY_MS }

Write-Output 'Deploying... (this may take a minute)'
railway up

Write-Output "Deploy complete. Run 'railway status' to find your service URL, then set the Telegram webhook:''"
Write-Output "curl \"https://api.telegram.org/bot$($env:BOT_TOKEN)/setWebhook?url=https://<RAILWAY_URL>/telegram_webhook\""
