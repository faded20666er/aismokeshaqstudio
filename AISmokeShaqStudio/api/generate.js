export default async function handler(req, res) {
    res.setHeader('Content-Type', 'application/json');

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'POST only' });
    }

    const TOKEN = process.env.REPLICATE_API_TOKEN;
    if (!TOKEN) {
        return res.status(500).json({ error: 'API token not configured' });
    }

    try {
        const { tool, prompt, image, audio, prompt_strength } = req.body;

        let url, body;

        if (tool === 'img-to-img' && image) {
            // instruct-pix2pix is an OLD model - must use /versions/ endpoint
            url = 'https://api.replicate.com/v1/predictions';
            body = JSON.stringify({
                version: '30c1d0b916a6f8efce20493f5d61ee27491ab2a60437c13c588468b9810ec23f',
                input: {
                    image: image,
                    prompt: prompt || 'make it more cinematic',
                    num_outputs: 1,
                    guidance_scale: 7.5,
                    image_guidance_scale: parseFloat(prompt_strength) || 1.5
                }
            });

        } else if (tool === 'img-to-img') {
            // No image = text-to-image with flux (PROVEN WORKING)
            url = 'https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions';
            body = JSON.stringify({
                input: {
                    prompt: prompt || 'high quality cinematic photo',
                    num_outputs: 1,
                    aspect_ratio: '1:1',
                    output_format: 'webp',
                    output_quality: 90
                }
            });

        } else if (tool === 'img-to-video') {
            // wan-video is a NEW model - uses /models/ endpoint
            url = 'https://api.replicate.com/v1/models/wan-video/wan-2.5-i2v-fast/predictions';
            body = JSON.stringify({
                input: {
                    image: image,
                    prompt: prompt || 'cinematic motion, smooth camera movement'
                }
            });

        } else if (tool === 'lip-sync') {
            // devxpy/cog-wav2lip - OLD model, needs /versions/ endpoint
            // NOTE: face and audio must be URLs or base64 data URIs
            url = 'https://api.replicate.com/v1/predictions';
            body = JSON.stringify({
                version: '8d65e3f4f4298520e079198b493c25adfc43c058ffec924f2aefc8010ed25eef',
                input: {
                    face: image,
                    audio: audio
                }
            });

        } else {
            // Fallback: flux text-to-image (PROVEN WORKING)
            url = 'https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions';
            body = JSON.stringify({
                input: {
                    prompt: prompt || 'cinematic photo, high quality',
                    num_outputs: 1,
                    aspect_ratio: '1:1',
                    output_format: 'webp',
                    output_quality: 90
                }
            });
        }

        const createResponse = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + TOKEN,
                'Content-Type': 'application/json'
            },
            body: body
        });

        const prediction = await createResponse.json();

        if (!createResponse.ok || !prediction.id) {
            console.error('Replicate error:', JSON.stringify(prediction));
            return res.json({
                error: prediction.detail || prediction.title || 'Replicate rejected the request'
            });
        }

        // Poll for result
        for (let i = 0; i < 60; i++) {
            await new Promise(function(ok) { setTimeout(ok, 2000); });

            const poll = await fetch(
                'https://api.replicate.com/v1/predictions/' + prediction.id,
                { headers: { 'Authorization': 'Bearer ' + TOKEN } }
            );
            const result = await poll.json();

            if (result.status === 'succeeded') {
                return res.json({ success: true, output: result.output });
            }
            if (result.status === 'failed' || result.status === 'canceled') {
                return res.json({ error: result.error || 'Generation failed' });
            }
        }

        return res.json({ error: 'Timed out' });

    } catch (err) {
        console.error('Error:', err);
        return res.status(500).json({ error: err.message });
    }
}
