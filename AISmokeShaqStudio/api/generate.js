import { Redis } from '@upstash/redis';

export default async function handler(req, res) {
    res.setHeader('Content-Type', 'application/json');
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

    let redis;
    try {
        redis = new Redis({
            url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
            token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
        });
    } catch (e) {
        return res.status(500).json({ error: 'Redis init failed: ' + e.message });
    }

    const TOKEN = process.env.REPLICATE_API_TOKEN;
    if (!TOKEN) return res.status(500).json({ error: 'REPLICATE_API_TOKEN not configured' });

    try {
        const { email, tool, image, prompt, audio, prompt_strength } = req.body;
        const isOwner = email === "faded206@yahoo.com";

        const credits = parseInt(await redis.get(`credits_${email}`)) || 0;
        if (!isOwner && credits < 1) return res.status(402).json({ error: 'No credits' });

        let body;

        if (tool === 'img-to-img') {
            body = {
                model: "stability-ai/sdxl",
                input: {
                    image: image,
                    prompt: prompt || "high quality cinematic photograph, masterpiece",
                    prompt_strength: parseFloat(prompt_strength) || 0.75,
                    num_outputs: 1
                }
            };
        } else if (tool === 'img-to-video') {
            body = {
                model: "stability-ai/stable-video-diffusion",
                input: { input_image: image }
            };
        } else if (tool === 'lip-sync') {
            body = {
                model: "lucataco/wav2lip",
                input: { face: image, audio: audio }
            };
        } else {
            return res.status(400).json({ error: 'Unknown tool: ' + tool });
        }

        let response = await fetch('https://api.replicate.com/v1/predictions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        let prediction = await response.json();

        if (!response.ok && (response.status === 404 || response.status === 422)) {
            const modelName = body.model;
            const fallbackRes = await fetch(`https://api.replicate.com/v1/models/${modelName}/predictions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ input: body.input })
            });
            prediction = await fallbackRes.json();
            response = fallbackRes;
        }

        if (!response.ok) {
            return res.status(response.status).json({
                error: `Replicate ${response.status}: ${prediction.detail || prediction.title || JSON.stringify(prediction)}`
            });
        }

        if (!isOwner) await redis.set(`credits_${email}`, (credits - 1).toString());

        return res.status(200).json({
            id: prediction.id,
            status: prediction.status
        });

    } catch (err) {
        return res.status(500).json({ error: 'Server error: ' + err.message });
    }
}