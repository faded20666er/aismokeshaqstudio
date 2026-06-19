// AISmokeShaqStudio/models/index.js

export const MODELS = {
  image: [
    // ---------------------------------------------------------
    // FLUX (Black-Forest-Labs)
    // ---------------------------------------------------------
    {
      id: "black-forest-labs/flux-2-pro",
      name: "FLUX-2 Pro (Black-Forest-Labs)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      credits: 4,
    },
    {
      id: "black-forest-labs/flux-2-flex",
      name: "FLUX-2 Flex (Black-Forest-Labs)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      credits: 3,
    },

    // ---------------------------------------------------------
    // Seedream (Bytedance)
    // ---------------------------------------------------------
    {
      id: "bytedance/seedream-5-lite",
      name: "Seedream 5 Lite (Bytedance)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      credits: 3,
    },
    {
      id: "bytedance/seedream-4.5",
      name: "Seedream 4.5 (Bytedance)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      credits: 3,
    },
    {
      id: "bytedance/seedream-3",
      name: "Seedream 3 (Bytedance)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      credits: 2,
    },

    // ---------------------------------------------------------
    // Imagen (Google)
    // ---------------------------------------------------------
    {
      id: "google/imagen-4-ultra",
      name: "Imagen 4 Ultra (Google)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      credits: 4,
    },

    // ---------------------------------------------------------
    // WAN (WAN-Video)
    // ---------------------------------------------------------
    {
      id: "wan-video/wan-2.7-image-pro",
      name: "WAN 2.7 Image Pro (WAN-Video)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      credits: 3,
    },

    // ---------------------------------------------------------
    // Ideogram
    // ---------------------------------------------------------
    {
      id: "ideogram-ai/ideogram-v3-turbo",
      name: "Ideogram V3 Turbo (Ideogram)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      credits: 2,
    },
    {
      id: "ideogram-ai/ideogram-v2",
      name: "Ideogram V2 (Ideogram)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      credits: 2,
    },

    // ---------------------------------------------------------
    // MiniMax
    // ---------------------------------------------------------
    {
      id: "minimax/image-01",
      name: "MiniMax Image-01",
      provider: "replicate",
      nsfw: false,
      locked: false,
      credits: 2,
    },

    // ---------------------------------------------------------
    // ComfyUI
    // ---------------------------------------------------------
    {
      id: "comfyui/any-comfyui-workflow",
      name: "Any ComfyUI Workflow (ComfyUI)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      credits: 2,
    },

    // ---------------------------------------------------------
    // ControlNet (FermatResearch)
    // ---------------------------------------------------------
    {
      id: "fermatresearch/sdxl-controlnet-lora",
      name: "SDXL ControlNet LoRA (FermatResearch)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      credits: 2,
    },

    // ---------------------------------------------------------
    // SSD (Lucataco)
    // ---------------------------------------------------------
    {
      id: "lucataco/ssd-1b",
      name: "SSD-1B (Lucataco)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      credits: 2,
    },

    // ---------------------------------------------------------
    // NSFW (HuggingFace) — visible but locked
    // ---------------------------------------------------------
    {
      id: "imb101/I2V-WAN2.2-POVFaceSitting",
      name: "I2V WAN 2.2 POV Face Sitting (NSFW)",
      provider: "huggingface",
      nsfw: true,
      locked: true,
      credits: 4,
    },
    {
      id: "gooniebloans/igoonhard",
      name: "iGoonHard (NSFW)",
      provider: "huggingface",
      nsfw: true,
      locked: true,
      credits: 4,
    },
    {
      id: "Jonny001/NSFW_master",
      name: "NSFW Master (NSFW)",
      provider: "huggingface",
      nsfw: true,
      locked: true,
      credits: 4,
    },
  ],

  // =====================================================================
  // VIDEO MODELS
  // =====================================================================
  video: [
    // ---------------------------------------------------------
    // Runway
    // ---------------------------------------------------------
    {
      id: "runwayml/gen-4.5",
      name: "Runway Gen-4.5",
      provider: "replicate",
      nsfw: false,
      locked: false,
      credits: 5,
    },

    // ---------------------------------------------------------
    // VEO (Google)
    // ---------------------------------------------------------
    {
      id: "google/veo-3.1",
      name: "VEO 3.1 (Google)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      credits: 5,
    },
    {
      id: "google/veo-2",
      name: "VEO 2 (Google)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      credits: 4,
    },

    // ---------------------------------------------------------
    // Kling (Kwaivgi)
    // ---------------------------------------------------------
    {
      id: "kwaivgi/kling-v3-video",
      name: "Kling V3 Video (Kwaivgi)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      credits: 4,
    },
    {
      id: "kwaivgi/kling-v3-omni-video",
      name: "Kling V3 Omni Video (Kwaivgi)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      credits: 4,
    },
    {
      id: "kwaivgi/kling-v2.5-turbo-pro",
      name: "Kling V2.5 Turbo Pro (Kwaivgi)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      credits: 4,
    },
    {
      id: "kwaivgi/kling-v2.0",
      name: "Kling V2.0 (Kwaivgi)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      credits: 3,
    },

    // ---------------------------------------------------------
    // Seedance (Bytedance)
    // ---------------------------------------------------------
    {
      id: "bytedance/seedance-2.0",
      name: "Seedance 2.0 (Bytedance)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      credits: 4,
    },
    {
      id: "bytedance/seedance-1.5-pro",
      name: "Seedance 1.5 Pro (Bytedance)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      credits: 4,
    },
    {
      id: "bytedance/seedance-1-pro",
      name: "Seedance 1 Pro (Bytedance)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      credits: 3,
    },
    {
      id: "bytedance/seedance-1-lite",
      name: "Seedance 1 Lite (Bytedance)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      credits: 3,
    },

    // ---------------------------------------------------------
    // WAN (WAN-Video)
    // ---------------------------------------------------------
    {
      id: "wan-video/wan-2.7-t2v",
      name: "WAN 2.7 T2V (WAN-Video)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      credits: 4,
    },
    {
      id: "wan-video/wan-2.5-t2v-fast",
      name: "WAN 2.5 T2V Fast (WAN-Video)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      credits: 3,
    },
    {
      id: "wan-video/wan-2.2-t2v-fast",
      name: "WAN 2.2 T2V Fast (WAN-Video)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      credits: 3,
    },
    {
      id: "wan-video/wan-2.5-i2v-fast",
      name: "WAN 2.5 I2V Fast (WAN-Video)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      credits: 3,
    },
    {
      id: "wan-video/wan-2.2-s2v",
      name: "WAN 2.2 S2V (WAN-Video)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      credits: 3,
    },

    // ---------------------------------------------------------
    // MiniMax
    // ---------------------------------------------------------
    {
      id: "minimax/hailuo-2.3",
      name: "Hailuo 2.3 (MiniMax)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      credits: 4,
    },
    {
      id: "minimax/video-01",
      name: "MiniMax Video-01",
      provider: "replicate",
      nsfw: false,
      locked: false,
      credits: 3,
    },

    // ---------------------------------------------------------
    // PrunaAI
    // ---------------------------------------------------------
    {
      id: "prunaai/p-video",
      name: "P-Video (PrunaAI)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      credits: 3,
    },
    {
      id: "prunaai/p-video-animate",
      name: "P-Video Animate (PrunaAI)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      credits: 3,
    },
    {
      id: "prunaai/p-video-avatar",
      name: "P-Video Avatar (PrunaAI)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      credits: 3,
    },

    // ---------------------------------------------------------
    // HappyHorse (Alibaba)
    // ---------------------------------------------------------
    {
      id: "alibaba/happyhorse-1.0",
      name: "HappyHorse 1.0 (Alibaba)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      credits: 3,
    },

    // ---------------------------------------------------------
    // Fabric (VEED)
    // ---------------------------------------------------------
    {
      id: "veed/fabric-1.0",
      name: "Fabric 1.0 (VEED)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      credits: 3,
    },

    // ---------------------------------------------------------
    // DreamActor (Bytedance)
    // ---------------------------------------------------------
    {
      id: "bytedance/dreamactor-m2.0",
      name: "DreamActor M2.0 (Bytedance)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      credits: 4,
    },

    // ---------------------------------------------------------
    // ToonCrafter (Fofr)
    // ---------------------------------------------------------
    {
      id: "fofr/tooncrafter",
      name: "ToonCrafter (Fofr)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      credits: 3,
    },

    // ---------------------------------------------------------
    // Grok (XAI)
    // ---------------------------------------------------------
    {
      id: "xai/grok-imagine-video",
      name: "Grok Imagine Video (XAI)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      credits: 4,
    },
  ],

  // =====================================================================
  // TTS MODELS
  // =====================================================================
  tts: [
    // ---------------------------------------------------------
    // ElevenLabs
    // ---------------------------------------------------------
    {
      id: "elevenlabs/v3",
      name: "ElevenLabs v3",
      provider: "replicate",
      nsfw: false,
      locked: false,
      credits: 2,
    },
    {
      id: "elevenlabs/turbo-v2.5",
      name: "ElevenLabs Turbo v2.5",
      provider: "replicate",
      nsfw: false,
      locked: false,
      credits: 2,
    },

    // ---------------------------------------------------------
    // Inworld
    // ---------------------------------------------------------
    {
      id: "inworld/realtime-tts-2",
      name: "Realtime TTS-2 (Inworld)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      credits: 2,
    },

    // ---------------------------------------------------------
    // MiniMax
    // ---------------------------------------------------------
    {
      id: "minimax/speech-2.8-hd",
      name: "Speech 2.8 HD (MiniMax)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      credits: 2,
    },
    {
      id: "minimax/speech-2.8-turbo",
      name: "Speech 2.8 Turbo (MiniMax)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      credits: 2,
    },

    // ---------------------------------------------------------
    // Google
    // ---------------------------------------------------------
    {
      id: "google/gemini-3.1-flash-tts",
      name: "Gemini 3.1 Flash TTS (Google)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      credits: 2,
    },

    // ---------------------------------------------------------
    // Resemble
    // ---------------------------------------------------------
    {
      id: "resemble-ai/chatterbox",
      name: "Chatterbox (Resemble)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      credits: 2,
    },

    // ---------------------------------------------------------
    // Tortoise
    // ---------------------------------------------------------
    {
      id: "afiaka87/tortoise-tts",
      name: "Tortoise TTS",
      provider: "replicate",
      nsfw: false,
      locked: false,
      credits: 2,
    },

    // ---------------------------------------------------------
    // HuggingFace TTS
    // ---------------------------------------------------------
    {
      id: "fermatresearch/spanish-f5-tts",
      name: "Spanish F5 TTS (FermatResearch)",
      provider: "huggingface",
      nsfw: false,
      locked: false,
      credits: 2,
    },
    {
      id: "x-lance/f5-tts",
      name: "F5 TTS (X-Lance)",
      provider: "huggingface",
      nsfw: false,
      locked: false,
      credits: 2,
    },
    {
      id: "chenxwh/openvoice",
      name: "OpenVoice (Chenxwh)",
      provider: "huggingface",
      nsfw: false,
      locked: false,
      credits: 2,
    },
  ],

  // =====================================================================
  // LIPSYNC / TALKING AVATAR MODELS
  // =====================================================================
  lipsync: [
    // ---------------------------------------------------------
    // PixVerse
    // ---------------------------------------------------------
    {
      id: "pixverse/lipsync",
      name: "PixVerse LipSync",
      provider: "replicate",
      nsfw: false,
      locked: false,
      credits: 3,
    },

    // ---------------------------------------------------------
    // Sync
    // ---------------------------------------------------------
    {
      id: "sync/lipsync-2-pro",
      name: "LipSync 2 Pro (Sync)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      credits: 3,
    },
    {
      id: "sync/react-1",
      name: "React-1 (Sync)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      credits: 3,
    },

    // ---------------------------------------------------------
    // HeyGen
    // ---------------------------------------------------------
    {
      id: "heygen/lipsync-speed",
      name: "LipSync Speed (HeyGen)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      credits: 3,
    },
    {
      id: "heygen/lipsync-precision",
      name: "LipSync Precision (HeyGen)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      credits: 3,
    },

    // ---------------------------------------------------------
    // Kling
    // ---------------------------------------------------------
    {
      id: "kwaivgi/kling-lip-sync",
      name: "Kling Lip Sync (Kwaivgi)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      credits: 3,
    },

    // ---------------------------------------------------------
    // Video Retalking
    // ---------------------------------------------------------
    {
      id: "chenxwh/video-retalking",
      name: "Video Retalking (Chenxwh)",
      provider: "replicate",
      nsfw: false,
      locked: false,
      credits: 3,
    },

    // ---------------------------------------------------------
    // WAN
    // ---------------------------------------------------------
    {
      id: "wan-video/wan-2.2-s2v",
      name: "WAN 2.2 S2V (WAN-Video)",
      provider: "replicate",
     nsfw: false,
      locked: false,
      credits: 3,
    },
  ],
};

// END OF FILE — ALL BRACKETS CLOSED
