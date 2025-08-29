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
        const { customerInfo, cartItems } = JSON.parse(event.body);
        
        // Calculate total
        const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        console.log('Creating checkout session for:', customerInfo.email, 'Total:', total);

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

        // Create checkout session with customer data pre-filled
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment',
            
            // Pre-fill customer information
            customer_email: customerInfo.email,
            
            // Collect shipping address (will be pre-filled from your form)
            shipping_address_collection: {
                allowed_countries: ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'IT', 'ES', 'NL', 'SE', 'NO', 'SG', 'TW', 'JP', 'KR']
            },
            
            // Store order data in metadata for fulfillment
            metadata: {
                customer_data: JSON.stringify(customerInfo),
                cart_data: JSON.stringify(cartItems),
                order_id: 'XIAORAN_' + Date.now()
            },
            
            // Success and cancel URLs
            success_url: `${process.env.URL || 'https://xiaoranart.com'}/order-success.html?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.URL || 'https://xiaoranart.com'}/checkout.html`
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