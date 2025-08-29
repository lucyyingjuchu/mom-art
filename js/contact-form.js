// contact-form.js - Enhanced Professional Contact Form System
// Version: 2.0 - Clean implementation with smart phone input and autocomplete
emailjs.init("pbE7j2fLMaqfGjb3_"); // Replace with your actual public key from EmailJS dashboard

console.log('📋 Loading enhanced contact form system...');

// ================================
// 全域變數
// ================================
let currentInquiryArtwork = null;
let contactFormOpen = false;
let userCountry = 'TW'; // Default to Taiwan

// ================================
// Country Detection & Phone Enhancement
// ================================

const COUNTRY_CODES = {
    'TW': '+886', 'CN': '+86', 'US': '+1', 'CA': '+1', 'GB': '+44',
    'AU': '+61', 'JP': '+81', 'KR': '+82', 'SG': '+65', 'HK': '+852',
    'MY': '+60', 'TH': '+66', 'PH': '+63', 'ID': '+62', 'VN': '+84',
    'IN': '+91', 'FR': '+33', 'DE': '+49', 'IT': '+39', 'ES': '+34',
    'NL': '+31', 'BE': '+32', 'CH': '+41', 'AT': '+43', 'SE': '+46',
    'NO': '+47', 'DK': '+45', 'FI': '+358', 'BR': '+55', 'MX': '+52',
    'AR': '+54', 'CL': '+56', 'CO': '+57', 'PE': '+51', 'NZ': '+64'
};

function getCountryCode(countryCode) {
    return COUNTRY_CODES[countryCode] || '+886';
}

async function detectUserCountry() {
    try {
        const response = await fetch('https://ipapi.co/country_code/');
        const country = await response.text();
        userCountry = country.trim() || 'TW';
        console.log('🌍 Detected user country:', userCountry);
    } catch (error) {
        console.log('🌍 Country detection failed, using Taiwan as default');
        userCountry = 'TW';
    }
}

// ================================
// 語言文字設定
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

// 驗證手機號碼（國際格式）
function validatePhone(phone) {
    // Remove all non-digit characters for validation
    const cleanPhone = phone.replace(/[^\d]/g, '');
    // Accept phone numbers between 7-15 digits (international standard)
    return cleanPhone.length >= 7 && cleanPhone.length <= 15;
}

// ================================
// HTML 生成函數
// ================================

