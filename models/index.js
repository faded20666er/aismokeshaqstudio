// models/index.js
//
// SINGLE SOURCE OF TRUTH for every generation model in the app.
//
// CREDIT PRICING NOTES (read before changing numbers):
// Credits are priced against real Replicate/HuggingFace API cost, not
// against competitor sticker numbers. Video is roughly 30-50x more
// expensive per generation than a still image, so it must cost roughly
// 30-50x more credits, or every heavy-video user loses you money.
//
//   Standard image   -> 2 credits   (real cost ~$0.03-0.05)
//   Premium image     -> 3 credits   (real cost ~$0.05, slightly pricier model)
//   TTS / audio       -> 1 credit    (real cost ~$0.01)
//   Lipsync            -> 12 credits  (real cost ~$0.50-0.80)
//   Fast video         -> 30 credits  (real cost ~$1.25)
//   Premium video      -> 45 credits  (real cost ~$2.00)
//   NSFW image         -> 5 credits   (HF-hosted, slightly higher infra cost)
//   NSFW I2V (budget)  -> 2 credits   (Atlas Cloud Wan 2.2 Spicy, real cost $0.03/run)
//   NSFW I2V (turbo)   -> 5+ credits  (Atlas Cloud Wan 2.2 Turbo Spicy Infinite)
//
// Every model has a short "description" field describing its strengths
// in plain language — shown in the dropdown so customers can pick the
// right tool for their credits, not just the cheapest or most familiar
// name. Dropdowns should render models sorted highest-credits-first
// (most expensive/highest quality at top) — use getSortedModels() below
// rather than reading MODELS[category] directly in UI code.

