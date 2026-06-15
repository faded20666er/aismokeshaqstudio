// /api/lipsync.js
import { checkAndDeductCredits } from "./creditCheck";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "20mb",
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      email,
      timeline,
      referenceVideoUrl,
      characterAudioUrl,
      model,
    } = req.body;

    if (!email || !timeline || !referenceVideoUrl || !characterAudioUrl) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // 1. Determine cost for lipsync
    const cost = model === "pro" ? 5 : 3;

    // 2. CHECK & DEDUCT CREDITS
    const creditResult = await checkAndDeductCredits(email, cost);

    if (!creditResult.ok) {
      return res.status(402).json({
        error: "Not enough credits",
        remaining: creditResult.remaining,
      });
    }

    // 3. Call your lipsync backend / Replicate / custom service
    const response = await fetch(process.env.LIPSYNC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.LIPSYNC_API_KEY}`,
      },
      body: JSON.stringify({
        timeline,
        referenceVideoUrl,
        characterAudioUrl,
        model,
      }),
    });

    if (!response.ok) {
      return res.status(500).json({ error: "Lipsync service failed" });
    }

    const result = await response.json();

    return res.status(200).json({
      result,
      remainingCredits: creditResult.remaining,
    });
  } catch (error) {
    console.error("Lipsync error:", error);
    return res.status(500).json({ error: "Server error" });
  }
}
