// /api/creditCheck.js
import { getUserCredits, decrementCredits } from './creditsStore';

export async function checkAndDeductCredits(email, cost) {
  const current = await getUserCredits(email);

  if (current < cost) {
    return {
      ok: false,
      message: 'Not enough credits',
      remaining: current
    };
  }

  const newAmount = await decrementCredits(email, cost);

  return {
    ok: true,
    remaining: newAmount
  };
}
