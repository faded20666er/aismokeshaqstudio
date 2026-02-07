import Replicate from "replicate";
import { Redis } from '@upstash/redis';

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
const redis = Redis.fromEnv();

export default async function handler(req, res) {
    // Ensure we always return JSON, never plain text
    res.setHeader('Content-Type', 'application/json');

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    const { email, tool, image, prompt, model_id, audio } = req.body;
    const isOwner = email === "faded206@yahoo.com";

    try {
        const currentCredits = await redis.get(`credits_${email}`);
        let creditCount = parseInt(currentCredits) || 0;
        if (!isOwner && creditCount < 1) {
            return res.status(402).json({ error: 'Please refill credits.' });
        }

        let output;
        
        if (tool === 'img-to-img') {
            // Image to Image using SDXL
            output = await replicate.run(model_id || "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1d715dfb1d335ff2253988859e517f6b47a0", {
                input: { image: image, prompt: prompt, prompt_strength: 0.8, guidance_scale: 7.5 }
            });
        } 
        else if (tool === 'img-to-video') {
            output = await replicate.run(model_id || "stability-ai/stable-video-diffusion:ac7327c20fcb0cb7759481f1e957bf2cc56710f5afc8d28291ade20002939309", {
                input: { input_image: image, video_length: "14_frames_with_svd_xt" }
            });
        } 
        else if (tool === 'lip-sync') {
            output = await replicate.run("lucataco/wav2lip:8d65e3f5bc2f0c1284587768407481ec69d65a83ec3fdf142cd88d7274dbdf7b", {
                input: { face: image, audio: audio }
            });
        }

        if (!isOwner) await redis.set(`credits_${email}`, (creditCount - 1).toString());
        return res.status(200).json({ output });

    } catch (error) {
        console.error("Replicate Error:", error.message);
        return res.status(500).json({ error: "AI Engine Busy or Failed: " + error.message });
    }
}
