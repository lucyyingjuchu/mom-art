class ShoppingCart {
    constructor() {
        this.items = JSON.parse(localStorage.getItem('xiaoran_cart') || '[]');
        this.currentArtwork = null;
        this.selectedSize = null;
        this.prices = {};
        this.currentLanguage = 'zh'; // Default language
        
        this.initializeCart();
        this.attachEventListeners();
    }
    
    // NEW: Get current language from the main language system
    getCurrentLanguage() {
        // Check if the global currentLanguage exists (set by your main language system)
        if (typeof currentLanguage !== 'undefined') {
            return currentLanguage;
        }
        // Fallback: check language toggle button text
        const langBtn = document.getElementById('languageToggle');
        if (langBtn) {
            return langBtn.textContent === '中' ? 'en' : 'zh';
        }
        return 'zh'; // Default fallback
    }
    
    // NEW: Get translated text
    getText(path) {
        const lang = this.getCurrentLanguage();
        const keys = path.split('.');
        let text = LANGUAGE_DATA[lang];
        
        for (const key of keys) {
            if (text && typeof text === 'object') {
                text = text[key];
            } else {
                return path; // Return path if translation not found
            }
        }
        return text || path;
    }
    
    // NEW: Update language when language toggle changes
    updateLanguage() {
        this.currentLanguage = this.getCurrentLanguage();
        // Re-render cart if it's open
        const sidebar = document.getElementById('cartSidebar');
        if (sidebar && sidebar.classList.contains('open')) {
            this.renderCartItems();
        }
    }