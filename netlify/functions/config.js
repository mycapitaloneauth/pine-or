exports.handler = async function handler(event) {
  const proto = (event.headers && (event.headers['x-forwarded-proto'] || event.headers['X-Forwarded-Proto'])) || 'https';
  const host = (event.headers && (event.headers.host || event.headers.Host)) || 'localhost:3000';
  const backendUrl = `${proto}://${host}`;
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/javascript' },
    body: `window.BACKEND = '${backendUrl}';`
  };
};
