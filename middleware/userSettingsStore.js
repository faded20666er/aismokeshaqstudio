// middleware/userSettingsStore.js
//
// Persists per-user settings (currently just nsfwEnabled) in Redis,
// same as the credits store. The old version used a plain in-memory
// object, which meant the NSFW toggle preference silently reset to
// off every time the serverless function spun up a new instance.

import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const SETTINGS_KEY = (userId) => `settings:${userId}`;

const DEFAULT_SETTINGS = {
  nsfwEnabled: false,
};

export async function getUserSettings(userId) {
  if (!userId) return { ...DEFAULT_SETTINGS };

  const value = await redis.get(SETTINGS_KEY(userId));

  if (!value) {
    return { ...DEFAULT_SETTINGS };
  }

  // Upstash sometimes returns objects already parsed, sometimes as a
  // JSON string depending on SDK version — handle both safely.
  if (typeof value === "string") {
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(value) };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  return { ...DEFAULT_SETTINGS, ...value };
}

export async function updateUserSettings(userId, newSettings) {
  if (!userId) throw new Error("Missing userId");

  const current = await getUserSettings(userId);
  const updated = { ...current, ...newSettings };

  await redis.set(SETTINGS_KEY(userId), JSON.stringify(updated));

  return updated;
}
