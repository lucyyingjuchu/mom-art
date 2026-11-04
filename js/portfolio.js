// Content Management System for Chinese Art Portfolio - UPDATED WITH CATEGORY MANAGER
// Now uses centralized category configuration instead of hardcoded lists

// Content Management System for Chinese Art Portfolio - UPDATED WITH CATEGORY MANAGER
// Now uses centralized category configuration instead of hardcoded lists

// Originals are priced by size. To change the price of every work, change these numbers.
// Chinese site shows NT$, English site shows US$. A price is rounded to NT$1,000 / US$100.
// One work can be set by hand in its price field (a number in NT$, or text for "on request").
const ORIGINAL_PRICING = {
    showPrices: true,         // false hides every price
    ntdPerUnit: 35000,        // NT$ per unit (Chinese site)
    usdPerUnit: 1200,         // US$ per unit (English site)
    unitCm: 30,               // one unit is 30 × 30 cm
    onRequestFromUnits: 30    // this many units or more: "price on request"
};

class ChineseArtPortfolio {
    constructor() {
        this.artworks = [];
        this.categories = {};
        // Language comes from the URL: /zh/ = Chinese, / = English.
        // (Netlify sends Chinese-language browsers from / to /zh/ — see netlify.toml.)
        // Old links like /?artwork=12&lang=zh still open in Chinese and move to /zh/.
        const onZhPath = /^\/zh(\/|$)/.test(window.location.pathname);
        const langParam = new URLSearchParams(window.location.search).get('lang');
        this.currentLanguage = (onZhPath || langParam === 'zh') ? 'zh' : 'en';
        if (langParam === 'en' && onZhPath) this.currentLanguage = 'en';
        this.syncLanguageURL();
        this.filterStats = {};
        this.currentGalleryOrder = []; // 當前藝廊顯示的作品順序

        // Track active multi-select filters - UPDATED for customer-friendly filters
        this.activeFilters = {
            subject: [],
            location: [],
            availability: [] // NEW: availability filter for customers
        };
        
        this.initializeAsync();
    }

    // FIXED: Initialize with proper async category loading and error handling
    async initializeAsync() {
        try {
            // Wait for CategoryManager to be available
            await this.waitForCategoryManager();
            
            // Load category configuration first
            await categoryManager.loadConfig();
            console.log('✅ Category manager initialized');
            
            // Then load artworks
            await this.loadArtworks();
        } catch (error) {
            console.error('❌ Failed to initialize portfolio:', error);
            // Fallback initialization without CategoryManager
            this.initializeFallback();
        }
    }

    // NEW: Wait for CategoryManager to be available
    async waitForCategoryManager(maxAttempts = 50) {
        for (let i = 0; i < maxAttempts; i++) {
            if (typeof categoryManager !== 'undefined') {
                console.log('✅ CategoryManager found after', i, 'attempts');
                return true;
            }
            await new Promise(resolve => setTimeout(resolve, 100)); // Wait 100ms
        }
        throw new Error('CategoryManager not available after 5 seconds');
    }

    // NEW: Fallback initialization if CategoryManager fails
    initializeFallback() {
        console.warn('⚠️ Running in fallback mode without CategoryManager');
        
        // Create a complete category manager fallback
        window.categoryManager = {
            loaded: true,
            config: {
                categories: { subjects: [], locations: [] },
                categoryMapping: { chineseToEnglish: {}, englishToChinese: {} }
            },
            calculateStats: (artworks) => {
                // Simple fallback stats calculation
                const stats = { subjects: {}, locations: {}, availability: { available: 0, sold: 0, unknown: 0 } };
                if (Array.isArray(artworks)) {
                    artworks.forEach(artwork => {
                        if (artwork.available === true || artwork.available === 'true') stats.availability.available++;
                        else if (artwork.available === false || artwork.available === 'false') stats.availability.sold++;
                        else stats.availability.unknown++;
                    });
                }
                return stats;
            },
            getCategoryLabel: (key) => key,
            generateFilterHTML: () => '<div class="filter-section"><p>分類功能暫時無法使用</p></div>',
            artworkMatchesFilters: () => true,
            getArtworkCategories: (artwork) => {
                // Simple fallback - just return existing categories
                return Array.isArray(artwork.subjects) ? artwork.subjects : [];
            },
            separateCategories: (categories) => ({ subjects: categories || [], locations: [], unknown: [] }),
            getArtworkAvailability: (artwork) => {
                const available = artwork.available;
                if (available === true || available === 'true') return 'available';
                if (available === false || available === 'false') return 'sold';
                return 'unknown';
            },
            artworkMatchesFilters: (artwork, activeFilters) => {
                // Simple fallback - show all artworks
                return true;
            }
        };
        
        this.loadArtworks();
    }

    // Get localized text from language dictionary
    t(path, params = {}) {
        const keys = path.split('.');
        let value = LANGUAGE_DATA[this.currentLanguage];
        
        for (const key of keys) {
            value = value?.[key];
        }
        
        if (!value) {
            console.warn(`Missing translation for: ${path}`);
            return path;
        }
        
        // Replace parameters like {count}, {total}, etc.
        let result = value;
        Object.keys(params).forEach(key => {
            result = result.replace(`{${key}}`, params[key]);
        });
        
        return result;
    }

    // Get localized placeholder image
    getPlaceholderImage() {
        return this.currentLanguage === 'zh' ? 
            './images/placeholder/artwork-placeholder-zh.svg' : 
            './images/placeholder/artwork-placeholder-en.svg';
    }

    // Load artworks from JSON file
    async loadArtworks() {
        try {
            const previews = fetch('./data/placeholders.json').then(r => r.ok ? r.json() : {}).catch(() => ({}));
            const response = await fetch('./data/artworks.json');
            const data = await response.json();
            this.placeholders = await previews;
            
            // Handle both formats: {artworks: [...]} or just [...]
            if (data.artworks) {
                this.artworks = data.artworks;
                this.categories = data.categories || {};
            } else if (Array.isArray(data)) {
                this.artworks = data;
                this.categories = this.getDefaultCategories();
            }
            
            // Only finished artworks go on the public site. Unfinished ones
            // (no photo yet, no title, or marked "draft"/hidden) stay in
            // artworks.json and are still listed on the admin page.
            this.allArtworks = this.artworks;
            this.artworks = this.artworks.filter(artwork => this.isPublicReady(artwork));
            console.log(`🖼️ Public artworks: ${this.artworks.length} of ${this.allArtworks.length} (rest are drafts)`);

            this.scripts = data.scripts || {};
            this.techniques = data.techniques || {};
            
            // UPDATED: Use CategoryManager to generate filter statistics
            this.filterStats = categoryManager.calculateStats(this.artworks);
            
            // Debug: Log how many artworks were properly categorized
            this.debugCategorization();
            
            // Initialize the gallery after loading data
            this.initializeGallery();
        } catch (error) {
            console.error('Error loading artworks:', error);
            // Fallback to empty data
            this.artworks = [];
            this.categories = this.getDefaultCategories();
            this.initializeGallery();
        }
    }

    // Debug categorization to find "uncategorized" artworks
    debugCategorization() {
        console.group('🔍 Artwork Categorization Debug');
        
        let categorized = 0;
        let uncategorized = 0;
        const issues = [];
        
        this.artworks.forEach((artwork, index) => {
            const allCategories = categoryManager.getArtworkCategories(artwork);
            
            if (allCategories.length > 0) {
                categorized++;
            } else {
                uncategorized++;
                issues.push({
                    index,
                    id: artwork.id,
                    title: artwork.title || 'Untitled',
                    subjects: artwork.subjects || []
                });
            }
        });
        
        console.log(`✅ Categorized: ${categorized}`);
        console.log(`❌ Uncategorized: ${uncategorized}`);
        
        if (issues.length > 0) {
            console.log('🚨 Uncategorized artworks:', issues.slice(0, 10)); // Show first 10
        }
        
        console.groupEnd();
    }

