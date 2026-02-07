export default async function handler(req, res) {
    res.setHeader('Content-Type', 'application/json');
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

    const TOKEN = process.env.REPLICATE_API_TOKEN;
    if (!TOKEN) return res.status(500).json({ error: 'No API token' });

    try {
        const { tool, prompt, image, audio } = req.body;

        let model, input;

        if (tool === 'image-to-image' || tool === 'face-swap') {
            model = 'black-forest-labs/flux-schnell';
            input = { prompt: prompt || 'high quality portrait photo' };
            if (image) input.image = image;
        } else if (tool === 'image-to-video') {
            model = 'stability-ai/stable-video-diffusion';
            input = { input_image: image };
        } else if (tool === 'lip-sync') {
            model = 'devxpy/cog-wav2lip';
            input = { face: image, audio: audio };
        } else {
            model = 'black-forest-labs/flux-schnell';
            input = { prompt: prompt || 'cinematic photo, high quality' };
        }

        const url = 'https://api.replicate.com/v1/models/' + model + '/predictions';

        const r = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + TOKEN,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ input })
        });
        const data = await r.json();

        if (!r.ok || !data.id) {
            return res.status(r.status).json({ error: data.detail || data.title || 'API call failed', raw: data });
        }

        // Poll for result
        for (let i = 0; i < 60; i++) {
            await new Promise(ok => setTimeout(ok, 3000));
            const poll = await fetch('https://api.replicate.com/v1/predictions/' + data.id, {
                headers: { 'Authorization': 'Bearer ' + TOKEN }
            });
            const p = await poll.json();

            if (p.status === 'succeeded') {
                return res.json({ success: true, output: p.output });
            }
            if (p.status === 'failed') {
                return res.json({ success: false, error: p.error || 'Generation failed' });
            }
        }

        return res.json({ success: false, error: 'Timeout waiting for result' });

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
