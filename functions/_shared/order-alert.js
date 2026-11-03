// Emails the studio about a paid print order, from the server.
//
// EmailJS blocks server calls until "Allow EmailJS API for non-browser applications"
// is on (Account > Security). Netlify env vars needed, besides the existing
// EMAILJS_SERVICE_ID and EMAILJS_PUBLIC_KEY:
//   EMAILJS_PRIVATE_KEY          Account > API keys
//   EMAILJS_ALERT_TEMPLATE_ID    a template with {{subject}} and {{message}}
// A failed alert is logged and never stops the order.

function alertsConfigured() {
    const e = process.env;
    return !!(e.EMAILJS_SERVICE_ID && e.EMAILJS_PUBLIC_KEY && e.EMAILJS_PRIVATE_KEY && e.EMAILJS_ALERT_TEMPLATE_ID);
}

async function sendOrderAlert(subject, message) {
    console.log('Order alert:', subject);
    if (!alertsConfigured()) {
        console.error('Order alert NOT emailed - EMAILJS_PRIVATE_KEY or EMAILJS_ALERT_TEMPLATE_ID not set');
        return false;
    }
    try {
        const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(3000),
            body: JSON.stringify({
                service_id: process.env.EMAILJS_SERVICE_ID,
                template_id: process.env.EMAILJS_ALERT_TEMPLATE_ID,
                user_id: process.env.EMAILJS_PUBLIC_KEY,
                accessToken: process.env.EMAILJS_PRIVATE_KEY,
                template_params: { subject, message }
            })
        });
        if (!res.ok) console.error('Order alert failed:', res.status, await res.text());
        return res.ok;
    } catch (err) {
        console.error('Order alert failed:', err.message);
        return false;
    }
}

module.exports = { sendOrderAlert, alertsConfigured };
