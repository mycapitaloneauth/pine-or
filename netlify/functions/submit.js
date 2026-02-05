const { detaInsertItems, BASE_SUBMISSIONS } = require('./_deta_helpers');

async function sendTelegram(botToken, chatId, text) {
  if (!botToken || !chatId) return null;
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' })
    });
  } catch (e) { console.error('sendTelegram failed', e); }
}

exports.handler = async function handler(event) {
  try {
    const botToken = process.env.BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
    const adminChat = process.env.ADMIN_CHAT_ID || process.env.CHAT_ID;
    const payload = event.body ? JSON.parse(event.body) : {};
    const ip = (event.headers && (event.headers['x-forwarded-for'] || event.headers['X-Forwarded-For'])) || 'unknown';
    const entry = { key: `${Date.now()}-${Math.random().toString(36).slice(2,8)}`, timestamp: new Date().toISOString(), ip, data: payload };
    await detaInsertItems(BASE_SUBMISSIONS, [entry]);
    const pretty = `<b>New submission</b>\n<pre>${JSON.stringify(entry, null, 2)}</pre>`;
    await sendTelegram(botToken, adminChat, pretty);
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    console.error('submit handler error', e);
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
