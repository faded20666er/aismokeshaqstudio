// pages/api/credits.js
//
// Lets the frontend check/add/set a user's credit balance. Now backed
// by the consolidated Redis store (see middleware/creditsStore.js) so
// balances persist instead of resetting on every serverless cold start.

import { getUserCredits, addCredits, setUserCredits } from "../../middleware/creditsStore.js";

export default async function handler(req, res) {
  try {
    const { method } = req;

    if (method === "GET") {
      const { userId } = req.query;

      if (!userId) {
        return res.status(400).json({ error: "Missing userId" });
      }

      const credits = await getUserCredits(userId);

      return res.status(200).json({
        success: true,
        userId,
        credits,
      });
    }

    if (method === "POST") {
      const { userId, amount, set } = req.body;

      if (!userId) {
        return res.status(400).json({ error: "Missing userId" });
      }

      let updated;

      if (typeof set === "number") {
        updated = await setUserCredits(userId, set);
      } else if (typeof amount === "number") {
        updated = await addCredits(userId, amount);
      } else {
        return res.status(400).json({ error: "Missing amount or set value" });
      }

      return res.status(200).json({
        success: true,
        userId,
        credits: updated,
      });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("credits.js error:", err);
    return res.status(500).json({
      error: "Failed to process credit request",
      details: err.message,
    });
  }
}
