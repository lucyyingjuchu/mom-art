// Content Management System for Chinese Art Portfolio with Auto-Categorization
class ArtworkCategorizer {
    constructor() {
        // Define categorization rules based on title keywords
        this.rules = {
            // By Subject
            subject: {
                'waterfall': ['瀑布', '瀑', '飛瀑', '銀瀑', '煙聲'],
                'landscape': ['山水', '山', '峰', '雲海', '煙雲', '嵐', '壑', '石'],
                'flowingclouds': ['煙', '雲', '煙雲', '雲海', '霧'],
                'flowers': ['花', '梅', '菊', '藤', '紫藤', '杜鵑', '桃花', '荷', '蓮', '牡丹', '阿勃勒', '金針', '櫻花', '凌霄'],
                'bamboo': ['竹', '墨竹', '疏竹', '翠竹'],
                'calligraphy': ['心經', '書法', '經', '愛蓮說', '般若', '聖教序']
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

    // Enhanced filter system that uses both auto-categorization and manual subcategory
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
        this.currentLanguage = 'en'; // 'en' or 'zh'
        this.categorizer = new ArtworkCategorizer();
        this.filterStats = {};
        this.loadArtworks();
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

    // Get localized text
    getText(artwork, field) {
        if (this.currentLanguage === 'zh') {
            return artwork[field] || artwork[field + 'En'] || '';
        }
        return artwork[field + 'En'] || artwork[field] || '';
    }

    // Toggle language
    toggleLanguage() {
        this.currentLanguage = this.currentLanguage === 'en' ? 'zh' : 'en';
        this.renderGallery();
        this.updateLanguageUI();
    }

    // Update language UI
    updateLanguageUI() {
        const langToggle = document.getElementById('languageToggle');
        if (langToggle) {
            langToggle.textContent = this.currentLanguage === 'en' ? '中文' : 'English';
        }
    }

    // Render gallery with current filter
    renderGallery(filterType = 'all', filterValue = 'all') {
        const galleryGrid = document.getElementById('galleryGrid');
        if (!galleryGrid) return;

        let filteredArtworks;
        
        if (filterType === 'all') {
            filteredArtworks = this.artworks;
        } else {
            filteredArtworks = this.filterArtworks(filterType, filterValue);
        }

        // Update results counter
        const resultsInfo = document.getElementById('resultsInfo');
        if (resultsInfo) {
            resultsInfo.textContent = `Showing ${filteredArtworks.length} of ${this.artworks.length} artworks`;
        }

        // Render artwork cards
        galleryGrid.innerHTML = filteredArtworks.map(artwork => this.createArtworkCard(artwork)).join('');
    }

    // Create artwork card HTML
    createArtworkCard(artwork) {
        const title = this.getText(artwork, 'title') || 'Untitled';
        const description = this.getText(artwork, 'description') || 'No description available';
        
        // Handle missing images
        const imageUrl = artwork.image || './images/placeholder/artwork-placeholder.svg';
        
        // Handle missing size
        const size = artwork.sizeCm || 'Size not specified';
        
        // Handle boolean fields with defaults
        const available = this.getBooleanValue(artwork, 'available', true);
        
        return `
            <div class="gallery-item" onclick="openLightbox('${artwork.id}')">
                <div class="gallery-item-image">
                    <img src="${imageUrl}" alt="${title}" loading="lazy" 
                         onerror="this.src='https://via.placeholder.com/400x300/f8f9fa/6c757d?text=Image+Error'">
                </div>
                <div class="gallery-item-info">
                    <h3>${title}</h3>
                    <p>${description}</p>
                    <div class="artwork-meta">
                        <span class="year">${artwork.year || 'Unknown'}</span>
                        <span class="size">${size}</span>
                        ${available ? '<span class="available">Available</span>' : '<span class="sold">Sold</span>'}
                    </div>
                </div>
            </div>
        `;
    }

    // Generate dynamic filter menu based on available categories
    generateFilterMenu() {
        const stats = this.filterStats;
        
        return `
            <div class="filter-container">
                <div class="filter-menu">
                    <!-- Primary Filters -->
                    <div class="primary-filters">
                        <button class="filter-btn active" data-filter-type="all" data-filter-value="all">
                            All Works (${this.artworks.length})
                        </button>
                        <button class="filter-btn" data-filter-type="category" data-filter-value="recent">
                            Recent Works (${stats.years.recent})
                        </button>
                        <button class="filter-btn" data-filter-type="category" data-filter-value="featured">
                            Featured
                        </button>
                        <button class="filter-btn" data-filter-type="category" data-filter-value="paintings">
                            Paintings 國畫
                        </button>
                        <button class="filter-btn" data-filter-type="category" data-filter-value="calligraphy">
                            Calligraphy 書法
                        </button>
                    </div>

                    <!-- Subject Filters -->
                    <div class="filter-section">
                        <h4>By Subject 題材</h4>
                        <div class="secondary-filters">
                            ${Object.entries(stats.subjects).map(([subject, count]) => `
                                <button class="secondary-filter-btn" 
                                        data-filter-type="subject" 
                                        data-filter-value="${subject}">
                                    ${this.getSubjectLabel(subject)} (${count})
                                </button>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Location Filters -->
                    ${Object.keys(stats.locations).length > 0 ? `
                    <div class="filter-section">
                        <h4>By Location 地點</h4>
                        <div class="secondary-filters">
                            ${Object.entries(stats.locations).map(([location, count]) => `
                                <button class="secondary-filter-btn" 
                                        data-filter-type="location" 
                                        data-filter-value="${location}">
                                    ${this.getLocationLabel(location)} (${count})
                                </button>
                            `).join('')}
                        </div>
                    </div>
                    ` : ''}

                    <!-- Year Filters -->
                    <div class="filter-section">
                        <h4>By Year 年代</h4>
                        <div class="secondary-filters">
                            <button class="secondary-filter-btn" data-filter-type="year" data-filter-value="recent">
                                Recent 2020+ (${stats.years.recent})
                            </button>
                            <button class="secondary-filter-btn" data-filter-type="year" data-filter-value="2010s">
                                2010s (${stats.years['2010s']})
                            </button>
                            <button class="secondary-filter-btn" data-filter-type="year" data-filter-value="earlier">
                                Earlier (${stats.years.earlier})
                            </button>
                        </div>
                    </div>

                    <!-- Search and Sort -->
                    <div class="search-sort-container">
                        <div class="search-box">
                            <span class="search-icon">🔍</span>
                            <input type="text" placeholder="Search artworks..." id="searchInput">
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
        const labels = {
            'waterfall': 'Waterfalls 瀑布',
            'landscape': 'Landscape 山水',
            'flowers': 'Flowers & Birds 花鳥',
            'bamboo': 'Bamboo 墨竹',
            'calligraphy': 'Calligraphy 書法',
            'flowingclouds': 'Flowing Clouds 煙雲',
            'abstract': 'Abstract 抽象',
        };
        return labels[subject] || subject;
    }

    getLocationLabel(location) {
        const labels = {
            'huangshan': 'Huangshan 黃山',
            'alishan': 'Alishan 阿里山',
            'taroko': 'Taroko 太魯閣',
            'hehuanshan': 'Hehuanshan 合歡山',
            'yushan': 'Yushan 玉山',
            'liushishishan': 'Liushishi Mt. 六十石山',
            'guishandao': 'Guishan Island 龜山島',
            'longdong': 'Longdong 龍洞',
            'zhangjiajie': 'Zhangjiajie 張家界',
            'grandcanyon': 'Grand Canyon 大峽谷',
            'iguazu': 'Iguazu Falls 伊瓜蘇',
            'niagara': 'Niagara Falls 尼加拉'
        };
        return labels[location] || location;
    }

    // Initialize gallery and event listeners
    initializeGallery() {
        this.renderGallery();
        this.setupEventListeners();
        this.renderFeaturedWorks();
        this.updateLanguageUI();
        this.renderFilterMenu();
    }

    // Render filter menu
    renderFilterMenu() {
        const filterContainer = document.querySelector('.filter-placeholder');
        if (filterContainer) {
            filterContainer.innerHTML = this.generateFilterMenu();
            this.setupFilterListeners();
        }
    }

    // Setup filter event listeners
    setupFilterListeners() {
        // Filter buttons
        document.querySelectorAll('.filter-btn, .secondary-filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filterType = e.target.dataset.filterType;
                const filterValue = e.target.dataset.filterValue;
                
                this.renderGallery(filterType, filterValue);
                
                // Update active filter button
                if (e.target.classList.contains('filter-btn')) {
                    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                    e.target.classList.add('active');
                }
                
                if (e.target.classList.contains('secondary-filter-btn')) {
                    document.querySelectorAll('.secondary-filter-btn').forEach(b => b.classList.remove('active'));
                    e.target.classList.add('active');
                }
            });
        });
    }

