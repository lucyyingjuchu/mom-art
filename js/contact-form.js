// contact-form.js - 購買詢價表單系統
// 版本: 1.0 - 整合 lightbox 和多語言系統

console.log('📋 Loading contact form system...');

// ================================
// 全域變數
// ================================
let currentInquiryArtwork = null;
let contactFormOpen = false;

// ================================
// 語言文字設定 - 擴充到 language.js
// ================================
const CONTACT_FORM_TEXTS = {
    zh: {
        contactForm: {
            title: "購買詢價",
            subtitle: "對此作品有興趣？請填寫以下資訊",
            artworkInfoTitle: "作品資訊",
            contactInfoTitle: "聯絡資訊", 
            shippingInfoTitle: "配送資訊",
            
            // 作品資訊欄位
            artworkTitle: "作品名稱",
            artworkSize: "尺寸",
            artworkFormat: "裝裱",
            artworkYear: "創作年份",
            
            // 聯絡資訊欄位
            customerName: "姓名",
            customerEmail: "電子郵件",
            customerPhone: "手機號碼",
            
            // 配送資訊欄位  
            shippingAddress: "配送地址",
            shippingMethod: "配送方式",
            shippingNote: "備註說明",
            
            // 配送方式選項
            shippingOptions: {
                homeDelivery: "宅配到府",
                storePickup: "藝廊取貨", 
                courierDelivery: "快遞配送",
                registeredMail: "掛號郵寄"
            },
            
            // 按鈕文字
            submitButton: "送出詢價",
            cancelButton: "取消",
            closeButton: "關閉",
            
            // 提示文字
            requiredField: "必填欄位",
            emailPlaceholder: "請輸入有效的電子郵件地址",
            phonePlaceholder: "請輸入手機號碼",
            addressPlaceholder: "請輸入完整地址",
            notePlaceholder: "特殊需求或問題（選填）",
            
            // 成功/錯誤訊息
            submitSuccess: "詢價表單已送出！我們將儘快與您聯繫。",
            submitError: "送出失敗，請稍後再試或直接聯繫我們。",
            invalidEmail: "請輸入有效的電子郵件格式",
            invalidPhone: "請輸入有效的手機號碼"
        }
    },
    en: {
        contactForm: {
            title: "Purchase Inquiry",
            subtitle: "Interested in this artwork? Please fill out the information below",
            artworkInfoTitle: "Artwork Information",
            contactInfoTitle: "Contact Information",
            shippingInfoTitle: "Shipping Information",
            
            // Artwork info fields
            artworkTitle: "Artwork Title",
            artworkSize: "Dimensions", 
            artworkFormat: "Framing",
            artworkYear: "Year Created",
            
            // Contact info fields
            customerName: "Name",
            customerEmail: "Email",
            customerPhone: "Phone Number",
            
            // Shipping info fields
            shippingAddress: "Shipping Address", 
            shippingMethod: "Shipping Method",
            shippingNote: "Additional Notes",
            
            // Shipping options
            shippingOptions: {
                homeDelivery: "Home Delivery",
                storePickup: "Gallery Pickup",
                courierDelivery: "Courier Delivery", 
                registeredMail: "Registered Mail"
            },
            
            // Button texts
            submitButton: "Send Inquiry",
            cancelButton: "Cancel", 
            closeButton: "Close",
            
            // Placeholder texts
            requiredField: "Required field",
            emailPlaceholder: "Please enter a valid email address",
            phonePlaceholder: "Please enter your phone number", 
            addressPlaceholder: "Please enter complete address",
            notePlaceholder: "Special requirements or questions (optional)",
            
            // Success/error messages
            submitSuccess: "Inquiry submitted successfully! We will contact you soon.",
            submitError: "Submission failed. Please try again later or contact us directly.",
            invalidEmail: "Please enter a valid email format",
            invalidPhone: "Please enter a valid phone number"
        }
    }
};

// ================================
// 輔助函數
// ================================

// 獲取當前語言的文字
function getContactText(key) {
    const currentLang = (typeof portfolio !== 'undefined') ? portfolio.currentLanguage : 'zh';
    const textPath = key.split('.');
    let text = CONTACT_FORM_TEXTS[currentLang];
    
    for (const path of textPath) {
        text = text ? text[path] : key;
    }
    
    return text || key;
}

