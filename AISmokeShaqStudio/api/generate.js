export default async function handler(req, res) {
    res.setHeader('Content-Type', 'application/json');

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed. POST only.' });
    }

    const TOKEN = process.env.REPLICATE_API_TOKEN;
    if (!TOKEN) {
        console.error('Missing REPLICATE_API_TOKEN environment variable');
        return res.status(500).json({ error: 'API token not configured' });
    }

    try {
        const { tool, prompt, image, audio, prompt_strength } = req.body;

        console.log('Received request:', { tool, hasImage: !!image, hasAudio: !!audio });

        let model, input;

        if (tool === 'img-to-img') {
            // Using FLUX for image-to-image generation
            model = 'black-forest-labs/flux-schnell';
            input = { 
                prompt: prompt || 'high quality cinematic photo',
                num_outputs: 1,
                aspect_ratio: "1:1",
                output_format: "webp",
                output_quality: 90
            };

            // Add image if provided
            if (image) {
                // For img2img, we need to use a different model that supports it
                model = 'timothybrooks/instruct-pix2pix';
                input = {
                    image: image,
                    prompt: prompt || 'make it more cinematic',
                    num_outputs: 1,
                    guidance_scale: 7.5,
                    image_guidance_scale: prompt_strength || 1.5,
                    num_inference_steps: 20
                };
            }
        } else if (tool === 'img-to-video') {
            model = 'stability-ai/stable-video-diffusion';
            input = { 
                input_image: image,
                sizing_strategy: "maintain_aspect_ratio",
                frames_per_second: 7,
                motion_bucket_id: 127,
                cond_aug: 0.02,
                decoding_t: 7,
                seed: 0
            };
        } else if (tool === 'lip-sync') {
            model = 'cjwbw/wav2lip';
            input = { 
                face: image, 
                audio: audio,
                face_det_batch_size: 16,
                wav2lip_batch_size: 128,
                resize_factor: 1,
                crop: [0, -1, 0, -1],
                box: [-1, -1, -1, -1],
                rotate: false,
                nosmooth: false
            };
        } else {
            // Default to text-to-image
            model = 'black-forest-labs/flux-schnell';
            input = { 
                prompt: prompt || 'cinematic photo, high quality',
                num_outputs: 1,
                aspect_ratio: "1:1",
                output_format: "webp",
                output_quality: 90
            };
        }

        console.log('Using model:', model);
        console.log('Input params:', { ...input, image: input.image ? '[base64]' : undefined, audio: input.audio ? '[base64]' : undefined });

        // Create prediction
        const createUrl = `https://api.replicate.com/v1/predictions`;

        const createResponse = await fetch(createUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'Content-Type': 'application/json',
                'Prefer': 'wait'
            },
            body: JSON.stringify({
                version: await getLatestVersion(model, TOKEN),
                input: input
            })
        });

        const prediction = await createResponse.json();

        if (!createResponse.ok) {
            console.error('Replicate API error:', prediction);
            return res.status(createResponse.status).json({ 
                error: prediction.detail || 'Failed to create prediction',
                details: prediction 
            });
        }

        console.log('Prediction created:', prediction.id);

        // Poll for completion
        let result = prediction;
        let attempts = 0;
        const maxAttempts = 60;

        while (result.status !== 'succeeded' && result.status !== 'failed' && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 2000));

            const pollResponse = await fetch(
                `https://api.replicate.com/v1/predictions/${prediction.id}`,
                {
                    headers: {
                        'Authorization': `Bearer ${TOKEN}`
                    }
                }
            );

            result = await pollResponse.json();
            attempts++;

            console.log(`Poll attempt ${attempts}:`, result.status);
        }

        if (result.status === 'succeeded') {
            console.log('Generation succeeded:', result.output);
            return res.json({ 
                success: true, 
                output: result.output 
            });
        } else if (result.status === 'failed') {
            console.error('Generation failed:', result.error);
            return res.json({ 
                success: false, 
                error: result.error || 'Generation failed' 
            });
        } else {
            return res.json({ 
                success: false, 
                error: 'Generation timed out' 
            });
        }

    } catch (err) {
        console.error('Handler error:', err);
        return res.status(500).json({ 
            error: err.message || 'Internal server error' 
        });
    }
}

// Helper function to get the latest model version
async function getLatestVersion(model, token) {
    try {
        const response = await fetch(
            `https://api.replicate.com/v1/models/${model}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        const data = await response.json();
        return data.latest_version?.id || data.versions?.[0]?.id;
    } catch (err) {
        console.error('Error getting model version:', err);
        // Return some known working versions as fallback
        const fallbacks = {
            'black-forest-labs/flux-schnell': '5599ed30703defd1d160a25a63321b4dec97101d98b4674bcc56e41f62f35637',
            'timothybrooks/instruct-pix2pix': '30c1d0b916a6f8efce20493f5d61ee27491ab2a60437c13c588468b9810ec23f',
            'stability-ai/stable-video-diffusion': '3f0457e4619daac51203dedb472816fd4af51f3149fa7a9e0b5ffcf1b8172438',
            'cjwbw/wav2lip': '8d65e3f4f4298520e079198b493c25adfc43c058ffec924f2aefc8010ed25eef'
        };
        return fallbacks[model];
    }
}
