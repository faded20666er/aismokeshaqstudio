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

        let model, input;

        if (tool === 'img-to-img') {
            if (image) {
                model = 'timothybrooks/instruct-pix2pix';
                input = {
                    image: image,
                    prompt: prompt || 'make it more cinematic',
                    num_outputs: 1,
                    guidance_scale: 7.5,
                    image_guidance_scale: prompt_strength || 1.5,
                    num_inference_steps: 20
                };
            } else {
                model = 'black-forest-labs/flux-schnell';
                input = {
                    prompt: prompt || 'high quality cinematic photo',
                    num_outputs: 1,
                    aspect_ratio: '1:1',
                    output_format: 'webp',
                    output_quality: 90
                };
            }
        } else if (tool === 'img-to-video') {
            model = 'stability-ai/stable-video-diffusion';
            input = {
                input_image: image,
                sizing_strategy: 'maintain_aspect_ratio',
                frames_per_second: 7,
                motion_bucket_id: 127
            };
        } else if (tool === 'lip-sync') {
            model = 'cjwbw/wav2lip';
            input = {
                face: image,
                audio: audio
            };
        } else {
            model = 'black-forest-labs/flux-schnell';
            input = {
                prompt: prompt || 'cinematic photo, high quality',
                num_outputs: 1,
                aspect_ratio: '1:1',
                output_format: 'webp',
                output_quality: 90
            };
        }

        // SAME ENDPOINT AS YOUR WORKING TEST - no version hash needed!
        const url = 'https://api.replicate.com/v1/models/' + model + '/predictions';

        const createResponse = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + TOKEN,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ input: input })
        });

        const prediction = await createResponse.json();

        if (!createResponse.ok || !prediction.id) {
            return res.json({
                error: prediction.detail || prediction.title || JSON.stringify(prediction)
            });
        }

        // Poll for result - same pattern as working test
        for (let i = 0; i < 30; i++) {
            await new Promise(function(ok) { setTimeout(ok, 2000); });

            const poll = await fetch(
                'https://api.replicate.com/v1/predictions/' + prediction.id,
                { headers: { 'Authorization': 'Bearer ' + TOKEN } }
            );
            const result = await poll.json();

            if (result.status === 'succeeded') {
                return res.json({ success: true, output: result.output });
            }
            if (result.status === 'failed') {
                return res.json({ error: result.error || 'Generation failed' });
            }
        }

        return res.json({ error: 'Timed out waiting for result' });

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
