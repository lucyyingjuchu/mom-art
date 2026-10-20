// functions/submit-order.js
//
// Called by order_success_page.html with the Stripe session id after checkout.
// Everything happens server-side:
//   1. Ask Stripe whether the session is really paid (the browser can't fake this).
//   2. Rebuild the order from Stripe's own record + data/finerworks_ready_artworks.json.
//   3. Send it to Finerworks ONCE - the PaymentIntent is stamped so a page reload
//      or a second tab never creates a duplicate print order.
//
// Netlify env var FINERWORKS_ORDER_MODE controls step 3:
//   "off"      (default) - nothing is sent to Finerworks; the order is only logged
//   "validate" - Finerworks checks the order but does not print it
//   "live"     - real print order is placed

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-08-27.basil'
});
const PRINTS = require('../data/finerworks_ready_artworks.json');

const SITE_URL = process.env.URL || 'https://xiaoranart.com';
const MODE = (process.env.FINERWORKS_ORDER_MODE || 'off').toLowerCase();

const headers = {
    'Access-Control-Allow-Origin': SITE_URL,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
};
const reply = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });

// Fixed Stripe rates used before Oct 2026 (kept for orders placed back then)
const SHIPPING_CODES = {
    'shr_1SB6Nn7iRKbAsUAgKtbaJiJv': 'FT',  // US Economy
    'shr_1SB6NM7iRKbAsUAgQbsfDSWl': 'GD',  // US Standard
    'shr_1SB6Mo7iRKbAsUAgoS492PyL': 'ET',  // US Express
    'shr_1SB6Jt7iRKbAsUAgkz0FedRW': 'GT'   // International
};

// ---- Print files are private on S3 ------------------------------------------
// The full-resolution scans in s3://xiaoran-raw-artworks are not public. Each
// order gives Finerworks a signed link that works for 7 days (AWS Signature V4,
// query-string form; no SDK needed). Netlify env vars, read-only key:
//   S3_PRINT_ACCESS_KEY_ID, S3_PRINT_SECRET_ACCESS_KEY
const crypto = require('crypto');
const S3_REGION = 'us-east-1';

function presignS3Url(url, { accessKeyId, secretAccessKey, region = S3_REGION, expires = 604800, now = new Date(), method = 'GET' }) {
    const u = new URL(url);
    const amzDate = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');   // YYYYMMDDTHHMMSSZ
    const day = amzDate.slice(0, 8);
    const scope = `${day}/${region}/s3/aws4_request`;
    const enc = s => encodeURIComponent(s).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
    const params = {
        'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
        'X-Amz-Credential': `${accessKeyId}/${scope}`,
        'X-Amz-Date': amzDate,
        'X-Amz-Expires': String(expires),
        'X-Amz-SignedHeaders': 'host'
    };
    const query = Object.keys(params).sort().map(k => `${enc(k)}=${enc(params[k])}`).join('&');
    const path = u.pathname.split('/').map(seg => enc(decodeURIComponent(seg))).join('/');
    const canonical = [method, path, query, `host:${u.host}\n`, 'host', 'UNSIGNED-PAYLOAD'].join('\n');
    const toSign = ['AWS4-HMAC-SHA256', amzDate, scope,
        crypto.createHash('sha256').update(canonical).digest('hex')].join('\n');
    const hmac = (key, data) => crypto.createHmac('sha256', key).update(data).digest();
    const kSigning = ['s3', 'aws4_request'].reduce(hmac, hmac(hmac('AWS4' + secretAccessKey, day), region));
    const signature = crypto.createHmac('sha256', kSigning).update(toSign).digest('hex');
    return `${u.origin}${path}?${query}&X-Amz-Signature=${signature}`;
}

const S3_BUCKET_URL = 'https://xiaoran-raw-artworks.s3.us-east-1.amazonaws.com/';

// The print file for one size: the painting on whole-inch paper with a white border
// (raw/sized/<id>_<W>x<H>.jpg, made by make_print_files.py). Older entries without a
// sized file fall back to the artwork's single raw file.
function sizedPrintImage(print, w, h) {
    const size = (print.recommended_sizes || []).find(s => s.width_inches === w && s.height_inches === h);
    const api = print.finerworks_image?.finerworks_api_object || {};
    if (size && size.file_key) {
        return { size, url: S3_BUCKET_URL + size.file_key, pixW: size.file_pix_w, pixH: size.file_pix_h, api };
    }
    return { size, url: api.private_hires_uri, pixW: api.pix_w, pixH: api.pix_h, api };
}