    // Default categories if not provided in JSON
    getDefaultCategories() {
        return {
            "paintings": {
                "name": "水墨畫",
                "nameEn": "Chinese Paintings"
            },
            "calligraphy": {
                "name": "書法",
                "nameEn": "Chinese Calligraphy"
            }
        };
    }

    // Helper function to safely get boolean values
    getBooleanValue(artwork, field, defaultValue = false) {
        const value = artwork[field];
        
        if (typeof value === 'boolean') {
            return value;
        }
        
        if (typeof value === 'string') {
            if (value === 'true' || value === '1' || value === 'yes') {
                return true;
            }
            if (value === 'false' || value === '0' || value === 'no') {
                return false;
            }
            if (value === '') {
                return defaultValue;
            }
        }
        
        if (value === null || value === undefined) {
            return defaultValue;
        }
        
        return defaultValue;
    }

    // Price of an original: { ntd, usd }, or null when it is "price on request".
    // A number in the artwork's own price field (admin page / Excel) wins; any other
    // text there, a missing or framed size, or a very large work means on request.
    originalPrice(artwork) {
        const rule = ORIGINAL_PRICING;
        const manual = String(artwork.price ?? '').trim();
        let units;
        if (manual) {
            const ntd = /^[\d,\s]+$/.test(manual) ? parseInt(manual.replace(/\D/g, ''), 10) : 0;
            units = ntd / rule.ntdPerUnit;
        } else {
            units = (parseFloat(artwork.heightCm) * parseFloat(artwork.widthCm)) / (rule.unitCm * rule.unitCm);
            if (artwork.sizeIncludesFrame || units >= rule.onRequestFromUnits) return null;
        }
        if (!units) return null;
        return {
            ntd: Math.round((units * rule.ntdPerUnit) / 1000) * 1000,
            usd: Math.round((units * rule.usdPerUnit) / 100) * 100
        };
    }

    // What the visitor reads: { main: 'US$7,200', note: 'Price is for the painting. …' }
    // Null while prices are hidden.
    originalPriceText(artwork) {
        if (!ORIGINAL_PRICING.showPrices) return null;
        const zh = this.currentLanguage === 'zh';
        const price = this.originalPrice(artwork);
        const note = this.t('lightbox.priceNote');
        if (!price) return { main: this.t('lightbox.priceOnRequest'), note };
        return {
            main: zh ? `NT$${price.ntd.toLocaleString('en-US')}` : `US$${price.usd.toLocaleString('en-US')}`,
            note
        };
    }

    // Get artwork by ID
    getArtwork(id) {
        return this.artworks.find(artwork => artwork.id === id);
    }

    // Toggle filter selection (multi-select)
    toggleFilter(filterType, filterValue) {
        if (!this.activeFilters[filterType]) {
            this.activeFilters[filterType] = [];
        }
        
        const index = this.activeFilters[filterType].indexOf(filterValue);
        if (index === -1) {
            // Add filter
            this.activeFilters[filterType].push(filterValue);
        } else {
            // Remove filter
            this.activeFilters[filterType].splice(index, 1);
        }
        
        // Re-render gallery with new filters
        this.renderGallery();
        
        // Update filter UI
        this.updateFilterUI();
    }

    // Clear all filters
    clearAllFilters() {
        this.activeFilters = {
            subject: [],
            location: [],
            availability: []
        };
        this.renderGallery();
        this.updateFilterUI();
    }

    // Update filter button states
    updateFilterUI() {
        document.querySelectorAll('.filter-btn, .secondary-filter-btn').forEach(btn => {
            const filterType = btn.dataset.filterType;
            const filterValue = btn.dataset.filterValue;
            
            if (filterType && filterValue && this.activeFilters[filterType]) {
                if (this.activeFilters[filterType].includes(filterValue)) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            }
        });
    }

    // UPDATED: Multi-select filter system using CategoryManager
    getMultiFilteredArtworks(activeFilters, artworks) {
        if (Object.keys(activeFilters).length === 0 || 
            Object.values(activeFilters).every(arr => arr.length === 0)) {
            return artworks;
        }

        return artworks.filter(artwork => {
            return categoryManager.artworkMatchesFilters(artwork, activeFilters);
        });
    }

    // Get featured artworks
    getFeaturedArtworks() {
        return this.artworks.filter(artwork => this.getBooleanValue(artwork, 'featured', false));
    }

    // Add this method anywhere in your ChineseArtPortfolio class
    getFeaturedImageUrl(artwork) {
        const isMobile = window.innerWidth <= 768;
        
        if (isMobile) {
            // Mobile: prioritize smaller images for performance
            return artwork.image || artwork.imageHigh || this.getPlaceholderImage();
        } else {
            // Desktop: prioritize high-quality images for hero display
            return artwork.imageHigh || artwork.image || this.getPlaceholderImage();
        }
    }

    // Search text ignores case, full- or half-width characters, spaces and punctuation,
    // so 墨荷-青煙, 墨荷－青煙 and 墨荷青煙 all find the same work
    foldForSearch(value) {
        return String(value ?? '').normalize('NFKC').toLowerCase()
            .replace(/[×✕]/g, 'x')
            .replace(/[\p{P}\p{S}\s]/gu, '');
    }

    // Search artworks - FIXED VERSION
    searchArtworks(query) {
        const searchTerm = this.foldForSearch(query);
        if (!searchTerm) return this.artworks; // Return all if empty search
        
        return this.artworks.filter(artwork => {
            const title = this.foldForSearch(artwork.title);
            const titleEn = this.foldForSearch(artwork.titleEn);
            const description = this.foldForSearch(artwork.description);
            const descriptionEn = this.foldForSearch(artwork.descriptionEn);
            const year = this.foldForSearch(artwork.year);
            const size = this.foldForSearch(artwork.sizeCm);
            // series and tab names too, so 霜林, 瀑布 or "moon" find their works
            const cm = window.categoryManager;
            const subjects = cm && cm.getArtworkCategories ? cm.getArtworkCategories(artwork)
                .flatMap(k => [cm.getCategoryLabel(k, 'zh'), cm.getCategoryLabel(k, 'en')]) : [];
            const more = [artwork.series, artwork.seriesEn, artwork.curatorNote, artwork.curatorNoteEn, ...subjects]
                .map(v => this.foldForSearch(v));

            return title.includes(searchTerm) ||
                   titleEn.includes(searchTerm) ||
                   description.includes(searchTerm) ||
                   descriptionEn.includes(searchTerm) ||
                   year.includes(searchTerm) ||
                   size.includes(searchTerm) ||
                   more.some(v => v.includes(searchTerm));
        });
    }

    // Get localized text for artwork fields
    getText(artwork, field) {
        if (this.currentLanguage === 'zh') {
            return artwork[field] || artwork[field + 'En'] || '';
        }
        return artwork[field + 'En'] || artwork[field] || '';
    }

    // Toggle language
    toggleLanguage() {
        this.currentLanguage = this.currentLanguage === 'en' ? 'zh' : 'en';
        this.syncLanguageURL();
        this.updateAllUI();
        // Update lightbox if it's open
        if (typeof window.updateLightboxLanguage === 'function') {
            window.updateLightboxLanguage();
        }
        // Notify shopping cart of language change
        document.dispatchEvent(new CustomEvent('languageChanged'));
    }

    // Keep the address bar (/ vs /zh/), <html lang> and Netlify's language
    // cookie in step with the current language, without reloading the page.
    syncLanguageURL() {
        const zh = this.currentLanguage === 'zh';
        document.documentElement.lang = zh ? 'zh-Hant' : 'en';
        // nf_lang makes Netlify remember the visitor's choice on later visits
        document.cookie = `nf_lang=${zh ? 'zh' : 'en'}; path=/; max-age=31536000; SameSite=Lax`;
        const url = new URL(window.location.href);
        url.searchParams.delete('lang');
        url.pathname = zh ? '/zh/' : '/';
        if (url.href !== window.location.href) {
            window.history.replaceState(window.history.state, '', url);
        }
    }

    // Update all UI elements when language changes
    updateAllUI() {
        this.updatePageTitle(); // ADD THIS LINE
        this.updateStaticText();
        this.initializeFAQ();
        this.renderGallery();
        this.renderFilterMenu();
        this.updateLanguageToggle();
    }

