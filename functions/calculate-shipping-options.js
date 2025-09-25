// netlify/functions/calculate-shipping-options.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-08-27.basil'
});

// netlify/functions/calculate-shipping-options.js
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
        
        console.log('Processing shipping for:', shipping_details?.address?.country);
        
        // Validate the shipping details
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

        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY, {
            apiVersion: '2025-08-27.basil'
        });

        // Use your existing Stripe shipping rate IDs based on country
        let shippingOptions;
        if (country === 'US') {
            shippingOptions = [
                { shipping_rate: 'YOUR_US_ECONOMY_RATE_ID' },    // Replace with your actual ID
                { shipping_rate: 'YOUR_US_STANDARD_RATE_ID' },   // Replace with your actual ID
                { shipping_rate: 'YOUR_US_EXPRESS_RATE_ID' },    // Replace with your actual ID
            ];
        } else {
            shippingOptions = [
                { shipping_rate: 'YOUR_INTERNATIONAL_RATE_ID' }, // Replace with your actual ID
            ];
        }

        // Update the checkout session with your pre-configured shipping rates
        await stripe.checkout.sessions.modify(checkout_session_id, {
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

function validateShippingDetails(shipping_details) {
    const allowedCountries = ['US', 'CA', 'TW', 'GB', 'AU'];
    
    if (!shipping_details.address?.country) {
        return { valid: false, error: 'Please select a country' };
    }
    
    if (!allowedCountries.includes(shipping_details.address.country.toUpperCase())) {
        return { valid: false, error: 'Sorry, we don\'t ship to this country yet' };
    }
    
    if (!shipping_details.address?.line1 || !shipping_details.address?.city) {
        return { valid: false, error: 'Please provide a complete address' };
    }
    
    return { valid: true };
}

function calculateShippingOptions(shipping_details) {
    const country = shipping_details.address.country.toUpperCase();
    
    if (country === 'US') {
        // US Shipping Options
        return [
            {
                shipping_rate_data: {
                    display_name: 'Economy (7-10 business days)',
                    type: 'fixed_amount',
                    fixed_amount: { amount: 1099, currency: 'usd' }, // $10.99
                    delivery_estimate: {
                        minimum: { unit: 'business_day', value: 7 },
                        maximum: { unit: 'business_day', value: 10 }
                    }
                }
            },
            {
                shipping_rate_data: {
                    display_name: 'Standard (2-3 business days)',
                    type: 'fixed_amount',
                    fixed_amount: { amount: 1699, currency: 'usd' }, // $16.99
                    delivery_estimate: {
                        minimum: { unit: 'business_day', value: 2 },
                        maximum: { unit: 'business_day', value: 3 }
                    }
                }
            },
            {
                shipping_rate_data: {
                    display_name: 'Express (1-2 business days)',
                    type: 'fixed_amount',
                    fixed_amount: { amount: 3999, currency: 'usd' }, // $39.99
                    delivery_estimate: {
                        minimum: { unit: 'business_day', value: 1 },
                        maximum: { unit: 'business_day', value: 2 }
                    }
                }
            }
        ];
    } else {
        // International Shipping Options
        return [
            {
                shipping_rate_data: {
                    display_name: 'International Standard (10-20 business days)',
                    type: 'fixed_amount',
                    fixed_amount: { amount: 2799, currency: 'usd' }, // $27.99
                    delivery_estimate: {
                        minimum: { unit: 'business_day', value: 1 },
                        maximum: { unit: 'business_day', value: 5 }
                    }
                }
            }
        ];
    }
}