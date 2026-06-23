// middleware/creditCheck.js
//
// Thin wrapper around creditsStore so API routes don't talk to Redis
// directly. Keeps the "do they have enough?" logic in one place.

import { getUserCredits } from "./creditsStore.js";

export async function checkCredits(userId, cost) {
  if (!userId) return false;

  const credits = await getUserCredits(userId);
  if (typeof credits !== "number") return false;

  return credits >= cost;
}
