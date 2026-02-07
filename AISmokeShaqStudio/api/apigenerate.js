
export default async function handler(req, res) {
    res.setHeader('Content-Type', 'application/json');
    const TOKEN = process.env.REPLICATE_API_TOKEN;
    if (!TOKEN) return res.json({ FAIL: "NO REPLICATE_API_TOKEN FOUND" });

    const results = { token_exists: true, token_preview: TOKEN.substring(0,8) + "..." };

    try {
        const acctRes = await fetch('https://api.replicate.com/v1/account', {
            headers: { 'Authorization': 'Bearer ' + TOKEN }
        });
        const acct = await acctRes.json();
        results.account = acctRes.ok ? { status: "OK", username: acct.username } : { status: "FAIL", detail: acct };

        const t1 = await fetch('https://api.replicate.com/v1/predictions', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: "black-forest-labs/flux-schnell", input: { prompt: "test golden car" } })
        });
        const r1 = await t1.json();
        results.test_flux_schnell = { http: t1.status, id: r1.id || null, status: r1.status || null, error: r1.detail || r1.title || null };

        const t2 = await fetch('https://api.replicate.com/v1/predictions', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: "stability-ai/sdxl", input: { prompt: "test golden car" } })
        });
        const r2 = await t2.json();
        results.test_sdxl_model_field = { http: t2.status, id: r2.id || null, status: r2.status || null, error: r2.detail || r2.title || null };

        const t3 = await fetch('https://api.replicate.com/v1/models/stability-ai/sdxl/predictions', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
            body: JSON.stringify({ input: { prompt: "test golden car 3" } })
        });
        const r3 = await t3.json();
        results.test_sdxl_models_endpoint = { http: t3.status, id: r3.id || null, status: r3.status || null, error: r3.detail || r3.title || null };

        const t4 = await fetch('https://api.replicate.com/v1/models/bytedance/sdxl-lightning-4step/predictions', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
            body: JSON.stringify({ input: { prompt: "test golden car 4" } })
        });
        const r4 = await t4.json();
        results.test_sdxl_lightning = { http: t4.status, id: r4.id || null, status: r4.status || null, error: r4.detail || r4.title || null };

        const t5 = await fetch('https://api.replicate.com/v1/models/stability-ai/stable-video-diffusion/predictions', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
            body: JSON.stringify({ input: { input_image: "https://replicate.delivery/pbxt/IJEPmgAlvEhQFSBMtKRaeKPPMjGYxJMxpMH4r58FYPFjiPgA/gg_bridge.jpeg" } })
        });
        const r5 = await t5.json();
        results.test_svd_video = { http: t5.status, id: r5.id || null, status: r5.status || null, error: r5.detail || r5.title || null };

        return res.status(200).json(results);
    } catch (err) {
        return res.status(200).json({ ...results, crash: err.message });
    }
}
