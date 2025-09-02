// CategoryManager.js - Centralized Category Management System
// UPDATED: Uses existing LANGUAGE_DATA from languages.js for translations
// No duplicate translations - just structure and mapping logic

class CategoryManager {
    constructor() {
        this.config = null;
        this.loaded = false;
    }

    // Load category configuration from JSON file
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
            // Return fallback config
            this.config = this.getFallbackConfig();
            this.loaded = true;
            return this.config;
        }
    }

    // Fallback configuration if file load fails
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

    // Check if a category is a subject
    isSubject(categoryKey) {
        if (!this.config) return false;
        return this.config.categories.subjects.includes(categoryKey);
    }

    // Check if a category is a location
    isLocation(categoryKey) {
        if (!this.config) return false;
        return this.config.categories.locations.includes(categoryKey);
    }

    // UPDATED: Get localized label using LANGUAGE_DATA from languages.js
    getCategoryLabel(categoryKey, language = 'zh') {
        // Check if LANGUAGE_DATA is available
        if (typeof LANGUAGE_DATA === 'undefined') {
            console.warn('LANGUAGE_DATA not available, using fallback');
            return this.getFallbackLabel(categoryKey, language);
        }

        const langData = LANGUAGE_DATA[language];
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

        // Check availability
        if (categoryKey === 'available') {
            return langData.common?.available || (language === 'zh' ? '可售' : 'Available');
        }
        if (categoryKey === 'sold') {
            return langData.common?.sold || (language === 'zh' ? '已售' : 'Sold');
        }
        if (categoryKey === 'unknown') {
            return language === 'zh' ? '狀態未明' : 'Status Unknown';
        }

        // Return the key if no translation found
        return categoryKey;
    }

    // Fallback labels if LANGUAGE_DATA not available
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

    // Convert Chinese text to English key
    chineseToEnglish(chineseText) {
        if (!this.config?.categoryMapping?.chineseToEnglish) return chineseText;
        return this.config.categoryMapping.chineseToEnglish[chineseText] || chineseText;
    }

    // Convert English key to Chinese text
    englishToChinese(englishKey) {
        if (!this.config?.categoryMapping?.englishToChinese) return englishKey;
        return this.config.categoryMapping.englishToChinese[englishKey] || englishKey;
    }

    // Normalize categories array (convert Chinese to English keys)
    normalizeCategories(categories) {
        if (!Array.isArray(categories)) return [];
        
        return categories.map(category => {
            // If it's already an English key, keep it
            if (this.isSubject(category) || this.isLocation(category)) {
                return category;
            }
            
            // Try to convert from Chinese
            const englishKey = this.chineseToEnglish(category);
            if (englishKey !== category) {
                return englishKey;
            }
            
            // Return as-is (might be a custom category)
            return category;
        });
    }

    // Separate normalized categories into subjects and locations
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
                // Treat unknown as subjects by default
                subjects.push(category);
            }
        });

        return { subjects, locations, unknown };
    }

    // Get all available subjects
    getAllSubjects() {
        if (!this.config) return [];
        return this.config.categories.subjects;
    }

    // Get all available locations
    getAllLocations() {
        if (!this.config) return [];
        return this.config.categories.locations;
    }

    // Calculate category statistics from artwork array
    calculateStats(artworks) {
        const stats = {
            subjects: {},
            locations: {},
            availability: { available: 0, sold: 0, unknown: 0 }
        };

        if (!Array.isArray(artworks)) return stats;

        let uncategorizedCount = 0;

        artworks.forEach(artwork => {
            // Process categories using the centralized logic
            const allCategories = this.getArtworkCategories(artwork);
            const separated = this.separateCategories(allCategories);

            // Count subjects
            if (separated.subjects.length > 0) {
                separated.subjects.forEach(subject => {
                    stats.subjects[subject] = (stats.subjects[subject] || 0) + 1;
                });
            } else {
                uncategorizedCount++;
            }

            // Count locations
            separated.locations.forEach(location => {
                stats.locations[location] = (stats.locations[location] || 0) + 1;
            });

            // Count availability
            const availability = this.getArtworkAvailability(artwork);
            stats.availability[availability]++;
        });

        // Add uncategorized to subjects if there are any
        if (uncategorizedCount > 0) {
            stats.subjects['uncategorized'] = uncategorizedCount;
        }

        console.log(`📊 Category stats: ${Object.keys(stats.subjects).length} subjects, ${Object.keys(stats.locations).length} locations, ${uncategorizedCount} uncategorized`);

        return stats;
    }

    // Get all categories for an artwork (combines existing + manual)
    getArtworkCategories(artwork) {
        const categories = [];

        // Add from autoCategories (preferred)
        if (artwork.autoCategories) {
            if (artwork.autoCategories.subjects) {
                categories.push(...artwork.autoCategories.subjects);
            }
            if (artwork.autoCategories.locations) {
                categories.push(...artwork.autoCategories.locations);
            }
        }

        // Add from flat categories array (fallback)
        if (artwork.categories && Array.isArray(artwork.categories)) {
            categories.push(...artwork.categories);
        }

        // Add from manual categories (convert Chinese to English)
        if (artwork.manualCategories && Array.isArray(artwork.manualCategories)) {
            const normalizedManual = this.normalizeCategories(artwork.manualCategories);
            categories.push(...normalizedManual);
        }

        // Remove duplicates
        return [...new Set(categories)];
    }

    // Get artwork availability status
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

    // Check if artwork matches filter criteria
    artworkMatchesFilters(artwork, activeFilters) {
        const artworkCategories = this.getArtworkCategories(artwork);
        const separated = this.separateCategories(artworkCategories);

        // Check each filter type
        for (const [filterType, filterValues] of Object.entries(activeFilters)) {
            if (!Array.isArray(filterValues) || filterValues.length === 0) {
                continue; // Skip empty filter types
            }

            let matches = false;

            switch(filterType) {
                case 'subject':
                    matches = filterValues.some(value => separated.subjects.includes(value));
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

            // If any active filter type doesn't match, exclude this artwork
            if (!matches) {
                return false;
            }
        }

        return true;
    }

    // Generate dynamic filter HTML using LANGUAGE_DATA for translations
    generateFilterHTML(stats, currentLanguage = 'zh') {
        let html = '';

        // Subjects section
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

        // Locations section
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

        // Availability section
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

    // Get filter section title from LANGUAGE_DATA
    getFilterSectionTitle(sectionKey, language = 'zh') {
        if (typeof LANGUAGE_DATA !== 'undefined' && LANGUAGE_DATA[language]?.filters?.[sectionKey]) {
            return LANGUAGE_DATA[language].filters[sectionKey];
        }
        
        // Fallback titles
        const fallbackTitles = {
            zh: { bySubject: '題材分類', byLocation: '地點分類', byAvailability: '販售狀態' },
            en: { bySubject: 'By Subject', byLocation: 'By Location', byAvailability: 'By Availability' }
        };
        
        return fallbackTitles[language]?.[sectionKey] || sectionKey;
    }

    // Debug: Log artwork categorization
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

    // Debug: Check if config is working
    debugConfig() {
        console.group('🔧 Category Config Debug');
        console.log('✅ Config loaded:', this.loaded);
        console.log('📊 Subjects:', this.config?.categories?.subjects || []);
        console.log('🗺️ Locations:', this.config?.categories?.locations || []);
        console.log('🔄 Chinese mappings:', Object.keys(this.config?.categoryMapping?.chineseToEnglish || {}));
        console.log('🌐 LANGUAGE_DATA available:', typeof LANGUAGE_DATA !== 'undefined');
        console.groupEnd();
    }

    // Auto-detection: Find matching categories based on keywords
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

// Create global instance
const categoryManager = new CategoryManager();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CategoryManager;
} Check if a category is a subject
    isSubject(categoryKey) {
        if (!this.config) return false;
        return Object.keys(this.config.subjects).includes(categoryKey);
    }

    // Check if a category is a location
    isLocation(categoryKey) {
        if (!this.config) return false;
        return Object.keys(this.config.locations).includes(categoryKey);
    }

    // Get localized label for category
    getCategoryLabel(categoryKey, language = 'zh') {
        if (!this.config) return categoryKey;

        // Check subjects
        if (this.config.subjects[categoryKey]) {
            return this.config.subjects[categoryKey][language] || categoryKey;
        }

        // Check locations  
        if (this.config.locations[categoryKey]) {
            return this.config.locations[categoryKey][language] || categoryKey;
        }

        // Check availability
        if (this.config.availability[categoryKey]) {
            return this.config.availability[categoryKey][language] || categoryKey;
        }

        return categoryKey;
    }

    // Convert Chinese text to English key
    chineseToEnglish(chineseText) {
        if (!this.config?.categoryMapping?.chineseToEnglish) return chineseText;
        return this.config.categoryMapping.chineseToEnglish[chineseText] || chineseText;
    }

    // Convert English key to Chinese text
    englishToChinese(englishKey) {
        if (!this.config?.categoryMapping?.englishToChinese) return englishKey;
        return this.config.categoryMapping.englishToChinese[englishKey] || englishKey;
    }

    // Normalize categories array (convert Chinese to English keys)
    normalizeCategories(categories) {
        if (!Array.isArray(categories)) return [];
        
        return categories.map(category => {
            // If it's already an English key, keep it
            if (this.isSubject(category) || this.isLocation(category)) {
                return category;
            }
            
            // Try to convert from Chinese
            const englishKey = this.chineseToEnglish(category);
            if (englishKey !== category) {
                return englishKey;
            }
            
            // Return as-is (might be a custom category)
            return category;
        });
    }

    // Separate normalized categories into subjects and locations
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
                // Treat unknown as subjects by default
                subjects.push(category);
            }
        });

        return { subjects, locations, unknown };
    }

    // Get all available subjects
    getAllSubjects() {
        if (!this.config) return [];
        return Object.keys(this.config.subjects);
    }

    // Get all available locations
    getAllLocations() {
        if (!this.config) return [];
        return Object.keys(this.config.locations);
    }

    // Calculate category statistics from artwork array
    calculateStats(artworks) {
        const stats = {
            subjects: {},
            locations: {},
            availability: { available: 0, sold: 0, unknown: 0 }
        };

        if (!Array.isArray(artworks)) return stats;

        artworks.forEach(artwork => {
            // Process categories using the centralized logic
            const allCategories = this.getArtworkCategories(artwork);
            const separated = this.separateCategories(allCategories);

            // Count subjects
            separated.subjects.forEach(subject => {
                stats.subjects[subject] = (stats.subjects[subject] || 0) + 1;
            });

            // Count locations
            separated.locations.forEach(location => {
                stats.locations[location] = (stats.locations[location] || 0) + 1;
            });

            // Count availability
            const available = this.getArtworkAvailability(artwork);
            stats.availability[available]++;
        });

        return stats;
    }

    // Get all categories for an artwork (combines existing + manual)
    getArtworkCategories(artwork) {
        const categories = [];

        // Add from autoCategories (preferred)
        if (artwork.autoCategories) {
            if (artwork.autoCategories.subjects) {
                categories.push(...artwork.autoCategories.subjects);
            }
            if (artwork.autoCategories.locations) {
                categories.push(...artwork.autoCategories.locations);
            }
        }

        // Add from flat categories array (fallback)
        if (artwork.categories && Array.isArray(artwork.categories)) {
            categories.push(...artwork.categories);
        }

        // Add from manual categories (convert Chinese to English)
        if (artwork.manualCategories && Array.isArray(artwork.manualCategories)) {
            const normalizedManual = this.normalizeCategories(artwork.manualCategories);
            categories.push(...normalizedManual);
        }

        // Remove duplicates
        return [...new Set(categories)];
    }

    // Get artwork availability status
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

    // Check if artwork matches filter criteria
    artworkMatchesFilters(artwork, activeFilters) {
        const artworkCategories = this.getArtworkCategories(artwork);
        const separated = this.separateCategories(artworkCategories);

        // Check each filter type
        for (const [filterType, filterValues] of Object.entries(activeFilters)) {
            if (!Array.isArray(filterValues) || filterValues.length === 0) {
                continue; // Skip empty filter types
            }

            let matches = false;

            switch(filterType) {
                case 'subject':
                    matches = filterValues.some(value => separated.subjects.includes(value));
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

            // If any active filter type doesn't match, exclude this artwork
            if (!matches) {
                return false;
            }
        }

        return true;
    }

    // Generate dynamic filter HTML
    generateFilterHTML(stats, currentLanguage = 'zh') {
        let html = '';

        // Subjects section
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
                    <h4>📂 ${currentLanguage === 'zh' ? '題材分類' : 'By Subject'}</h4>
                    <div class="secondary-filters">
                        ${subjectsHTML}
                    </div>
                </div>
            `;
        }

        // Locations section
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
                    <h4>🗺️ ${currentLanguage === 'zh' ? '地點分類' : 'By Location'}</h4>
                    <div class="secondary-filters">
                        ${locationsHTML}
                    </div>
                </div>
            `;
        }

        // Availability section
        const availabilityHTML = Object.entries(stats.availability).map(([status, count]) => `
            <button class="secondary-filter-btn"
                    data-filter-type="availability" 
                    data-filter-value="${status}">
                ${this.getCategoryLabel(status, currentLanguage)} (${count})
            </button>
        `).join('');

        html += `
            <div class="filter-section">
                <h4>💰 ${currentLanguage === 'zh' ? '販售狀態' : 'Availability'}</h4>
                <div class="secondary-filters">
                    ${availabilityHTML}
                </div>
            </div>
        `;

        return html;
    }

    // Debug: Log artwork categorization
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

    // Debug: Check if config is working
    debugConfig() {
        console.group('🔧 Category Config Debug');
        console.log('✅ Config loaded:', this.loaded);
        console.log('📊 Subjects:', Object.keys(this.config?.subjects || {}));
        console.log('🗺️ Locations:', Object.keys(this.config?.locations || {}));
        console.log('🔄 Chinese mappings:', Object.keys(this.config?.categoryMapping?.chineseToEnglish || {}));
        console.groupEnd();
    }
}

// Create global instance
const categoryManager = new CategoryManager();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CategoryManager;
}