const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,Authorization', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' };

exports.handler = async function handler(event) {
  if (event && event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS };
  return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, uptime: process.uptime ? process.uptime() : 0 }) };
};
