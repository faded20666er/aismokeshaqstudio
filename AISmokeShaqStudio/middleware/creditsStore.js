// AISmokeShaqStudio/middleware/creditsStore.js

// Simple in-memory credit store.
// Swap this for Redis / DB later.

const userCredits = {};
// userCredits[userId] = number

export async function getUserCredits(userId) {
  if (!userCredits[userId]) {
    // Default starting credits
    userCredits[userId] = 50;
  }
  return userCredits[userId];
}

export async function setUserCredits(userId, amount) {
  userCredits[userId] = Math.max(0, Number(amount) || 0);
  return userCredits[userId];
}

export async function deductCredits(userId, cost) {
  const current = await getUserCredits(userId);
  const next = Math.max(0, current - cost);
  userCredits[userId] = next;
  return next;
}

export async function addCredits(userId, amount) {
  const current = await getUserCredits(userId);
  const next = current + Math.max(0, Number(amount) || 0);
  userCredits[userId] = next;
  return next;
}
