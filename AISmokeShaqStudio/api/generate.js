export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
    const TOKEN = process.env.REPLICATE_API_TOKEN;

    try {
        const { tool, prompt, image, audio, prompt_strength, modelId } = req.body;
        let url = 'https://api.replicate.com/v1/predictions';
        let body;

        const scale = Math.max(1, parseFloat(prompt_strength) || 1.5);

        // MODEL MAPPING
        if (tool === 'img-to-video') {
            url = 'https://api.replicate.com/v1/models/wan-video/wan-2.5-i2v-fast/predictions';
            body = { input: { image, prompt: prompt || 'cinematic motion' } };
        } 
        else if (tool === 'lip-sync') {
            body = {
                version: '8d65e3f4f4298520e079198b493c25adfc43c058ffec924f2aefc8010ed25eef',
                input: { face: image, audio: audio }
            };
        }
        else {
            // IMAGE GENERATION (Text or Img2Img)
            switch(modelId) {
                case 'flux-pro': // Top Quality
                    url = 'https://api.replicate.com/v1/models/black-forest-labs/flux-1.1-pro/predictions';
                    body = { input: { prompt, aspect_ratio: "1:1" } };
                    break;
                case 'realistic': // Photography style
                    body = { 
                        version: "ac68270a3014fb05c7f19672661876805d7621434190c64c57503463a5658e4b",
                        input: { prompt: "hyper-realistic photography, " + prompt, image: image || null } 
                    };
                    break;
                case 'img2img-pro': // High-end image transformation
                    body = {
                        version: "30c1d0b916a6f8efce20493f5d61ee27491ab2a60437c13c588468b9810ec23f",
                        input: { image, prompt, image_guidance_scale: scale }
                    };
                    break;
                default: // flux-schnell (Standard/Fast)
                    url = 'https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions';
                    body = { input: { prompt, image: image || null } };
            }
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const prediction = await response.json();
        return res.status(200).json(prediction);

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
