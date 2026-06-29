// utils/handleGenerationError.js
//
// Shared error classification for generation endpoints. Some errors
// from AI providers are EXPECTED, recoverable outcomes (the model
// correctly rejected something), not server crashes — these should
// surface as a clear 4xx with an actionable message, not a generic
// 500. Centralized here so every endpoint (generate.js, lipsync.js,
// timeline-generate.js, voice.js) handles the same known error shapes
// consistently instead of duplicating the same string-matching logic.
//
// Usage in any endpoint's catch block:
//   const handled = handleGenerationError(err, res);
//   if (handled) return handled;
//   // fall through to your own generic 500 for anything unrecognized

export function handleGenerationError(err, res) {
  const message = err?.message || "";

  // Replicate's safety classifier rejected the prompt/image
  // combination (error code E005). This happens on non-NSFW models
  // when content trips their filter — it's the model working as
  // intended, not a crash.
  if (message.includes("flagged as sensitive")) {
    return res.status(422).json({
      error:
        "This prompt or image was flagged by the content filter. Try a different prompt or image, or switch to an NSFW-unlocked model if appropriate.",
      code: "CONTENT_FLAGGED",
    });
  }

  // ElevenLabs rejects Voice Library voices entirely for free-tier
  // accounts/keys — structural plan limitation, not a bug. Whichever
  // key is in use (shared platform key or a user's own BYOK key) needs
  // to be on a paid ElevenLabs plan to use library voices via the API.
  if (message.includes("paid_plan_required") || message.includes("Free users cannot use library voices")) {
    return res.status(402).json({
      error:
        "This voice requires a paid ElevenLabs plan. If you're using your own ElevenLabs key, upgrade your plan there, or pick one of the basic voices that don't require Voice Library access.",
      code: "ELEVENLABS_PAID_PLAN_REQUIRED",
    });
  }

  // Replicate rate limit / quota errors — distinct from a code bug,
  // worth a clearer message than a raw 500.
  if (message.includes("rate limit") || message.includes("429")) {
    return res.status(429).json({
      error: "The AI provider is rate-limiting requests right now. Please try again in a moment.",
      code: "RATE_LIMITED",
    });
  }

  return null; // not a recognized case — caller should fall back to its own generic 500
}
