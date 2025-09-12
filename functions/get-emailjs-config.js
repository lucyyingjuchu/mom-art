// netlify/functions/get-emailjs-config.js
// Provides EmailJS configuration securely

exports.handler = async (event, context) => {
    return {
        statusCode: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            serviceId: process.env.EMAILJS_SERVICE_ID,
            publicKey: process.env.EMAILJS_PUBLIC_KEY
        })
    };
};