export default async function handler(req, res) {
  try {
    const { user } = req.body;

    if (!user) return res.status(400).json({ error: "Missing user" });

    // Local credit store (expand later)
    let credits = parseInt(process.env.DEFAULT_CREDITS || "20");

    // Deduct 1 credit per production
    credits = Math.max(credits - 1, 0);

    res.status(200).json({ credits });
  } catch (err) {
    console.error("CREDITS ERROR:", err);
    res.status(500).json({ error: "Credit system failed" });
  }
}
