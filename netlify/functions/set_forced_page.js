const { getConfig, putConfig } = require('./_upstash_helpers');

function authorized(event) {
  const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
  if (!ADMIN_TOKEN) return false;
  const auth = (event.headers && (event.headers.authorization || event.headers.Authorization)) || '';
  if (auth === `Bearer ${ADMIN_TOKEN}`) return true;
  const q = (event.queryStringParameters && event.queryStringParameters.token) || '';
  return q === ADMIN_TOKEN;
}

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,Authorization', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' };

exports.handler = async function handler(event) {
  if (event && event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS };
  if (!authorized(event)) return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Unauthorized' }) };
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const page = body.page === 'none' ? null : (body.page || null);
    const cfg = await getConfig();
    cfg.forcedPage = page;
    await putConfig(cfg);
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, forcedPage: page }) };
  } catch (e) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: e.message }) };
  }
};
