const { detaPutItem, BASE_APPSTATE } = require('./_deta_helpers');

function authorized(event) {
  const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
  if (!ADMIN_TOKEN) return false;
  const auth = (event.headers && (event.headers.authorization || event.headers.Authorization)) || '';
  if (auth === `Bearer ${ADMIN_TOKEN}`) return true;
  const q = (event.queryStringParameters && event.queryStringParameters.token) || '';
  return q === ADMIN_TOKEN;
}

exports.handler = async function handler(event) {
  if (!authorized(event)) return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const page = body.page === 'none' ? null : (body.page || null);
    const item = { key: 'config', forcedPage: page };
    await detaPutItem(BASE_APPSTATE, item);
    return { statusCode: 200, body: JSON.stringify({ ok: true, forcedPage: page }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
