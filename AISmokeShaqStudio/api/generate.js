import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });

    try {
        const { modelId, prompt, image, email } = req.body;
        const userEmail = (email || "").toLowerCase().trim();
        const isOwner = userEmail === 'faded206@yahoo.com' || userEmail === 'faded20666@gmail.com';

        // 1. Credit Check
        if (!isOwner) {
            const credits = await redis.get(`credits_${userEmail}`) || 0;
            const cost = modelId.includes('video') || modelId.includes('human') ? 15 : 5;
            if (Number(credits) < cost) return res.status(402).json({ error: "Insufficient credits." });
            await redis.set(`credits_${userEmail}`, Number(credits) - cost);
        }

        // 2. Model Mapping
        const modelMap = {
            'flux-pro': 'black-forest-labs/flux-1.1-pro',
            'kling-video': 'kwaivgi/kling-v2.5-turbo-pro',
            'omni-human': 'bytedance/omni-human-1'
        };

        // 3. Call Replicate
        const response = await fetch(`https://api.replicate.com/v1/models/${modelMap[modelId]}/predictions`, {
            method: "POST",
            headers: {
                "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ 
                input: { 
                    prompt: prompt, 
                    image: image,
                    image_path: image
                } 
            }),
        });

        const result = await response.json();
        
        if (!response.ok) {
            // If it fails, we give the user their credits back automatically
            if (!isOwner) {
                const credits = await redis.get(`credits_${userEmail}`) || 0;
                await redis.set(`credits_${userEmail}`, Number(credits) + 15);
            }
            throw new Error(result.detail || "Replicate Throttled the request.");
        }

        return res.status(200).json({ id: result.id });

    } catch (err) {
        console.error("Generate Error:", err.message);
        return res.status(500).json({ error: err.message });
    }
}