// 驗證電子郵件格式
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// 驗證手機號碼（台灣格式）
function validatePhone(phone) {
    const phoneRegex = /^(\+886|0)?[0-9]{9,10}$/;
    return phoneRegex.test(phone.replace(/[\s-]/g, ''));
}

// ================================
// 主要功能函數
// ================================

// 開啟聯絡表單
window.openContactForm = function(artworkId) {
    console.log('📋 Opening contact form for artwork:', artworkId);
    
    if (typeof portfolio === 'undefined') {
        console.error('Portfolio not loaded');
        return;
    }
    
    const artwork = portfolio.getArtwork(artworkId);
    if (!artwork) {
        console.error('Artwork not found:', artworkId);
        return;
    }
    
    currentInquiryArtwork = artwork;
    createContactFormModal();
};

// 創建聯絡表單模態框
function createContactFormModal() {
    if (contactFormOpen) return;
    
    contactFormOpen = true;
    const currentLang = (typeof portfolio !== 'undefined') ? portfolio.currentLanguage : 'zh';
    
    // 創建模態框容器
    const modal = document.createElement('div');
    modal.className = 'contact-form-modal';
    modal.innerHTML = generateContactFormHTML();
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    
    // 綁定事件
    bindContactFormEvents(modal);
    
    // 填入作品資訊
    populateArtworkInfo();
    
    // 淡入動畫
    setTimeout(() => modal.classList.add('active'), 10);
    
    console.log('✅ Contact form opened');
}

// 生成表單 HTML
function generateContactFormHTML() {
    const currentLang = (typeof portfolio !== 'undefined') ? portfolio.currentLanguage : 'zh';
    
    return `
        <div class="contact-form-overlay">
            <div class="contact-form-container">
                <div class="contact-form-header">
                    <h2>${getContactText('contactForm.title')}</h2>
                    <p class="contact-form-subtitle">${getContactText('contactForm.subtitle')}</p>
                    <button class="contact-form-close" type="button">×</button>
                </div>
                
                <form class="contact-form-content" id="artworkInquiryForm">
                    <!-- 作品資訊區塊 -->
                    <div class="form-section">
                        <h3>${getContactText('contactForm.artworkInfoTitle')}</h3>
                        <div class="form-row">
                            <div class="form-group">
                                <label>${getContactText('contactForm.artworkTitle')}</label>
                                <input type="text" id="artworkTitle" readonly>
                            </div>
                            <div class="form-group">
                                <label>${getContactText('contactForm.artworkYear')}</label>
                                <input type="text" id="artworkYear" readonly>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>${getContactText('contactForm.artworkSize')}</label>
                                <input type="text" id="artworkSize" readonly>
                            </div>
                            <div class="form-group">
                                <label>${getContactText('contactForm.artworkFormat')}</label>
                                <input type="text" id="artworkFormat" readonly>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 聯絡資訊區塊 -->
                    <div class="form-section">
                        <h3>${getContactText('contactForm.contactInfoTitle')}</h3>
                        <div class="form-row">
                            <div class="form-group">
                                <label>${getContactText('contactForm.customerName')} <span class="required">*</span></label>
                                <input type="text" id="customerName" required>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>${getContactText('contactForm.customerEmail')} <span class="required">*</span></label>
                                <input type="email" id="customerEmail" placeholder="${getContactText('contactForm.emailPlaceholder')}" required>
                            </div>
                            <div class="form-group">
                                <label>${getContactText('contactForm.customerPhone')} <span class="required">*</span></label>
                                <input type="tel" id="customerPhone" placeholder="${getContactText('contactForm.phonePlaceholder')}" required>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 配送資訊區塊 -->
                    <div class="form-section">
                        <h3>${getContactText('contactForm.shippingInfoTitle')}</h3>
                        <div class="form-row">
                            <div class="form-group">
                                <label>${getContactText('contactForm.shippingAddress')} <span class="required">*</span></label>
                                <textarea id="shippingAddress" rows="3" placeholder="${getContactText('contactForm.addressPlaceholder')}" required></textarea>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>${getContactText('contactForm.shippingMethod')} <span class="required">*</span></label>
                                <select id="shippingMethod" required>
                                    <option value="">請選擇配送方式</option>
                                    <option value="homeDelivery">${getContactText('contactForm.shippingOptions.homeDelivery')}</option>
                                    <option value="storePickup">${getContactText('contactForm.shippingOptions.storePickup')}</option>
                                    <option value="courierDelivery">${getContactText('contactForm.shippingOptions.courierDelivery')}</option>
                                    <option value="registeredMail">${getContactText('contactForm.shippingOptions.registeredMail')}</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>${getContactText('contactForm.shippingNote')}</label>
                                <textarea id="shippingNote" rows="3" placeholder="${getContactText('contactForm.notePlaceholder')}"></textarea>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 表單按鈕 -->
                    <div class="form-actions">
                        <button type="button" class="btn-cancel">${getContactText('contactForm.cancelButton')}</button>
                        <button type="submit" class="btn-submit">${getContactText('contactForm.submitButton')}</button>
                    </div>
                </form>
                
                <!-- 成功/錯誤訊息 -->
                <div class="form-message" id="formMessage"></div>
            </div>
        </div>
    `;
}

