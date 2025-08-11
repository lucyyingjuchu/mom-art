// Content Management System for Chinese Art Portfolio with Multi-Select Filters
class ArtworkCategorizer {
    constructor() {
        // Define categorization rules based on title keywords
        this.rules = {
            // By Subject
            subject: {
                'waterfall': ['瀑布', '瀑', '飛瀑', '銀瀑', '煙聲'],
                'landscape': ['山水', '山', '峰', '雲海', '煙雲', '嵐', '壑', '石','木','谷'],
                'flowingclouds': ['煙', '雲', '煙雲', '雲海', '霧'],
                'flowers': ['花', '梅', '菊', '藤', '紫藤', '杜鵑', '桃花', '荷', '蓮', '牡丹', '阿勃勒', '金針', '櫻花', '凌霄'],
                'bamboo': ['竹', '墨竹', '疏竹', '翠竹'],
                'calligraphy': ['心經', '書法', '經', '愛蓮說','序','書','隸', '楷', '行', '草', '隸書', '楷書', '草書','詩','聯'],
            },
            
            // By Location  
            location: {
                'huangshan': ['黃山', '北海', '夢筆'],
                'alishan': ['阿里山', '雲揚'],
                'taroko': ['太魯閣', '太魯峽'],
                'hehuanshan': ['合歡', '合歡山'],
                'yushan': ['玉山', '玉山北峰'],
                'liushidanshan': ['六十石山', '六十石'],
                'guishandao': ['龜山島'],
                'longdong': ['龍洞'],
                'zhangjiajie': ['張家界'],
                'grandcanyon': ['大峽谷'],
                'iguazu': ['伊瓜蘇'],
                'niagara': ['尼加拉']
            },
            
            // By Style 
            style: {
                'traditional': ['水墨', '墨', '古', '傳統'],
                'abstract': ['抽象', '潑墨', '無題'],
                'modern': ['現代', '當代']
            }
        };
    }

    // Auto-categorize artwork based on title
    categorizeArtwork(artwork) {
        const title = artwork.title || '';
        const categories = {
            subjects: [],
            locations: [],
            styles: []
        };

        // Check subject categories
        for (const [category, keywords] of Object.entries(this.rules.subject)) {
            if (keywords.some(keyword => title.includes(keyword))) {
                categories.subjects.push(category);
            }
        }

        // Check location categories  
        for (const [location, keywords] of Object.entries(this.rules.location)) {
            if (keywords.some(keyword => title.includes(keyword))) {
                categories.locations.push(location);
            }
        }

        // Check style categories
        for (const [style, keywords] of Object.entries(this.rules.style)) {
            if (keywords.some(keyword => title.includes(keyword))) {
                categories.styles.push(style);
            }
        }

        // Default fallback categories
        if (categories.subjects.length === 0) {
            if (title.includes('山') || title.includes('雲') || title.includes('水')) {
                categories.subjects.push('landscape');
            } else if (artwork.category === 'calligraphy') {
                categories.subjects.push('calligraphy');
            } else {
                categories.subjects.push('traditional');
            }
        }

        return categories;
    }

    // Enhanced filter system for single filter
    getFilteredArtworks(filterType, filterValue, artworks) {
        return artworks.filter(artwork => {
            // First check manual subcategory (if exists)
            if (artwork.subcategory === filterValue) {
                return true;
            }

            // Then check auto-categorization
            const autoCategories = this.categorizeArtwork(artwork);
            
            switch(filterType) {
                case 'subject':
                    return autoCategories.subjects.includes(filterValue);
                case 'location':
                    return autoCategories.locations.includes(filterValue);
                case 'style':
                    return autoCategories.styles.includes(filterValue);
                case 'year':
                    return this.checkYearFilter(artwork.year, filterValue);
                default:
                    return false;
            }
        });
    }

