exports.handler = async function handler() {
  return { statusCode: 200, body: JSON.stringify({ ok: true, uptime: process.uptime ? process.uptime() : 0 }) };
};
