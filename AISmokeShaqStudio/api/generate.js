import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });

    const { modelId, prompt, image, email } = req.body;
    const userEmail = (email || "").toLowerCase().trim();
    const isOwner = userEmail === 'faded206@yahoo.com' || userEmail === 'faded20666@gmail.com';

    // Model Mapping
    const modelMap = {
        'flux-pro': 'black-forest-labs/flux-1.1-pro',
        'kling-video': 'kwaivgi/kling-v2.5-turbo-pro',
        'omni-human': 'bytedance/omni-human-1'
    };

    const targetModel = modelMap[modelId] || modelMap['flux-pro'];

    try {
        // 1. Credit Check
        if (!isOwner) {
            const credits = await redis.get(`credits_${userEmail}`) || 0;
            const cost = modelId.includes('video') || modelId.includes('human') ? 15 : 5;
            if (Number(credits) < cost) return res.status(402).json({ error: "Insufficient credits." });
            await redis.set(`credits_${userEmail}`, Number(credits) - cost);
        }

        // 2. The Execution Loop (Handles the 429 Throttle automatically)
        let attempts = 0;
        let success = false;
        let result = null;

        while (attempts < 3 && !success) {
            const response = await fetch(`https://api.replicate.com/v1/models/${targetModel}/predictions`, {
                method: "POST",
                headers: {
                    "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}`,
                    "Content-Type": "application/json",
                    "Prefer": "wait"
                },
                body: JSON.stringify({ 
                    input: { 
                        prompt: prompt, 
                        image: image,
                        image_path: image 
                    } 
                }),
            });

            result = await response.json();

            if (response.status === 429) {
                console.log("Throttled. Waiting 10 seconds...");
                await new Promise(r => setTimeout(r, 10000));
                attempts++;
            } else if (!response.ok) {
                throw new Error(result.detail || "Replicate API Error");
            } else {
                success = true;
            }
        }

        if (!success) throw new Error("Studio is currently at max capacity. Try again in 30 seconds.");

        return res.status(200).json({ id: result.id, output: result.output });

    } catch (err) {
        // Refund on failure
        if (!isOwner) {
            const current = await redis.get(`credits_${userEmail}`) || 0;
            await redis.set(`credits_${userEmail}`, Number(current) + 15);
        }
        return res.status(500).json({ error: err.message });
    }
}
