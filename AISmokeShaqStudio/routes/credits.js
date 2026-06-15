const express = require("express");
const router = express.Router();

module.exports = function (creditsManager) {

  // GET remaining credits
  router.get("/", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];

      if (!userId) {
        return res.status(400).json({ error: "Missing user ID" });
      }

      const credits = await creditsManager.getCredits(userId);

      res.json({
        success: true,
        credits
      });

    } catch (err) {
      console.error("Credits GET error:", err);
      res.status(500).json({ error: "Failed to fetch credits" });
    }
  });

  // ADD credits (used for purchases or admin)
  router.post("/add", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];
      const { amount } = req.body;

      if (!userId || !amount) {
        return res.status(400).json({ error: "Missing user ID or amount" });
      }

      const updated = await creditsManager.addCredits(userId, amount);

      res.json({
        success: true,
        credits: updated
      });

    } catch (err) {
      console.error("Credits ADD error:", err);
      res.status(500).json({ error: "Failed to add credits" });
    }
  });

  // SET credits (used for free trials)
  router.post("/set", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];
      const { amount } = req.body;

      if (!userId || amount === undefined) {
        return res.status(400).json({ error: "Missing user ID or amount" });
      }

      const updated = await creditsManager.setCredits(userId, amount);

      res.json({
        success: true,
        credits: updated
      });

    } catch (err) {
      console.error("Credits SET error:", err);
      res.status(500).json({ error: "Failed to set credits" });
    }
  });

  return router;
};
