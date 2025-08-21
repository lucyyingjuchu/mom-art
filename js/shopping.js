class ShoppingCart {
    constructor() {
        this.items = JSON.parse(localStorage.getItem('xiaoran_cart') || '[]');
        this.currentArtwork = null;
        this.selectedSize = null;
        this.prices = {};
        
        this.initializeCart();
        this.attachEventListeners();
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
                // Don't create fallback - this ensures we see the problem
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
        
        sidebar.innerHTML = `
            <div class="cart-header">
                <h3 class="cart-title">購物車</h3>
                <button class="cart-close" onclick="shoppingCart.closeCart()">✕</button>
            </div>
            <div class="cart-content" id="cartContent">
                <!-- Cart items will be populated here -->
            </div>
            <div class="cart-footer" id="cartFooter" style="display: none;">
                <div class="cart-total">
                    <span class="cart-total-label">總計：</span>
                    <span class="cart-total-amount" id="cartTotalAmount">$0.00</span>
                </div>
                <button class="checkout-btn" onclick="shoppingCart.checkout()">
                    結帳
                </button>
            </div>
        `;
        
        document.body.appendChild(overlay);
        document.body.appendChild(sidebar);
    }
    
    attachEventListeners() {
        // Listen for lightbox opening to add shopping controls
        document.addEventListener('lightboxOpened', (event) => {
            this.enhanceLightboxWithShopping(event.detail.artwork);
        });
    }
    
    async enhanceLightboxWithShopping(artwork) {
        // Fetch shopping data separately
        try {
            const response = await fetch('./finerworks_ready_artworks.json');
            const shoppingData = await response.json();
            const artworkShoppingInfo = shoppingData[artwork.id];
            
            if (artworkShoppingInfo && artworkShoppingInfo.recommended_sizes) {
                // Use the shopping data
                this.currentArtwork = {
                    ...artwork,
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
                <h4>此作品暫不提供訂購</h4>
                <p style="color: #6c757d; font-size: 0.9rem;">
                    如有興趣，請透過聯絡方式詢問。
                </p>
            `;
            return section;
        }
        
        section.innerHTML = `
            <h4>選擇尺寸與訂購</h4>
            
            <div class="size-selection">
                <label class="size-label">可選尺寸：</label>
                <div class="size-options" id="sizeOptions">
                    ${sizes.map((size, index) => `
                        <div class="size-option" data-size-index="${index}">
                            <div class="size-info">
                                <div class="size-dimensions">${size.width_inches}" × ${size.height_inches}"</div>
                                <div class="size-description">${this.getSizeDescription(size)}</div>
                            </div>
                            <div class="size-price">
                                <div class="price-amount" id="price-${index}">
                                    <div class="price-loading">載入中...</div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="add-to-cart-section" id="addToCartSection" style="display: none;">
                <div class="quantity-selector">
                    <label>數量：</label>
                    <div class="quantity-controls">
                        <button class="quantity-btn" id="qtyMinus">−</button>
                        <input type="number" class="quantity-input" id="quantity" value="1" min="1" max="10">
                        <button class="quantity-btn" id="qtyPlus">+</button>
                    </div>
                </div>
                
                <button class="add-to-cart-btn" id="addToCartBtn" disabled>
                    加入購物車
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
        const area = size.width_inches * size.height_inches;
        if (area < 80) return '小尺寸 - 適合書桌或小空間';
        if (area < 200) return '中尺寸 - 適合客廳或辦公室';
        return '大尺寸 - 適合大廳或展示空間';
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
                    priceElement.innerHTML = `<div class="price-amount" style="color: #dc3545;">價格載入失敗</div>`;
                }
            }
        }
    }
    
    async fetchPrice(artwork, size) {
        // Create the price request using your existing API structure
        const priceRequest = {
            "image_id": artwork.id, // This would need to be the uploaded image ID
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
                return parseFloat(result[0].price || 25.00); // Use actual price or fallback
            } else {
                // Fallback pricing based on size
                const area = size.width_inches * size.height_inches;
                return this.calculateFallbackPrice(area);
            }
        } catch (error) {
            console.error('Price fetch error:', error);
            // Fallback pricing
            const area = size.width_inches * size.height_inches;
            return this.calculateFallbackPrice(area);
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
        
        const cartItem = {
            id: `${this.currentArtwork.id}-${this.selectedSize}`,
            artworkId: this.currentArtwork.id,
            title: this.currentArtwork.artwork_info?.title || 'Untitled',
            titleEn: this.currentArtwork.artwork_info?.title_en || '',
            image: this.currentArtwork.finerworks_image?.finerworks_api_object?.public_thumbnail_uri || '',
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
        this.showShoppingMessage('已加入購物車！', 'success');
        
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
                    <h3>購物車是空的</h3>
                    <p>瀏覽藝術作品，將喜愛的作品加入購物車</p>
                </div>
            `;
            if (cartFooter) cartFooter.style.display = 'none';
            return;
        }
        
        cartContent.innerHTML = this.items.map(item => `
            <div class="cart-item" data-item-id="${item.id}">
                <img src="${item.image}" alt="${item.title}" class="cart-item-image">
                <div class="cart-item-details">
                    <div class="cart-item-title">${item.title}</div>
                    <div class="cart-item-size">尺寸：${item.size}</div>
                    <div class="cart-item-price">${(item.price * item.quantity).toFixed(2)}</div>
                    <div class="cart-item-quantity">
                        <button class="cart-qty-btn" onclick="shoppingCart.updateQuantity('${item.id}', ${item.quantity - 1})">−</button>
                        <input type="number" class="cart-qty-input" value="${item.quantity}" min="1" max="10" 
                               onchange="shoppingCart.updateQuantity('${item.id}', this.value)">
                        <button class="cart-qty-btn" onclick="shoppingCart.updateQuantity('${item.id}', ${item.quantity + 1})">+</button>
                        <button class="cart-remove" onclick="shoppingCart.removeItem('${item.id}')">移除</button>
                    </div>
                </div>
            </div>
        `).join('');
        
        // Update footer
        const total = this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const cartTotalAmount = document.getElementById('cartTotalAmount');
        if (cartTotalAmount) {
            cartTotalAmount.textContent = `${total.toFixed(2)}`;
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
            checkoutBtn.textContent = '處理中...';
        }
        
        try {
            // Create checkout form
            this.showCheckoutForm();
        } catch (error) {
            console.error('Checkout error:', error);
            alert('結帳過程中發生錯誤，請稍後再試。');
        } finally {
            if (checkoutBtn) {
                checkoutBtn.disabled = false;
                checkoutBtn.textContent = '結帳';
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
        
        checkoutForm.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                <h2 style="margin: 0; color: #2c3e50;">結帳資訊</h2>
                <button onclick="this.closest('.checkout-overlay').remove()" 
                        style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">✕</button>
            </div>
            
            <form id="checkoutFormElement">
                <div style="margin-bottom: 1.5rem;">
                    <h3 style="color: #495057; margin-bottom: 1rem;">收件人資訊</h3>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                        <input type="text" name="firstName" placeholder="名字" required
                               style="padding: 0.8rem; border: 1px solid #e9ecef; border-radius: 6px;">
                        <input type="text" name="lastName" placeholder="姓氏" required
                               style="padding: 0.8rem; border: 1px solid #e9ecef; border-radius: 6px;">
                    </div>
                    
                    <input type="email" name="email" placeholder="電子郵件" required
                           style="width: 100%; padding: 0.8rem; border: 1px solid #e9ecef; border-radius: 6px; margin-bottom: 1rem;">
                    
                    <input type="tel" name="phone" placeholder="電話號碼" required
                           style="width: 100%; padding: 0.8rem; border: 1px solid #e9ecef; border-radius: 6px; margin-bottom: 1rem;">
                    
                    <textarea name="address" placeholder="完整地址" required rows="3"
                              style="width: 100%; padding: 0.8rem; border: 1px solid #e9ecef; border-radius: 6px; margin-bottom: 1rem; resize: vertical;"></textarea>
                    
                    <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1rem;">
                        <input type="text" name="city" placeholder="城市" required
                               style="padding: 0.8rem; border: 1px solid #e9ecef; border-radius: 6px;">
                        <input type="text" name="postalCode" placeholder="郵遞區號" required
                               style="padding: 0.8rem; border: 1px solid #e9ecef; border-radius: 6px;">
                    </div>
                </div>
                
                <div style="border-top: 1px solid #e9ecef; padding-top: 1.5rem; margin-bottom: 1.5rem;">
                    <h3 style="color: #495057; margin-bottom: 1rem;">訂單摘要</h3>
                    <div style="max-height: 200px; overflow-y: auto;">
                        ${this.items.map(item => `
                            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 0.9rem;">
                                <span>${item.title} (${item.size}) x${item.quantity}</span>
                                <span>${(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                        `).join('')}
                    </div>
                    <div style="border-top: 1px solid #e9ecef; padding-top: 1rem; display: flex; justify-content: space-between; font-weight: 600; font-size: 1.1rem;">
                        <span>總計：</span>
                        <span>${total.toFixed(2)}</span>
                    </div>
                </div>
                
                <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 1rem; margin-bottom: 1.5rem; font-size: 0.9rem;">
                    <strong>注意：</strong> 這是測試模式。實際訂單將通過電子郵件確認，不會立即收費。
                </div>
                
                <button type="submit" 
                        style="width: 100%; padding: 1rem; background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%); color: white; border: none; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer;">
                    確認訂單
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
            // In a real implementation, you would submit this to your order processing system
            // For now, we'll just show a confirmation and clear the cart
            
            console.log('Order submitted:', orderData);
            
            // Show success message
            this.showOrderConfirmation(orderData);
            
            // Clear cart
            this.clearCart();
            this.closeCart();
            
        } catch (error) {
            console.error('Order submission error:', error);
            alert('訂單提交失敗，請稍後再試。');
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
            <h2 style="color: #27ae60; margin-bottom: 1rem;">訂單確認成功！</h2>
            <p style="color: #6c757d; margin-bottom: 2rem; line-height: 1.6;">
                感謝您的訂購！我們已收到您的訂單，將會盡快通過電子郵件與您聯繫確認詳細資訊。
            </p>
            <p style="font-size: 0.9rem; color: #495057; margin-bottom: 2rem;">
                訂單編號：#${Date.now().toString().slice(-6)}
            </p>
            <button onclick="this.closest('div[style*=\"position: fixed\"]').remove()"
                    style="padding: 1rem 2rem; background: #2c3e50; color: white; border: none; border-radius: 6px; cursor: pointer;">
                繼續瀏覽
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

