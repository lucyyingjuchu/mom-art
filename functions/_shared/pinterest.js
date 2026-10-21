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
//   board: { id: board key }                       -> board a Pin was published on; kept
//       even if the work is re-tagged later, so it never shows up in a second feed
//   any other public artwork (new works added later) -> queued after the last
//       scheduled one, one every 8 hours, never before the artwork was created
//       (ids are UUIDv7, so the id carries its creation time). This keeps a batch
//       of newly added works from flooding Pinterest on one day.

const SITE = 'https://xiaoranart.com';
const ARTIST = 'Yuan Chih-Jin';
const GAP_MS = 8 * 3600 * 1000;

// One board per gallery tab (題材). Keys are the feed names (/pinterest/<key>.xml).
const BOARDS = {
    landscape: 'Chinese Ink Landscape Painting',      // 山水
    waterfall: 'Chinese Ink Waterfall Painting',      // 瀑布
    clouds: 'Clouds & Mist Ink Painting',             // 煙雲
    'flower-bird': 'Chinese Flower & Bird Painting',  // 花鳥
    moon: 'Moon in Chinese Ink Painting',             // 明月
    abstract: 'Contemporary Ink Abstraction',         // 抽象
    calligraphy: 'Chinese Calligraphy Art'            // 書法
};
// Order boards rotate in when spreading Pins out
const BOARD_ORDER = ['calligraphy', 'moon', 'abstract', 'flower-bird', 'waterfall', 'clouds', 'landscape'];

// artworks.json subject -> board
const SUBJECT_BOARD = {
    landscape: 'landscape', waterfall: 'waterfall', flowingclouds: 'clouds',
    flowers: 'flower-bird', moon: 'moon', abstract: 'abstract', calligraphy: 'calligraphy'
};
// A Pin goes on one board. When a work is under several gallery tabs, the more
// specific motif wins, since that is what people search Pinterest for.
const BOARD_PRIORITY = ['calligraphy', 'moon', 'waterfall', 'flowingclouds', 'abstract', 'flowers', 'landscape'];

function subjects(a) {
    return new Set(Array.isArray(a.subjects) ? a.subjects : []);
}

// Pins that already went out keep the board they were published on
// (data/pinterest_schedule.json "board"), so a later re-tag never re-pins them.
let BOARD_OVERRIDES = {};
function setBoardOverrides(map) { BOARD_OVERRIDES = map || {}; }

function boardKey(a) {
    if (BOARD_OVERRIDES[a.id] && BOARDS[BOARD_OVERRIDES[a.id]]) return BOARD_OVERRIDES[a.id];
    const s = subjects(a);
    const first = BOARD_PRIORITY.find(k => s.has(k));
    return first ? SUBJECT_BOARD[first] : 'landscape';
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
        landscape: 'Chinese ink landscape painting',
        waterfall: 'Chinese ink painting of a waterfall',
        clouds: 'Chinese ink painting of clouds and mist',
        moon: 'Chinese ink painting of the moon'
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
        flowers: ['flower painting', 'bird and flower painting'],
        landscape: ['mountain landscape', 'shan shui'],
        waterfall: ['waterfall painting'],
        flowingclouds: ['misty mountains'],
        moon: ['moon art', 'moon painting'],
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
    SITE, BOARDS, BOARD_ORDER, GAP_MS, setBoardOverrides,
    subjects, boardKey, boardName, isPublic, imageUrl, title, description, keywords, link,
    order, createdAt, releases
};
