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
      id: "google/imagen-4-ultra",
      name: "Imagen 4 Ultra (Google)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      premium: true,
      credits: 3,
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
      credits: 45,
      description: "Top-tier cinematic motion and camera control. Best for polished, film-like shots.",
    },
    {
      id: "google/veo-3.1",
      name: "VEO 3.1 (Google)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      premium: true,
      credits: 45,
      description: "Excellent realism and physics. Strong for natural movement and lighting.",
    },
    {
      id: "bytedance/dreamactor-m2.0",
      name: "DreamActor M2.0 (Bytedance)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      premium: true,
      credits: 45,
      description: "Best for character performance and expressive acting in a generated video.",
    },
    {
      id: "xai/grok-imagine-video",
      name: "Grok Imagine Video (XAI)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      premium: true,
      credits: 45,
      description: "Strong creative range, handles unusual or imaginative prompts well.",
    },
    {
      id: "google/veo-2",
      name: "VEO 2 (Google)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 30,
      description: "Reliable realism at a lower cost than VEO 3.1. Good everyday choice.",
    },
    {
      id: "kwaivgi/kling-v3-video",
      name: "Kling V3 Video (Kwaivgi)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 30,
      description: "Smooth motion and good consistency across frames. Popular all-rounder.",
    },
    {
      id: "kwaivgi/kling-v3-omni-video",
      name: "Kling V3 Omni Video (Kwaivgi)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 30,
      description: "Handles a wider variety of input types (image, text) flexibly.",
    },
    {
      id: "kwaivgi/kling-v2.5-turbo-pro",
      name: "Kling V2.5 Turbo Pro (Kwaivgi)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 30,
      description: "Faster turnaround than V3, still solid quality for quick iterations.",
    },
    {
      id: "kwaivgi/kling-v2.0",
      name: "Kling V2.0 (Kwaivgi)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 30,
      description: "Older Kling version, dependable and budget-conscious.",
    },
    {
      id: "bytedance/seedance-2.0",
      name: "Seedance 2.0 (Bytedance)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 30,
      description: "Good motion quality for dance, action, and dynamic movement scenes.",
    },
    {
      id: "bytedance/seedance-1.5-pro",
      name: "Seedance 1.5 Pro (Bytedance)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 30,
      description: "Balanced quality and speed, a safe middle-ground choice.",
    },
    {
      id: "bytedance/seedance-1-pro",
      name: "Seedance 1 Pro (Bytedance)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 30,
      description: "Earlier Seedance version, still capable for general video needs.",
    },
    {
      id: "bytedance/seedance-1-lite",
      name: "Seedance 1 Lite (Bytedance)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 30,
      description: "Lighter, faster Seedance variant for quicker turnarounds.",
    },
    {
      id: "wan-video/wan-2.7-t2v",
      name: "WAN 2.7 T2V (WAN-Video)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 30,
      description: "Latest WAN text-to-video, good detail retention during motion.",
    },
    {
      id: "wan-video/wan-2.5-t2v-fast",
      name: "WAN 2.5 T2V Fast (WAN-Video)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 30,
      description: "Speed-optimized text-to-video. Good for quick previews.",
    },
    {
      id: "wan-video/wan-2.2-t2v-fast",
      name: "WAN 2.2 T2V Fast (WAN-Video)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 30,
      description: "Earlier fast WAN variant, reliable and quick.",
    },
    {
      id: "wan-video/wan-2.5-i2v-fast",
      name: "WAN 2.5 I2V Fast (WAN-Video)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 30,
      description: "Image-to-video — animate a still photo into motion quickly.",
    },
    {
      id: "wan-video/wan-2.2-s2v",
      name: "WAN 2.2 S2V (WAN-Video)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 30,
      description: "Speech-to-video — drives motion from an audio track.",
    },
    {
      id: "minimax/hailuo-2.3",
      name: "Hailuo 2.3 (MiniMax)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 30,
      description: "Strong character consistency across a generated clip.",
    },
    {
      id: "minimax/video-01",
      name: "MiniMax Video-01",
      provider: "replicate",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 30,
      description: "General-purpose video generation, dependable baseline option.",
    },
    {
      id: "prunaai/p-video",
      name: "P-Video (PrunaAI)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 30,
      description: "Efficient general video generation at a competitive speed.",
    },
    {
      id: "prunaai/p-video-animate",
      name: "P-Video Animate (PrunaAI)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 30,
      description: "Tuned for animating still characters or illustrations.",
    },
    {
      id: "prunaai/p-video-avatar",
      name: "P-Video Avatar (PrunaAI)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 30,
      description: "Tuned specifically for talking-avatar style video.",
    },
    {
      id: "alibaba/happyhorse-1.0",
      name: "HappyHorse 1.0 (Alibaba)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 30,
      description: "Good for playful, stylized motion and lighter content.",
    },
    {
      id: "veed/fabric-1.0",
      name: "Fabric 1.0 (VEED)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 30,
      description: "Built with editing workflows in mind — clean, predictable output.",
    },
    {
      id: "fofr/tooncrafter",
      name: "ToonCrafter (Fofr)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 30,
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
  // LIPSYNC / TALKING AVATAR MODELS
  // =====================================================================
  lipsync: [
    {
      id: "sync/lipsync-2-pro",
      name: "LipSync 2 Pro (Sync)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      premium: true,
      credits: 12,
      description: "Highest accuracy mouth-sync, best for close-up, polished shots.",
    },
    {
      id: "heygen/lipsync-precision",
      name: "LipSync Precision (HeyGen)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      premium: true,
      credits: 12,
      description: "Very precise sync timing, good for multi-language dialogue.",
    },
    {
      id: "pixverse/lipsync",
      name: "PixVerse LipSync",
      provider: "replicate",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 12,
      description: "Reliable general-purpose lip sync for most face/audio pairs.",
    },
    {
      id: "sync/react-1",
      name: "React-1 (Sync)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 12,
      description: "Adds subtle natural reactions/expressions beyond just mouth movement.",
    },
    {
      id: "heygen/lipsync-speed",
      name: "LipSync Speed (HeyGen)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 12,
      description: "Faster turnaround, slightly less precise than Precision model.",
    },
    {
      id: "kwaivgi/kling-lip-sync",
      name: "Kling Lip Sync (Kwaivgi)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 12,
      description: "Good consistency when paired with Kling-generated video.",
    },
    {
      id: "chenxwh/video-retalking",
      name: "Video Retalking (Chenxwh)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 12,
      description: "Works well for re-syncing existing video to new dialogue.",
    },
    {
      id: "wan-video/wan-2.2-s2v-lipsync",
      name: "WAN 2.2 S2V (WAN-Video)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      premium: false,
      credits: 12,
      description: "Speech-driven sync, good baseline option for most use cases.",
    },
  ],
};

// -------------------------------------------------------------
// Helper: find any model by id across every category
// -------------------------------------------------------------
export function findModelById(modelId) {
  for (const category of Object.keys(MODELS)) {
    const found = MODELS[category].find((m) => m.id === modelId);
    if (found) return { ...found, category };
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
