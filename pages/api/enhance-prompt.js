// pages/api/enhance-prompt.js
//
// "Prompt Pimp" — one-click prompt enhancement for the image/video
// prompt box (see components/StudioPanel.jsx's Enhance button and
// utils/enhancePrompt.js for the actual LLM call + model/pricing
// rationale). A chat completion is fast (a couple seconds), so unlike
// the generation endpoints this responds synchronously — no job
// record, no /api/job-status polling needed.
//
// Costs 1 credit per use. The real per-call cost is a small fraction
// of a cent (see utils/enhancePrompt.js), but Jay wants a real cost
// attached rather than unmetered/free, given the real AI-provider
// spend this site already carries — 1 credit is the smallest unit the
// credit system has, and comfortably covers the actual cost.

import { verifyUserId } from "../../middleware/verifyUserId.js";
import { checkRateLimit } from "../../middleware/rateLimit.js";
import { checkCredits } from "../../middleware/creditCheck.js";
import { deductCredits } from "../../middleware/creditsStore.js";
import { enhancePrompt } from "../../utils/enhancePrompt.js";

export const maxDuration = 30;

const ENHANCE_PROMPT_CREDITS = 1;
const ALLOWED_CATEGORIES = ["image", "video"];
const MAX_PROMPT_LENGTH = 2000;

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { userId, prompt, category } = req.body || {};

    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }

    const auth = verifyUserId(req, userId);
    if (!auth.ok) {
      return res.status(auth.status).json({ error: auth.error });
    }

    // Shares its own bucket rather than the generation-endpoints'
    // shared "generation" bucket — enhancing a prompt is a much
    // cheaper, faster action than submitting a real generation, so it
    // gets its own (more generous) budget instead of eating into the
    // same 30-per-5-minutes cap as actual image/video/audio submits.
    const rl = await checkRateLimit("enhance", userId, { limit: 30, windowSeconds: 300 });
    if (!rl.ok) {
      return res.status(429).json({
        error: `Too many requests — please wait ${rl.retryAfterSeconds}s and try again.`,
      });
    }

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: "Missing prompt" });
    }

    if (prompt.length > MAX_PROMPT_LENGTH) {
      return res.status(400).json({ error: `Prompt too long (max ${MAX_PROMPT_LENGTH} characters)` });
    }

    const safeCategory = ALLOWED_CATEGORIES.includes(category) ? category : "image";

    const hasCredits = await checkCredits(userId, ENHANCE_PROMPT_CREDITS);
    if (!hasCredits) {
      return res.status(402).json({ error: "Not enough credits" });
    }

    const enhanced = await enhancePrompt(prompt.trim(), safeCategory);

    // Charge only after the enhancement actually succeeds — same
    // check-then-deduct-on-success order used everywhere else credits
    // are spent (see utils/runModelAsync.js's processJob).
    const remaining = await deductCredits(userId, ENHANCE_PROMPT_CREDITS);

    return res.status(200).json({
      success: true,
      enhancedPrompt: enhanced,
      creditsRemaining: remaining,
    });
  } catch (err) {
    console.error("enhance-prompt.js error:", err);
    return res.status(500).json({
      error: "Failed to enhance prompt",
      details: err.message,
    });
  }
}
