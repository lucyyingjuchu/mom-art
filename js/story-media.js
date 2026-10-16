// Studio updates (home page) + videos & press (about page).
// Data lives in data/updates.json and data/press.json.
// On the English page, a video plays its English-dubbed upload when one exists,
// otherwise the original with synced English subtitles from data/captions/.
(function () {
    'use strict';

    let updatesData = null;
    let pressData = null;
    const captionCache = {};
    const players = [];

    const lang = () => (typeof portfolio !== 'undefined' && portfolio.currentLanguage) || 'zh';
    const pick = (obj) => (obj && (obj[lang()] || obj.zh || obj.en)) || '';
    const t = (path) => (typeof portfolio !== 'undefined' ? portfolio.t(path) : '');

    function esc(str) {
        return String(str == null ? '' : str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    function safeUrl(url) {
        return /^https:\/\//i.test(url || '') ? url : '';
    }
    function safeId(id) {
        return /^[A-Za-z0-9_-]{6,20}$/.test(id || '') ? id : '';
    }
    function formatDate(d) {
        if (!d) return '';
        const parts = String(d).split('-');
        if (parts.length < 3) return parts[0];
        if (lang() === 'zh') return `${parts[0]}.${parts[1]}.${parts[2]}`;
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${months[parseInt(parts[1], 10) - 1]} ${parseInt(parts[2], 10)}, ${parts[0]}`;
    }

    async function loadJSON(path) {
        try {
            const res = await fetch(path, { cache: 'no-cache' });
            if (!res.ok) throw new Error(res.status);
            return await res.json();
        } catch (e) {
            console.warn('story-media: could not load', path, e);
            return null;
        }
    }

    // ---------- Home: latest updates ----------
    function renderUpdates() {
        const home = document.getElementById('home');
        if (!home || !updatesData) return;
        let box = document.getElementById('latestUpdates');
        if (!box) {
            box = document.createElement('div');
            box.id = 'latestUpdates';
            box.className = 'latest-updates';
            home.insertBefore(box, home.firstChild);
        }
        const items = (updatesData.updates || []).slice(0, 3);
        if (!items.length) { box.innerHTML = ''; return; }

        const cards = items.map((u) => {
            const img = u.image ? `<img src="${esc(u.image)}" alt="" loading="lazy">` : '';
            const link = safeUrl(u.link);
            const inner = `${img}<div class="update-body"><time>${esc(formatDate(u.date))}</time><p>${esc(pick(u.text))}</p></div>`;
            return link
                ? `<a class="update-card" href="${esc(link)}" target="_blank" rel="noopener">${inner}</a>`
                : `<div class="update-card">${inner}</div>`;
        }).join('');

        const fb = safeUrl(updatesData.facebookUrl);
        box.innerHTML = `
            <h2>${esc(t('home.latestTitle'))}</h2>
            <div class="update-list">${cards}</div>
            ${fb ? `<a class="update-more" href="${esc(fb)}" target="_blank" rel="noopener">${esc(t('home.latestMore'))} →</a>` : ''}`;
    }

    // ---------- About: videos & press ----------
    function videoForLanguage(v) {
        const en = lang() === 'en';
        const dubbed = en && safeId(v.dubbedYoutubeIdEn);
        return {
            id: dubbed || safeId(v.youtubeId),
            captions: en && !dubbed && v.captionsEn ? v.captionsEn : '',
            note: !en ? '' : dubbed ? t('about.dubbedNote') : v.captionsEn ? t('about.captionNote') : t('about.noCaptionNote')
        };
    }

    function renderPress() {
        const box = document.getElementById('pressMedia');
        if (!box || !pressData) return;
        stopPlayers();

        const videos = (pressData.videos || []).map((v, i) => {
            const pv = videoForLanguage(v);
            if (!pv.id) return '';
            return `
            <figure class="press-video">
                <button class="video-thumb" data-index="${i}" aria-label="${esc(pick(v.title))}">
                    <img src="https://i.ytimg.com/vi/${pv.id}/hqdefault.jpg" alt="" loading="lazy">
                    <span class="play-icon" aria-hidden="true">▶</span>
                </button>
                <div class="caption-bar" hidden></div>
                <figcaption>
                    <span class="press-meta">${esc(pick(v.outlet))} · ${esc(formatDate(v.date))}${pv.note ? ` · <em>${esc(pv.note)}</em>` : ''}</span>
                    <strong>${esc(pick(v.title))}</strong>
                    ${v.summary ? `<span class="press-summary">${esc(pick(v.summary))}</span>` : ''}
                </figcaption>
            </figure>`;
        }).join('');

        const articles = (pressData.articles || []).map((a) => {
            const url = safeUrl(a.url);
            if (!url) return '';
            return `
            <li><a href="${esc(url)}" target="_blank" rel="noopener">
                <span class="press-meta">${esc(pick(a.outlet))} · ${esc(formatDate(a.date))}</span>
                <span class="press-title">${esc(pick(a.title))}</span>
            </a></li>`;
        }).join('');

        box.innerHTML = `
            ${videos ? `<h3>${esc(t('about.videoTitle'))}</h3><div class="press-videos">${videos}</div>` : ''}
            ${articles ? `<h3>${esc(t('about.articlesTitle'))}</h3><ul class="press-articles">${articles}</ul>` : ''}
            ${articles ? `<p class="press-lang-note">${esc(t('about.articlesNote'))}</p>` : ''}`;

        box.querySelectorAll('.video-thumb').forEach((btn) => {
            btn.addEventListener('click', () => playVideo(btn, pressData.videos[+btn.dataset.index]));
        });
    }

    // ---------- Video playback ----------
    function playVideo(btn, v) {
        const pv = videoForLanguage(v);
        const figure = btn.closest('.press-video');
        const holder = document.createElement('div');
        holder.className = 'video-frame';
        btn.replaceWith(holder);

        if (!pv.captions) {
            holder.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${pv.id}?autoplay=1&rel=0"
                title="${esc(pick(v.title))}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
            return;
        }
        // Original video + our English subtitles, kept in sync via the YouTube player API
        const target = document.createElement('div');
        holder.appendChild(target);
        const bar = figure.querySelector('.caption-bar');
        bar.hidden = false;
        Promise.all([loadCaptions(pv.captions), loadYouTubeAPI()]).then(([cues]) => {
            const player = new YT.Player(target, {
                videoId: pv.id,
                playerVars: { autoplay: 1, rel: 0, cc_load_policy: 0, playsinline: 1 },
                events: { onReady: (e) => e.target.playVideo() }
            });
            let last = '';
            const timer = setInterval(() => {
                if (!player.getCurrentTime) return;
                const now = player.getCurrentTime();
                const cue = cues.find((c) => now >= c.s && now < c.e);
                const text = cue ? cue.t : '';
                if (text !== last) { bar.textContent = text; last = text; }
            }, 200);
            players.push({ player, timer });
        });
    }

    function stopPlayers() {
        players.forEach(({ player, timer }) => {
            clearInterval(timer);
            try { player.destroy(); } catch (e) { /* already gone */ }
        });
        players.length = 0;
    }

    async function loadCaptions(file) {
        if (!/^[\w.-]+\.json$/.test(file)) return [];
        if (!captionCache[file]) captionCache[file] = (await loadJSON(`./data/captions/${file}`)) || [];
        return captionCache[file];
    }

    let ytPromise = null;
    function loadYouTubeAPI() {
        if (window.YT && window.YT.Player) return Promise.resolve();
        if (!ytPromise) {
            ytPromise = new Promise((resolve) => {
                const prev = window.onYouTubeIframeAPIReady;
                window.onYouTubeIframeAPIReady = () => { if (prev) prev(); resolve(); };
                const s = document.createElement('script');
                s.src = 'https://www.youtube.com/iframe_api';
                document.head.appendChild(s);
            });
        }
        return ytPromise;
    }

    function renderAll() {
        renderUpdates();
        renderPress();
    }

    async function init() {
        [updatesData, pressData] = await Promise.all([
            loadJSON('./data/updates.json'),
            loadJSON('./data/press.json')
        ]);
        renderAll();
    }

    document.addEventListener('languageChanged', renderAll);
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
