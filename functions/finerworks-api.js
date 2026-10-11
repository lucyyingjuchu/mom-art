// functions/finerworks-api.js
//
// Public price lookup for the shop page. SECURITY: this used to forward ANY
// Finerworks request (including submit_orders) using our API keys. It now only
// answers price questions for our own print SKU. Orders are placed server-side
// by submit-order.js after Stripe confirms payment.

const SITE_URL = process.env.URL || 'https://xiaoranart.com';
const SKU_PATTERN = /^5M210M37S\d{1,2}X\d{1,2}$/; // Canson Arches print, W x H inches

const headers = {
    'Access-Control-Allow-Origin': SITE_URL,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
};

const reply = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
    if (event.httpMethod !== 'POST') return reply(405, { error: 'Method not allowed' });

    let request;
    try {
        request = JSON.parse(event.body || '{}');
    } catch {
        return reply(400, { error: 'Invalid JSON' });
    }

    const { endpoint, data } = request;
    if (endpoint !== 'get_prices') return reply(403, { error: 'Endpoint not allowed' });
    if (!Array.isArray(data) || data.length === 0 || data.length > 5 ||
        !data.every(d => SKU_PATTERN.test(String(d.product_sku)) && Number(d.product_qty) === 1)) {
        return reply(400, { error: 'Invalid price request' });
    }

    if (!process.env.FINERWORKS_WEB_API_KEY || !process.env.FINERWORKS_APP_KEY) {
        return reply(500, { error: 'API credentials not configured' });
    }

    try {
        const res = await fetch('https://api.finerworks.com/v3/get_prices', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'web_api_key': process.env.FINERWORKS_WEB_API_KEY,
                'app_key': process.env.FINERWORKS_APP_KEY
            },
            body: JSON.stringify(data.map(d => ({ product_qty: 1, product_sku: d.product_sku })))
        });
        const result = await res.json().catch(() => ({}));
        return reply(res.status, result);
    } catch (err) {
        console.error('Finerworks price error:', err);
        return reply(502, { error: 'Price service unavailable' });
    }
};
