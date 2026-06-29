// pages/api/history.js
//
// Returns a user's past generations (image/video/TTS/lipsync/
// timeline). Backs the new History/Gallery page — see
// middleware/historyStore.js for how entries get recorded.

import { getHistory, deleteHistoryItem } from "../../middleware/historyStore.js";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const { userId, category, limit = "50", offset = "0" } = req.query;

      if (!userId) {
        return res.status(400).json({ error: "Missing userId" });
      }

      const result = await getHistory(userId, {
        category: category || undefined,
        limit: Math.min(100, Number(limit) || 50),
        offset: Number(offset) || 0,
      });

      return res.status(200).json(result);
    }

    if (req.method === "DELETE") {
      const { userId, itemId } = req.body || {};

      if (!userId || !itemId) {
        return res.status(400).json({ error: "Missing userId or itemId" });
      }

      const deleted = await deleteHistoryItem(userId, itemId);
      return res.status(200).json({ success: deleted });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("history.js error:", err);
    return res.status(500).json({
      error: "Failed to load history",
      details: err.message,
    });
  }
}
