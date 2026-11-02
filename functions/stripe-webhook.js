// functions/stripe-webhook.js
//
// Stripe calls this when a checkout is paid, so a print order goes out even if the
// buyer closes the page right after paying. Stripe signs each call; anything
// without a valid signature is refused.
//
// Stripe Dashboard > Developers > Webhooks: endpoint
//   https://xiaoranart.com/.netlify/functions/stripe-webhook
// event checkout.session.completed. Put its signing secret in the Netlify env var
// STRIPE_WEBHOOK_SECRET. Once that is set, this is the only place that sends orders;
// the success page only reads the result (see submit-order.js).

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-08-27.basil'
});
const { fulfillSession } = require('./submit-order');

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

    let stripeEvent;
    try {
        const body = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
        stripeEvent = stripe.webhooks.constructEvent(body, event.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error('Webhook signature check failed:', err.message);
        return { statusCode: 400, body: 'Invalid signature' };
    }

    if (stripeEvent.type !== 'checkout.session.completed') {
        return { statusCode: 200, body: 'Ignored' };
    }

    try {
        // Read the session again: the event's shape follows the endpoint's API version,
        // this call follows the version the rest of the site uses.
        const session = await stripe.checkout.sessions.retrieve(stripeEvent.data.object.id);
        const status = await fulfillSession(session, { fromWebhook: true });
        return { statusCode: 200, body: JSON.stringify({ fulfillment: status }) };
    } catch (err) {
        console.error('Webhook processing failed:', err);
        return { statusCode: 500, body: 'Processing failed' };   // Stripe tries again later
    }
};
