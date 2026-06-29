// middleware/byokStore.js
//
// Stores customer-provided ElevenLabs API keys (BYOK — "bring your own
// key"), encrypted at rest. Gated to Pro/Premium subscribers — see
// pages/api/byok-key.js for the tier check before allowing a save.

import { Redis } from "@upstash/redis";
import { encryptSecret, decryptSecret } from "../utils/encryption.js";

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const BYOK_KEY = (userId, provider) => `byok:${provider}:${userId}`;

export async function saveByokKey(userId, provider, apiKey) {
  if (!userId || !provider || !apiKey) {
    throw new Error("Missing userId, provider, or apiKey");
  }
  const encrypted = encryptSecret(apiKey);
  await redis.set(BYOK_KEY(userId, provider), encrypted);
}

export async function getByokKey(userId, provider) {
  if (!userId || !provider) return null;
  const encrypted = await redis.get(BYOK_KEY(userId, provider));
  if (!encrypted) return null;
  try {
    return decryptSecret(encrypted);
  } catch (err) {
    console.error("byokStore: failed to decrypt key", err.message);
    return null;
  }
}

export async function deleteByokKey(userId, provider) {
  if (!userId || !provider) return;
  await redis.del(BYOK_KEY(userId, provider));
}

export async function hasByokKey(userId, provider) {
  const key = await getByokKey(userId, provider);
  return !!key;
}
