// functions/print-file-check.js
//
// Health check for the private print files: signs the S3 link for one print
// file the same way submit-order.js does for Finerworks, asks S3 for it
// (HEAD, nothing downloaded) and reports only whether it worked - the signed
// link itself is never returned.
//   GET /.netlify/functions/print-file-check          (one file)
//   GET /.netlify/functions/print-file-check?sized=1  (also every size's print file)
//   -> { keys_set: true, signed_status: 200 }   all good
//      { keys_set: false, ... }                   S3_PRINT_* env vars missing

process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'unused';
const { presignS3Url } = require('./submit-order');
const PRINTS = require('../data/finerworks_ready_artworks.json');

const S3 = 'https://xiaoran-raw-artworks.s3.us-east-1.amazonaws.com/';

exports.handler = async (event) => {
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
        // ?sized=1 also checks that every size's own print file is in the bucket
        const out = { keys_set: true, signed_status: res.status };
        if (event && event.queryStringParameters && event.queryStringParameters.sized) {
            const keys = Object.values(PRINTS).flatMap(p => (p.recommended_sizes || []).map(s => s.file_key).filter(Boolean));
            const missing = [];
            for (let i = 0; i < keys.length; i += 20) {
                const batch = keys.slice(i, i + 20);
                const codes = await Promise.all(batch.map(k => fetch(presignS3Url(S3 + k, { accessKeyId, secretAccessKey, expires: 60, method: 'HEAD' }), { method: 'HEAD' }).then(r => r.status).catch(() => 0)));
                codes.forEach((c, j) => { if (c !== 200) missing.push(batch[j]); });
            }
            out.sized_files = keys.length;
            out.sized_missing = missing.length;
            out.first_missing = missing.slice(0, 5);
        }
        return reply(out);
    } catch (err) {
        return reply({ keys_set: true, error: err.message });
    }
};
