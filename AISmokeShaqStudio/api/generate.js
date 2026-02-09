import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { modelId, prompt, image, audio, email } = req.body;

    // 1. THE COST MAP (The Cash Register)
    const costMap = {
        'flux-pro': 5,
        'flux-schnell': 5,
        'kling-video': 15,
        'luma-ray': 15,
        'omni-human': 20,
        'sync-pro': 20,
        'cog-wav2lip': 20
    };

    const cost = costMap[modelId] || 5;

    // 2. CREDIT CHECK (Skip check for your specific email)
    if (email !== 'faded206@yahoo.com') {
        const userCredits = await redis.get(`credits_${email}`) || 0;
        if (userCredits < cost) {
            return res.status(402).json({ error: `Insufficient Credits. This requires ${cost} credits.` });
        }
        // Deduct credits
        await redis.set(`credits_${email}`, userCredits - cost);
    }

    // 3. MODEL MAPPING
    let modelVersion = "";
    let input = { prompt: prompt };

    switch(modelId) {
        case 'flux-pro':
            modelVersion = "black-forest-labs/flux-1.1-pro";
            input = { prompt: prompt, aspect_ratio: "1:1", output_format: "jpg" };
            break;
        
        case 'kling-video':
            modelVersion = "kwaivgi/kling-v2.5-turbo-pro";
            input = { 
                prompt: prompt, 
                start_image: image || null,
                duration: 5,
                cfg_scale: 0.8
            };
            break;

        case 'omni-human':
            modelVersion = "bytedance/omni-human-1.5";
            input = { 
                image: image,
                audio: audio || "https://replicate.delivery/pbxt/JyS0Q9G.../test.mp3",
                prompt: prompt
            };
            break;

        case 'sync-pro':
            modelVersion = "sync/lipsync-2-pro";
            input = { 
                video: image, 
                audio: audio || "https://replicate.delivery/pbxt/JyS0Q9G.../test.mp3"
            };
            break;

        default:
            modelVersion = "black-forest-labs/flux-schnell";
            input = { prompt: prompt };
    }

    // 4. EXECUTE REPLICATE CALL
    try {
        const response = await fetch(`https://api.replicate.com/v1/models/${modelVersion}/predictions`, {
            method: "POST",
            headers: {
                "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}`,
                "Content-Type": "application/json",
                "Prefer": "wait=false" // Don't make Vercel timeout
            },
            body: JSON.stringify({ input: input }),
        });

        const prediction = await response.json();
        
        // Return the prediction ID so the frontend can poll for the result
        res.status(200).json({ id: prediction.id });
    } catch (error) {
        console.error("Replicate Error:", error);
        res.status(500).json({ error: error.message });
    }
}

