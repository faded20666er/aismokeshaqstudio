// pages/api/timeline-generate.js
//
// The multi-character timeline feature. Takes the character roster +
// the ordered dialogue blocks from the timeline UI, and:
//   1. Generates TTS audio for each line
//   2. Lipsyncs that character's face to that audio -> one clip per line
//   3. Merges all clips (in timeline order) into one final video using
//      lucataco/video-merge on Replicate
//
// This is intentionally a slower, multi-step endpoint (it can take a
// while for 5+ lines) — the frontend should show a progress/loading
// state rather than expecting an instant response.

import { findModelById } from "../../models/index.js";
import { checkCredits } from "../../middleware/creditCheck.js";
import { deductCredits } from "../../middleware/creditsStore.js";
import { runModel, replicate } from "../../utils/runModel.js";

const VIDEO_MERGE_MODEL = "lucataco/video-merge";

// Merge an ordered list of video URLs into one file. video-merge takes
// repeatable `video_files` inputs — if your Replicate account's version
// of this model only accepts exactly two inputs, this falls back to
// merging pairwise (1+2, then result+3, then result+4, ...).
async function mergeClips(videoUrls) {
  if (videoUrls.length === 1) return videoUrls[0];

  try {
    // Try sending the whole list at once first.
    const merged = await replicate.run(VIDEO_MERGE_MODEL, {
      input: { video_files: videoUrls },
    });
    return Array.isArray(merged) ? merged[0] : merged;
  } catch (err) {
    console.warn(
      "video-merge: bulk merge failed, falling back to pairwise merge.",
      err.message
    );

    // Pairwise fallback: merge clips two at a time, left to right.
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

    const { userId, characters, blocks, ttsModelId, lipsyncModelId } = req.body || {};

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

    // ---------------------------------------------------------
    // COST ESTIMATE UP FRONT — charge once for the whole timeline,
    // not per-block, so a failure partway through doesn't leave the
    // user double-charged across retries. One TTS + one lipsync per
    // block, plus the (effectively free) merge step.
    // ---------------------------------------------------------
    const costPerBlock = ttsModel.credits + lipsyncModel.credits;
    const totalCost = costPerBlock * blocks.length;

    const hasCredits = await checkCredits(userId, totalCost);
    if (!hasCredits) {
      return res.status(402).json({
        error: "Not enough credits for this timeline",
        creditsNeeded: totalCost,
      });
    }

    const characterById = (id) => characters.find((c) => c.id === id);

    // Sort blocks by startTime to guarantee correct merge order, even
    // if the frontend sends them out of order.
    const orderedBlocks = [...blocks].sort((a, b) => a.startTime - b.startTime);

    const clipUrls = [];

    for (const block of orderedBlocks) {
      const character = characterById(block.characterId);

      if (!character || !character.faceUrl) {
        throw new Error(
          `Missing face image for character in block: "${block.text}"`
        );
      }

      // Step 1: TTS for this line
      const audioOutput = await runModel(ttsModel, { text: block.text });
      const audioUrl = Array.isArray(audioOutput) ? audioOutput[0] : audioOutput;

      // Step 2: Lipsync that character's face to the generated audio
      const videoOutput = await runModel(lipsyncModel, {
        face: character.faceUrl,
        audio: audioUrl,
      });
      const videoUrl = Array.isArray(videoOutput) ? videoOutput[0] : videoOutput;

      clipUrls.push(videoUrl);
    }

    // ---------------------------------------------------------
    // Step 3: merge all per-line clips into one final video
    // ---------------------------------------------------------
    const finalVideoUrl = await mergeClips(clipUrls);

    const remaining = await deductCredits(userId, totalCost);

    return res.status(200).json({
      success: true,
      creditsUsed: totalCost,
      creditsRemaining: remaining,
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
