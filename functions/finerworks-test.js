// functions/finerworks-test.js
// Simple test function to verify Netlify functions are working

exports.handler = async (event, context) => {
    console.log('🧪 Test function called');
    
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

    // Test endpoint
    if (event.httpMethod === 'GET') {
        const testData = {
            message: '✅ Netlify function is working perfectly!',
            timestamp: new Date().toISOString(),
            environment: {
                hasWebApiKey: !!process.env.FINERWORKS_WEB_API_KEY,
                hasAppKey: !!process.env.FINERWORKS_APP_KEY,
                nodeVersion: process.version,
                netlifyContext: context.clientContext || 'No context'
            },
            request: {
                method: event.httpMethod,
                path: event.path,
                queryParams: event.queryStringParameters
            }
        };

        console.log('✅ Test successful:', testData);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(testData)
        };
    }

    return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' })
    };
};