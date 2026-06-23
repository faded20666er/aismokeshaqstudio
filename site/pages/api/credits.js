// pages/api/credits.js
// Allows the frontend to check/add/set a user's credit balance.
// If no userId is supplied, this will prefer the authenticated session's user.

import { getUserCredits, addCredits, setUserCredits } from "../../middleware/creditsStore.js";
import { getServerSession } from "next-auth/next";
import authOptions from "../../lib/nextauthOptions";

export default async function handler(req, res) {
  try {
    const { method } = req;

    // Try to get session user if available
    const session = await getServerSession(req, res, authOptions);
    const sessionUserId = session?.user?.id;
    const sessionEmail = session?.user?.email;

    if (method === "GET") {
      let { userId } = req.query;
      userId = userId || sessionUserId;

      if (!userId) {
        return res.status(400).json({ error: "Missing userId" });
      }

      const credits = await getUserCredits(userId, sessionEmail);

      return res.status(200).json({
        success: true,
        userId,
        credits,
      });
    }

    if (method === "POST") {
      let { userId, amount, set } = req.body;
      userId = userId || sessionUserId;

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
