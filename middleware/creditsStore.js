// middleware/creditsStore.js
//
// SINGLE SOURCE OF TRUTH for user credits. Backed by Upstash Redis
// (via @upstash/redis), so balances persist across serverless restarts
// and deploys — unlike the old in-memory version, which reset to 50
// every time Vercel spun up a fresh instance.
//
// Users are keyed by userId — the real Clerk user.id when signed in,
// or a per-browser anonymous id when signed out (see
// utils/useAppUserId.js for how that's resolved).
//
// OWNER TESTING BYPASS: set OWNER_USER_IDS in your env (comma-separated
// list of userId values, e.g. from localStorage in your browser) to
// treat those specific users as having unlimited credits — so you (the
// site owner) can test every feature without burning real credits.
// This does NOT affect real customers' credit limits at all.

import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const CREDITS_KEY = (userId) => `credits:${userId}`;
const FREE_STARTING_CREDITS = 20; // small free allotment for new/unpaid users
const OWNER_DISPLAY_BALANCE = 999999; // shown to owner accounts, not actually deducted

function getOwnerUserIds() {
  const raw = process.env.OWNER_USER_IDS || "";
  return raw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

export function isOwnerUser(userId) {
  if (!userId) return false;
  return getOwnerUserIds().includes(userId);
}

export async function getUserCredits(userId) {
  if (!userId) return 0;

  if (isOwnerUser(userId)) {
    return OWNER_DISPLAY_BALANCE;
  }

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
  if (isOwnerUser(userId)) return OWNER_DISPLAY_BALANCE; // never actually stored/limited
  const safeAmount = Math.max(0, Number(amount) || 0);
  await redis.set(CREDITS_KEY(userId), safeAmount);
  return safeAmount;
}

export async function addCredits(userId, amount) {
  if (!userId) throw new Error("Missing userId");
  if (isOwnerUser(userId)) return OWNER_DISPLAY_BALANCE;
  const toAdd = Math.max(0, Number(amount) || 0);
  const current = await getUserCredits(userId);
  const updated = current + toAdd;
  await redis.set(CREDITS_KEY(userId), updated);
  return updated;
}

// Returns the new balance, or null if the user doesn't have enough credits.
export async function deductCredits(userId, cost) {
  if (!userId) throw new Error("Missing userId");

  if (isOwnerUser(userId)) {
    return OWNER_DISPLAY_BALANCE; // owner testing never actually loses credits
  }

  const current = await getUserCredits(userId);

  if (current < cost) {
    return null;
  }

  const updated = current - cost;
  await redis.set(CREDITS_KEY(userId), updated);
  return updated;
}

export async function hasEnoughCredits(userId, cost) {
  if (isOwnerUser(userId)) return true;
  const current = await getUserCredits(userId);
  return current >= cost;
}
