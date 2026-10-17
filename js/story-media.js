// Exhibitions & News page, home-page show card, and About-page video + CV.
// Data: data/exhibitions.json, data/updates.json (studio news from Facebook), data/press.json, data/cv.json.
// Each piece of content has one home: dated things (shows, news, event videos) live on
// Exhibitions & News; About holds only evergreen content (story, documentary, CV).
// English page: a video plays its English-dubbed upload when one exists,
// otherwise the original with synced English subtitles from data/captions/.
(function () {
    'use strict';

    let exhibitionsData = null;
    let updatesData = null;
    let pressData = null;
    let cvData = null;
    let historyFilter = 'all';
    let newsLimit = 6;
    let videoLimit = 6;
    const captionCache = {};
    const players = [];

    const lang = () => (typeof portfolio !== 'undefined' && portfolio.currentLanguage) || 'zh';
    const pick = (obj) => (obj && (obj[lang()] || obj.zh || obj.en)) || '';
    const t = (path) => (typeof portfolio !== 'undefined' ? portfolio.t(path) : '');
    const today = () => new Date().toISOString().slice(0, 10);

    function esc(str) {
        return String(str == null ? '' : str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    const safeUrl = (url) => (/^https:\/\//i.test(url || '') ? url : '');
    const safeId = (id) => (/^[A-Za-z0-9_-]{6,20}$/.test(id || '') ? id : '');

    function formatDate(d, withYear = true) {
        if (!d) return '';
        const [y, m, day] = String(d).split('-');
        if (!m) return y;
        if (!day) {
            const monthsLong = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
            return lang() === 'zh' ? `${y} 年 ${parseInt(m, 10)} 月` : `${monthsLong[parseInt(m, 10) - 1]} ${y}`;
        }
        if (lang() === 'zh') return withYear ? `${y}.${m}.${day}` : `${parseInt(m, 10)}/${parseInt(day, 10)}`;
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const md = `${months[parseInt(m, 10) - 1]} ${parseInt(day, 10)}`;
        return withYear ? `${md}, ${y}` : md;
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

    // ---------- Shared pieces ----------
    function sixMonthsOut() {
        const d = new Date();
        d.setMonth(d.getMonth() + 6);
        return d.toISOString().slice(0, 10);
    }

    function currentShows() {
        const now = today();
        const list = (exhibitionsData && exhibitionsData.exhibitions) || [];
        return {
            onView: list.filter((e) => e.start && e.end && e.start <= now && now <= e.end),
            // Upcoming = opening within the next 6 months (start may be YYYY-MM or YYYY-MM-DD)
            upcoming: list.filter((e) => e.start && e.start > now && e.start <= sixMonthsOut())
                .sort((a, b) => a.start.localeCompare(b.start))
        };
    }

    function showCard(e, label, compact) {
        const link = safeUrl(e.link);
        const dates = e.start && e.end
            ? `${formatDate(e.start)} – ${formatDate(e.end, lang() !== 'zh' ? true : false)}`
            : formatDate(e.start);
        return `
        <article class="show-card">
            <span class="show-label">${esc(label)}</span>
            <h3>${esc(pick(e.title))}</h3>
            <p class="show-venue">${esc(pick(e.venue))}</p>
            ${dates ? `<p class="show-dates">${esc(dates)}</p>` : ''}
            ${!compact && pick(e.note) ? `<p class="show-note">${esc(pick(e.note))}</p>` : ''}
            ${!compact && link ? `<a href="${esc(link)}" target="_blank" rel="noopener">${esc(t('exhibitionsPage.more'))} →</a>` : ''}
        </article>`;
    }

    function currentShowsHTML(compact) {
        const { onView, upcoming } = currentShows();
        return [
            ...onView.map((e) => showCard(e, t('exhibitionsPage.onView'), compact)),
            ...upcoming.map((e) => showCard(e, t('exhibitionsPage.upcoming'), compact))
        ].join('');
    }

    function newsItems() {
        const studio = ((updatesData && updatesData.updates) || []).map((u) => ({
            date: u.date, tag: 'studio', text: pick(u.text), link: safeUrl(u.link), image: u.image || ''
        }));
        const press = ((pressData && pressData.articles) || []).map((a) => ({
            date: a.date, tag: 'press', outlet: pick(a.outlet), text: pick(a.title), link: safeUrl(a.url)
        }));
        // A studio update that points at the same article replaces the press entry
        const studioLinks = new Set(studio.map((s) => s.link).filter(Boolean));
        return [...studio, ...press.filter((p) => !studioLinks.has(p.link))]
            .sort((a, b) => String(b.date).localeCompare(String(a.date)));
    }

    function newsItemHTML(n) {
        const tag = n.tag === 'press' ? t('exhibitionsPage.tagPress') : t('exhibitionsPage.tagStudio');
        const meta = `<span class="news-tag news-tag-${n.tag}">${esc(tag)}</span>
            <time>${esc(formatDate(n.date))}</time>${n.outlet ? `<span class="news-outlet">${esc(n.outlet)}</span>` : ''}`;
        const img = n.image ? `<img src="${esc(n.image)}" alt="" loading="lazy">` : '';
        const body = `${img}<div class="news-body"><div class="news-meta">${meta}</div><p>${esc(n.text)}</p></div>`;
        return n.link
            ? `<li><a class="news-item" href="${esc(n.link)}" target="_blank" rel="noopener">${body}</a></li>`
            : `<li><div class="news-item">${body}</div></li>`;
    }

    // ---------- Home ----------
    function renderHome() {
        const home = document.getElementById('home');
        if (!home) return;
        let box = document.getElementById('latestUpdates');
        if (!box) {
            box = document.createElement('div');
            box.id = 'latestUpdates';
            box.className = 'latest-updates';
            home.insertBefore(box, home.firstChild);
        }
        // Home stays light: just the current/upcoming show (title, venue, dates).
        // Notes and studio news live on the Exhibitions & News page.
        // On view now; if nothing is on, the shows opening in the next 6 months
        const { onView, upcoming } = currentShows();
        const shows = onView.length
            ? onView.map((e) => showCard(e, t('exhibitionsPage.onView'), true)).join('')
            : upcoming.map((e) => showCard(e, t('exhibitionsPage.upcoming'), true)).join('');
        if (!shows) { box.innerHTML = ''; return; }
        box.innerHTML = `
            <div class="show-cards">${shows}</div>
            <button class="update-more" onclick="showSection('news')">${esc(t('about.seeAllExhibitions'))}</button>`;
    }

    // ---------- Exhibitions & News page ----------
    function renderNewsPage() {
        const box = document.getElementById('newsPage');
        if (!box) return;
        const shows = currentShowsHTML();
        const news = newsItems();
        const fb = updatesData && safeUrl(updatesData.facebookUrl);
        // About videos also show here while they are recent (past 12 months);
        // once older they live on About only, so the two pages don't repeat each other.
        const yearAgo = new Date(); yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        const cutoff = yearAgo.toISOString().slice(0, 10);
        const videos = ((pressData && pressData.videos) || [])
            .filter((v) => !v.showOnAbout || String(v.date) >= cutoff);

        box.innerHTML = `
            <div class="news-header">
                <h2>${esc(t('exhibitionsPage.title'))}</h2>
                <p>${esc(t('exhibitionsPage.intro'))}</p>
            </div>
            ${shows ? `<div class="show-cards">${shows}</div>` : ''}

            ${news.length ? `
            <section class="news-block">
                <h3>${esc(t('exhibitionsPage.newsTitle'))}</h3>
                <ul class="news-list">${news.slice(0, newsLimit).map(newsItemHTML).join('')}</ul>
                <div class="news-actions">
                    ${news.length > newsLimit ? `<button class="news-more-btn" data-action="more">${esc(t('exhibitionsPage.showMore'))}</button>` : ''}
                    ${fb ? `<a class="update-more" href="${esc(fb)}" target="_blank" rel="noopener">${esc(t('home.latestMore'))} →</a>` : ''}
                </div>
                ${lang() === 'en' ? `<p class="press-lang-note">${esc(t('about.articlesNote'))}</p>` : ''}
            </section>` : ''}

            ${videos.length ? `
            <section class="news-block">
                <h3>${esc(t('exhibitionsPage.videosTitle'))}</h3>
                <div class="press-videos">${videos.slice(0, videoLimit).map(videoCardHTML).join('')}</div>
                ${videos.length > videoLimit ? `<div class="news-actions"><button class="news-more-btn" data-action="more-videos">${esc(t('exhibitionsPage.showMore'))}</button></div>` : ''}
            </section>` : ''}

            <section class="news-block" id="exhibitionHistory">
                <h3>${esc(t('exhibitionsPage.historyTitle'))}</h3>
                <div class="history-filters" role="group">
                    ${['all', 'solo', 'duo', 'group'].map((f) =>
                        `<button data-filter="${f}" class="${historyFilter === f ? 'active' : ''}">${esc(t('exhibitionsPage.' + f))}</button>`).join('')}
                </div>
                <div class="history-list">${historyHTML()}</div>
            </section>

            <aside class="news-invite">
                <p>${esc(t('exhibitionsPage.invite'))}</p>
                <button onclick="showSection('connect')">${esc(t('exhibitionsPage.contact'))}</button>
            </aside>`;

        box.querySelectorAll('.history-filters button').forEach((btn) => btn.addEventListener('click', () => {
            historyFilter = btn.dataset.filter;
            box.querySelectorAll('.history-filters button').forEach((b) => b.classList.toggle('active', b === btn));
            box.querySelector('.history-list').innerHTML = historyHTML();
        }));
        const more = box.querySelector('[data-action="more"]');
        if (more) more.addEventListener('click', () => { newsLimit += 10; renderNewsPage(); });
        const moreVideos = box.querySelector('[data-action="more-videos"]');
        if (moreVideos) moreVideos.addEventListener('click', () => { videoLimit += 6; renderNewsPage(); });
        bindVideos(box, videos);
    }

    function historyHTML() {
        const list = ((exhibitionsData && exhibitionsData.exhibitions) || [])
            .filter((e) => historyFilter === 'all' || e.type === historyFilter);
        const byYear = {};
        list.forEach((e) => { (byYear[e.year] = byYear[e.year] || []).push(e); });
        return Object.keys(byYear).sort((a, b) => b - a).map((year) => `
            <div class="history-year">
                <span class="history-year-label">${esc(year)}</span>
                <ul>${byYear[year].map((e) => {
                    const link = safeUrl(e.link);
                    const title = esc(pick(e.title));
                    return `<li>
                        <span class="history-type">${esc(t('exhibitionsPage.' + e.type))}</span>
                        <span class="history-title">${link ? `<a href="${esc(link)}" target="_blank" rel="noopener">${title}</a>` : title}</span>
                        <span class="history-venue">${esc(pick(e.venue))}</span>
                    </li>`;
                }).join('')}</ul>
            </div>`).join('');
    }

    // ---------- About ----------
    function renderAbout() {
        const videoBox = document.getElementById('aboutVideo');
        if (videoBox && pressData) {
            const vids = (pressData.videos || []).filter((v) => v.showOnAbout);
            videoBox.innerHTML = vids.length ? `<div class="press-videos press-videos-about${vids.length === 1 ? ' press-videos-single' : ''}">${vids.map(videoCardHTML).join('')}</div>` : '';
            bindVideos(videoBox, vids);
        }
        renderCV();
    }

    function renderCV() {
        if (!cvData || typeof portfolio === 'undefined' || !portfolio.updateAboutListContent) return;
        ['education', 'awards', 'publications', 'teaching', 'positions'].forEach((key) => {
            if (Array.isArray(cvData[key])) portfolio.updateAboutListContent(key, cvData[key].map(pick));
        });
    }

    // ---------- Videos ----------
    function videoForLanguage(v) {
        const en = lang() === 'en';
        const dubbed = en && safeId(v.dubbedYoutubeIdEn);
        return {
            id: dubbed || safeId(v.youtubeId),
            captions: en && !dubbed && v.captionsEn ? v.captionsEn : '',
            note: !en ? '' : dubbed ? t('about.dubbedNote') : v.captionsEn ? t('about.captionNote') : t('about.noCaptionNote')
        };
    }

    function videoCardHTML(v, i) {
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
    }

    function bindVideos(root, list) {
        root.querySelectorAll('.video-thumb').forEach((btn) => {
            btn.addEventListener('click', () => playVideo(btn, list[+btn.dataset.index]));
        });
    }

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
        stopPlayers();
        renderHome();
        renderNewsPage();
        renderAbout();
    }

    async function init() {
        [exhibitionsData, updatesData, pressData, cvData] = await Promise.all([
            loadJSON('./data/exhibitions.json'),
            loadJSON('./data/updates.json'),
            loadJSON('./data/press.json'),
            loadJSON('./data/cv.json')
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
