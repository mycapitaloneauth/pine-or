Deploying `backend` to Railway

Steps:

1) Install Railway CLI

```
npm i -g @railway/cli
```

2) Login and init project

```
cd "C:/Users/user/Downloads/New folder/backend"
railway login
railway init --name my-backend-project
```

3) Deploy

```
railway up
```

4) Set env vars (via CLI or dashboard)

```
railway variables set BOT_TOKEN=<your_bot_token>
railway variables set ADMIN_CHAT_ID=<admin_chat_id>
railway variables set DETA_PROJECT_ID=<deta_project_id>
railway variables set DETA_PROJECT_KEY=<deta_project_key>
```

5) Set Telegram webhook (replace `<RAILWAY_URL>`)

```
curl "https://api.telegram.org/bot$BOT_TOKEN/setWebhook?url=https://<RAILWAY_URL>/telegram_webhook"
```

Notes:
- If Railway errors about private networking, disable private networking or use public DB credentials.
- I can also add an automation script if you want.
