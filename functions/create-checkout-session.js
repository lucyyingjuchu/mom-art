// functions/create-checkout-session.js
//
// SECURITY: prices, titles and images are worked out here on the server from
// data/finerworks_ready_artworks.json and the Finerworks price list. The browser
// only says WHICH artwork, WHICH size and HOW MANY - it can no longer set the price.

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-08-27.basil'
});
const PRINTS = require('../data/finerworks_ready_artworks.json');
const { quoteShipping, customerOptions, COUNTRIES } = require('./_shared/fw-shipping');

const SITE_URL = process.env.URL || 'https://xiaoranart.com';
const MAX_QTY = 10;
const MAX_LINES = 20;

const headers = {
    'Access-Control-Allow-Origin': SITE_URL,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
};

// Retail price from the Finerworks cost: a bigger markup on small prints, a smaller
// one on large prints, rounded up to a price ending in 9 (e.g. $93 cost -> $189).
//   cost < $50: x2.5    $50-150: x2    over $150: x1.7
// Keep in sync: js/shopping.js (shown on the page) and functions/create-checkout-session.js (charged).
// Each band never goes below the top of the band before it, so a bigger print is
// never cheaper than a smaller one (e.g. cost $50 -> $129 like cost $49, not $109).
function retailPrice(cost) {
    const raw = cost < 50 ? cost * 2.5
              : cost < 150 ? Math.max(cost * 2, 50 * 2.5)
              : Math.max(cost * 1.7, 150 * 2);
    return Math.ceil((raw + 1) / 10) * 10 - 1;
}

// Finerworks cost -> retail price, worked out on the server. If the price list can't be
// reached we refuse the checkout rather than guess: the old fallback table
// ($23-48) was far below what Finerworks charges for these sizes.
async function priceFor(sku) {
    const res = await fetch('https://api.finerworks.com/v3/get_prices', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'web_api_key': process.env.FINERWORKS_WEB_API_KEY,
            'app_key': process.env.FINERWORKS_APP_KEY
        },
        body: JSON.stringify({ products: [{ product_qty: 1, product_sku: sku }] })
    });
    const data = await res.json().catch(() => ({}));
    const p = data.prices && data.prices[0];
    const base = p && parseFloat(p.total_price || p.product_price);
    if (!res.ok || !base) {
        throw new Error(`Finerworks price lookup failed for ${sku}: ${res.status} ${JSON.stringify(data).slice(0, 200)}`);
    }
    return retailPrice(base);
}

// Stripe metadata values are capped at 500 characters, so a long cart is split
// across cart_data, cart_data_2, cart_data_3 ... (read back in submit-order.js)
function cartMetadata(items) {
    const json = JSON.stringify(items);
    const out = {};
    for (let i = 0, n = 1; i < json.length; i += 490, n++) {
        out[n === 1 ? 'cart_data' : `cart_data_${n}`] = json.slice(i, i + 490);
    }
    return out;
}

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    try {
        const { cartItems, country: rawCountry } = JSON.parse(event.body || '{}');
        const country = String(rawCountry || 'US').toUpperCase();
        if (!COUNTRIES.includes(country)) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'We ship prints to the U.S. and Canada' }) };
        }
        if (!Array.isArray(cartItems) || cartItems.length === 0 || cartItems.length > MAX_LINES) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Cart is empty or invalid' }) };
        }

        const lineItems = [];
        const minimalCartData = [];
        const shipItems = [];

        for (const item of cartItems) {
            const print = PRINTS[item.artworkId];
            if (!print || !print.print_ready) {
                return { statusCode: 400, headers, body: JSON.stringify({ error: 'This artwork is not available as a print' }) };
            }

            const w = parseInt(item.width_inches, 10);
            const h = parseInt(item.height_inches, 10);
            const offered = (print.recommended_sizes || []).find(s => s.width_inches === w && s.height_inches === h);
            if (!offered) {
                return { statusCode: 400, headers, body: JSON.stringify({ error: 'That print size is not offered' }) };
            }

            const qty = parseInt(item.quantity, 10);
            if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) {
                return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid quantity' }) };
            }

            const sku = offered.sku || `5M210M37S${w}X${h}`;
            const rolled = offered.style === 'rolled';
            const price = await priceFor(sku);
            const info = print.artwork_info || {};
            const api = print.finerworks_image?.finerworks_api_object || {};
            const wCm = Math.round(w * 2.54);
            const hCm = Math.round(h * 2.54);

            lineItems.push({
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: info.title_en ? `${info.title_en} ${info.title || ''}`.trim() : (info.title || 'Xiaoran Art Print'),
                        description: `Giclée fine art print, ${h}" × ${w}" (${hCm} × ${wCm} cm, H × W) on paper, with white border, ${rolled ? 'rolled in a tube (unmounted)' : 'mounted on board'}`,
                        images: api.public_thumbnail_uri ? [api.public_thumbnail_uri] : []
                    },
                    unit_amount: Math.round(price * 100)
                },
                quantity: qty
            });
            minimalCartData.push({ id: item.artworkId, q: qty, p: price, w, h });
            shipItems.push({ sku, qty });
        }

        // Real Finerworks shipping for this cart and country, rounded up to .99.
        // The Finerworks code rides along in the rate's metadata so submit-order.js
        // books exactly the service the customer paid for.
        const shipping = customerOptions(await quoteShipping(country, shipItems));
        if (!shipping.length) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'No shipping available for this order - please contact us' }) };
        }
        const shippingOptions = shipping.map(o => ({
            shipping_rate_data: {
                type: 'fixed_amount',
                display_name: `${o.label} (rolled in a tube)`,
                fixed_amount: { amount: Math.round(o.price * 100), currency: 'usd' },
                ...(o.days.length === 2 ? { delivery_estimate: {
                    minimum: { unit: 'business_day', value: o.days[0] + 3 },   // + printing time
                    maximum: { unit: 'business_day', value: o.days[1] + 3 }
                } } : {}),
                metadata: { fw_code: o.code }
            }
        }));

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment',
            ui_mode: 'hosted',
            shipping_address_collection: {
                allowed_countries: [country]
            },
            shipping_options: shippingOptions,
            custom_text: {
                shipping_address: {
                    message: 'Processing time: Your artwork will be printed in around 2-3 business days, then shipped via your selected method.'
                }
            },
            metadata: {
                ...cartMetadata(minimalCartData),
                order_id: 'XIAORAN_' + Date.now(),
                ship_country: country,
                ship_codes: JSON.stringify(Object.fromEntries(shipping.map(o => [`${o.label} (rolled in a tube)`, o.code]))).slice(0, 490),
                item_count: String(minimalCartData.length)
            },
            success_url: `${SITE_URL}/order_success_page.html?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${SITE_URL}/#gallery`
        });

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ checkout_url: session.url, session_id: session.id })
        };
    } catch (error) {
        console.error('Checkout session creation failed:', error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Checkout session creation failed' }) };
    }
};
