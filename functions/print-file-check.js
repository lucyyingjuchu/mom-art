// functions/print-file-check.js
//
// Health check for the private print files: signs the S3 link for one print
// file the same way submit-order.js does for Finerworks, asks S3 for it
// (HEAD, nothing downloaded) and reports only whether it worked - the signed
// link itself is never returned.
//   GET /.netlify/functions/print-file-check
//   -> { keys_set: true, signed_status: 200 }   all good
//      { keys_set: false, ... }                   S3_PRINT_* env vars missing

process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'unused';
const { presignS3Url } = require('./submit-order');
const PRINTS = require('../data/finerworks_ready_artworks.json');

exports.handler = async () => {
    const reply = body => ({ statusCode: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) });
    const accessKeyId = process.env.S3_PRINT_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_PRINT_SECRET_ACCESS_KEY;
    const url = Object.values(PRINTS)
        .map(p => p.finerworks_image?.finerworks_api_object?.private_hires_uri)
        .find(u => u && u.includes('.amazonaws.com/'));
    if (!accessKeyId || !secretAccessKey) return reply({ keys_set: false });
    try {
        const signed = presignS3Url(url, { accessKeyId, secretAccessKey, expires: 60, method: 'HEAD' });
        const res = await fetch(signed, { method: 'HEAD' });
        return reply({ keys_set: true, signed_status: res.status });
    } catch (err) {
        return reply({ keys_set: true, error: err.message });
    }
};