    // NEW: Multi-select filter system for complex combinations
    getMultiFilteredArtworks(activeFilters, artworks) {
        if (Object.keys(activeFilters).length === 0 || 
            Object.values(activeFilters).every(arr => arr.length === 0)) {
            return artworks;
        }

        return artworks.filter(artwork => {
            const autoCategories = this.categorizeArtwork(artwork);
            
            // Check each filter type - ALL must match if specified
            for (const [filterType, filterValues] of Object.entries(activeFilters)) {
                if (filterValues.length === 0) continue; // Skip empty filter types
                
                let matches = false;
                
                switch(filterType) {
                    case 'subject':
                        matches = filterValues.some(value => 
                            artwork.subcategory === value || 
                            autoCategories.subjects.includes(value)
                        );
                        break;
                    case 'location':
                        matches = filterValues.some(value => 
                            autoCategories.locations.includes(value)
                        );
                        break;
                    case 'year':
                        matches = filterValues.some(value => 
                            this.checkYearFilter(artwork.year, value)
                        );
                        break;
                    default:
                        matches = true;
                }
                
                // If any active filter type doesn't match, exclude this artwork
                if (!matches) {
                    return false;
                }
            }
            
            return true;
        });
    }

    // Year-based filtering
    checkYearFilter(artworkYear, filterValue) {
        const year = parseInt(artworkYear);
        if (isNaN(year)) return false;

        switch(filterValue) {
            case 'recent':
                return year >= 2020;
            case '2010s':
                return year >= 2010 && year < 2020;
            case 'earlier':
                return year < 2010;
            default:
                return false;
        }
    }

    // Generate filter statistics
    getFilterStats(artworks) {
        const stats = {
            subjects: {},
            locations: {},
            styles: {},
            years: { recent: 0, '2010s': 0, earlier: 0 }
        };

        artworks.forEach(artwork => {
            const categories = this.categorizeArtwork(artwork);
            
            // Count subjects (prioritize manual subcategory)
            if (artwork.subcategory) {
                stats.subjects[artwork.subcategory] = (stats.subjects[artwork.subcategory] || 0) + 1;
            } else {
                categories.subjects.forEach(subject => {
                    stats.subjects[subject] = (stats.subjects[subject] || 0) + 1;
                });
            }
            
            // Count locations
            categories.locations.forEach(location => {
                stats.locations[location] = (stats.locations[location] || 0) + 1;
            });
            
            // Count styles
            categories.styles.forEach(style => {
                stats.styles[style] = (stats.styles[style] || 0) + 1;
            });
            
            // Count years
            const year = parseInt(artwork.year);
            if (year >= 2020) stats.years.recent++;
            else if (year >= 2010) stats.years['2010s']++;
            else if (!isNaN(year)) stats.years.earlier++;
        });

        return stats;
    }
}


class ChineseArtPortfolio {
    constructor() {
        this.artworks = [];
        this.categories = {};
        this.currentLanguage = 'zh'; // Default to Chinese
        this.categorizer = new ArtworkCategorizer();
        this.filterStats = {};
        
        // Track active multi-select filters
        this.activeFilters = {
            subject: [],
            location: [],
            year: []
        };
        
        this.loadArtworks();
    }

    // NEW: Get localized text from language dictionary
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
            
