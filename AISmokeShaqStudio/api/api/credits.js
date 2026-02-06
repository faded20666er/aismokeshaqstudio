import { kv } from "@vercel/kv";

export default async function handler(req, res) {
    const { email } = req.query;
    if (!email) return res.status(400).json({ credits: 0 });
    
    // Fetch credits from the KV database we just linked
    const credits = await kv.get(`credits_${email.toLowerCase()}`) || 0;
    res.status(200).json({ credits });
}
