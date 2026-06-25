// AISmokeShaqStudio/api/lipsync.js

import { MODELS } from "../models/index.js";
import { checkCredits } from "../middleware/creditCheck.js";
import { deductCredits } from "../middleware/creditsStore.js";
import Replicate from "replicate";
import fetch from "node-fetch";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// -------------------------------------------------------------
// Helper: Find model in lipsync category
// -------------------------------------------------------------
function findLipsyncModel(modelId) {
  return MODELS.lipsync.find((m) => m.id === modelId);
}

// -------------------------------------------------------------
// HuggingFace request
// -------------------------------------------------------------
async function runHuggingFace(modelId, inputs) {
  const url = `https://api-inference.huggingface.co/models/${modelId}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.HF_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(inputs),
  });

  if (!response.ok) {
    throw new Error(`HF Error: ${response.statusText}`);
  }

  return await response.json();
}

// -------------------------------------------------------------
// MAIN HANDLER
// -------------------------------------------------------------
export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { modelId, inputs, userId, nsfwEnabled } = req.body;

    if (!modelId) {
      return res.status(400).json({ error: "Missing modelId" });
    }

    const model = findLipsyncModel(modelId);

    if (!model) {
      return res.status(404).json({ error: "Lipsync model not found" });
    }

    // ---------------------------------------------------------
    // NSFW LOCK CHECK
    // ---------------------------------------------------------
    if (model.nsfw && model.locked && !nsfwEnabled) {
      return res.status(403).json({
        error: "NSFW model locked. Enable NSFW mode to use this model.",
      });
    }

    // ---------------------------------------------------------
    // CREDIT CHECK
    // ---------------------------------------------------------
    const hasCredits = await checkCredits(userId, model.credits);

    if (!hasCredits) {
      return res.status(402).json({
        error: "Not enough credits",
      });
    }

    // ---------------------------------------------------------
    // RUN MODEL (Replicate or HuggingFace)
    // ---------------------------------------------------------
    let output;

    if (model.provider === "replicate") {
      output = await replicate.run(model.id, { input: inputs });
    } else if (model.provider === "huggingface") {
      output = await runHuggingFace(model.id, inputs);
    } else {
      return res.status(500).json({ error: "Unknown provider" });
    }

    // ---------------------------------------------------------
    // DEDUCT CREDITS
    // ---------------------------------------------------------
    await deductCredits(userId, model.credits);

    // ---------------------------------------------------------
    // SUCCESS
    // ---------------------------------------------------------
    return res.status(200).json({
      success: true,
      model: model.id,
      creditsUsed: model.credits,
      output,
    });
  } catch (err) {
    console.error("lipsync.js error:", err);
    return res.status(500).json({
      error: "Lipsync generation failed",
      details: err.message,
    });
  }
}
