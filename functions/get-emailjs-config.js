// netlify/functions/get-emailjs-config.js
// Provides EmailJS configuration securely

exports.handler = async (event, context) => {
    // Handle CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
    };

    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    // Only allow GET requests
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        // Get EmailJS configuration from environment variables
        const serviceId = process.env.EMAILJS_SERVICE_ID;
        const publicKey = process.env.EMAILJS_PUBLIC_KEY;

        if (!serviceId || !publicKey) {
            console.error('Missing EmailJS environment variables');
            return {
                statusCode: 500,
                headers: {
                    ...headers,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    error: 'EmailJS configuration not available'
                })
            };
        }

        return {
            statusCode: 200,
            headers: {
                ...headers,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                serviceId: serviceId,
                publicKey: publicKey
            })
        };

    } catch (error) {
        console.error('Config error:', error);
        
        return {
            statusCode: 500,
            headers: {
                ...headers,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                error: 'Failed to get configuration',
                details: error.message
            })
        };
    }
};