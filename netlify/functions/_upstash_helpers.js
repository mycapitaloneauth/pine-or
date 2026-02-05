const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

async function getConfig() {
  try {
    const raw = await redis.get('config');
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error('getConfig error', e);
    return {};
  }
}

async function putConfig(obj) {
  try {
    await redis.set('config', JSON.stringify(obj));
    return obj;
  } catch (e) {
    console.error('putConfig error', e);
    throw e;
  }
}

async function pushSubmission(entry) {
  try {
    await redis.lpush('submissions', JSON.stringify(entry));
  } catch (e) {
    console.error('pushSubmission error', e);
  }
}

async function getRecentSubmissions(limit = 100) {
  try {
    const arr = await redis.lrange('submissions', 0, limit - 1);
    return (arr || []).map(s => {
      try { return JSON.parse(s); } catch { return s; }
    });
  } catch (e) {
    console.error('getRecentSubmissions error', e);
    return [];
  }
}

module.exports = { getConfig, putConfig, pushSubmission, getRecentSubmissions };
