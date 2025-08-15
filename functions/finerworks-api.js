// functions/finerworks-api.js
// Fixed version with proper request formatting for Finerworks API

exports.handler = async (event, context) => {
    console.log('🔧 Finerworks API function called');
    console.log('Method:', event.httpMethod);
    console.log('Path:', event.path);

    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        // Parse the request body
        const { endpoint, data } = JSON.parse(event.body);
        console.log('📤 Request endpoint:', endpoint);
        console.log('📤 Request data:', JSON.stringify(data));
        
        // Finerworks API configuration
        const FINERWORKS_CONFIG = {
            webApiKey: process.env.FINERWORKS_WEB_API_KEY,
            appKey: process.env.FINERWORKS_APP_KEY,
            apiUrl: 'https://api.finerworks.com/v3'
        };

        // Check if credentials are configured
        if (!FINERWORKS_CONFIG.webApiKey || !FINERWORKS_CONFIG.appKey) {
            console.error('❌ API credentials not found in environment variables');
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ 
                    error: 'API credentials not configured',
                    message: 'Please set FINERWORKS_WEB_API_KEY and FINERWORKS_APP_KEY environment variables in Netlify'
                })
            };
        }

        console.log('✅ API credentials found');
        console.log('🌐 Making request to Finerworks API...');

        // Prepare request configuration based on endpoint
        let requestConfig;
        let requestUrl = `${FINERWORKS_CONFIG.apiUrl}/${endpoint}`;

        // Handle different endpoints with proper formatting
        switch (endpoint) {
            case 'test_my_credentials':
                // This is a GET request
                requestConfig = {
                    method: 'GET',
                    headers: {
                        'web_api_key': FINERWORKS_CONFIG.webApiKey,
                        'app_key': FINERWORKS_CONFIG.appKey
                    }
                };
                break;

            case 'list_product_types':
            case 'list_media_types':
            case 'list_style_types':
                // These endpoints expect POST with empty body or specific format
                requestConfig = {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'web_api_key': FINERWORKS_CONFIG.webApiKey,
                        'app_key': FINERWORKS_CONFIG.appKey
                    },
                    body: JSON.stringify({}) // Empty object for list endpoints
                };
                break;

            case 'get_prices':
                // This endpoint expects an array of product requests
                requestConfig = {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'web_api_key': FINERWORKS_CONFIG.webApiKey,
                        'app_key': FINERWORKS_CONFIG.appKey
                    },
                    body: JSON.stringify(data) // Use provided data array
                };
                break;

            case 'add_images':
                // Image upload endpoint
                requestConfig = {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'web_api_key': FINERWORKS_CONFIG.webApiKey,
                        'app_key': FINERWORKS_CONFIG.appKey
                    },
                    body: JSON.stringify(data) // Use provided image data array
                };
                break;

            case 'submit_orders':
                // Order submission endpoint
                requestConfig = {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'web_api_key': FINERWORKS_CONFIG.webApiKey,
                        'app_key': FINERWORKS_CONFIG.appKey
                    },
                    body: JSON.stringify(data) // Use provided order data array
                };
                break;

            default:
                // Generic POST request for other endpoints
                requestConfig = {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'web_api_key': FINERWORKS_CONFIG.webApiKey,
                        'app_key': FINERWORKS_CONFIG.appKey
                    },
                    body: JSON.stringify(data || {})
                };
                break;
        }

        console.log('📡 Request config:', {
            method: requestConfig.method,
            url: requestUrl,
            hasBody: !!requestConfig.body
        });

        // Make request to Finerworks API
        const finerworksResponse = await fetch(requestUrl, requestConfig);
        
        console.log('📡 Finerworks response status:', finerworksResponse.status);
        console.log('📡 Response headers:', Object.fromEntries(finerworksResponse.headers.entries()));

        // Get response data
        let responseData;
        const contentType = finerworksResponse.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
            responseData = await finerworksResponse.json();
        } else {
            const textResponse = await finerworksResponse.text();
            console.log('📡 Raw response:', textResponse);
            responseData = { 
                message: textResponse,
                contentType: contentType,
                status: finerworksResponse.status
            };
        }

        console.log('📦 Response data received:', JSON.stringify(responseData).substring(0, 200));

        // Return response (even if it's an error from Finerworks)
        return {
            statusCode: finerworksResponse.status,
            headers,
            body: JSON.stringify(responseData)
        };

    } catch (error) {
        console.error('❌ Function error:', error);
        console.error('❌ Error stack:', error.stack);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Internal server error',
                message: error.message,
                details: 'Check function logs for more information'
            })
        };
    }
};