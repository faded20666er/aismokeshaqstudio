import { Redis } from '@upstash/redis';

if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
  // Do not throw here — allow local dev with mocks. Calls will fail when used if env missing.
  console.warn('Upstash KV config missing: set KV_REST_API_URL and KV_REST_API_TOKEN');
}

export const redis = new Redis({
  url: process.env.KV_REST_API_URL || '',
  token: process.env.KV_REST_API_TOKEN || '',
});

export async function getCredits(userId) {
  const key = `credits:${userId}`;
  try {
    const v = await redis.get(key);
    const n = v == null ? 0 : parseInt(v, 10);
    return Number.isFinite(n) ? n : 0;
  } catch (err) {
    console.error('redis getCredits error', err);
    return 0; // fail-open for development
  }
}

export async function setCredits(userId, n) {
  const key = `credits:${userId}`;
  try {
    await redis.set(key, String(n));
    return true;
  } catch (err) {
    console.error('redis setCredits error', err);
    return false;
  }
}
