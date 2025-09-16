// Content Management System for Chinese Art Portfolio - UPDATED WITH CATEGORY MANAGER
// Now uses centralized category configuration instead of hardcoded lists

// Content Management System for Chinese Art Portfolio - UPDATED WITH CATEGORY MANAGER
// Now uses centralized category configuration instead of hardcoded lists

class ChineseArtPortfolio {
    constructor() {
        this.artworks = [];
        this.categories = {};
        // Detect user's language preference
        const browserLang = navigator.language || navigator.userLanguage;
        console.log('Detected browser language:', browserLang);

        // Default to English for US market, Chinese for Chinese-speaking regions
        if (browserLang.startsWith('zh')) {
            this.currentLanguage = 'zh';
            console.log('Setting language to Chinese based on browser');
        } else {
            this.currentLanguage = 'en';
            console.log('Setting language to English (default)');
        }
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
                const categories = [];
                if (artwork.categories) categories.push(...artwork.categories);
                if (artwork.manualCategories) categories.push(...artwork.manualCategories);
                return categories;
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
            const response = await fetch('./data/artworks.json');
            const data = await response.json();
            
            // Handle both formats: {artworks: [...]} or just [...]
            if (data.artworks) {
                this.artworks = data.artworks;
                this.categories = data.categories || {};
            } else if (Array.isArray(data)) {
                this.artworks = data;
                this.categories = this.getDefaultCategories();
            }
            
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
                    hasAutoCategories: !!artwork.autoCategories,
                    hasCategories: !!(artwork.categories?.length),
                    hasManualCategories: !!(artwork.manualCategories?.length)
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
                "name": "國畫",
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

    // Search artworks - FIXED VERSION
    searchArtworks(query) {
        const searchTerm = query.toLowerCase().trim();
        if (!searchTerm) return this.artworks; // Return all if empty search
        
        return this.artworks.filter(artwork => {
            const title = (artwork.title || '').toLowerCase();
            const titleEn = (artwork.titleEn || '').toLowerCase();
            const description = (artwork.description || '').toLowerCase();
            const descriptionEn = (artwork.descriptionEn || '').toLowerCase();
            const year = (artwork.year || '').toString();
            const size = (artwork.sizeCm || '').toLowerCase();
            
            return title.includes(searchTerm) ||
                   titleEn.includes(searchTerm) ||
                   description.includes(searchTerm) ||
                   descriptionEn.includes(searchTerm) ||
                   year.includes(searchTerm) ||
                   size.includes(searchTerm);
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
        this.updateAllUI();
        // Update lightbox if it's open
        if (typeof window.updateLightboxLanguage === 'function') {
            window.updateLightboxLanguage();
        }
        // Notify shopping cart of language change
        document.dispatchEvent(new CustomEvent('languageChanged'));
    }

    // Update all UI elements when language changes
    updateAllUI() {
        this.updatePageTitle(); // ADD THIS LINE
        this.updateStaticText();
        this.initializeFAQ();
        this.renderGallery();
        this.renderFeaturedWorks();
        this.renderFilterMenu();
        this.updateLanguageToggle();
    }

    // Update static text elements
    updateStaticText() {
        console.log('🚀 updateStaticText() started');

    // NAVIGATION
    const navButtons = document.querySelectorAll('.nav-btn');
    if (navButtons.length >= 5) {
        navButtons[0].textContent = this.t('nav.featured');
        navButtons[1].textContent = this.t('nav.gallery'); 
        navButtons[2].textContent = this.t('nav.about');
        navButtons[3].textContent = this.t('nav.faq');      // NEW FAQ BUTTON
        navButtons[4].textContent = this.t('nav.connect');
    }
        
        // HEADER
        const logoElement = document.querySelector('.logo');
        const subtitleElement = document.querySelector('.subtitle');
        
        if (logoElement) logoElement.textContent = this.t('header.title');
        if (subtitleElement) subtitleElement.textContent = this.t('header.subtitle');

        // HOME PAGE
        const heroTitle = document.querySelector('.hero h1');
        const heroDesc = document.querySelector('.hero p');
        
        if (heroTitle) heroTitle.textContent = this.t('home.heroTitle');
        if (heroDesc) heroDesc.innerHTML = this.t('home.heroDescription');
        
        // ABOUT PAGE
        const aboutTitle = document.querySelector('.artist-intro h2');
        if (aboutTitle) aboutTitle.textContent = this.t('about.mainTitle');
        
        const videoTitle = document.querySelector('.featured-video h3');
        if (videoTitle) videoTitle.textContent = this.t('about.videoTitle');
        
        // Artist introduction paragraphs
        const artistBioP1 = document.getElementById('artistBioP1');
        const artistBioP2 = document.getElementById('artistBioP2');
        const artistBioP3 = document.getElementById('artistBioP3');
        
        if (artistBioP1) artistBioP1.textContent = this.t('about.introParagraph1');
        if (artistBioP2) artistBioP2.textContent = this.t('about.introParagraph2');
        if (artistBioP3) artistBioP3.textContent = this.t('about.introParagraph3');
        
        // Update section headers - PRESERVE ARROWS
        const sectionHeaders = document.querySelectorAll('.section-header');
        const headerKeys = ['educationTitle', 'awardsTitle', 'publicationsTitle', 'teachingTitle', 'positionsTitle', 'exhibitionsTitle', 'groupShowsTitle'];
        
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
        
        // Update about section lists content
        this.updateAboutListContent('education', this.t('about.education'));
        this.updateAboutListContent('awards', this.t('about.awards'));
        this.updateAboutListContent('publications', this.t('about.publications'));
        this.updateAboutListContent('teaching', this.t('about.teaching'));
        this.updateAboutListContent('positions', this.t('about.positions'));
        this.updateAboutListContent('exhibitions', this.t('about.exhibitions'));
        this.updateAboutListContent('group-shows', this.t('about.groupShows'));
        
        // CONNECT PAGE
        const connectTitle = document.querySelector('#connect h2');
        if (connectTitle) connectTitle.textContent = this.t('connect.title');
        
        const connectSubtitle = document.querySelector('#connect .connect-content > p');
        if (connectSubtitle) connectSubtitle.textContent = this.t('connect.subtitle');
        
        // Connect page elements
        const emailTitle = document.querySelector('#connect .connect-item:first-child h3');
        if (emailTitle) emailTitle.textContent = this.t('connect.emailTitle');

        const emailDesc = document.querySelector('#connect .connect-item:first-child p');
        if (emailDesc) emailDesc.textContent = this.t('connect.emailDesc');

        const facebookTitle = document.querySelector('#connect .connect-item:last-child h3');
        if (facebookTitle) facebookTitle.textContent = this.t('connect.facebookTitle');

        const facebookDesc = document.querySelector('#connect .connect-item:last-child p');
        if (facebookDesc) facebookDesc.textContent = this.t('connect.facebookDesc');

        // Location text
        const locationText = document.getElementById('locationText');
        if (locationText) {
            locationText.textContent = this.t('connect.locationText');
        }
        
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
        contentContainer.innerHTML = `<ul>${items.map(item => `<li>${item}</li>`).join('')}</ul>`;
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

        // Use CategoryManager for filtering
        const filteredArtworks = this.getMultiFilteredArtworks(this.activeFilters, this.artworks);

        // Separate artworks with real images from those without
        const artworksWithImages = filteredArtworks.filter(artwork => this.hasRealImage(artwork));
        const artworksWithoutImages = filteredArtworks.filter(artwork => !this.hasRealImage(artwork));

        // Randomize each group separately
        const randomizedWithImages = this.shuffleArray(artworksWithImages);
        const randomizedWithoutImages = this.shuffleArray(artworksWithoutImages);

        // Combine: images first, then placeholders
        const prioritizedArtworks = [...randomizedWithImages, ...randomizedWithoutImages];

        // 🆕 重要：保存當前藝廊顯示的順序
        this.currentGalleryOrder = prioritizedArtworks;
        console.log(`✅ Saved gallery order: ${prioritizedArtworks.length} artworks`);

        // Calculate counts
        const activeFilterCount = Object.values(this.activeFilters).flat().length;
        const imageCount = artworksWithImages.length;
        const totalCount = filteredArtworks.length;

        // Update results counter with image statistics
        const resultsInfo = document.getElementById('resultsInfo');
        if (resultsInfo) {
            if (activeFilterCount > 0) {
                resultsInfo.textContent = this.t('filters.showingFiltered', {
                    count: totalCount,
                    total: this.artworks.length,
                    filters: activeFilterCount
                }) + ` (${imageCount} ${this.t('gallery.withImages')})`;
            } else {
                resultsInfo.textContent = this.t('filters.showingAll', {
                    total: totalCount
                }) + ` (${imageCount} ${this.t('gallery.withImages')})`;
            }
        }

        // Render artwork cards with prioritized order
        galleryGrid.innerHTML = prioritizedArtworks.map(artwork => this.createArtworkCard(artwork)).join('');
        
        // ADD THIS LINE:
        setTimeout(() => {
            this.addGalleryImageProtection();
        }, 100);

        console.log(`🎨 Gallery rendered: ${imageCount} with images, ${totalCount - imageCount} with placeholders`);
    }

    // Create artwork card HTML
    createArtworkCard(artwork) {
        const title = this.getText(artwork, 'title') || this.t('common.untitled');
        const description = this.getText(artwork, 'description') || this.t('common.noDescription');
        
        // Handle missing images
        const imageUrl = artwork.image || artwork.imageHigh || this.getPlaceholderImage();
        
        // Handle missing size - use individual dimensions if available
        const size = artwork.heightCm && artwork.widthCm ? 
        `${artwork.heightCm} x ${artwork.widthCm} cm` : 
        artwork.sizeCm || this.t('common.sizeNotSpecified');
        // Handle boolean fields with defaults
        const available = this.getBooleanValue(artwork, 'available', true);
        
        return `
            <div class="gallery-item" onclick="openLightbox('${artwork.id}', 'gallery')" data-artwork-id="${artwork.id}">
                <div class="gallery-item-image">
                    <img src="${imageUrl}" alt="${title}" loading="lazy" 
                         onerror="this.src='${this.getPlaceholderImage()}'">
                </div>
                <div class="gallery-item-info">
                    <h3>${title}</h3>
                    <p>${description}</p>
                    <div class="artwork-meta">
                        <span class="year">${artwork.year || this.t('common.unknown')}</span>
                        <span class="size">${size}</span>
                        ${available ? 
                            `<span class="available">${this.t('common.available')}</span>` : 
                            `<span class="sold">${this.t('common.sold')}</span>`}
                    </div>
                </div>
            </div>
        `;
    }


    // UPDATED: Generate dynamic filter menu using CategoryManager
    generateFilterMenu() {
        const stats = this.filterStats;
        
        return `
            <div class="filter-container">
                <div class="filter-menu">
                    ${categoryManager.generateFilterHTML(stats, this.currentLanguage)}

                    <!-- Clear Filters Button -->
                    <div class="filter-section">
                        <div class="secondary-filters">
                            <button class="filter-btn clear-all-btn" onclick="portfolio.clearAllFilters()">
                                ${this.t('filters.clearAll')}
                            </button>
                        </div>
                    </div>

                    <!-- Search and Sort -->
                    <div class="search-sort-container">
                        <div class="search-box">
                            <span class="search-icon">🔍</span>
                            <input type="text" placeholder="${this.t('filters.searchPlaceholder')}" id="searchInput">
                        </div>
                        <select class="sort-dropdown" id="sortSelect">
                            <option value="newest">Newest First</option>
                            <option value="oldest">Oldest First</option>
                            <option value="title">By Title</option>
                            <option value="size">By Size</option>
                        </select>
                    </div>
                </div>
            </div>
        `;
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
        this.renderFeaturedWorks();
        this.updateLanguageToggle();
        this.renderFilterMenu();
        this.updateStaticText();
        this.initializeFAQ();  // ADD THIS LINE
        initializeURLHandler(); 
    }

    // Update webpage title based on current language
    updatePageTitle() {
        const title = this.t('header.title');
        if (title && title !== 'header.title') { // Check if translation exists
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

    // Setup multi-select filter event listeners
    setupFilterListeners() {
        // Multi-select filter buttons
        document.querySelectorAll('.filter-btn:not(.clear-all-btn), .secondary-filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filterType = e.target.dataset.filterType;
                const filterValue = e.target.dataset.filterValue;
                
                if (filterType && filterValue) {
                    this.toggleFilter(filterType, filterValue);
                }
            });
        });

        // ADD THIS: Setup search event listener
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.performSearch(e.target.value);
            });
            console.log('✅ Search event listener attached to input');
        } else {
            console.warn('⚠️ Search input not found when setting up listeners');
        }
    }
    
    // Render featured works on home page with museum-quality presentation
    renderFeaturedWorks() {
        const featuredContainer = document.querySelector('.featured-works');
        if (!featuredContainer) return;

        const featuredWorks = this.getFeaturedArtworks().slice(0, 6);
        const worksToShow = featuredWorks.length > 0 ? featuredWorks : this.artworks.slice(0, 3);
        
        featuredContainer.innerHTML = `
            <div class="featured-gallery">
                <div class="featured-header">
                    <h2>${this.t('home.featuredTitle')}</h2>
                </div>
                
                <div class="featured-grid" id="featuredMasonryGrid">
                    <!-- Items will be intelligently positioned by JavaScript -->
                </div>
                
                <div class="featured-footer">
                    <button class="view-all-btn" onclick="showSection('gallery')">
                        ${this.t('home.viewAllButton')}
                    </button>
                </div>
            </div>
        `;
        
        this.addFeaturedWorksCSS();
        this.createSmartMasonryLayout(worksToShow);
    }
    
    // Determine how many columns an artwork should span (1, 2, or 3)
    getArtworkSpan(artwork) {
        console.log('🔍 Analyzing artwork:', artwork.title);
        
        // First try individual height/width fields
        if (artwork.heightCm && artwork.widthCm) {
            const height = artwork.heightCm;
            const width = artwork.widthCm;
            const aspectRatio = width / height;
            
            console.log(`📊 Direct dimensions: H${height} × W${width}, Aspect Ratio: ${aspectRatio.toFixed(2)}`);
            
            let span;
            if (aspectRatio >= 2.0) {
                span = 3;
                console.log('🌅 Classified as: PANORAMIC (3 columns)');
            } else if (aspectRatio >= 1.3) {
                span = 2;
                console.log('🏞️ Classified as: LANDSCAPE (2 columns)');
            } else {
                span = 1;
                console.log('🖼️ Classified as: PORTRAIT/SQUARE (1 column)');
            }
            
            return { span, aspectRatio };
        }
        
        // Fallback to parsing size strings (for backward compatibility)
        const sizeFields = [artwork.sizeCm, artwork.size, artwork.dimensions].filter(Boolean);
        console.log('📏 Size fields found:', sizeFields);
        
        for (const size of sizeFields) {
            console.log('📐 Parsing size string:', size);
            
            const patterns = [
                /(\d+)\s*[×x]\s*(\d+)/,
                /(\d+)\s*[×x]\s*(\d+)\s*cm/,
                /(\d+)\s*cm\s*[×x]\s*(\d+)\s*cm/,
                /(\d+)[\s]*[×x][\s]*(\d+)/
            ];
            
            for (const pattern of patterns) {
                const match = size.match(pattern);
                if (match) {
                    const height = parseInt(match[1]);
                    const width = parseInt(match[2]);
                    
                    const aspectRatio = width / height;
                    console.log(`📊 Dimensions: H${height} × W${width}, Aspect Ratio: ${aspectRatio.toFixed(2)}`);
                    
                    let span;
                    if (aspectRatio >= 2.0) {
                        span = 3;
                        console.log('🌅 Classified as: PANORAMIC (3 columns)');
                    } else if (aspectRatio >= 1.3) {
                        span = 2;
                        console.log('🏞️ Classified as: LANDSCAPE (2 columns)');
                    } else {
                        span = 1;
                        console.log('🖼️ Classified as: PORTRAIT/SQUARE (1 column)');
                    }
                    
                    return { span, aspectRatio };
                }
            }
        }
        
        console.log('❌ No dimensions found, defaulting to 1 column');
        return { span: 1, aspectRatio: 1.0 };
    }

    // Create smart masonry layout that fills rows efficiently
    createSmartMasonryLayout(worksToShow) {
        const grid = document.getElementById('featuredMasonryGrid');
        if (!grid) return;
        
        const processedArtworks = worksToShow.map((artwork, index) => {
            const spanInfo = this.getArtworkSpan(artwork);
            return {
                artwork,
                span: spanInfo.span,
                index
            };
        });
        
        const sortedItems = [...processedArtworks].sort((a, b) => b.span - a.span);
        
        const rows = [];
        const remainingItems = [...sortedItems];
        
        while (remainingItems.length > 0) {
            const currentRow = [];
            let currentRowSpan = 0;
            
            for (let i = 0; i < remainingItems.length; i++) {
                const item = remainingItems[i];
                
                if (currentRowSpan + item.span <= 3) {
                    currentRow.push(item);
                    currentRowSpan += item.span;
                    remainingItems.splice(i, 1);
                    break;
                }
            }
            
            while (currentRowSpan < 3 && remainingItems.length > 0) {
                let foundFit = false;
                
                for (let i = 0; i < remainingItems.length; i++) {
                    const item = remainingItems[i];
                    
                    if (currentRowSpan + item.span <= 3) {
                        currentRow.push(item);
                        currentRowSpan += item.span;
                        remainingItems.splice(i, 1);
                        foundFit = true;
                    }
                }
                
                if (!foundFit) break;
            }
            
            rows.push(currentRow);
        }
        
        const rowsHTML = rows.map((row, rowIndex) => {
            const totalSpan = row.reduce((sum, item) => sum + item.span, 0);
            const itemsHTML = row.map(item => this.createFeaturedItemHTML(item)).join('');
            
            return `
                <div class="featured-row" data-row="${rowIndex}" data-total-span="${totalSpan}">
                    ${itemsHTML}
                </div>
            `;
        }).join('');
        
        grid.innerHTML = rowsHTML;
    }

    // Create featured item HTML
    createFeaturedItemHTML(item) {
        const { artwork, span } = item;
        const title = this.getText(artwork, 'title') || this.t('common.untitled');
        const description = this.getText(artwork, 'description') || '';
        const year = artwork.year || '';
        const size = artwork.sizeCm || '';
        const medium = artwork.mediumEn || artwork.format || '';
        const imageUrl = artwork.imageHigh || artwork.image || this.getPlaceholderImage();
        const available = this.getBooleanValue(artwork, 'available', true);
        
        const spanClass = `featured-item-span-${span}`;
        
        return `
            <div class="featured-item ${spanClass}" onclick="openLightbox('${artwork.id}', 'featured')">
                <div class="featured-image-container">
                    <img src="${imageUrl}" alt="${title}" 
                        onerror="this.src='${this.getPlaceholderImage()}'"
                        onload="this.parentElement.parentElement.classList.add('image-loaded')">
                    <div class="featured-overlay">
                        <div class="featured-overlay-content">
                            <span class="view-details">${this.t('common.viewDetails')}</span>
                        </div>
                    </div>
                </div>
                <div class="featured-info">
                    <div class="featured-title-section">
                        <h3 class="featured-title">${title}</h3>
                        ${year ? `<span class="featured-year">${year}</span>` : ''}
                    </div>
                    ${description ? `<p class="featured-description">${description}</p>` : ''}
                    <div class="featured-meta">
                        ${size ? `<span class="featured-size">${size}</span>` : ''}
                        ${medium ? `<span class="featured-medium">${medium}</span>` : ''}
                        <span class="featured-status ${available ? 'available' : 'sold'}">
                            ${available ? this.t('common.available') : this.t('common.sold')}
                        </span>
                    </div>
                </div>
            </div>
        `;
    }

    addFeaturedWorksCSS() {
        if (document.getElementById('featured-works-css')) return;
        
        const style = document.createElement('style');
        style.id = 'featured-works-css';
        style.textContent = `
            .featured-gallery {
                max-width: 1400px;
                margin: 0 auto;
                padding: 3rem 2rem;
            }
            
            .featured-header {
                text-align: center;
                margin-bottom: 3rem;
            }
            
            .featured-header h2 {
                font-size: 2.5rem;
                color: #2c3e50;
                margin-bottom: 1rem;
                font-weight: 300;
            }
            
            .featured-header p {
                font-size: 1.2rem;
                color: #6c757d;
                font-style: italic;
            }
            
            .featured-grid {
                display: block;
                margin-bottom: 3rem;
            }
            
            .featured-row {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 2rem;
                margin-bottom: 2rem;
                align-items: start;
                position: relative;
            }
            
            .featured-row .featured-item-span-1 {
                grid-column: span 1;
            }
            
            .featured-row .featured-item-span-2 {
                grid-column: span 2;
            }
            
            .featured-row .featured-item-span-3 {
                grid-column: span 3;
            }
            
            .featured-item {
                background: white;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 8px 32px rgba(0,0,0,0.1);
                transition: all 0.4s ease;
                cursor: pointer;
                position: relative;
                width: 100%;
            }
            
            .featured-item:hover {
                transform: translateY(-8px);
                box-shadow: 0 20px 60px rgba(0,0,0,0.2);
            }
            
            .featured-image-container {
                position: relative;
                width: 100%;
                overflow: hidden;
                min-height: 250px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: #f8f9fa;
            }
            
            .featured-image-container img {
                width: 100%;
                height: 100%;
                min-height: 250px;
                display: block;
                object-fit: cover;
                object-position: center;
                transition: transform 0.4s ease;
            }
            
            .featured-item-span-1 .featured-image-container {
                min-height: 300px;
            }
            
            .featured-item-span-1 .featured-image-container img {
                min-height: 300px;
            }
            
            .featured-item-span-2 .featured-image-container {
                min-height: 280px;
            }
            
            .featured-item-span-2 .featured-image-container img {
                min-height: 280px;
            }
            
            .featured-item-span-3 .featured-image-container {
                min-height: 250px;
            }
            
            .featured-item-span-3 .featured-image-container img {
                min-height: 250px;
            }
            
            .featured-item:hover .featured-image-container img {
                transform: scale(1.05);
            }
            
            .featured-overlay {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(135deg, rgba(44,62,80,0.8), rgba(52,73,94,0.6));
                opacity: 0;
                transition: opacity 0.3s ease;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .featured-item:hover .featured-overlay {
                opacity: 1;
            }
            
            .featured-overlay-content {
                text-align: center;
                color: white;
            }
            
            .view-details {
                font-size: 1.1rem;
                font-weight: 500;
                padding: 0.8rem 1.5rem;
                border: 2px solid white;
                border-radius: 25px;
                background: rgba(255,255,255,0.1);
                backdrop-filter: blur(10px);
                transition: all 0.3s ease;
            }
            
            .view-details:hover {
                background: white;
                color: #2c3e50;
            }
            
            .featured-info {
                padding: 2rem;
            }
            
            .featured-title-section {
                display: flex;
                justify-content: space-between;
                align-items: baseline;
                margin-bottom: 1rem;
            }
            
            .featured-title {
                font-size: 1.4rem;
                color: #2c3e50;
                margin: 0;
                font-weight: 400;
                line-height: 1.3;
            }
            
            .featured-year {
                font-size: 0.9rem;
                color: #6c757d;
                font-style: italic;
            }
            
            .featured-description {
                color: #495057;
                line-height: 1.6;
                margin-bottom: 1.5rem;
                display: -webkit-box;
                -webkit-line-clamp: 3;
                -webkit-box-orient: vertical;
                overflow: hidden;
            }
            
            .featured-meta {
                display: flex;
                gap: 1rem;
                align-items: center;
                flex-wrap: wrap;
                font-size: 0.9rem;
            }
            
            .featured-size,
            .featured-medium {
                color: #6c757d;
                background: #f8f9fa;
                padding: 0.3rem 0.8rem;
                border-radius: 12px;
                font-size: 0.8rem;
            }
            
            .featured-status {
                font-weight: 600;
                padding: 0.4rem 1rem;
                border-radius: 15px;
                font-size: 0.8rem;
                margin-left: auto;
            }
            
            .featured-status.available {
                background: #d4edda;
                color: #155724;
            }
            
            .featured-status.sold {
                background: #f8d7da;
                color: #721c24;
            }
            
            .featured-footer {
                text-align: center;
                margin-top: 3rem;
            }
            
            .view-all-btn {
                background: #2c3e50;
                color: white;
                padding: 1rem 2.5rem;
                border: none;
                border-radius: 30px;
                font-size: 1.1rem;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 4px 15px rgba(44,62,80,0.3);
            }
            
            .view-all-btn:hover {
                background: #1a252f;
                transform: translateY(-2px);
                box-shadow: 0 8px 25px rgba(44,62,80,0.4);
            }
            
            @media (max-width: 1200px) {
                .featured-row {
                    grid-template-columns: repeat(2, 1fr);
                }
                
                .featured-item-span-3 {
                    grid-column: span 2;
                }
                
                .featured-item-span-2 {
                    grid-column: span 2;
                }
                
                .featured-item-span-1 {
                    grid-column: span 1;
                }
            }
            
            @media (max-width: 768px) {
                .featured-row {
                    grid-template-columns: 1fr;
                    gap: 1.5rem;
                }
                
                .featured-item-span-1,
                .featured-item-span-2,
                .featured-item-span-3 {
                    grid-column: span 1;
                }
                
                .featured-gallery {
                    padding: 2rem 1rem;
                }
                
                .featured-header h2 {
                    font-size: 2rem;
                }
                
                .featured-info {
                    padding: 1.5rem;
                }
            }
        `;
        
        document.head.appendChild(style);
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

        // Separate results with and without images
        const resultsWithImages = results.filter(artwork => this.hasRealImage(artwork));
        const resultsWithoutImages = results.filter(artwork => !this.hasRealImage(artwork));

        // Prioritize images first
        const prioritizedResults = [...resultsWithImages, ...resultsWithoutImages];

        // 🆕 重要：搜尋結果也要保存順序
        this.currentGalleryOrder = prioritizedResults;
        console.log(`🔍 Saved search results order: ${prioritizedResults.length} artworks`);

        galleryGrid.innerHTML = prioritizedResults.map(artwork => this.createArtworkCard(artwork)).join('');
        
        console.log(`🔍 Search results rendered: ${resultsWithImages.length} with images, ${resultsWithoutImages.length} with placeholders`);
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
            faqItem.onclick = () => this.toggleFAQItem(sectionId, index);
            
            faqItem.innerHTML = `
                <div class="faq-question">
                    <span>${item.question}</span>
                    <span class="faq-toggle" id="${sectionId}Toggle${index}">▼</span>
                </div>
                <div class="faq-answer" id="${sectionId}Answer${index}">
                    ${this.formatFAQAnswer(item.answer)}
                </div>
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

    // Toggle FAQ item expanded/collapsed state
    toggleFAQItem(sectionId, index) {
        const answer = document.getElementById(`${sectionId}Answer${index}`);
        const toggle = document.getElementById(`${sectionId}Toggle${index}`);
        
        if (!answer || !toggle) return;
        
        if (answer.classList.contains('expanded')) {
            answer.classList.remove('expanded');
            toggle.classList.remove('expanded');
        } else {
            answer.classList.add('expanded');
            toggle.classList.add('expanded');
        }
    }


}

// Initialize portfolio
const portfolio = new ChineseArtPortfolio();

// Make functions available globally for onclick handlers
window.showSection = function(sectionId) {
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(sectionId).classList.add('active');
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
};

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
        if (langParam && (langParam === 'zh' || langParam === 'en')) {
            portfolio.currentLanguage = langParam;
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
        <h3 style="margin: 0 0 10px 0; color: #ff6b6b;">Artwork Not Found</h3>
        <p style="margin: 0;">The shared artwork link appears to be invalid or the artwork may have been removed.</p>
        <button onclick="this.parentElement.remove()" style="
            margin-top: 15px;
            padding: 8px 16px;
            background: #ff6b6b;
            color: white;
            border: none;
            border-radius: 6px;
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

