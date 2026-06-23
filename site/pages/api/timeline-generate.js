// pages/api/timeline-generate.js
// Updated to use NextAuth session when available for credits and deductions

import { findModelById } from "../../models/index.js";
import { checkCredits } from "../../middleware/creditCheck.js";
import { deductCredits } from "../../middleware/creditsStore.js";
import { runModel, replicate } from "../../utils/runModel.js";
import { getServerSession } from "next-auth/next";
import authOptions from "../../lib/nextauthOptions";

const VIDEO_MERGE_MODEL = "lucataco/video-merge";

async function mergeClips(videoUrls) {
  if (videoUrls.length === 1) return videoUrls[0];

  try {
    const merged = await replicate.run(VIDEO_MERGE_MODEL, {
      input: { video_files: videoUrls },
    });
    return Array.isArray(merged) ? merged[0] : merged;
  } catch (err) {
    console.warn(
      "video-merge: bulk merge failed, falling back to pairwise merge.",
      err.message
    );

    let current = videoUrls[0];
    for (let i = 1; i < videoUrls.length; i++) {
      const merged = await replicate.run(VIDEO_MERGE_MODEL, {
        input: { video_files: [current, videoUrls[i]] },
      });
      current = Array.isArray(merged) ? merged[0] : merged;
    }
    return current;
  }
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { userId: bodyUserId, characters, blocks, ttsModelId, lipsyncModelId } = req.body || {};

    const session = await getServerSession(req, res, authOptions);
    const sessionUserId = session?.user?.id;
    const sessionEmail = session?.user?.email;

    const userId = sessionUserId ?? bodyUserId;

    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }

    if (!Array.isArray(characters) || characters.length === 0) {
      return res.status(400).json({ error: "Need at least one character" });
    }

    if (!Array.isArray(blocks) || blocks.length === 0) {
      return res.status(400).json({ error: "Timeline has no dialogue blocks" });
    }

    const ttsModel = findModelById(ttsModelId);
    const lipsyncModel = findModelById(lipsyncModelId);

    if (!ttsModel || ttsModel.category !== "tts") {
      return res.status(400).json({ error: "Invalid TTS model" });
    }

    if (!lipsyncModel || lipsyncModel.category !== "lipsync") {
      return res.status(400).json({ error: "Invalid lipsync model" });
    }

    const costPerBlock = ttsModel.credits + lipsyncModel.credits;
    const totalCost = costPerBlock * blocks.length;

    const hasCredits = await checkCredits(userId, totalCost, sessionEmail);
    if (!hasCredits) {
      return res.status(402).json({
        error: "Not enough credits for this timeline",
        creditsNeeded: totalCost,
      });
    }

    const characterById = (id) => characters.find((c) => c.id === id);
    const orderedBlocks = [...blocks].sort((a, b) => a.startTime - b.startTime);

    const clipUrls = [];

    for (const block of orderedBlocks) {
      const character = characterById(block.characterId);

      if (!character || !character.faceUrl) {
        throw new Error(
          `Missing face image for character in block: "${block.text}"`
        );
      }

      const audioOutput = await runModel(ttsModel, { text: block.text });
      const audioUrl = Array.isArray(audioOutput) ? audioOutput[0] : audioOutput;

      const videoOutput = await runModel(lipsyncModel, {
        face: character.faceUrl,
        audio: audioUrl,
      });
      const videoUrl = Array.isArray(videoOutput) ? videoOutput[0] : videoOutput;

      clipUrls.push(videoUrl);
    }

    const finalVideoUrl = await mergeClips(clipUrls);

    const remaining = await deductCredits(userId, totalCost, sessionEmail);

    return res.status(200).json({
      success: true,
      creditsUsed: totalCost,
      creditsRemaining: remaining === Infinity ? null : remaining,
      clips: clipUrls,
      output: finalVideoUrl,
    });
  } catch (err) {
    console.error("timeline-generate.js error:", err);
    return res.status(500).json({
      error: "Timeline generation failed",
      details: err.message,
    });
  }
}
