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
//   NSFW video         -> 60 credits  (image-to-video, same tier as premium video+)
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
      id: "black-forest-labs/flux-2-pro",
      name: "FLUX-2 Pro (Black-Forest-Labs)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      premium: true,
      credits: 3,
      description: "Best overall photorealism and fine detail. Top pick for portraits and product shots.",
    },
    {
      id: "google/nano-banana-2",
      name: "Nano Banana 2 (Google)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      premium: true,
      // VERIFIED: real cost is $0.067-0.151/image depending on resolution
      // (confirmed across multiple sources). Was 3 credits, too thin a
      // margin especially at 4K output — corrected to 5.
      credits: 5,
      description: "Top all-around image model. Multi-image fusion (up to 14 refs), excellent text rendering.",
      imageInputs: { min: 0, max: 14 },
    },
    {
      id: "google/imagen-4-ultra",
      name: "Imagen 4 Ultra (Google)",
      provider: "replicate",
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
    },
    {
      id: "black-forest-labs/flux-2-flex",
      name: "FLUX-2 Flex (Black-Forest-Labs)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 2,
      description: "Fast, flexible all-rounder. Great default choice for most image prompts.",
    },
    {
      id: "bytedance/seedream-5-lite",
      name: "Seedream 5 Lite (Bytedance)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 2,
      description: "Clean, balanced style. Reliable for everyday scenes and characters.",
    },
    {
      id: "bytedance/seedream-4.5",
      name: "Seedream 4.5 (Bytedance)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 2,
      description: "Vivid color and lighting. Good for stylized or vibrant artwork.",
      imageInputs: { min: 0, max: 15 },
    },
    {
      id: "bytedance/seedream-3",
      name: "Seedream 3 (Bytedance)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 2,
      description: "Older, budget-friendly Seedream version. Solid for simple compositions.",
    },
    {
      id: "wan-video/wan-2.7-image-pro",
      name: "WAN 2.7 Image Pro (WAN-Video)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 2,
      description: "Sharp detail, good for character art that may later be animated to video.",
    },
    {
      id: "ideogram-ai/ideogram-v3-turbo",
      name: "Ideogram V3 Turbo (Ideogram)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 2,
      description: "Best-in-class for text and lettering inside images. Great for logos and signage.",
    },
    {
      id: "ideogram-ai/ideogram-v2",
      name: "Ideogram V2 (Ideogram)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 2,
      description: "Older Ideogram version. Still strong for typography-heavy designs.",
    },
    {
      id: "minimax/image-01",
      name: "MiniMax Image-01",
      provider: "replicate",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 2,
      description: "Good general-purpose image model, dependable for everyday prompts.",
    },
    {
      id: "comfyui/any-comfyui-workflow",
      name: "Any ComfyUI Workflow (ComfyUI)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 2,
      description: "Run a custom ComfyUI workflow for advanced, highly specific control over output.",
    },
    {
      id: "fermatresearch/sdxl-controlnet-lora",
      name: "SDXL ControlNet LoRA (FermatResearch)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 2,
      description: "Best for matching a specific pose or layout using a reference image.",
    },
    {
      id: "lucataco/ssd-1b",
      name: "SSD-1B (Lucataco)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 2,
      description: "Lightweight and fast. Good for quick drafts and iteration.",
    },
    {
      // Replaces gooniebloans/igoonhard, which had ZERO working
      // HuggingFace inference providers (confirmed via Hugging Face Hub
      // API — "no inference provider available"). This model is real,
      // active, and hosted directly on Replicate: 404K+ runs, ~$0.017
      // per run, built on FLUX.1-dev with the safety checker disabled
      // (Replicate's docs explicitly support this for FLUX/SDXL
      // derivative fine-tunes — see docs/topics/predictions/safety-checking).
      id: "aisha-ai-official/nsfw-flux-dev",
      name: "NSFW Flux Dev (Aisha AI)",
      provider: "replicate",
      nsfw: true,
      locked: true,
      premium: false,
      credits: 5,
      description: "NSFW image model. Unlock NSFW mode to use.",
    },
    {
      // Confirmed via Hugging Face Hub API to have live inference
      // providers (fal-ai, replicate, wavespeed). Kept on the
      // huggingface provider here since the exact Replicate-hosted
      // slug for this model wasn't verified — this HF path IS
      // confirmed working, so no need to risk an unverified path.
      id: "Jonny001/NSFW_master",
      name: "NSFW Master (Jonny001)",
      provider: "huggingface",
      nsfw: true,
      locked: true,
      premium: false,
      credits: 5,
      description: "NSFW image model. Unlock NSFW mode to use.",
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
      id: "imb101/I2V-WAN2.2-POVFaceSitting",
      name: "I2V WAN 2.2 POV Face Sitting (NSFW)",
      provider: "huggingface",
      nsfw: true,
      locked: true,
      premium: false,
      credits: 60,
      description: "NSFW image-to-video model. Unlock NSFW mode to use.",
    },
    {
      id: "runwayml/gen-4.5",
      name: "Runway Gen-4.5",
      provider: "replicate",
      nsfw: false,
      locked: false,
      premium: true,
      credits: 35,
      description: "Top-tier cinematic motion and camera control. Best for polished, film-like shots.",
    },
    {
      id: "google/veo-3.1",
      name: "VEO 3.1 (Google)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      premium: true,
      credits: 28,
      description: "Excellent realism and physics. Strong for natural movement and lighting.",
    },
    {
      id: "bytedance/dreamactor-m2.0",
      name: "DreamActor M2.0 (Bytedance)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      premium: true,
      credits: 28,
      description: "Best for character performance and expressive acting in a generated video.",
    },
    {
      id: "xai/grok-imagine-video",
      name: "Grok Imagine Video (XAI)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      premium: true,
      credits: 28,
      description: "Strong creative range, handles unusual or imaginative prompts well.",
    },
    {
      id: "google/veo-2",
      name: "VEO 2 (Google)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 8,
      description: "Reliable realism at a lower cost than VEO 3.1. Good everyday choice.",
    },
    {
      id: "kwaivgi/kling-v3-video",
      name: "Kling V3 Video (Kwaivgi)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 20,
      description: "Smooth motion and good consistency across frames. Popular all-rounder.",
    },
    {
      id: "kwaivgi/kling-v3-omni-video",
      name: "Kling V3 Omni Video (Kwaivgi)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 20,
      description: "Handles a wider variety of input types (image, text) flexibly.",
    },
    {
      id: "kwaivgi/kling-v2.5-turbo-pro",
      name: "Kling V2.5 Turbo Pro (Kwaivgi)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 18,
      description: "Faster turnaround than V3, still solid quality for quick iterations.",
    },
    {
      id: "kwaivgi/kling-v2.0",
      name: "Kling V2.0 (Kwaivgi)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 16,
      description: "Older Kling version, dependable and budget-conscious.",
    },
    {
      id: "bytedance/seedance-2.0",
      name: "Seedance 2.0 (Bytedance)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 8,
      description: "Good motion quality for dance, action, and dynamic movement scenes.",
    },
    {
      id: "bytedance/seedance-1.5-pro",
      name: "Seedance 1.5 Pro (Bytedance)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 8,
      description: "Balanced quality and speed, a safe middle-ground choice.",
    },
    {
      id: "bytedance/seedance-1-pro",
      name: "Seedance 1 Pro (Bytedance)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 7,
      description: "Earlier Seedance version, still capable for general video needs.",
    },
    {
      id: "bytedance/seedance-1-lite",
      name: "Seedance 1 Lite (Bytedance)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 6,
      description: "Lighter, faster Seedance variant for quicker turnarounds.",
    },
    {
      id: "wan-video/wan-2.7-t2v",
      name: "WAN 2.7 T2V (WAN-Video)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 10,
      description: "Latest WAN text-to-video, good detail retention during motion.",
    },
    {
      id: "wan-video/wan-2.5-t2v-fast",
      name: "WAN 2.5 T2V Fast (WAN-Video)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 9,
      description: "Speed-optimized text-to-video. Good for quick previews.",
    },
    {
      id: "wan-video/wan-2.2-t2v-fast",
      name: "WAN 2.2 T2V Fast (WAN-Video)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 8,
      description: "Earlier fast WAN variant, reliable and quick.",
    },
    {
      id: "wan-video/wan-2.5-i2v-fast",
      name: "WAN 2.5 I2V Fast (WAN-Video)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 9,
      description: "Image-to-video — animate a still photo into motion quickly.",
    },
    {
      id: "wan-video/wan-2.2-s2v",
      name: "WAN 2.2 S2V (WAN-Video)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 8,
      description: "Speech-to-video — drives motion from an audio track.",
    },
    {
      id: "minimax/hailuo-2.3",
      name: "Hailuo 2.3 (MiniMax)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 12,
      description: "Strong character consistency across a generated clip.",
    },
    {
      id: "minimax/video-01",
      name: "MiniMax Video-01",
      provider: "replicate",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 10,
      description: "General-purpose video generation, dependable baseline option.",
    },
    {
      id: "prunaai/p-video",
      name: "P-Video (PrunaAI)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 8,
      description: "Efficient general video generation at a competitive speed.",
    },
    {
      id: "prunaai/p-video-animate",
      name: "P-Video Animate (PrunaAI)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 8,
      description: "Tuned for animating still characters or illustrations.",
    },
    {
      id: "prunaai/p-video-avatar",
      name: "P-Video Avatar (PrunaAI)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 8,
      description: "Tuned specifically for talking-avatar style video.",
    },
    {
      id: "alibaba/happyhorse-1.0",
      name: "HappyHorse 1.0 (Alibaba)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 10,
      description: "Good for playful, stylized motion and lighter content.",
    },
    {
      id: "veed/fabric-1.0",
      name: "Fabric 1.0 (VEED)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 9,
      description: "Built with editing workflows in mind — clean, predictable output.",
    },
    {
      id: "fofr/tooncrafter",
      name: "ToonCrafter (Fofr)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 7,
      description: "Best for cartoon and animated styles rather than realism.",
    },
  ],

  // =====================================================================
  // TTS MODELS
  // =====================================================================
  tts: [
    {
      id: "elevenlabs/v3",
      name: "ElevenLabs v3",
      provider: "replicate",
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
      nsfw: false,
      locked: false,
      premium: false,
      credits: 1,
      description: "Slower to generate but known for very natural-sounding cadence.",
    },
    {
      id: "fermatresearch/spanish-f5-tts",
      name: "Spanish F5 TTS (FermatResearch)",
      provider: "huggingface",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 1,
      description: "Tuned specifically for natural Spanish pronunciation.",
    },
    {
      id: "x-lance/f5-tts",
      name: "F5 TTS (X-Lance)",
      provider: "huggingface",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 1,
      description: "Solid general multilingual text-to-speech baseline.",
    },
    {
      id: "chenxwh/openvoice",
      name: "OpenVoice (Chenxwh)",
      provider: "huggingface",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 1,
      description: "Supports voice cloning from a short reference sample.",
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
      id: "wavespeed-ai/infinitetalk",
      name: "InfiniteTalk 720p (WaveSpeed)",
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
      name: "InfiniteTalk 480p (WaveSpeed)",
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
      id: "sync/lipsync-2-pro",
      name: "LipSync 2 Pro (Sync)",
      provider: "replicate",
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
    if (a.locked !== b.locked) return a.locked ? 1 : -1;
    return b.credits - a.credits;
  });
}
