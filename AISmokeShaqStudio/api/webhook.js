import { kv } from "@vercel/kv";

export default async function handler(req, res) {
    const event = req.body;

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const email = session.customer_details.email.toLowerCase();
        const amount = session.amount_total;

        let creditsToAdd = 0;
        if (amount >= 5000) creditsToAdd = 500;      // $50
        else if (amount >= 2500) creditsToAdd = 200; // $25
        else if (amount >= 1000) creditsToAdd = 50;  // $10

        const current = await kv.get(`credits_${email}`) || 0;
        await kv.set(`credits_${email}`, current + creditsToAdd);
    }

    res.status(200).json({ received: true });
}
