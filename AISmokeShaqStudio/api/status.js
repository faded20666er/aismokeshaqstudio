export default async function handler(req, res) {
    res.setHeader('Content-Type', 'application/json');

    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'Missing prediction ID' });

    try {
        const response = await fetch(
            `https://api.replicate.com/v1/predictions/${id}`,
            {
                headers: {
                    "Authorization": `Bearer ${process.env.REPLICATE_API_TOKEN}`
                }
            }
        );

        const prediction = await response.json();

        return res.status(200).json({
            status: prediction.status,
            output: prediction.output,
            error: prediction.error
        });

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
