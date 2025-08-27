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
                        <div class="cart-item-price">$${(item.price * item.quantity).toFixed(2)}</div>
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
            cartTotalAmount.textContent = `$${total.toFixed(2)}`;
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
    
    async checkout() {
        if (this.items.length === 0) return;
        
        const checkoutBtn = document.querySelector('.checkout-btn');
        if (checkoutBtn) {
            checkoutBtn.disabled = true;
            checkoutBtn.textContent = this.getText('shopping.processing');
        }
        
        try {
            // Create checkout form
            this.showCheckoutForm();
        } catch (error) {
            console.error('Checkout error:', error);
            alert(this.getText('shopping.checkoutError'));
        } finally {
            if (checkoutBtn) {
                checkoutBtn.disabled = false;
                checkoutBtn.textContent = this.getText('shopping.checkout');
            }
        }
    }
    
    showCheckoutForm() {
        const total = this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const currentLang = this.getCurrentLanguage();
        
        // Create checkout overlay with professional styling
        const checkoutOverlay = document.createElement('div');
        checkoutOverlay.className = 'checkout-overlay';
        checkoutOverlay.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            background: rgba(0,0,0,0.8) !important;
            z-index: 20000 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            padding: 1rem !important;
        `;
        
        const checkoutForm = document.createElement('div');
        checkoutForm.className = 'checkout-form';
        checkoutForm.style.cssText = `
            background: white !important;
            border-radius: 12px !important;
            max-width: 640px !important;
            width: 100% !important;
            max-height: 90vh !important;
            display: flex !important;
            flex-direction: column !important;
            box-shadow: 0 20px 40px rgba(0,0,0,0.3) !important;
            overflow: hidden !important;
        `;

        // Country configuration for international addresses
        const countryConfig = {
            'US': {
                states: ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'],
                postalLabel: 'ZIP Code',
                postalPlaceholder: '12345',
                stateLabel: 'State'
            },
            'CA': {
                states: ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'],
                postalLabel: 'Postal Code',
                postalPlaceholder: 'A1A 1A1',
                stateLabel: 'Province'
            },
            'TW': {
                postalLabel: '郵遞區號',
                postalPlaceholder: '100',
                stateLabel: '縣市',
                freeForm: true
            }
        };

        checkoutForm.innerHTML = `
            <!-- Fixed Header -->
            <div style="background: #2c3e50 !important; color: white !important; padding: 1.5rem 2rem !important; display: flex !important; justify-content: space-between !important; align-items: center !important; position: sticky !important; top: 0 !important; z-index: 10 !important;">
                <h2 style="margin: 0 !important; font-size: 1.5rem !important; font-weight: 600 !important;">🛒 ${this.getText('shopping.checkoutTitle')}</h2>
                <button onclick="this.closest('.checkout-overlay').remove()" style="background: rgba(255,255,255,0.2) !important; border: none !important; color: white !important; width: 40px !important; height: 40px !important; border-radius: 50% !important; display: flex !important; align-items: center !important; justify-content: center !important; cursor: pointer !important; font-size: 1.5rem !important; transition: all 0.2s ease !important;" onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">✕</button>
            </div>

            <!-- Scrollable Content -->
            <div style="flex: 1 !important; overflow-y: auto !important; padding: 2rem !important;">
                <form id="checkoutFormElement">
                    <!-- Customer Information -->
                    <div style="margin-bottom: 2rem !important;">
                        <h3 style="color: #2c3e50 !important; font-size: 1.1rem !important; font-weight: 600 !important; margin-bottom: 1rem !important; padding-bottom: 0.5rem !important; border-bottom: 2px solid #e9ecef !important; display: flex !important; align-items: center !important; gap: 0.5rem !important;">
                            👤 ${this.getText('shopping.customerInfo')}
                        </h3>
                        <div style="display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 1rem !important; margin-bottom: 1rem !important;">
                            <div style="display: flex !important; flex-direction: column !important;">
                                <label style="font-weight: 500 !important; color: #495057 !important; margin-bottom: 0.5rem !important; font-size: 0.9rem !important;">${this.getText('shopping.firstName')} <span style="color: #e74c3c !important;">*</span></label>
                                <input type="text" name="firstName" required autocomplete="given-name" style="padding: 0.75rem !important; border: 2px solid #e9ecef !important; border-radius: 8px !important; font-size: 1rem !important; transition: all 0.2s ease !important;">
                            </div>
                            <div style="display: flex !important; flex-direction: column !important;">
                                <label style="font-weight: 500 !important; color: #495057 !important; margin-bottom: 0.5rem !important; font-size: 0.9rem !important;">${this.getText('shopping.lastName')} <span style="color: #e74c3c !important;">*</span></label>
                                <input type="text" name="lastName" required autocomplete="family-name" style="padding: 0.75rem !important; border: 2px solid #e9ecef !important; border-radius: 8px !important; font-size: 1rem !important; transition: all 0.2s ease !important;">
                            </div>
                        </div>
                        <div style="display: flex !important; flex-direction: column !important; margin-bottom: 1rem !important;">
                            <label style="font-weight: 500 !important; color: #495057 !important; margin-bottom: 0.5rem !important; font-size: 0.9rem !important;">${this.getText('shopping.email')} <span style="color: #e74c3c !important;">*</span></label>
                            <input type="email" name="email" required autocomplete="email" style="padding: 0.75rem !important; border: 2px solid #e9ecef !important; border-radius: 8px !important; font-size: 1rem !important; transition: all 0.2s ease !important;">
                        </div>
                        <div style="display: flex !important; flex-direction: column !important;">
                            <label style="font-weight: 500 !important; color: #495057 !important; margin-bottom: 0.5rem !important; font-size: 0.9rem !important;">${this.getText('shopping.phone')} <span style="color: #e74c3c !important;">*</span></label>
                            <input type="tel" name="phone" required autocomplete="tel" style="padding: 0.75rem !important; border: 2px solid #e9ecef !important; border-radius: 8px !important; font-size: 1rem !important; transition: all 0.2s ease !important;">
                        </div>
                    </div>

                    <!-- Shipping Address -->
                    <div style="margin-bottom: 2rem !important;">
                        <h3 style="color: #2c3e50 !important; font-size: 1.1rem !important; font-weight: 600 !important; margin-bottom: 1rem !important; padding-bottom: 0.5rem !important; border-bottom: 2px solid #e9ecef !important; display: flex !important; align-items: center !important; gap: 0.5rem !important;">
                            🚚 ${this.getText('shopping.shippingAddress') || 'Shipping Address'}
                        </h3>
                        
                        <!-- Country Selection -->
                        <div style="display: flex !important; flex-direction: column !important; margin-bottom: 1rem !important;">
                            <label style="font-weight: 500 !important; color: #495057 !important; margin-bottom: 0.5rem !important; font-size: 0.9rem !important;">${this.getText('shopping.country') || 'Country'} <span style="color: #e74c3c !important;">*</span></label>
                            <select name="country" required autocomplete="country" id="countrySelect" style="padding: 0.75rem !important; border: 2px solid #e9ecef !important; border-radius: 8px !important; font-size: 1rem !important; transition: all 0.2s ease !important;">
                                <option value="">${this.getText('shopping.selectCountry') || 'Select Country'}</option>
                                <option value="US">United States</option>
                                <option value="CA">Canada</option>
                                <option value="TW">Taiwan (台灣)</option>
                                <option value="GB">United Kingdom</option>
                                <option value="AU">Australia</option>
                                <option value="JP">Japan</option>
                                <option value="KR">South Korea</option>
                                <option value="DE">Germany</option>
                                <option value="FR">France</option>
                                <option value="IT">Italy</option>
                                <option value="ES">Spain</option>
                                <option value="NL">Netherlands</option>
                                <option value="SE">Sweden</option>
                                <option value="NO">Norway</option>
                                <option value="SG">Singapore</option>
                            </select>
                        </div>
                        
                        <!-- Address Lines -->
                        <div style="display: flex !important; flex-direction: column !important; margin-bottom: 1rem !important;">
                            <label style="font-weight: 500 !important; color: #495057 !important; margin-bottom: 0.5rem !important; font-size: 0.9rem !important;">${this.getText('shopping.address')} <span style="color: #e74c3c !important;">*</span></label>
                            <input type="text" name="address1" required autocomplete="address-line1" placeholder="${this.getText('shopping.addressLine1') || 'Street address, P.O. box'}" style="padding: 0.75rem !important; border: 2px solid #e9ecef !important; border-radius: 8px !important; font-size: 1rem !important; transition: all 0.2s ease !important; margin-bottom: 0.5rem !important;">
                            <input type="text" name="address2" autocomplete="address-line2" placeholder="${this.getText('shopping.addressLine2') || 'Apartment, suite, unit, building, floor, etc. (Optional)'}" style="padding: 0.75rem !important; border: 2px solid #e9ecef !important; border-radius: 8px !important; font-size: 1rem !important; transition: all 0.2s ease !important;">
                        </div>
                        
                        <!-- City and State/Province -->
                        <div style="display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 1rem !important; margin-bottom: 1rem !important;">
                            <div style="display: flex !important; flex-direction: column !important;">
                                <label style="font-weight: 500 !important; color: #495057 !important; margin-bottom: 0.5rem !important; font-size: 0.9rem !important;">${this.getText('shopping.city')} <span style="color: #e74c3c !important;">*</span></label>
                                <input type="text" name="city" required autocomplete="address-level2" style="padding: 0.75rem !important; border: 2px solid #e9ecef !important; border-radius: 8px !important; font-size: 1rem !important; transition: all 0.2s ease !important;">
                            </div>
                            <div style="display: flex !important; flex-direction: column !important;">
                                <label style="font-weight: 500 !important; color: #495057 !important; margin-bottom: 0.5rem !important; font-size: 0.9rem !important;" id="stateProvinceLabel">${this.getText('shopping.stateProvince') || 'State/Province'} <span style="color: #e74c3c !important;">*</span></label>
                                <select name="stateProvince" id="stateProvinceSelect" style="padding: 0.75rem !important; border: 2px solid #e9ecef !important; border-radius: 8px !important; font-size: 1rem !important; transition: all 0.2s ease !important; display: none;">
                                    <option value="">${this.getText('shopping.selectState') || 'Select State/Province'}</option>
                                </select>
                                <input type="text" name="stateProvinceText" id="stateProvinceText" autocomplete="address-level1" placeholder="${this.getText('shopping.stateProvince') || 'State/Province'}" style="padding: 0.75rem !important; border: 2px solid #e9ecef !important; border-radius: 8px !important; font-size: 1rem !important; transition: all 0.2s ease !important;">
                            </div>
                        </div>
                        
                        <!-- Postal Code -->
                        <div style="display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 1rem !important;">
                            <div style="display: flex !important; flex-direction: column !important;">
                                <label style="font-weight: 500 !important; color: #495057 !important; margin-bottom: 0.5rem !important; font-size: 0.9rem !important;" id="postalCodeLabel">${this.getText('shopping.postalCode')} <span style="color: #e74c3c !important;">*</span></label>
                                <input type="text" name="postalCode" required autocomplete="postal-code" id="postalCodeInput" style="padding: 0.75rem !important; border: 2px solid #e9ecef !important; border-radius: 8px !important; font-size: 1rem !important; transition: all 0.2s ease !important;">
                            </div>
                        </div>
                    </div>

                    <!-- Order Summary -->
                    <div style="background: #f8f9fa !important; border-radius: 8px !important; padding: 1.5rem !important; margin-bottom: 1.5rem !important;">
                        <div style="display: flex !important; justify-content: space-between !important; align-items: center !important; margin-bottom: 1rem !important;">
                            <h3 style="margin: 0 !important; color: #2c3e50 !important; font-size: 1.1rem !important; font-weight: 600 !important;">📦 ${this.getText('shopping.orderSummary')}</h3>
                            <button type="button" onclick="toggleOrderSummary()" style="background: none !important; border: none !important; color: #2c3e50 !important; font-size: 0.9rem !important; cursor: pointer !important; text-decoration: underline !important;" id="toggleSummaryBtn">${this.getText('shopping.showDetails') || 'Show Details'}</button>
                        </div>
                        <div id="summaryContent" style="display: none !important; max-height: 200px !important; overflow-y: auto !important; border-top: 1px solid #dee2e6 !important; padding-top: 1rem !important;">
                            ${this.items.map(item => {
                                const displayTitle = currentLang === 'zh' ? item.title : (item.titleEn || item.title);
                                return `
                                    <div style="display: flex !important; justify-content: space-between !important; margin-bottom: 0.5rem !important; font-size: 0.9rem !important; color: #495057 !important;">
                                        <span>${displayTitle} (${item.size}) x${item.quantity}</span>
                                        <span>${(item.price * item.quantity).toFixed(2)}</span>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                        <div style="border-top: 2px solid #dee2e6 !important; padding-top: 1rem !important; margin-top: 1rem !important; display: flex !important; justify-content: space-between !important; font-weight: 600 !important; font-size: 1.1rem !important; color: #2c3e50 !important;">
                            <span>${this.getText('shopping.total')}</span>
                            <span>${total.toFixed(2)}</span>
                        </div>
                    </div>
                </form>
            </div>

            <!-- Sticky Footer -->
            <div style="background: #f8f9fa !important; border-top: 1px solid #e9ecef !important; padding: 1.5rem 2rem !important; position: sticky !important; bottom: 0 !important;">
                <div style="background: #fff3cd !important; border: 1px solid #ffeaa7 !important; border-radius: 6px !important; padding: 1rem !important; margin-bottom: 1rem !important; font-size: 0.9rem !important; color: #856404 !important;">
                    <strong>🧪 ${this.getText('shopping.note')}</strong> ${this.getText('shopping.testModeWarning')}
                </div>
                <button type="submit" id="submitOrderBtn" style="width: 100% !important; padding: 1rem !important; background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%) !important; color: white !important; border: none !important; border-radius: 8px !important; font-size: 1rem !important; font-weight: 600 !important; cursor: pointer !important; transition: all 0.2s ease !important;">
                    ${this.getText('shopping.confirmOrder')}
                </button>
            </div>
        `;
        
        checkoutOverlay.appendChild(checkoutForm);
        document.body.appendChild(checkoutOverlay);
        
        // Add CSS for focus states and mobile responsiveness
        const style = document.createElement('style');
        style.textContent = `
            .checkout-overlay input:focus, .checkout-overlay select:focus {
                outline: none !important;
                border-color: #2c3e50 !important;
                box-shadow: 0 0 0 3px rgba(44, 62, 80, 0.1) !important;
            }
            .checkout-overlay button:hover:not(:disabled) {
                transform: translateY(-1px) !important;
                box-shadow: 0 4px 12px rgba(39, 174, 96, 0.3) !important;
            }
            @media (max-width: 768px) {
                .checkout-overlay .checkout-form {
                    max-width: 100% !important;
                    margin: 0.5rem !important;
                    max-height: 95vh !important;
                }
                .checkout-overlay div[style*="grid-template-columns: 1fr 1fr"] {
                    grid-template-columns: 1fr !important;
                }
            }
        `;
        document.head.appendChild(style);
        
        // Add country selection handler
        const countrySelect = document.getElementById('countrySelect');
        countrySelect.addEventListener('change', function() {
            const country = this.value;
            const config = countryConfig[country];
            const stateSelect = document.getElementById('stateProvinceSelect');
            const stateText = document.getElementById('stateProvinceText');
            const stateLabel = document.getElementById('stateProvinceLabel');
            const postalLabel = document.getElementById('postalCodeLabel');
            const postalInput = document.getElementById('postalCodeInput');

            if (config) {
                stateLabel.innerHTML = `${config.stateLabel} <span style="color: #e74c3c !important;">*</span>`;
                postalLabel.innerHTML = `${config.postalLabel} <span style="color: #e74c3c !important;">*</span>`;
                postalInput.placeholder = config.postalPlaceholder;

                if (config.states && !config.freeForm) {
                    stateSelect.innerHTML = `<option value="">Select ${config.stateLabel}</option>`;
                    config.states.forEach(state => {
                        stateSelect.innerHTML += `<option value="${state}">${state}</option>`;
                    });
                    stateSelect.style.display = 'block';
                    stateText.style.display = 'none';
                    stateSelect.required = true;
                    stateText.required = false;
                } else {
                    stateSelect.style.display = 'none';
                    stateText.style.display = 'block';
                    stateSelect.required = false;
                    stateText.required = true;
                }
            }
        });

        // Toggle order summary function
        window.toggleOrderSummary = () => {
            const content = document.getElementById('summaryContent');
            const button = document.getElementById('toggleSummaryBtn');
            
            if (content.style.display === 'none') {
                content.style.display = 'block';
                button.textContent = this.getText('shopping.hideDetails') || 'Hide Details';
            } else {
                content.style.display = 'none';
                button.textContent = this.getText('shopping.showDetails') || 'Show Details';
            }
        };

        // Auto-detect user's country
        if (navigator.language) {
            const locale = navigator.language.toLowerCase();
            if (locale.includes('zh') && locale.includes('tw')) {
                countrySelect.value = 'TW';
            } else if (locale.includes('en-ca')) {
                countrySelect.value = 'CA';
            } else if (locale.includes('en')) {
                countrySelect.value = 'US';
            }
            countrySelect.dispatchEvent(new Event('change'));
        }
        
        // Handle form submission
        const form = checkoutForm.querySelector('#checkoutFormElement');
        const submitBtn = document.getElementById('submitOrderBtn');
        
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            console.log('📝 Form submitted!');
            console.log('📋 Form data:', new FormData(form));
  
            submitBtn.disabled = true;
            submitBtn.style.background = '#6c757d';
            submitBtn.style.cursor = 'not-allowed';
            submitBtn.textContent = this.getText('shopping.processing');
            
            // Get form data including proper address handling
            const formData = new FormData(form);
            const stateProvince = formData.get('stateProvince') || formData.get('stateProvinceText');
            formData.set('stateProvince', stateProvince);
            
            this.submitOrder(formData);
            checkoutOverlay.remove();
            
            // Clean up
            document.head.removeChild(style);
            delete window.toggleOrderSummary;
        });
    }
    
    async submitOrder(formData) {
        console.log('🚀 submitOrder called with:', formData);
        console.log('🛒 Cart items:', this.items);
        const orderData = {
            customer: {
                firstName: formData.get('firstName'),
                lastName: formData.get('lastName'),
                email: formData.get('email'),
                phone: formData.get('phone'),
                address: formData.get('address'),
                city: formData.get('city'),
                postalCode: formData.get('postalCode')
            },
            items: this.items,
            total: this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
            orderDate: new Date().toISOString(),
            status: 'pending'
        };
        
        try {
            // Convert to Finerworks Print-on-Demand format
            const finerworksOrder = {
                "orders": [{
                    "order_po": "XIAORAN_" + Date.now(),
                    "order_key": null,
                    "recipient": {
                        "first_name": orderData.customer.firstName,
                        "last_name": orderData.customer.lastName,
                        "company_name": "袁之靜曉然文化藝術工作室",
                        "address_1": orderData.customer.address,
                        "address_2": null,
                        "address_3": null,
                        "city": orderData.customer.city,
                        "state_code": "CA",
                        "province": null,
                        "zip_postal_code": orderData.customer.postalCode,
                        "country_code": "us",
                        "phone": orderData.customer.phone,
                        "email": orderData.customer.email,
                        "address_order_po": "XIAORAN_" + Date.now()
                    },
                    "order_items": this.items.map(item => ({
                        "product_order_po": "ITEM" + Math.floor(Math.random() * 10000),
                        "product_qty": item.quantity,
                        // FIXED: Use stored dimensions directly - no complex lookups needed!
                        "product_sku": `5M210M37S${item.width_inches}X${item.height_inches}`,
                        "product_image": {
                            "pixel_width": 806,
                            "pixel_height": 1600,
                            "product_url_file": item.image,
                            "product_url_thumbnail": item.image
                        },
                        "product_title": item.title,
                        "template": null,
                        "product_guid": "00000000-0000-0000-0000-000000000000",
                        "custom_data_1": null,
                        "custom_data_2": null,
                        "custom_data_3": null
                    })),
                    "shipping_code": "SD",
                    "ship_by_date": null,
                    "customs_tax_info": null,
                    "gift_message": null,
                    "test_mode": true, // Keep as test for now
                    "webhook_order_status_url": null,
                    "document_url": null,
                    "acct_number_ups": null,
                    "acct_number_fedex": null,
                    "custom_data_1": null,
                    "custom_data_2": null,
                    "custom_data_3": null
                }],
                // FIXED: Set to false to actually submit orders instead of just validating
                "validate_only": false
            };
            
            console.log('🚀 Submitting order:', JSON.stringify(finerworksOrder, null, 2));
            
            // Submit using your proven working API
            const response = await fetch('/.netlify/functions/finerworks-api', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    endpoint: 'submit_orders',
                    data: finerworksOrder
                })
            });
            
            const result = await response.json();
            console.log('📥 Finerworks response:', result);
            console.log('📊 Response status:', response.status);
            
            if (response.ok) {
                console.log('✅ Order submission successful!');
                this.showOrderConfirmation(orderData);
                this.clearCart();
                this.closeCart();
            } else {
                console.error('❌ Order submission failed:');
                console.error('Status:', response.status);
                console.error('Full response:', result);
                
                const errorMsg = result.error || result.message || JSON.stringify(result) || 'Order submission failed';
                throw new Error(errorMsg);
            }
            
        } catch (error) {
            console.error('💥 Order submission error:', error);
            alert(this.getText('shopping.orderSubmitError'));
        }
    }
    
    showOrderConfirmation(orderData) {
        const confirmationOverlay = document.createElement('div');
        confirmationOverlay.className = 'order-confirmation-overlay'; // Add proper class name
        confirmationOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            z-index: 25000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem;
        `;
        
        const confirmation = document.createElement('div');
        confirmation.className = 'order-confirmation-modal';
        confirmation.style.cssText = `
            background: white;
            border-radius: 12px;
            padding: 3rem 2rem;
            max-width: 400px;
            text-align: center;
            position: relative;
        `;
        
        // Create close function that we can reference reliably
        const closeConfirmation = () => {
            confirmationOverlay.remove();
        };
        
        confirmation.innerHTML = `
            <button onclick="this.closest('.order-confirmation-overlay').remove()"
                    style="position: absolute; top: 1rem; right: 1rem; background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #6c757d; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: all 0.2s ease;"
                    onmouseover="this.style.background='#f8f9fa'; this.style.color='#495057';"
                    onmouseout="this.style.background='none'; this.style.color='#6c757d';">
                ✕
            </button>
            
            <div style="font-size: 3rem; margin-bottom: 1rem;">✅</div>
            <h2 style="color: #27ae60; margin-bottom: 1rem;">${this.getText('shopping.orderSuccess')}</h2>
            <p style="color: #6c757d; margin-bottom: 2rem; line-height: 1.6;">
                ${this.getText('shopping.orderThanks')}
            </p>
            <p style="font-size: 0.9rem; color: #495057; margin-bottom: 2rem;">
                ${this.getText('shopping.orderNumber')} #${Date.now().toString().slice(-6)}
            </p>
            <button onclick="this.closest('.order-confirmation-overlay').remove()"
                    style="padding: 1rem 2rem; background: #2c3e50; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 1rem; transition: background 0.2s ease;"
                    onmouseover="this.style.background='#34495e';"
                    onmouseout="this.style.background='#2c3e50';">
                ${this.getText('shopping.continueBrowsing')}
            </button>
        `;
        
        // Also allow clicking on overlay background to close
        confirmationOverlay.addEventListener('click', (e) => {
            if (e.target === confirmationOverlay) {
                closeConfirmation();
            }
        });
        
        confirmationOverlay.appendChild(confirmation);
        document.body.appendChild(confirmationOverlay);
    }

    openArtworkLightbox(artworkId) {
    console.log('🎨 Opening lightbox for artwork:', artworkId);
    
    // 關閉購物車
    this.closeCart();
    
    // 稍微延遲一下讓購物車關閉動畫完成
    setTimeout(() => {
        // 嘗試不同的全域函數名稱
        if (typeof openLightbox === 'function') {
            openLightbox(artworkId);
        } else if (typeof window.openLightbox === 'function') {
            window.openLightbox(artworkId);
        } else {
            console.error('❌ openLightbox function not found');
            console.log('Available functions:', Object.keys(window).filter(key => key.includes('lightbox')));
        }
    }, 300);
}
}

// Initialize shopping cart when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.shoppingCart = new ShoppingCart();
});