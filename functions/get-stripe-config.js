// netlify/functions/get-stripe-config.js
exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Content-Type': 'application/json'
    };

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
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                publishableKey: process.env.STRIPE_PUBLIC_KEY
            })
        };
    } catch (error) {
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