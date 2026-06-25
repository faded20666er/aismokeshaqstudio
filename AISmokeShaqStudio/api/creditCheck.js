// pages/api/creditCheck.js
import { getUserCredits, decrementCredits } from '../../middleware/creditsStore';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, cost } = req.body || {};

  if (!email || typeof cost !== 'number') {
    return res.status(400).json({ error: 'Missing email or cost' });
  }

  const current = await getUserCredits(email);

  if (current < cost) {
    return res.status(200).json({
      ok: false,
      message: 'Not enough credits',
      remaining: current
    });
  }

  const newAmount = await decrementCredits(email, cost);

  return res.status(200).json({
    ok: true,
    remaining: newAmount
  });
}
