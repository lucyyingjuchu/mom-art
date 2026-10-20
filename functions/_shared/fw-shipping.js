// Finerworks shipping options for print SKUs to a country, quoted with a
// placeholder address there (the customer's address isn't known until Stripe
// collects it; rates are by country/zone, so this matches what Finerworks bills).
// Used by create-checkout-session.js and shipping-quote.js.

const SITE_URL = process.env.URL || 'https://xiaoranart.com';
const PLACEHOLDER = {
    US: { city: 'Kansas City', state_code: 'MO', zip_postal_code: '64105' },
    CA: { city: 'Toronto', province: 'ON', zip_postal_code: 'M5V 2T6' }
};
const COUNTRIES = Object.keys(PLACEHOLDER);
const LOGO = `${SITE_URL}/images/logo/text_white/android-chrome-512x512.png`;

async function quoteShipping(country, items) {
    const place = PLACEHOLDER[country];
    if (!place) throw new Error(`No shipping to ${country}`);
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
            order_items: items.map((i, n) => {
                const [, w, h] = i.sku.match(/S(\d+)X(\d+)$/);
                return {
                    product_order_po: `quote-${n + 1}`, product_qty: i.qty, product_sku: i.sku,
                    // any public picture will do for a quote (nothing is printed)
                    product_image: { pixel_width: w * 200, pixel_height: h * 200, product_url_file: LOGO, product_url_thumbnail: LOGO },
                    product_title: 'quote', template: null,
                    product_guid: '00000000-0000-0000-0000-000000000000'
                };
            }),
            shipping_code: 'SD',
            test_mode: true
        }]
    };
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
    return (order.options || [])
        .filter(o => o.shipping_code && o.rate > 0)        // "XX: amount to be determined" has rate 0
        .map(o => ({
            code: o.shipping_code,
            method: o.shipping_method || '',
            rate: Number(o.rate),
            days: (String(o.transit_time || '').match(/(\d+)\s*-\s*(\d+)/) || []).slice(1).map(Number)
        }));
}

// What the customer sees and pays: Finerworks' rate rounded up to .99 (covers card fees),
// at most 3 options, tube options first (prints ship rolled), cheapest first.
function customerOptions(options) {
    const tube = options.filter(o => /tube/i.test(o.method));
    const pool = (tube.length ? tube : options).slice().sort((a, b) => a.rate - b.rate);
    const seen = new Set();
    return pool.filter(o => !seen.has(o.code) && seen.add(o.code)).slice(0, 3).map(o => ({
        ...o,
        price: Math.floor(o.rate) + 0.99,
        label: o.method.replace(/\s*-\s*Ship in Tube Preferred/i, '').replace(/\s*-\s*Parcel/i, '').trim() || 'Shipping'
    }));
}

module.exports = { quoteShipping, customerOptions, COUNTRIES };