            // Generate filter statistics after loading
            this.filterStats = this.categorizer.getFilterStats(this.artworks);
            
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
            year: []
        };
        this.renderGallery();
        this.updateFilterUI();
    }

    // Update filter button states
    updateFilterUI() {
        document.querySelectorAll('.filter-btn').forEach(btn => {
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

    // Enhanced filter method using categorizer
    filterArtworks(filterType, filterValue) {
        if (filterValue === 'all') return this.artworks;
        
        // Handle special cases
        if (filterType === 'category') {
            if (filterValue === 'recent') {
                return this.getRecentArtworks();
            } else if (filterValue === 'featured') {
                return this.getFeaturedArtworks();
            } else {
                return this.artworks.filter(artwork => artwork.category === filterValue);
            }
        }
        
        return this.categorizer.getFilteredArtworks(filterType, filterValue, this.artworks);
    }

    // Filter recent artworks
    getRecentArtworks() {
        return this.artworks.filter(artwork => this.getBooleanValue(artwork, 'recent', false));
    }

    // Get featured artworks
    getFeaturedArtworks() {
        return this.artworks.filter(artwork => this.getBooleanValue(artwork, 'featured', false));
    }

    // Search artworks
    searchArtworks(query) {
        const searchTerm = query.toLowerCase();
        return this.artworks.filter(artwork => {
            const title = (artwork.title || '').toLowerCase();
            const titleEn = (artwork.titleEn || '').toLowerCase();
            const description = (artwork.description || '').toLowerCase();
            const descriptionEn = (artwork.descriptionEn || '').toLowerCase();
            const tags = artwork.tags || [];
            
            return title.includes(searchTerm) ||
                   titleEn.includes(searchTerm) ||
                   description.includes(searchTerm) ||
                   descriptionEn.includes(searchTerm) ||
                   tags.some(tag => tag.toLowerCase().includes(searchTerm));
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
            // BILINGUAL UPDATE: Update lightbox if it's open
        if (typeof window.updateLightboxLanguage === 'function') {
        window.updateLightboxLanguage();
        }
    }

    // NEW: Update all UI elements when language changes
    updateAllUI() {
        this.updateStaticText();
        this.renderGallery();
        this.renderFeaturedWorks();
        this.renderFilterMenu();
        this.updateLanguageToggle();
    }

    // NEW: Update static text elements
    updateStaticText() {
        // Update header
        document.querySelector('.logo').textContent = this.t('header.title');
        document.querySelector('.subtitle').textContent = this.t('header.subtitle');
        
        // Update navigation
        const navButtons = document.querySelectorAll('.nav-btn');
        navButtons[0].textContent = this.t('nav.featured');
        navButtons[1].textContent = this.t('nav.gallery'); 
        navButtons[2].textContent = this.t('nav.about');
        navButtons[3].textContent = this.t('nav.connect');
        
        // Update home page
        document.querySelector('.hero h1').textContent = this.t('home.heroTitle');
        document.querySelector('.hero p').textContent = this.t('home.heroDescription');
        
        // Update about page titles
        const aboutTitle = document.querySelector('.artist-intro h2');
        if (aboutTitle) aboutTitle.textContent = this.t('about.mainTitle');
        
        const videoTitle = document.querySelector('.featured-video h3');
        if (videoTitle) videoTitle.textContent = this.t('about.videoTitle');
        
        // Update section headers
        const sectionHeaders = document.querySelectorAll('.section-header');
        const headerKeys = ['educationTitle', 'awardsTitle', 'publicationsTitle', 'teachingTitle', 'positionsTitle', 'exhibitionsTitle', 'groupShowsTitle'];
        sectionHeaders.forEach((header, index) => {
            if (headerKeys[index]) {
                const icon = header.textContent.split(' ')[0]; // Keep the emoji
                header.textContent = `${icon} ${this.t('about.' + headerKeys[index])}`;
            }
        });
        
        // Update connect page
        const connectTitle = document.querySelector('#connect h2');
        if (connectTitle) connectTitle.textContent = this.t('connect.title');
        
        const connectSubtitle = document.querySelector('#connect .connect-content > p');
        if (connectSubtitle) connectSubtitle.textContent = this.t('connect.subtitle');
        
        // Update lightbox elements
        this.updateLightboxText();
    }

    // NEW: Update lightbox text
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
            langToggle.textContent = this.currentLanguage === 'en' ? '中文' : 'English';
        }
    }

    // Updated renderGallery method with image prioritization and randomization
    renderGallery() {
        const galleryGrid = document.getElementById('galleryGrid');
        if (!galleryGrid) return;

        // Use multi-select filtering
        const filteredArtworks = this.categorizer.getMultiFilteredArtworks(this.activeFilters, this.artworks);

        // Separate artworks with real images from those without
        const artworksWithImages = filteredArtworks.filter(artwork => this.hasRealImage(artwork));
        const artworksWithoutImages = filteredArtworks.filter(artwork => !this.hasRealImage(artwork));

        // Randomize each group separately
        const randomizedWithImages = this.shuffleArray(artworksWithImages);
        const randomizedWithoutImages = this.shuffleArray(artworksWithoutImages);

        // Combine: images first, then placeholders
        const prioritizedArtworks = [...randomizedWithImages, ...randomizedWithoutImages];

        // Calculate counts OUTSIDE the if block so they're available everywhere
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
        
        console.log(`🎨 Gallery rendered: ${imageCount} with images, ${totalCount - imageCount} with placeholders`);
    }

    // Create artwork card HTML
    createArtworkCard(artwork) {
        const title = this.getText(artwork, 'title') || this.t('common.untitled');
        const description = this.getText(artwork, 'description') || this.t('common.noDescription');
        
        // Handle missing images
        const imageUrl = artwork.imageHigh || artwork.image || this.getPlaceholderImage();
        
        // Handle missing size
        const size = artwork.sizeCm || this.t('common.sizeNotSpecified');
        
        // Handle boolean fields with defaults
        const available = this.getBooleanValue(artwork, 'available', true);
        
        return `
            <div class="gallery-item" onclick="openLightbox('${artwork.id}')">
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

    // Generate dynamic filter menu with multi-select capability
    generateFilterMenu() {
        const stats = this.filterStats;
        
        return `
            <div class="filter-container">
                <div class="filter-menu">
                    <!-- Multi-Select Subject Filters -->
                    <div class="filter-section">
                        <h4>${this.t('filters.bySubject')}</h4>
                        <div class="secondary-filters">
                            ${Object.entries(stats.subjects).map(([subject, count]) => `
                                <button class="filter-btn" 
                                        data-filter-type="subject" 
                                        data-filter-value="${subject}">
                                    ${this.getSubjectLabel(subject)} (${count})
                                </button>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Multi-Select Location Filters -->
                    ${Object.keys(stats.locations).length > 0 ? `
                    <div class="filter-section">
                        <h4>${this.t('filters.byLocation')}</h4>
                        <div class="secondary-filters">
                            ${Object.entries(stats.locations).map(([location, count]) => `
                                <button class="filter-btn" 
                                        data-filter-type="location" 
                                        data-filter-value="${location}">
                                    ${this.getLocationLabel(location)} (${count})
                                </button>
                            `).join('')}
                        </div>
                    </div>
                    ` : ''}

                    <!-- Multi-Select Year Filters -->
                    <div class="filter-section">
                        <h4>${this.t('filters.byYear')}</h4>
                        <div class="secondary-filters">
                            <button class="filter-btn" data-filter-type="year" data-filter-value="recent">
                                ${this.t('years.recent')} (${stats.years.recent})
                            </button>
                            <button class="filter-btn" data-filter-type="year" data-filter-value="2010s">
                                ${this.t('years.2010s')} (${stats.years['2010s']})
                            </button>
                            <button class="filter-btn" data-filter-type="year" data-filter-value="earlier">
                                ${this.t('years.earlier')} (${stats.years.earlier})
                            </button>
                        </div>
                    </div>

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

    // Label mapping for display
    getSubjectLabel(subject) {
       return this.t(`subjects.${subject}`);
    }

    getLocationLabel(location) {
        return this.t(`locations.${location}`);
    }

    // Initialize gallery and event listeners
    initializeGallery() {
        this.renderGallery();
        this.setupEventListeners();
        this.renderFeaturedWorks();
        this.updateLanguageToggle();
        this.renderFilterMenu();
        this.updateStaticText();
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
        document.querySelectorAll('.filter-btn:not(.clear-all-btn)').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filterType = e.target.dataset.filterType;
                const filterValue = e.target.dataset.filterValue;
                
                if (filterType && filterValue) {
                    this.toggleFilter(filterType, filterValue);
                }
            });
        });
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
                    <p>${this.t('home.featuredSubtitle')}</p>
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

   // Fixed createFeaturedItemHTML method - replace the existing one in your portfolio.js
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

    // Setup event listeners
    setupEventListeners() {
        // Language toggle
        const langToggle = document.getElementById('languageToggle');
        if (langToggle) {
            langToggle.addEventListener('click', () => this.toggleLanguage());
        }

        // Search functionality
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const results = this.searchArtworks(e.target.value);
                this.renderSearchResults(results);
            });
        }
    }

    // Render search results
    renderSearchResults(results) {
        const galleryGrid = document.getElementById('galleryGrid');
        if (!galleryGrid) return;

        const resultsInfo = document.getElementById('resultsInfo');
        if (resultsInfo) {
            resultsInfo.textContent = this.t('filters.showingResults', {
                count: results.length,
                total: this.artworks.length
            });
        }

        galleryGrid.innerHTML = results.map(artwork => this.createArtworkCard(artwork)).join('');
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