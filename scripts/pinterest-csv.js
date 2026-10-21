#!/usr/bin/env node
// Build a Pinterest bulk-upload CSV from data/artworks.json.
//
// Every public artwork becomes one Pin (real artwork image, English title and
// description, board by dominant subject, link to the artwork on xiaoranart.com),
// with publish dates spread 3 a day at 9am / 3pm / 9pm US Eastern.
// The Pin wording and board rules live in functions/_shared/pinterest.js, shared
// with the RSS feeds.
//
//   node scripts/pinterest-csv.js --start 2026-10-22 --batch 87 --out pins.csv
//   node scripts/pinterest-csv.js --ids ids.txt --out pins.csv   # just these artworks
//
// Upload in Pinterest (desktop): profile menu ⌄ -> Settings -> Import content ->
// Upload .csv. Afterwards add the uploaded ids to "csv" in
// data/pinterest_schedule.json so the RSS feeds never pin them a second time.

const fs = require('fs');
const path = require('path');
const P = require('../functions/_shared/pinterest');

const SLOTS_UTC = [13, 19, 25];   // 25 = 01:00 UTC the next day (9pm Eastern)

function arg(name, fallback) {
    const i = process.argv.indexOf(`--${name}`);
    return i > -1 ? process.argv[i + 1] : fallback;
}

const root = path.join(__dirname, '..');
const artworks = JSON.parse(fs.readFileSync(path.join(root, 'data/artworks.json'), 'utf8')).filter(P.isPublic);
const schedule = JSON.parse(fs.readFileSync(path.join(root, 'data/pinterest_schedule.json'), 'utf8'));

let rows;
const idsFile = arg('ids');
if (idsFile) {
    const want = fs.readFileSync(idsFile, 'utf8').split(/\s+/).filter(Boolean);
    const byId = new Map(artworks.map(a => [a.id, a]));
    rows = want.map(id => byId.get(id)).filter(Boolean);
} else {
    const handled = new Set([...(schedule.csv || []), ...Object.keys(schedule.rss || {})]);
    rows = P.order(artworks.filter(a => !handled.has(a.id)));
}
const cap = +arg('batch', 0);
if (cap) rows = rows.slice(0, cap);

const start = arg('start');
const dates = rows.map((_, i) => {
    if (!start) return '';
    const day = Math.floor(i / SLOTS_UTC.length), h = SLOTS_UTC[i % SLOTS_UTC.length];
    const t = new Date(Date.parse(`${start}T00:00:00Z`) + (day * 24 + h) * 3600e3);
    return t.toISOString().slice(0, 19);
});

const esc = v => (/[",\n]/.test(v) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
const lines = [['Title', 'Media URL', 'Pinterest board', 'Thumbnail', 'Description', 'Link', 'Publish date', 'Keywords']];
rows.forEach((a, i) => lines.push([P.title(a), P.imageUrl(a), P.boardName(a), '', P.description(a), P.link(a), dates[i], P.keywords(a)]));
const out = arg('out', 'pinterest_pins.csv');
fs.writeFileSync(out, lines.map(r => r.map(esc).join(',')).join('\r\n') + '\r\n');
fs.writeFileSync(out.replace(/\.csv$/, '') + '_ids.txt', rows.map(a => a.id).join('\n') + '\n');

const counts = {};
rows.forEach(a => (counts[P.boardName(a)] = (counts[P.boardName(a)] || 0) + 1));
console.error(`${rows.length} pins -> ${out}`, counts);
