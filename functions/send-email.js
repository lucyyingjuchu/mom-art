// netlify/functions/send-email.js
const https = require('https');

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
        console.log('Received inquiry data:', data);

        // Get EmailJS credentials from environment variables
        const serviceId = process.env.EMAILJS_SERVICE_ID;
        const publicKey = process.env.EMAILJS_PUBLIC_KEY;
        const privateKey = process.env.EMAILJS_PRIVATE_KEY;

        if (!serviceId || !publicKey || !privateKey) {
            console.error('Missing EmailJS environment variables');
            return {
                statusCode: 500,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    error: 'Server configuration error',
                    details: 'EmailJS credentials not configured'
                })
            };
        }

        // Determine template based on language
        const templateId = data.analytics.language === 'zh' ? 
            'template_artwork_inquiry_zh' : 
            'template_artwork_inquiry_en';

        // Prepare EmailJS payload
        const emailPayload = {
            service_id: serviceId,
            template_id: templateId,
            user_id: publicKey,
            accessToken: privateKey, // Use private key for server-side auth
            template_params: {
                // Customer info
                customer_name: data.customer.name,
                customer_email: data.customer.email,
                customer_phone: data.customer.phone,
                customer_country: data.customer.country,
                
                // Artwork info
                artwork_title: data.artwork.title,
                artwork_title_en: data.artwork.titleEn || data.artwork.title,
                artwork_year: data.artwork.year,
                artwork_size: data.artwork.size,
                artwork_id: data.artwork.id,
                
                // Shipping info
                shipping_address: data.shipping.address,
                shipping_note: data.shipping.note || 'No additional notes',
                
                // Analytics
                inquiry_language: data.analytics.language,
                inquiry_timestamp: data.analytics.timestamp,
                user_country: data.analytics.detected_country
            }
        };

        console.log('Sending to EmailJS:', {
            service_id: serviceId,
            template_id: templateId,
            user_id: publicKey,
            // Don't log the full payload for security
        });

        // Send email via EmailJS API
        const result = await sendEmailJS(emailPayload);
        
        console.log('EmailJS response:', result);

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                success: true, 
                message: 'Email sent successfully',
                emailjs_response: result
            })
        };

    } catch (error) {
        console.error('Function error:', error);
        
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                error: 'Failed to send email',
                details: error.message
            })
        };
    }
};

// Helper function to send email via EmailJS API
function sendEmailJS(payload) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify(payload);
        
        const options = {
            hostname: 'api.emailjs.com',
            port: 443,
            path: '/api/v1.0/email/send',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        const response = JSON.parse(data);
                        resolve(response);
                    } catch (e) {
                        resolve({ status: 'OK', response: data });
                    }
                } else {
                    reject(new Error(`EmailJS API returned status ${res.statusCode}: ${data}`));
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(postData);
        req.end();
    });
}