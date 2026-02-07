import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    
    const { email, tool, image, second_image, audio, prompt } = req.body;
    
    try {
        // 1. Get current credits, default to 0 if null
        const currentCredits = await redis.get(`credits_${email}`);
        const creditCount = parseInt(currentCredits) || 0;

        if (creditCount < 1) {
            return res.status(402).json({ error: 'Insufficient credits. Please refill.' });
        }

        // 2. Placeholder for Replicate AI Logic
        // This is where the magic happens. For now, we return a success message.
        const mockOutput = "https://replicate.delivery/pbxt/example.png";

        // 3. Deduct 1 credit safely
        const newTotal = creditCount - 1;
        await redis.set(`credits_${email}`, newTotal.toString());

        return res.status(200).json({ 
            output: mockOutput,
            remaining: newTotal
        });

    } catch (error) {
        console.error("Redis Error:", error);
        return res.status(500).json({ error: "Database communication error." });
    }
}