    // Update static text elements
    updateStaticText() {
        console.log('🚀 updateStaticText() started');

    // NAVIGATION
    const navKeys = { gallery: 'nav.gallery', news: 'nav.exhibitions', about: 'nav.about', faq: 'nav.faq' };
    document.querySelectorAll('.nav-btn[data-nav]').forEach(btn => {
        const key = navKeys[btn.dataset.nav];
        if (key) btn.textContent = this.t(key);
    });
        
        // HEADER
        const logoElement = document.querySelector('.logo');
        const subtitleElement = document.querySelector('.subtitle');
        
        if (logoElement) {
            // "Name - Studio": on phones the two parts sit on separate lines (css/mobile.css)
            const [name, studio] = this.t('header.title').split(' - ');
            logoElement.textContent = '';
            const a = document.createElement('span'); a.className = 'logo-name'; a.textContent = name;
            logoElement.append(a);
            if (studio) {
                const sep = document.createElement('span'); sep.className = 'logo-sep'; sep.textContent = ' - ';
                const b = document.createElement('span'); b.className = 'logo-studio'; b.textContent = studio;
                logoElement.append(sep, b);
            }
        }
        if (subtitleElement) subtitleElement.textContent = this.t('header.subtitle');

        // HOME PAGE
        const heroTitle = document.querySelector('.hero h1');
        const heroDesc = document.querySelector('.hero p');
        
        if (heroTitle) heroTitle.textContent = this.t('home.heroTitle');
        if (heroDesc) heroDesc.innerHTML = this.t('home.heroDescription');
        
        // ABOUT PAGE
        const aboutTitle = document.querySelector('.artist-intro h2');
        if (aboutTitle) aboutTitle.textContent = this.t('about.mainTitle');
        
        const artistSubtitle = document.getElementById('artistSubtitle');
        if (artistSubtitle) artistSubtitle.textContent = this.t('about.mainSubtitle');

        const artistQuote = document.getElementById('artistQuote');
        if (artistQuote) artistQuote.textContent = this.t('about.quote');

        // Artist story (array of paragraphs in languages.js)
        const artistStory = document.getElementById('artistStory');
        const story = this.t('about.story');
        if (artistStory && Array.isArray(story)) {
            artistStory.innerHTML = '';
            story.forEach(text => {
                const p = document.createElement('p');
                p.textContent = text;
                artistStory.appendChild(p);
            });
        }
        
        // Update section headers - PRESERVE ARROWS
        const sectionHeaders = document.querySelectorAll('.section-header');
        const headerKeys = ['educationTitle', 'awardsTitle', 'publicationsTitle', 'teachingTitle', 'positionsTitle', 'pastPositionsTitle'];
        
        sectionHeaders.forEach((header, index) => {
            if (headerKeys[index]) {
                const icon = header.textContent.split(' ')[0]; // Keep the emoji
                const arrow = header.querySelector('.toggle-arrow'); // SAVE THE ARROW
                
                // Update text without destroying the arrow
                if (arrow) {
                    // For collapsible headers, preserve the arrow
                    header.innerHTML = `${icon} ${this.t('about.' + headerKeys[index])}`;
                    header.appendChild(arrow); // PUT THE ARROW BACK
                } else {
                    // For non-collapsible headers, just update text
                    header.textContent = `${icon} ${this.t('about.' + headerKeys[index])}`;
                }
            }
        });
        
        // About CV lists come from data/cv.json, rendered by js/story-media.js
        
        // CONNECT PAGE: every element with data-i18n gets its text from languages.js
        document.querySelectorAll('#connect [data-i18n]').forEach(el => {
            el.textContent = this.t(el.dataset.i18n);
        });
        // "Copy" button next to the email address (for computers with no mail app)
        const copyBtn = document.querySelector('#connect .contact-copy');
        if (copyBtn) {
            copyBtn.onclick = () => {
                const email = copyBtn.dataset.email;
                const done = () => {
                    copyBtn.textContent = this.t('connect.copied');
                    clearTimeout(copyBtn._reset);
                    copyBtn._reset = setTimeout(() => { copyBtn.textContent = this.t('connect.copy'); }, 2000);
                };
                if (navigator.clipboard && window.isSecureContext) {
                    navigator.clipboard.writeText(email).then(done, () => window.prompt('', email));
                } else {
                    window.prompt('', email);  // old browsers: show it so it can be copied by hand
                }
            };
        }
        // English visitors see Pinterest (English-friendly) first; Chinese visitors, Facebook
        const pin = document.querySelector('#connect [data-social="pinterest"]');
        if (pin) pin.style.order = this.currentLanguage === 'en' ? '-1' : '';
        // Social cards without a link yet stay hidden
        document.querySelectorAll('#connect .contact-social-card').forEach(el => {
            el.hidden = !el.getAttribute('href');
        });

        const locationMap = document.getElementById('locationMap');
        if (locationMap) {
            if (this.currentLanguage === 'en') {
                locationMap.style.display = 'block';
            } else {
                locationMap.style.display = 'none';
            }
        }

        // LIGHTBOX ELEMENTS
        this.updateLightboxText();
    }
    
    // 🆕 新增：獲取當前藝廊顯示的作品列表（給 lightbox 使用）
    getCurrentGalleryArtworks() {
        return this.currentGalleryOrder.length > 0 ? this.currentGalleryOrder : this.artworks;
    }

    // 🆕 新增：根據 artwork ID 找到在當前藝廊中的位置
    findArtworkIndexInCurrentGallery(artworkId) {
        const currentOrder = this.getCurrentGalleryArtworks();
        return currentOrder.findIndex(artwork => artwork.id === artworkId);
    }

    // 🆕 新增：關閉 lightbox 後滾動到對應作品位置
    scrollToArtwork(artworkId) {
        const artworkElement = document.querySelector(`.gallery-item[data-artwork-id="${artworkId}"]`);
        if (artworkElement) {
            artworkElement.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
            
            // 🎯 可選：添加短暫的高亮效果
            artworkElement.style.transform = 'scale(1.02)';
            artworkElement.style.transition = 'transform 0.3s ease';
            setTimeout(() => {
                artworkElement.style.transform = '';
                setTimeout(() => {
                    artworkElement.style.transition = '';
                }, 300);
            }, 1000);
            
            console.log(`📍 Scrolled to artwork: ${artworkId}`);
        } else {
            console.warn(`⚠️ Artwork element not found: ${artworkId}`);
        }
    }

    // 🆕 新增：獲取當前藝廊顯示的作品列表（給 lightbox 使用）
    getCurrentGalleryArtworks() {
        return this.currentGalleryOrder.length > 0 ? this.currentGalleryOrder : this.artworks;
    }

    // 🆕 新增：根據 artwork ID 找到在當前藝廊中的位置
    findArtworkIndexInCurrentGallery(artworkId) {
        const currentOrder = this.getCurrentGalleryArtworks();
        return currentOrder.findIndex(artwork => artwork.id === artworkId);
    }

    // 🆕 新增：關閉 lightbox 後滾動到對應作品位置
    scrollToArtwork(artworkId) {
        const artworkElement = document.querySelector(`.gallery-item[data-artwork-id="${artworkId}"]`);
        if (artworkElement) {
            artworkElement.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
            
            // 🎯 可選：添加短暫的高亮效果
            artworkElement.style.transform = 'scale(1.02)';
            artworkElement.style.transition = 'transform 0.3s ease';
            setTimeout(() => {
                artworkElement.style.transform = '';
                setTimeout(() => {
                    artworkElement.style.transition = '';
                }, 300);
            }, 1000);
            
            console.log(`📍 Scrolled to artwork: ${artworkId}`);
        } else {
            console.warn(`⚠️ Artwork element not found: ${artworkId}`);
        }
    }

