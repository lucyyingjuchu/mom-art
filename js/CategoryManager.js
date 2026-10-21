// CategoryManager.js - the gallery's subjects (題材), shared by the website and the admin page.
//
// One list, one rule: each work has a `subjects` list in artworks.json, picked by hand,
// and every subject is one gallery tab. A work may have several subjects and then
// appears under each of those tabs. The list and the zh/en names live in
// data/category-config.json.

if (!window.categoryManagerLoaded) {
    window.categoryManagerLoaded = true;

    const FALLBACK_CONFIG = {
        subjects: ['landscape', 'waterfall', 'flowingclouds', 'flowers', 'moon', 'abstract', 'calligraphy'],
        labels: {
            zh: { landscape: '山水', waterfall: '瀑布', flowingclouds: '煙雲', flowers: '花鳥', moon: '明月', abstract: '抽象', calligraphy: '書法' },
            en: { landscape: 'Landscapes', waterfall: 'Waterfalls', flowingclouds: 'Clouds & Mist', flowers: 'Flowers & Birds', moon: 'Moon', abstract: 'Abstract', calligraphy: 'Calligraphy' }
        },
        aliases: {}
    };

    const OTHER_LABELS = {
        zh: { available: '可售', sold: '已售', unknown: '狀態未明', uncategorized: '未分類' },
        en: { available: 'Available', sold: 'Sold', unknown: 'Status Unknown', uncategorized: 'Uncategorized' }
    };

    class CategoryManager {
        constructor() {
            this.config = FALLBACK_CONFIG;
            this.loaded = false;
        }

        async loadConfig() {
            if (this.loaded) return this.config;
            try {
                const response = await fetch('./data/category-config.json');
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const cfg = await response.json();
                if (!Array.isArray(cfg.subjects) || !cfg.labels) throw new Error('unexpected format');
                this.config = cfg;
            } catch (error) {
                console.warn('⚠️ category-config.json not loaded, using built-in list:', error.message);
                this.config = FALLBACK_CONFIG;
            }
            this.loaded = true;
            return this.config;
        }

        getAllSubjects() {
            return [...this.config.subjects];
        }

        getAllLocations() {
            return [];   // locations were retired
        }

        isSubject(key) {
            return this.config.subjects.includes(key);
        }

        isLocation() {
            return false;
        }

        getCategoryLabel(key, language = 'zh') {
            const lang = language === 'en' ? 'en' : 'zh';
            return this.config.labels[lang]?.[key] || OTHER_LABELS[lang][key] || key;
        }

        // 山水 / Landscapes / landscape / 墨竹 (alias) -> 'landscape' / 'flowers'; unknown -> null
        normalize(word) {
            const w = String(word || '').trim();
            if (!w) return null;
            if (this.isSubject(w)) return w;
            const lower = w.toLowerCase();
            for (const key of this.config.subjects) {
                if (key.toLowerCase() === lower) return key;
                for (const lang of ['zh', 'en']) {
                    if ((this.config.labels[lang]?.[key] || '').toLowerCase() === lower) return key;
                }
            }
            const alias = (this.config.aliases || {})[w] || (this.config.aliases || {})[lower];
            return alias && this.isSubject(alias) ? alias : null;
        }

        chineseToEnglish(word) {
            return this.normalize(word) || word;
        }

        // The work's subjects, in the configured order
        getArtworkCategories(artwork) {
            const raw = Array.isArray(artwork?.subjects) ? artwork.subjects : [];
            const keys = new Set(raw.map(s => this.normalize(s)).filter(Boolean));
            // 山水 is for landscapes that are neither waterfalls nor clouds & mist
            if (keys.has('waterfall') || keys.has('flowingclouds')) keys.delete('landscape');
            return this.config.subjects.filter(s => keys.has(s));
        }

        separateCategories(categories) {
            return { subjects: (categories || []).filter(c => this.isSubject(c)), locations: [], unknown: [] };
        }

        getArtworkAvailability(artwork) {
            const a = artwork.available;
            if (a === true || a === 'true') return 'available';
            if (a === false || a === 'false') return 'sold';
            return 'unknown';
        }

        calculateStats(artworks) {
            const stats = { subjects: {}, locations: {}, availability: { available: 0, sold: 0, unknown: 0 } };
            for (const artwork of artworks || []) {
                const subjects = this.getArtworkCategories(artwork);
                if (!subjects.length) stats.subjects.uncategorized = (stats.subjects.uncategorized || 0) + 1;
                subjects.forEach(s => { stats.subjects[s] = (stats.subjects[s] || 0) + 1; });
                stats.availability[this.getArtworkAvailability(artwork)]++;
            }
            return stats;
        }

        // filters: { subject: [...], availability: [...] } - a work matches a group when it has any of its values
        artworkMatchesFilters(artwork, filters) {
            for (const [type, values] of Object.entries(filters || {})) {
                if (!Array.isArray(values) || !values.length) continue;
                if (type === 'subject') {
                    const subjects = this.getArtworkCategories(artwork);
                    const ok = values.includes('uncategorized') ? !subjects.length : values.some(v => subjects.includes(v));
                    if (!ok) return false;
                } else if (type === 'availability') {
                    if (!values.includes(this.getArtworkAvailability(artwork))) return false;
                }
            }
            return true;
        }

        generateFilterHTML() {
            return '';   // the old filter wall was replaced by the gallery tabs
        }

        debugArtwork(artwork) {
            console.log(`🎨 ${artwork.title || artwork.id}:`, this.getArtworkCategories(artwork));
        }

        debugConfig() {
            console.log('🔧 Subjects:', this.config.subjects, 'loaded:', this.loaded);
        }

        // ---- Shared by the gallery (js/portfolio.js) and the admin page, so both
        // show the same tabs and the same order.

        // Gallery tabs: 全部, then one tab per subject
        getGalleryTabs() {
            return [
                { key: 'all', zh: '全部', en: 'All', subjects: [] },
                ...this.config.subjects.map(key => ({
                    key,
                    zh: this.getCategoryLabel(key, 'zh'),
                    en: this.getCategoryLabel(key, 'en'),
                    subjects: [key]
                }))
            ];
        }

        // Tabs an artwork appears under (besides 全部)
        getArtworkTabs(artwork) {
            const subjects = this.getArtworkCategories(artwork);
            return this.getGalleryTabs().filter(t => t.subjects.some(s => subjects.includes(s)));
        }

        galleryYear(artwork) {
            const m = String(artwork.year || '').match(/\d{4}/);
            return m ? parseInt(m[0], 10) : -1;
        }

        gallerySeriesKey(artwork) {
            if (artwork.series) return 'series:' + artwork.series;
            return 'subject:' + (this.getArtworkCategories(artwork)[0] || '');
        }

        // Gallery order: newest year first; inside a year each series stays together
        // (series in the order they first appear in fileOrder, works in file order).
        // Works without a series form a group per main subject. Unknown years go last.
        // rankFirst (optional) returns 0/1 to push some works to the end (e.g. no photo).
        sortForGallery(list, fileOrder, rankFirst = () => 0) {
            const fileIndex = new Map(fileOrder.map((a, i) => [a.id, i]));
            const groupKey = a => this.galleryYear(a) + '|' + this.gallerySeriesKey(a);
            const firstSeen = new Map();
            for (const a of fileOrder) {
                const key = groupKey(a);
                if (!firstSeen.has(key)) firstSeen.set(key, fileIndex.get(a.id));
            }
            return [...list].sort((a, b) =>
                rankFirst(a) - rankFirst(b) ||
                this.galleryYear(b) - this.galleryYear(a) ||
                firstSeen.get(groupKey(a)) - firstSeen.get(groupKey(b)) ||
                fileIndex.get(a.id) - fileIndex.get(b.id));
        }
    }

    const categoryManager = new CategoryManager();
    window.categoryManager = categoryManager;
}
