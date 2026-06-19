// /api/creditsStore.js
import { kv } from '@vercel/kv';

const USER_KEY = (email) => `user:${email}:credits`;

export async function getUserCredits(email) {
  const credits = await kv.get(USER_KEY(email));
  return credits ?? 0; // default if null
}

export async function setUserCredits(email, amount) {
  await kv.set(USER_KEY(email), amount);
  return amount;
}

export async function incrementCredits(email, amount) {
  const newAmount = await kv.incrby(USER_KEY(email), amount);
  return newAmount;
}

export async function decrementCredits(email, amount) {
  const current = await getUserCredits(email);
  if (current < amount) return null; // insufficient credits
  const newAmount = current - amount;
  await kv.set(USER_KEY(email), newAmount);
  return newAmount;
}

