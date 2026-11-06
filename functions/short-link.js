// functions/short-link.js
//
// Short artwork links for Reel captions and the share button: xiaoranart.com/w/<code>
// (codes are worked out in js/short-code.js).
// People go straight to the artwork. Facebook, LINE and similar services read the
// page behind a link for its preview, so they get that artwork's title and picture
// instead of the site's general preview.

const artworks = require('../data/artworks.json');
const { findByCode } = require('../js/short-code.js');

const SITE = 'https://xiaoranart.com';
const PREVIEW_BOTS = /facebookexternalhit|facebot|twitterbot|linkedinbot|whatsapp|telegrambot|slackbot|discordbot|\bline\b/i;
const html = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const go = location => ({ statusCode: 302, headers: { Location: location, 'Cache-Control': 'no-store' }, body: '' });

exports.handler = async (event) => {
    const code = (/\/w\/([0-9a-f]{5,12})\/?$/i.exec(event.path || '') || [])[1];
    const artwork = code && findByCode(code, artworks);
    if (!artwork) return go('/');

    // No utm tags: Analytics already shows where a visitor came from (Facebook, LINE …),
    // and the same link is used in captions and shared by visitors.
    const target = `/?artwork=${encodeURIComponent(artwork.id)}`;
    if (!PREVIEW_BOTS.test(event.headers?.['user-agent'] || '')) return go(target);

    const image = SITE + '/' + String(artwork.imageHigh || artwork.image).replace(/^\.?\//, '');
    return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
        body: `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8">
<title>${html(artwork.title)}｜袁之靜</title>
<meta property="og:type" content="article">
<meta property="og:site_name" content="曉然文化藝術">
<meta property="og:title" content="${html(artwork.title)}｜袁之靜">
<meta property="og:description" content="${html(artwork.description)}">
<meta property="og:image" content="${html(image)}">
<meta property="og:url" content="${SITE}/w/${code.toLowerCase()}">
</head><body><a href="${html(SITE + target)}">${html(artwork.title)}</a></body></html>`
    };
};
