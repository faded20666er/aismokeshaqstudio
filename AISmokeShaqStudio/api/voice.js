import { Readable } from "stream";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb"
    }
  }
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { script, voiceId } = req.body;

    if (!script || !voiceId) {
      return res.status(400).json({ error: "Missing script or voiceId" });
    }

    console.log("VOICE REQUEST:", voiceId);

    // ====== COQUI TTS (FREE) ======
    if (voiceId.startsWith("coqui_")) {
      const coquiUrl = "https://api.coqui.ai/v1/generate"; // Example endpoint

      const response = await fetch(coquiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          text: script,
          voice: voiceId.replace("coqui_", "")
        })
      });

      const audioBuffer = Buffer.from(await response.arrayBuffer());
      const base64Audio = audioBuffer.toString("base64");

      return res.status(200).json({
        provider: "coqui",
        voiceId,
        audioBase64: base64Audio,
        audioUrl: `data:audio/wav;base64,${base64Audio}`
      });
    }

    // ====== OPENAI TTS (FREE TIER) ======
    if (voiceId.startsWith("openai_")) {
      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
      }

      const openaiVoice = voiceId.replace("openai_", "");

      const response = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4o-mini-tts",
          voice: openaiVoice,
          input: script
        })
      });

      const audioBuffer = Buffer.from(await response.arrayBuffer());
      const base64Audio = audioBuffer.toString("base64");

      return res.status(200).json({
        provider: "openai",
        voiceId,
        audioBase64: base64Audio,
        audioUrl: `data:audio/mp3;base64,${base64Audio}`
      });
    }

    // ====== UNKNOWN VOICE ======
    return res.status(400).json({ error: "Unknown voiceId" });

  } catch (err) {
    console.error("VOICE API ERROR:", err);
    return res.status(500).json({ error: "Voice generation failed" });
  }
}