    // Helper method for about section lists
    updateAboutListContent(sectionId, items) {
        const section = document.getElementById(sectionId);
        
        if (!section) {
            console.warn(`About section not found: ${sectionId}`);
            return;
        }
        
        if (!Array.isArray(items)) {
            console.warn(`Items is not an array for section: ${sectionId}`, items);
            return;
        }
        
        // Try to find section content in different structures
        let contentContainer;
        
        if (section.classList.contains('section-content')) {
            contentContainer = section;
        } else {
            contentContainer = section.querySelector('.section-content');
        }
        
        if (!contentContainer) {
            contentContainer = section;
        }
        
        // Create the list content
        const thisYear = new Date().getFullYear();
        const current = this.t('about.currentBadge');
        const esc = (str) => String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        contentContainer.innerHTML = `<ul class="cv-list">${items.map(item => {
            const m = String(item).match(/^(\d{4})\s+(.*)$/);
            const isCurrent = /迄今|Present/.test(item) || sectionId === 'positions';
            const recent = m && (thisYear - parseInt(m[1], 10) <= 2);
            const year = m ? `<span class="cv-year">${m[1]}</span>` : '';
            const badge = isCurrent && sectionId !== 'positions' ? `<span class="cv-badge">${esc(current)}</span>` : '';
            return `<li class="${recent ? 'cv-recent' : ''}">${year}<span class="cv-text">${esc(m ? m[2] : item)}${badge}</span></li>`;
        }).join('')}</ul>`;
    }

    // Update lightbox text
    updateLightboxText() {
        const shareBtn = document.querySelector('.control-btn[onclick="shareArtwork()"]');
        if (shareBtn) shareBtn.title = this.t('lightbox.shareTitle');
        
        const closeBtn = document.querySelector('.control-btn[onclick="closeLightbox()"]');
        if (closeBtn) closeBtn.title = this.t('lightbox.closeTitle');
        
        const prevBtn = document.querySelector('.nav-arrow.prev');
        if (prevBtn) prevBtn.title = this.t('lightbox.prevTitle');
        
        const nextBtn = document.querySelector('.nav-arrow.next');
        if (nextBtn) nextBtn.title = this.t('lightbox.nextTitle');
    }

    // Update language toggle button
    updateLanguageToggle() {
        const langToggle = document.getElementById('languageToggle');
        if (langToggle) {
            langToggle.textContent = this.currentLanguage === 'en' ? '中' : 'En';
        }
    }

    // UPDATED: renderGallery method using CategoryManager
    renderGallery() {
        const galleryGrid = document.getElementById('galleryGrid');
        if (!galleryGrid) return;

        // Open tab, narrowed by the search box (if anything is typed)
        const query = (this.galleryQuery || '').trim();
        const base = query ? this.searchArtworks(query) : this.artworks;
        const filteredArtworks = this.getMultiFilteredArtworks(this.activeFilters, base);

        // Newest first, each year's series kept together (see sortForGallery)
        const artworksWithImages = filteredArtworks.filter(artwork => this.hasRealImage(artwork));
        const prioritizedArtworks = this.sortForGallery(filteredArtworks);

        // 🆕 重要：保存當前藝廊顯示的順序
        this.currentGalleryOrder = prioritizedArtworks;
        console.log(`✅ Saved gallery order: ${prioritizedArtworks.length} artworks`);

        // Calculate counts
        const activeFilterCount = Object.values(this.activeFilters).flat().length;
        const imageCount = artworksWithImages.length;
        const totalCount = filteredArtworks.length;

        // Quiet count under the tabs
        const resultsInfo = document.getElementById('resultsInfo');
        if (resultsInfo) {
            const zh = this.currentLanguage === 'zh';
            // The count only earns its place while searching
            resultsInfo.textContent = !query ? '' : (zh ? `找到 ${imageCount} 件「${query}」` : `${imageCount} ${imageCount === 1 ? 'work matches' : 'works match'} “${query}”`);
        }
        if (query && !filteredArtworks.length) {
            this.currentGalleryOrder = [];
            galleryGrid.innerHTML = `<p class="gallery-empty">${this.currentLanguage === 'zh'
                ? '沒有符合的作品，試試別的字或切到「全部」。'
                : 'No works match. Try another word, or the All tab.'}</p>`;
            return;
        }

        // Render artwork cards, grouped by year and series
        galleryGrid.innerHTML = this.renderGroupedCards(prioritizedArtworks);
        this.layoutGalleryRows();
        // fade the new gallery in once (restart the animation on the grid itself)
        galleryGrid.classList.remove('fade-in');
        void galleryGrid.offsetWidth;
        galleryGrid.classList.add('fade-in');
        
        // ADD THIS LINE:
        setTimeout(() => {
            this.addGalleryImageProtection();
        }, 100);

        console.log(`🎨 Gallery rendered: ${imageCount} with images, ${totalCount - imageCount} with placeholders`);
    }

    // ---- Gallery order: newest year first; inside a year, each series stays together
    // (series in the order they first appear in artworks.json, works in file order).
    // Works without a series form a group per main subject. Unknown years go last.
    galleryYear(artwork) {
        return window.categoryManager.galleryYear(artwork);
    }

    sortForGallery(list) {
        return window.categoryManager.sortForGallery(list, this.artworks,
            a => this.hasRealImage(a) ? 0 : 1);
    }

    // Year headings, a small series label, and one row block per group so every
    // group's last row stays its natural size
    renderGroupedCards(sorted) {
        const zh = this.currentLanguage === 'zh';
        const groups = [];
        for (const a of sorted) {
            const year = this.galleryYear(a);
            const series = a.series ? (zh ? a.series : (a.seriesEn || a.series)) : '';
            // named series get their own block; other works of a year flow together
            // (still sorted by subject) so small groups don't leave lone paintings
            const key = year + '|' + (a.series || '');
            const last = groups[groups.length - 1];
            if (last && last.key === key) last.items.push(a);
            else groups.push({ key, year, series, items: [a] });
        }
        let previousYear = null;
        let idx = 0;
        return groups.map(g => {
            const yearLabel = g.year > 0 ? String(g.year) : (zh ? '年份不詳' : 'Year unknown');
            const heading = g.year !== previousYear ? `<h3 class="gallery-year">${yearLabel}</h3>` : '';
            previousYear = g.year;
            return `
                <section class="gallery-group">
                    ${heading}
                    ${g.series ? `<h4 class="gallery-series">${g.series}</h4>` : ''}
                    <div class="gallery-rows">${g.items.map(a => this.createArtworkCard(a, idx++)).join('')}</div>
                </section>`;
        }).join('');
    }

