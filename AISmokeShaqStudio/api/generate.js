import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();
const REPLICATE = process.env.REPLICATE_API_TOKEN;

export default async function handler(req, res) {
    res.setHeader('Content-Type', 'application/json');
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

    try {
        const { email, tool, image, prompt, audio } = req.body;
        const isOwner = email === "faded206@yahoo.com";

        const credits = parseInt(await redis.get(`credits_${email}`)) || 0;
        if (!isOwner && credits < 1) return res.status(402).json({ error: 'No credits remaining' });

        let model, input;

        if (tool === 'img-to-img') {
            model = "stability-ai/sdxl";
            input = {
                image: image,
                prompt: prompt || "high quality cinematic photograph, masterpiece",
                prompt_strength: 0.75,
                num_outputs: 1
            };
        } else if (tool === 'img-to-video') {
            model = "stability-ai/stable-video-diffusion";
            input = { input_image: image };
        } else if (tool === 'lip-sync') {
            model = "lucataco/wav2lip";
            input = { face: image, audio: audio };
        } else {
            return res.status(400).json({ error: 'Unknown tool: ' + tool });
        }

        const response = await fetch(
            `https://api.replicate.com/v1/models/${model}/predictions`,
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${REPLICATE}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ input })
            }
        );

        const prediction = await response.json();

        if (!response.ok) {
            return res.status(response.status).json({
                error: prediction.detail || prediction.title || "Replicate rejected the request"
            });
        }

        if (!isOwner) await redis.set(`credits_${email}`, (credits - 1).toString());

        return res.status(200).json({
            id: prediction.id,
            status: prediction.status
        });

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
