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

        // 1. Check for the Owner Bypass (Updated to match your screenshot email)
        const isOwner = userEmail === 'faded206@yahoo.com' || userEmail === 'faded20666@gmail.com';

        if (!isOwner) {
            const costMap = { 'flux-pro': 5, 'kling-video': 15, 'omni-human': 20 };
            const cost = costMap[modelId] || 5;
            const credits = await redis.get(`credits_${userEmail}`) || 0;
            if (Number(credits) < cost) return res.status(402).json({ error: "Insufficient credits." });
            await redis.set(`credits_${userEmail}`, Number(credits) - cost);
        }

        // 2. The Direct API Call (No library, no /pipeline error possible)
        const modelMap = {
            'flux-pro': 'black-forest-labs/flux-1.1-pro',
            'kling-video': 'kwaivgi/kling-v2.5-turbo-pro',
            'omni-human': 'bytedance/omni-human-1'
        };

        const targetModel = modelMap[modelId] || 'black-forest-labs/flux-1.1-pro';
        const apiUrl = `https://api.replicate.com/v1/models/${targetModel}/predictions`;

        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ 
                input: { 
                    prompt: prompt, 
                    image: image,
                    image_path: image, // Support for different model naming
                    start_image: image
                } 
            }),
        });

        const result = await response.json();
        if (!response.ok) throw new Error(`v4 Engine Error: ${result.detail || "Check Replicate Balance"}`);

        return res.status(200).json({ id: result.id });

    } catch (err) {
        console.error("v4 Failure:", err.message);
        return res.status(500).json({ error: "v4 Error: " + err.message });
    }
}
