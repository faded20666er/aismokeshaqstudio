export default async function handler(req, res) {
    res.setHeader('Content-Type', 'application/json');
    const TOKEN = process.env.REPLICATE_API_TOKEN;
    if (!TOKEN) return res.json({ FAIL: "NO TOKEN" });

    try {
        const acctRes = await fetch('https://api.replicate.com/v1/account', {
            headers: { 'Authorization': 'Bearer ' + TOKEN }
        });
        const acct = await acctRes.json();

        const r = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + TOKEN,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                input: { prompt: "a golden lowrider car in Seattle at sunset, cinematic" }
            })
        });
        const data = await r.json();

        if (r.status === 201 && data.id) {
            for (let i = 0; i < 30; i++) {
                await new Promise(ok => setTimeout(ok, 3000));
                const poll = await fetch('https://api.replicate.com/v1/predictions/' + data.id, {
                    headers: { 'Authorization': 'Bearer ' + TOKEN }
                });
                const p = await poll.json();
                if (p.status === 'succeeded') {
                    return res.json({
                        RESULT: "SUCCESS",
                        account: acct.username,
                        image: p.output,
                        message: "OPEN THE IMAGE URL IN YOUR BROWSER"
                    });
                }
                if (p.status === 'failed') {
                    return res.json({ RESULT: "GENERATION_FAILED", error: p.error });
                }
            }
            return res.json({ RESULT: "TIMEOUT", id: data.id });
        }

        return res.json({
            RESULT: "API_ERROR",
            account: acct.username,
            http: r.status,
            error: data.detail || data.title || JSON.stringify(data)
        });

    } catch (err) {
        return res.json({ RESULT: "CRASH", error: err.message });
    }
}
