// Sub-tabs for long pages (About, FAQ), styled like the gallery series tabs.
// Each tab shows one panel; the rest are hidden, so visitors jump straight to
// what they want instead of scrolling past long text.
// The Exhibitions & News page builds its own tabs in js/story-media.js.
(function () {
    'use strict';

    const t = (path) => (typeof portfolio !== 'undefined' ? portfolio.t(path) : '');
    const esc = (str) => String(str == null ? '' : str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const groups = [];

    function render(group) {
        group.nav.innerHTML = group.panels.map((p) => {
            const on = p.key === group.current;
            return `<button type="button" class="gallery-tab${on ? ' active' : ''}" data-tab="${p.key}" aria-pressed="${on}">${esc(p.label() || p.key)}</button>`;
        }).join('');
        group.panels.forEach((p) => p.els().forEach((el) => {
            if (el) el.classList.toggle('subtab-hidden', p.key !== group.current);
        }));
    }

    function makeTabs(section, anchor, panels, extraClass) {
        if (!section || !anchor) return;
        const nav = document.createElement('nav');
        nav.className = 'gallery-tabs sub-tabs';
        anchor.parentNode.insertBefore(nav, anchor);
        if (extraClass) section.classList.add(extraClass);
        const group = { nav, panels, current: panels[0].key };
        nav.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-tab]');
            if (!btn) return;
            group.current = btn.dataset.tab;
            render(group);
        });
        groups.push(group);
        render(group);
    }

    function init() {
        const about = document.getElementById('about');
        if (about) {
            const q = (sel) => () => [about.querySelector(sel)];
            makeTabs(about, about.querySelector('.about-header'), [
                { key: 'story', label: () => t('about.tabStory'), els: q('.about-header') },
                { key: 'videos', label: () => t('about.tabVideos'), els: q('#aboutVideo') },
                { key: 'career', label: () => t('about.tabCareer'), els: q('.professional-info') }
            ]);
        }

        const faq = document.getElementById('faq');
        const faqSections = faq && faq.querySelector('.faq-sections');
        if (faqSections) {
            const blocks = Array.from(faqSections.querySelectorAll('.faq-section'));
            const keys = ['authenticity', 'shipping', 'pricing'];
            makeTabs(faq, faqSections, blocks.map((el, i) => ({
                key: keys[i] || String(i),
                label: () => t(`faq.tabs.${keys[i]}`),
                els: () => [el]
            })), 'faq-tabbed');
        }
    }

    const refresh = () => groups.forEach(render);
    document.addEventListener('languageChanged', refresh);
    window.addEventListener('load', refresh);
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(init, 0));
    } else {
        setTimeout(init, 0);
    }
})();
