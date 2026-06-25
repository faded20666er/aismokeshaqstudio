// AISmokeShaqStudio/middleware/creditCheck.js

import { getUserCredits } from "./creditsStore.js";

export async function checkCredits(userId, cost) {
  if (!userId) return false;

  const credits = await getUserCredits(userId);
  if (typeof credits !== "number") return false;

  return credits >= cost;
}
