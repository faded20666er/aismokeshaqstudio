module.exports = {
  image: {
    stable_diffusion: {
      id: "stability-ai/stable-diffusion-3",
      provider: "replicate",
      creditCost: 1,
      version: "your-version-here"
    },
    flux: {
      id: "black-forest-labs/flux-1.1-pro",
      provider: "replicate",
      creditCost: 2,
      version: "your-version-here"
    },
    realistic: {
      id: "stability-ai/sdxl",
      provider: "replicate",
      creditCost: 1,
      version: "your-version-here"
    }
  },

  audio: {
    tts: {
      id: "meta/tts",
      provider: "huggingface",
      creditCost: 1
    },
    voice_clone: {
      id: "your-hf-voice-model",
      provider: "huggingface",
      creditCost: 2
    }
  },

  video: {
    lipsync: {
      id: "your-lipsync-model",
      provider: "replicate",
      creditCost: 3,
      version: "your-version-here"
    }
  }
};
