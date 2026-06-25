const express = require("express");
const router = express.Router();

const models = require("../config/models");
const ReplicateClient = require("../utils/replicateClient");
const HFClient = require("../utils/hfClient");

module.exports = function (creditsManager) {
  const replicate = new ReplicateClient(process.env.REPLICATE_API_KEY);
  const hf = new HFClient(process.env.HF_API_KEY);

  // MAIN GENERATION ENDPOINT
  router.post("/", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];
      const { modelType, modelName, input } = req.body;

      if (!userId) {
        return res.status(400).json({ error: "Missing user ID" });
      }

      // Validate model
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

      let result;

      // -----------------------------
      // IMAGE GENERATION (Replicate)
      // -----------------------------
      if (modelType === "image") {
        const prediction = await replicate.runModel(
          model.id,
          model.version,
          input
        );

        result = {
          id: prediction.id,
          status: prediction.status,
          output: prediction.output
        };
      }

      // -----------------------------
      // AUDIO GENERATION (HuggingFace)
      // -----------------------------
      else if (modelType === "audio") {
        const audioBuffer = await hf.runModel(model.id, input);

        result = {
          type: "audio",
          buffer: audioBuffer.toString("base64")
        };
      }

      // -----------------------------
      // VIDEO / LIPSYNC (Replicate)
      // -----------------------------
      else if (modelType === "video") {
        const prediction = await replicate.runModel(
          model.id,
          model.version,
          input
        );

        result = {
          id: prediction.id,
          status: prediction.status,
          output: prediction.output
        };
      }

      // Deduct credits AFTER successful generation
      await creditsManager.deductCredits(userId, cost);

      res.json({
        success: true,
        cost,
        result
      });

    } catch (err) {
      console.error("Generation error:", err);
      res.status(500).json({ error: "Generation failed" });
    }
  });

  return router;
};
