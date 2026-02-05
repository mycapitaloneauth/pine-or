const { pushSubmission } = require('./_upstash_helpers');

async function sendTelegram(botToken, chatId, text) {
  if (!botToken || !chatId) return null;
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' })
    });
  } catch (e) { console.error('sendTelegram failed', e); }
}

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,Authorization', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' };

exports.handler = async function handler(event) {
  if (event && event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS };
  try {
    const botToken = process.env.BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
    const adminChat = process.env.ADMIN_CHAT_ID || process.env.CHAT_ID;
    const payload = event.body ? JSON.parse(event.body) : {};
    const ip = (event.headers && (event.headers['x-forwarded-for'] || event.headers['X-Forwarded-For'])) || 'unknown';
    const entry = { key: `${Date.now()}-${Math.random().toString(36).slice(2,8)}`, timestamp: new Date().toISOString(), ip, data: payload };
    await pushSubmission(entry);
    const pretty = `<b>New submission</b>\n<pre>${JSON.stringify(entry, null, 2)}</pre>`;
    await sendTelegram(botToken, adminChat, pretty);
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    console.error('submit handler error', e);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: e.message }) };
  }
};
