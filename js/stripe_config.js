// netlify/functions/get-stripe-config.js
// Simple function to provide Stripe public key to frontend

exports.handler = async (event, context) => {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        // Return the public key (safe to expose)
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                publishableKey: process.env.STRIPE_PUBLIC_KEY
            })
        };

        console.error('❌ Config function error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Configuration error',
                message: error.message 
            })
        };
    }
};