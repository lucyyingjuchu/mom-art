// netlify/functions/send-email.js
// Validation and logging endpoint (not sending emails directly)

exports.handler = async (event, context) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            body: ''
        };
    }

    try {
        // Parse the request body
        const data = JSON.parse(event.body);
        console.log('Validating inquiry data:', {
            customer: data.customer?.name,
            artwork: data.artwork?.title,
            timestamp: data.analytics?.timestamp
        });

        // Validate required fields
        const requiredFields = [
            data.customer?.name,
            data.artwork?.title
        ];
        // Phone, LINE or email: any one is enough
        const contactMethods = [
            data.customer?.phone,
            data.customer?.line,
            data.customer?.email
        ];

        if (requiredFields.some(field => !field || field.trim() === '') ||
            !contactMethods.some(field => field && field.trim() !== '')) {
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    success: false,
                    error: 'Missing required fields'
                })
            };
        }

        // Validate email format, when one was given
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (data.customer.email && !emailRegex.test(data.customer.email)) {
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    success: false,
                    error: 'Invalid email format'
                })
            };
        }

        // Log the inquiry (for your records)
        console.log('✅ Valid inquiry received:', {
            customer: {
                name: data.customer.name,
                email: data.customer.email,
                country: data.customer.country
            },
            artwork: {
                title: data.artwork.title,
                id: data.artwork.id
            },
            timestamp: data.analytics.timestamp
        });

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                success: true, 
                message: 'Validation passed',
                timestamp: new Date().toISOString()
            })
        };

    } catch (error) {
        console.error('Validation error:', error);
        
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                success: false,
                error: 'Validation failed',
                details: error.message
            })
        };
    }
};