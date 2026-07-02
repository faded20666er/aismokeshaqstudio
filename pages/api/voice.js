// pages/api/voice.js
//
// TTS / voice generation endpoint. Submits the job and returns
// {jobId} immediately, same pattern as generate.js/lipsync.js — TTS
// is usually fast, but this keeps every generation endpoint
// consistent and safely under Vercel's function duration limits
// regardless of provider latency spikes.
//
// When a specific ElevenLabs voiceId is provided, calls ElevenLabs'
// API directly instead of going through Replicate's wrapped
// elevenlabs/v3 model — Replicate's wrapper doesn't expose voice
// selection, only their own default voice.

import { findModelById } from "../../models/index.js";
import { checkCredits } from "../../middleware/creditCheck.js";
import { getByokKey } from "../../middleware/byokStore.js";
import { createJob, generateJobId } from "../../middleware/jobStore.js";
import { startJobInBackground } from "../../utils/runModelAsync.js";

export const maxDuration = 60;

async function runElevenLabsDirect(voiceId, text, apiKey) {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
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

    const byokKey = await getByokKey(userId, "elevenlabs");
    const usingOwnKey = !!byokKey && !!inputs?.voiceId;

    if (!usingOwnKey) {
      const hasCredits = await checkCredits(userId, model.credits);
      if (!hasCredits) {
        return res.status(402).json({ error: "Not enough credits" });
      }
    }

    const text = inputs?.text || inputs?.prompt;

    const jobId = generateJobId();
    await createJob(jobId, { modelId: model.id });

    // Only call ElevenLabs direct when the user has their own BYOK key.
    // The platform's ELEVENLABS_API_KEY is free-tier and 402s on library
    // voices ("Free users cannot use library voices via the API"). Without
    // BYOK, customRunner stays null and the standard Replicate TTS model
    // handles generation — no voice selection, but no 402 either.
    const customRunner = (byokKey && inputs?.voiceId)
      ? () => runElevenLabsDirect(inputs.voiceId, text, byokKey)
      : null;

    startJobInBackground(jobId, model, inputs, {
      userId,
      creditsToCharge: usingOwnKey ? 0 : model.credits,
      recordHistory: true,
      category: "tts",
      prompt: text,
      customRunner,
    });

    return res.status(202).json({
      success: true,
      jobId,
      model: model.id,
      usingOwnKey,
    });
  } catch (err) {
    console.error("voice.js error:", err);
    return res.status(500).json({
      error: "Failed to start TTS generation",
      details: err.message,
    });
  }
}
