const { getConfig } = require('./_upstash_helpers');

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,Authorization', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' };

exports.handler = async function handler(event) {
  if (event && event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS };
  try {
    const cfg = await getConfig();
    const forcedPage = cfg.forcedPage || null;
    const acceptingSubmissions = typeof cfg.acceptingSubmissions !== 'undefined' ? cfg.acceptingSubmissions : true;
    const submitDelayMs = typeof cfg.submitDelayMs !== 'undefined' ? cfg.submitDelayMs : 3000;
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ forcedPage, acceptingSubmissions, submitDelayMs }) };
  } catch (e) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: e.message }) };
  }
};
