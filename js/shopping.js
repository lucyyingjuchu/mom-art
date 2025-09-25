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
        // Check if the global portfolio object exists and has currentLanguage
        if (typeof portfolio !== 'undefined' && portfolio.currentLanguage) {
            return portfolio.currentLanguage;
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
    
    
    initializeCart() {
        // Create cart icon if it doesn't exist
        if (!document.getElementById('cartIcon')) {
            const cartIcon = document.createElement('button');
            cartIcon.id = 'cartIcon';
            cartIcon.className = 'header-icon cart-icon';
            cartIcon.innerHTML = '🛒<span class="cart-count" id="cartCount">0</span>';
            cartIcon.onclick = () => this.toggleCart();
            
            // Insert into header icons container
            const headerIcons = document.querySelector('.header-icons');
            if (headerIcons) {
                headerIcons.appendChild(cartIcon);
                console.log('✅ Cart icon added to header container');
            } else {
                console.error('❌ Header icons container not found');
                return;
            }
        }
        
        // Create cart sidebar if it doesn't exist
        if (!document.getElementById('cartSidebar')) {
            this.createCartSidebar();
        }
        
        this.updateCartDisplay();
    }

    attachEventListeners() {
        // Listen for lightbox opening to add shopping controls
        document.addEventListener('lightboxOpened', (event) => {
            this.enhanceLightboxWithShopping(event.detail.artwork);
        });
        
        // 🆕 NEW: Listen for artwork changes during navigation
        document.addEventListener('artworkChanged', (event) => {
            console.log('🛒 Artwork changed during navigation, updating shopping options');
            this.enhanceLightboxWithShopping(event.detail.artwork);
        });
        
        // 🆕 NEW: Listen for language changes to update cart text
        document.addEventListener('languageChanged', () => {
            console.log('🌍 Language changed, updating cart UI');
            this.updateCartLanguage();
        });
    }
    
        // 🆕 NEW: Add this method to update cart language
    updateCartLanguage() {
        // Update cart sidebar title and buttons
        const cartTitle = document.querySelector('.cart-title');
        if (cartTitle) {
            cartTitle.textContent = this.getText('shopping.cartTitle');
        }
        
        const cartTotalLabel = document.querySelector('.cart-total-label');
        if (cartTotalLabel) {
            cartTotalLabel.textContent = this.getText('shopping.total');
        }
        
        const checkoutBtn = document.querySelector('.checkout-btn');
        if (checkoutBtn) {
            checkoutBtn.textContent = this.getText('shopping.checkout');
        }
        
        // Re-render cart items with new language
        if (document.getElementById('cartSidebar').classList.contains('open')) {
            this.renderCartItems();
        }
    }

    createCartSidebar() {
        const overlay = document.createElement('div');
        overlay.id = 'cartOverlay';
        overlay.className = 'cart-overlay';
        overlay.onclick = () => this.closeCart();
        
        const sidebar = document.createElement('div');
        sidebar.id = 'cartSidebar';
        sidebar.className = 'cart-sidebar';
        
        // Use translated text
        sidebar.innerHTML = `
            <div class="cart-header">
                <h3 class="cart-title">${this.getText('shopping.cartTitle')}</h3>
                <button class="cart-close" onclick="shoppingCart.closeCart()">✕</button>
            </div>
            <div class="cart-content" id="cartContent">
                <!-- Cart items will be populated here -->
            </div>
            <div class="cart-footer" id="cartFooter" style="display: none;">
                <div class="cart-total">
                    <span class="cart-total-label">${this.getText('shopping.total')}</span>
                    <span class="cart-total-amount" id="cartTotalAmount">$0.00</span>
                </div>
                <button class="checkout-btn" onclick="shoppingCart.checkout()">
                    ${this.getText('shopping.checkout')}
                </button>
            </div>
        `;
        
        document.body.appendChild(overlay);
        document.body.appendChild(sidebar);
    }
    
    async enhanceLightboxWithShopping(artwork) {
        // Fetch shopping data separately
        try {
            const response = await fetch('./data/finerworks_ready_artworks.json');
            const shoppingData = await response.json();
            const artworkShoppingInfo = shoppingData[artwork.id];
            
            if (artworkShoppingInfo && artworkShoppingInfo.recommended_sizes) {
                // Use the shopping data - FIXED: Use correct data structure
                this.currentArtwork = {
                    ...artwork,
                    artwork_info: artworkShoppingInfo.artwork_info, // This contains title, title_en
                    recommended_sizes: artworkShoppingInfo.recommended_sizes,
                    finerworks_image: artworkShoppingInfo.finerworks_image
                };
            } else {
                this.currentArtwork = artwork; // Fallback to original
            }
        } catch (error) {
            console.error('Could not load shopping data:', error);
            this.currentArtwork = artwork;
        }
        
        this.selectedSize = null;
        
        // Find the lightbox info section
        const infoSection = document.querySelector('.lightbox-info-section');
        if (!infoSection) return;
        
        // Remove existing shopping section
        const existingShopping = infoSection.querySelector('.shopping-section');
        if (existingShopping) {
            existingShopping.remove();
        }
        
        // Create new shopping section
        const shoppingSection = this.createShoppingSection(this.currentArtwork);
        infoSection.appendChild(shoppingSection);
        
        // Load prices for this artwork
        this.loadPricesForArtwork(this.currentArtwork);
    }
    
    createShoppingSection(artwork) {
        const section = document.createElement('div');
        section.className = 'shopping-section';
        
        const sizes = artwork.recommended_sizes || [];
        if (sizes.length === 0) {
            section.innerHTML = `
                <h4>${this.getText('shopping.notAvailable')}</h4>
                <p style="color: #6c757d; font-size: 0.9rem;">
                    ${this.getText('shopping.notAvailableDesc')}
                </p>
            `;
            return section;
        }
        
        section.innerHTML = `
            <h4>${this.getText('shopping.selectSizeTitle')}</h4>
            
            <div class="size-selection">
                <label class="size-label">${this.getText('shopping.availableSizes')}</label>
                <div class="size-options" id="sizeOptions">
                    ${sizes.map((size, index) => `
                        <div class="size-option" data-size-index="${index}">
                            <div class="size-info">
                                <div class="size-dimensions">${size.width_inches}" × ${size.height_inches}"</div>
                                <div class="size-description">${this.getSizeDescription(size)}</div>
                            </div>
                            <div class="size-price">
                                <div class="price-amount" id="price-${index}">
                                    <div class="price-loading">${this.getText('shopping.priceLoading')}</div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="add-to-cart-section" id="addToCartSection" style="display: none;">
                <div class="quantity-selector">
                    <label>${this.getText('shopping.quantity')}</label>
                    <div class="quantity-controls">
                        <button class="quantity-btn" id="qtyMinus">−</button>
                        <input type="number" class="quantity-input" id="quantity" value="1" min="1" max="10">
                        <button class="quantity-btn" id="qtyPlus">+</button>
                    </div>
                </div>
                
                <button class="add-to-cart-btn" id="addToCartBtn" disabled>
                    ${this.getText('shopping.addToCart')}
                </button>
                
                <div class="shopping-message" id="shoppingMessage" style="display: none;"></div>
            </div>
        `;
        
        // Attach event listeners
        this.attachShoppingSectionListeners(section);
        
        return section;
    }
    
    attachShoppingSectionListeners(section) {
        // Size selection
        section.querySelectorAll('.size-option').forEach(option => {
            option.addEventListener('click', () => {
                const sizeIndex = parseInt(option.dataset.sizeIndex);
                this.selectSize(sizeIndex);
            });
        });
        
        // Quantity controls
        const qtyMinus = section.querySelector('#qtyMinus');
        const qtyPlus = section.querySelector('#qtyPlus');
        const qtyInput = section.querySelector('#quantity');
        
        qtyMinus?.addEventListener('click', () => {
            const current = parseInt(qtyInput.value);
            if (current > 1) qtyInput.value = current - 1;
        });
        
        qtyPlus?.addEventListener('click', () => {
            const current = parseInt(qtyInput.value);
            if (current < 10) qtyInput.value = current + 1;
        });
        
        // Add to cart button
        const addToCartBtn = section.querySelector('#addToCartBtn');
        addToCartBtn?.addEventListener('click', () => {
            this.addToCart();
        });
    }
        
    getSizeDescription(size) {
        const widthCm = Math.round(size.width_inches * 2.54);
        const heightCm = Math.round(size.height_inches * 2.54);
        
        const currentLang = this.getCurrentLanguage();
        
        if (currentLang === 'zh') {
            return `${widthCm} × ${heightCm} 公分`;
        } else {
            return `${widthCm} × ${heightCm} cm`;
        }
    }
    
    async loadPricesForArtwork(artwork) {
        const sizes = artwork.recommended_sizes || [];
        
        for (let i = 0; i < sizes.length; i++) {
            const size = sizes[i];
            const priceElement = document.getElementById(`price-${i}`);
            
            try {
                const price = await this.fetchPrice(artwork, size);
                this.prices[i] = price;
                
                if (priceElement) {
                    priceElement.innerHTML = `<div class="price-amount">$${price.toFixed(2)}</div>`;
                }
            } catch (error) {
                console.error('Failed to load price:', error);
                if (priceElement) {
                    priceElement.innerHTML = `<div class="price-amount" style="color: #dc3545;">${this.getText('shopping.priceLoadFailed')}</div>`;
                }
            }
        }
    }
    
    async fetchPrice(artwork, size) {
        // FIXED: Use 210 for Canson Infinity Arches instead of 175
        const priceRequest = {
            "product_qty": 1,
            "product_sku": `5M210M37S${size.width_inches}X${size.height_inches}`
        };
        
        console.log('💰 Fetching price for:', priceRequest);
        
        try {
            const response = await fetch('/.netlify/functions/finerworks-api', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    endpoint: 'get_prices',
                    data: [priceRequest]
                })
            });
            
            const result = await response.json();
            console.log('💰 Price API result:', result);
            
            if (response.ok && result.prices && result.prices.length > 0) {
                const basePrice = parseFloat(result.prices[0].total_price || result.prices[0].product_price || 25.00);
                return Math.round(basePrice * 2.5 * 100) / 100;
            } else {
                console.warn('💰 Price API failed, using fallback');
                return this.calculateFallbackPrice(size.width_inches * size.height_inches);
            }
            
        } catch (error) {
            console.error('💰 Price fetch error:', error);
            return this.calculateFallbackPrice(size.width_inches * size.height_inches);
        }
    }
    
    calculateFallbackPrice(area) {
        // Fallback pricing based on your existing price data
        if (area < 80) return 23.00;
        if (area < 150) return 28.00;
        if (area < 250) return 38.00;
        return 48.00;
    }
    
    selectSize(sizeIndex) {
        // Update UI
        document.querySelectorAll('.size-option').forEach(option => {
            option.classList.remove('selected');
        });
        
        const selectedOption = document.querySelector(`[data-size-index="${sizeIndex}"]`);
        if (selectedOption) {
            selectedOption.classList.add('selected');
        }
        
        // Update state
        this.selectedSize = sizeIndex;
        
        // Show add to cart section
        const addToCartSection = document.getElementById('addToCartSection');
        const addToCartBtn = document.getElementById('addToCartBtn');
        
        if (addToCartSection) {
            addToCartSection.style.display = 'block';
        }
        
        if (addToCartBtn && this.prices[sizeIndex]) {
            addToCartBtn.disabled = false;
        }
    }
    
    addToCart() {
        if (!this.currentArtwork || this.selectedSize === null) return;
        
        const size = this.currentArtwork.recommended_sizes[this.selectedSize];
        const price = this.prices[this.selectedSize];
        const quantity = parseInt(document.getElementById('quantity')?.value || 1);
        
        const currentLang = this.getCurrentLanguage();
        
        // FIXED: Proper fallback chain
        const title = currentLang === 'zh' 
            ? (this.currentArtwork.artwork_info?.title || this.currentArtwork.title || 'Untitled')
            : (this.currentArtwork.artwork_info?.title_en || this.currentArtwork.titleEn || this.currentArtwork.title || 'Untitled');
            
        const titleEn = this.currentArtwork.artwork_info?.title_en || this.currentArtwork.titleEn || '';
        
        // FIXED: Proper image source
        const image = this.currentArtwork.finerworks_image?.finerworks_api_object?.public_thumbnail_uri 
            || this.currentArtwork.image 
            || this.currentArtwork.imageHigh 
            || '';
        
        const cartItem = {
            id: `${this.currentArtwork.id}-${this.selectedSize}`,
            artworkId: this.currentArtwork.id,
            title: title,
            titleEn: titleEn,
            image: image,
            size: `${size.width_inches}" × ${size.height_inches}"`,
            price: price,
            quantity: quantity,
            sizeIndex: this.selectedSize,
            // ADD THESE - store dimensions directly:
            width_inches: size.width_inches,
            height_inches: size.height_inches
        };
        
        // Check if item already exists
        const existingIndex = this.items.findIndex(item => item.id === cartItem.id);
        
        if (existingIndex >= 0) {
            // Update quantity
            this.items[existingIndex].quantity += quantity;
        } else {
            // Add new item
            this.items.push(cartItem);
        }
        
        // Save to localStorage
        localStorage.setItem('xiaoran_cart', JSON.stringify(this.items));
        
        // Update display
        this.updateCartDisplay();
        
        // Show success message
        this.showShoppingMessage(this.getText('shopping.addedToCart'), 'success');
        
        // Animate button
        const btn = document.getElementById('addToCartBtn');
        if (btn) {
            btn.classList.add('adding');
            setTimeout(() => btn.classList.remove('adding'), 300);
        }
    }
    
    showShoppingMessage(message, type) {
        const messageEl = document.getElementById('shoppingMessage');
        if (messageEl) {
            messageEl.textContent = message;
            messageEl.className = `shopping-message ${type}`;
            messageEl.style.display = 'block';
            
            setTimeout(() => {
                messageEl.style.display = 'none';
            }, 3000);
        }
    }
    
    toggleCart() {
        const sidebar = document.getElementById('cartSidebar');
        const overlay = document.getElementById('cartOverlay');
        
        if (sidebar && overlay) {
            const isOpen = sidebar.classList.contains('open');
            
            if (isOpen) {
                this.closeCart();
            } else {
                this.openCart();
            }
        }
    }
    
    openCart() {
        const sidebar = document.getElementById('cartSidebar');
        const overlay = document.getElementById('cartOverlay');
        
        if (sidebar && overlay) {
            sidebar.classList.add('open');
            overlay.classList.add('active');
            this.renderCartItems();
        }
    }
    
    closeCart() {
        const sidebar = document.getElementById('cartSidebar');
        const overlay = document.getElementById('cartOverlay');
        
        if (sidebar && overlay) {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        }
    }
    
    updateCartDisplay() {
        // Update cart count
        const cartCount = document.getElementById('cartCount');
        if (cartCount) {
            const totalItems = this.items.reduce((sum, item) => sum + item.quantity, 0);
            cartCount.textContent = totalItems;
            
            // Show/hide the count badge
            if (totalItems > 0) {
                cartCount.style.display = 'flex';
            } else {
                cartCount.style.display = 'none';
            }
        }
    }
    
    renderCartItems() {
        const cartContent = document.getElementById('cartContent');
        const cartFooter = document.getElementById('cartFooter');
        
        if (!cartContent) return;
        
        if (this.items.length === 0) {
            cartContent.innerHTML = `
                <div class="cart-empty">
                    <h3>${this.getText('shopping.cartEmpty')}</h3>
                    <p>${this.getText('shopping.cartEmptyDesc')}</p>
                </div>
            `;
            if (cartFooter) cartFooter.style.display = 'none';
            return;
        }
        
        const currentLang = this.getCurrentLanguage();
        
        cartContent.innerHTML = this.items.map(item => {
            // Use appropriate title based on current language
            const displayTitle = currentLang === 'zh' ? item.title : (item.titleEn || item.title);
            
            return `
                <div class="cart-item" data-item-id="${item.id}">
                    <img src="${item.image}" 
                        alt="${displayTitle}" 
                        class="cart-item-image clickable-image" 
                        onclick="shoppingCart.openArtworkLightbox('${item.artworkId}')"
                        style="cursor: pointer;"
                        title="點擊查看作品詳情">
                    <div class="cart-item-details">
                        <div class="cart-item-title">${displayTitle}</div>
                        <div class="cart-item-size">${this.getText('lightbox.dimensionsLabel')}: ${item.size}</div>
                        <div class="cart-item-price">${(item.price * item.quantity).toFixed(2)}</div>
                        <div class="cart-item-quantity">
                            <button class="cart-qty-btn" onclick="shoppingCart.updateQuantity('${item.id}', ${item.quantity - 1})">−</button>
                            <input type="number" class="cart-qty-input" value="${item.quantity}" min="1" max="10" 
                                   onchange="shoppingCart.updateQuantity('${item.id}', this.value)">
                            <button class="cart-qty-btn" onclick="shoppingCart.updateQuantity('${item.id}', ${item.quantity + 1})">+</button>
                            <button class="cart-remove" onclick="shoppingCart.removeItem('${item.id}')">${this.getText('shopping.remove')}</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        // Update footer
        const total = this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const cartTotalAmount = document.getElementById('cartTotalAmount');
        if (cartTotalAmount) {
            cartTotalAmount.textContent = `${total.toFixed(2)}`;
        }
        
        // Update footer text
        const cartTotalLabel = document.querySelector('.cart-total-label');
        if (cartTotalLabel) {
            cartTotalLabel.textContent = this.getText('shopping.total');
        }
        
        const checkoutBtn = document.querySelector('.checkout-btn');
        if (checkoutBtn) {
            checkoutBtn.textContent = this.getText('shopping.checkout');
        }
        
        if (cartFooter) {
            cartFooter.style.display = 'block';
        }
    }
    
    updateQuantity(itemId, newQuantity) {
        const quantity = parseInt(newQuantity);
        if (quantity < 1) {
            this.removeItem(itemId);
            return;
        }
        
        const itemIndex = this.items.findIndex(item => item.id === itemId);
        if (itemIndex >= 0) {
            this.items[itemIndex].quantity = Math.min(quantity, 10);
            localStorage.setItem('xiaoran_cart', JSON.stringify(this.items));
            this.updateCartDisplay();
            this.renderCartItems();
        }
    }
    
    removeItem(itemId) {
        this.items = this.items.filter(item => item.id !== itemId);
        localStorage.setItem('xiaoran_cart', JSON.stringify(this.items));
        this.updateCartDisplay();
        this.renderCartItems();
    }
    
    clearCart() {
        this.items = [];
        localStorage.removeItem('xiaoran_cart');
        this.updateCartDisplay();
        this.renderCartItems();
    }
    
    // In js/shopping.js, replace the checkout() method:

    async checkout() {
        if (this.items.length === 0) {
            alert(this.getText('shopping.cartEmpty'));
            return;
        }
        
        // Close the cart sidebar
        this.closeCart();
        
        // Show embedded checkout
        this.showEmbeddedCheckout();
    }

    async showEmbeddedCheckout() {
        try {
            // Create checkout overlay
            const checkoutOverlay = document.createElement('div');
            checkoutOverlay.id = 'checkoutOverlay';
            checkoutOverlay.innerHTML = `
                <div class="checkout-modal">
                    <div class="checkout-header">
                        <h3>Complete Your Purchase</h3>
                        <button class="checkout-close" onclick="shoppingCart.closeEmbeddedCheckout()">✕</button>
                    </div>
                    <div id="checkout-container"></div>
                </div>
            `;
            
            // Add styles for the embedded checkout
            const style = document.createElement('style');
            style.textContent = `
                #checkoutOverlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0,0,0,0.8);
                    z-index: 10000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 1rem;
                }
                .checkout-modal {
                    background: white;
                    border-radius: 12px;
                    width: 100%;
                    max-width: 600px;
                    max-height: 90vh;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                }
                .checkout-header {
                    padding: 1rem 1.5rem;
                    border-bottom: 1px solid #e9ecef;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: #f8f9fa;
                }
                .checkout-header h3 {
                    margin: 0;
                    color: #2c3e50;
                }
                .checkout-close {
                    background: none;
                    border: none;
                    font-size: 1.5rem;
                    cursor: pointer;
                    color: #6c757d;
                }
                #checkout-container {
                    flex: 1;
                    padding: 1rem;
                    overflow-y: auto;
                }
                .checkout-loading {
                    text-align: center;
                    padding: 2rem;
                    color: #6c757d;
                }
            `;
            document.head.appendChild(style);
            document.body.appendChild(checkoutOverlay);
            
            // Initialize embedded checkout
            await this.initializeEmbeddedCheckout();
            
        } catch (error) {
            console.error('Checkout error:', error);
            alert('There was an error starting the checkout process. Please try again.');
            this.closeEmbeddedCheckout();
        }
    }

    async initializeEmbeddedCheckout() {
        try {
            // Add loading message temporarily
            const container = document.getElementById('checkout-container');
            container.innerHTML = '<div class="checkout-loading">Setting up checkout...</div>';

            // Get Stripe public key
            const configResponse = await fetch('/.netlify/functions/get-stripe-config');
            const config = await configResponse.json();
            const stripe = Stripe(config.publishableKey);
            
            // Clear container completely before mounting Stripe
            container.innerHTML = '';
            
            // Initialize embedded checkout
            const checkout = await stripe.initEmbeddedCheckout({
                fetchClientSecret: async () => {
                    const response = await fetch('/.netlify/functions/create-checkout-session', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ cartItems: this.items })
                    });
                    
                    const result = await response.json();
                    if (!response.ok) {
                        throw new Error(result.error || 'Failed to create checkout session');
                    }
                    
                    return result.client_secret;
                },
                
                onShippingDetailsChange: async (shippingDetailsChangeEvent) => {
                    const { checkoutSessionId, shippingDetails } = shippingDetailsChangeEvent;
                    
                    console.log('Frontend: onShippingDetailsChange called');
                    console.log('Frontend: shippingDetails country =', shippingDetails?.address?.country);


                    try {
                        const response = await fetch('/.netlify/functions/calculate-shipping-options', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                checkout_session_id: checkoutSessionId,
                                shipping_details: shippingDetails
                            })
                        });
                        
                        const result = await response.json();

                        console.log('Frontend: received result =', result);
                        console.log('Frontend: response status =', response.status);
                        return Promise.resolve(result);
                        
                    } catch (error) {
                        console.error('Shipping calculation error:', error);
                        return Promise.resolve({
                            type: 'reject',
                            errorMessage: 'Unable to calculate shipping for this address'
                        });
                    }
                }
            });
            
            // Mount the checkout
            checkout.mount('#checkout-container');
            
        } catch (error) {
            console.error('Embedded checkout initialization failed:', error);
            document.getElementById('checkout-container').innerHTML = 
                '<div class="checkout-loading" style="color: #dc3545;">Failed to load checkout. Please try again.</div>';
        }
    }

    closeEmbeddedCheckout() {
        const overlay = document.getElementById('checkoutOverlay');
        if (overlay) {
            overlay.remove();
        }
    }
    
    openArtworkLightbox(artworkId) {
        console.log('Opening lightbox for artwork:', artworkId);
        
        // Close shopping cart
        this.closeCart();
        
        // Slight delay to let cart close animation complete
        setTimeout(() => {
            // Try different global function names
            if (typeof openLightbox === 'function') {
                openLightbox(artworkId);
            } else if (typeof window.openLightbox === 'function') {
                window.openLightbox(artworkId);
            } else {
                console.error('openLightbox function not found');
                console.log('Available functions:', Object.keys(window).filter(key => key.includes('lightbox')));
            }
        }, 300);
    }
}

// Initialize shopping cart when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.shoppingCart = new ShoppingCart();
});