    // Fit paintings into rows of (nearly) equal height, like a photo book: each row
    // takes as many works as brings its height closest to the target (--row-h), then
    // every work in it is scaled to that height. The last row of a group is never
    // stretched. Re-runs when the gallery's width changes or a photo reports its shape.
    layoutGalleryRows() {
        const grid = document.getElementById('galleryGrid');
        if (!grid) return;
        if (!this._galleryObserver && window.ResizeObserver) {
            let lastWidth = 0;
            this._galleryObserver = new ResizeObserver(entries => {
                const w = Math.round(entries[0].contentRect.width);
                if (w && w !== lastWidth) { lastWidth = w; this.layoutGalleryRows(); }
            });
            this._galleryObserver.observe(grid);
        }
        const target = parseFloat(getComputedStyle(grid).getPropertyValue('--row-h')) || 260;
        grid.querySelectorAll('.gallery-rows').forEach(block => {
            const width = block.clientWidth;
            if (!width) return;   // gallery tab hidden - the observer lays it out when shown
            const gap = parseFloat(getComputedStyle(block).columnGap) || 0;
            // always start from the gallery order (rows may have moved items before)
            block.querySelectorAll('.gallery-break').forEach(br => br.remove());
            const items = [...block.children].sort((a, b) => a.dataset.idx - b.dataset.idx);
            const box = el => Math.max(parseFloat(el.style.getPropertyValue('--r')) || 1, 0.5);
            const heightFor = row => (width - gap * (row.length - 1)) / row.reduce((s, el) => s + box(el), 0);
            // Vertical paintings get taller rows: the target grows as the row's paintings
            // get narrower (up to 2x), so scrolls show ~2 per row on a phone
            // Size class (see artworkSizeClass) keeps small pieces out of rows with larger works.
            const sizeClass = el => el.dataset.size || 'M';
            // Continuous scale: on-screen area grows with the square root of the painting's
            // real area, so on-screen width/height grow with the square root of its real
            // size. A 504 cm painting vs a 35 cm one: 14x apart on the wall, ~4x on screen.
            // Calibrated so a standard 4-chi work (68 x 136 cm) is 2 rows tall upright, 1 row lying.
            const REF_CM = 96;   // sqrt(68 * 136)
            const naturalH = el => {
                const cm = parseFloat(el.dataset.cm) || REF_CM;
                return target * Math.sqrt(2 * cm / (REF_CM * box(el)));
            };
            const maxH = Math.max(target, window.innerHeight * 0.8);   // a painting fits on screen
            const targetFor = row => {
                const logMean = row.reduce((sum, el) => sum + Math.log(naturalH(el)), 0) / row.length;
                return Math.min(Math.exp(logMean), maxH);
            };
            const miss = row => Math.abs(Math.log(heightFor(row) / targetFor(row)));
            // A row never holds more than MAX_ROW_CM of real painting width (about one
            // wall), so rows stay comparable and many works aren't squeezed into one.
            // A single painting wider than that keeps a row to itself.
            const MAX_ROW_CM = 360;
            const realW = el => parseFloat(el.dataset.wcm) || (parseFloat(el.dataset.cm) || REF_CM) * Math.sqrt(box(el));
            // On a phone, two works side by side is the most that stays readable
            const maxPerRow = window.innerWidth <= 768 ? 2 : Infinity;
            const tooWide = list => list.length > maxPerRow
                || (list.length > 1 && list.reduce((sum, el) => sum + realW(el), 0) > MAX_ROW_CM);

            // Fit one kind of painting into rows of (nearly) equal height
            const fitRows = list => {
                const rows = [];
                let row = [];
                for (const el of list) {
                    const withIt = [...row, el];
                    if (row.length && (tooWide(withIt) || (heightFor(withIt) < targetFor(withIt) && miss(row) <= miss(withIt)))) {
                        rows.push({ items: row, h: Math.min(heightFor(row), targetFor(row) * 1.25) });
                        row = [el];
                    } else {
                        row = withIt;
                    }
                }
                if (row.length) rows.push({ items: row, h: Math.min(heightFor(row), targetFor(row)) });
                // A short last row joins the one before it when that keeps paintings at
                // least 3/4 of the normal size (otherwise it stays, centered by CSS)
                const last = rows[rows.length - 1], prev = rows[rows.length - 2];
                if (prev && heightFor(last.items) > last.h * 1.4) {
                    const both = [...prev.items, ...last.items];
                    if (!tooWide(both) && heightFor(both) >= 0.75 * targetFor(both)) {
                        rows.splice(-2, 2, { items: both, h: heightFor(both) });
                    }
                }
                return rows;
            };

            // Vertical and horizontal paintings never share a row (in a shared row the
            // vertical one would be squeezed to the height of the wide one). Each kind is
            // fitted separately, then rows are interleaved by their first painting's place
            // in the gallery order, so newest-first and series grouping still hold.
            // Small pieces don't share a row with larger works either, or they would be
            // blown up to the larger work's height.
            const isVertical = el => box(el) < 0.9;
            // Upright and wide paintings never share a row, in any pass (squares go with either)
            const sameShape = list => !(list.some(el => box(el) < 0.9) && list.some(el => box(el) > 1.1));
            // A panorama (3:1 or wider, e.g. 17 x 92 cm) gets a row to itself at its own
            // scale: in a shared row it would set a height that shrinks everything else
            const isPano = el => box(el) >= 2.5;
            const panoRows = items.filter(isPano).map(el => ({
                items: [el], pano: true,
                h: Math.min(naturalH(el), (width - 1) / box(el))
            }));
            const kinds = new Map();
            for (const el of items.filter(el => !isPano(el))) {
                // large and medium works may share a row; small pieces keep to themselves
                const k = (isVertical(el) ? 'v' : 'h') + (sizeClass(el) === 'S' ? 'S' : 'LM');
                if (!kinds.has(k)) kinds.set(k, []);
                kinds.get(k).push(el);
            }
            const rows = [...kinds.values()].flatMap(list => fitRows(list)).concat(panoRows)
                .sort((a, b) => a.items[0].dataset.idx - b.items[0].dataset.idx);
            // Tidy-up: a row holding a single painting that fills less than half the width
            // joins the neighbouring row (the previous one if possible), unless that would
            // put a small piece next to a large work.
            const rowWidth = r => r.items.reduce((sum, el) => sum + box(el) * r.h, 0);
            const canShare = list => !(list.some(el => sizeClass(el) === 'S') && list.some(el => sizeClass(el) === 'L'));
            // Second pass: a lone small piece whose only neighbours are large works joins
            // them anyway (the continuous scale puts that row between the two sizes).
            for (const strict of [true, false]) {
                for (let i = 0; i < rows.length; i++) {
                    const r = rows[i];
                    if (r.pano || r.items.length !== 1 || rowWidth(r) >= width * 0.5) continue;
                    // a large work alone is a deliberate feature; only small pieces go looking
                    if (!strict && sizeClass(r.items[0]) === 'L') continue;
                    for (const j of [i - 1, i + 1]) {
                        const other = rows[j];
                        if (!other || other.pano) continue;
                        const both = j < i ? [...other.items, ...r.items] : [...r.items, ...other.items];
                        if (tooWide(both) || !sameShape(both) || (strict && !canShare(both))) continue;
                        const h = Math.min(heightFor(both), targetFor(both));
                        rows.splice(Math.min(i, j), 2, { items: both, h });
                        i = Math.max(-1, Math.min(i, j) - 1);   // re-check from the merged row
                        break;
                    }
                }
            }
            for (const { items: row, h } of rows) {
                for (const el of row) {
                    el.style.flex = `0 0 ${Math.floor(box(el) * h * 100) / 100}px`;
                    const img = el.querySelector('img[srcset]');
                    // browser picks thumb or large; screens denser than 2x are treated as 2x
                    // (no visible difference, saves phones from downloading every large file)
                    if (img) img.sizes = `${Math.ceil(box(el) * h * Math.min(1, 2 / (window.devicePixelRatio || 1)))}px`;
                    block.appendChild(el);   // DOM order = visual order (keyboard, screen readers)
                }
                // end the line here, so two short rows never share one line
                block.appendChild(Object.assign(document.createElement('div'), { className: 'gallery-break' }));
            }
        });
        // next/previous in the painting viewer follows what the visitor sees
        const shown = new Map(this.currentGalleryOrder.map(a => [a.id, a]));
        const visual = [...grid.querySelectorAll('.gallery-item')].map(el => shown.get(el.dataset.artworkId)).filter(Boolean);
        if (visual.length === shown.size) this.currentGalleryOrder = visual;
    }

    // A photo's real shape differs from the stored one - update it and re-fit (batched)
    galleryRatioChanged(img, ratio) {
        img.closest('.gallery-item').style.setProperty('--r', ratio.toFixed(3));
        clearTimeout(this._relayoutTimer);
        this._relayoutTimer = setTimeout(() => this.layoutGalleryRows(), 100);
    }

    // Width ÷ height of the photo, so each painting gets a box of its own shape.
    // imageRatio is stored in artworks.json; otherwise the cm size, then the photo itself on load.
    artworkRatio(artwork) {
        let r = parseFloat(artwork.imageRatio);
        if (!(r > 0) && artwork.heightCm && artwork.widthCm) r = artwork.widthCm / artwork.heightCm;
        return r > 0 ? r : 1;
    }

    // Side of a square with the painting's area, in cm (0 if unknown)
    artworkScaleCm(artwork) {
        const h = parseFloat(artwork.heightCm), w = parseFloat(artwork.widthCm);
        return h > 0 && w > 0 ? Math.round(Math.sqrt(h * w)) : 0;
    }

