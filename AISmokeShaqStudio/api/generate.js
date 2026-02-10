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

        // 1. CREDIT SYSTEM
        const costMap = { 'flux-pro': 5, 'kling-video': 15, 'omni-human': 20 };
        const cost = costMap[modelId] || 5;

        // Bypass for owner
        if (userEmail !== 'faded206@yahoo.com') {
            const currentCredits = await redis.get(`credits_${userEmail}`) || 0;
            if (Number(currentCredits) < cost) {
                return res.status(402).json({ error: `Insufficient Credits. You need ${cost} but have ${currentCredits}.` });
            }
            await redis.set(`credits_${userEmail}`, Number(currentCredits) - cost);
        }

        // 2. MODEL MAPPING (Using full Replicate paths)
        let apiUrl = "";
        let input = { prompt: prompt };

        if (modelId === 'flux-pro') {
            apiUrl = "https://api.replicate.com/v1/models/black-forest-labs/flux-1.1-pro/predictions";
            input = { prompt: prompt, aspect_ratio: "1:1" };
        } else if (modelId === 'kling-video') {
            apiUrl = "https://api.replicate.com/v1/models/kwaivgi/kling-v2.5-turbo-pro/predictions";
            input = { prompt: prompt, start_image: image };
        } else if (modelId === 'omni-human') {
            apiUrl = "https://api.replicate.com/v1/models/bytedance/omni-human-1/predictions";
            input = { image: image, audio: prompt }; // Using prompt as audio URL for now
        } else {
            // Default Fallback
            apiUrl = "https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions";
        }

        console.log("Calling Replicate at:", apiUrl); // This will show in Vercel Logs

        // 3. EXECUTE API CALL
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ input: input }),
        });

        const result = await response.json();

        if (!response.ok) {
            console.error("Replicate API Error:", result);
            return res.status(response.status).json({ error: result.detail || "AI Engine Error" });
        }

        return res.status(200).json({ id: result.id });

    } catch (err) {
        console.error("CRITICAL ERROR:", err);
        return res.status(500).json({ error: err.message });
    }
}
