// middleware/historyStore.js
//
// Tracks each user's past generations (image/video/TTS/lipsync/
// timeline output URLs) so they can come back later and find what
// they made — "where are my images?" This didn't exist before; every
// past generation only survived if the user manually saved the file
// from their browser. Backed by Redis, same as credits.
//
// Stored as a Redis LIST per user (LPUSH = newest first, naturally
// ordered for display without needing to sort on read). Capped at
// MAX_HISTORY_ITEMS per user to bound storage — older items roll off
// the end of the list automatically via LTRIM. This is a reasonable
// stand-in for "20-day retention" mentioned in early project notes;
// true time-based expiry would need a per-item TTL or a scheduled
// cleanup job, which is a heavier lift — count-based capping was
// chosen for this first pass since it requires no background jobs.

import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const HISTORY_KEY = (userId) => `history:${userId}`;
const MAX_HISTORY_ITEMS = 200;

// category: "image" | "video" | "tts" | "lipsync" | "timeline"
export async function recordGeneration(userId, { category, modelId, modelName, output, creditsUsed, prompt }) {
  if (!userId || !output) return; // don't fail the whole generation over a logging step

  const entry = {
    id: crypto.randomUUID ? crypto.randomUUID() : `gen-${Date.now()}`,
    category,
    modelId,
    modelName: modelName || modelId,
    output,
    creditsUsed: creditsUsed || 0,
    prompt: prompt ? String(prompt).slice(0, 500) : null, // cap stored prompt length
    createdAt: Date.now(),
  };

  try {
    await redis.lpush(HISTORY_KEY(userId), JSON.stringify(entry));
    await redis.ltrim(HISTORY_KEY(userId), 0, MAX_HISTORY_ITEMS - 1);
  } catch (err) {
    // History is a nice-to-have, not critical path — log and move on
    // rather than let a Redis hiccup break the actual generation
    // response the user is waiting on.
    console.error("historyStore.js: failed to record generation:", err.message);
  }
}

export async function getHistory(userId, { category, limit = 50, offset = 0 } = {}) {
  if (!userId) return { items: [], total: 0 };

  try {
    const raw = await redis.lrange(HISTORY_KEY(userId), 0, MAX_HISTORY_ITEMS - 1);
    const all = raw
      .map((item) => {
        try {
          return typeof item === "string" ? JSON.parse(item) : item;
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    const filtered = category ? all.filter((item) => item.category === category) : all;
    const page = filtered.slice(offset, offset + limit);

    return { items: page, total: filtered.length };
  } catch (err) {
    console.error("historyStore.js: failed to read history:", err.message);
    return { items: [], total: 0 };
  }
}

export async function deleteHistoryItem(userId, itemId) {
  if (!userId || !itemId) return false;

  try {
    const raw = await redis.lrange(HISTORY_KEY(userId), 0, MAX_HISTORY_ITEMS - 1);
    const remaining = raw.filter((item) => {
      try {
        const parsed = typeof item === "string" ? JSON.parse(item) : item;
        return parsed.id !== itemId;
      } catch {
        return true;
      }
    });

    // Redis has no direct "delete by value match" for a JSON-encoded
    // list item, so rewrite the whole list minus the removed entry.
    // Fine at this scale (max 200 items per user).
    await redis.del(HISTORY_KEY(userId));
    if (remaining.length > 0) {
      await redis.rpush(HISTORY_KEY(userId), ...remaining);
    }
    return true;
  } catch (err) {
    console.error("historyStore.js: failed to delete history item:", err.message);
    return false;
  }
}
