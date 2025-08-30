// netlify/functions/create-checkout-session.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

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
                unit_amount: Math.round(item.price * 100) // Convert to cents
            },
            quantity: item.quantity
        }));

        // Create minimal cart data for metadata (under 500 chars)
        const minimalCartData = cartItems.map(item => ({
            id: item.artworkId,
            q: item.quantity,
            p: item.price,
            w: item.width_inches,
            h: item.height_inches
        }));

        // Create checkout session - let Stripe collect all customer data
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment',
            
            // Let Stripe collect shipping address and show shipping options
            shipping_address_collection: {
                allowed_countries: ['US', 'CA', 'TW', 'GB', 'AU']
            },
            
            // Configure shipping options (you'll need to create these rates in Stripe Dashboard first)
            shipping_options: [
                {
                    shipping_rate: 'shr_1S1cpp4OFXg8iiC4vaA3fYq5', // Replace with your actual Stripe shipping rate ID
                },
                {
                    shipping_rate: 'shr_1S1cqW4OFXg8iiC4eIIuG3qH', // Replace with your actual Stripe shipping rate ID  
                },
                {
                    shipping_rate: 'shr_1S1d8J4OFXg8iiC4uCdQakec', // Replace with your actual Stripe shipping rate ID
                }
            ],

            // Add processing time message
            custom_text: {
                submit: {
                    message: 'Processing time: Your artwork will be printed and prepared for shipping within 48 hours of order confirmation. Delivery time depends on your selected shipping method.'
                }
            },
            
            // Store minimal cart data in metadata
            metadata: {
                cart_data: JSON.stringify(minimalCartData),
                order_id: 'XIAORAN_' + Date.now(),
                item_count: cartItems.length.toString()
            },
            
            // Success and cancel URLs
            success_url: `${process.env.URL || 'https://xiaoranart.com'}/order_success_page.html?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.URL || 'https://xiaoranart.com'}/#gallery`
        });

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                checkout_url: session.url,
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