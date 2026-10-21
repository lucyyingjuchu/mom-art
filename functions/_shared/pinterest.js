// functions/_shared/pinterest.js
//
// One place that decides how an artwork becomes a Pinterest Pin: which board it
// goes to, its English title / description / keywords, its image and link, and
// when it is released. Used by
//   - scripts/pinterest-csv.js      (bulk-upload CSV files)
//   - functions/pinterest-feed.js   (the RSS feeds Pinterest auto-publishes from)
//
// Release plan (data/pinterest_schedule.json):
//   csv: ids already uploaded to Pinterest by CSV  -> never in a feed
//   rss: { id: ISO time }                          -> appears in its feed from that time
//   any other public artwork (new works added later) -> queued after the last
//       scheduled one, one every 8 hours, never before the artwork was created
//       (ids are UUIDv7, so the id carries its creation time). This keeps a batch
//       of newly added works from flooding Pinterest on one day.

const SITE = 'https://xiaoranart.com';
const ARTIST = 'Yuan Chih-Jin';
const GAP_MS = 8 * 3600 * 1000;

const BOARDS = {
    landscape: 'Chinese Ink Landscape Painting',
    'flower-bird': 'Chinese Flower & Bird Painting',
    abstract: 'Contemporary Ink Abstraction',
    calligraphy: 'Chinese Calligraphy Art'
};
// Order boards rotate in when spreading Pins out
const BOARD_ORDER = ['calligraphy', 'flower-bird', 'abstract', 'landscape'];

function subjects(a) {
    return new Set(Array.isArray(a.subjects) ? a.subjects : []);
}

// One board per Pin, by what dominates the work. Landscapes that carry a
// calligraphy poem stay on the landscape board; the calligraphy board is for works
// that are mainly writing. Abstract style wins over subject.
function boardKey(a) {
    const s = subjects(a);
    const has = (...xs) => xs.some(x => s.has(x));
    const scenery = has('landscape', 'flowingclouds', 'waterfall', '山水', '煙雲');
    const title = `${a.title || ''} ${a.titleEn || ''}`.toLowerCase();
    if (s.has('calligraphy') && !scenery && !has('flowers', 'bamboo', 'abstract')) return 'calligraphy';
    if (s.has('abstract')) return 'abstract';
    if ((has('flowers', 'bamboo', '花鳥') && !s.has('landscape')) || /bird|peacock|鳥/.test(title)) return 'flower-bird';
    return 'landscape';
}
const boardName = a => BOARDS[boardKey(a)];

function isPublic(a) {
    if (!a || a.hidden === true || a.hidden === 'true') return false;
    if (String(a.status || '').toLowerCase() === 'draft') return false;
    if (!(a.title || '').trim()) return false;
    const img = a.image || '';
    return !!img.trim() && !img.includes('placeholder');
}

const absUrl = p => `${SITE}/${String(p).replace(/^\.?\//, '')}`;
const imageUrl = a => absUrl(a.imageHigh || a.image);

function clip(text, n) {
    text = String(text || '').split(/\s+/).filter(Boolean).join(' ');
    if (text.length <= n) return text;
    const cut = text.slice(0, n - 1);
    const sp = cut.lastIndexOf(' ');
    return (sp > n * 0.6 ? cut.slice(0, sp) : cut) + '…';
}

function kindPhrase(a) {
    return {
        calligraphy: 'Chinese calligraphy',
        'flower-bird': 'Chinese bird-and-flower ink painting',
        abstract: 'contemporary Chinese ink painting',
        landscape: 'Chinese ink landscape painting'
    }[boardKey(a)];
}

function title(a) {
    const name = (a.titleEn || '').trim() || (a.title || '').trim();
    const tail = boardKey(a) === 'calligraphy' ? ' | Chinese Calligraphy' : ' | Chinese Ink Painting';
    return clip(name, 100 - tail.length) + tail;
}