// 綁定表單事件
function bindContactFormEvents(modal) {
    // 關閉按鈕
    const closeBtn = modal.querySelector('.contact-form-close');
    const cancelBtn = modal.querySelector('.btn-cancel');
    
    closeBtn.addEventListener('click', closeContactForm);
    cancelBtn.addEventListener('click', closeContactForm);
    
    // 點擊背景關閉
    const overlay = modal.querySelector('.contact-form-overlay');
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
            closeContactForm();
        }
    });
    
    // 表單提交
    const form = modal.querySelector('#artworkInquiryForm');
    form.addEventListener('submit', handleFormSubmit);
    
    // 即時驗證
    const emailInput = modal.querySelector('#customerEmail');
    const phoneInput = modal.querySelector('#customerPhone');
    
    emailInput.addEventListener('blur', function() {
        validateEmailInput(this);
    });
    
    phoneInput.addEventListener('blur', function() {
        validatePhoneInput(this);
    });
}

// 填入作品資訊
function populateArtworkInfo() {
    if (!currentInquiryArtwork) return;
    
    const currentLang = (typeof portfolio !== 'undefined') ? portfolio.currentLanguage : 'zh';
    const artwork = currentInquiryArtwork;
    
    // 根據語言選擇合適的欄位
    let title, format, size;
    
    if (currentLang === 'zh') {
        title = artwork.title || '未命名作品';
        format = artwork.format || '未指定';
        size = artwork.sizeCm || '未指定';
    } else {
        title = artwork.titleEn || artwork.title || 'Untitled';
        format = artwork.formatEn || artwork.format || 'Not specified';
        size = artwork.sizeCm || artwork.sizeInches || 'Not specified';
    }
    
    // 填入表單
    const titleInput = document.getElementById('artworkTitle');
    const yearInput = document.getElementById('artworkYear');
    const sizeInput = document.getElementById('artworkSize');
    const formatInput = document.getElementById('artworkFormat');
    
    if (titleInput) titleInput.value = title;
    if (yearInput) yearInput.value = artwork.year || '未指定';
    if (sizeInput) sizeInput.value = size;
    if (formatInput) formatInput.value = format;
    
    console.log('✅ Artwork info populated:', title);
}

// 驗證電子郵件輸入
function validateEmailInput(input) {
    const email = input.value.trim();
    const errorElement = input.parentNode.querySelector('.error-message');
    
    if (email && !validateEmail(email)) {
        showFieldError(input, getContactText('contactForm.invalidEmail'));
        return false;
    } else {
        hideFieldError(input);
        return true;
    }
}

// 驗證手機號碼輸入
function validatePhoneInput(input) {
    const phone = input.value.trim();
    const errorElement = input.parentNode.querySelector('.error-message');
    
    if (phone && !validatePhone(phone)) {
        showFieldError(input, getContactText('contactForm.invalidPhone'));
        return false;
    } else {
        hideFieldError(input);
        return true;
    }
}

