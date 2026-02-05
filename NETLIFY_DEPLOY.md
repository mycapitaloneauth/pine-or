# Netlify Deploy Notes (backend)

1) Prepare Git repo and push `backend/` to GitHub (or push whole workspace). Netlify needs access to the repo.

2) Netlify site settings
- In Netlify, create a new site and connect your repository.
- Build & deploy: you can leave the default build command empty. Ensure `Functions` directory is set to `netlify/functions` (configured in `netlify.toml`).

3) Required environment variables (set in Netlify dashboard → Site settings → Build & deploy → Environment)
- `BOT_TOKEN` (Telegram bot token)
- `ADMIN_CHAT_ID` (or `CHAT_ID`)
- `DETA_PROJECT_ID`
- `DETA_PROJECT_KEY`
- Optional: `ADMIN_TOKEN`, `DETA_BASE_APPSTATE`, `DETA_BASE_SUBMISSIONS`, `SUBMIT_DELAY_MS`

4) After the site is deployed, set the Telegram webhook to the function URL. For your site the command is:

```
# replace $BOT_TOKEN with your Telegram bot token
curl "https://api.telegram.org/bot$BOT_TOKEN/setWebhook?url=https://tranquil-alpaca-8b7744.netlify.app/.netlify/functions/telegram_webhook"
```

5) Frontend
- Edit `frontend/config.js` (or replace it in your static frontend) and set:
  `window.BACKEND = 'https://<NETLIFY_BASE>'`
- Deploy your frontend (Cloudflare Pages or other). The frontend will call Netlify functions under `${BACKEND}/.netlify/functions/...`.

6) Local testing with Netlify CLI

```
# in backend folder
netlify dev

# copy the printed dev URL and set webhook to it (replace <DEV_URL>)
curl "https://api.telegram.org/bot$BOT_TOKEN/setWebhook?url=https://<DEV_URL>/.netlify/functions/telegram_webhook"
```

7) Verify
- Visit `https://<NETLIFY_BASE>/.netlify/functions/health` to confirm function is live.
- Visit `https://<NETLIFY_BASE>/.netlify/functions/get_config` to confirm config read (returns JSON).

If you want, I can replace the placeholder in `frontend/config.js` with your actual Netlify site URL now — send me the site host (e.g. `my-site.netlify.app`).
