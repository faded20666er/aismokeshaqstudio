import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { modelId, prompt, image, email } = req.body;
        if (!email) return res.status(400).json({ error: "Sign in required." });

        // 1. Credit Check Logic
        const costMap = { 'flux-pro': 5, 'kling-video': 15, 'omni-human': 20 };
        const cost = costMap[modelId] || 5;

        if (email !== 'faded206@yahoo.com') {
            const userCredits = await redis.get(`credits_${email.toLowerCase().trim()}`) || 0;
            if (Number(userCredits) < cost) return res.status(402).json({ error: "Insufficient credits." });
            await redis.set(`credits_${email.toLowerCase().trim()}`, Number(userCredits) - cost);
        }

        // 2. Map modelId to actual Replicate Version IDs
        let version = "";
        let input = { prompt: prompt };

        if (modelId === 'flux-pro') {
            // Flux 1.1 Pro
            version = "black-forest-labs/flux-1.1-pro"; 
        } else if (modelId === 'kling-video') {
            // Kling V2.5
            version = "kwaivgi/kling-v2.5-turbo-pro";
            input = { prompt: prompt, start_image: image };
        } else if (modelId === 'omni-human') {
            // Omni-Human Lip Sync
            version = "bytedance/omni-human-1";
            input = { image_path: image, audio_path: prompt }; // Note: Lip sync needs an audio URL in the prompt field usually
        }

        // 3. Absolute URL fetch to Replicate
        const replicateRes = await fetch(`https://api.replicate.com/v1/models/${version}/predictions`, {
            method: "POST",
            headers: {
                "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ input: input }),
        });

        const data = await replicateRes.json();
        
        if (!replicateRes.ok) {
            console.error("Replicate Error:", data);
            return res.status(500).json({ error: data.detail || "AI Engine Error" });
        }

        return res.status(200).json({ id: data.id });

    } catch (err) {
        console.error("Server Error:", err);
        return res.status(500).json({ error: err.message });
    }
}
