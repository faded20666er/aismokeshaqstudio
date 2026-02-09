export default async function handler(req, res) {
    const { tool, modelId, prompt, image, audio, prompt_strength } = req.body;

    let modelVersion = "";
    let input = { prompt: prompt };

    // MAPPING TO YOUR NEW HIGH-END MODELS
    switch(modelId) {
        case 'flux-pro':
            modelVersion = "black-forest-labs/flux-1.1-pro";
            input = { prompt: prompt, aspect_ratio: "1:1", output_format: "jpg" };
            break;
        
        case 'kling-video': // KLING 2.5
            modelVersion = "kwaivgi/kling-v2.5-turbo-pro";
            input = { 
                prompt: prompt, 
                start_image: image || null,
                duration: 5,
                cfg_scale: 0.8
            };
            break;

        case 'omni-human': // OMNI HUMAN 1.5
            modelVersion = "bytedance/omni-human-1.5";
            input = { 
                image: image,
                audio: audio || "https://replicate.delivery/pbxt/JyS0Q9G.../test.mp3", // Fallback
                prompt: prompt
            };
            break;

        case 'sync-pro': // SYNC LABS 2.0
            modelVersion = "sync/lipsync-2-pro";
            input = { 
                video: image, // Uses image as a static video
                audio: audio || "https://replicate.delivery/pbxt/JyS0Q9G.../test.mp3"
            };
            break;

        default:
            modelVersion = "black-forest-labs/flux-schnell";
    }

    try {
        const response = await fetch(`https://api.replicate.com/v1/models/${modelVersion}/predictions`, {
            method: "POST",
            headers: {
                "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ input: input }),
        });

        const prediction = await response.json();
        res.status(200).json(prediction);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