function generateContactInfoSection() {
    return `
        <div class="form-section">
            <h3>${getContactText('contactForm.contactInfoTitle')}</h3>
            <div class="form-row">
                <div class="form-group">
                    <label>${getContactText('contactForm.customerName')} <span class="required">*</span></label>
                    <input type="text" 
                           id="customerName" 
                           name="given-name"
                           autocomplete="given-name"
                           required>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>${getContactText('contactForm.customerEmail')} <span class="required">*</span></label>
                    <input type="email" 
                           id="customerEmail" 
                           name="email"
                           autocomplete="email"
                           required>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>${getContactText('contactForm.customerPhone')} <span class="required">*</span></label>
                    <div class="phone-input-container">
                        <input type="text" 
                               id="countryCode"
                               class="country-code-input" 
                               value="${getCountryCode(userCountry)}"
                               placeholder="+886">
                        <input type="tel" 
                               id="customerPhone"
                               class="phone-number-input"
                               name="tel"
                               autocomplete="tel"
                               required>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function generateShippingInfoSection() {
    return `
        <div class="form-section">
            <h3>${getContactText('contactForm.shippingInfoTitle')}</h3>
            <div class="form-row">
                <div class="form-group">
                    <label>${getContactText('contactForm.shippingAddress')} <span class="required">*</span></label>
                    <textarea id="shippingAddress" 
                              name="street-address"
                              autocomplete="shipping street-address"
                              rows="3" 
                              required></textarea>
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
                    <textarea id="shippingNote" rows="3"></textarea>
                </div>
            </div>
        </div>
    `;
}

// 生成完整表單 HTML
function generateContactFormHTML() {
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
                    <div class="form-section artwork-info-section">
                        <h3>${getContactText('contactForm.artworkInfoTitle')}</h3>
                        <div class="form-row">
                            <div class="form-group">
                                <label>${getContactText('contactForm.artworkTitle')}</label>
                                <input type="text" id="contactArtworkTitle" readonly>
                            </div>
                            <div class="form-group">
                                <label>${getContactText('contactForm.artworkYear')}</label>
                                <input type="text" id="contactArtworkYear" readonly>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>${getContactText('contactForm.artworkSize')}</label>
                                <input type="text" id="contactArtworkSize" readonly>
                            </div>
                            <div class="form-group">
                                <label>${getContactText('contactForm.artworkFormat')}</label>
                                <input type="text" id="contactArtworkFormat" readonly>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 聯絡資訊區塊 -->
                    ${generateContactInfoSection()}
                    
                    <!-- 配送資訊區塊 -->
                    ${generateShippingInfoSection()}
                    
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

// ================================
// 主要功能函數
// ================================

// 開啟聯絡表單

// REPLACE your window.openContactForm function with this:
window.openContactForm = function(artworkId) {
    console.log('📋 Opening contact form for artwork:', artworkId);
    
    // Add more detailed checks
    if (typeof portfolio === 'undefined') {
        console.error('❌ Portfolio not loaded yet - retrying in 500ms');
        setTimeout(() => window.openContactForm(artworkId), 500);
        return;
    }
    
    if (typeof portfolio.getArtwork !== 'function') {
        console.error('❌ Portfolio.getArtwork not available');
        return;
    }
    
    if (!portfolio.artworks || portfolio.artworks.length === 0) {
        console.error('❌ Portfolio artworks not loaded yet - retrying in 500ms');
        setTimeout(() => window.openContactForm(artworkId), 500);
        return;
    }
    
    const artwork = portfolio.getArtwork(artworkId);
    if (!artwork) {
        console.error('❌ Artwork not found:', artworkId);
        console.log('🔍 Available artworks:', portfolio.artworks.map(a => a.id));
        return;
    }
    
    console.log('✅ All checks passed, proceeding with contact form');
    currentInquiryArtwork = artwork;
    
    // Detect user country first, then create modal
    detectUserCountry().then(() => {
        createContactFormModal();
    });
};

// 創建聯絡表單模態框
function createContactFormModal() {
    if (contactFormOpen) return;
    
    contactFormOpen = true;
    
    // 創建模態框容器
    const modal = document.createElement('div');
    modal.className = 'contact-form-modal';
    modal.innerHTML = generateContactFormHTML();
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    
    // 綁定事件
    bindContactFormEvents(modal);
    
    // 🎯 CRITICAL FIX: Wait for DOM to be ready before populating
    setTimeout(() => {
        console.log('🔄 DOM should be ready, populating artwork info...');
        populateArtworkInfo();
    }, 100); // Give DOM time to render
    
    // 淡入動畫
    setTimeout(() => modal.classList.add('active'), 10);
    
    console.log('✅ Contact form opened');
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
// ULTRA DEBUG VERSION - Replace your populateArtworkInfo() function with this:

// REPLACE your populateArtworkInfo() function with this clean version:

function populateArtworkInfo() {
    console.log('Populating artwork info...');
    
    if (!currentInquiryArtwork) {
        console.error('No current inquiry artwork');
        return;
    }
    
    // Use unique IDs that don't conflict with lightbox
    const titleInput = document.getElementById('contactArtworkTitle');
    const yearInput = document.getElementById('contactArtworkYear');
    const sizeInput = document.getElementById('contactArtworkSize');
    const formatInput = document.getElementById('contactArtworkFormat');
    
    console.log('Form elements found:', {
        titleInput: !!titleInput,
        yearInput: !!yearInput,
        sizeInput: !!sizeInput,
        formatInput: !!formatInput
    });
    
    if (!titleInput || !yearInput || !sizeInput || !formatInput) {
        console.error('Some form elements not found');
        return;
    }
    
    const currentLang = (typeof portfolio !== 'undefined') ? portfolio.currentLanguage : 'zh';
    const artwork = currentInquiryArtwork;
    
    // Get language-appropriate values
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
    
    // Set the values
    titleInput.value = title;
    yearInput.value = artwork.year || '未指定';
    sizeInput.value = size;
    formatInput.value = format;
    
    console.log('Values set:', {
        title: titleInput.value,
        year: yearInput.value,
        size: sizeInput.value,
        format: formatInput.value
    });
}

// ================================
// 驗證函數
// ================================

// 驗證電子郵件輸入
function validateEmailInput(input) {
    const email = input.value.trim();
    
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

// ================================
// 表單提交處理
// ================================

// 處理表單提交
function handleFormSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    
    // 驗證必填欄位
    if (!validateForm(form)) {
        return;
    }
    
    // 收集增強的表單數據
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
            phone: document.getElementById('countryCode').value + ' ' + document.getElementById('customerPhone').value,
            country: userCountry
        },
        shipping: {
            address: document.getElementById('shippingAddress').value,
            method: document.getElementById('shippingMethod').value,
            note: document.getElementById('shippingNote').value
        },
        analytics: {
            timestamp: new Date().toISOString(),
            language: (typeof portfolio !== 'undefined') ? portfolio.currentLanguage : 'zh',
            referrer: document.referrer,
            user_agent: navigator.userAgent,
            detected_country: userCountry,
            session_data: {
                page_views: sessionStorage.getItem('pageViews') || 0,
                time_on_site: Date.now() - (sessionStorage.getItem('sessionStart') || Date.now())
            }
        }
    };
    
    console.log('📋 Enhanced form data:', inquiryData);
    
    // 提交表單
    submitInquiry(inquiryData);
}

// 提交詢價
// Replace your submitInquiry() function with this:

function submitInquiry(data) {
    const messageDiv = document.getElementById('formMessage');
    const submitBtn = document.querySelector('.btn-submit');
    
    // Show submitting state
    submitBtn.textContent = '提交中...';
    submitBtn.disabled = true;
    
    // Prepare email template parameters
    const templateParams = {
        // Customer info
        customer_name: data.customer.name,
        customer_email: data.customer.email,
        customer_phone: data.customer.phone,
        customer_country: data.customer.country,
        
        // Artwork info
        artwork_title: data.artwork.title,
        artwork_year: data.artwork.year,
        artwork_size: data.artwork.size,
        artwork_format: data.artwork.format,
        artwork_id: data.artwork.id,
        
        // Shipping info
        shipping_address: data.shipping.address,
        shipping_method: data.shipping.method,
        shipping_note: data.shipping.note || 'No additional notes',
        
        // Analytics (optional)
        inquiry_language: data.analytics.language,
        inquiry_timestamp: data.analytics.timestamp,
        user_country: data.analytics.detected_country,
        
        artwork_image: currentInquiryArtwork.imageHigh || currentInquiryArtwork.image,
        artwork_title_en: currentInquiryArtwork.titleEn || currentInquiryArtwork.title,

    };
    
    console.log('Sending email with params:', templateParams);
    
    // Send email using EmailJS
    const templateId = data.analytics.language === 'zh' ? 'artwork-inquiry-zh' : 'artwork-inquiry-en';
    emailjs.send('YOUR_SERVICE_ID', templateId, templateParams)

        .then(function(response) {
            console.log('Email sent successfully:', response.status, response.text);
            showFormMessage(getContactText('contactForm.submitSuccess'), 'success');
            
            // Reset button
            submitBtn.textContent = getContactText('contactForm.submitButton');
            submitBtn.disabled = false;
            
            // Close form after 3 seconds
            setTimeout(() => {
                closeContactForm();
            }, 3000);
            
        }, function(error) {
            console.error('Email send failed:', error);
            showFormMessage(getContactText('contactForm.submitError'), 'error');
            
            // Reset button
            submitBtn.textContent = getContactText('contactForm.submitButton');
            submitBtn.disabled = false;
        });
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

// ================================
// 關閉表單
// ================================

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

// ================================
// 初始化
// ================================

// 初始化會話追蹤（用於分析）
if (!sessionStorage.getItem('sessionStart')) {
    sessionStorage.setItem('sessionStart', Date.now());
    sessionStorage.setItem('pageViews', 0);
}

// 增加頁面瀏覽數
const currentViews = parseInt(sessionStorage.getItem('pageViews')) || 0;
sessionStorage.setItem('pageViews', currentViews + 1);

console.log('✅ Enhanced contact form system loaded');