    // The painting's physical size class: 'L' large, 'M' medium, 'S' small, '' unknown.
    // Large = longest side 175 cm+, or as much area as a 115 cm square (big near-square works);
    // small = longest side under 90 cm. The gallery shows big originals bigger.
    artworkSizeClass(artwork) {
        const h = parseFloat(artwork.heightCm), w = parseFloat(artwork.widthCm);
        if (!(h > 0 && w > 0)) return '';
        const longest = Math.max(h, w);
        if (longest >= 175 || Math.sqrt(h * w) >= 115) return 'L';
        return longest < 90 ? 'S' : 'M';
    }

    // Thumbnails are 800 px on the long side; a wide painting that fills a row on a
    // large screen needs the large file, or it looks soft. srcset lets the browser pick;
    // layoutGalleryRows() sets each image's real display width in `sizes`.
    gallerySrcset(artwork, ratio) {
        const thumb = artwork.image, large = artwork.imageHigh;
        if (!thumb || !large || thumb === large) return '';
        const r = parseFloat(ratio) || 1;
        const extreme = r > 2.2 || r < 0.45;   // panoramas / tall scrolls get 2400 px large files
        const w = long => Math.round(r >= 1 ? long : long * r);
        return `srcset="${thumb} ${w(800)}w, ${large} ${w(extreme ? 2400 : 1600)}w" sizes="300px"`;
    }

    // Blurred preview from data/placeholders.json
    placeholderStyle(artwork) {
        const preview = this.placeholders?.[artwork.id];
        return preview ? ` style="background-image:url(${preview})"` : '';
    }

    // Create artwork card HTML - the whole painting, never cropped
    createArtworkCard(artwork, idx = 0) {
        const title = this.getText(artwork, 'title') || this.t('common.untitled');
        const imageUrl = artwork.image || artwork.imageHigh || this.getPlaceholderImage();
        const size = artwork.heightCm && artwork.widthCm ?
            `${artwork.heightCm} × ${artwork.widthCm} cm` : (artwork.sizeCm || '');
        const available = this.getBooleanValue(artwork, 'available', true);
        const year = this.galleryYear(artwork) > 0 ? artwork.year : '';
        const ratio = this.artworkRatio(artwork).toFixed(3);

        return `
            <div class="gallery-item" data-idx="${idx}" data-size="${this.artworkSizeClass(artwork)}" data-cm="${this.artworkScaleCm(artwork)}" data-wcm="${parseFloat(artwork.widthCm) || ''}" style="--r:${ratio}" onclick="openLightbox('${artwork.id}', 'gallery')" data-artwork-id="${artwork.id}">
                <div class="gallery-item-image"${this.placeholderStyle(artwork)}>
                    <img src="${imageUrl}" ${this.gallerySrcset(artwork, ratio)} alt="${title}" loading="lazy"
                         onload="this.classList.add('is-loaded'); const r=this.naturalWidth/this.naturalHeight; if (r && Math.abs(r-${ratio})>0.02) portfolio.galleryRatioChanged(this, r)"
                         onerror="this.src='${this.getPlaceholderImage()}'">
                </div>
                <div class="gallery-item-info">
                    <h3>${title}</h3>
                    <div class="artwork-meta">
                        ${[year, size].filter(Boolean).map(s => `<span>${s}</span>`).join('')}
                        ${available ? '' : `<span class="sold">${this.t('common.sold')}</span>`}
                    </div>
                </div>
            </div>
        `;
    }


    // Gallery series tabs: one quiet row, like an artist's catalogue.
    // Each tab maps to one or more subject categories in category-config.json.
    getGalleryTabs() {
        return window.categoryManager.getGalleryTabs();
    }

    generateFilterMenu() {
        const zh = this.currentLanguage === 'zh';
        const current = this.galleryTab || 'all';
        const tabs = this.getGalleryTabs().filter(tab => tab.key === 'all' ||
            this.getMultiFilteredArtworks({ subject: tab.subjects }, this.artworks).length > 0);
        const searchOpen = Boolean(this.gallerySearchOpen || this.galleryQuery);
        return `
            <nav class="gallery-tabs" aria-label="${zh ? '作品系列' : 'Series'}">
                ${tabs.map(tab => `<button type="button" class="gallery-tab${tab.key === current ? ' active' : ''}"
                    data-tab="${tab.key}" aria-pressed="${tab.key === current}">${zh ? tab.zh : tab.en}</button>`).join('')}
                <button type="button" id="gallerySearchToggle" class="gallery-search-toggle"
                    aria-controls="gallerySearchRow" aria-expanded="${searchOpen}"
                    aria-label="${searchOpen ? (zh ? '關閉搜尋' : 'Close search') : (zh ? '搜尋作品' : 'Search artworks')}">
                    <svg class="icon-search" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 20.5 20.5"/></svg>
                    <svg class="icon-close" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6 18 18M18 6 6 18"/></svg>
                </button>
            </nav>
            <div class="gallery-search-row${searchOpen ? ' open' : ''}" id="gallerySearchRow">
                <div class="gallery-search-inner">
                <input type="search" id="gallerySearch" class="gallery-search" autocomplete="off"
                    value="${(this.galleryQuery || '').replace(/[&"<>]/g, c => ({ '&': '&amp;', '"': '&quot;', '<': '&lt;', '>': '&gt;' }[c]))}"
                    placeholder="${zh ? '搜尋作品名稱、年份、系列…' : 'Search titles, years, series…'}"
                    aria-label="${zh ? '搜尋作品' : 'Search artworks'}">
                </div>
            </div>
        `;
    }

    setGalleryTab(key) {
        const tab = this.getGalleryTabs().find(t => t.key === key) || this.getGalleryTabs()[0];
        this.galleryTab = tab.key;
        this.activeFilters = { subject: [...tab.subjects], location: [], availability: [] };
        document.querySelectorAll('.gallery-tab').forEach(btn => {
            const on = btn.dataset.tab === tab.key;
            btn.classList.toggle('active', on);
            btn.setAttribute('aria-pressed', on);
        });
        this.renderGallery();
    }

    // UPDATED: Use CategoryManager for labels (integrated with LANGUAGE_DATA)
    getSubjectLabel(subject) {
        return categoryManager.getCategoryLabel(subject, this.currentLanguage);
    }

    getLocationLabel(location) {
        return categoryManager.getCategoryLabel(location, this.currentLanguage);
    }

    // Initialize gallery and event listeners
    initializeGallery() {
        this.updatePageTitle(); 
        this.renderGallery();
        this.setupEventListeners();
        this.updateLanguageToggle();
        this.renderFilterMenu();
        this.updateStaticText();
        this.initializeFAQ();  // ADD THIS LINE
        initializeURLHandler(); 
    }

    // Update webpage title based on current language
    updatePageTitle() {
        // Same titles as the static <title> in index.html / scripts/build-zh.js
        const title = this.currentLanguage === 'zh'
            ? '袁之靜（曉然）｜水墨畫・書法官方網站'
            : 'Yuan Chih-Jin (Xiaoran) | Chinese Ink Painting & Calligraphy';
        if (title) {
            document.title = title;
            console.log(`📝 Page title updated to: ${title}`);
        } else {
            // Fallback titles if not defined in language data
            const fallbackTitle = this.currentLanguage === 'zh' 
                ? '袁之靜 -   曉然文化藝術'
                : 'Xiaoran Cultral Arts - Chinese Paintings & Calligraphy';
            document.title = fallbackTitle;
            console.log(`📝 Page title updated (fallback): ${fallbackTitle}`);
        }
    }

    // Render filter menu
    renderFilterMenu() {
        const filterContainer = document.querySelector('.filter-placeholder');
        if (filterContainer) {
            filterContainer.innerHTML = this.generateFilterMenu();
            this.setupFilterListeners();
        }
    }

