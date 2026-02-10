import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { modelId, prompt, image, email } = req.body;
        const userEmail = (email || "").toLowerCase().trim();

        if (!userEmail) return res.status(400).json({ error: "Sign in required." });

        // 1. Credit Check (Bypass for you)
        if (userEmail !== 'faded206@yahoo.com') {
            const costMap = { 'flux-pro': 5, 'kling-video': 15, 'omni-human': 20 };
            const cost = costMap[modelId] || 5;
            const currentCredits = await redis.get(`credits_${userEmail}`) || 0;
            if (Number(currentCredits) < cost) return res.status(402).json({ error: "Insufficient credits." });
            await redis.set(`credits_${userEmail}`, Number(currentCredits) - cost);
        }

        // 2. ABSOLUTE URL MAPPING (Fixes the /pipeline error)
        let apiUrl = "https://api.replicate.com/v1/models/black-forest-labs/flux-1.1-pro/predictions";
        let input = { prompt: prompt };

        if (modelId === 'kling-video') {
            apiUrl = "https://api.replicate.com/v1/models/kwaivgi/kling-v2.5-turbo-pro/predictions";
            input = { prompt: prompt, start_image: image };
        } else if (modelId === 'omni-human') {
            apiUrl = "https://api.replicate.com/v1/models/bytedance/omni-human-1/predictions";
            input = { image_path: image, audio_path: prompt };
        }

        // 3. Direct Fetch (No SDK)
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ input: input }),
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.detail || "AI Engine Error");

        return res.status(200).json({ id: result.id });

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
