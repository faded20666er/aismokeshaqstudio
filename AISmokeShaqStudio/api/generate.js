// /api/generate.js
import Replicate from "replicate";
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
    const { prompt, email, model } = req.body;

    if (!prompt || !email) {
      return res.status(400).json({ error: "Missing prompt or email" });
    }

    // 1. Determine cost based on model
    const cost = model === "xl" ? 5 : 1;

    // 2. CHECK & DEDUCT CREDITS (CRITICAL POSITION)
    const creditResult = await checkAndDeductCredits(email, cost);

    if (!creditResult.ok) {
      return res.status(402).json({
        error: "Not enough credits",
        remaining: creditResult.remaining,
      });
    }

    // 3. Continue with Replicate generation
    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    const output = await replicate.run(model, {
      input: { prompt },
    });

    return res.status(200).json({
      output,
      remainingCredits: creditResult.remaining,
    });

  } catch (error) {
    console.error("Generation error:", error);
    return res.status(500).json({ error: "Server error" });
  }
}
