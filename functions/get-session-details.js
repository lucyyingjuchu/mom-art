// netlify/functions/get-session-details.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { session_id } = JSON.parse(event.body);
        
        console.log('Retrieving session details for:', session_id);

        // Retrieve the checkout session
        const session = await stripe.checkout.sessions.retrieve(session_id);
        
        if (session.payment_status !== 'paid') {
            throw new Error('Payment not completed');
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                id: session.id,
                payment_intent: session.payment_intent,
                payment_status: session.payment_status,
                amount_total: session.amount_total,
                currency: session.currency,
                customer_email: session.customer_email,
                metadata: session.metadata
            })
        };

    } catch (error) {
        console.error('Session retrieval failed:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Failed to retrieve session',
                message: error.message 
            })
        };
    }
};