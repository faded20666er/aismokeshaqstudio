export const config = {
  api: {
    bodyParser: {
      sizeLimit: "50mb"
    }
  }
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      mode,
      prompt,
      script,
      engine,
      voiceId,
      image,
      video,
      audio
    } = req.body;

    console.log("=== GENERATE REQUEST ===");
    console.log("Mode:", mode);
    console.log("Engine:", engine);
    console.log("Voice:", voiceId);

    // ============================
    //  TEXT → IMAGE
    // ============================
    if (mode === "text2img") {
      console.log("Running text2img…");

      // Placeholder: plug in SDXL, Flux, etc.
      const mockImage =
        "https://images.unsplash.com/photo-1503023345310-bd7c1de61c7d";

      return res.status(200).json({
        output: mockImage,
        status: "succeeded"
      });
    }

    // ============================
    //  IMAGE → IMAGE
    // ============================
    if (mode === "img2img") {
      console.log("Running img2img…");

      if (!image) {
        return res.status(400).json({ error: "Image required" });
      }

      const mockImage =
        "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e";

      return res.status(200).json({
        output: mockImage,
        status: "succeeded"
      });
    }

    // ============================
    //  IMAGE → VIDEO
    // ============================
    if (mode === "img2video") {
      console.log("Running img2video…");

      if (!image) {
        return res.status(400).json({ error: "Image required" });
      }

      const mockVideo =
        "https://samplelib.com/lib/preview/mp4/sample-5s.mp4";

      return res.status(200).json({
        output: mockVideo,
        status: "succeeded"
      });
    }

    // ============================
    //  VIDEO → VIDEO
    // ============================
    if (mode === "video2video") {
      console.log("Running video2video…");

      if (!video) {
        return res.status(400).json({ error: "Video required" });
      }

      const mockVideo =
        "https://samplelib.com/lib/preview/mp4/sample-10s.mp4";

      return res.status(200).json({
        output: mockVideo,
        status: "succeeded"
      });
    }

    // ============================
    //  LIPSYNC (UPLOAD AUDIO)
    // ============================
    if (mode === "lipsync_upload_audio") {
      console.log("Running lipsync with uploaded audio…");

      if (!video) return res.status(400).json({ error: "Video required" });
      if (!audio) return res.status(400).json({ error: "Audio required" });

      const mockVideo =
        "https://samplelib.com/lib/preview/mp4/sample-15s.mp4";

      return res.status(200).json({
        output: mockVideo,
        status: "succeeded"
      });
    }

    // ============================
    //  LIPSYNC (TTS)
    // ============================
    if (mode === "lipsync_tts") {
      console.log("Running lipsync with TTS…");

      if (!video) return res.status(400).json({ error: "Video required" });
      if (!script) return res.status(400).json({ error: "Script required" });
      if (!voiceId) return res.status(400).json({ error: "Voice required" });

      // Call your TTS endpoint
      const ttsRes = await fetch(`${req.headers.origin}/api/voice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script, voiceId })
      });

      const ttsData = await ttsRes.json();

      const mockVideo =
        "https://samplelib.com/lib/preview/mp4/sample-20s.mp4";

      return res.status(200).json({
        output: mockVideo,
        ttsAudio: ttsData.audioUrl,
        status: "succeeded"
      });
    }

    // ============================
    //  TTS ONLY
    // ============================
    if (mode === "tts_only") {
      console.log("Running TTS only…");

      if (!script) return res.status(400).json({ error: "Script required" });
      if (!voiceId) return res.status(400).json({ error: "Voice required" });

      const ttsRes = await fetch(`${req.headers.origin}/api/voice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script, voiceId })
      });

      const ttsData = await ttsRes.json();

      return res.status(200).json({
        output: ttsData.audioUrl,
        status: "succeeded"
      });
    }

    // ============================
    //  UNKNOWN MODE
    // ============================
    return res.status(400).json({ error: "Unknown mode" });

  } catch (err) {
    console.error("GENERATE API ERROR:", err);
    return res.status(500).json({ error: "Generation failed" });
  }
}

