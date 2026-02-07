import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: 'Email required' });
    
    try {
        const credits = await redis.get(`credits_${email}`);
        return res.status(200).json({ credits: credits || 0 });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
