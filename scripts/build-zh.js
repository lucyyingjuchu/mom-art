// Builds the Chinese page /zh/index.html from the English index.html.
// Runs on every Netlify deploy (see netlify.toml [build] command).
// Only the <head> SEO text, <html lang> and the static <h1> differ;
// everything else (gallery, data, scripts) is shared, and portfolio.js
// picks the language from the URL path.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

const SITE = 'https://xiaoranart.com';
const TITLE = '袁之靜（曉然）｜水墨畫・書法官方網站';
const DESC = '袁之靜（號曉然）官方網站：台中水墨畫家、書法家，四十餘年詩書畫印創作。原作與藝術微噴印刷品。';

// [pattern, replacement] — the build fails loudly if any pattern is missing,
// so a later edit to index.html can't silently break the Chinese page.
const swaps = [
  [/<html lang="en">/, '<html lang="zh-Hant">'],
  // index.html must keep <base href="/"> so ./css, ./data … resolve from the root on /zh/
  [/<base href="\/">/, '<base href="/">'],
  [/<title>[^<]*<\/title>/, `<title>${TITLE}</title>`],
  [/<meta name="description" content="[^"]*">/, `<meta name="description" content="${DESC}">`],
  [/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${SITE}/zh/">`],
  [/<meta property="og:site_name" content="[^"]*">/, '<meta property="og:site_name" content="曉然文化藝術">'],
  [/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${TITLE}">`],
  [/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${DESC}">`],
  [/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${SITE}/zh/">`],
  [/<meta property="og:locale" content="en_US">/, '<meta property="og:locale" content="zh_TW">'],
  [/<meta property="og:locale:alternate" content="zh_TW">/, '<meta property="og:locale:alternate" content="en_US">'],
  [/<h1 class="logo">[^<]*<\/h1>/, '<h1 class="logo">袁之靜 - 曉然文化藝術</h1>'],
  [/<button id="languageToggle" class="header-icon language-toggle">中<\/button>/,
   '<button id="languageToggle" class="header-icon language-toggle">En</button>'],
];

for (const [pattern, replacement] of swaps) {
  if (!pattern.test(html)) {
    console.error(`build-zh: pattern not found in index.html: ${pattern}`);
    process.exit(1);
  }
  html = html.replace(pattern, replacement);
}

fs.mkdirSync(path.join(root, 'zh'), { recursive: true });
fs.writeFileSync(path.join(root, 'zh', 'index.html'), html);
console.log('build-zh: wrote zh/index.html');
