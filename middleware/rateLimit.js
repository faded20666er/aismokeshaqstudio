// middleware/rateLimit.js
//
// ADDED [Sep 4 2026]: a real security review flagged that nothing
// stopped a single account from spamming the generation/upload
// endpoints as fast as a script could fire requests — even though
// every real generation is already gated by credits (see
// middleware/creditCheck.js), a signed-in user could still hammer the
// submit endpoints far faster than any real person would, running up
// provider API call volume and Vercel function invocations before
// ever running out of credits or noticing something was wrong.
//
// Simple fixed-window counter per (bucket, userId), backed by the same
// Upstash Redis already used everywhere else in this app (see
// middleware/creditsStore.js / jobStore.js for the same connection
// pattern) — no new dependency, no new moving part. This is
// intentionally simple, not a full leaky-bucket/sliding-window
// implementation: good enough to stop a tight spam loop without being
// another thing that can subtly misbehave.
//
// Owner/testing accounts (see middleware/creditsStore.js's
// OWNER_USER_IDS) are exempt — repeatedly testing a feature you're
// actively building shouldn't trip your own rate limit.

import { Redis } from "@upstash/redis";
import { isOwnerUser } from "./creditsStore.js";

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const RATE_LIMIT_KEY = (bucket, userId) => `ratelimit:${bucket}:${userId}`;

// Call after you know the real userId (i.e. after verifyUserId — see
// middleware/verifyUserId.js). Returns { ok: true } if the request may
// proceed, or { ok: false, retryAfterSeconds } if the caller should be
// rejected with a 429.
//
//   const rl = await checkRateLimit("generation", userId, { limit: 30, windowSeconds: 300 });
//   if (!rl.ok) return res.status(429).json({ error: `Too many requests — try again in ${rl.retryAfterSeconds}s` });
export async function checkRateLimit(bucket, userId, { limit, windowSeconds }) {
  if (!userId || isOwnerUser(userId)) {
    return { ok: true };
  }

  const key = RATE_LIMIT_KEY(bucket, userId);
  const count = await redis.incr(key);

  if (count === 1) {
    // First request in this window — start the clock.
    await redis.expire(key, windowSeconds);
  }

  if (count > limit) {
    const ttl = await redis.ttl(key);
    return { ok: false, retryAfterSeconds: ttl > 0 ? ttl : windowSeconds };
  }

  return { ok: true };
}
