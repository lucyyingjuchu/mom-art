// netlify/functions/stripe-payment.js
// This handles creating payment intents and processing payments

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event, context) => {
    console.log('💳 Stripe payment function called');

    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle preflight requests
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
        const { action, data } = JSON.parse(event.body);
        console.log('💳 Payment action:', action);

        switch (action) {
            case 'create_payment_intent':
                return await createPaymentIntent(data, headers);
            
            case 'confirm_payment':
                return await confirmPayment(data, headers);
                
            default:
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Invalid action' })
                };
        }

    } catch (error) {
        console.error('❌ Payment function error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Payment processing failed',
                message: error.message 
            })
        };
    }
};

async function createPaymentIntent(data, headers) {
    const { amount, currency = 'usd', customerInfo, orderItems } = data;
    
    console.log('💰 Creating payment intent for:', amount, currency);

    try {
        // Create payment intent with Stripe
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Stripe uses cents
            currency: currency,
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: {
                customer_email: customerInfo.email,
                customer_name: `${customerInfo.firstName} ${customerInfo.lastName}`,
                order_items: JSON.stringify(orderItems.map(item => ({
                    id: item.artworkId,
                    title: item.title,
                    size: item.size,
                    quantity: item.quantity,
                    price: item.price
                }))),
                order_total: amount.toString()
            },
            description: `Art purchase: ${orderItems.length} item(s) from Xiaoran Art Studio`,
            receipt_email: customerInfo.email,
        });

        console.log('✅ Payment intent created:', paymentIntent.id);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                client_secret: paymentIntent.client_secret,
                payment_intent_id: paymentIntent.id
            })
        };

    } catch (error) {
        console.error('❌ Payment intent creation failed:', error);
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
                error: 'Payment intent creation failed',
                message: error.message 
            })
        };
    }
}

async function confirmPayment(data, headers) {
    const { payment_intent_id } = data;
    
    console.log('✅ Confirming payment:', payment_intent_id);

    try {
        // Retrieve the payment intent to check its status
        const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);
        
        if (paymentIntent.status === 'succeeded') {
            console.log('💰 Payment confirmed successful');
            
            // Return success with order details from metadata
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    payment_intent: {
                        id: paymentIntent.id,
                        amount: paymentIntent.amount / 100, // Convert back from cents
                        currency: paymentIntent.currency,
                        status: paymentIntent.status,
                        customer_email: paymentIntent.metadata.customer_email,
                        order_items: JSON.parse(paymentIntent.metadata.order_items)
                    }
                })
            };
        } else {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'Payment not completed',
                    status: paymentIntent.status
                })
            };
        }

    } catch (error) {
        console.error('❌ Payment confirmation failed:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Payment confirmation failed',
                message: error.message 
            })
        };
    }
}