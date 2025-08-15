// functions/finerworks-api.js
// Main API proxy function for Finerworks

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

        // Determine HTTP method based on endpoint
        let method = 'POST';
        if (endpoint === 'test_my_credentials') {
            method = 'GET';
        }

        // Prepare request configuration
        const requestConfig = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'web_api_key': FINERWORKS_CONFIG.webApiKey,
                'app_key': FINERWORKS_CONFIG.appKey
            }
        };

        // Add body for POST requests
        if (method === 'POST') {
            requestConfig.body = JSON.stringify(data);
        }

        // Make request to Finerworks API
        const finerworksResponse = await fetch(`${FINERWORKS_CONFIG.apiUrl}/${endpoint}`, requestConfig);
        
        console.log('📡 Finerworks response status:', finerworksResponse.status);

        // Get response data
        let responseData;
        const contentType = finerworksResponse.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
            responseData = await finerworksResponse.json();
        } else {
            responseData = { message: await finerworksResponse.text() };
        }

        console.log('📦 Response data received');

        return {
            statusCode: finerworksResponse.status,
            headers,
            body: JSON.stringify(responseData)
        };

    } catch (error) {
        console.error('❌ Function error:', error);
        
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