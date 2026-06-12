export default async function handler(req, res) {
  try {
    const { id } = req.query;

    if (!id) return res.status(400).json({ error: "Missing job ID" });

    const response = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: {
        Authorization: `Token ${process.env.REPLICATE_API_KEY}`,
        "Content-Type": "application/json"
      }
    });

    const data = await response.json();
    res.status(200).json(data);
  } catch (err) {
    console.error("STATUS ERROR:", err);
    res.status(500).json({ error: "Status check failed" });
  }
}