function description(a) {
    const parts = [];
    const poem = (a.descriptionEn || '').trim();
    const name = (a.titleEn || a.title || '').trim();
    if (poem && poem.replace(/\.$/, '').toLowerCase() !== name.toLowerCase()) parts.push(clip(poem, 220));
    const year = /^\d+$/.test(String(a.year || '')) ? a.year : '';
    parts.push(`Original ${kindPhrase(a)} by Taiwanese artist ${ARTIST} (Xiaoran 曉然)${year ? `, ${year}.` : '.'}`);
    const size = a.heightCm && a.widthCm ? `${a.heightCm} × ${a.widthCm} cm` : '';
    const details = [(a.formatEn || '').trim(), size].filter(Boolean).join(', ');
    if (details) parts.push(details[0].toUpperCase() + details.slice(1) + '.');
    if (a.printFile) parts.push('Fine art giclée prints available.');
    parts.push('See the full work at xiaoranart.com.');
    return clip(parts.join(' '), 500);
}

function keywords(a) {
    const s = subjects(a);
    const kw = ['chinese ink painting', 'ink wash painting', 'asian art', 'wall art', ARTIST];
    const extra = {
        calligraphy: boardKey(a) === 'calligraphy' ? ['chinese calligraphy', 'calligraphy art'] : ['painting with calligraphy'],
        flowers: ['flower painting', 'botanical art'],
        bamboo: ['bamboo painting'],
        landscape: ['mountain landscape', 'shan shui'],
        waterfall: ['waterfall painting'],
        flowingclouds: ['misty mountains'],
        moon: ['moon art'],
        abstract: ['abstract ink art']
    };
    for (const [k, v] of Object.entries(extra)) if (s.has(k)) kw.push(...v);
    return [...new Map(kw.map(k => [k.toLowerCase(), k])).values()].join(', ');
}

const link = (a, campaign = 'pins') =>
    `${SITE}/?artwork=${encodeURIComponent(a.id)}&utm_source=pinterest&utm_medium=social&utm_campaign=${campaign}`;

// Newest and featured first within each board, every board spread evenly across
// the whole run so any stretch of Pins mixes all boards.
function order(artworks) {
    const yr = a => (/^\d+$/.test(String(a.year || '')) ? +a.year : 0);
    const sorted = [...artworks].sort((x, y) => (x.featured ? 0 : 1) - (y.featured ? 0 : 1) || yr(y) - yr(x));
    const byBoard = {};
    sorted.forEach(a => (byBoard[boardKey(a)] = byBoard[boardKey(a)] || []).push(a));
    const slots = [];
    BOARD_ORDER.forEach((b, rank) => {
        const items = byBoard[b] || [];
        items.forEach((a, i) => slots.push([(i + 0.5) / items.length, rank, a]));
    });
    return slots.sort((p, q) => p[0] - q[0] || p[1] - q[1]).map(t => t[2]);
}

// Creation time from a UUIDv7 id (first 48 bits = Unix ms); null for other ids
function createdAt(id) {
    const hex = String(id || '').replace(/-/g, '');
    if (hex.length !== 32 || hex[12] !== '7') return null;
    return parseInt(hex.slice(0, 12), 16);
}

// Map of id -> release time (ms) for every public artwork that goes out by feed
function releases(artworks, schedule) {
    const csv = new Set(schedule.csv || []);
    const planned = schedule.rss || {};
    const out = new Map();
    let last = 0;
    for (const [id, t] of Object.entries(planned)) {
        const ms = Date.parse(t);
        out.set(id, ms);
        last = Math.max(last, ms);
    }
    const extra = artworks
        .filter(a => isPublic(a) && !csv.has(a.id) && !(a.id in planned))
        .sort((x, y) => (createdAt(x.id) || 0) - (createdAt(y.id) || 0) || String(x.id).localeCompare(String(y.id)));
    for (const a of extra) {
        const t = Math.max(createdAt(a.id) || 0, last + GAP_MS);
        out.set(a.id, t);
        last = t;
    }
    return out;
}

module.exports = {
    SITE, BOARDS, BOARD_ORDER, GAP_MS,
    subjects, boardKey, boardName, isPublic, imageUrl, title, description, keywords, link,
    order, createdAt, releases
};
