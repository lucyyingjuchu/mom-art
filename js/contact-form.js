// contact-form.js - Enhanced Professional Contact Form System
// Version: 3.0 - Updated to use Netlify Functions for secure email sending

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
                           required>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>${getContactText('contactForm.customerEmail')} <span class="required">*</span></label>
                    <input type="email" 
                           id="customerEmail" 
                           name="email"
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
                              rows="3" 
                              required></textarea>
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
    
    console.log('Form elements found:', {
        titleInput: !!titleInput,
        yearInput: !!yearInput,
        sizeInput: !!sizeInput,
    });
    
    if (!titleInput || !yearInput || !sizeInput) {
        console.error('Some form elements not found');
        return;
    }
    
    const currentLang = (typeof portfolio !== 'undefined') ? portfolio.currentLanguage : 'zh';
    const artwork = currentInquiryArtwork;
    
    // Get language-appropriate values
    let title, size;
    
    if (currentLang === 'zh') {
        title = artwork.title || '未命名作品';
        size = artwork.heightCm && artwork.widthCm ? 
            `${artwork.heightCm} x ${artwork.widthCm} cm` : 
            artwork.sizeCm || '未指定';
    } else {
        title = artwork.titleEn || artwork.title || 'Untitled';
        if (artwork.heightCm && artwork.widthCm && artwork.heightInches && artwork.widthInches) {
            size = `${artwork.heightCm} x ${artwork.widthCm} cm (${artwork.heightInches}" x ${artwork.widthInches}")`;
        } else if (artwork.sizeCm && artwork.sizeInches) {
            size = `${artwork.sizeCm} (${artwork.sizeInches})`;
        } else if (artwork.heightCm && artwork.widthCm) {
            size = `${artwork.heightCm} x ${artwork.widthCm} cm`;
        } else {
            size = artwork.sizeCm || artwork.sizeInches || 'Not specified';
        }
    }
    
    // Set the values
    titleInput.value = title;
    yearInput.value = artwork.year || '未指定';
    sizeInput.value = size;
    
    console.log('Values set:', {
        title: titleInput.value,
        year: yearInput.value,
        size: sizeInput.value,
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
            title: document.getElementById('contactArtworkTitle').value,
            titleEn: currentInquiryArtwork?.titleEn || currentInquiryArtwork?.title,
            year: document.getElementById('contactArtworkYear').value,
            size: document.getElementById('contactArtworkSize').value
        },
        customer: {
            name: document.getElementById('customerName').value,
            email: document.getElementById('customerEmail').value,
            phone: document.getElementById('countryCode').value + ' ' + document.getElementById('customerPhone').value,
            country: userCountry
        },
        shipping: {
            address: document.getElementById('shippingAddress').value,
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

// 提交詢價 - Updated to use Netlify Functions
function submitInquiry(data) {
    const messageDiv = document.getElementById('formMessage');
    const submitBtn = document.querySelector('.btn-submit');
    
    // Show submitting state
    submitBtn.textContent = '提交中...';
    submitBtn.disabled = true;
    
    console.log('Submitting inquiry data:', data);
    
    // Send to Netlify function instead of EmailJS directly
    fetch('/.netlify/functions/send-email', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        console.log('Response status:', response.status);
        return response.json();
    })
    .then(result => {
        console.log('Success:', result);
        
        if (result.success) {
            showFormMessage(getContactText('contactForm.submitSuccess'), 'success');
            
            // Close form after 3 seconds
            setTimeout(() => {
                closeContactForm();
            }, 3000);
        } else {
            throw new Error(result.error || 'Unknown error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showFormMessage(getContactText('contactForm.submitError'), 'error');
    })
    .finally(() => {
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

console.log('✅ Enhanced contact form system loaded (Netlify Functions version)');