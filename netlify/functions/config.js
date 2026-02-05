const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,Authorization', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' };

exports.handler = async function handler(event) {
  if (event && event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: Object.assign({}, CORS, { 'Content-Type': 'application/javascript' }) };
  const proto = (event.headers && (event.headers['x-forwarded-proto'] || event.headers['X-Forwarded-Proto'])) || 'https';
  const host = (event.headers && (event.headers.host || event.headers.Host)) || 'localhost:3000';
  const backendUrl = `${proto}://${host}`;
  return {
    statusCode: 200,
    headers: Object.assign({}, CORS, { 'Content-Type': 'application/javascript' }),
    body: `window.BACKEND = '${backendUrl}';`
  };
};