    // Render featured works on home page
    renderFeaturedWorks() {
        const featuredContainer = document.querySelector('.featured-works');
        if (!featuredContainer) return;

        const featuredWorks = this.getFeaturedArtworks().slice(0, 3);
        const worksToShow = featuredWorks.length > 0 ? featuredWorks : this.artworks.slice(0, 3);
        
        featuredContainer.innerHTML = worksToShow.map(artwork => {
            const title = this.getText(artwork, 'title') || 'Untitled';
            const description = this.getText(artwork, 'description') || 'No description available';
        const imageUrl = artwork.image || './images/placeholder/artwork-placeholder.svg';
            
            return `
                <div class="featured-work" onclick="openLightbox('${artwork.id}')">
                    <img src="${imageUrl}" alt="${title}" 
                         onerror="this.src='./images/placeholder/artwork-placeholder.svg'">
                    <div class="featured-work-info">
                        <h3>${title}</h3>
                        <p>${description}</p>
                    </div>
                </div>
            `;
        }).join('');
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

        // Update results counter
        const resultsInfo = document.getElementById('resultsInfo');
        if (resultsInfo) {
            resultsInfo.textContent = `Found ${results.length} artworks`;
        }

        galleryGrid.innerHTML = results.map(artwork => this.createArtworkCard(artwork)).join('');
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