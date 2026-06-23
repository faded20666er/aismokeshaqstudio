// pages/api/generate.js (modified to prefer NextAuth session when available)
import { put } from "@vercel/blob";
import { findModelById } from "../../models/index.js";
import { checkCredits } from "../../middleware/creditCheck.js";
import { deductCredits } from "../../middleware/creditsStore.js";
import { runModel } from "../../utils/runModel.js";
import { getServerSession } from "next-auth/next";
import authOptions from "../../lib/nextauthOptions.js";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "15mb",
    },
  },
};

async function uploadFileInput(file, prefix) {
  if (!file) return null;
  const matches = file.match(/^data:(.+);base64,(.+)$/);
  if (!matches) return file; // already a URL

  const buffer = Buffer.from(matches[2], "base64");
  const blob = await put(`${prefix}-${Date.now()}`, buffer, {
    access: "public",
    addRandomSuffix: true,
  });
  return blob.url;
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { modelId, inputs, userId: bodyUserId, nsfwEnabled } = req.body || {};

    // Prefer authenticated session user when available
    const session = await getServerSession(req, res, authOptions);
    const sessionUserId = session?.user?.id;
    const sessionEmail = session?.user?.email;

    const userId = sessionUserId ?? bodyUserId;

    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }

    if (!modelId) {
      return res.status(400).json({ error: "Missing modelId" });
    }

    const model = findModelById(modelId);

    if (!model || (model.category !== "image" && model.category !== "video")) {
      return res.status(404).json({ error: "Model not found" });
    }

    if (model.nsfw && model.locked && !nsfwEnabled) {
      return res.status(403).json({
        error: "NSFW model locked. Enable NSFW mode to use this model.",
      });
    }

    // CREDIT CHECK - pass sessionEmail so verified users get the verified starting credits
    const hasCredits = await checkCredits(userId, model.credits, sessionEmail);

    if (!hasCredits) {
      return res.status(402).json({
        error: "Not enough credits",
      });
    }

    if (inputs?.image) {
      inputs.image = await uploadFileInput(inputs.image, "generate-ref");
    }

    const output = await runModel(model, inputs);

    // DEDUCT CREDITS (only after a successful generation)
    const remaining = await deductCredits(userId, model.credits, sessionEmail);

    return res.status(200).json({
      success: true,
      model: model.id,
      creditsUsed: model.credits,
      creditsRemaining: remaining === Infinity ? null : remaining,
      output,
    });
  } catch (err) {
    console.error("generate.js error:", err);
    return res.status(500).json({
      error: "Generation failed",
      details: err.message,
    });
  }
}
