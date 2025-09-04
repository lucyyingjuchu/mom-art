// CategoryManager.js - Centralized Category Management System
// ULTIMATE SIMPLIFIED: Single source of truth using displayLabels only

// Prevent duplicate loading
if (!window.categoryManagerLoaded) {
    window.categoryManagerLoaded = true;

    class CategoryManager {
        constructor() {
            this.config = null;
            this.loaded = false;
            this._chineseToEnglishCache = null; // Computed from displayLabels
            console.log('🔧 CategoryManager constructor called (ultimate simplified version)');
        }

        async loadConfig() {
            if (this.loaded && this.config) {
                return this.config;
            }

            try {
                const response = await fetch('./data/category-config.json');
                if (!response.ok) {
                    throw new Error(`Failed to load config: ${response.status}`);
                }
                
                this.config = await response.json();
                this.loaded = true;
                
                // Clear cache when config reloads
                this._chineseToEnglishCache = null;
                
                console.log('✅ Category config loaded successfully (ultimate simplified)');
                console.log(`📊 Subjects: ${this.config.categories.subjects.length}, Locations: ${this.config.categories.locations.length}`);
                
                return this.config;
            } catch (error) {
                console.error('❌ Failed to load category config:', error);
                this.config = this.getFallbackConfig();
                this.loaded = true;
                return this.config;
            }
        }

        getFallbackConfig() {
            return {
                categories: {
                    subjects: ["landscape", "waterfall", "flowers", "calligraphy"],
                    locations: ["huangshan", "alishan"]
                },
                displayLabels: {
                    zh: {
                        subjects: { "landscape": "山水", "waterfall": "瀑布", "flowers": "花鳥", "calligraphy": "書法" },
                        locations: { "huangshan": "黃山", "alishan": "阿里山" },
                        availability: { "available": "可售", "sold": "已售", "unknown": "狀態未明" },
                        filterSections: { "bySubject": "題材分類", "byLocation": "地點分類", "byAvailability": "販售狀態" }
                    },
                    en: {
                        subjects: { "landscape": "Landscape", "waterfall": "Waterfalls", "flowers": "Flowers & Birds", "calligraphy": "Calligraphy" },
                        locations: { "huangshan": "HuangShan", "alishan": "AliShan" },
                        availability: { "available": "Available", "sold": "Sold", "unknown": "Status Unknown" },
                        filterSections: { "bySubject": "By Subject", "byLocation": "By Location", "byAvailability": "By Availability" }
                    }
                }
            };
        }

        // ULTIMATE SIMPLIFICATION: Compute Chinese->English mapping from displayLabels
        getChineseToEnglishMapping() {
            if (!this._chineseToEnglishCache) {
                this._chineseToEnglishCache = {};
                
                if (this.config && this.config.displayLabels && this.config.displayLabels.zh) {
                    const zhLabels = this.config.displayLabels.zh;
                    
                    // Invert subjects: "waterfall" -> "瀑布" becomes "瀑布" -> "waterfall"
                    if (zhLabels.subjects) {
                        Object.entries(zhLabels.subjects).forEach(([english, chinese]) => {
                            this._chineseToEnglishCache[chinese] = english;
                        });
                    }
                    
                    // Invert locations: "huangshan" -> "黃山" becomes "黃山" -> "huangshan"
                    if (zhLabels.locations) {
                        Object.entries(zhLabels.locations).forEach(([english, chinese]) => {
                            this._chineseToEnglishCache[chinese] = english;
                        });
                    }
                }
                
                console.log('🔄 Computed Chinese->English mapping from displayLabels:', Object.keys(this._chineseToEnglishCache).length, 'entries');
            }
            
            return this._chineseToEnglishCache;
        }

        isSubject(categoryKey) {
            if (!this.config) return false;
            return this.config.categories.subjects.includes(categoryKey);
        }

        isLocation(categoryKey) {
            if (!this.config) return false;
            return this.config.categories.locations.includes(categoryKey);
        }

        // Get category labels from displayLabels (single source of truth)
        getCategoryLabel(categoryKey, language = 'zh') {
            if (!this.config || !this.config.displayLabels) {
                return this.getFallbackLabel(categoryKey, language);
            }

            const langData = this.config.displayLabels[language];
            if (!langData) {
                return categoryKey;
            }

            // Check subjects first
            if (langData.subjects && langData.subjects[categoryKey]) {
                return langData.subjects[categoryKey];
            }

            // Check locations
            if (langData.locations && langData.locations[categoryKey]) {
                return langData.locations[categoryKey];
            }

            // Check availability status
            if (langData.availability && langData.availability[categoryKey]) {
                return langData.availability[categoryKey];
            }

            // Fallback to key itself
            return categoryKey;
        }

        getFallbackLabel(categoryKey, language) {
            const fallbackLabels = {
                zh: {
                    "waterfall": "瀑布", "landscape": "山水", "flowers": "花鳥", 
                    "calligraphy": "書法", "huangshan": "黃山", "alishan": "阿里山",
                    "available": "可售", "sold": "已售", "uncategorized": "未分類"
                },
                en: {
                    "waterfall": "Waterfalls", "landscape": "Landscape", "flowers": "Flowers & Birds",
                    "calligraphy": "Calligraphy", "huangshan": "HuangShan", "alishan": "AliShan",
                    "available": "Available", "sold": "Sold", "uncategorized": "Uncategorized"
                }
            };
            
            return fallbackLabels[language]?.[categoryKey] || categoryKey;
        }

        // ULTIMATE SIMPLIFICATION: Use computed mapping from displayLabels
        chineseToEnglish(chineseText) {
            const mapping = this.getChineseToEnglishMapping();
            return mapping[chineseText] || chineseText;
        }

        // Use displayLabels directly for English->Chinese
        englishToChinese(englishKey) {
            if (this.config && this.config.displayLabels && this.config.displayLabels.zh) {
                const zhLabels = this.config.displayLabels.zh;
                
                // Check subjects
                if (zhLabels.subjects && zhLabels.subjects[englishKey]) {
                    return zhLabels.subjects[englishKey];
                }
                
                // Check locations
                if (zhLabels.locations && zhLabels.locations[englishKey]) {
                    return zhLabels.locations[englishKey];
                }
            }
            
            return englishKey;
        }

        normalizeCategories(categories) {
            if (!Array.isArray(categories)) return [];
            
            return categories.map(category => {
                if (this.isSubject(category) || this.isLocation(category)) {
                    return category;
                }
                
                const englishKey = this.chineseToEnglish(category);
                if (englishKey !== category) {
                    return englishKey;
                }
                
                return category;
            });
        }

        separateCategories(categories) {
            const normalizedCategories = this.normalizeCategories(categories);
            
            const subjects = [];
            const locations = [];
            const unknown = [];

            normalizedCategories.forEach(category => {
                if (this.isSubject(category)) {
                    subjects.push(category);
                } else if (this.isLocation(category)) {
                    locations.push(category);
                } else {
                    unknown.push(category);
                    subjects.push(category);
                }
            });

            return { subjects, locations, unknown };
        }

        getAllSubjects() {
            if (!this.config) return [];
            return this.config.categories.subjects;
        }

        getAllLocations() {
            if (!this.config) return [];
            return this.config.categories.locations;
        }

        calculateStats(artworks) {
            const stats = {
                subjects: {},
                locations: {},
                availability: { available: 0, sold: 0, unknown: 0 }
            };

            if (!Array.isArray(artworks)) return stats;

            let uncategorizedCount = 0;

            artworks.forEach(artwork => {
                const allCategories = this.getArtworkCategories(artwork);
                const separated = this.separateCategories(allCategories);

                if (separated.subjects.length > 0) {
                    separated.subjects.forEach(subject => {
                        stats.subjects[subject] = (stats.subjects[subject] || 0) + 1;
                    });
                } else {
                    uncategorizedCount++;
                }

                separated.locations.forEach(location => {
                    stats.locations[location] = (stats.locations[location] || 0) + 1;
                });

                const availability = this.getArtworkAvailability(artwork);
                stats.availability[availability]++;
            });

            if (uncategorizedCount > 0) {
                stats.subjects['uncategorized'] = uncategorizedCount;
            }

            console.log(`📊 Category stats: ${Object.keys(stats.subjects).length} subjects, ${Object.keys(stats.locations).length} locations, ${uncategorizedCount} uncategorized`);

            return stats;
        }

        // Get all categories for an artwork (merges auto + manual)
        getArtworkCategories(artwork) {
            const categories = [];

            // NEW STRUCTURE: Merge autoCategories and manualCategories
            if (artwork.autoCategories) {
                if (artwork.autoCategories.subjects) {
                    categories.push(...artwork.autoCategories.subjects);
                }
                if (artwork.autoCategories.locations) {
                    categories.push(...artwork.autoCategories.locations);
                }
            }

            if (artwork.manualCategories) {
                // Handle both old (array) and new (object) manual category formats
                if (Array.isArray(artwork.manualCategories)) {
                    // Old format: ["花鳥", "黃山"] - convert Chinese to English
                    const normalizedManual = this.normalizeCategories(artwork.manualCategories);
                    categories.push(...normalizedManual);
                } else if (typeof artwork.manualCategories === 'object') {
                    // New format: {subjects: ["flowers"], locations: ["huangshan"]}
                    if (artwork.manualCategories.subjects) {
                        categories.push(...artwork.manualCategories.subjects);
                    }
                    if (artwork.manualCategories.locations) {
                        categories.push(...artwork.manualCategories.locations);
                    }
                }
            }

            // BACKWARD COMPATIBILITY: Handle old flat categories array
            if (artwork.categories && Array.isArray(artwork.categories)) {
                categories.push(...artwork.categories);
            }

            // Remove duplicates and filter out 'traditional'
            return [...new Set(categories)].filter(cat => cat !== 'traditional');
        }

        getArtworkAvailability(artwork) {
            const available = artwork.available;
            
            if (available === true || available === 'true') {
                return 'available';
            } else if (available === false || available === 'false') {
                return 'sold';
            } else {
                return 'unknown';
            }
        }

        artworkMatchesFilters(artwork, activeFilters) {
            const artworkCategories = this.getArtworkCategories(artwork);
            const separated = this.separateCategories(artworkCategories);

            for (const [filterType, filterValues] of Object.entries(activeFilters)) {
                if (!Array.isArray(filterValues) || filterValues.length === 0) {
                    continue;
                }

                let matches = false;

                switch(filterType) {
                    case 'subject':
                        // SPECIAL CASE: Handle 'uncategorized' filter
                        if (filterValues.includes('uncategorized')) {
                            // Show artworks with no subjects (excluding 'uncategorized' itself)
                            const realSubjects = separated.subjects.filter(s => s !== 'uncategorized');
                            matches = realSubjects.length === 0;
                        } else {
                            // Normal subject filtering
                            matches = filterValues.some(value => separated.subjects.includes(value));
                        }
                        break;
                        
                    case 'location':
                        matches = filterValues.some(value => separated.locations.includes(value));
                        break;
                        
                    case 'availability':
                        const availability = this.getArtworkAvailability(artwork);
                        matches = filterValues.includes(availability);
                        break;
                        
                    default:
                        matches = true;
                }

                if (!matches) {
                    return false;
                }
            }

            return true;
        }

        generateFilterHTML(stats, currentLanguage = 'zh') {
            let html = '';

            if (Object.keys(stats.subjects).length > 0) {
                const subjectsHTML = Object.entries(stats.subjects).map(([subject, count]) => `
                    <button class="secondary-filter-btn" 
                            data-filter-type="subject" 
                            data-filter-value="${subject}">
                        ${this.getCategoryLabel(subject, currentLanguage)} (${count})
                    </button>
                `).join('');

                html += `
                    <div class="filter-section">
                        <h4>📂 ${this.getFilterSectionTitle('bySubject', currentLanguage)}</h4>
                        <div class="secondary-filters">
                            ${subjectsHTML}
                        </div>
                    </div>
                `;
            }

            if (Object.keys(stats.locations).length > 0) {
                const locationsHTML = Object.entries(stats.locations).map(([location, count]) => `
                    <button class="secondary-filter-btn"
                            data-filter-type="location" 
                            data-filter-value="${location}">
                        ${this.getCategoryLabel(location, currentLanguage)} (${count})
                    </button>
                `).join('');

                html += `
                    <div class="filter-section">
                        <h4>🗺️ ${this.getFilterSectionTitle('byLocation', currentLanguage)}</h4>
                        <div class="secondary-filters">
                            ${locationsHTML}
                        </div>
                    </div>
                `;
            }

            const availabilityHTML = Object.entries(stats.availability).map(([status, count]) => `
                <button class="secondary-filter-btn"
                        data-filter-type="availability" 
                        data-filter-value="${status}">
                    ${this.getCategoryLabel(status, currentLanguage)} (${count})
                </button>
            `).join('');

            html += `
                <div class="filter-section">
                    <h4>💰 ${this.getFilterSectionTitle('byAvailability', currentLanguage)}</h4>
                    <div class="secondary-filters">
                        ${availabilityHTML}
                    </div>
                </div>
            `;

            return html;
        }

        // Get filter section titles from displayLabels
        getFilterSectionTitle(sectionKey, language = 'zh') {
            if (this.config && this.config.displayLabels && 
                this.config.displayLabels[language] && 
                this.config.displayLabels[language].filterSections &&
                this.config.displayLabels[language].filterSections[sectionKey]) {
                return this.config.displayLabels[language].filterSections[sectionKey];
            }
            
            const fallbackTitles = {
                zh: { bySubject: '題材分類', byLocation: '地點分類', byAvailability: '販售狀態' },
                en: { bySubject: 'By Subject', byLocation: 'By Location', byAvailability: 'By Availability' }
            };
            
            return fallbackTitles[language]?.[sectionKey] || sectionKey;
        }

        debugArtwork(artwork) {
            console.group(`🎨 Debug: ${artwork.title || artwork.id}`);
            
            const allCategories = this.getArtworkCategories(artwork);
            console.log('📋 All categories:', allCategories);
            
            const separated = this.separateCategories(allCategories);
            console.log('🎯 Separated:', separated);
            
            const availability = this.getArtworkAvailability(artwork);
            console.log('💰 Availability:', availability);
            
            console.groupEnd();
        }

        debugConfig() {
            console.group('🔧 Category Config Debug (Ultimate Simplified)');
            console.log('✅ Config loaded:', this.loaded);
            console.log('📊 Subjects:', this.config?.categories?.subjects || []);
            console.log('🗺️ Locations:', this.config?.categories?.locations || []);
            console.log('🔄 Chinese->English cache:', this._chineseToEnglishCache ? Object.keys(this._chineseToEnglishCache).length + ' entries' : 'Not computed yet');
            console.log('🏷️ Display labels available:', !!this.config?.displayLabels);
            if (this.config?.displayLabels) {
                console.log('🌐 Languages available:', Object.keys(this.config.displayLabels));
                console.log('🎯 ZH subjects:', Object.keys(this.config.displayLabels.zh?.subjects || {}));
                console.log('🗺️ ZH locations:', Object.keys(this.config.displayLabels.zh?.locations || {}));
            }
            console.groupEnd();
        }

        detectCategories(text) {
            if (!this.config?.autoDetectionKeywords || !text) return [];
            
            const detected = [];
            const lowerText = text.toLowerCase();
            
            Object.entries(this.config.autoDetectionKeywords).forEach(([category, keywords]) => {
                if (keywords.some(keyword => lowerText.includes(keyword.toLowerCase()))) {
                    detected.push(category);
                }
            });
            
            return detected;
        }
    }

    // Create and expose the CategoryManager
    console.log('🔧 Creating ultimate simplified CategoryManager instance...');
    const categoryManager = new CategoryManager();
    window.categoryManager = categoryManager;
    console.log('✅ Ultimate simplified CategoryManager created and assigned to window');
}