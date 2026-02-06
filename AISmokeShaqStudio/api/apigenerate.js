export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { prompt } = req.body;

    try {
        // This calls the Replicate API using your secret key
        const response = await fetch("https://api.replicate.com/v1/predictions", {
            method: "POST",
            headers: {
                "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                // Using standard SDXL model for high-end results
                version: "39ed52f2a78e934b3ba6e2a89f5b1d712de7dfea535525255b1aa35c5565e08b",
                input: { prompt: prompt }
            }),
        });

        let prediction = await response.json();

        // Replicate takes time to generate, so we "poll" for the result
        const predictionId = prediction.id;
        let generatedImageUrl = null;

        while (!generatedImageUrl) {
            const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
                headers: { "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}` }
            });
            const statusData = await statusResponse.json();
            
            if (statusData.status === "succeeded") {
                generatedImageUrl = statusData.output[0];
            } else if (statusData.status === "failed") {
                throw new Error("AI Generation failed");
            } else {
                await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before checking again
            }
        }

        return res.status(200).json({ url: generatedImageUrl });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}