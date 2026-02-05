const DETA_PROJECT_ID = process.env.DETA_PROJECT_ID;
const DETA_PROJECT_KEY = process.env.DETA_PROJECT_KEY;
const BASE_APPSTATE = process.env.DETA_BASE_APPSTATE || 'appstate';
const BASE_SUBMISSIONS = process.env.DETA_BASE_SUBMISSIONS || 'submissions';

async function detaGetItem(base, key) {
  if (!DETA_PROJECT_ID || !DETA_PROJECT_KEY) return null;
  const url = `https://database.deta.sh/v1/${DETA_PROJECT_ID}/${base}/items/${encodeURIComponent(key)}`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${DETA_PROJECT_KEY}` } });
  if (!r.ok) return null;
  return await r.json();
}

async function detaPutItem(base, item) {
  if (!DETA_PROJECT_ID || !DETA_PROJECT_KEY) return null;
  const url = `https://database.deta.sh/v1/${DETA_PROJECT_ID}/${base}/items`;
  const body = JSON.stringify({ item });
  const r = await fetch(url, { method: 'PUT', headers: { Authorization: `Bearer ${DETA_PROJECT_KEY}`, 'Content-Type': 'application/json' }, body });
  if (!r.ok) {
    try { const txt = await r.text(); console.error('detaPutItem failed', txt); } catch {};
    return null;
  }
  return await r.json();
}

async function detaInsertItems(base, items) {
  if (!DETA_PROJECT_ID || !DETA_PROJECT_KEY) return null;
  const url = `https://database.deta.sh/v1/${DETA_PROJECT_ID}/${base}/items`;
  const body = JSON.stringify({ items });
  const r = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${DETA_PROJECT_KEY}`, 'Content-Type': 'application/json' }, body });
  if (!r.ok) return null;
  return await r.json();
}

module.exports = { detaGetItem, detaPutItem, detaInsertItems, BASE_APPSTATE, BASE_SUBMISSIONS };
