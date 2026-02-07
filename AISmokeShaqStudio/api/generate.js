import Replicate from "replicate";
import { Redis } from '@upstash/redis';

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
const redis = Redis.fromEnv();

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    
    const { email, tool, image, second_image, audio } = req.body;
    const isOwner = email === "faded206@yahoo.com";

    try {
        const currentCredits = await redis.get(`credits_${email}`);
        let creditCount = parseInt(currentCredits) || 0;
        
        // Owner always has access
        if (!isOwner && creditCount < 1) return res.status(402).json({ error: 'Insufficent Credits' });

        let output;
        
        // PRO MODEL MAPPING
        if (tool === 'face-swap') {
            output = await replicate.run("lucataco/faceswap:9a423017773530c8f654086438692792613589c3684a0d8e859b40f56a1b244d", 
                { input: { target_image: image, swap_image: second_image } });
        } 
        else if (tool === 'img-to-video') {
            output = await replicate.run("stability-ai/stable-video-diffusion:ac7327c20fcb0cb7759481f1e957bf2cc56710f5afc8d28291ade20002939309", 
                { input: { input_image: image, video_length: "14_frames_with_svd_xt" } });
        } 
        else if (tool === 'lip-sync') {
            output = await replicate.run("lucataco/wav2lip:8d65e3f5bc2f0c1284587768407481ec69d65a83ec3fdf142cd88d7274dbdf7b", 
                { input: { face: image, audio: audio } });
        }

        if (!isOwner) await redis.set(`credits_${email}`, (creditCount - 1).toString());
        return res.status(200).json({ output });

    } catch (error) {
        return res.status(500).json({ error: "Replicate GPU Error: " + error.message });
    }
}
