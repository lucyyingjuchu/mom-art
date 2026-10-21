// js/lightbox.js - Painting viewer
//
// A full-screen viewer modelled on photo apps and museum collection sites:
//   • next / previous: arrow keys, the side arrows, the filmstrip, or a swipe
//   • zoom: mouse wheel / trackpad pinch, double-click or double-tap, two-finger
//     pinch, or the − 100% + buttons; drag to look around when zoomed in
//   • details: side panel on wide screens, pull-up sheet on phones (ⓘ toggles)
//   • close: ✕, Esc, swipe down (phone) or the phone's back button
//
// Kept for the rest of the site:
//   openLightbox(id, context), closeLightbox(), navigateArtwork('prev'|'next'),
//   shareArtwork(), updateLightboxLanguage(), and the events lightboxOpened,
//   artworkChanged (shopping.js adds the print section) and lightboxClosed.

(function () {
    'use strict';

    // ---------------------------------------------------------------- state
    let list = [];            // artworks being browsed (gallery order, featured, or all)
    let index = 0;
    let views = [];           // pictures of the current artwork: original, "in a room", ...
    let viewIndex = 0;
    let loadToken = 0;        // ignores late image loads after the user moved on

    const zoom = { s: 1, x: 0, y: 0 };
    const MAX_ZOOM = 6;

    const pointers = new Map();
    let gesture = null;       // what the current touch / drag is doing
    let lastTap = { t: 0, x: 0, y: 0 };
    let tapTimer = null;
    let pushedHistory = false;
    let closedEventPending = false;

    const $ = (id) => document.getElementById(id);
    const el = {};

    function lang() {
        return (typeof portfolio !== 'undefined' && portfolio.currentLanguage) || 'zh';
    }

    function t(key) {
        if (typeof portfolio !== 'undefined' && typeof portfolio.t === 'function') return portfolio.t(key);
        return key;
    }

    function isPhone() {
        return window.matchMedia('(max-width: 768px)').matches;
    }

    function getPlaceholderImage() {
        return `./images/placeholder/artwork-placeholder-${lang() === 'en' ? 'en' : 'zh'}.svg`;
    }

    // ------------------------------------------------------------- open / close
    window.openLightbox = function (artworkId, context = 'all') {
        if (typeof portfolio === 'undefined') return;
        const artwork = portfolio.getArtwork(artworkId);
        if (!artwork) return;

        if (context === 'featured') list = portfolio.getFeaturedArtworks();
        else if (context === 'gallery' && typeof portfolio.getCurrentGalleryArtworks === 'function') list = portfolio.getCurrentGalleryArtworks();
        else list = portfolio.artworks;

        index = list.findIndex(a => a.id === artworkId);
        if (index === -1) {
            list = portfolio.artworks;
            index = list.findIndex(a => a.id === artworkId);
        }

        el.box.classList.add('active');
        el.box.classList.toggle('info-hidden', !isPhone() && sessionGet('lbInfoHidden') === '1');
        el.box.classList.remove('sheet-open', 'immersive');
        document.body.style.overflow = 'hidden';

        buildFilmstrip();
        render();
        showHintOnce();

        // Phone back button closes the viewer instead of leaving the page
        try {
            history.pushState({ lightbox: true }, '');
            pushedHistory = true;
        } catch (e) { pushedHistory = false; }

        setTimeout(() => document.dispatchEvent(new CustomEvent('lightboxOpened', { detail: { artwork: list[index] } })), 0);
        el.close.focus({ preventScroll: true });
    };

    window.closeLightbox = function (fromHistory) {
        if (!el.box || !el.box.classList.contains('active')) return;
        const current = list[index];

        el.box.classList.remove('active', 'sheet-open', 'immersive');
        document.body.style.overflow = '';
        resetZoom(false);
        closeShareMenu();

        if (current && typeof portfolio !== 'undefined' && typeof portfolio.scrollToArtwork === 'function') {
            setTimeout(() => portfolio.scrollToArtwork(current.id), 200);
        }

        if (pushedHistory && !fromHistory) {
            // step back over the entry we added; announce the close once we're there
            pushedHistory = false;
            closedEventPending = true;
            history.back();
            return;
        }
        pushedHistory = false;
        document.dispatchEvent(new CustomEvent('lightboxClosed'));
    };

    window.addEventListener('popstate', () => {
        if (closedEventPending) {
            closedEventPending = false;
            document.dispatchEvent(new CustomEvent('lightboxClosed'));
        } else if (el.box && el.box.classList.contains('active')) {
            pushedHistory = false;
            window.closeLightbox(true);
        }
    });

    // ------------------------------------------------------------- navigation
    window.navigateArtwork = function (direction) {
        if (list.length < 2) return;
        const dir = direction === 'prev' ? -1 : 1;
        goTo(index + dir, dir);
    };

    function goTo(newIndex, dir = 1) {
        if (!list.length) return;
        index = (newIndex + list.length) % list.length;
        // slide the old picture out, the new one in from the other side
        el.img.classList.remove('slide-in-left', 'slide-in-right');
        void el.img.offsetWidth;
        render();
        el.img.classList.add(dir > 0 ? 'slide-in-right' : 'slide-in-left');
    }

    // ------------------------------------------------------------- render
    function render() {
        const artwork = list[index];
        if (!artwork) return;

        setupViews(artwork);
        resetZoom(false);
        showView(0);
        fillDetails(artwork);
        renderViewTabs();

        el.counter.textContent = list.length > 1 ? `${index + 1} / ${list.length}` : '';
        el.box.classList.toggle('single', list.length < 2);
        markFilmstrip();
        preloadNeighbours();

        document.dispatchEvent(new CustomEvent('artworkChanged', { detail: { artwork } }));
    }

    function setupViews(artwork) {
        const original = {
            type: 'original',
            low: artwork.image || artwork.imageHigh,
            high: artwork.imageHigh || artwork.image
        };
        views = [original];
        (artwork.productViews || []).forEach(v => {
            // Room mockups are retired: scale is shown by the to-scale diagram in the panel
            if (!v || !v.image || v.type === 'original' || /mockup|room/.test(String(v.type))) return;
            views.push({ type: v.type || 'view', low: v.image, high: v.image, title: v.title });
        });
        if (hasScale(artwork)) views.push({ type: 'scale' });
        viewIndex = 0;
    }

    function showView(i) {
        viewIndex = i;
        const view = views[i];
        const token = ++loadToken;
        const oldScale = el.stage.querySelector('.lb-scale');
        if (oldScale) oldScale.remove();
        el.box.classList.toggle('scale-view', view.type === 'scale');
        if (view.type === 'scale') {
            const wrap = document.createElement('div');
            wrap.className = 'lb-scale';
            wrap.innerHTML = scaleSvg(list[index]);
            el.stage.insertBefore(wrap, el.img.nextSibling);
            el.stage.querySelectorAll('.view-dot').forEach((b, k) => {
                b.classList.toggle('active', k === i);
                b.setAttribute('aria-selected', k === i ? 'true' : 'false');
            });
            return;
        }
        const placeholder = getPlaceholderImage();
        const artwork = list[index];
        el.img.alt = textFor(artwork, 'title');

        // Show the light picture at once, then swap in the sharp one when it arrives
        el.img.src = view.low || placeholder;
        el.img.onerror = () => { if (token === loadToken) el.img.src = placeholder; };
        if (view.high && view.high !== view.low) {
            const hi = new Image();
            hi.onload = () => { if (token === loadToken) el.img.src = view.high; };
            hi.src = view.high;
        }
        el.stage.querySelectorAll('.view-dot').forEach((b, k) => {
            b.classList.toggle('active', k === i);
            b.setAttribute('aria-selected', k === i ? 'true' : 'false');
        });
    }

    function renderViewTabs() {
        const old = el.stage.querySelector('.view-indicators');
        if (old) old.remove();
        if (views.length < 2) return;

        const labels = lang() === 'en'
            ? { original: 'Artwork', scale: 'Actual size', detail: 'Detail' }
            : { original: '作品', scale: '實際尺寸', detail: '細節' };
        const tabs = document.createElement('div');
        tabs.className = 'view-indicators';
        tabs.setAttribute('role', 'tablist');
        views.forEach((v, i) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'view-dot' + (i === viewIndex ? ' active' : '');
            b.setAttribute('role', 'tab');
            const type = String(v.type);
            b.textContent = type === 'original' ? labels.original
                : type === 'scale' ? labels.scale
                : (type.includes('detail') || type.includes('close')) ? labels.detail
                : (v.title || String(i + 1));
            b.addEventListener('click', (e) => {
                e.stopPropagation();
                if (i !== viewIndex) { resetZoom(false); showView(i); }
            });
            b.addEventListener('pointerdown', e => e.stopPropagation());
            tabs.appendChild(b);
        });
        el.stage.appendChild(tabs);
    }

    function textFor(artwork, field) {
        return lang() === 'zh'
            ? (artwork[field] || artwork[field + 'En'] || '')
            : (artwork[field + 'En'] || artwork[field] || '');
    }

    function fillDetails(artwork) {
        const zh = lang() === 'zh';
        let size;
        if (artwork.heightCm && artwork.widthCm) {
            size = `${artwork.heightCm} × ${artwork.widthCm} cm`;
            if (!zh && artwork.heightInches && artwork.widthInches) size += ` (${artwork.heightInches}″ × ${artwork.widthInches}″)`;
            if (artwork.sizeIncludesFrame) size += zh ? '（含框）' : ' (framed)';
        } else {
            size = artwork.sizeCm || (zh ? '尺寸未註明' : 'Size not specified');
        }

        const title = textFor(artwork, 'title') || (zh ? '未命名' : 'Untitled');
        const values = {
            artworkTitle: title,
            artworkTitleEn: '',   // each language shows its own title only
            artworkDescription: textFor(artwork, 'description'),
            artworkYear: artwork.year || (zh ? '年份不詳' : 'Unknown'),
            artworkSize: size,
            artworkFormat: textFor(artwork, 'format') || '—'
        };
        Object.entries(values).forEach(([id, text]) => { const n = $(id); if (n) n.textContent = text; });
        el.sheetTitle.textContent = title;

        const labels = ['lightbox.yearLabel', 'lightbox.dimensionsLabel', 'lightbox.formatLabel'];
        el.box.querySelectorAll('.spec-label').forEach((n, i) => { if (labels[i]) n.textContent = t(labels[i]); });

        const note = (zh ? (artwork.curatorNote || artwork.curatorNoteEn) : (artwork.curatorNoteEn || artwork.curatorNote)) || '';
        $('artworkNoteLabel').textContent = zh ? '作品說明' : 'About this work';
        $('artworkNoteText').textContent = note.trim();
        $('artworkNote').hidden = !note.trim();

        const tags = $('artworkTags');
        if (tags) tags.innerHTML = '';

        // Availability: clicking "inquire" opens the inquiry form
        const old = $('availabilityStatus');
        const status = old.cloneNode(false);
        old.replaceWith(status);
        const available = typeof portfolio !== 'undefined' ? portfolio.getBooleanValue(artwork, 'available', true) : true;
        status.textContent = t(available ? 'lightbox.availableStatus' : 'lightbox.soldStatus');
        status.className = `availability-status ${available ? 'available' : 'sold'}`;
        if (available) {
            status.setAttribute('role', 'button');
            status.tabIndex = 0;
            const inquire = () => {
                if (typeof openContactForm === 'function') openContactForm(artwork.id);
            };
            status.addEventListener('click', inquire);
            status.addEventListener('keydown', e => { if (e.key === 'Enter') inquire(); });
        }

        // Tooltips in the current language
        el.prev.title = t('lightbox.prevTitle');
        el.next.title = t('lightbox.nextTitle');
        el.close.title = t('lightbox.closeTitle');
        el.share.title = t('lightbox.shareTitle');
        el.infoToggle.title = zh ? '作品資訊' : 'Details';
        el.zoomIn.title = zh ? '放大 (+)' : 'Zoom in (+)';
        el.zoomOut.title = zh ? '縮小 (−)' : 'Zoom out (−)';
        el.zoomLevel.title = zh ? '符合畫面 (0)' : 'Fit to screen (0)';

        el.panel.scrollTop = 0;
    }

    // The original painting drawn to scale on a wall next to a 170 cm person,
    // hung with its centre near eye level (or 20 cm off the floor for very tall works).
    // Shown as the "Actual size / 實際尺寸" view on the stage, in place of the old room mockups.
    function hasScale(artwork) {
        return parseFloat(artwork.heightCm) > 0 && parseFloat(artwork.widthCm) > 0 && !!(artwork.image || artwork.imageHigh);
    }

    function scaleSvg(artwork) {
        const zh = lang() === 'zh';
        const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
        const hCm = parseFloat(artwork.heightCm), wCm = parseFloat(artwork.widthCm);
        const img = artwork.imageHigh || artwork.image;
        const PERSON = 170, personW = PERSON * 0.28, GAP_CM = 40, SIDE_CM = 30;
        const bottomCm = Math.max(20, 150 - hCm / 2);
        const topCm = Math.max(PERSON, bottomCm + hCm) + 15;
        const spanCm = SIDE_CM + personW + GAP_CM + wCm + SIDE_CM;
        // Keep the drawing at least as wide as it is tall so short works don't shrink to a sliver
        const viewW = Math.max(spanCm, topCm * 1.1);
        const k = 10;                                   // 10 viewBox units per cm
        const W = viewW * k, FLOOR = topCm * k;
        const fs = Math.max(W, FLOOR) * 0.026, H = FLOOR + fs * 2.2;
        const left = (viewW - spanCm) / 2 * k + SIDE_CM * k;
        const ph = PERSON * k, pw = personW * k, cx = left + pw / 2;
        const x = left + pw + GAP_CM * k, w = wCm * k, h = hCm * k, y = FLOOR - (bottomCm + hCm) * k;
        let label = `${artwork.heightCm} × ${artwork.widthCm} cm`;
        if (!zh && artwork.heightInches && artwork.widthInches) label += `  (${artwork.heightInches}″ × ${artwork.widthInches}″)`;
        const personLabel = zh ? '170 公分' : '170 cm (5′7″)';
        const aria = zh ? `原作尺寸 ${label}，與 170 公分人形的比例示意` : `Original, ${label}, shown to scale beside a 170 cm person`;
        return `
            <svg class="lb-scale-svg" viewBox="0 0 ${W.toFixed(0)} ${H.toFixed(0)}" role="img" aria-label="${esc(aria)}" style="font-size:${fs.toFixed(0)}px">
                <rect class="lbs-wall" x="0" y="0" width="${W.toFixed(0)}" height="${FLOOR.toFixed(0)}"/>
                <line class="lbs-floor" x1="0" y1="${FLOOR}" x2="${W.toFixed(0)}" y2="${FLOOR}"/>
                <g class="lbs-person" aria-hidden="true">
                    <circle cx="${cx}" cy="${FLOOR - ph + ph * 0.07}" r="${ph * 0.07}"/>
                    <path d="M${cx - pw * 0.5} ${FLOOR - ph * 0.5} Q${cx - pw * 0.5} ${FLOOR - ph * 0.83} ${cx} ${FLOOR - ph * 0.83}
                             Q${cx + pw * 0.5} ${FLOOR - ph * 0.83} ${cx + pw * 0.5} ${FLOOR - ph * 0.5}
                             L${cx + pw * 0.28} ${FLOOR - ph * 0.5} L${cx + pw * 0.3} ${FLOOR} L${cx - pw * 0.3} ${FLOOR} L${cx - pw * 0.28} ${FLOOR - ph * 0.5} Z"/>
                </g>
                <rect class="lbs-shadow" x="${x + h * 0.012 + 4}" y="${y + h * 0.012 + 4}" width="${w}" height="${h}"/>
                <image href="${esc(img)}" preserveAspectRatio="none" x="${x}" y="${y}" width="${w}" height="${h}"/>
                <text x="${cx}" y="${FLOOR + fs * 1.5}" text-anchor="middle">${esc(personLabel)}</text>
                <text x="${x + w / 2}" y="${FLOOR + fs * 1.5}" text-anchor="middle">${esc(label)}</text>
            </svg>`;
    }

    function preloadNeighbours() {
        [1, -1].forEach(d => {
            const a = list[(index + d + list.length) % list.length];
            if (a && a.image) { const i = new Image(); i.src = a.image; }
        });
    }

    // ------------------------------------------------------------- filmstrip
    function buildFilmstrip() {
        el.film.innerHTML = '';
        if (list.length < 2) return;
        const frag = document.createDocumentFragment();
        list.forEach((a, i) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'lb-thumb';
            b.setAttribute('aria-label', textFor(a, 'title'));
            const img = document.createElement('img');
            img.loading = 'lazy';
            img.alt = '';
            img.src = a.image || a.imageHigh || getPlaceholderImage();
            b.appendChild(img);
            b.addEventListener('click', () => { if (i !== index) goTo(i, i > index ? 1 : -1); });
            frag.appendChild(b);
        });
        el.film.appendChild(frag);
    }

    function markFilmstrip() {
        const thumbs = el.film.children;
        for (let i = 0; i < thumbs.length; i++) thumbs[i].classList.toggle('active', i === index);
        const active = thumbs[index];
        if (active) {
            const left = active.offsetLeft - (el.film.clientWidth - active.offsetWidth) / 2;
            el.film.scrollTo({ left, behavior: 'smooth' });
        }
    }

    // ------------------------------------------------------------- zoom
    function applyZoom(animate) {
        el.img.style.transition = animate ? 'transform 0.25s ease' : 'none';
        el.img.style.transform = `translate(${zoom.x}px, ${zoom.y}px) scale(${zoom.s})`;
        el.zoomLevel.textContent = `${Math.round(zoom.s * 100)}%`;
        el.box.classList.toggle('zoomed', zoom.s > 1.01);
    }

    function clampPan() {
        const w = el.img.offsetWidth * zoom.s;
        const h = el.img.offsetHeight * zoom.s;
        const maxX = Math.max(0, (w - el.stage.clientWidth) / 2);
        const maxY = Math.max(0, (h - el.stage.clientHeight) / 2);
        zoom.x = Math.min(maxX, Math.max(-maxX, zoom.x));
        zoom.y = Math.min(maxY, Math.max(-maxY, zoom.y));
    }

    // Zoom to scale s keeping the screen point (px, py) still
    function zoomTo(s, px, py, animate) {
        if (views[viewIndex] && views[viewIndex].type === 'scale') return;
        const r = el.stage.getBoundingClientRect();
        const cx = (px ?? r.left + r.width / 2) - (r.left + r.width / 2);
        const cy = (py ?? r.top + r.height / 2) - (r.top + r.height / 2);
        s = Math.min(MAX_ZOOM, Math.max(1, s));
        const k = s / zoom.s;
        zoom.x = cx - (cx - zoom.x) * k;
        zoom.y = cy - (cy - zoom.y) * k;
        zoom.s = s;
        if (s === 1) { zoom.x = 0; zoom.y = 0; }
        clampPan();
        applyZoom(animate);
        if (s > 1) upgradeToSharp();
    }

    function resetZoom(animate) {
        zoom.s = 1; zoom.x = 0; zoom.y = 0;
        applyZoom(animate);
    }

    // When zooming in, make sure the full-resolution picture is showing
    function upgradeToSharp() {
        const view = views[viewIndex];
        if (view && view.high && el.img.getAttribute('src') !== view.high) {
            const token = loadToken;
            const hi = new Image();
            hi.onload = () => { if (token === loadToken) el.img.src = view.high; };
            hi.src = view.high;
        }
    }

    window.zoomIn = () => zoomTo(zoom.s * 1.5, null, null, true);
    window.zoomOut = () => zoomTo(zoom.s / 1.5, null, null, true);
    window.resetZoomPan = () => resetZoom(true);

    // ------------------------------------------------------------- gestures
    function onWheel(e) {
        e.preventDefault();
        // trackpad pinch arrives as ctrl+wheel with small deltas
        const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0025));
        zoomTo(zoom.s * factor, e.clientX, e.clientY, false);
    }

    function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
    function midpoint(a, b) { return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }

    function onPointerDown(e) {
        if (e.button > 0) return;
        if (e.target.closest('button')) return;
        try { el.stage.setPointerCapture(e.pointerId); } catch (err) { /* synthetic events */ }
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

        if (pointers.size === 2) {
            const [a, b] = [...pointers.values()];
            gesture = { type: 'pinch', dist: distance(a, b), s: zoom.s, mid: midpoint(a, b) };
            return;
        }
        gesture = { type: 'pending', x0: e.clientX, y0: e.clientY, zx: zoom.x, zy: zoom.y, t0: performance.now(), pointerType: e.pointerType };
    }

    function onPointerMove(e) {
        if (!pointers.has(e.pointerId)) return;
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (!gesture) return;

        if (gesture.type === 'pinch' && pointers.size >= 2) {
            const [a, b] = [...pointers.values()];
            const m = midpoint(a, b);
            zoomTo(gesture.s * distance(a, b) / gesture.dist, m.x, m.y, false);
            return;
        }

        const dx = e.clientX - gesture.x0;
        const dy = e.clientY - gesture.y0;

        if (gesture.type === 'pending') {
            if (Math.hypot(dx, dy) < 8) return;
            if (zoom.s > 1.01) gesture.type = 'pan';
            else if (Math.abs(dx) > Math.abs(dy)) gesture.type = 'swipe';
            else if (dy > 0 && gesture.pointerType !== 'mouse') gesture.type = 'dismiss';
            else { gesture.type = 'none'; return; }
            el.box.classList.add('dragging');
        }

        if (gesture.type === 'pan') {
            zoom.x = gesture.zx + dx;
            zoom.y = gesture.zy + dy;
            clampPan();
            applyZoom(false);
        } else if (gesture.type === 'swipe' && list.length > 1) {
            el.img.style.transition = 'none';
            el.img.style.transform = `translateX(${dx}px)`;
            el.img.style.opacity = String(1 - Math.min(0.5, Math.abs(dx) / el.stage.clientWidth));
        } else if (gesture.type === 'dismiss') {
            el.img.style.transition = 'none';
            el.img.style.transform = `translateY(${Math.max(0, dy)}px) scale(${1 - Math.min(0.2, dy / 1500)})`;
            el.box.style.setProperty('--lb-backdrop', String(Math.max(0.35, 1 - dy / 500)));
        }
    }

    function onPointerUp(e) {
        if (!pointers.has(e.pointerId)) return;
        pointers.delete(e.pointerId);
        const g = gesture;
        if (pointers.size > 0) {
            // one finger lifted from a pinch: carry on as a pan
            if (g && g.type === 'pinch') {
                const p = [...pointers.values()][0];
                gesture = { type: zoom.s > 1.01 ? 'pan' : 'none', x0: p.x, y0: p.y, zx: zoom.x, zy: zoom.y };
            }
            return;
        }
        gesture = null;
        el.box.classList.remove('dragging');
        if (!g) return;

        const dx = e.clientX - (g.x0 ?? e.clientX);
        const dy = e.clientY - (g.y0 ?? e.clientY);
        const dt = performance.now() - (g.t0 || 0);

        if (g.type === 'swipe') {
            el.img.style.opacity = '';
            const fast = Math.abs(dx) / Math.max(dt, 1) > 0.5;
            if (list.length > 1 && (Math.abs(dx) > el.stage.clientWidth * 0.18 || (fast && Math.abs(dx) > 30))) {
                window.navigateArtwork(dx < 0 ? 'next' : 'prev');
            } else {
                resetZoom(true);
            }
        } else if (g.type === 'dismiss') {
            el.box.style.removeProperty('--lb-backdrop');
            if (dy > 110 || (dy > 40 && dy / Math.max(dt, 1) > 0.5)) window.closeLightbox();
            else resetZoom(true);
        } else if (g.type === 'pending') {
            handleTap(e);
        }
    }

    // Double tap / double click zooms in on that spot (or back out);
    // a single tap on a phone hides the buttons for an uncluttered view
    function handleTap(e) {
        const now = performance.now();
        const isDouble = now - lastTap.t < 300 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 30;
        if (isDouble) {
            clearTimeout(tapTimer);
            lastTap.t = 0;
            if (zoom.s > 1.01) resetZoom(true);
            else zoomTo(2.5, e.clientX, e.clientY, true);
            return;
        }
        lastTap = { t: now, x: e.clientX, y: e.clientY };
        if (e.pointerType !== 'mouse') {
            clearTimeout(tapTimer);
            tapTimer = setTimeout(() => {
                if (el.box.classList.contains('sheet-open')) el.box.classList.remove('sheet-open');
                else el.box.classList.toggle('immersive');
            }, 300);
        }
    }

    function onPointerCancel(e) {
        pointers.delete(e.pointerId);
        if (pointers.size === 0) {
            gesture = null;
            el.box.classList.remove('dragging');
            el.box.style.removeProperty('--lb-backdrop');
            el.img.style.opacity = '';
            if (zoom.s <= 1.01) resetZoom(true);
        }
    }

    // ------------------------------------------------------------- details panel / sheet
    function toggleInfo() {
        if (isPhone()) {
            el.box.classList.toggle('sheet-open');
            el.box.classList.remove('immersive');
        } else {
            const hidden = el.box.classList.toggle('info-hidden');
            sessionSet('lbInfoHidden', hidden ? '1' : '0');
            requestAnimationFrame(() => { clampPan(); applyZoom(false); });
        }
    }

    // Drag the sheet handle up / down on phones
    function setupSheetDrag() {
        let startY = null;
        el.sheetHandle.addEventListener('pointerdown', e => { startY = e.clientY; });
        el.sheetHandle.addEventListener('pointerup', e => {
            if (startY === null) return;
            const dy = e.clientY - startY;
            startY = null;
            if (Math.abs(dy) < 10) toggleInfo();
            else el.box.classList.toggle('sheet-open', dy < 0);
        });
    }

    // ------------------------------------------------------------- hint
    function showHintOnce() {
        if (sessionGet('lbHintShown')) return;
        sessionSet('lbHintShown', '1');
        const zh = lang() === 'zh';
        el.hint.textContent = isPhone()
            ? (zh ? '左右滑動看下一張 · 兩指放大 · 往下滑關閉' : 'Swipe for the next one · pinch to zoom · swipe down to close')
            : (zh ? '← → 切換作品 · 滾輪或雙擊放大 · Esc 關閉' : '← → to browse · scroll or double-click to zoom · Esc to close');
        el.hint.classList.add('show');
        setTimeout(() => el.hint.classList.remove('show'), 3200);
    }

    function sessionGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
    function sessionSet(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* private mode */ } }

    // ------------------------------------------------------------- keyboard
    function onKey(e) {
        if (!el.box.classList.contains('active')) return;
        const a = document.activeElement;
        if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT' || a.isContentEditable)) {
            if (e.key === 'Escape') window.closeLightbox();
            return;
        }
        if (document.querySelector('.contact-form-modal, .qr-modal')) return;
        switch (e.key) {
            case 'Escape':
                if (document.querySelector('.share-dropdown')) closeShareMenu();
                else if (zoom.s > 1.01) resetZoom(true);
                else window.closeLightbox();
                break;
            case 'ArrowLeft': e.preventDefault(); window.navigateArtwork('prev'); break;
            case 'ArrowRight': e.preventDefault(); window.navigateArtwork('next'); break;
            case '+': case '=': e.preventDefault(); window.zoomIn(); break;
            case '-': case '_': e.preventDefault(); window.zoomOut(); break;
            case '0': e.preventDefault(); resetZoom(true); break;
            case 'i': case 'I': toggleInfo(); break;
        }
    }

    // ------------------------------------------------------------- share
    function closeShareMenu() {
        const d = document.querySelector('.share-dropdown');
        if (d) d.remove();
    }

    window.shareArtwork = function () {
        if (document.querySelector('.share-dropdown')) { closeShareMenu(); return; }
        const artwork = list[index];
        if (!artwork) return;
        const zh = lang() === 'zh';
        const url = `${window.location.origin}${window.location.pathname}?artwork=${artwork.id}&lang=${lang()}`;

        const menu = document.createElement('div');
        menu.className = 'share-dropdown';
        menu.innerHTML = `
            <button type="button" class="share-option" data-act="copy">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.71"/></svg>
                <span>${zh ? '複製連結' : 'Copy link'}</span>
            </button>
            <button type="button" class="share-option" data-act="qr">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="5" height="5"/><rect x="3" y="16" width="5" height="5"/><rect x="16" y="3" width="5" height="5"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/></svg>
                <span>${zh ? 'QR Code' : 'QR code'}</span>
            </button>`;
        menu.querySelector('[data-act="copy"]').addEventListener('click', () => window.copyArtworkLink(url));
        menu.querySelector('[data-act="qr"]').addEventListener('click', () => window.generateQRCode(url));

        const r = el.share.getBoundingClientRect();
        Object.assign(menu.style, { position: 'fixed', top: `${r.bottom + 8}px`, right: `${Math.max(8, window.innerWidth - r.right)}px`, zIndex: '10010' });
        document.body.appendChild(menu);
        setTimeout(() => {
            document.addEventListener('click', function off(e) {
                if (!menu.contains(e.target) && e.target !== el.share) { menu.remove(); document.removeEventListener('click', off); }
            });
        }, 0);
    };

    window.copyArtworkLink = function (url) {
        const zh = lang() === 'zh';
        const done = (ok) => feedback(ok ? (zh ? '已複製連結' : 'Link copied') : (zh ? '無法複製' : 'Could not copy'));
        if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => done(true), () => done(false));
        else {
            const ta = document.createElement('textarea');
            ta.value = url;
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand('copy'); done(true); } catch (e) { done(false); }
            ta.remove();
        }
        closeShareMenu();
    };

    window.generateQRCode = function (url) {
        const zh = lang() === 'zh';
        const modal = document.createElement('div');
        modal.className = 'qr-modal';
        modal.innerHTML = `
            <div class="qr-modal-content">
                <div class="qr-header">
                    <h3>${zh ? '掃描 QR Code 分享' : 'Scan to share'}</h3>
                    <button class="qr-close" type="button">×</button>
                </div>
                <div class="qr-code-container"><img alt="QR code" width="200" height="200"></div>
                <p class="qr-url"></p>
            </div>`;
        modal.querySelector('.qr-url').textContent = url;
        modal.querySelector('img').src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
        modal.querySelector('.qr-close').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
        document.body.appendChild(modal);
        closeShareMenu();
    };

    function feedback(message) {
        const n = document.createElement('div');
        n.className = 'lb-toast';
        n.textContent = message;
        document.body.appendChild(n);
        setTimeout(() => n.classList.add('show'), 10);
        setTimeout(() => { n.classList.remove('show'); setTimeout(() => n.remove(), 300); }, 1800);
    }

    // ------------------------------------------------------------- language
    window.updateLightboxLanguage = function () {
        if (el.box && el.box.classList.contains('active')) {
            const keep = viewIndex;
            render();
            if (keep && views[keep]) showView(keep);
            buildFilmstrip();
            markFilmstrip();
        }
    };

    // ------------------------------------------------------------- setup
    function init() {
        el.box = $('lightbox');
        if (!el.box) return;
        Object.assign(el, {
            stage: $('lbStage'), img: $('lightboxImage'), panel: $('lbPanel'), film: $('lbFilmstrip'),
            counter: $('lbCounter'), hint: $('lbHint'), sheetTitle: $('lbSheetTitle'), sheetHandle: $('lbSheetHandle'),
            prev: el.box.querySelector('.nav-arrow.prev'), next: el.box.querySelector('.nav-arrow.next'),
            close: $('lbClose'), share: $('lbShare'), infoToggle: $('lbInfoToggle'),
            zoomIn: $('lbZoomIn'), zoomOut: $('lbZoomOut'), zoomLevel: $('lbZoomLevel')
        });

        el.stage.addEventListener('wheel', onWheel, { passive: false });
        el.stage.addEventListener('pointerdown', onPointerDown);
        el.stage.addEventListener('pointermove', onPointerMove);
        el.stage.addEventListener('pointerup', onPointerUp);
        el.stage.addEventListener('pointercancel', onPointerCancel);
        el.stage.addEventListener('contextmenu', e => e.preventDefault());   // no "save image" menu
        el.img.addEventListener('animationend', () => el.img.classList.remove('slide-in-left', 'slide-in-right'));
        el.img.addEventListener('load', () => { clampPan(); applyZoom(false); });

        el.zoomIn.addEventListener('click', window.zoomIn);
        el.zoomOut.addEventListener('click', window.zoomOut);
        el.zoomLevel.addEventListener('click', () => resetZoom(true));
        el.infoToggle.addEventListener('click', toggleInfo);
        setupSheetDrag();

        document.addEventListener('keydown', onKey);
        window.addEventListener('resize', () => {
            if (!el.box.classList.contains('active')) return;
            clampPan();
            applyZoom(false);
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
