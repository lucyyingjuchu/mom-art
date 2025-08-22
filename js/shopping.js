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
            const response = await fetch('./finerworks_ready_artworks.json');
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
        // Use the print-on-demand structure that worked in your tests
        const priceRequest = {
            "image_id": "687582", // We could upload each image, but for now use a test ID
            "product_sku": `5M175M37S${size.width_inches}X${size.height_inches}`,
            "product_qty": 1
        };
        
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
            
            if (response.ok && result.length > 0) {
                // Extract price from the working response structure
                const basePrice = parseFloat(result[0].price || result[0].total_price || 25.00);
                // Apply your 2.5x markup
                return Math.round(basePrice * 2.5 * 100) / 100;
            } else {
                console.warn('Price API failed, using fallback');
                return this.calculateFallbackPrice(size.width_inches * size.height_inches);
            }
            
        } catch (error) {
            console.error('Price fetch error:', error);
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
        
        // 調試用 - 檢查資料是否正確
        console.log('🎨 Adding to cart - Title:', title);
        console.log('🎨 Current artwork:', this.currentArtwork);
        console.log('🖼️ Using image URL:', image);
        
        const cartItem = {
            id: `${this.currentArtwork.id}-${this.selectedSize}`,
            artworkId: this.currentArtwork.id,
            title: title,
            titleEn: titleEn,
            image: image,
            size: `${size.width_inches}" × ${size.height_inches}"`,
            price: price,
            quantity: quantity,
            sizeIndex: this.selectedSize
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

        console.log('🛒 === CART IMAGE DEBUG ===');
        console.log('currentArtwork:', this.currentArtwork);
        console.log('currentArtwork.id:', this.currentArtwork?.id);
        console.log('finerworks_image exists:', !!this.currentArtwork?.finerworks_image);
        console.log('finerworks_api_object exists:', !!this.currentArtwork?.finerworks_image?.finerworks_api_object);
        console.log('public_thumbnail_uri:', this.currentArtwork?.finerworks_image?.finerworks_api_object?.public_thumbnail_uri);
        console.log('fallback image:', this.currentArtwork?.image);
        console.log('fallback imageHigh:', this.currentArtwork?.imageHigh);
        
        // FIXED: Proper image source
        const image = this.currentArtwork.finerworks_image?.finerworks_api_object?.public_thumbnail_uri 
            || this.currentArtwork.image 
            || this.currentArtwork.imageHigh 
            || '';
        
        console.log('🖼️ Final selected image:', image);
        
        const cartItem = {
            // ... 其他欄位 ...
            image: image,
            // ...
        };
        
        console.log('🛒 Cart item created:', cartItem);
        // ...
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
                    <img src="${item.image}" alt="${displayTitle}" class="cart-item-image">
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
        // Create checkout overlay
        const checkoutOverlay = document.createElement('div');
        checkoutOverlay.className = 'checkout-overlay';
        checkoutOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            z-index: 20000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem;
        `;
        
        const checkoutForm = document.createElement('div');
        checkoutForm.className = 'checkout-form';
        checkoutForm.style.cssText = `
            background: white;
            border-radius: 12px;
            padding: 2rem;
            max-width: 500px;
            width: 100%;
            max-height: 80vh;
            overflow-y: auto;
        `;
        
        const total = this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const currentLang = this.getCurrentLanguage();
        
        checkoutForm.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                <h2 style="margin: 0; color: #2c3e50;">${this.getText('shopping.checkoutTitle')}</h2>
                <button onclick="this.closest('.checkout-overlay').remove()" 
                        style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">✕</button>
            </div>
            
            <form id="checkoutFormElement">
                <div style="margin-bottom: 1.5rem;">
                    <h3 style="color: #495057; margin-bottom: 1rem;">${this.getText('shopping.customerInfo')}</h3>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                        <input type="text" name="firstName" placeholder="${this.getText('shopping.firstName')}" required
                               style="padding: 0.8rem; border: 1px solid #e9ecef; border-radius: 6px;">
                        <input type="text" name="lastName" placeholder="${this.getText('shopping.lastName')}" required
                               style="padding: 0.8rem; border: 1px solid #e9ecef; border-radius: 6px;">
                    </div>
                    
                    <input type="email" name="email" placeholder="${this.getText('shopping.email')}" required
                           style="width: 100%; padding: 0.8rem; border: 1px solid #e9ecef; border-radius: 6px; margin-bottom: 1rem;">
                    
                    <input type="tel" name="phone" placeholder="${this.getText('shopping.phone')}" required
                           style="width: 100%; padding: 0.8rem; border: 1px solid #e9ecef; border-radius: 6px; margin-bottom: 1rem;">
                    
                    <textarea name="address" placeholder="${this.getText('shopping.address')}" required rows="3"
                              style="width: 100%; padding: 0.8rem; border: 1px solid #e9ecef; border-radius: 6px; margin-bottom: 1rem; resize: vertical;"></textarea>
                    
                    <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1rem;">
                        <input type="text" name="city" placeholder="${this.getText('shopping.city')}" required
                               style="padding: 0.8rem; border: 1px solid #e9ecef; border-radius: 6px;">
                        <input type="text" name="postalCode" placeholder="${this.getText('shopping.postalCode')}" required
                               style="padding: 0.8rem; border: 1px solid #e9ecef; border-radius: 6px;">
                    </div>
                </div>
                
                <div style="border-top: 1px solid #e9ecef; padding-top: 1.5rem; margin-bottom: 1.5rem;">
                    <h3 style="color: #495057; margin-bottom: 1rem;">${this.getText('shopping.orderSummary')}</h3>
                    <div style="max-height: 200px; overflow-y: auto;">
                        ${this.items.map(item => {
                            const displayTitle = currentLang === 'zh' ? item.title : (item.titleEn || item.title);
                            return `
                                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 0.9rem;">
                                    <span>${displayTitle} (${item.size}) x${item.quantity}</span>
                                    <span>$${(item.price * item.quantity).toFixed(2)}</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                    <div style="border-top: 1px solid #e9ecef; padding-top: 1rem; display: flex; justify-content: space-between; font-weight: 600; font-size: 1.1rem;">
                        <span>${this.getText('shopping.total')}</span>
                        <span>$${total.toFixed(2)}</span>
                    </div>
                </div>
                
                <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 1rem; margin-bottom: 1.5rem; font-size: 0.9rem;">
                    <strong>${this.getText('shopping.note')}</strong> ${this.getText('shopping.testModeWarning')}
                </div>
                
                <button type="submit" 
                        style="width: 100%; padding: 1rem; background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%); color: white; border: none; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer;">
                    ${this.getText('shopping.confirmOrder')}
                </button>
            </form>
        `;
        
        checkoutOverlay.appendChild(checkoutForm);
        document.body.appendChild(checkoutOverlay);
        
        // Handle form submission
        const form = checkoutForm.querySelector('#checkoutFormElement');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitOrder(new FormData(form));
            checkoutOverlay.remove();
        });
    }
    
    async submitOrder(formData) {
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
            // Convert to Finerworks Print-on-Demand format (the one that worked!)
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
                        "product_order_po": "ITEM" + Math.floor(Math.random() * 10000),                        "product_qty": item.quantity,
                        "product_sku": "5M175M37S6X12", // 先用固定值測試
                        "product_image": {
                            "pixel_width": 806,
                            "pixel_height": 1600,
                            "product_url_file": "https://xiaoran.netlify.app/images/paintings/large/019891b0-f39c-7cee-bc2d-85b83d7ced08_large.png",
                            "product_url_thumbnail": "https://xiaoran.netlify.app/images/paintings/thumbnails/019891b0-f39c-7cee-bc2d-85b83d7ced08_thumb.png"
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
                    "test_mode": true,
                    "webhook_order_status_url": null,
                    "document_url": null,
                    "acct_number_ups": null,
                    "acct_number_fedex": null,
                    "custom_data_1": null,
                    "custom_data_2": null,
                    "custom_data_3": null
                }],
                "validate_only": true
            };
            
            console.log('🚀 Submitting order for validation:', JSON.stringify(finerworksOrder, null, 2));
            
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
                console.log('✅ Order validation successful!');
                this.showOrderConfirmation(orderData);
                this.clearCart();
                this.closeCart();
            } else {
                console.error('❌ Order validation failed:');
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
        confirmation.style.cssText = `
            background: white;
            border-radius: 12px;
            padding: 3rem 2rem;
            max-width: 400px;
            text-align: center;
        `;
        
        confirmation.innerHTML = `
            <div style="font-size: 3rem; margin-bottom: 1rem;">✅</div>
            <h2 style="color: #27ae60; margin-bottom: 1rem;">${this.getText('shopping.orderSuccess')}</h2>
            <p style="color: #6c757d; margin-bottom: 2rem; line-height: 1.6;">
                ${this.getText('shopping.orderThanks')}
            </p>
            <p style="font-size: 0.9rem; color: #495057; margin-bottom: 2rem;">
                ${this.getText('shopping.orderNumber')} #${Date.now().toString().slice(-6)}
            </p>
            <button onclick="this.closest('div[style*=\\"position: fixed\\"]').remove()"
                    style="padding: 1rem 2rem; background: #2c3e50; color: white; border: none; border-radius: 6px; cursor: pointer;">
                ${this.getText('shopping.continueBrowsing')}
            </button>
        `;
        
        confirmationOverlay.appendChild(confirmation);
        document.body.appendChild(confirmationOverlay);
    }
}

// Initialize shopping cart when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.shoppingCart = new ShoppingCart();
});