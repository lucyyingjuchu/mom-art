// functions/pinterest-feed.js
//
// RSS feeds Pinterest auto-publishes from, one per board:
//   https://xiaoranart.com/pinterest/landscape.xml
//   https://xiaoranart.com/pinterest/flower-bird.xml
//   https://xiaoranart.com/pinterest/abstract.xml
//   https://xiaoranart.com/pinterest/calligraphy.xml
// Each feed lists that board's artworks whose release time has passed (see
// functions/_shared/pinterest.js), so Pins go out a few a day instead of all at
// once, and artworks added to the site later join the queue on their own.

const P = require('./_shared/pinterest');
const artworks = require('../data/artworks.json');
const schedule = require('../data/pinterest_schedule.json');

const MAX_ITEMS = 100;
const xml = s => String(s).replace(/[<>&'"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));

exports.handler = async (event) => {
    const m = /([a-z-]+)(?:\.xml)?\/?$/.exec(event.path || '');
    const board = m && P.BOARDS[m[1]] ? m[1] : null;
    if (!board) {
        return { statusCode: 404, headers: { 'Content-Type': 'text/plain' }, body: `Feeds: ${Object.keys(P.BOARDS).map(b => `/pinterest/${b}.xml`).join(' ')}` };
    }

    const now = Date.now();
    const when = P.releases(artworks, schedule);
    const items = artworks
        .filter(a => P.isPublic(a) && when.has(a.id) && when.get(a.id) <= now && P.boardKey(a) === board)
        .sort((x, y) => when.get(y.id) - when.get(x.id))
        .slice(0, MAX_ITEMS);

    const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>${xml(P.BOARDS[board])} — Yuan Chih-Jin</title>
<link>${P.SITE}/</link>
<atom:link href="${P.SITE}/pinterest/${board}.xml" rel="self" type="application/rss+xml"/>
<description>${xml(`${P.BOARDS[board]} by Taiwanese artist Yuan Chih-Jin (Xiaoran 曉然)`)}</description>
<language>en</language>
${items.map(a => `<item>
<title>${xml(P.title(a))}</title>
<link>${xml(P.link(a, 'rss'))}</link>
<guid isPermaLink="false">${xml(a.id)}</guid>
<pubDate>${new Date(when.get(a.id)).toUTCString()}</pubDate>
<description>${xml(P.description(a))}</description>
<enclosure url="${xml(P.imageUrl(a))}" type="image/jpeg" length="0"/>
<media:content url="${xml(P.imageUrl(a))}" medium="image" type="image/jpeg"/>
</item>`).join('\n')}
</channel>
</rss>
`;
    return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
        body
    };
};
