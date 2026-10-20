// functions/shipping-quote.js
//
// Read-only shipping quote for print SKUs: what Finerworks charges us and what the
// customer would pay (rounded up to .99). Never places an order.
//   POST { country: "US" | "CA", items: [{ sku: "5M210M8S20X31", qty: 1 }] }

const { quoteShipping, customerOptions, COUNTRIES } = require('./_shared/fw-shipping');

const SITE_URL = process.env.URL || 'https://xiaoranart.com';
const SKU_PATTERN = /^5M210M(37|8)S\d{1,2}X\d{1,2}$/;
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
    let req;
    try { req = JSON.parse(event.body || '{}'); } catch { return reply(400, { error: 'Invalid JSON' }); }
    const country = String(req.country || 'US').toUpperCase();
    const items = Array.isArray(req.items) ? req.items : [];
    if (!COUNTRIES.includes(country) || !items.length || items.length > 10 ||
        !items.every(i => SKU_PATTERN.test(String(i.sku)) && Number.isInteger(i.qty) && i.qty >= 1 && i.qty <= 10)) {
        return reply(400, { error: 'Invalid request' });
    }
    try {
        const options = await quoteShipping(country, items);
        return reply(200, { country, finerworks: options, customer: customerOptions(options) });
    } catch (err) {
        return reply(502, { error: err.message });
    }
};
