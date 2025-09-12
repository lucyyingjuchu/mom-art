// netlify/functions/send-email.js
// Using Nodemailer instead of EmailJS for better server-side support

const nodemailer = require('nodemailer');

exports.handler = async (event, context) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            body: ''
        };
    }

    try {
        // Parse the request body
        const data = JSON.parse(event.body);
        console.log('Received inquiry data:', data);

        // Get email credentials from environment variables
        const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
        const smtpPort = process.env.SMTP_PORT || 587;
        const smtpUser = process.env.SMTP_USER; // Your Gmail or email
        const smtpPass = process.env.SMTP_PASS; // App password
        const recipientEmail = process.env.RECIPIENT_EMAIL || smtpUser;

        if (!smtpUser || !smtpPass) {
            console.error('Missing SMTP credentials');
            return {
                statusCode: 500,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    error: 'Server configuration error',
                    details: 'Email credentials not configured'
                })
            };
        }

        // Create transporter
        const transporter = nodemailer.createTransporter({
            host: smtpHost,
            port: smtpPort,
            secure: false, // true for 465, false for other ports
            auth: {
                user: smtpUser,
                pass: smtpPass
            }
        });

        // Determine language for email template
        const isZh = data.analytics?.language === 'zh';
        const subject = isZh ? 
            `新作品詢價 - ${data.artwork.title}` : 
            `New Artwork Inquiry - ${data.artwork.title}`;

        // Create email HTML
        const emailHtml = createEmailHtml(data, isZh);

        // Email options
        const mailOptions = {
            from: `"Xiaoran Art Inquiry" <${smtpUser}>`,
            to: recipientEmail,
            subject: subject,
            html: emailHtml,
            replyTo: data.customer.email
        };

        console.log('Sending email...');
        const result = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', result.messageId);

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                success: true, 
                message: 'Email sent successfully',
                messageId: result.messageId
            })
        };

    } catch (error) {
        console.error('Function error:', error);
        
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                error: 'Failed to send email',
                details: error.message
            })
        };
    }
};

// Create email HTML template
function createEmailHtml(data, isZh) {
    const labels = isZh ? {
        customerInfo: '客戶資訊',
        name: '姓名',
        email: '電子郵件',
        phone: '電話',
        country: '國家',
        artworkInfo: '作品資訊',
        title: '作品名稱',
        year: '創作年份',
        size: '尺寸',
        id: '作品ID',
        shippingInfo: '配送資訊',
        address: '配送地址',
        notes: '備註',
        additionalInfo: '其他資訊',
        timestamp: '詢價時間',
        language: '語言'
    } : {
        customerInfo: 'Customer Information',
        name: 'Name',
        email: 'Email',
        phone: 'Phone',
        country: 'Country',
        artworkInfo: 'Artwork Information',
        title: 'Title',
        year: 'Year',
        size: 'Size',
        id: 'ID',
        shippingInfo: 'Shipping Information',
        address: 'Address',
        notes: 'Notes',
        additionalInfo: 'Additional Information',
        timestamp: 'Inquiry Time',
        language: 'Language'
    };

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #2c3e50; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
                .content { background: #f8f9fa; padding: 20px; }
                .section { background: white; margin: 15px 0; padding: 15px; border-radius: 6px; border-left: 4px solid #3498db; }
                .section h3 { margin-top: 0; color: #2c3e50; }
                .info-row { margin: 8px 0; }
                .label { font-weight: bold; color: #555; }
                .value { margin-left: 10px; }
                .footer { background: #34495e; color: white; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2 style="margin: 0;">${isZh ? '新的作品詢價' : 'New Artwork Inquiry'}</h2>
                </div>
                
                <div class="content">
                    <div class="section">
                        <h3>${labels.customerInfo}</h3>
                        <div class="info-row"><span class="label">${labels.name}:</span><span class="value">${data.customer.name}</span></div>
                        <div class="info-row"><span class="label">${labels.email}:</span><span class="value">${data.customer.email}</span></div>
                        <div class="info-row"><span class="label">${labels.phone}:</span><span class="value">${data.customer.phone}</span></div>
                        <div class="info-row"><span class="label">${labels.country}:</span><span class="value">${data.customer.country}</span></div>
                    </div>

                    <div class="section">
                        <h3>${labels.artworkInfo}</h3>
                        <div class="info-row"><span class="label">${labels.title}:</span><span class="value">${data.artwork.title}</span></div>
                        <div class="info-row"><span class="label">${labels.year}:</span><span class="value">${data.artwork.year}</span></div>
                        <div class="info-row"><span class="label">${labels.size}:</span><span class="value">${data.artwork.size}</span></div>
                        <div class="info-row"><span class="label">${labels.id}:</span><span class="value">${data.artwork.id}</span></div>
                    </div>

                    <div class="section">
                        <h3>${labels.shippingInfo}</h3>
                        <div class="info-row"><span class="label">${labels.address}:</span><div style="margin-top: 5px; padding: 10px; background: #f1f2f6; border-radius: 4px;">${data.shipping.address}</div></div>
                        ${data.shipping.note ? `<div class="info-row"><span class="label">${labels.notes}:</span><div style="margin-top: 5px; padding: 10px; background: #f1f2f6; border-radius: 4px;">${data.shipping.note}</div></div>` : ''}
                    </div>

                    <div class="section">
                        <h3>${labels.additionalInfo}</h3>
                        <div class="info-row"><span class="label">${labels.timestamp}:</span><span class="value">${new Date(data.analytics.timestamp).toLocaleString()}</span></div>
                        <div class="info-row"><span class="label">${labels.language}:</span><span class="value">${data.analytics.language}</span></div>
                    </div>
                </div>

                <div class="footer">
                    <p style="margin: 0;">${isZh ? '來自曉然文化藝術網站的詢價' : 'Inquiry from Xiaoran Cultural Arts website'}</p>
                </div>
            </div>
        </body>
        </html>
    `;
}