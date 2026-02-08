export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
    const TOKEN = process.env.REPLICATE_API_TOKEN;

    try {
        const { tool, prompt, image, audio, prompt_strength } = req.body;
        let url, body;

        // Force scale to be minimum 1.0 to avoid Replicate errors
        const scale = Math.max(1, parseFloat(prompt_strength) || 1.5);

        if (tool === 'img-to-img' && image) {
            url = 'https://api.replicate.com/v1/predictions';
            body = {
                version: '30c1d0b916a6f8efce20493f5d61ee27491ab2a60437c13c588468b9810ec23f',
                input: { image, prompt: prompt || 'cinematic', image_guidance_scale: scale }
            };
        } else if (tool === 'img-to-video') {
            url = 'https://api.replicate.com/v1/models/wan-video/wan-2.5-i2v-fast/predictions';
            body = { input: { image, prompt: prompt || 'cinematic motion' } };
        } else if (tool === 'lip-sync') {
            url = 'https://api.replicate.com/v1/predictions';
            body = {
                version: '8d65e3f4f4298520e079198b493c25adfc43c058ffec924f2aefc8010ed25eef',
                input: { face: image, audio: audio }
            };
        } else {
            // Text to Image (FLUX)
            url = 'https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions';
            body = { input: { prompt: prompt || 'cinematic photo', aspect_ratio: '1:1' } };
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const prediction = await response.json();
        // Return the prediction ID immediately to the browser
        return res.status(200).json(prediction);

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