    // Series tab listeners
    setupFilterListeners() {
        document.querySelectorAll('.gallery-tab').forEach(btn => {
            btn.addEventListener('click', () => this.setGalleryTab(btn.dataset.tab));
        });
        const search = document.getElementById('gallerySearch');
        if (search) {
            search.addEventListener('input', () => {
                clearTimeout(this._searchTimer);
                this._searchTimer = setTimeout(() => {
                    this.galleryQuery = search.value;
                    this.renderGallery();
                }, 200);
            });
            search.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') this.toggleGallerySearch(false);
            });
        }
        document.getElementById('gallerySearchToggle')
            ?.addEventListener('click', () => this.toggleGallerySearch());
    }

    // The search field stays folded away until asked for; closing it clears the search
    toggleGallerySearch(open = !this.gallerySearchOpen && !this.galleryQuery) {
        const zh = this.currentLanguage === 'zh';
        const row = document.getElementById('gallerySearchRow');
        const toggle = document.getElementById('gallerySearchToggle');
        const search = document.getElementById('gallerySearch');
        if (!row || !toggle || !search) return;
        this.gallerySearchOpen = open;
        row.classList.toggle('open', open);
        toggle.setAttribute('aria-expanded', String(open));
        toggle.setAttribute('aria-label', open ? (zh ? '關閉搜尋' : 'Close search') : (zh ? '搜尋作品' : 'Search artworks'));
        if (open) {
            search.focus({ preventScroll: true });
        } else {
            clearTimeout(this._searchTimer);
            search.value = '';
            if (this.galleryQuery) {
                this.galleryQuery = '';
                this.renderGallery();
            }
            toggle.focus({ preventScroll: true });
        }
    }
    
    // FIXED: Setup event listeners with working search
    setupEventListeners() {
        // Language toggle
        const langToggle = document.getElementById('languageToggle');
        if (langToggle) {
            langToggle.addEventListener('click', () => this.toggleLanguage());
        }

        // FIXED: Search functionality that actually works
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.performSearch(e.target.value);
            });
        }
    }

    // FIXED: Search and render results
    performSearch(query) {
        const searchTerm = query.trim();
        
        if (searchTerm === '') {
            // No search query, show filtered results
            this.renderGallery();
            return;
        }

        // Get search results
        const searchResults = this.searchArtworks(searchTerm);
        
        // Apply current filters to search results
        const filteredResults = this.getMultiFilteredArtworks(this.activeFilters, searchResults);

        // Update results info
        const resultsInfo = document.getElementById('resultsInfo');
        if (resultsInfo) {
            const activeFilterCount = Object.values(this.activeFilters).flat().length;
            
            if (activeFilterCount > 0) {
                resultsInfo.textContent = this.t('filters.searchWithFilters', {
                    query: searchTerm,
                    count: filteredResults.length,
                    total: this.artworks.length,
                    filters: activeFilterCount
                }) || `Found ${filteredResults.length} results for "${searchTerm}" (${activeFilterCount} filters applied)`;
            } else {
                resultsInfo.textContent = this.t('filters.searchResults', {
                    query: searchTerm,
                    count: filteredResults.length,
                    total: this.artworks.length
                }) || `Found ${filteredResults.length} results for "${searchTerm}"`;
            }
        }

        // Render search results
        this.renderSearchResults(filteredResults);
    }

    // Render search results
    renderSearchResults(results) {
        const galleryGrid = document.getElementById('galleryGrid');
        if (!galleryGrid) return;

        const resultsWithImages = results.filter(artwork => this.hasRealImage(artwork));
        const resultsWithoutImages = results.filter(artwork => !this.hasRealImage(artwork));
        const prioritizedResults = this.sortForGallery(results);

        // 🆕 重要：搜尋結果也要保存順序
        this.currentGalleryOrder = prioritizedResults;
        console.log(`🔍 Saved search results order: ${prioritizedResults.length} artworks`);

        galleryGrid.innerHTML = this.renderGroupedCards(prioritizedResults);
        this.layoutGalleryRows();
        
        console.log(`🔍 Search results rendered: ${resultsWithImages.length} with images, ${resultsWithoutImages.length} with placeholders`);
    }

    // Is this artwork finished enough to show publicly?
    isPublicReady(artwork) {
        if (!artwork) return false;
        if (artwork.hidden === true || artwork.hidden === 'true') return false;
        if (String(artwork.status || '').toLowerCase() === 'draft') return false;
        if (!(artwork.title || '').trim()) return false;
        return this.hasRealImage(artwork);
    }

    // Helper method to check if artwork has a real image
    hasRealImage(artwork) {
        // Check if artwork has non-empty image paths
        const hasImagePath = (artwork.image && artwork.image.trim() !== '') || 
                            (artwork.imageHigh && artwork.imageHigh.trim() !== '');
        
        // Also check if it's not pointing to placeholder
        const isNotPlaceholder = artwork.image && 
                                !artwork.image.includes('placeholder') && 
                                artwork.image !== this.getPlaceholderImage();
        
        return hasImagePath && isNotPlaceholder;
    }

    // Helper method to shuffle array randomly
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
    // URL Parameter Handler for Direct Artwork Links

    // Multi-view artwork support
    setupArtworkViews(artwork) {
        console.log('🎨 Setting up artwork views for:', this.getText(artwork, 'title'));
        
        if (artwork.productViews && artwork.productViews.length > 0) {
            console.log(`📸 Found ${artwork.productViews.length} product views`);
            return artwork.productViews;
        }
        
        // Backwards compatibility
        const views = [];
        
        views.push({
            type: 'original',
            title: this.t('lightbox.originalView') || '原作',
            icon: '🖼️',
            image: artwork.imageHigh || artwork.image || this.getPlaceholderImage(),
            description: this.t('lightbox.originalDescription') || '高清原作細節'
        });
        
        if (artwork.roomDisplay) {
            views.push({
                type: 'room-display',
                title: this.t('lightbox.roomView') || '房間展示',
                icon: '🏠',
                image: artwork.roomDisplay,
                description: this.t('lightbox.roomDescription') || '在家中的裝飾效果'
            });
        }
        
        return views;
    }

    hasMultipleViews(artwork) {
        if (artwork.productViews && artwork.productViews.length > 1) {
            return true;
        }
        
        const viewCount = 1 + (artwork.roomDisplay ? 1 : 0);
        return viewCount > 1;
    }

    getViewCount(artwork) {
        if (artwork.productViews) {
            return artwork.productViews.length;
        }
        
        return 1 + (artwork.roomDisplay ? 1 : 0);
    }

    validateArtworkViews(artwork) {
        if (!artwork.productViews) {
            return { valid: true, message: 'No product views (using legacy mode)' };
        }
        
        const issues = [];
        
        artwork.productViews.forEach((view, index) => {
            if (!view.image) {
                issues.push(`View ${index + 1}: Missing image`);
            }
            if (!view.title) {
                issues.push(`View ${index + 1}: Missing title`);
            }
            if (!view.type) {
                issues.push(`View ${index + 1}: Missing type`);
            }
        });
        
        return {
            valid: issues.length === 0,
            message: issues.length > 0 ? issues.join(', ') : 'All views valid',
            issues: issues
        };  
    }

    debugArtworkViews(artworkId) {
        const artwork = this.getArtwork(artworkId);
        if (!artwork) {
            console.error('❌ Artwork not found:', artworkId);
            return;
        }
        
        console.log('🎨 Artwork:', this.getText(artwork, 'title'));
        console.log('📸 Has multiple views:', this.hasMultipleViews(artwork));
        console.log('🔢 View count:', this.getViewCount(artwork));
        
        const validation = this.validateArtworkViews(artwork);
        console.log('✅ Validation:', validation);
        
        if (artwork.productViews) {
            console.log('📋 Product views:');
            artwork.productViews.forEach((view, index) => {
                console.log(`  ${index + 1}. ${view.title} (${view.type}) - ${view.image}`);
            });
        }
    }

    // Apply protection to all gallery images
    addGalleryImageProtection() {
        const galleryImages = document.querySelectorAll('.gallery-item img');
        console.log(`Protecting ${galleryImages.length} gallery images`);
        
        galleryImages.forEach(img => {
            this.applyImageProtectionToElement(img);
        });
    }

    // Discourage casual saving: no dragging, no long-press menu, no right-click
    applyImageProtectionToElement(img) {
        if (!img || img.dataset.protected) return;
        img.dataset.protected = '1';
        img.setAttribute('draggable', 'false');
        img.style.userSelect = 'none';
        img.style.webkitUserSelect = 'none';
        img.style.webkitTouchCallout = 'none';
        img.addEventListener('contextmenu', e => e.preventDefault());
    }

    // Initialize FAQ section with current language
    initializeFAQ() {
        // Check if FAQ elements exist on the page
        if (!document.getElementById('faqTitle')) {
            console.log('FAQ section not found, skipping FAQ initialization');
            return;
        }

        const currentLang = this.currentLanguage;
        const faqData = LANGUAGE_DATA[currentLang].faq;
        
        if (!faqData) {
            console.warn('FAQ data not found for language:', currentLang);
            return;
        }
        
        // Set main titles
        const faqTitle = document.getElementById('faqTitle');
        const faqSubtitle = document.getElementById('faqSubtitle');
        
        if (faqTitle) faqTitle.textContent = faqData.title;
        if (faqSubtitle) faqSubtitle.textContent = faqData.subtitle;
        
        // Set section titles and icons
        this.updateFAQSection('authenticity', faqData.sections.authenticity);
        this.updateFAQSection('shipping', faqData.sections.shipping);
        this.updateFAQSection('pricing', faqData.sections.pricing);
        
        console.log('✅ FAQ initialized for language:', currentLang);
    }

    // Helper method to update FAQ sections
    updateFAQSection(sectionId, sectionData) {
        const iconElement = document.getElementById(sectionId + 'Icon');
        const titleElement = document.getElementById(sectionId + 'Title');
        const questionsContainer = document.getElementById(sectionId + 'Questions');
        
        if (iconElement) iconElement.textContent = sectionData.icon;
        if (titleElement) titleElement.textContent = sectionData.title;
        
        if (questionsContainer && sectionData.questions) {
            this.populateFAQQuestions(sectionId, sectionData.questions);
        }
    }

    // Populate FAQ questions for a section
    populateFAQQuestions(sectionId, questions) {
        const container = document.getElementById(sectionId + 'Questions');
        if (!container) return;
        
        container.innerHTML = '';
        
        questions.forEach((item, index) => {
            const faqItem = document.createElement('div');
            faqItem.className = 'faq-item';
            
            faqItem.innerHTML = `
                <div class="faq-question">${item.question}</div>
                <div class="faq-answer">${this.formatFAQAnswer(item.answer)}</div>
            `;
            
            container.appendChild(faqItem);
        });
    }

    // Format FAQ answers (convert markdown-style formatting)
    formatFAQAnswer(answer) {
        // Convert markdown-style bold text to HTML
        let formatted = answer.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Convert line breaks to paragraphs
        const paragraphs = formatted.split('\n').filter(p => p.trim());
        return paragraphs.map(p => `<p>${p}</p>`).join('');
    }

}

