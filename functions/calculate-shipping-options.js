// netlify/functions/calculate-shipping-options.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-08-27.basil'
});

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

    try {
        const { checkout_session_id, shipping_details } = JSON.parse(event.body);
        
        // Validate shipping details
        if (!shipping_details?.address?.country) {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    type: 'reject',
                    errorMessage: 'Please provide a valid shipping address'
                })
            };
        }

        const country = shipping_details.address.country.toUpperCase();
        const allowedCountries = ['US', 'CA', 'TW', 'GB', 'AU'];
        
        if (!allowedCountries.includes(country)) {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    type: 'reject',
                    errorMessage: 'Sorry, we don\'t ship to this country yet'
                })
            };
        }

        // Calculate shipping options based on country
        let shippingOptions;
        if (country === 'US') {
            shippingOptions = [
                { shipping_rate: 'shr_1SB6Nn7iRKbAsUAgKtbaJiJv' },
                { shipping_rate: 'shr_1SB6NM7iRKbAsUAgQbsfDSWl' },
                { shipping_rate: 'shr_1SB6Mo7iRKbAsUAgoS492PyL' }
            ];
        } else {
            shippingOptions = [
                { shipping_rate: 'shr_1SB6Jt7iRKbAsUAgkz0FedRW' }
            ];
        }

        // Use the CORRECT API method with collected_information wrapper
        await stripe.checkout.sessions.update(checkout_session_id, {
            collected_information: {
                shipping_details: shipping_details
            },
            shipping_options: shippingOptions
        });

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ type: 'accept' })
        };

    } catch (error) {
        console.error('Shipping calculation error:', error);
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                type: 'reject',
                errorMessage: 'Unable to calculate shipping for this address'
            })
        };
    }
};