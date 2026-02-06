import Replicate from "replicate";
import { kv } from "@vercel/kv";

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
    
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { email, tool, image, audio } = body;

    // 1. Check Credits
    const userKey = `credits_${email.toLowerCase()}`;
    const credits = await kv.get(userKey) || 0;
    
    if (credits < 1) {
        return res.status(400).json({ error: "You need at least 1 credit to generate." });
    }

    // 2. Deduct 1 Credit
    await kv.set(userKey, credits - 1);

    // 3. Trigger Replicate (SadTalker for Lip Sync)
    const prediction = await replicate.predictions.create({
        version: "3aa3dab92595ca283c49fca34b12638841490246a48d8c9a334e320d36c53e02",
        input: {
            source_image: image,
            driven_audio: audio
        }
    });

    res.status(200).json({ id: prediction.id, remaining: credits - 1 });
}
