// pages/api/voice.js
//
// TTS / voice generation endpoint. Moved here from the dead /api
// folder for the same reason as generate.js and lipsync.js.
//
// When a specific ElevenLabs voiceId is provided (from the live voice
// picker), we call ElevenLabs' API directly instead of going through
// Replicate's wrapped elevenlabs/v3 model — Replicate's wrapper doesn't
// expose voice selection, only their own default voice.

import { findModelById } from "../../models/index.js";
import { checkCredits } from "../../middleware/creditCheck.js";
import { deductCredits } from "../../middleware/creditsStore.js";
import { runModel } from "../../utils/runModel.js";

async function runElevenLabsDirect(voiceId, text) {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`ElevenLabs error (${response.status}): ${errText || response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  return `data:audio/mpeg;base64,${base64}`;
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { modelId, inputs, userId, nsfwEnabled } = req.body || {};

    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }

    if (!modelId) {
      return res.status(400).json({ error: "Missing modelId" });
    }

    const model = findModelById(modelId);

    if (!model || model.category !== "tts") {
      return res.status(404).json({ error: "TTS model not found" });
    }

    if (model.nsfw && model.locked && !nsfwEnabled) {
      return res.status(403).json({
        error: "NSFW model locked. Enable NSFW mode to use this model.",
      });
    }

    const hasCredits = await checkCredits(userId, model.credits);

    if (!hasCredits) {
      return res.status(402).json({
        error: "Not enough credits",
      });
    }

    const text = inputs?.text || inputs?.prompt;

    const output = inputs?.voiceId
      ? await runElevenLabsDirect(inputs.voiceId, text)
      : await runModel(model, inputs);

    const remaining = await deductCredits(userId, model.credits);

    return res.status(200).json({
      success: true,
      model: model.id,
      creditsUsed: model.credits,
      creditsRemaining: remaining,
      output,
    });
  } catch (err) {
    console.error("voice.js error:", err);
    return res.status(500).json({
      error: "TTS generation failed",
      details: err.message,
    });
  }
}
