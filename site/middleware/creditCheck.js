// Thin wrapper so API routes can check credits with optional email (for owner/verified logic)
import { getUserCredits } from "./creditsStore.js";

export async function checkCredits(userId, cost, email = null) {
  if (!userId) return false;
  const credits = await getUserCredits(userId, email);
  if (credits === Infinity) return true;
  if (typeof credits !== "number") return false;
  return credits >= cost;
}
