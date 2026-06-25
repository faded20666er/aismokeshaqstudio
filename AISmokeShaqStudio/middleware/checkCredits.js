
module.exports = function (creditsManager) {
  return async function (req, res, next) {
    try {
      const userId = req.headers["x-user-id"];
      const { modelType, modelName } = req.body;

      if (!userId) {
        return res.status(400).json({ error: "Missing user ID" });
      }

      // Validate model exists
      const modelGroup = models[modelType];
      if (!modelGroup || !modelGroup[modelName]) {
        return res.status(400).json({ error: "Invalid model selection" });
      }

      const model = modelGroup[modelName];
      const cost = model.creditCost;

      // Check credits
      const hasEnough = await creditsManager.hasEnough(userId, cost);

      if (!hasEnough) {
        const current = await creditsManager.getCredits(userId);
        return res.status(402).json({
          error: "Not enough credits",
          remaining: current,
          required: cost
        });
      }

      // Attach cost to request so route can deduct later
      req.creditCost = cost;

      next();
    } catch (err) {
      console.error("Credit middleware error:", err);
      res.status(500).json({ error: "Credit check failed" });
    }
  };
};