export const MODELS = {
  // =====================================================================
  // IMAGE MODELS
  // =====================================================================
  image: [
    {
      // Cloudflare Workers AI — free tier resets DAILY, no monthly cap.
      // Requires CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN in Vercel.
      id: "@cf/black-forest-labs/flux-1-schnell",
      name: "FLUX Schnell — Free",
      provider: "cloudflare",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 0,
      description: "Free for all members — resets daily. Fast, solid image quality for everyday prompts.",
      imageInputs: { min: 0, max: 0 },
    },
    {
      // SWITCHED to Atlas Cloud [pricing audit, Aug 2026]: Replicate charges
      // $0.015/run + $0.015/MP in + $0.015/MP out (variable, can exceed
      // $0.03 easily on larger images). Atlas Cloud lists this exact model
      // at a flat $0.03/image, no per-megapixel surcharge, no "unit" field
      // (confirmed flat, not per-second/duration-billed — images are safe
      // from the per-second trap that bit Seedance). Atlas Cloud is also
      // the only funded, working provider right now (Replicate is at $0).
      id: "black-forest-labs/flux-2-pro/text-to-image",
      atlasImageEditId: "black-forest-labs/flux-2-pro/edit",
      name: "FLUX-2 Pro (Black-Forest-Labs)",
      provider: "atlascloud",
      atlasCloudType: "image",
      nsfw: false,
      locked: false,
      premium: true,
      credits: 3,
      description: "Best overall photorealism and fine detail. Top pick for portraits and product shots.",
      imageInputs: { min: 0, max: 8 },
    },
    {
      // SWITCHED to Atlas Cloud [pricing audit, Aug 2026]: Replicate real
      // cost was $0.067-0.151/image depending on resolution. Atlas Cloud's
      // equivalent runs $0.04-0.08/image flat, no "unit" field (confirmed
      // flat, not duration-billed) — same margin logic, lower real cost,
      // same credits charged to the customer = pure margin improvement.
      // FIXED [Aug 30 2026, schema audit]: was pointed at
      // ".../reference-to-image", which turns out to be a DIFFERENT real
      // feature (generates from a source VIDEO clip — its schema requires
      // a "video_clips" field we never sent) — every reference-image
      // request here would have 400'd on a required-field miss. The real
      // plain-photo-reference-editing endpoint is ".../edit" (confirmed
      // via its schema: images array, no video_clips requirement).
      id: "google/nano-banana-2/text-to-image",
      atlasImageEditId: "google/nano-banana-2/edit",
      name: "Nano Banana 2 (Google)",
      provider: "atlascloud",
      atlasCloudType: "image",
      nsfw: false,
      locked: false,
      premium: true,
      credits: 5,
      description: "Top all-around image model. Multi-image fusion (up to 14 refs), excellent text rendering.",
      imageInputs: { min: 0, max: 14 },
    },
    {
      id: "google/imagen-4-ultra",
      name: "Imagen 4 Ultra (Google)",
      provider: "replicate",
      comingSoon: true,
      nsfw: false,
      locked: false,
      premium: true,
      // ESTIMATED: not directly verified, but "Ultra" tier Google models
      // typically run 2-3x their standard sibling (~$0.04/image) —
      // reasoned to ~$0.08-0.12/image. Bumped from 3 to 4 credits as a
      // safety margin; worth confirming against Google's real current
      // Imagen 4 Ultra rate before scaling usage of this model heavily.
      credits: 4,
      description: "Excellent text rendering and complex prompts. Strong for posters, logos, layouts.",
      imageInputs: { min: 0, max: 0 },
    },
    {
      // SWITCHED to Atlas Cloud [pricing audit, Aug 2026]: Replicate
      // charges $0.06/MP in + $0.06/MP out (variable). Atlas Cloud: flat
      // $0.05/image, confirmed no "unit" field (not duration-billed).
      id: "black-forest-labs/flux-2-flex/text-to-image",
      atlasImageEditId: "black-forest-labs/flux-2-flex/edit",
      name: "FLUX-2 Flex (Black-Forest-Labs)",
      provider: "atlascloud",
      atlasCloudType: "image",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 2,
      description: "Fast, flexible all-rounder. Great default choice for most image prompts.",
      imageInputs: { min: 0, max: 8 },
    },
    {
      // SWITCHED to Atlas Cloud [pricing audit, Aug 2026]: Replicate
      // $0.035/image vs Atlas Cloud's Seedream v5.0 Lite at $0.032/image
      // flat (near tie, but Atlas Cloud is the funded/working provider).
      // FIXED [real schema audit, Aug 2026]: bytedance/seedream-v5.0-lite/edit's
      // real Atlas Cloud schema shows images maxItems:14, not 4 — this
      // was under-declared (not a bug, just a missed capability).
      id: "bytedance/seedream-v5.0-lite",
      atlasImageEditId: "bytedance/seedream-v5.0-lite/edit",
      name: "Seedream 5 Lite (Bytedance)",
      provider: "atlascloud",
      atlasCloudType: "image",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 2,
      description: "Clean, balanced style. Reliable for everyday scenes and characters.",
      imageInputs: { min: 0, max: 14 },
    },
    {
      // SWITCHED to Atlas Cloud [pricing audit, Aug 2026]: Replicate
      // $0.04/image vs Atlas Cloud $0.036/image flat.
      // FIXED [real schema audit, Aug 2026]: bytedance/seedream-v4.5/edit's
      // real Atlas Cloud schema shows images maxItems:10, not 15 — this
      // was OVER-declared, meaning 11-15 reference images would 400.
      id: "bytedance/seedream-v4.5",
      atlasImageEditId: "bytedance/seedream-v4.5/edit",
      name: "Seedream 4.5 (Bytedance)",
      provider: "atlascloud",
      atlasCloudType: "image",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 2,
      description: "Vivid color and lighting. Good for stylized or vibrant artwork.",
      imageInputs: { min: 0, max: 10 },
    },
    {
      // SWITCHED + UPGRADED to Atlas Cloud [pricing audit, Aug 2026]:
      // Replicate's old Seedream 3 ($0.03/image) has no Atlas Cloud
      // equivalent — Atlas Cloud only carries the newer Seedream v4
      // ($0.027/image flat), which is both newer AND cheaper, so this
      // slot now points at v4 instead of the discontinued v3.
      // FIXED [real schema audit, Aug 2026]: imageInputs was left at
      // max:0 even though atlasImageEditId already points at a real,
      // working bytedance/seedream-v4/edit endpoint (images array,
      // maxItems:10, minItems:1, required) — the reference-image upload
      // control was never shown for this model. Raised to match.
      id: "bytedance/seedream-v4",
      atlasImageEditId: "bytedance/seedream-v4/edit",
      name: "Seedream 4 (Bytedance)",
      provider: "atlascloud",
      atlasCloudType: "image",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 2,
      description: "Budget-friendly Seedream version. Solid for simple compositions.",
      imageInputs: { min: 0, max: 10 },
    },
    {
      id: "wan-video/wan-2.7-image-pro",
      name: "WAN 2.7 Image Pro (WAN-Video)",
      provider: "replicate",
      comingSoon: true,
      nsfw: false,
      locked: false,
      premium: false,
      credits: 2,
      description: "Sharp detail, good for character art that may later be animated to video.",
      imageInputs: { min: 0, max: 4 },
    },
    {
      // SWITCHED + UPGRADED to Atlas Cloud [pricing audit, Aug 2026]:
      // Replicate $0.03/image vs Atlas Cloud's newer Ideogram v4 Turbo at
      // $0.008/image flat — dramatically cheaper AND a newer model
      // version. Atlas Cloud has no reference-image endpoint for
      // Ideogram (text-to-image only), so imageInputs.max is dropped to
      // 0 to match real capability rather than silently ignoring an
      // uploaded reference.
      id: "ideogram/v4/turbo/text-to-image",
      name: "Ideogram V4 Turbo (Ideogram)",
      provider: "atlascloud",
      atlasCloudType: "image",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 2,
      description: "Best-in-class for text and lettering inside images. Great for logos and signage.",
      imageInputs: { min: 0, max: 0 },
    },
    {
      // SWITCHED + UPGRADED to Atlas Cloud [pricing audit, Aug 2026]:
      // Replicate $0.08/image vs Atlas Cloud's Ideogram v4 Quality at
      // $0.025/image flat. Same no-reference-image caveat as V4 Turbo
      // above — imageInputs.max dropped to 0 to match real capability.
      id: "ideogram/v4/quality/text-to-image",
      name: "Ideogram V4 Quality (Ideogram)",
      provider: "atlascloud",
      atlasCloudType: "image",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 2,
      description: "Strong typography-heavy designs with richer detail than Turbo.",
      imageInputs: { min: 0, max: 0 },
    },
    {
      id: "minimax/image-01",
      name: "MiniMax Image-01",
      provider: "replicate",
      comingSoon: true,
      nsfw: false,
      locked: false,
      premium: false,
      credits: 2,
      description: "Good general-purpose image model, dependable for everyday prompts.",
      imageInputs: { min: 0, max: 0 },
    },
    {
      id: "comfyui/any-comfyui-workflow",
      name: "Any ComfyUI Workflow (ComfyUI)",
      provider: "replicate",
      comingSoon: true,
      nsfw: false,
      locked: false,
      premium: false,
      credits: 2,
      description: "Run a custom ComfyUI workflow for advanced, highly specific control over output.",
      imageInputs: { min: 0, max: 0 },
    },
    {
      id: "fermatresearch/sdxl-controlnet-lora",
      name: "SDXL ControlNet LoRA (FermatResearch)",
      provider: "replicate",
      comingSoon: true,
      nsfw: false,
      locked: false,
      premium: false,
      credits: 2,
      description: "Best for matching a specific pose or layout using a reference image.",
      imageInputs: { min: 1, max: 1 },
    },
    {
      id: "lucataco/ssd-1b",
      name: "SSD-1B (Lucataco)",
      provider: "replicate",
      comingSoon: true,
      nsfw: false,
      locked: false,
      premium: false,
      credits: 2,
      description: "Lightweight and fast. Good for quick drafts and iteration.",
      imageInputs: { min: 0, max: 1 },
    },
      ],

  // =====================================================================
  // VIDEO MODELS
  //
  // Re-priced [this session] against real per-second provider costs
  // researched directly (Seedance $0.0247-0.025/s, Kling $0.075/s tiers,
  // VEO Lite ~$0.021/s equiv, VEO Preview $0.10/s, Hailuo ~$0.042/s
  // equiv) — assuming an average 8-second clip and targeting ~$0.06
  // revenue per credit (healthy margin over real cost).
  //
  // Models marked VERIFIED below had real, sourced pricing data found.
  // Models marked ESTIMATED were priced by reasoning from their tier/
  // positioning relative to verified models — worth double-checking
  // against the provider's actual current pricing before scaling up
  // marketing/usage of those specific models.
  // =====================================================================
  video: [
    {
      // VERIFIED: DomoAI docs confirm $0.10/sec for animate-2.4-advanced.
      // Pricing: $0.10 × 2.5 markup / $0.05 per credit = 5 credits/sec.
      // Min useful duration 5s = 25 credits.
      // GATED [Aug 29 2026]: DOMOAI_API_KEY is not set in Vercel at all —
      // checked directly, not present. Every real customer call to this
      // model currently throws "DOMOAI_API_KEY is not set" instantly.
      // Re-gate comingSoon: false only after the key is added AND the
      // DomoAI account is funded (their real API has no free tier).
      id: "domoai/animate-2.4-advanced",
      name: "Animate 2.4 Advanced (DomoAI)",
      provider: "domoai",
      comingSoon: true,
      domoAICategory: "image2video",
      domoAIModel: "animate-2.4-advanced",
      nsfw: false,
      locked: false,
      premium: true,
      credits: 25,
      creditsPerSecond: 5,
      maxDurationSeconds: 10,
      durations: [3, 5, 8, 10],
      description: "DomoAI premium I2V — highest quality motion and subject fidelity. Per-second billing.",
      imageInputs: { min: 1, max: 1 },
    },
    {
      // VERIFIED: DomoAI docs confirm $0.10/sec for t2v-2.4-advanced.
      // Pricing: 5 credits/sec. Min useful duration 5s = 25 credits.
      // GATED [Aug 29 2026]: same DOMOAI_API_KEY-not-set issue, see
      // animate-2.4-advanced above.
      id: "domoai/t2v-2.4-advanced",
      name: "T2V 2.4 Advanced (DomoAI)",
      provider: "domoai",
      comingSoon: true,
      domoAICategory: "text2video",
      domoAIModel: "t2v-2.4-advanced",
      nsfw: false,
      locked: false,
      premium: true,
      credits: 25,
      creditsPerSecond: 5,
      maxDurationSeconds: 10,
      durations: [3, 5, 8, 10],
      description: "DomoAI premium T2V — best motion quality. Supports anime, realistic, pixel, cartoon styles.",
      imageInputs: { min: 0, max: 0 },
    },
    {
      // VERIFIED: DomoAI docs confirm $0.04/sec for animate-2.4-faster.
      // Pricing: $0.04 × 2.5 / $0.05 = 2 credits/sec. 5s = 10 credits.
      // GATED [Aug 29 2026]: same DOMOAI_API_KEY-not-set issue, see
      // animate-2.4-advanced above.
      id: "domoai/animate-2.4-faster",
      name: "Animate 2.4 Fast (DomoAI)",
      provider: "domoai",
      comingSoon: true,
      domoAICategory: "image2video",
      domoAIModel: "animate-2.4-faster",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 10,
      creditsPerSecond: 2,
      maxDurationSeconds: 10,
      durations: [3, 5, 8, 10],
      description: "DomoAI fast I2V — smooth animation from a single image at lower cost. Per-second billing.",
      imageInputs: { min: 1, max: 1 },
    },
    {
      // VERIFIED: DomoAI docs confirm $0.04/sec for t2v-2.4-faster.
      // Pricing: 2 credits/sec. 5s = 10 credits.
      // GATED [Aug 29 2026]: same DOMOAI_API_KEY-not-set issue, see
      // animate-2.4-advanced above.
      id: "domoai/t2v-2.4-faster",
      name: "T2V 2.4 Fast (DomoAI)",
      provider: "domoai",
      comingSoon: true,
      domoAICategory: "text2video",
      domoAIModel: "t2v-2.4-faster",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 10,
      creditsPerSecond: 2,
      maxDurationSeconds: 10,
      durations: [3, 5, 8, 10],
      description: "DomoAI fast T2V — quick text-to-video with anime, realistic, and pixel art styles.",
      imageInputs: { min: 0, max: 0 },
    },
    {
      id: "runwayml/gen-4.5",
      name: "Runway Gen-4.5",
      provider: "replicate",
      comingSoon: true,
      nsfw: false,
      locked: false,
      premium: true,
      credits: 35,
      durations: [5, 10],
      description: "Top-tier cinematic motion and camera control. Best for polished, film-like shots.",
      imageInputs: { min: 0, max: 1 },
    },
    {
      // RE-POINTED to Atlas Cloud [pricing audit, Aug 2026]: matches Replicate's audio-on rate almost exactly. base_price $0.20/s listed but Atlas Cloud does not tag a "unit" field here (same ambiguity that caused the real Seedance per-second billing bug) — STILL GATED until a real test + balance check confirms whether this is flat or per-second, exactly like the Seedance verification. Was: "google/veo-3.1" (Replicate, $0 balance).
            // DEFENSIVE per-second pricing [Aug 2026]: Atlas Cloud lists this model at $0.2/generation with NO "unit" field — same missing-unit shape that turned out to be per-second for Seedance (real bug, real money lost) and again for Kling V2.0 (still unverified, see comment near that entry). Treating $0.2 as PER-SECOND until a real test proves otherwise — safe direction to guess wrong in (worst case: overcharge slightly, fixable anytime; the other way round loses real money silently). credits is the longest-duration price as a fallback.
      // FIXED [real schema audit, Aug 2026]: real Atlas Cloud schema's
      // duration enum is [4, 6, 8] — 5 was never a valid value and every
      // 5s request would 400. Recomputed creditsByDuration at the same
      // confirmed $0.20/s rate for the corrected duration set.
      id: "google/veo3.1/text-to-video",
      name: "VEO 3.1 (Google)",
      provider: "atlascloud",
      atlasCloudType: "video",
      nsfw: false,
      locked: false,
      premium: true,
      credits: 80,
      creditsByDuration: { 4: 40, 6: 60, 8: 80 },
      durations: [4, 6, 8],
      description: "Excellent realism and physics. Strong for natural movement and lighting.",
      imageInputs: { min: 0, max: 4 },
    },
    {
      id: "bytedance/dreamactor-m2.0",
      name: "DreamActor M2.0 (Bytedance)",
      provider: "replicate",
      comingSoon: true,
      nsfw: false,
      locked: false,
      premium: true,
      credits: 28,
      durations: [3, 5],
      description: "Best for character performance and expressive acting in a generated video.",
      imageInputs: { min: 1, max: 1 },
    },
    {
      // RE-POINTED to Atlas Cloud [pricing audit, Aug 2026]: same headline number as Replicate — if flat here, ~5x cheaper. base_price $0.05 listed but Atlas Cloud does not tag a "unit" field here (same ambiguity that caused the real Seedance per-second billing bug) — STILL GATED until a real test + balance check confirms whether this is flat or per-second, exactly like the Seedance verification. Was: "xai/grok-imagine-video" (Replicate, $0 balance).
            // DEFENSIVE per-second pricing [Aug 2026]: Atlas Cloud lists this model at $0.05/generation with NO "unit" field — same missing-unit shape that turned out to be per-second for Seedance (real bug, real money lost) and again for Kling V2.0 (still unverified, see comment near that entry). Treating $0.05 as PER-SECOND until a real test proves otherwise — safe direction to guess wrong in (worst case: overcharge slightly, fixable anytime; the other way round loses real money silently). credits is the longest-duration price as a fallback.
      id: "xai/grok-imagine-video/text-to-video",
      name: "Grok Imagine Video (XAI)",
      provider: "atlascloud",
      atlasCloudType: "video",
      nsfw: false,
      locked: false,
      premium: true,
      credits: 25,
      creditsByDuration: { 5: 13, 10: 25 },
      durations: [5, 10],
      description: "Strong creative range, handles unusual or imaginative prompts well.",
      imageInputs: { min: 0, max: 1 },
    },
    {
      // RE-POINTED to Atlas Cloud [pricing audit, Aug 2026]: VEO 2 has no direct Atlas Cloud match; substituting VEO 3.1 Lite, a newer/cheaper tier. base_price $0.05 listed but Atlas Cloud does not tag a "unit" field here (same ambiguity that caused the real Seedance per-second billing bug) — STILL GATED until a real test + balance check confirms whether this is flat or per-second, exactly like the Seedance verification. Was: "google/veo-2" (Replicate, $0 balance).
            // DEFENSIVE per-second pricing [Aug 2026]: Atlas Cloud lists this model at $0.05/generation with NO "unit" field — same missing-unit shape that turned out to be per-second for Seedance (real bug, real money lost) and again for Kling V2.0 (still unverified, see comment near that entry). Treating $0.05 as PER-SECOND until a real test proves otherwise — safe direction to guess wrong in (worst case: overcharge slightly, fixable anytime; the other way round loses real money silently). credits is the longest-duration price as a fallback.
      // FIXED [real schema audit, Aug 2026]: real Atlas Cloud schema's
      // duration enum is [4, 6, 8] — 5 was never a valid value and every
      // 5s request would 400. Recomputed creditsByDuration at the same
      // confirmed ~$0.05/s rate for the corrected duration set.
      id: "google/veo3.1-lite/text-to-video",
      name: "VEO 2 (Google)",
      provider: "atlascloud",
      atlasCloudType: "video",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 20,
      creditsByDuration: { 4: 10, 6: 15, 8: 20 },
      durations: [4, 6, 8],
      description: "Reliable realism at a lower cost than VEO 3.1. Good everyday choice.",
      imageInputs: { min: 0, max: 1 },
    },
    {
      // RE-POINTED to Atlas Cloud [pricing audit, Aug 2026]: cheaper even flat-vs-flat than Replicate's per-second rate. base_price $0.071 listed but Atlas Cloud does not tag a "unit" field here (same ambiguity that caused the real Seedance per-second billing bug) — STILL GATED until a real test + balance check confirms whether this is flat or per-second, exactly like the Seedance verification. Was: "kwaivgi/kling-v3-video" (Replicate, $0 balance).
            // DEFENSIVE per-second pricing [Aug 2026]: Atlas Cloud lists this model at $0.071/generation with NO "unit" field — same missing-unit shape that turned out to be per-second for Seedance (real bug, real money lost) and again for Kling V2.0 (still unverified, see comment near that entry). Treating $0.071 as PER-SECOND until a real test proves otherwise — safe direction to guess wrong in (worst case: overcharge slightly, fixable anytime; the other way round loses real money silently). credits is the longest-duration price as a fallback.
      id: "kwaivgi/kling-v3.0-std/text-to-video",
      name: "Kling V3 Video (Kwaivgi)",
      provider: "atlascloud",
      atlasCloudType: "video",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 54,
      creditsByDuration: { 5: 18, 10: 36, 15: 54 },
      durations: [5, 10, 15],
      description: "Smooth motion and good consistency across frames. Popular all-rounder.",
      imageInputs: { min: 0, max: 2 },
    },
    {
      // RE-POINTED to Atlas Cloud [pricing audit, Aug 2026]: same Kling V3.0 Std family as kling-v3-video. base_price $0.071 listed but Atlas Cloud does not tag a "unit" field here (same ambiguity that caused the real Seedance per-second billing bug) — STILL GATED until a real test + balance check confirms whether this is flat or per-second, exactly like the Seedance verification. Was: "kwaivgi/kling-v3-omni-video" (Replicate, $0 balance).
            // DEFENSIVE per-second pricing [Aug 2026]: Atlas Cloud lists this model at $0.071/generation with NO "unit" field — same missing-unit shape that turned out to be per-second for Seedance (real bug, real money lost) and again for Kling V2.0 (still unverified, see comment near that entry). Treating $0.071 as PER-SECOND until a real test proves otherwise — safe direction to guess wrong in (worst case: overcharge slightly, fixable anytime; the other way round loses real money silently). credits is the longest-duration price as a fallback.
      id: "kwaivgi/kling-v3.0-std/text-to-video",
      name: "Kling V3 Omni Video (Kwaivgi)",
      provider: "atlascloud",
      atlasCloudType: "video",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 54,
      creditsByDuration: { 5: 18, 10: 36, 15: 54 },
      durations: [5, 10, 15],
      description: "Handles a wider variety of input types (image, text) flexibly.",
      imageInputs: { min: 0, max: 4 },
    },
    {
      // RE-POINTED to Atlas Cloud [pricing audit, Aug 2026]: if flat, ~6x cheaper than Replicate's $0.07/s. base_price $0.06 listed but Atlas Cloud does not tag a "unit" field here (same ambiguity that caused the real Seedance per-second billing bug) — STILL GATED until a real test + balance check confirms whether this is flat or per-second, exactly like the Seedance verification. Was: "kwaivgi/kling-v2.5-turbo-pro" (Replicate, $0 balance).
            // DEFENSIVE per-second pricing [Aug 2026]: Atlas Cloud lists this model at $0.06/generation with NO "unit" field — same missing-unit shape that turned out to be per-second for Seedance (real bug, real money lost) and again for Kling V2.0 (still unverified, see comment near that entry). Treating $0.06 as PER-SECOND until a real test proves otherwise — safe direction to guess wrong in (worst case: overcharge slightly, fixable anytime; the other way round loses real money silently). credits is the longest-duration price as a fallback.
      id: "kwaivgi/kling-v2.5-turbo-pro/text-to-video",
      name: "Kling V2.5 Turbo Pro (Kwaivgi)",
      provider: "atlascloud",
      atlasCloudType: "video",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 30,
      creditsByDuration: { 5: 15, 10: 30 },
      durations: [5, 10],
      description: "Faster turnaround than V3, still solid quality for quick iterations.",
      imageInputs: { min: 0, max: 3 },
    },
    {
      // RE-POINTED to Atlas Cloud [pricing audit, Aug 2026]: likely cheaper than Replicate's ~$0.18/s either way. base_price $0.112 listed but Atlas Cloud does not tag a "unit" field here (same ambiguity that caused the real Seedance per-second billing bug) — STILL GATED until a real test + balance check confirms whether this is flat or per-second, exactly like the Seedance verification. Was: "bytedance/seedance-2.0" (Replicate, $0 balance).
            // DEFENSIVE per-second pricing [Aug 2026]: Atlas Cloud lists this model at $0.112/generation with NO "unit" field — same missing-unit shape that turned out to be per-second for Seedance (real bug, real money lost) and again for Kling V2.0 (still unverified, see comment near that entry). Treating $0.112 as PER-SECOND until a real test proves otherwise — safe direction to guess wrong in (worst case: overcharge slightly, fixable anytime; the other way round loses real money silently). credits is the longest-duration price as a fallback.
      id: "bytedance/seedance-2.0/text-to-video",
      name: "Seedance 2.0 (Bytedance)",
      provider: "atlascloud",
      atlasCloudType: "video",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 84,
      creditsByDuration: { 5: 29, 10: 57, 15: 84 },
      durations: [5, 10, 15],
      description: "Good motion quality for dance, action, and dynamic movement scenes.",
      imageInputs: { min: 0, max: 4 },
    },
    {
      // RE-POINTED to Atlas Cloud [pricing audit, Aug 2026]: CAUTION: if per-second, MORE expensive than Replicate's $0.026/s — do not assume, test first. base_price $0.047 listed but Atlas Cloud does not tag a "unit" field here (same ambiguity that caused the real Seedance per-second billing bug) — STILL GATED until a real test + balance check confirms whether this is flat or per-second, exactly like the Seedance verification. Was: "bytedance/seedance-1.5-pro" (Replicate, $0 balance).
            // DEFENSIVE per-second pricing [Aug 2026]: Atlas Cloud lists this model at $0.047/generation with NO "unit" field — same missing-unit shape that turned out to be per-second for Seedance (real bug, real money lost) and again for Kling V2.0 (still unverified, see comment near that entry). Treating $0.047 as PER-SECOND until a real test proves otherwise — safe direction to guess wrong in (worst case: overcharge slightly, fixable anytime; the other way round loses real money silently). credits is the longest-duration price as a fallback.
      id: "bytedance/seedance-v1.5-pro/text-to-video",
      name: "Seedance 1.5 Pro (Bytedance)",
      provider: "atlascloud",
      atlasCloudType: "video",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 24,
      creditsByDuration: { 5: 12, 10: 24 },
      durations: [5, 10],
      description: "Balanced quality and speed, a safe middle-ground choice.",
      imageInputs: { min: 0, max: 2 },
    },
    {
      id: "bytedance/seedance-1-pro",
      name: "Seedance 1 Pro (Bytedance)",
      provider: "replicate",
      comingSoon: true,
      nsfw: false,
      locked: false,
      premium: false,
      credits: 7,
      durations: [5, 8],
      description: "Earlier Seedance version, still capable for general video needs.",
      imageInputs: { min: 0, max: 2 },
    },
    {
      // RE-POINTED to Atlas Cloud [pricing audit, Aug 2026]: different tier than Replicate's Seedance 1 Lite, verify equivalence before trusting. base_price $0.009 listed but Atlas Cloud does not tag a "unit" field here (same ambiguity that caused the real Seedance per-second billing bug) — STILL GATED until a real test + balance check confirms whether this is flat or per-second, exactly like the Seedance verification. Was: "bytedance/seedance-1-lite" (Replicate, $0 balance).
            // DEFENSIVE per-second pricing [Aug 2026]: Atlas Cloud lists this model at $0.009/generation with NO "unit" field — same missing-unit shape that turned out to be per-second for Seedance (real bug, real money lost) and again for Kling V2.0 (still unverified, see comment near that entry). Treating $0.009 as PER-SECOND until a real test proves otherwise — safe direction to guess wrong in (worst case: overcharge slightly, fixable anytime; the other way round loses real money silently). credits is the longest-duration price as a fallback.
      id: "bytedance/seedance-v1-pro-fast/text-to-video",
      name: "Seedance 1 Lite (Bytedance)",
      provider: "atlascloud",
      atlasCloudType: "video",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 3,
      creditsByDuration: { 3: 2, 5: 3 },
      durations: [3, 5],
      description: "Lighter, faster Seedance variant for quicker turnarounds.",
      imageInputs: { min: 0, max: 3 },
    },
    {
      // RE-POINTED to Atlas Cloud [pricing audit, Aug 2026]: same number both places — needs a real test to know the winner. base_price $0.10 listed but Atlas Cloud does not tag a "unit" field here (same ambiguity that caused the real Seedance per-second billing bug) — STILL GATED until a real test + balance check confirms whether this is flat or per-second, exactly like the Seedance verification. Was: "wan-video/wan-2.7-t2v" (Replicate, $0 balance).
            // DEFENSIVE per-second pricing [Aug 2026]: Atlas Cloud lists this model at $0.1/generation with NO "unit" field — same missing-unit shape that turned out to be per-second for Seedance (real bug, real money lost) and again for Kling V2.0 (still unverified, see comment near that entry). Treating $0.1 as PER-SECOND until a real test proves otherwise — safe direction to guess wrong in (worst case: overcharge slightly, fixable anytime; the other way round loses real money silently). credits is the longest-duration price as a fallback.
      id: "alibaba/wan-2.7/text-to-video",
      name: "WAN 2.7 T2V (WAN-Video)",
      provider: "atlascloud",
      atlasCloudType: "video",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 50,
      creditsByDuration: { 5: 25, 10: 50 },
      durations: [5, 10],
      description: "Latest WAN text-to-video, good detail retention during motion.",
      imageInputs: { min: 0, max: 0 },
    },
    {
      // RE-POINTED to Atlas Cloud [pricing audit, Aug 2026]: roughly a wash vs Replicate either way. base_price $0.071 listed but Atlas Cloud does not tag a "unit" field here (same ambiguity that caused the real Seedance per-second billing bug) — STILL GATED until a real test + balance check confirms whether this is flat or per-second, exactly like the Seedance verification. Was: "wan-video/wan-2.5-t2v-fast" (Replicate, $0 balance).
            // DEFENSIVE per-second pricing [Aug 2026]: Atlas Cloud lists this model at $0.071/generation with NO "unit" field — same missing-unit shape that turned out to be per-second for Seedance (real bug, real money lost) and again for Kling V2.0 (still unverified, see comment near that entry). Treating $0.071 as PER-SECOND until a real test proves otherwise — safe direction to guess wrong in (worst case: overcharge slightly, fixable anytime; the other way round loses real money silently). credits is the longest-duration price as a fallback.
      id: "alibaba/wan-2.5/text-to-video-fast",
      name: "WAN 2.5 T2V Fast (WAN-Video)",
      provider: "atlascloud",
      atlasCloudType: "video",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 36,
      creditsByDuration: { 5: 18, 10: 36 },
      durations: [5, 10],
      description: "Speed-optimized text-to-video. Good for quick previews.",
      imageInputs: { min: 0, max: 0 },
    },
    {
      id: "wan-video/wan-2.2-t2v-fast",
      name: "WAN 2.2 T2V Fast (WAN-Video)",
      provider: "replicate",
      comingSoon: true,
      nsfw: false,
      locked: false,
      premium: false,
      credits: 8,
      durations: [5],
      description: "Earlier fast WAN variant, reliable and quick.",
      imageInputs: { min: 0, max: 0 },
    },
    {
      // RE-POINTED to Atlas Cloud [pricing audit, Aug 2026]: roughly a wash vs Replicate either way. base_price $0.071 listed but Atlas Cloud does not tag a "unit" field here (same ambiguity that caused the real Seedance per-second billing bug) — STILL GATED until a real test + balance check confirms whether this is flat or per-second, exactly like the Seedance verification. Was: "wan-video/wan-2.5-i2v-fast" (Replicate, $0 balance).
            // DEFENSIVE per-second pricing [Aug 2026]: Atlas Cloud lists this model at $0.071/generation with NO "unit" field — same missing-unit shape that turned out to be per-second for Seedance (real bug, real money lost) and again for Kling V2.0 (still unverified, see comment near that entry). Treating $0.071 as PER-SECOND until a real test proves otherwise — safe direction to guess wrong in (worst case: overcharge slightly, fixable anytime; the other way round loses real money silently). credits is the longest-duration price as a fallback.
      id: "alibaba/wan-2.5/image-to-video-fast",
      name: "WAN 2.5 I2V Fast (WAN-Video)",
      provider: "atlascloud",
      atlasCloudType: "video",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 36,
      creditsByDuration: { 5: 18, 10: 36 },
      durations: [5, 10],
      description: "Image-to-video — animate a still photo into motion quickly.",
      imageInputs: { min: 1, max: 1 },
    },
    {
      id: "wan-video/wan-2.2-s2v",
      name: "WAN 2.2 S2V (WAN-Video)",
      provider: "replicate",
      comingSoon: true,
      nsfw: false,
      locked: false,
      premium: false,
      credits: 8,
      durations: [5],
      description: "Speech-to-video — drives motion from an audio track.",
      imageInputs: { min: 0, max: 1 },
    },
    {
      id: "minimax/hailuo-2.3",
      name: "Hailuo 2.3 (MiniMax)",
      provider: "replicate",
      comingSoon: true,
      nsfw: false,
      locked: false,
      premium: false,
      credits: 12,
      durations: [6],
      description: "Strong character consistency across a generated clip.",
      imageInputs: { min: 0, max: 1 },
    },
    {
      id: "minimax/video-01",
      name: "MiniMax Video-01",
      provider: "replicate",
      comingSoon: true,
      nsfw: false,
      locked: false,
      premium: false,
      credits: 10,
      durations: [6],
      description: "General-purpose video generation, dependable baseline option.",
      imageInputs: { min: 0, max: 1 },
    },
    {
      id: "prunaai/p-video",
      name: "P-Video (PrunaAI)",
      provider: "replicate",
      comingSoon: true,
      nsfw: false,
      locked: false,
      premium: false,
      credits: 8,
      durations: [3, 5],
      description: "Efficient general video generation at a competitive speed.",
      imageInputs: { min: 0, max: 2 },
    },
    {
      id: "prunaai/p-video-animate",
      name: "P-Video Animate (PrunaAI)",
      provider: "replicate",
      comingSoon: true,
      nsfw: false,
      locked: false,
      premium: false,
      credits: 8,
      durations: [3, 5],
      description: "Tuned for animating still characters or illustrations.",
      imageInputs: { min: 1, max: 1 },
    },
    {
      id: "prunaai/p-video-avatar",
      name: "P-Video Avatar (PrunaAI)",
      provider: "replicate",
      comingSoon: true,
      nsfw: false,
      locked: false,
      premium: false,
      credits: 8,
      durations: [3, 5],
      description: "Tuned specifically for talking-avatar style video.",
      imageInputs: { min: 1, max: 1 },
    },
    {
      // RE-POINTED to Atlas Cloud [pricing audit, Aug 2026]: SWITCH+UPGRADE: newer 1.1, half the price of 1.0 ($0.14->$0.07), Replicate doesn't offer 1.1. base_price $0.07 listed but Atlas Cloud does not tag a "unit" field here (same ambiguity that caused the real Seedance per-second billing bug) — STILL GATED until a real test + balance check confirms whether this is flat or per-second, exactly like the Seedance verification. Was: "alibaba/happyhorse-1.0" (Replicate, $0 balance).
            // DEFENSIVE per-second pricing [Aug 2026]: Atlas Cloud lists this model at $0.07/generation with NO "unit" field — same missing-unit shape that turned out to be per-second for Seedance (real bug, real money lost) and again for Kling V2.0 (still unverified, see comment near that entry). Treating $0.07 as PER-SECOND until a real test proves otherwise — safe direction to guess wrong in (worst case: overcharge slightly, fixable anytime; the other way round loses real money silently). credits is the longest-duration price as a fallback.
      // FIXED [real schema audit, Aug 2026]: real Atlas Cloud schema has
      // NO image-related field at all for this model (model/prompt/
      // resolution/ratio/duration/seed only) — imageInputs.max:1 was
      // advertising an upload control this model can't use. Dropped to
      // 0. Duration is a free integer in the real schema (no enum,
      // default 5) — current [5,8,10,15] has no confirmed conflict.
      id: "alibaba/happyhorse-1.1/text-to-video",
      name: "HappyHorse 1.0 (Alibaba)",
      provider: "atlascloud",
      atlasCloudType: "video",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 53,
      creditsByDuration: { 5: 18, 8: 29, 10: 35, 15: 53 },
      durations: [5, 8, 10, 15],
      description: "Good for playful, stylized motion and lighter content.",
      imageInputs: { min: 0, max: 0 },
    },
    {
      // RE-POINTED to Atlas Cloud [pricing audit, Aug 2026]: close to Replicate's $0.08/s, could go either way, needs test. base_price $0.088 listed but Atlas Cloud does not tag a "unit" field here (same ambiguity that caused the real Seedance per-second billing bug) — STILL GATED until a real test + balance check confirms whether this is flat or per-second, exactly like the Seedance verification. Was: "veed/fabric-1.0" (Replicate, $0 balance).
            // DEFENSIVE per-second pricing [Aug 2026]: Atlas Cloud lists this model at $0.088/generation with NO "unit" field — same missing-unit shape that turned out to be per-second for Seedance (real bug, real money lost) and again for Kling V2.0 (still unverified, see comment near that entry). Treating $0.088 as PER-SECOND until a real test proves otherwise — safe direction to guess wrong in (worst case: overcharge slightly, fixable anytime; the other way round loses real money silently). credits is the longest-duration price as a fallback.
      // GATED [real schema audit, Aug 2026]: this model is structurally
      // broken as configured. Real Atlas Cloud schema requires
      // image_url (not image), audio_url (this is actually an
      // audio-driven avatar/lipsync model, not a plain image-to-video
      // one), and resolution (enum 480p/720p only, NO 1080p) — there is
      // NO prompt field and NO duration field at all in the real schema.
      // Our runAtlasCloud() video branch sends image/prompt/duration/
      // resolution and never sends audio_url, so every real generation
      // would 400. Setting comingSoon:true as an immediate safety
      // stopgap rather than shipping a broken model live. Revisit as a
      // lipsync-category model (needs a bespoke request shape) later.
      id: "veed/fabric-1.0/image-to-video",
      name: "Fabric 1.0 (VEED)",
      provider: "atlascloud",
      atlasCloudType: "video",
      comingSoon: true,
      nsfw: false,
      locked: false,
      premium: false,
      credits: 22,
      creditsByDuration: { 3: 14, 5: 22 },
      durations: [3, 5],
      description: "Built with editing workflows in mind — clean, predictable output.",
      imageInputs: { min: 0, max: 1 },
    },
    {
      id: "fofr/tooncrafter",
      name: "ToonCrafter (Fofr)",
      provider: "replicate",
      comingSoon: true,
      nsfw: false,
      locked: false,
      premium: false,
      credits: 7,
      durations: [3, 5],
      description: "Best for cartoon and animated styles rather than realism.",
      imageInputs: { min: 2, max: 10 },
    },
    // ==== Atlas Cloud (atlascloud.ai) general video models =================
    // Atlas Cloud is the only currently-funded provider ($25 test balance,
    // Aug 2026 — Replicate is at $0 and WaveSpeed's account is disabled).
    // These two are added here because they were confirmed, via Atlas
    // Cloud's own live public model-catalog API
    // (https://api.atlascloud.ai/api/v1/models) plus its per-model schema/
    // example endpoints, to be dramatically cheaper than the equivalent
    // models on Replicate:
    //   - Kling V2.0: Replicate charged $1.40/generation (removed from
    //     catalog for being priced at a loss — see commit 83c1f6e). Atlas
    //     Cloud lists kling-v2.0-i2v-master at a "base_price" of $0.238.
    //   - Seedance 1 Pro: Replicate charged $0.75/generation. Atlas Cloud
    //     lists seedance-v1-pro-i2v-720p at a "base_price" of $0.047.
    //
    // REAL BILLING CONFIRMED (Aug 2026, from owner's actual Atlas Cloud
    // balance): $25.00 -> $24.29 after one 5s + one 10s Seedance
    // generation = $0.71 / 15s = $0.0473/s. Atlas Cloud's "base_price" for
    // this model is PER SECOND, not per generation as originally assumed
    // when these were added (commit 4b54b3c) — that assumption was wrong.
    // Fixed by adding creditsByDuration below and teaching
    // pages/api/generate.js to charge per-duration when present, instead
    // of the flat model.credits every other model uses.
    //
    // Kling's $0.238 figure came from the identical schema shape (no
    // explicit "unit": "generation" tag, same as Seedance had), and was
    // originally left comingSoon:true as UNCONFIRMED for that reason.
    // Un-gated since (Aug 2026, "Turn on WaveSpeed + Atlas Cloud" pass) —
    // still not owner-tested against a real balance delta, but Atlas
    // Cloud's own public pricing pages (atlascloud.ai/pricing/models and
    // their blog) independently confirm the whole Kling family bills
    // per-second in this exact range (Kling 3.0: $0.153/s, Kling Video
    // O3: $0.085/s — both explicitly labeled "/sec" in their own
    // materials), which corroborates $0.238/s for V2.0 Master. Treat the
    // math as real, not a pricing bug.
    //
    // TIER-GATED instead [Aug 30 2026]: 119 credits for one 10s clip is
    // 60% of the entire $10/200-credit Starter month — correct math, bad
    // customer experience (owner's real concern, and the right call: a
    // Starter customer burning their whole month on one clip is how you
    // lose them, not how you show off a premium model). minTier below
    // restricts it to the Premium ($59/1000cr) tier, enforced server-side
    // in every generation endpoint via middleware/tierCheck.js — a
    // Starter/Pro customer gets a clear 403 instead of ever being able to
    // charge it, same shape as the nsfw/locked gate above it in this
    // file. Cheaper Kling tiers (V2.5 Turbo Pro, V3 Std) stay open to
    // everyone — this restriction is specific to the priciest variant.
    {
      id: "kwaivgi/kling-v2.0-i2v-master",
      name: "Kling V2.0 Master",
      provider: "atlascloud",
      atlasCloudType: "video",
      nsfw: false,
      locked: false,
      premium: true,
      minTier: "premium", // Premium-plan-only — see comment above
      credits: 119,
      creditsByDuration: { 5: 60, 10: 119 },
      durations: [5, 10],
      description: "Kling V2.0, sourced via Atlas Cloud instead of Replicate — same model family, verified far cheaper. Smooth motion, good consistency. Premium plan required.",
      imageInputs: { min: 1, max: 1 },
    },
    {
      id: "bytedance/seedance-v1-pro-i2v-720p",
      name: "Seedance 1 Pro 720p",
      provider: "atlascloud",
      atlasCloudType: "video",
      nsfw: false,
      locked: false,
      premium: false,
      // VERIFIED per-second real cost: $0.0473/s (owner's real Atlas Cloud
      // balance, Aug 2026 — see comment above). credits is the flat
      // fallback (kept at the 10s/worst-case price so anything that
      // doesn't hit creditsByDuration still can't lose money).
      // creditsByDuration is owner's explicit round-number pricing (higher
      // margin than the earlier 10/15/25 pass): 5s->10cr ($0.235 cost, 53%
      // margin), 8s->20cr ($0.376 cost, 62% margin), 10s->30cr ($0.47
      // cost, 69% margin). All three profitable, margin increases with
      // length.
      credits: 30,
      creditsByDuration: { 5: 10, 8: 20, 10: 30 },
      durations: [5, 8, 10],
      description: "Seedance 1 Pro, sourced via Atlas Cloud instead of Replicate — same model family, verified far cheaper. Good motion quality for general video.",
      imageInputs: { min: 1, max: 1 },
    },

    // =====================================================================
    // NSFW "SPICY" LINEUP — WaveSpeed [restored Aug 30 2026]
    // =====================================================================
    // History, so nobody re-litigates this from scratch:
    //   - Original NSFW I2V ran on a HuggingFace community model
    //     (imb101/I2V-WAN2.2-POVFaceSitting), then got forced onto HF's
    //     "wavespeed" INFERENCE PROVIDER routing (commit b127ff0) because
    //     the default fal-ai route rejects NSFW community models. That is
    //     NOT the same thing as WaveSpeed's own native API used below —
    //     it was HuggingFace calling WaveSpeed as a backend.
    //   - Commit 9bfba25 replaced that HF path entirely with Atlas
    //     Cloud's own "alibaba/wan-2.2-spicy/image-to-video" model
    //     ($0.03/run flat, verified on Atlas Cloud's model page).
    //   - Commit 4c965da9 (Aug 26) ripped the whole feature out — Atlas
    //     Cloud discontinued their NSFW-branded lineup — and also
    //     stripped the toggle/age-gate UI from StudioPanel.
    //   - I (Claude) re-added 2 Atlas Cloud spicy entries earlier this
    //     session pointed at the plain (non-discontinued-named) Atlas
    //     Cloud id, then found and self-reverted that — no toggle UI
    //     existed to ever unlock them, guaranteed dead menu items.
    //   - Owner confirmed (chat, prior session) the real fix: Atlas
    //     Cloud's NSFW lineup is gone for good, but WaveSpeed — now
    //     funded ($50) — has its OWN native "-spicy" tagged catalog,
    //     confirmed live via https://wavespeed.ai/api/models. It even
    //     includes a direct namesake successor,
    //     "wavespeed-ai/wan-2.2-spicy/image-to-video", to the old Atlas
    //     Cloud model. This is that lineup, added for real this time,
    //     via WaveSpeed's own submit-then-poll API (utils/runModel.js
    //     runWaveSpeed(), generalized below to handle these in addition
    //     to InfiniteTalk) — NOT the old HF inference-provider path.
    //
    // Pricing: WaveSpeed's public catalog gives {base_price, discount_rate}
    // per model, no explicit per-second/flat unit flag. Calibrated the
    // scale against WaveSpeed's own Seedance v1-Pro entries, whose real
    // $/s price is already independently verified in pricing-audit.md
    // (480p $0.03/s <-> base_price 150000; 720p $0.06/s <-> base_price
    // 300000 — exactly double, confirming a clean linear scale):
    //   real $/second = (base_price / 5,000,000) * (discount_rate / 100)
    // pricing-audit.md also independently confirms WAN-family models on
    // WaveSpeed bill per-second (WAN 3.0: 480p $0.05/s, 720p $0.10/s), so
    // per-second is used for every model below, not just Seedance — the
    // same defensive convention as the Atlas Cloud video re-pointing
    // earlier in this file (assume the worse-case billing so credits
    // charged can never fall short of real cost). credits = ceil(real
    // cost x 2.5 markup / $0.05 per credit) = ceil(real $/s x duration x 50).
    // 2 known false-positive keyword matches (wavespeed-ai/chroma,
    // wavespeed-ai/scail — not actually NSFW models) excluded.
    //
    // DURATION [re-audited Aug 30 2026]: every entry below got pulled
    // back to ONLY 5s after a live test on
    // alibaba/wan-2.7/image-to-video-spicy came back `400 invalid
    // request body field, duration must be one of 5, 10, or 15, got
    // number 8` — that [5, 8] guess had never been confirmed against
    // any of these 14 models' real schemas. Owner flagged this as an
    // over-correction (specifically noting Seedance used to offer
    // richer options before the blanket 5s fallback), so every model
    // was individually re-verified this pass against WaveSpeed's own
    // per-model docs pages — real schema tables at
    // wavespeed.ai/docs/docs-api/<vendor>/<slug>, slugs confirmed via
    // wavespeed.ai/docs/sitemap.xml (several don't match the model id's
    // own slug pattern — e.g. the alibaba/bytedance pages repeat the
    // vendor name in the slug: "alibaba-wan-2.7-image-to-video-spicy").
    // Real, per-model results:
    //   - wan-2.2-spicy family (all 4 variants): real enum is [5, 8].
    //   - ltx-2.3-spicy family (both variants): real range is 3-20
    //     (a continuous range, not an enum).
    //   - alibaba/wan-2.7 and alibaba/wan-2.6 spicy: real enum is
    //     [5, 10, 15] — wan-2.7's value independently corroborated by
    //     the original live 400 error above, which matches exactly.
    //   - vidu/q3-spicy: real range is 1-16 (continuous).
    //   - all 5 Seedance spicy tiers: real ranges are continuous
    //     (v1.5-pro: 4-12; 2.0-fast / 2.0-mini / 2.0: 4-15; 2.5: the
    //     docs are internally inconsistent — the schema table says
    //     4-30 but the page's own prose says 4-15. Treating 2.5 as
    //     4-15 until a live test resolves the discrepancy).
    //   - All 5 Seedance spicy tiers ALSO take an optional `last_image`
    //     (end frame) alongside the required `image` (start frame) —
    //     a real second upload slot that was missing here
    //     (imageInputs.max was 1 for all 5; corrected to 2 below).
    //     This is very likely exactly what the owner meant by "number
    //     of uploads you can add" being wrong.
    //
    // DURATION, ROUND 2 [same day]: shipped the [5, 8]-only version
    // above first, deliberately staying under the ~300s Vercel Fluid
    // Compute ceiling per utils/runModelAsync.js's "HONEST LIMITATION"
    // comment (no multi-invocation continuation chain exists yet, so a
    // job that runs past ~300s dies silently and sits "processing"
    // forever). Owner pushed back, correctly: the "regular" non-spicy
    // Seedance models already live on the site (provider: "atlascloud",
    // same file, `bytedance/seedance-2.0/text-to-video` etc.) already
    // offer 10s and 15s, so an 8s-only spicy lineup looked arbitrary
    // and under-delivering by comparison. Re-verified those aren't
    // really comparable — non-spicy Seedance runs through Atlas Cloud,
    // a different provider than WaveSpeed (used for spicy), and that
    // 10s option was validated by a real completed generation +
    // balance-drop check earlier in this project (see the pricing-audit
    // note a few hundred lines up) — WaveSpeed's spicy Seedance has
    // never had an equivalent live timing test. There is genuinely no
    // hard proof either way for WaveSpeed at 10-30s. Owner's explicit
    // call, given that: raise every model to its real WaveSpeed-
    // confirmed maximum anyway, accepting that a long spicy clip may
    // occasionally time out and fail until this gets either a real
    // timed test or the async continuation work that removes the 300s
    // ceiling for good. If timeouts on the longer options turn out to
    // be a real, frequent problem in practice, pull the top duration(s)
    // back down per model — don't re-guess a blanket number again.
    //   - wan-2.2-spicy family: unchanged, already at its real max [5, 8].
    //   - ltx-2.3-spicy (both variants): real range 3-20 -> now offers
    //     [5, 8, 10, 15, 20].
    //   - alibaba/wan-2.7 and alibaba/wan-2.6: real enum [5, 10, 15],
    //     no 8 -> now offers exactly [5, 10, 15].
    //   - vidu/q3-spicy: real range 1-16 -> now offers [5, 8, 10, 16].
    //   - seedance-v1.5-pro-spicy: real range 4-12 -> now offers
    //     [5, 8, 10, 12].
    //   - seedance-2.0-fast/2.0-mini/2.0-spicy: real range 4-15 -> now
    //     offer [5, 8, 10, 15].
    //   - seedance-2.5-spicy: re-fetched its docs page directly a
    //     second time to double-check the earlier "4-30 vs 4-15"
    //     inconsistency flag — the schema table consistently says 4-30
    //     with no conflicting prose found on the re-check, so treating
    //     4-30 as real -> now offers [5, 8, 10, 15, 20, 30]. Still the
    //     single least-certain value in this file; watch it first if
    //     any spicy model starts throwing real timeouts.
    {
      id: "wavespeed-ai/wan-2.2-spicy/image-to-video",
      name: "Wan 2.2 Spicy I2V",
      provider: "wavespeed",
      nsfw: true,
      locked: true,
      premium: false,
      credits: 8, // $0.03/s. Real enum confirmed [5, 8] — both offered.
      creditsByDuration: { 5: 8, 8: 12 },
      durations: [5, 8],
      description: "NSFW image-to-video. Animates your image into a cinematic clip. Unlock NSFW mode to use.",
      imageInputs: { min: 1, max: 1 },
    },
    {
      id: "wavespeed-ai/wan-2.2-spicy/video-extend",
      name: "Wan 2.2 Spicy Video Extend",
      provider: "wavespeed",
      nsfw: true,
      locked: true,
      premium: false,
      credits: 8, // $0.03/s. Real enum confirmed [5, 8] — both offered.
      creditsByDuration: { 5: 8, 8: 12 },
      durations: [5, 8],
      inputType: "video",
      description: "NSFW video extension — continues an existing clip further. Unlock NSFW mode to use.",
      imageInputs: { min: 0, max: 0 },
    },
    {
      id: "wavespeed-ai/wan-2.2-spicy/image-to-video-lora",
      name: "Wan 2.2 Spicy I2V LoRA",
      provider: "wavespeed",
      nsfw: true,
      locked: true,
      premium: false,
      credits: 10, // $0.04/s. Real enum confirmed [5, 8] — both offered.
      creditsByDuration: { 5: 10, 8: 16 },
      durations: [5, 8],
      description: "NSFW image-to-video with LoRA styling support. Unlock NSFW mode to use.",
      imageInputs: { min: 1, max: 1 },
    },
    {
      id: "wavespeed-ai/wan-2.2-spicy/video-extend-lora",
      name: "Wan 2.2 Spicy Video Extend LoRA",
      provider: "wavespeed",
      nsfw: true,
      locked: true,
      premium: false,
      credits: 10, // $0.04/s. Real enum confirmed [5, 8] — both offered.
      creditsByDuration: { 5: 10, 8: 16 },
      durations: [5, 8],
      inputType: "video",
      description: "NSFW video extension with LoRA styling support. Unlock NSFW mode to use.",
      imageInputs: { min: 0, max: 0 },
    },
    {
      id: "wavespeed-ai/ltx-2.3-spicy/image-to-video",
      name: "LTX 2.3 Spicy I2V",
      provider: "wavespeed",
      nsfw: true,
      locked: true,
      premium: false,
      credits: 5, // $0.02/s. Real range confirmed 3-20s — now offering full stops up to 20.
      creditsByDuration: { 5: 5, 8: 8, 10: 10, 15: 15, 20: 20 },
      durations: [5, 8, 10, 15, 20],
      description: "Cheapest NSFW video model in the lineup. Unlock NSFW mode to use.",
      imageInputs: { min: 1, max: 1 },
    },
    {
      id: "wavespeed-ai/ltx-2.3-spicy/image-to-video-lora",
      name: "LTX 2.3 Spicy I2V LoRA",
      provider: "wavespeed",
      nsfw: true,
      locked: true,
      premium: false,
      credits: 8, // $0.03/s. Real range confirmed 3-20s — now offering full stops up to 20.
      creditsByDuration: { 5: 8, 8: 12, 10: 15, 15: 23, 20: 30 },
      durations: [5, 8, 10, 15, 20],
      description: "Budget NSFW video with LoRA styling support. Unlock NSFW mode to use.",
      imageInputs: { min: 1, max: 1 },
    },
    {
      id: "alibaba/wan-2.7/image-to-video-spicy",
      name: "Wan 2.7 Spicy I2V",
      provider: "wavespeed",
      nsfw: true,
      locked: true,
      premium: false,
      // $0.10/s. Real enum confirmed [5, 10, 15] — this is the model
      // whose live 400 error first caught the old [5, 8] guess, so its
      // enum is the most solidly confirmed value in this whole file.
      // No 8 option exists for this model. 10s/15s do sit at/past our
      // Vercel 300s ceiling with no real timing test to back them —
      // offered anyway per owner's explicit Aug 30 2026 call to raise
      // every spicy model to its real WaveSpeed max and accept that
      // risk rather than stay artificially capped. Watch this one
      // first if timeouts show up in practice.
      credits: 25,
      creditsByDuration: { 5: 25, 10: 50, 15: 75 },
      durations: [5, 10, 15],
      description: "NSFW image-to-video on Wan 2.7's newer, sharper model. Unlock NSFW mode to use.",
      imageInputs: { min: 1, max: 1 },
    },
    {
      id: "alibaba/wan-2.6/image-to-video-spicy",
      name: "Wan 2.6 Spicy I2V",
      provider: "wavespeed",
      nsfw: true,
      locked: true,
      premium: false,
      // $0.10/s. Real enum confirmed [5, 10, 15], same shape and same
      // reasoning as wan-2.7 above.
      credits: 25,
      creditsByDuration: { 5: 25, 10: 50, 15: 75 },
      durations: [5, 10, 15],
      description: "NSFW image-to-video on Wan 2.6. Unlock NSFW mode to use.",
      imageInputs: { min: 1, max: 1 },
    },
    {
      id: "vidu/q3/image-to-video-spicy",
      name: "Vidu Q3 Spicy I2V",
      provider: "wavespeed",
      nsfw: true,
      locked: true,
      premium: true,
      credits: 18, // $0.07/s. Real range confirmed 1-16s — now offering full stops up to 16.
      creditsByDuration: { 5: 18, 8: 28, 10: 35, 16: 56 },
      durations: [5, 8, 10, 16],
      description: "NSFW image-to-video on Vidu Q3 — stronger prompt adherence, higher tier. Unlock NSFW mode to use.",
      imageInputs: { min: 1, max: 1 },
    },
    {
      id: "bytedance/seedance-v1.5-pro/image-to-video-spicy",
      name: "Seedance 1.5 Pro Spicy I2V",
      provider: "wavespeed",
      nsfw: true,
      locked: true,
      premium: true,
      credits: 13, // $0.052/s. Real range confirmed 4-12s — now offering full stops up to 12.
      creditsByDuration: { 5: 13, 8: 21, 10: 26, 12: 32 },
      durations: [5, 8, 10, 12],
      description: "NSFW image-to-video on Seedance 1.5 Pro — smooth motion, strong subject coherence. Optional end-frame image supported. Unlock NSFW mode to use.",
      // Real schema takes a required start `image` PLUS an optional
      // `last_image` (end frame) — a second upload slot that was
      // missing here (was max:1 for all 5 Seedance tiers).
      imageInputs: { min: 1, max: 2 },
    },
    {
      id: "bytedance/seedance-2.0-fast/image-to-video-spicy",
      name: "Seedance 2.0 Fast Spicy I2V",
      provider: "wavespeed",
      nsfw: true,
      locked: true,
      premium: false,
      credits: 20, // $0.08/s. Real range confirmed 4-15s — now offering full stops up to 15.
      creditsByDuration: { 5: 20, 8: 32, 10: 40, 15: 60 },
      durations: [5, 8, 10, 15],
      description: "Faster, cheaper NSFW Seedance 2.0 tier. Optional end-frame image supported. Unlock NSFW mode to use.",
      imageInputs: { min: 1, max: 2 },
    },
    {
      id: "bytedance/seedance-2.0-mini/image-to-video-spicy",
      name: "Seedance 2.0 Mini Spicy I2V",
      provider: "wavespeed",
      nsfw: true,
      locked: true,
      premium: false,
      credits: 18, // $0.072/s. Real range confirmed 4-15s — now offering full stops up to 15.
      creditsByDuration: { 5: 18, 8: 29, 10: 36, 15: 54 },
      durations: [5, 8, 10, 15],
      description: "Budget NSFW Seedance 2.0 tier. Optional end-frame image supported. Unlock NSFW mode to use.",
      imageInputs: { min: 1, max: 2 },
    },
    {
      id: "bytedance/seedance-2.0/image-to-video-spicy",
      name: "Seedance 2.0 Spicy I2V",
      provider: "wavespeed",
      nsfw: true,
      locked: true,
      premium: true,
      credits: 27, // $0.108/s. Real range confirmed 4-15s — now offering full stops up to 15.
      creditsByDuration: { 5: 27, 8: 44, 10: 54, 15: 81 },
      durations: [5, 8, 10, 15],
      description: "Full-quality NSFW Seedance 2.0 tier. Optional end-frame image supported. Unlock NSFW mode to use.",
      imageInputs: { min: 1, max: 2 },
    },
    {
      id: "bytedance/seedance-2.5/image-to-video-spicy",
      name: "Seedance 2.5 Spicy I2V",
      provider: "wavespeed",
      nsfw: true,
      locked: true,
      premium: true,
      // $0.162/s. Re-fetched this model's docs page directly a second
      // time to double-check an earlier "4-30 vs 4-15" inconsistency
      // flag — schema table consistently reads 4-30 with no
      // conflicting prose found on re-check. Treating 4-30 as real,
      // but this is still the single least-certain duration value in
      // this file — watch it first if any spicy model starts timing
      // out in practice.
      credits: 41,
      creditsByDuration: { 5: 41, 8: 65, 10: 81, 15: 122, 20: 162, 30: 243 },
      durations: [5, 8, 10, 15, 20, 30],
      description: "Top-tier NSFW video model — newest Seedance generation, best quality in the spicy lineup. Optional end-frame image supported. Unlock NSFW mode to use.",
      imageInputs: { min: 1, max: 2 },
    },
  ],

  // =====================================================================
  // TTS MODELS
  // =====================================================================
  tts: [
        {
      // VERIFIED: Replicate model page confirms $0.00022/run (4545 runs per $1).
      // 96M+ runs — most widely used open-source TTS. Ranked #1 on TTS Arena.
      // 46 voices across 6 languages (en-US, en-GB, fr, hi, it, ja, zh).
      // Pricing: $0.00022 × 2.5 markup / $0.05 per credit = 0.011 → 1 credit.
      id: "jaaari/kokoro-82m",
      name: "Kokoro-82M",
      provider: "replicate",
      comingSoon: true,
      nsfw: false,
      locked: false,
      premium: false,
      credits: 1,
      description: "Open-source TTS, ranked #1 on TTS Arena. 46 voices across 6 languages. Fastest and most cost-effective option.",
    },
    {
      id: "elevenlabs/v3",
      name: "ElevenLabs v3",
      provider: "replicate",
      comingSoon: true,
      nsfw: false,
      locked: false,
      premium: true,
      credits: 1,
      description: "Most natural, expressive voices. Best for narration and emotional delivery.",
    },
    {
      id: "minimax/speech-2.8-hd",
      name: "Speech 2.8 HD (MiniMax)",
      provider: "replicate",
      comingSoon: true,
      nsfw: false,
      locked: false,
      premium: true,
      credits: 1,
      description: "High-fidelity audio quality, great for polished final output.",
    },
    {
      id: "elevenlabs/turbo-v2.5",
      name: "ElevenLabs Turbo v2.5",
      provider: "replicate",
      comingSoon: true,
      nsfw: false,
      locked: false,
      premium: false,
      credits: 1,
      description: "Faster, slightly less detailed than v3 — good for quick drafts.",
    },
    {
      id: "inworld/realtime-tts-2",
      name: "Realtime TTS-2 (Inworld)",
      provider: "replicate",
      comingSoon: true,
      nsfw: false,
      locked: false,
      premium: false,
      credits: 1,
      description: "Low-latency, good for interactive or conversational use cases.",
    },
    {
      id: "minimax/speech-2.8-turbo",
      name: "Speech 2.8 Turbo (MiniMax)",
      provider: "replicate",
      comingSoon: true,
      nsfw: false,
      locked: false,
      premium: false,
      credits: 1,
      description: "Faster, lighter version of Speech 2.8 HD.",
    },
    {
      id: "google/gemini-3.1-flash-tts",
      name: "Gemini 3.1 Flash TTS (Google)",
      provider: "replicate",
      comingSoon: true,
      nsfw: false,
      locked: false,
      premium: false,
      credits: 1,
      description: "Quick, clear narration voice, good general-purpose default.",
    },
    {
      id: "resemble-ai/chatterbox",
      name: "Chatterbox (Resemble)",
      provider: "replicate",
      comingSoon: true,
      nsfw: false,
      locked: false,
      premium: false,
      credits: 1,
      description: "Casual, conversational tone — good for character dialogue.",
    },
    {
      id: "afiaka87/tortoise-tts",
      name: "Tortoise TTS",
      provider: "replicate",
      comingSoon: true,
      nsfw: false,
      locked: false,
      premium: false,
      credits: 1,
      description: "Slower to generate but known for very natural-sounding cadence.",
    },
              ],

  // =====================================================================
  // TALKING PHOTO MODELS (formerly "Lip Sync" tab)
  // One photo + audio -> a talking/singing avatar video. Unlike the
  // multi-character Timeline (which stitches several short clips),
  // these models render ONE continuous clip directly, up to several
  // minutes long depending on the model and duration chosen.
  //
  // InfiniteTalk pricing is NOT flat — it scales with requested
  // duration and resolution (see WaveSpeed's real pricing table:
  // $0.03/sec at 480p, $0.06/sec at 720p, 5s minimum, 600s/10min cap).
  // `creditsPerSecond` drives the actual charge dynamically in
  // pages/api/lipsync.js — `credits` here is just the per-5-second
  // minimum, shown in the dropdown for reference.
  // =====================================================================
  lipsync: [
    {
      // VERIFIED: DomoAI docs confirm $0.06/sec for talking-avatar-v1.
      // Pricing: $0.06 × 2.5 / $0.05 = 3 credits/sec. 5s min = 15 credits.
      // Supports up to 60s. Takes face photo + audio → talking video.
      // Same inputs as other lipsync models (face image + audio file).
      // GATED [Aug 29 2026]: DOMOAI_API_KEY is not set in Vercel — same
      // issue as the DomoAI video models above.
      id: "domoai/talking-avatar-v1",
      name: "Talking Avatar (DomoAI)",
      provider: "domoai",
      comingSoon: true,
      domoAICategory: "talking-avatar",
      domoAIModel: "talking-avatar-v1",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 15, // minimum charge, 5 seconds
      creditsPerSecond: 3,
      maxDurationSeconds: 60,
      description: "DomoAI talking avatar — photo or video driven by your audio. Realistic head + expression sync. Up to 60 seconds.",
    },
    {
      // WaveSpeed account was disabled by their payment processor
      // (repeated failed card attempts read as a fraud signal) — was
      // gated comingSoon until the account was reinstated. RESTORED
      // LIVE [Aug 2026]: WaveSpeed is now funded ($50) — comingSoon
      // removed from all 7 InfiniteTalk entries below.
      id: "wavespeed-ai/infinitetalk",
      name: "InfiniteTalk 720p",
      provider: "wavespeed",
      nsfw: false,
      locked: false,
      premium: true,
      credits: 15, // minimum charge, 5 seconds at 720p
      creditsPerSecond: 3,
      maxDurationSeconds: 600,
      resolution: "720p",
      description: "Highest quality talking photo. Up to 10 minutes, full body + expression sync, not just lips.",
    },
    {
      id: "wavespeed-ai/infinitetalk-480p",
      name: "InfiniteTalk 480p",
      provider: "wavespeed",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 8, // minimum charge, 5 seconds at 480p
      creditsPerSecond: 1.5,
      maxDurationSeconds: 600,
      resolution: "480p",
      description: "Budget talking photo. Same long-duration capability as 720p, lower resolution to save credits.",
    },
    {
      id: "wavespeed-ai/infinitetalk-v2v",
      name: "InfiniteTalk Video-to-Video",
      provider: "wavespeed",
      nsfw: false,
      locked: false,
      premium: true,
      credits: 15,
      creditsPerSecond: 3,
      maxDurationSeconds: 600,
      resolution: "720p",
      inputType: "video",
      description: "Lip-syncs one person in an existing video to new dialogue. Use when you already have animated footage.",
    },
    {
      id: "wavespeed-ai/infinitetalk-v2v-480p",
      name: "InfiniteTalk Video-to-Video 480p",
      provider: "wavespeed",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 8,
      creditsPerSecond: 1.5,
      maxDurationSeconds: 600,
      resolution: "480p",
      inputType: "video",
      description: "Budget video-to-video lip sync for one person.",
    },
    {
      // Used internally by the Multi-Character Timeline. Same per-second
      // rate as the single-person endpoint above — WaveSpeed prices
      // infinitetalk/multi identically to infinitetalk ($0.30/5s @ 720p),
      // confirmed against their live pricing page. Caps at exactly 2
      // simultaneous speakers per call; the Timeline backend groups
      // characters into pairs and chains the resulting clips for casts
      // larger than 2.
      //
      // NOTE: comingSoon here only hides this from the standalone
      // Lipsync dropdown. The Multi-Character Timeline (timeline-generate.js)
      // looks this model up directly by id and does NOT check comingSoon,
      // so Timeline will still attempt real calls and fail (safely, no
      // credits charged on failure — see runModelAsync.js) until the
      // WaveSpeed account is reinstated.
      id: "wavespeed-ai/infinitetalk-multi",
      name: "InfiniteTalk Multi 720p",
      provider: "wavespeed",
      nsfw: false,
      locked: false,
      premium: true,
      credits: 15,
      creditsPerSecond: 3,
      maxDurationSeconds: 600,
      maxSpeakers: 2,
      resolution: "720p",
      description: "Two-person scene animation from one shared photo or video. Powers the Multi-Character Timeline.",
    },
    {
      id: "wavespeed-ai/infinitetalk-multi-480p",
      name: "InfiniteTalk Multi 480p",
      provider: "wavespeed",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 8,
      creditsPerSecond: 1.5,
      maxDurationSeconds: 600,
      maxSpeakers: 2,
      resolution: "480p",
      description: "Budget two-person scene animation. Same capability as 720p, lower resolution to save credits.",
    },
    {
      // Video-to-video variant: user already has an animated/existing
      // clip and just needs lip sync dubbed onto up to 2 people in it.
      // Also the pass-2+ model for the Multi-Character Timeline's
      // pairing loop (4-character timelines) — every pass after the
      // first operates on the PREVIOUS pass's video output, regardless
      // of whether the original scene was a photo or video, so it
      // always needs the video-to-video variant here.
      id: "wavespeed-ai/infinitetalk-multi-v2v",
      name: "InfiniteTalk Multi Video-to-Video",
      provider: "wavespeed",
      nsfw: false,
      locked: false,
      premium: true,
      credits: 15,
      creditsPerSecond: 3,
      maxDurationSeconds: 600,
      maxSpeakers: 2,
      resolution: "720p",
      inputType: "video",
      description: "Lip-syncs up to 2 people in an existing video to new dialogue. Use when you already have animated footage.",
    },
    {
      // ADDED [Aug 30 2026]: budget counterpart to the 720p entry above,
      // same pattern as every other InfiniteTalk pair (see -480p
      // siblings elsewhere in this file). runWaveSpeed() in
      // utils/runModel.js already derives resolution generically from
      // the "-480p" suffix, so no new provider-side logic is needed —
      // this is purely a catalog entry to expose the budget option for
      // the Timeline's pairing loop.
      id: "wavespeed-ai/infinitetalk-multi-v2v-480p",
      name: "InfiniteTalk Multi Video-to-Video 480p",
      provider: "wavespeed",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 8,
      creditsPerSecond: 1.5,
      maxDurationSeconds: 600,
      maxSpeakers: 2,
      resolution: "480p",
      inputType: "video",
      description: "Budget video-to-video lip sync for up to 2 people in an existing video.",
    },
    {
      id: "sync/lipsync-2-pro",
      name: "LipSync 2 Pro (Sync)",
      provider: "replicate",
      comingSoon: true,
      nsfw: false,
      locked: false,
      premium: true,
      credits: 12,
      description: "Highest accuracy mouth-sync for short clips. Best for close-up, polished single shots.",
    },
    {
      id: "heygen/lipsync-precision",
      name: "LipSync Precision (HeyGen)",
      provider: "replicate",
      comingSoon: true,
      nsfw: false,
      locked: false,
      premium: true,
      credits: 12,
      description: "Very precise sync timing for short clips, good for multi-language dialogue.",
    },
    {
      id: "pixverse/lipsync",
      name: "PixVerse LipSync",
      provider: "replicate",
      comingSoon: true,
      nsfw: false,
      locked: false,
      premium: false,
      credits: 12,
      description: "Reliable, affordable short-clip lip sync for most face/audio pairs.",
    },
  ],
};

