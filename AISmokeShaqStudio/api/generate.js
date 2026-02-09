import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
    // Only allow POST
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { modelId, prompt, image, audio, email } = req.body;

        if (!email) {
            return res.status(400).json({ error: "Missing Email. Please Sign In." });
        }

        // 1. COST CALCULATION
        const costMap = {
            'flux-pro': 5,
            'kling-video': 15,
            'omni-human': 20,
            'sync-pro': 20
        };
        const cost = costMap[modelId] || 5;

        // 2. CREDIT CHECK (Bypass for owner)
        if (email !== 'faded206@yahoo.com') {
            const userCredits = await redis.get(`credits_${email.toLowerCase().trim()}`) || 0;
            if (Number(userCredits) < cost) {
                return res.status(402).json({ error: `Need ${cost} credits. You have ${userCredits}.` });
            }
            await redis.set(`credits_${email.toLowerCase().trim()}`, Number(userCredits) - cost);
        }

        // 3. REPLICATE PREPARATION
        let modelVersion = "";
        let input = { prompt: prompt };

        if (modelId === 'flux-pro') {
            modelVersion = "black-forest-labs/flux-1.1-pro";
            input = { prompt: prompt, aspect_ratio: "1:1" };
        } else if (modelId === 'kling-video') {
            modelVersion = "kwaivgi/kling-v2.5-turbo-pro";
            input = { prompt: prompt, start_image: image, duration: 5 };
        } else if (modelId === 'omni-human') {
            modelVersion = "bytedance/omni-human-1.5";
            input = { image: image, audio: audio, prompt: prompt };
        } else {
            modelVersion = "black-forest-labs/flux-schnell";
            input = { prompt: prompt };
        }

        // 4. CALL REPLICATE
        const response = await fetch(`https://api.replicate.com/v1/models/${modelVersion}/predictions`, {
            method: "POST",
            headers: {
                "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ input: input }),
        });

        const prediction = await response.json();

        if (!response.ok) {
            console.error("Replicate API Error:", prediction);
            return res.status(response.status).json({ error: prediction.detail || "AI Engine Error" });
        }

        return res.status(200).json({ id: prediction.id });

    } catch (error) {
        console.error("CRITICAL SERVER ERROR:", error);
        return res.status(500).json({ error: error.message });
    }
}

