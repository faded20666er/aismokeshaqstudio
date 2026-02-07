import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    
    const { email, tool } = req.body;
    
    try {
        // POWER USER BYPASS for Jason
        const isOwner = email === "faded206@yahoo.com";
        
        // 1. Check Credits
        const currentCredits = await redis.get(`credits_${email}`);
        let creditCount = parseInt(currentCredits) || 0;

        // If not owner and no credits, block them
        if (!isOwner && creditCount < 1) {
            return res.status(402).json({ error: 'Insufficient credits. Please refill.' });
        }

        // 2. Placeholder AI Output (We will add the Replicate model keys next)
        const mockOutput = "https://replicate.delivery/pbxt/example.png";

        // 3. Deduct credit if not owner (Owner gets infinite tests)
        if (!isOwner) {
            const newTotal = Math.max(0, creditCount - 1);
            await redis.set(`credits_${email}`, newTotal.toString());
        }

        return res.status(200).json({ 
            output: mockOutput,
            message: "Production Successful"
        });

    } catch (error) {
        console.error("Database Error:", error);
        return res.status(500).json({ error: "Studio database error. Please check Vercel Storage connection." });
    }
}