// 顯示欄位錯誤
function showFieldError(input, message) {
    hideFieldError(input);
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    
    input.parentNode.appendChild(errorDiv);
    input.classList.add('error');
}

// 隱藏欄位錯誤
function hideFieldError(input) {
    const errorElement = input.parentNode.querySelector('.error-message');
    if (errorElement) {
        errorElement.remove();
    }
    input.classList.remove('error');
}

// 處理表單提交
function handleFormSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    
    // 驗證必填欄位
    if (!validateForm(form)) {
        return;
    }
    
    // 收集表單數據
    const inquiryData = {
        artwork: {
            id: currentInquiryArtwork?.id,
            title: document.getElementById('artworkTitle').value,
            year: document.getElementById('artworkYear').value,
            size: document.getElementById('artworkSize').value,
            format: document.getElementById('artworkFormat').value
        },
        customer: {
            name: document.getElementById('customerName').value,
            email: document.getElementById('customerEmail').value,
            phone: document.getElementById('customerPhone').value
        },
        shipping: {
            address: document.getElementById('shippingAddress').value,
            method: document.getElementById('shippingMethod').value,
            note: document.getElementById('shippingNote').value
        },
        timestamp: new Date().toISOString(),
        language: (typeof portfolio !== 'undefined') ? portfolio.currentLanguage : 'zh'
    };
    
    console.log('📋 Form data:', inquiryData);
    
    // 提交表單（這裡需要根據你的後端接口調整）
    submitInquiry(inquiryData);
}

// 驗證表單
function validateForm(form) {
    let isValid = true;
    const requiredFields = form.querySelectorAll('[required]');
    
    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            showFieldError(field, getContactText('contactForm.requiredField'));
            isValid = false;
        } else {
            hideFieldError(field);
        }
    });
    
    // 特殊驗證
    const emailInput = form.querySelector('#customerEmail');
    const phoneInput = form.querySelector('#customerPhone');
    
    if (!validateEmailInput(emailInput)) isValid = false;
    if (!validatePhoneInput(phoneInput)) isValid = false;
    
    return isValid;
}

// 提交詢價（需要根據實際後端調整）
function submitInquiry(data) {
    const messageDiv = document.getElementById('formMessage');
    const submitBtn = document.querySelector('.btn-submit');
    
    // 顯示提交中狀態
    submitBtn.textContent = '提交中...';
    submitBtn.disabled = true;
    
    // 這裡可以替換為實際的 API 調用
    // 目前使用模擬提交
    setTimeout(() => {
        // 模擬成功提交
        showFormMessage(getContactText('contactForm.submitSuccess'), 'success');
        
        // 重置按鈕
        submitBtn.textContent = getContactText('contactForm.submitButton');
        submitBtn.disabled = false;
        
        // 3秒後關閉表單
        setTimeout(() => {
            closeContactForm();
        }, 3000);
        
        // 實際使用時，這裡應該是 API 調用
        /*
        fetch('/api/artwork-inquiry', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(result => {
            showFormMessage(getContactText('contactForm.submitSuccess'), 'success');
            setTimeout(() => closeContactForm(), 3000);
        })
        .catch(error => {
            console.error('Error:', error);
            showFormMessage(getContactText('contactForm.submitError'), 'error');
        })
        .finally(() => {
            submitBtn.textContent = getContactText('contactForm.submitButton');
            submitBtn.disabled = false;
        });
        */
    }, 1500);
}

// 顯示表單訊息
function showFormMessage(message, type) {
    const messageDiv = document.getElementById('formMessage');
    messageDiv.textContent = message;
    messageDiv.className = `form-message ${type} show`;
    
    setTimeout(() => {
        messageDiv.classList.remove('show');
    }, 5000);
}

// 關閉聯絡表單
function closeContactForm() {
    const modal = document.querySelector('.contact-form-modal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            document.body.removeChild(modal);
            document.body.style.overflow = '';
            contactFormOpen = false;
            currentInquiryArtwork = null;
        }, 300);
    }
}

// ESC 鍵關閉
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && contactFormOpen) {
        closeContactForm();
    }
});

console.log('✅ Contact form system loaded');