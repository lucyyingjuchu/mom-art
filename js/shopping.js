// Retail price from the Finerworks cost: a bigger markup on small prints, a smaller
// one on large prints, rounded up to a price ending in 9 (e.g. $93 cost -> $189).
//   cost < $50: x2.5    $50-150: x2    over $150: x1.7
// Keep in sync: js/shopping.js (shown on the page) and functions/create-checkout-session.js (charged).
function retailPrice(cost) {
    const markup = cost < 50 ? 2.5 : cost < 150 ? 2 : 1.7;
    return Math.ceil((cost * markup + 1) / 10) * 10 - 1;
}

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
    
    // Prints are sold on the English site only for now: they are made and shipped
    // in the U.S., which doesn't suit buyers in Taiwan. A Taiwan print service
    // (printed locally) is being set up; until then the Chinese site shows originals only.
    printsEnabled() {
        return this.getCurrentLanguage() === 'en';
    }

    // The cart icon follows the same rule, but stays if something is already in the cart.
    updateCartIconVisibility() {
        const icon = document.getElementById('cartIcon');
        if (icon) icon.classList.toggle('cart-hidden', !(this.printsEnabled() || this.items.length));
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
        this.updateCartIconVisibility();
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
            this.updateCartIconVisibility();
            const lb = document.getElementById('lightbox') || document.querySelector('.lightbox');
            if (this.lastArtwork && lb && lb.classList.contains('active')) {
                this.enhanceLightboxWithShopping(this.lastArtwork);
            }
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
        // Ignore results that arrive after the visitor has moved to another artwork
        const token = this.enhanceToken = (this.enhanceToken || 0) + 1;
        this.lastArtwork = artwork;

        if (!this.printsEnabled()) {
            document.querySelector('.lightbox-info-section .shopping-section')?.remove();
            this.renderPrintsEntryPoints(false, null);
            return;
        }

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
        
        if (token !== this.enhanceToken) return;
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
        shoppingSection.id = 'printsSection';
        infoSection.appendChild(shoppingSection);

        // Tell visitors near the top that prints exist (the section itself is far down)
        const hasPrints = (this.currentArtwork.recommended_sizes || []).length > 0;
        this.renderPrintsEntryPoints(hasPrints, null);

        // Load prices for this artwork, then show the starting price in the entry points
        const lowest = await this.loadPricesForArtwork(this.currentArtwork);
        if (token === this.enhanceToken && hasPrints && lowest) {
            this.renderPrintsEntryPoints(true, lowest);
        }
    }

    // Two small links to the print section: one under the availability badge,
    // and on phones a pill in the collapsed details sheet, which is all a
    // phone visitor sees before pulling the sheet up.
    renderPrintsEntryPoints(hasPrints, lowestPrice) {
        document.getElementById('printsTeaser')?.remove();
        document.getElementById('printsPill')?.remove();
        if (!hasPrints) return;

        const price = !lowestPrice ? ''
            : Number.isInteger(lowestPrice) ? `$${lowestPrice}` : `$${lowestPrice.toFixed(2)}`;
        const fill = (key) => this.getText(key).replace('{price}', price);

        const teaser = document.createElement('button');
        teaser.type = 'button';
        teaser.id = 'printsTeaser';
        teaser.className = 'prints-teaser';
        teaser.innerHTML = '<span class="prints-teaser-text"></span><span class="prints-teaser-arrow" aria-hidden="true">↓</span>';
        teaser.querySelector('.prints-teaser-text').textContent =
            fill(price ? 'shopping.printsTeaserFrom' : 'shopping.printsTeaser');
        teaser.addEventListener('click', () => this.goToPrintsSection());

        const status = document.getElementById('availabilityStatus');
        if (status) status.insertAdjacentElement('afterend', teaser);

        const handle = document.getElementById('lbSheetHandle');
        if (handle) {
            const pill = document.createElement('span');
            pill.id = 'printsPill';
            pill.className = 'prints-pill';
            pill.setAttribute('role', 'button');
            pill.textContent = fill(price ? 'shopping.printsPillFrom' : 'shopping.printsPill');
            // Keep the tap from also counting as a tap on the sheet handle
            pill.addEventListener('pointerdown', e => e.stopPropagation());
            pill.addEventListener('pointerup', e => e.stopPropagation());
            pill.addEventListener('click', e => {
                e.stopPropagation();
                this.goToPrintsSection();
            });
            handle.appendChild(pill);
        }
    }

    goToPrintsSection() {
        const section = document.getElementById('printsSection');
        const box = document.getElementById('lightbox');
        if (!section || !box) return;

        const phone = window.matchMedia('(max-width: 768px)').matches;
        const opening = phone && !box.classList.contains('sheet-open');
        if (phone) box.classList.add('sheet-open');
        box.classList.remove('immersive');

        // On phones, wait for the sheet to finish sliding up before scrolling inside it
        setTimeout(() => {
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
            section.classList.remove('prints-highlight');
            void section.offsetWidth;
            section.classList.add('prints-highlight');
        }, opening ? 320 : 0);
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
            <p class="size-subtitle">${this.getText('shopping.selectSizeSubtitle')}</p>
            
            ${this.createSizeDiagram(artwork, sizes)}
            
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
        section.querySelectorAll('.size-option, .size-diagram .sd-print').forEach(option => {
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
        
    // To-scale picture of every print size next to a 170 cm person: mounted sizes as
    // a board with a visible edge, rolled sizes as a sheet with a curled corner.
    createSizeDiagram(artwork, sizes) {
        const img = artwork.image || artwork.imageHigh;
        if (!img || !sizes.length) return '';
        const PERSON_IN = 67;                       // 170 cm
        const W = 560, H = 230, FLOOR = H - 34, TOP = 10, GAP = 26, LEFT = 14;
        const personW = PERSON_IN * 0.28;
        const totalW = personW + sizes.reduce((sum, s) => sum + s.width_inches, 0);
        const maxH = Math.max(PERSON_IN, ...sizes.map(s => s.height_inches));
        const k = Math.min((W - LEFT * 2 - GAP * sizes.length) / totalW, (FLOOR - TOP) / maxH);
        const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
        const ph = PERSON_IN * k, pw = personW * k, cx = LEFT + pw / 2;
        const person = `
            <g class="sd-person" aria-hidden="true">
                <circle cx="${cx}" cy="${FLOOR - ph + ph * 0.07}" r="${ph * 0.07}"/>
                <path d="M${cx - pw * 0.5} ${FLOOR - ph * 0.5} Q${cx - pw * 0.5} ${FLOOR - ph * 0.83} ${cx} ${FLOOR - ph * 0.83}
                         Q${cx + pw * 0.5} ${FLOOR - ph * 0.83} ${cx + pw * 0.5} ${FLOOR - ph * 0.5}
                         L${cx + pw * 0.28} ${FLOOR - ph * 0.5} L${cx + pw * 0.3} ${FLOOR} L${cx - pw * 0.3} ${FLOOR} L${cx - pw * 0.28} ${FLOOR - ph * 0.5} Z"/>
                <text x="${cx}" y="${FLOOR + 16}" text-anchor="middle">170 cm</text>
            </g>`;
        let x = LEFT + pw + GAP;
        const items = sizes.map((s, i) => {
            const w = s.width_inches * k, h = s.height_inches * k, y = FLOOR - h;
            const rolled = s.style === 'rolled';
            const c = Math.min(14, w * 0.25, h * 0.25);   // curl size
            const g = `
                <g class="sd-print${rolled ? ' sd-rolled' : ''}" data-size-index="${i}">
                    ${rolled ? '' : `<rect class="sd-board" x="${x + 2.5}" y="${y + 2.5}" width="${w}" height="${h}"/>`}
                    <image href="${esc(img)}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="none"/>
                    ${rolled ? `<path class="sd-curl" d="M${x + w - c} ${y + h} L${x + w} ${y + h - c} Q${x + w - c * 0.35} ${y + h - c * 0.35} ${x + w - c} ${y + h} Z"/>
                                <path class="sd-curl-back" d="M${x + w - c} ${y + h} L${x + w} ${y + h} L${x + w} ${y + h - c} Z"/>` : ''}
                    <rect class="sd-outline" x="${x - 2}" y="${y - 2}" width="${w + 4}" height="${h + 4}" rx="2"/>
                    <text x="${x + w / 2}" y="${FLOOR + 16}" text-anchor="middle">${s.width_inches}×${s.height_inches}″</text>
                </g>`;
            x += w + GAP;
            return g;
        }).join('');
        const used = Math.min(W, x - GAP + LEFT);
        const top = Math.max(0, Math.floor(FLOOR - maxH * k - TOP));   // crop empty sky above wide works
        return `
            <figure class="size-diagram">
                <svg viewBox="0 ${top} ${used} ${H - top}" style="font-size:${Math.max(11, used * 0.03).toFixed(1)}px" role="img" aria-label="${esc(this.getText('shopping.diagramLabel'))}">
                    <line class="sd-floor" x1="0" y1="${FLOOR}" x2="${used}" y2="${FLOOR}"/>
                    ${person}${items}
                </svg>
                <figcaption>
                    ${sizes.some(s => s.style !== 'rolled') ? `<span class="sd-key sd-key-board"></span>${this.getText('shopping.styleMounted')}` : ''}
                    ${sizes.some(s => s.style === 'rolled') ? `<span class="sd-key sd-key-rolled"></span>${this.getText('shopping.styleRolled')}` : ''}
                </figcaption>
            </figure>`;
    }

    getSizeDescription(size) {
        const widthCm = Math.round(size.width_inches * 2.54);
        const heightCm = Math.round(size.height_inches * 2.54);
        
        const currentLang = this.getCurrentLanguage();
        
        const cm = currentLang === 'zh' ? `${widthCm} × ${heightCm} 公分` : `${widthCm} × ${heightCm} cm`;
        const style = size.style === 'rolled' ? 'shopping.styleRolled' : 'shopping.styleMounted';
        return `${cm} · ${this.getText(style)}`;
    }
    
    // Returns the lowest price found, for the "from $XX" line
    async loadPricesForArtwork(artwork) {
        const sizes = artwork.recommended_sizes || [];
        let lowest = null;
        
        for (let i = 0; i < sizes.length; i++) {
            const size = sizes[i];
            const priceElement = document.getElementById(`price-${i}`);
            
            try {
                const price = await this.fetchPrice(artwork, size);
                this.prices[i] = price;
                if (lowest === null || price < lowest) lowest = price;
                
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
        return lowest;
    }
    
    async fetchPrice(artwork, size) {
        // FIXED: Use 210 for Canson Infinity Arches instead of 175
        const priceRequest = {
            "product_qty": 1,
            "product_sku": size.sku || `5M210M37S${size.width_inches}X${size.height_inches}`
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
            
            const p = result.prices && result.prices[0];
            const basePrice = p && parseFloat(p.total_price || p.product_price);
            if (!response.ok || !basePrice) {
                // No guessed fallback price: the checkout uses the real Finerworks price,
                // so showing a made-up number here would only mislead.
                throw new Error('Price API failed: ' + response.status);
            }
            return retailPrice(basePrice);
        } catch (error) {
            console.error('💰 Price fetch error:', error);
            throw error;
        }
    }
    
    selectSize(sizeIndex) {
        // Update UI
        document.querySelectorAll('.size-option').forEach(option => {
            option.classList.remove('selected');
        });
        
        const selectedOption = document.querySelector(`.size-option[data-size-index="${sizeIndex}"]`);
        if (selectedOption) {
            selectedOption.classList.add('selected');
        }
        document.querySelectorAll('.size-diagram .sd-print').forEach(g =>
            g.classList.toggle('selected', g.dataset.sizeIndex === String(sizeIndex)));
        
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

        const chosen = this.currentArtwork?.recommended_sizes?.[sizeIndex];
        if (window.trackEvent && chosen) {
            window.trackEvent('select_item', {
                items: [window.analyticsItem(this.currentArtwork, {
                    item_variant: `${chosen.width_inches}x${chosen.height_inches} in`,
                    price: this.prices[sizeIndex] || undefined
                })]
            });
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

        if (window.trackEvent) {
            window.trackEvent('add_to_cart', {
                currency: 'USD',
                value: price * quantity,
                items: [window.analyticsItem(this.currentArtwork, {
                    item_variant: cartItem.size, price: price, quantity: quantity
                })]
            });
        }
        
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
        
        if (window.trackEvent) {
            window.trackEvent('begin_checkout', {
                currency: 'USD',
                value: this.items.reduce((sum, i) => sum + (i.price || 0) * (i.quantity || 1), 0),
                items: this.items.map(i => ({
                    item_id: String(i.artworkId), item_name: i.title, item_variant: i.size,
                    price: i.price, quantity: i.quantity
                }))
            });
        }

        try {
            const response = await fetch('/.netlify/functions/create-checkout-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cartItems: this.items })
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || 'Failed to create checkout session');
            }

            window.location.href = result.checkout_url;  // Redirect to hosted checkout
            
        } catch (error) {
            console.error('Checkout error:', error);
            alert('There was an error starting the checkout process. Please try again.');
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