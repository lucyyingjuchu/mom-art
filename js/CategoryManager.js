// CategoryManager.js - Centralized Category Management System
// CLEAN VERSION: Fixed all syntax errors

// Prevent duplicate loading
if (!window.categoryManagerLoaded) {
    window.categoryManagerLoaded = true;

    class CategoryManager {
        constructor() {
            this.config = null;
            this.loaded = false;
            console.log('🔧 CategoryManager constructor called');
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
                
                console.log('✅ Category config loaded successfully');
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
                categoryMapping: {
                    chineseToEnglish: {
                        "山水": "landscape",
                        "瀑布": "waterfall", 
                        "花鳥": "flowers",
                        "書法": "calligraphy",
                        "黃山": "huangshan",
                        "阿里山": "alishan"
                    },
                    englishToChinese: {
                        "landscape": "山水",
                        "waterfall": "瀑布",
                        "flowers": "花鳥", 
                        "calligraphy": "書法",
                        "huangshan": "黃山",
                        "alishan": "阿里山"
                    }
                }
            };
        }

        isSubject(categoryKey) {
            if (!this.config) return false;
            return this.config.categories.subjects.includes(categoryKey);
        }

        isLocation(categoryKey) {
            if (!this.config) return false;
            return this.config.categories.locations.includes(categoryKey);
        }

        getCategoryLabel(categoryKey, language = 'zh') {
            if (typeof LANGUAGE_DATA === 'undefined') {
                return this.getFallbackLabel(categoryKey, language);
            }

            const langData = LANGUAGE_DATA[language];
            if (!langData) {
                return categoryKey;
            }

            if (langData.subjects && langData.subjects[categoryKey]) {
                return langData.subjects[categoryKey];
            }

            if (langData.locations && langData.locations[categoryKey]) {
                return langData.locations[categoryKey];
            }

            if (categoryKey === 'available') {
                return langData.common?.available || (language === 'zh' ? '可售' : 'Available');
            }
            if (categoryKey === 'sold') {
                return langData.common?.sold || (language === 'zh' ? '已售' : 'Sold');
            }
            if (categoryKey === 'unknown') {
                return language === 'zh' ? '狀態未明' : 'Status Unknown';
            }

            return categoryKey;
        }

        getFallbackLabel(categoryKey, language) {
            const fallbackLabels = {
                zh: {
                    "waterfall": "瀑布", "landscape": "山水", "flowers": "花鳥", 
                    "calligraphy": "書法", "huangshan": "黃山", "alishan": "阿里山",
                    "available": "可售", "sold": "已售"
                },
                en: {
                    "waterfall": "Waterfalls", "landscape": "Landscape", "flowers": "Flowers & Birds",
                    "calligraphy": "Calligraphy", "huangshan": "HuangShan", "alishan": "AliShan",
                    "available": "Available", "sold": "Sold"
                }
            };
            
            return fallbackLabels[language]?.[categoryKey] || categoryKey;
        }

        chineseToEnglish(chineseText) {
            if (!this.config?.categoryMapping?.chineseToEnglish) return chineseText;
            return this.config.categoryMapping.chineseToEnglish[chineseText] || chineseText;
        }

        englishToChinese(englishKey) {
            if (!this.config?.categoryMapping?.englishToChinese) return englishKey;
            return this.config.categoryMapping.englishToChinese[englishKey] || englishKey;
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

        // UPDATED: Get all categories for an artwork (merges auto + manual)
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

        getFilterSectionTitle(sectionKey, language = 'zh') {
            if (typeof LANGUAGE_DATA !== 'undefined' && LANGUAGE_DATA[language]?.filters?.[sectionKey]) {
                return LANGUAGE_DATA[language].filters[sectionKey];
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
            console.group('🔧 Category Config Debug');
            console.log('✅ Config loaded:', this.loaded);
            console.log('📊 Subjects:', this.config?.categories?.subjects || []);
            console.log('🗺️ Locations:', this.config?.categories?.locations || []);
            console.log('🔄 Chinese mappings:', Object.keys(this.config?.categoryMapping?.chineseToEnglish || {}));
            console.log('🌐 LANGUAGE_DATA available:', typeof LANGUAGE_DATA !== 'undefined');
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
    console.log('🔧 Creating clean CategoryManager instance...');
    const categoryManager = new CategoryManager();
    window.categoryManager = categoryManager;
    console.log('✅ Clean CategoryManager created and assigned to window');
}