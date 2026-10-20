// Google Analytics 4 for xiaoranart.com (property "xiaoranart.com", ID below).
//
// Page views (including / vs /zh/ and ?utm_source=… links) are recorded automatically.
// On top of that this file sends a few events that answer "what do visitors do":
//   view_item       - a painting opened / swiped to in the large viewer (lightbox)
//   select_item     - a print size chosen
//   add_to_cart     - a print added to the cart
//   begin_checkout  - Checkout pressed (sent from js/shopping.js)
//   purchase        - order completed (sent from order_success_page.html)
//   generate_lead   - inquiry form for an original sent (sent from js/contact-form.js)
// Other scripts call window.trackEvent(name, params); it never throws, so a blocked
// or slow Google script can't break the gallery or the shop.
(function () {
    var GA_ID = 'G-P2575FCGHY';

    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    gtag('js', new Date());
    gtag('config', GA_ID, {
        site_language: /^\/zh(\/|$)/.test(location.pathname) ? 'zh' : 'en'
    });

    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);

    window.trackEvent = function (name, params) {
        try { gtag('event', name, params || {}); } catch (e) { /* analytics must never break the site */ }
    };

    // One GA "item" per painting, so reports can be grouped by painting and series.
    window.analyticsItem = function (artwork, extra) {
        if (!artwork) return {};
        var item = {
            item_id: String(artwork.id || ''),
            item_name: artwork.title || artwork.titleEn || '',
            item_category: artwork.series || '',
            item_category2: String(artwork.year || '')
        };
        for (var k in (extra || {})) item[k] = extra[k];
        return item;
    };

    // The viewer announces every painting it shows (open, swipe, arrows).
    var lastViewed = null;
    document.addEventListener('artworkChanged', function (e) {
        var artwork = e.detail && e.detail.artwork;
        if (!artwork || artwork.id === lastViewed) return;
        lastViewed = artwork.id;
        window.trackEvent('view_item', { items: [window.analyticsItem(artwork)] });
    });
    document.addEventListener('lightboxClosed', function () { lastViewed = null; });
})();
