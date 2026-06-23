// pages/api/lipsync.js
// Updated to prefer NextAuth session for userId/email when available

import { put } from "@vercel/blob";
import { findModelById } from "../../models/index.js";
import { checkCredits } from "../../middleware/creditCheck.js";
import { deductCredits } from "../../middleware/creditsStore.js";
import { runModel } from "../../utils/runModel.js";
import { getServerSession } from "next-auth/next";
import authOptions from "../../lib/nextauthOptions.js";

const FALLBACK_TTS_MODEL_ID = "elevenlabs/v3";

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
  if (!matches) return file;

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

    if (!model || model.category !== "lipsync") {
      return res.status(404).json({ error: "Lipsync model not found" });
    }

    if (model.nsfw && model.locked && !nsfwEnabled) {
      return res.status(403).json({
        error: "NSFW model locked. Enable NSFW mode to use this model.",
      });
    }

    if (!inputs?.face) {
      return res.status(400).json({ error: "Missing face image/video" });
    }

    if (!inputs?.audio && !inputs?.prompt) {
      return res.status(400).json({
        error: "Provide either an audio file or a script for text-to-speech",
      });
    }

    const needsTts = !inputs.audio && !!inputs.prompt;
    const ttsModel = needsTts ? findModelById(FALLBACK_TTS_MODEL_ID) : null;
    const totalCost = model.credits + (ttsModel ? ttsModel.credits : 0);

    const hasCredits = await checkCredits(userId, totalCost, sessionEmail);
    if (!hasCredits) {
      return res.status(402).json({ error: "Not enough credits", creditsNeeded: totalCost });
    }

    const faceUrl = await uploadFileInput(inputs.face, "lipsync-face");
    let audioUrl = inputs.audio ? await uploadFileInput(inputs.audio, "lipsync-audio") : null;

    if (!audioUrl) {
      const ttsOutput = await runModel(ttsModel, { prompt: inputs.prompt });
      audioUrl = Array.isArray(ttsOutput) ? ttsOutput[0] : ttsOutput;
    }

    const output = await runModel(model, { face: faceUrl, audio: audioUrl });

    const remaining = await deductCredits(userId, totalCost, sessionEmail);

    return res.status(200).json({
      success: true,
      model: model.id,
      creditsUsed: totalCost,
      creditsRemaining: remaining === Infinity ? null : remaining,
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
