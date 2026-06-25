export default async function handler(req, res) {
    try {
        const response = await fetch("https://api.replicate.com/v1/account", {
            headers: { "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}` }
        });
        const data = await response.json();
        // This will return the username of the account the website is currently using
        res.status(200).json({ 
            connected_account: data.username,
            token_detected: process.env.REPLICATE_API_TOKEN ? "Yes (Hidden)" : "No",
            note: "If this name is NOT 'faded20666er', then Vercel has the wrong token."
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
