export default async function handler(req, res) {
    const TOKEN = process.env.REPLICATE_API_TOKEN;

    res.json({
        status: 'ok',
        hasToken: !!TOKEN,
        tokenLength: TOKEN ? TOKEN.length : 0,
        timestamp: new Date().toISOString()
    });
}