function printFileUrl(api) {
    const url = api.private_hires_uri;
    if (!url) return api.public_preview_uri;
    const accessKeyId = process.env.S3_PRINT_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_PRINT_SECRET_ACCESS_KEY;
    if (!/\.amazonaws\.com\//.test(url) || !accessKeyId || !secretAccessKey) {
        if (/\.amazonaws\.com\//.test(url)) console.warn('S3_PRINT_* keys not set - sending unsigned print URL');
        return url;
    }
    return presignS3Url(url, { accessKeyId, secretAccessKey });
}

// The Finerworks service the customer chose: stored on the Stripe shipping rate
// (metadata.fw_code) by create-checkout-session.js; older sessions used fixed rates.
async function finerworksShippingCode(session) {
    const rateId = session.shipping_cost?.shipping_rate;
    if (rateId && SHIPPING_CODES[rateId]) return SHIPPING_CODES[rateId];
    if (rateId) {
        try {
            const rate = await stripe.shippingRates.retrieve(rateId);
            if (rate.metadata?.fw_code) return rate.metadata.fw_code;
            const codes = JSON.parse(session.metadata?.ship_codes || '{}');
            if (codes[rate.display_name]) return codes[rate.display_name];
        } catch (err) {
            console.error('Could not read shipping rate', rateId, err.message);
        }
    }
    return 'GD';   // Standard
}

function readCart(metadata) {
    let json = metadata.cart_data || '';
    for (let n = 2; metadata[`cart_data_${n}`]; n++) json += metadata[`cart_data_${n}`];
    return JSON.parse(json || '[]');
}

function buildFinerworksOrder(session, cart, shippingCode) {
    const shipping = session.collected_information?.shipping_details || session.shipping_details || {};
    const customer = session.customer_details || {};
    const address = shipping.address || customer.address || {};
    const fullName = (shipping.name || customer.name || 'Customer Name').trim();
    const country = (address.country || 'US').toUpperCase();
    const state = address.state || '';
    const orderId = session.metadata.order_id;

    return {
        orders: [{
            order_po: orderId,
            order_key: null,
            recipient: {
                first_name: fullName.split(' ')[0],
                last_name: fullName.split(' ').slice(1).join(' ') || '-',
                company_name: 'Xiaoran Art Studio',
                address_1: address.line1 || '',
                address_2: address.line2 || '',
                city: address.city || '',
                state_code: country === 'US' ? state : null,
                province: country === 'US' ? null : (state || null),   // Finerworks: province outside the U.S. (AU too)
                zip_postal_code: address.postal_code || '',
                country_code: country.toLowerCase(),
                phone: customer.phone || '',
                email: customer.email || session.customer_email || '',
                address_order_po: orderId
            },
            order_items: cart.map((item, i) => {
                const print = PRINTS[item.id];
                const file = print && sizedPrintImage(print, item.w, item.h);
                if (!file || !file.size || !file.url || !file.pixW || !file.pixH) throw new Error(`Print data missing for ${item.id} ${item.w}x${item.h}`);
                const api = file.api;
                return {
                    product_order_po: `${orderId}-${i + 1}`,
                    product_qty: item.q,
                    product_sku: file.size.sku || `5M210M8S${item.w}X${item.h}`,
                    product_image: {
                        pixel_width: file.pixW,
                        pixel_height: file.pixH,
                        product_url_file: printFileUrl({ ...api, private_hires_uri: file.url }),
                        product_url_thumbnail: api.public_thumbnail_uri || api.public_preview_uri
                    },
                    product_title: PRINTS[item.id].artwork_info?.title || 'Untitled',
                    template: null,
                    product_guid: '00000000-0000-0000-0000-000000000000',
                    custom_data_1: `customer_order:XR-${new Date().getFullYear()}-${orderId.slice(-6)}`,
                    custom_data_2: `stripe_payment_id:${session.payment_intent}`,
                    custom_data_3: `stripe_session_id:${session.id}`
                };
            }),
            shipping_code: shippingCode,
            test_mode: false,
            validate_only: MODE !== 'live'
        }]
    };
}

exports.presignS3Url = presignS3Url;   // also used by print-file-check.js
exports.sizedPrintImage = sizedPrintImage;

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
    if (event.httpMethod !== 'POST') return reply(405, { error: 'Method not allowed' });

    let sessionId;
    try {
        sessionId = JSON.parse(event.body || '{}').session_id;
    } catch {
        return reply(400, { error: 'Invalid request' });
    }
    if (typeof sessionId !== 'string' || !/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) {
        return reply(400, { error: 'Invalid session id' });
    }

    let session;
    try {
        session = await stripe.checkout.sessions.retrieve(sessionId);
    } catch (err) {
        return reply(404, { error: 'Order not found' });
    }
    if (session.payment_status !== 'paid') return reply(402, { error: 'Payment not completed' });

    const cart = readCart(session.metadata || {});
    const summary = {
        order_number: `XR-${new Date(session.created * 1000).getFullYear()}-${session.metadata.order_id.slice(-6)}`,
        amount_total: session.amount_total,
        currency: session.currency,
        customer_name: session.customer_details?.name || '',
        customer_email: session.customer_details?.email || session.customer_email || '',
        item_count: cart.length
    };

    // Idempotency: has this payment already been sent to Finerworks?
    const pi = await stripe.paymentIntents.retrieve(session.payment_intent);
    if (pi.metadata?.finerworks_status) {
        return reply(200, { ...summary, fulfillment: pi.metadata.finerworks_status });
    }

    let status;
    try {
        const order = buildFinerworksOrder(session, cart, await finerworksShippingCode(session));
        if (MODE === 'off') {
            console.log('FINERWORKS_ORDER_MODE=off - order NOT sent:', JSON.stringify(order));
            status = 'recorded';
        } else {
            const res = await fetch('https://api.finerworks.com/v3/submit_orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'web_api_key': process.env.FINERWORKS_WEB_API_KEY,
                    'app_key': process.env.FINERWORKS_APP_KEY
                },
                body: JSON.stringify(order)
            });
            const result = await res.json().catch(() => ({}));
            console.log('Finerworks response:', res.status, JSON.stringify(result));
            status = res.ok && result.status === 'success'
                ? (MODE === 'live' ? 'submitted' : 'validated')
                : 'failed';
        }
    } catch (err) {
        console.error('Order build/submit error:', err);
        status = 'failed';
    }

    // Only lock the order once it has actually gone through (or been recorded),
    // so a failed attempt can be retried by reloading the page.
    if (status !== 'failed') {
        await stripe.paymentIntents.update(session.payment_intent, {
            metadata: { finerworks_status: status, finerworks_at: new Date().toISOString() }
        });
    }

    return reply(200, { ...summary, fulfillment: status });
};