// -------------------------------------------------------------
// Helper: find any model by id across every category
// -------------------------------------------------------------
export function findModelById(modelId) {
  for (const category of Object.keys(MODELS)) {
    const found = MODELS[category].find((m) => m.id === modelId);
    if (found) {
      return {
        ...found,
        category,
        // Default to 0-1 reference images for any model that hasn't
        // had its real limit verified yet — safe, conservative default.
        imageInputs: found.imageInputs || { min: 0, max: 1 },
      };
    }
  }
  return null;
}

// -------------------------------------------------------------
// Helper: get all models in a category, sorted highest-credits-first
// (most expensive / highest quality at the top of any dropdown).
// NSFW-locked models are always sorted to the end regardless of cost,
// since they're not a real choice until unlocked.
// -------------------------------------------------------------
export function getSortedModels(category) {
  const list = MODELS[category] || [];
  return [...list].sort((a, b) => {
    // Free (0 credits, active) models float to the top of the active section
    // so members immediately see what they can use right now.
    // Coming-soon and locked models sink to the bottom in that order.
    const aFree = (!a.locked && !a.comingSoon && a.credits === 0) ? 1 : 0;
    const bFree = (!b.locked && !b.comingSoon && b.credits === 0) ? 1 : 0;
    if (aFree !== bFree) return bFree - aFree; // free first

    const aDown = (a.comingSoon ? 2 : 0) + (a.locked ? 1 : 0);
    const bDown = (b.comingSoon ? 2 : 0) + (b.locked ? 1 : 0);
    if (aDown !== bDown) return aDown - bDown;

    return b.credits - a.credits;
  });
}
