// middleware/creditsStore.js
//
// SINGLE SOURCE OF TRUTH for user credits. Backed by Upstash Redis
// (via @upstash/redis), so balances persist across serverless restarts
// and deploys — unlike the old in-memory version, which reset to 50
// every time Vercel spun up a fresh instance.
//
// Users are keyed by userId (a stable internal user id — wire this to
// your auth system's user id once Stripe/auth is fully connected. Until
// then, the studio falls back to a per-browser anonymous id (see
// utils/getUserId.js) so credits at least persist on the SAME user's
// requests instead of always resetting to a hardcoded "demo-user".

import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const CREDITS_KEY = (userId) => `credits:${userId}`;
const FREE_STARTING_CREDITS = 20; // small free allotment for new/unpaid users

export async function getUserCredits(userId) {
  if (!userId) return 0;

  const value = await redis.get(CREDITS_KEY(userId));

  if (value === null || value === undefined) {
    // First time we've seen this user — give them a small free balance
    // and persist it so it doesn't reset to a new free balance every call.
    await redis.set(CREDITS_KEY(userId), FREE_STARTING_CREDITS);
    return FREE_STARTING_CREDITS;
  }

  return Number(value) || 0;
}

export async function setUserCredits(userId, amount) {
  if (!userId) throw new Error("Missing userId");
  const safeAmount = Math.max(0, Number(amount) || 0);
  await redis.set(CREDITS_KEY(userId), safeAmount);
  return safeAmount;
}

export async function addCredits(userId, amount) {
  if (!userId) throw new Error("Missing userId");
  const toAdd = Math.max(0, Number(amount) || 0);
  const current = await getUserCredits(userId);
  const updated = current + toAdd;
  await redis.set(CREDITS_KEY(userId), updated);
  return updated;
}

// Returns the new balance, or null if the user doesn't have enough credits.
export async function deductCredits(userId, cost) {
  if (!userId) throw new Error("Missing userId");
  const current = await getUserCredits(userId);

  if (current < cost) {
    return null;
  }

  const updated = current - cost;
  await redis.set(CREDITS_KEY(userId), updated);
  return updated;
}

export async function hasEnoughCredits(userId, cost) {
  const current = await getUserCredits(userId);
  return current >= cost;
}