// Initialize portfolio
const portfolio = new ChineseArtPortfolio();

// Make functions available globally for onclick handlers
// Contact lives under About and the seal returns to the gallery;
// 'home' and 'connect' still work for the links that use them.
window.showSection = function(sectionId) {
    const contact = sectionId === 'connect';
    const id = sectionId === 'home' ? 'gallery' : contact ? 'about' : sectionId;

    document.querySelectorAll('.section').forEach(section => {
        section.classList.toggle('active', section.id === id);
    });
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.nav === id);
    });
    if (contact) window.openSubtab?.('about', 'contact');
    window.scrollTo({ top: 0 });
};

// Back-to-top button: gallery only, once the visitor has scrolled well down
(function setupBackToTop() {
    const button = document.getElementById('backToTop');
    if (!button) return;
    const update = () => {
        const inGallery = document.getElementById('gallery')?.classList.contains('active');
        button.classList.toggle('show', Boolean(inGallery) && window.scrollY > 1200);
    };
    window.addEventListener('scroll', update, { passive: true });
    button.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
})();

window.filterGallery = function(filterType, filterValue) {
    portfolio.renderGallery(filterType, filterValue);
};

window.debugArtworkViews = function(artworkId) {
    if (typeof portfolio !== 'undefined') {
        portfolio.debugArtworkViews(artworkId);
    } else {
        console.error('Portfolio not loaded');
    }
};

// Debug function to check categorization
window.debugCategorization = function() {
    console.group('🔍 CategoryManager Debug');
    categoryManager.debugConfig();
    
    console.log('\n📊 Sample artwork analysis:');
    portfolio.artworks.slice(0, 5).forEach(artwork => {
        categoryManager.debugArtwork(artwork);
    });
    
    console.groupEnd();
};


function handleArtworkURL() {
    // Get URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const artworkId = urlParams.get('artwork');
    const langParam = urlParams.get('lang'); 

    if (!artworkId) {
        // No artwork parameter, normal page load
        return;
    }
    
    console.log('Direct artwork link detected:', artworkId);
    
    function attemptToOpenArtwork() {
        if (typeof portfolio === 'undefined' || !portfolio.artworks) {
            console.log('Portfolio not ready yet, retrying...');
            setTimeout(attemptToOpenArtwork, 200);
            return;
        }
        
        // Set language from URL parameter before opening lightbox
        if (langParam && (langParam === 'zh' || langParam === 'en') && portfolio.currentLanguage !== langParam) {
            portfolio.currentLanguage = langParam;
            portfolio.syncLanguageURL();
            portfolio.updateAllUI();
        }
        
        const artwork = portfolio.getArtwork(artworkId);
        if (!artwork) {
            console.warn('Artwork not found:', artworkId);
            showArtworkNotFoundMessage(artworkId);
            return;
        }
        
        console.log('Opening shared artwork:', artwork.title);
        
        setTimeout(() => {
            window.openLightbox(artworkId, 'all');
        }, 500);
    }
        
        // Check if the artwork exists
        const artwork = portfolio.getArtwork(artworkId);
        if (!artwork) {
            console.warn('Artwork not found:', artworkId);
            // Optional: show a "artwork not found" message
            showArtworkNotFoundMessage(artworkId);
            return;
        }
        
        console.log('Opening shared artwork:', artwork.title);
        
        // Small delay to ensure page is fully rendered
        setTimeout(() => {
            window.openLightbox(artworkId, 'all');
        }, 500);
    
    
    // Start attempting to open the artwork
    attemptToOpenArtwork();
}

// Show message if shared artwork is not found
function showArtworkNotFoundMessage(artworkId) {
    const message = document.createElement('div');
    message.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0,0,0,0.9);
        color: white;
        padding: 20px 30px;
        border-radius: 12px;
        font-size: 16px;
        text-align: center;
        z-index: 10000;
        max-width: 400px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    `;
    
    message.innerHTML = `
        <h3 style="margin: 0 0 10px 0; color: #a3342c;">Artwork Not Found</h3>
        <p style="margin: 0;">The shared artwork link appears to be invalid or the artwork may have been removed.</p>
        <button onclick="this.parentElement.remove()" style="
            margin-top: 15px;
            padding: 8px 20px;
            background: #292524;
            color: #fbf8f3;
            border: none;
            border-radius: 999px;
            cursor: pointer;
        ">Close</button>
    `;
    
    document.body.appendChild(message);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (message.parentNode) {
            message.parentNode.removeChild(message);
        }
    }, 5000);
}

// Clean up URL after opening lightbox (optional)
function cleanUpURL() {
    // Remove the artwork parameter from URL without page reload
    const url = new URL(window.location);
    url.searchParams.delete('artwork');
    window.history.replaceState({}, '', url);
}

function initializeURLHandler() {
    handleArtworkURL();
}

// Optional: Clean up URL when lightbox closes
document.addEventListener('lightboxClosed', function() {
    cleanUpURL();
});

// Export functions for manual use if needed
window.handleArtworkURL = handleArtworkURL;
window.cleanUpURL = cleanUpURL;
window.initializeURLHandler = initializeURLHandler;

