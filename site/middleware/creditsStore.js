// Upstash-backed credits helper with OWNER override and verified-email starting credits
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
});

const CREDITS_KEY = (userId) => `credits:${userId}`;
const ANON_STARTING_CREDITS = Number(process.env.ANON_STARTING_CREDITS || 0); // visitors get 0 credits
const VERIFIED_STARTING_CREDITS = Number(process.env.VERIFIED_STARTING_CREDITS || 45);
const OWNER_EMAIL = process.env.OWNER_EMAIL;

export async function getUserCredits(userId, email = null) {
  if (!userId) return 0;

  const key = CREDITS_KEY(userId);
  const value = await redis.get(key);

  if (value === null || value === undefined) {
    // First time: decide starting credits based on whether the user has an email (signed-in)
    if (OWNER_EMAIL && email && email.toLowerCase() === OWNER_EMAIL.toLowerCase()) {
      await redis.set(key, "UNLIMITED");
      return Infinity;
    }

    const start = email ? VERIFIED_STARTING_CREDITS : ANON_STARTING_CREDITS;
    await redis.set(key, start);
    return start;
  }

  if (value === "UNLIMITED") return Infinity;
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
  if (current === Infinity) return Infinity;
  const updated = current + toAdd;
  await redis.set(CREDITS_KEY(userId), updated);
  return updated;
}

// Returns the new balance, or null if the user doesn't have enough credits.
export async function deductCredits(userId, cost, email = null) {
  if (!userId) throw new Error("Missing userId");

  // If owner, ensure UNLIMITED marker and never decrement
  if (OWNER_EMAIL && email && email.toLowerCase() === OWNER_EMAIL.toLowerCase()) {
    await redis.set(CREDITS_KEY(userId), "UNLIMITED");
    return Infinity;
  }

  const current = await getUserCredits(userId, email);
  if (current === Infinity) return Infinity;

  if (current < cost) {
    return null;
  }

  const updated = current - cost;
  await redis.set(CREDITS_KEY(userId), updated);
  return updated;
}

export async function hasEnoughCredits(userId, cost, email = null) {
  const current = await getUserCredits(userId, email);
  if (current === Infinity) return true;
  return current >= cost;
}
