// /api/voice.js
import { Readable } from "stream";
import { checkAndDeductCredits } from "./creditCheck";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { text, email, provider = "coqui", voiceId } = req.body;

    if (!text || !email) {
      return res.status(400).json({ error: "Missing text or email" });
    }

    // 1. Determine cost for voice generation
    const cost = 2; // you can tweak this

    // 2. CHECK & DEDUCT CREDITS
    const creditResult = await checkAndDeductCredits(email, cost);

    if (!creditResult.ok) {
      return res.status(402).json({
        error: "Not enough credits",
        remaining: creditResult.remaining,
      });
    }

    // 3. Voice generation logic
    if (provider === "openai") {
      const response = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini-tts",
          voice: voiceId || "alloy",
          input: text,
        }),
      });

      if (!response.ok) {
        return res.status(500).json({ error: "OpenAI TTS failed" });
      }

      const audioBuffer = Buffer.from(await response.arrayBuffer());

      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Content-Length", audioBuffer.length);
      res.setHeader("X-Remaining-Credits", creditResult.remaining);

      const stream = Readable.from(audioBuffer);
      stream.pipe(res);
      return;
    }

    // Default: Coqui or other provider
    const coquiResponse = await fetch(process.env.COQUI_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.COQUI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        voice_id: voiceId,
      }),
    });

    if (!coquiResponse.ok) {
      return res.status(500).json({ error: "Coqui TTS failed" });
    }

    const coquiBuffer = Buffer.from(await coquiResponse.arrayBuffer());

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", coquiBuffer.length);
    res.setHeader("X-Remaining-Credits", creditResult.remaining);

    const stream = Readable.from(coquiBuffer);
    stream.pipe(res);
  } catch (error) {
    console.error("Voice error:", error);
    return res.status(500).json({ error: "Server error" });
  }
}
