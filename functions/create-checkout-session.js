// netlify/functions/create-checkout-session.js
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

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { cartItems } = JSON.parse(event.body);
        
        console.log('Function started successfully');
        
        // Calculate total
        const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        console.log('Creating checkout session for cart total:', total);

        // Create line items for Stripe
        const lineItems = cartItems.map(item => ({
            price_data: {
                currency: 'usd',
                product_data: {
                    name: item.title,
                    description: `${item.size} print`,
                    images: [item.image]
                },
                unit_amount: Math.round(item.price * 100)
            },
            quantity: item.quantity
        }));

        // Create minimal cart data for metadata
        const minimalCartData = cartItems.map(item => ({
            id: item.artworkId,
            q: item.quantity,
            p: item.price,
            w: item.width_inches,
            h: item.height_inches
        }));

        // Create checkout session for embedded checkout
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment',
            
            ui_mode: 'embedded',
            
            shipping_address_collection: {
                allowed_countries: ['US', 'CA', 'TW', 'GB', 'AU']
            },

            // Dummy shipping option - will be replaced by calculate-shipping-options

            shipping_options: [
                { shipping_rate: 'shr_1SB6Nn7iRKbAsUAgKtbaJiJv' },
                { shipping_rate: 'shr_1SB6NM7iRKbAsUAgQbsfDSWl' },
                { shipping_rate: 'shr_1SB6Mo7iRKbAsUAgoS492PyL' },
                { shipping_rate: 'shr_1SB6Jt7iRKbAsUAgkz0FedRW' }
            ],

            custom_text: {
                shipping_address: {
                    message: 'Processing time: Your artwork will be printed in around 2-3 business days, then shipped via your selected method.'
                }
            },
            
            metadata: {
                cart_data: JSON.stringify(minimalCartData),
                order_id: 'XIAORAN_' + Date.now(),
                item_count: cartItems.length.toString()
            },
            
            return_url: `${process.env.URL || 'https://xiaoranart.com'}/order_success_page.html?session_id={CHECKOUT_SESSION_ID}`,
        });

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                client_secret: session.client_secret,
                session_id: session.id
            })
        };

    } catch (error) {
        console.error('Checkout session creation failed:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Checkout session creation failed',
                message: error.message 
            })
        };
    }
};