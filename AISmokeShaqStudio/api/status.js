export default async function handler(req, res) {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'No ID provided' });

    const response = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
        headers: {
            'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}`,
            'Content-Type': 'application/json'
        }
    });

    const result = await response.json();
    res.status(200).json(result);
}
