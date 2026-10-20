// functions/shipping-quote.js
//
// Finerworks shipping options for a set of print SKUs to a country, using a
// placeholder address in that country (no customer data). Used to work out
// shipping prices; read-only, it never places an order.
//   POST { country: "US", items: [{ sku: "5M210M8S20X31", qty: 1 }] }

const SITE_URL = process.env.URL || 'https://xiaoranart.com';
const SKU_PATTERN = /^5M210M(37|8)S\d{1,2}X\d{1,2}$/;
const PLACEHOLDER = {
    US: { city: 'Kansas City', state_code: 'MO', zip_postal_code: '64105' },
    CA: { city: 'Toronto', province: 'ON', zip_postal_code: 'M5V 2T6' },
    GB: { city: 'London', province: 'London', zip_postal_code: 'SW1A 1AA' },
    AU: { city: 'Sydney', state_code: 'NSW', zip_postal_code: '2000' },
    TW: { city: 'Taichung', province: 'Taichung', zip_postal_code: '402' }
};
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
    const place = PLACEHOLDER[country];
    const items = Array.isArray(req.items) ? req.items : [];
    if (!place || !items.length || items.length > 10 ||
        !items.every(i => SKU_PATTERN.test(String(i.sku)) && Number.isInteger(i.qty) && i.qty >= 1 && i.qty <= 10)) {
        return reply(400, { error: 'Invalid request' });
    }
    const body = {
        orders: [{
            order_po: 'quote',
            recipient: {
                first_name: 'Quote', last_name: 'Only', company_name: null,
                address_1: '1 Main St', address_2: null, address_3: null,
                city: place.city, state_code: place.state_code || null, province: place.province || null,
                zip_postal_code: place.zip_postal_code, country_code: country.toLowerCase(),
                phone: null, email: null, address_order_po: null
            },
            order_items: items.map((i, n) => ({
                product_order_po: `quote-${n + 1}`, product_qty: i.qty, product_sku: i.sku,
                product_image: null, product_title: 'quote', template: null,
                product_guid: '00000000-0000-0000-0000-000000000000'
            })),
            test_mode: true
        }]
    };
    try {
        const res = await fetch('https://api.finerworks.com/v3/list_shipping_options_multiple', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'web_api_key': process.env.FINERWORKS_WEB_API_KEY,
                'app_key': process.env.FINERWORKS_APP_KEY
            },
            body: JSON.stringify(body)
        });
        const data = await res.json().catch(() => ({}));
        const order = (data.orders || [])[0] || {};
        const options = (order.options || []).map(o => ({
            code: o.shipping_code, method: o.shipping_method, rate: o.rate, carrier: o.carrier, transit: o.transit_time
        }));
        return reply(res.ok ? 200 : res.status, { country, options, preferred: order.preferred_option || null,
            error: options.length ? undefined : (data.status && data.status.message) || 'no options',
            debug: options.length ? undefined : JSON.stringify(data).slice(0, 800) });
    } catch (err) {
        return reply(502, { error: err.message });
    }
};
