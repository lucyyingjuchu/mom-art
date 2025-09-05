// Complete Working Lightbox - ALL zoom indicators use clean progress bar
// Version: 7.2 - BILINGUAL FRAMEWORK with Dynamic Layout System
// BILINGUAL FRAMEWORK UPDATE - Preserves all existing zoom/pan functionality

console.log('🚀 Loading bilingual lightbox with dynamic layout...');

// ================================
// GLOBAL VARIABLES
// ================================
let currentArtworkIndex = 0;
let artworksData = [];
let zoomLevel = 1;
let maxZoom = 4;
let minZoom = 1;
let panX = 0;
let panY = 0;
let isDragging = false;
let hasDragged = false;
let startX = 0;
let startY = 0;
let currentImage = null;
let isFullscreenMode = false;
let fullscreenThreshold = 2;
let originalLightboxContent = null;
let isZoomBlocked = false;
let zoomBlockTimeout = null;
let currentArtworkViews = [];
let currentViewIndex = 0;
const BLOCK_DURATION = 600;

// ================================
// 精確動態比例計算系統 - 修復版本
// ================================

function calculateSmartLightboxLayout(sizeString) {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const maxTotal = screenWidth * 0.9;            // 最大總寬度 90%
    const maxImageHeight = screenHeight * 0.8;     // 最大高度 80vh
    
    // 解析比例
    let aspectRatio = 1;
    if (sizeString) {
        const numbers = sizeString.replace(/[^\d\s]/g, ' ').match(/\d+/g);
        if (numbers && numbers.length >= 2) {
            const height = parseInt(numbers[0]);
            const width = parseInt(numbers[1]);
            aspectRatio = width / height;
        }
    }
    
    console.log(`📐 Aspect ratio: ${aspectRatio.toFixed(2)} (${aspectRatio > 1 ? 'landscape' : 'portrait'})`);
    
    // 🎯 Step 1: 基於高度限制計算圖片尺寸
    let imageDisplayHeight = maxImageHeight;
    let imageDisplayWidth = imageDisplayHeight * aspectRatio;
    
    // 🎯 Step 2: 圖片 + 上下左右 5% margin = Image Section 寬度
    let imageSectionWidth = imageDisplayWidth * 1.1; // 左右各5% = 10% 額外寬度
    
    // 🎯 Step 3: Info section 寬度應該基於實際內容需求，而不是固定比例
    // 設定一個合理的 info section 寬度範圍
    const minInfoWidth = 300;  // 最小寬度
    const maxInfoWidth = 450;  // 最大寬度
    let infoWidth = Math.min(maxInfoWidth, Math.max(minInfoWidth, screenWidth * 0.35)); // 35% 而不是 45%
    
    // 🎯 Step 4: 計算總寬度
    let totalWidth = imageSectionWidth + infoWidth;
    
    // 🎯 Step 5: 檢查總寬度是否超限，如果超過則縮放
    if (totalWidth > maxTotal) {
        console.log(`⚠️ Total width ${totalWidth.toFixed(0)}px exceeds limit ${maxTotal.toFixed(0)}px`);
        
        // 重新計算：從最大總寬度反推
        const maxImageSectionWidth = maxTotal - infoWidth;
        imageSectionWidth = maxImageSectionWidth;
        imageDisplayWidth = imageSectionWidth / 1.1;  // 扣掉 margin 後的圖片寬度
        imageDisplayHeight = imageDisplayWidth / aspectRatio;
        totalWidth = imageSectionWidth + infoWidth;
        
        console.log(`🔧 Adjusted to fit: Image section ${imageSectionWidth.toFixed(0)}px, Total ${totalWidth.toFixed(0)}px`);
    }
    
    // 🎯 Step 6: 再次檢查高度限制
    if (imageDisplayHeight > maxImageHeight) {
        console.log(`⚠️ Height ${imageDisplayHeight.toFixed(0)}px exceeds limit ${maxImageHeight.toFixed(0)}px`);
        
        // 基於高度重新計算
        imageDisplayHeight = maxImageHeight;
        imageDisplayWidth = imageDisplayHeight * aspectRatio;
        imageSectionWidth = imageDisplayWidth * 1.1;
        totalWidth = imageSectionWidth + infoWidth;
        
        // 如果調整後又超過寬度限制，再次調整
        if (totalWidth > maxTotal) {
            const maxImageSectionWidth = maxTotal - infoWidth;
            imageSectionWidth = maxImageSectionWidth;
            imageDisplayWidth = imageSectionWidth / 1.1;
            imageDisplayHeight = imageDisplayWidth / aspectRatio;
            totalWidth = imageSectionWidth + infoWidth;
        }
        
        console.log(`🔧 Height-adjusted: ${imageDisplayWidth.toFixed(0)}×${imageDisplayHeight.toFixed(0)}`);
    }
    
    // 🎯 Step 7: 最終優化 - 確保比例合理
    const imagePercentage = (imageSectionWidth / totalWidth * 100).toFixed(1);
    const infoPercentage = (infoWidth / totalWidth * 100).toFixed(1);
    
    console.log(`✅ Final layout:`);
    console.log(`   Image: ${imageDisplayWidth.toFixed(0)}×${imageDisplayHeight.toFixed(0)}px`);
    console.log(`   Image Section: ${imageSectionWidth.toFixed(0)}px (${imagePercentage}%, 含5% margin)`);
    console.log(`   Info Section: ${infoWidth.toFixed(0)}px (${infoPercentage}%)`);
    console.log(`   Total Container: ${totalWidth.toFixed(0)}px`);
    
    return {
        containerWidth: `${totalWidth}px`,           // 總寬度
        imageWidth: `${imageSectionWidth}px`,        // Image section 寬度
        infoWidth: `${infoWidth}px`                  // Info section 寬度
    };
}

/**
 * 檢查並應用布局 - 修復版本
 */
function applySmartLayout(layout) {
    const lightboxContent = document.querySelector('.lightbox-content');
    if (!lightboxContent) {
        console.error('❌ Lightbox content not found');
        return;
    }
    
    console.log(`🎯 Applying layout: ${layout.containerWidth}`);
    
    // 🎯 關鍵修復：直接設置 lightbox-content 的寬度
    lightboxContent.style.width = layout.containerWidth;
    
    // 🎯 同時設置 CSS 變量供其他元素使用
    lightboxContent.style.setProperty('--container-width', layout.containerWidth);
    lightboxContent.style.setProperty('--image-width', layout.imageWidth);
    lightboxContent.style.setProperty('--info-width', layout.infoWidth);
    
    console.log(`✅ Layout applied successfully`);
    console.log(`   Container width: ${layout.containerWidth}`);
    console.log(`   Image section: ${layout.imageWidth}`);
    console.log(`   Info section: ${layout.infoWidth}`);
}

// ================================
// 手機板檢測和特殊處理
// ================================

function isMobileDevice() {
    return window.innerWidth <= 768;
}

function initializeMobileLightbox() {
    if (!isMobileDevice()) return;
    
    console.log('📱 Mobile device detected - applying mobile optimizations');
    
    const image = document.getElementById('lightboxImage');
    if (!image) return;
    
    // 重置所有縮放變數
    zoomLevel = 1;
    panX = 0;
    panY = 0;
    isDragging = false;
    hasDragged = false;
    
    // 設置圖片樣式
    image.style.transform = 'none';
    image.style.cursor = 'pointer';
    
    // 添加點擊放大功能
    image.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        openFullscreenImage();
    });
    
    // 添加滑動手勢支援
    addMobileSwipeGestures();
}

// 手機板全螢幕查看原圖
function openFullscreenImage() {
    const image = document.getElementById('lightboxImage');
    if (!image || !isMobileDevice()) return;
    
    console.log('📱 Opening fullscreen image view');
    
    // 創建全螢幕圖片容器
    const fullscreenContainer = document.createElement('div');
    fullscreenContainer.className = 'mobile-fullscreen-image';
    fullscreenContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0,0,0,0.95);
        z-index: 10010;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.3s ease;
    `;
    
    // 創建全螢幕圖片
    const fullscreenImage = document.createElement('img');
    fullscreenImage.src = image.src;
    fullscreenImage.alt = image.alt;
    fullscreenImage.style.cssText = `
        max-width: 95vw;
        max-height: 95vh;
        width: auto;
        height: auto;
        object-fit: contain;
        border-radius: 4px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    `;
    
    // 創建關閉按鈕
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '×';
    closeButton.style.cssText = `
        position: absolute;
        top: 1rem;
        right: 1rem;
        width: 44px;
        height: 44px;
        border: none;
        border-radius: 50%;
        background: rgba(0,0,0,0.8);
        color: white;
        font-size: 24px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(10px);
        border: 2px solid rgba(255,255,255,0.2);
    `;
    
    // 關閉功能
    const closeFullscreen = () => {
        fullscreenContainer.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(fullscreenContainer);
        }, 300);
    };
    
    closeButton.addEventListener('click', closeFullscreen);
    
    // 點擊背景關閉
    fullscreenContainer.addEventListener('click', function(e) {
        if (e.target === fullscreenContainer) {
            closeFullscreen();
        }
    });
    
    // 組裝元素
    fullscreenContainer.appendChild(fullscreenImage);
    fullscreenContainer.appendChild(closeButton);
    document.body.appendChild(fullscreenContainer);
    
    // 淡入動畫
    setTimeout(() => {
        fullscreenContainer.style.opacity = '1';
    }, 10);
    
    // 添加簡單的縮放手勢（雙指縮放）
    let scale = 1;
    let lastDistance = 0;
    
    fullscreenImage.addEventListener('touchstart', function(e) {
        if (e.touches.length === 2) {
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            lastDistance = Math.hypot(
                touch2.clientX - touch1.clientX,
                touch2.clientY - touch1.clientY
            );
        }
    }, { passive: true });
    
    fullscreenImage.addEventListener('touchmove', function(e) {
        if (e.touches.length === 2) {
            e.preventDefault();
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            const distance = Math.hypot(
                touch2.clientX - touch1.clientX,
                touch2.clientY - touch1.clientY
            );
            
            if (lastDistance > 0) {
                const scaleChange = distance / lastDistance;
                scale = Math.max(0.5, Math.min(3, scale * scaleChange));
                fullscreenImage.style.transform = `scale(${scale})`;
            }
            
            lastDistance = distance;
        }
    }, { passive: false });
    
    // 雙擊重置縮放
    fullscreenImage.addEventListener('dblclick', function() {
        scale = scale > 1 ? 1 : 2;
        fullscreenImage.style.transform = `scale(${scale})`;
        fullscreenImage.style.transition = 'transform 0.3s ease';
        
        setTimeout(() => {
            fullscreenImage.style.transition = '';
        }, 300);
    });
}

function addMobileSwipeGestures() {
    const lightboxContent = document.querySelector('.lightbox-content');
    if (!lightboxContent || !isMobileDevice()) return;
    
    let startY = 0;
    let currentY = 0;
    let isDragging = false;
    
    lightboxContent.addEventListener('touchstart', function(e) {
        if (e.touches.length === 1) {
            startY = e.touches[0].clientY;
            isDragging = true;
        }
    }, { passive: true });
    
    lightboxContent.addEventListener('touchmove', function(e) {
        if (!isDragging || e.touches.length !== 1) return;
        
        currentY = e.touches[0].clientY;
        const deltaY = currentY - startY;
        
        // 向下滑動超過100px時準備關閉
        if (deltaY > 100) {
            lightboxContent.style.transform = `translateY(${deltaY * 0.3}px)`;
            lightboxContent.style.opacity = Math.max(0.3, 1 - deltaY / 300);
        }
    }, { passive: true });
    
    lightboxContent.addEventListener('touchend', function(e) {
        if (!isDragging) return;
        isDragging = false;
        
        const deltaY = currentY - startY;
        
        if (deltaY > 150) {
            // 向下滑動足夠距離，關閉 lightbox
            window.closeLightbox();
        } else {
            // 回彈
            lightboxContent.style.transform = '';
            lightboxContent.style.opacity = '';
        }
    }, { passive: true });
}
function showCleanZoomIndicator() {
    const existingIndicator = document.querySelector('.zoom-indicator');
    if (existingIndicator) {
        existingIndicator.remove();
    }
    
    const indicator = document.createElement('div');
    indicator.className = 'zoom-indicator';
    
    const zoomProgress = (zoomLevel - minZoom) / (maxZoom - minZoom);
    
    indicator.innerHTML = `
        <div style="width: 120px; height: 6px; background: rgba(255,255,255,0.3); border-radius: 3px; overflow: hidden;">
            <div style="width: ${zoomProgress * 100}%; height: 100%; background: white; border-radius: 3px; transition: width 0.3s ease;"></div>
        </div>
    `;
    
    const lightbox = document.querySelector('.lightbox-container');
    if (lightbox) {
        lightbox.appendChild(indicator);
        
        setTimeout(() => {
            indicator.style.opacity = '0';
            setTimeout(() => indicator.remove(), 300);
        }, 1500);
    }
}

// ================================
// BILINGUAL HELPER FUNCTIONS
// ================================

// Get language-aware placeholder image
function getPlaceholderImage() {
    if (typeof portfolio !== 'undefined' && portfolio.currentLanguage) {
        return `./images/placeholder/artwork-placeholder-${portfolio.currentLanguage}.svg`;
    }
    // Fallback to generic placeholder
    return './images/placeholder/artwork-placeholder.svg';
}

// Get localized text with fallback
function getLocalizedText(key, params = {}) {
    if (typeof portfolio !== 'undefined' && typeof portfolio.t === 'function') {
        return portfolio.t(key, params);
    }
    // Fallback for cases where portfolio isn't ready
    return key;
}

// Update lightbox UI text elements
function updateLightboxUIText() {
    console.log('🔄 Updating lightbox UI text...');
    console.log('Portfolio available:', typeof portfolio !== 'undefined');
    console.log('LANGUAGE_DATA available:', typeof LANGUAGE_DATA !== 'undefined');
    
    if (typeof portfolio !== 'undefined') {
        console.log('Current language:', portfolio.currentLanguage);
    }
    
    // Update navigation tooltips
    const prevBtn = document.querySelector('.nav-arrow.prev');
    if (prevBtn) {
        const prevText = getLocalizedText('lightbox.prevTitle');
        console.log('Prev title:', prevText);
        prevBtn.title = prevText;
    }
    
    const nextBtn = document.querySelector('.nav-arrow.next');
    if (nextBtn) {
        const nextText = getLocalizedText('lightbox.nextTitle');
        console.log('Next title:', nextText);
        nextBtn.title = nextText;
    }
    
    // Update control button tooltips
    const shareBtn = document.querySelector('.control-btn[onclick="shareArtwork()"]');
    if (shareBtn) shareBtn.title = getLocalizedText('lightbox.shareTitle');
    
    const closeBtn = document.querySelector('.control-btn[onclick="closeLightbox()"]');
    if (closeBtn) closeBtn.title = getLocalizedText('lightbox.closeTitle');
    

    // Update spec labels
    const specLabels = document.querySelectorAll('.spec-label');
    const labelKeys = ['lightbox.yearLabel', 'lightbox.dimensionsLabel', 'lightbox.formatLabel'];
    specLabels.forEach((label, index) => {
        if (labelKeys[index]) {
            label.textContent = getLocalizedText(labelKeys[index]);
        }
    });
    
    // Update zoom control tooltips if they exist
    const zoomInBtn = document.querySelector('.zoom-in-btn');
    if (zoomInBtn) {
        const zoomInText = getLocalizedText('lightbox.zoomInTitle');
        console.log('Zoom in text:', zoomInText);
        zoomInBtn.title = zoomInText;
    }
    
    const zoomOutBtn = document.querySelector('.zoom-out-btn');
    if (zoomOutBtn) {
        const zoomOutText = getLocalizedText('lightbox.zoomOutTitle');
        console.log('Zoom out text:', zoomOutText);
        zoomOutBtn.title = zoomOutText;
    }
    
    const fullscreenBtn = document.querySelector('.zoom-fullscreen-btn');
    if (fullscreenBtn) {
        const fullscreenText = getLocalizedText('lightbox.toggleFullscreenTitle');
        console.log('Fullscreen text:', fullscreenText);
        fullscreenBtn.title = fullscreenText;
    }
}

// ================================
// GLOBAL FUNCTIONS
// ================================

window.openLightbox = function(artworkId, context = 'all') {
    console.log('🎨 Opening lightbox for:', artworkId, 'Context:', context);
    
    if (typeof portfolio === 'undefined') {
        console.error('Portfolio not loaded');
        return;
    }
    
    const artwork = portfolio.getArtwork(artworkId);
    if (!artwork) {
        console.error('Artwork not found:', artworkId);
        return;
    }

    // Set artworks data based on context
    if (context === 'featured') {
        artworksData = portfolio.getFeaturedArtworks();
        console.log('📌 Using featured artworks only:', artworksData.length);
    } else if (context === 'gallery') {
        // 🎯 關鍵修復：使用當前藝廊顯示的順序
        artworksData = portfolio.getCurrentGalleryArtworks();
        console.log('🎨 Using current gallery order:', artworksData.length);
    } else {
        artworksData = portfolio.artworks;
        console.log('📋 Using all artworks:', artworksData.length);
    }
    
    // Find the current artwork index in the appropriate array
    currentArtworkIndex = artworksData.findIndex(a => a.id === artworkId);
    
    if (currentArtworkIndex === -1) {
        console.warn('Artwork not found in current context, falling back to all artworks');
        artworksData = portfolio.artworks;
        currentArtworkIndex = portfolio.artworks.findIndex(a => a.id === artworkId);
    }
    
    populateLightbox(artwork);
    
    const lightbox = document.getElementById('lightbox');
    if (lightbox) {
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
        console.log('✅ Lightbox opened');

        setTimeout(() => document.dispatchEvent(new CustomEvent('lightboxOpened', { detail: { artwork } })), 100);
    }
};

window.closeLightbox = function() {
    console.log('🚪 Closing lightbox');

    // 🆕 記住當前查看的作品 ID（用於回到位置）
    let currentArtworkId = null;
    if (artworksData && artworksData[currentArtworkIndex]) {
        currentArtworkId = artworksData[currentArtworkIndex].id;
    }
    
    if (isFullscreenMode) {
        exitImageFullscreen();
    }
    
    const lightbox = document.getElementById('lightbox');
    if (lightbox) {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
        
        // Reset zoom/pan directly
        if (isFullscreenMode) {
            exitImageFullscreen();
        }
        
        zoomLevel = 1;
        panX = 0;
        panY = 0;
        isDragging = false;
        hasDragged = false;
        
        if (currentImage) {
            applyTransform();
            updateCursor();
        }
        
        const existingControls = document.querySelector('.zoom-controls');
        if (existingControls) {
            existingControls.remove();
        }
    }
    cleanupViews();

    // 🆕 關鍵功能：關閉 lightbox 後滾動回到剛才查看的作品
    if (currentArtworkId && typeof portfolio !== 'undefined') {
        setTimeout(() => {
            portfolio.scrollToArtwork(currentArtworkId);
        }, 300);
    }
};

window.navigateArtwork = function(direction) {
    if (!artworksData.length) return;
    
    if (direction === 'prev') {
        currentArtworkIndex = currentArtworkIndex > 0 ? currentArtworkIndex - 1 : artworksData.length - 1;
    } else {
        currentArtworkIndex = currentArtworkIndex < artworksData.length - 1 ? currentArtworkIndex + 1 : 0;
    }
    
    populateLightbox(artworksData[currentArtworkIndex]);
};

// Modified zoomIn function - first click enters fullscreen, subsequent clicks zoom

window.zoomIn = function() {
    console.log('🔍 Button zoom in');
    
    // If not in fullscreen mode and zoom is at 1, just enter fullscreen without zooming
    if (!isFullscreenMode && zoomLevel === 1) {
        console.log('📱 First zoom click - entering fullscreen at 1x');
        enterImageFullscreen();
        showFullscreenIndicator(true);
        return; // Exit without changing zoom level
    }
    
    // If already in fullscreen or zoom > 1, proceed with normal zoom
    const oldZoom = zoomLevel;
    zoomLevel = Math.min(zoomLevel + 0.5, maxZoom);
    
    if (oldZoom !== zoomLevel) {
        updateCursor();
        applyTransform();
        showCleanZoomIndicator();
    }
};


// Modified zoomOut function - don't exit fullscreen immediately at 1x
window.zoomOut = function() {
    console.log('🔍 Button zoom out');
    const oldZoom = zoomLevel;
    
    // If we're at 1x zoom and in fullscreen, exit fullscreen instead of trying to zoom out further
    if (zoomLevel <= 1 && isFullscreenMode) {
        console.log('📱 At 1x zoom in fullscreen - exiting fullscreen');
        exitImageFullscreen();
        return;
    }
    
    // Normal zoom-out behavior
    zoomLevel = Math.max(zoomLevel - 0.5, minZoom);
    
    if (zoomLevel === minZoom) {
        panX = 0;
        panY = 0;
    }
    
    if (oldZoom !== zoomLevel) {
        constrainPan();
        updateCursor();
        applyTransform();
        showCleanZoomIndicator();
    }
};

window.resetZoomPan = function() {
    if (isFullscreenMode) {
        exitImageFullscreen();
    }
    
    zoomLevel = 1;
    panX = 0;
    panY = 0;
    isDragging = false;
    hasDragged = false;
    
    if (currentImage) {
        applyTransform();
        updateCursor();
    }
};

// Modified toggleImageZoom function to work with new behavior
window.toggleImageZoom = function() {
    if (!isFullscreenMode && zoomLevel === 1) {
        // First action: enter fullscreen at 1x
        window.zoomIn();
    } else if (zoomLevel === 1) {
        // If in fullscreen at 1x, zoom to 2x
        zoomLevel = 2;
        constrainPan();
        applyTransform();
        updateCursor();
        showCleanZoomIndicator();
    } else {
        // If zoomed, reset to 1x and exit fullscreen
        window.resetZoomPan();
        applyTransform();
        showCleanZoomIndicator();
    }
};

window.downloadImage = function() {
    console.log('Download disabled - intellectual property protection');
};

function addImageProtection() {
    const image = document.getElementById('lightboxImage');
    if (!image) return;
    
    // Prevent right-click context menu
    image.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('🚫 Right-click disabled for image protection');
        return false;
    });
    
    // Prevent drag and drop
    image.addEventListener('dragstart', function(e) {
        e.preventDefault();
        return false;
    });
    
    // Additional protection attributes
    image.setAttribute('draggable', 'false');
    image.style.userSelect = 'none';
    image.style.webkitUserSelect = 'none';
    image.style.mozUserSelect = 'none';
    image.style.msUserSelect = 'none';
    
    console.log('🛡️ Image protection enabled');
}


// Modified share function to create useful shareable text snippet - BILINGUAL VERSION
window.shareArtwork = function() {
    const titleEl = document.getElementById('artworkTitle');
    const yearEl = document.getElementById('artworkYear');
    
    if (!titleEl) {
        console.error('Artwork title not found');
        return;
    }
    
    // Get current artwork data
    const currentArtwork = artworksData[currentArtworkIndex];
    if (!currentArtwork) {
        console.error('Current artwork data not found');
        return;
    }
    
    // Create direct link to this specific artwork
    const baseUrl = window.location.origin + window.location.pathname;
    const artworkUrl = `${baseUrl}?artwork=${currentArtwork.id}`;
    
    // Get artist name from language data - BILINGUAL AWARE
    const artistName = getLocalizedText('header.title');
    
    // Create shareable text snippet
    const artworkTitle = titleEl.textContent || 'Untitled';
    const artworkYear = yearEl ? yearEl.textContent : '';
    const yearText = artworkYear ? ` (${artworkYear})` : '';
    
    const shareText = `Check out this artwork: "${artworkTitle}"${yearText} by ${artistName}\n\n${artworkUrl}`;
    
    // Try different sharing methods
    if (navigator.share) {
        // Mobile native sharing
        navigator.share({
            title: `${artworkTitle} by ${artistName}`,
            text: shareText,
            url: artworkUrl
        }).catch(err => {
            console.log('Native share failed, falling back to clipboard');
            copyToClipboard(shareText);
        });
    } else {
        // Desktop - copy to clipboard
        copyToClipboard(shareText);
    }
};

// Helper function to copy text to clipboard with user feedback
function copyToClipboard(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            showShareFeedback('Shareable link copied to clipboard!');
        }).catch(err => {
            console.error('Clipboard write failed:', err);
            showShareFeedback('Unable to copy to clipboard');
        });
    } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            showShareFeedback('Shareable link copied to clipboard!');
        } catch (err) {
            showShareFeedback('Unable to copy to clipboard');
        }
        document.body.removeChild(textArea);
    }
}

// Show user feedback for share action
function showShareFeedback(message) {
    // Remove existing feedback
    const existingFeedback = document.querySelector('.share-feedback');
    if (existingFeedback) {
        existingFeedback.remove();
    }
    
    // Create feedback element
    const feedback = document.createElement('div');
    feedback.className = 'share-feedback';
    feedback.textContent = message;
    feedback.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-size: 14px;
        z-index: 10020;
        opacity: 0;
        transition: opacity 0.3s ease;
    `;
    
    document.body.appendChild(feedback);
    
    // Fade in
    setTimeout(() => {
        feedback.style.opacity = '1';
    }, 10);
    
    // Fade out and remove
    setTimeout(() => {
        feedback.style.opacity = '0';
        setTimeout(() => {
            if (feedback.parentNode) {
                feedback.parentNode.removeChild(feedback);
            }
        }, 300);
    }, 2000);
}

window.showZoomIndicator = function() {
    showCleanZoomIndicator();
};

window.toggleFullscreenZoom = function() {
    if (isFullscreenMode) {
        exitImageFullscreen();
    } else {
        enterImageFullscreen();
    }
};

console.log('✅ Global functions defined');

// ================================
// INTERNAL FUNCTIONS
// ================================

function populateLightbox(artwork) {
    console.log('Raw artwork data:', JSON.stringify(artwork, null, 2));

    const image = document.getElementById('lightboxImage');
    if (!image) {
        console.error('Lightbox image element not found');
        return;
    }
    
    // Reset zoom/pan directly
    if (isFullscreenMode) {
        exitImageFullscreen();
    }
    
    zoomLevel = 1;
    panX = 0;
    panY = 0;
    isDragging = false;
    hasDragged = false;
    
    image.classList.add('loading');
    
    // BILINGUAL UPDATE: Use language-aware placeholder
    const placeholderImage = getPlaceholderImage();
    image.src = artwork.imageHigh || artwork.image || placeholderImage;
    
    image.onload = function() {
        image.classList.remove('loading');
        setTimeout(() => {
            // Add image protection first
            addImageProtection();

            // 🎯 手機板特殊處理
            if (isMobileDevice()) {
                initializeMobileLightbox();
            } else {
                initializeImageZoom();
                addZoomControls();
            }
            addViewIndicators();
        }, 100);
    };

    image.onerror = function() {
        // BILINGUAL UPDATE: Use language-aware placeholder on error
        image.src = placeholderImage;
        image.classList.remove('loading');
        addImageProtection();
    };

    // BILINGUAL UPDATE: Language-aware field selection
    const currentLang = (typeof portfolio !== 'undefined') ? portfolio.currentLanguage : 'zh';
    
    // Get language-appropriate fields
    let title, titleEn, description, format, size;

    if (currentLang === 'zh') {
        console.log('In Chinese branch');
        title = artwork.title || artwork.titleEn || 'Untitled';
        console.log('title after assignment:', title);
        
        titleEn = artwork.titleEn || '';
        description = artwork.description || artwork.descriptionEn || '';
        console.log('description after assignment:', description);
        
        format = artwork.format || artwork.formatEn || '';
        size = artwork.heightCm && artwork.widthCm ? 
            `${artwork.heightCm} x ${artwork.widthCm} cm` : 
            artwork.sizeCm || 'Size not specified';
    } else {
        console.log('In English branch');
        title = artwork.titleEn || artwork.title || 'Untitled';
        titleEn = '';
        description = artwork.descriptionEn || artwork.description || '';
        format = artwork.formatEn || artwork.format || '';
        if (artwork.heightCm && artwork.widthCm && artwork.heightInches && artwork.widthInches) {
            size = `${artwork.heightCm} x ${artwork.widthCm} cm (${artwork.heightInches}" x ${artwork.widthInches}")`;
        } else if (artwork.sizeCm && artwork.sizeInches) {
            size = `${artwork.sizeCm} (${artwork.sizeInches})`;
        } else if (artwork.heightCm && artwork.widthCm) {
            size = `${artwork.heightCm} x ${artwork.widthCm} cm`;
        } else {
            size = artwork.sizeCm || artwork.sizeInches || 'Size not specified';
        }
    }


    // Set artwork details with language-appropriate content
    const elements = {
        'artworkTitle': title,
        'artworkTitleEn': titleEn,
        'artworkDescription': description,
        'artworkYear': artwork.year || 'Unknown',
        'artworkSize': size,
        'artworkFormat': format
    };

    Object.entries(elements).forEach(([id, text]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    });

    // Update availability status with localized text
    const statusEl = document.getElementById('availabilityStatus');
    if (statusEl && portfolio) {
        const isAvailable = portfolio.getBooleanValue(artwork, 'available', true);
        statusEl.textContent = isAvailable ? 
            getLocalizedText('lightbox.availableStatus') : 
            getLocalizedText('lightbox.soldStatus');
        statusEl.className = `availability-status ${isAvailable ? 'available' : 'sold'}`;
    }

    // Handle tags
    const tagsEl = document.getElementById('artworkTags');
    if (tagsEl) {
        if (artwork.tags && artwork.tags.length > 0) {
            tagsEl.innerHTML = artwork.tags.map(tag => `<span class="tag">#${tag}</span>`).join('');
        } else {
            tagsEl.innerHTML = '';
        }
    }
    
    // 🆕 讓可購買狀態變成可點擊
    addClickableAvailabilityStatus(artwork);
    
    // BILINGUAL UPDATE: Update all UI text elements
    updateLightboxUIText();

    // ✨ 桌面版才應用動態布局，手機版使用固定布局
    if (!isMobileDevice()) {
        console.log('🎨 Calculating optimal layout for artwork...');
        
        // 嘗試從多個可能的尺寸欄位獲取數據
        const sizeData = artwork.sizeCm || artwork.sizeInches || artwork.size || artwork.dimensions;
        const optimalLayout = calculateSmartLightboxLayout(sizeData);
        applySmartLayout(optimalLayout);
        
        console.log(`✅ Artwork "${artwork.title}" layout optimized`);
    } else {
        console.log('📱 Mobile layout - using fixed responsive design');
    }

    // 設置多視圖功能
    setupArtworkViews(artwork);
}

function initializeImageZoom() {
    console.log('🔧 INITIALIZING IMAGE ZOOM');
    
    const image = document.getElementById('lightboxImage');
    if (!image) {
        console.error('❌ NO IMAGE FOUND');
        return;
    }

    console.log('✅ Image found:', image);
    currentImage = image;
    
    // Reset zoom/pan directly
    if (isFullscreenMode) {
        exitImageFullscreen();
    }
    
    zoomLevel = 1;
    panX = 0;
    panY = 0;
    isDragging = false;
    hasDragged = false;

    // Remove ALL existing listeners by cloning
    const newImage = image.cloneNode(true);
    image.parentNode.replaceChild(newImage, image);
    currentImage = newImage;
    
    console.log('🔄 Image cloned, adding listeners...');

    // Add wheel listener
    currentImage.addEventListener('wheel', function(e) {
        console.log('🖱️ WHEEL LISTENER TRIGGERED');
        handleWheelZoom(e);
    }, { passive: false });
    
    console.log('✅ Wheel listener added');
    
    // Add other listeners
    currentImage.addEventListener('mousedown', handleMouseDown);
    currentImage.addEventListener('mousemove', handleMouseMove);
    currentImage.addEventListener('mouseup', handleMouseUp);
    currentImage.addEventListener('mouseleave', handleMouseUp);
    currentImage.addEventListener('click', handleImageClick);
    currentImage.addEventListener('dblclick', handleDoubleClick);
    
    updateCursor();
    console.log('🎯 All event listeners added');
}

// Modified handleWheelZoom function - fullscreen first, then zoom
function handleWheelZoom(e) {
    e.preventDefault();
    e.stopPropagation();
    
    if (isZoomBlocked) {
        return;
    }
    
    isZoomBlocked = true;
    console.log('✅ ZOOM ACCEPTED - IMMEDIATE RESPONSE');
    
    // Handle zoom-in (scroll up)
    if (e.deltaY < 0) {
        console.log('📈 WHEEL ZOOMING IN');
        
        // If not in fullscreen and at 1x zoom, enter fullscreen first without zooming
        if (!isFullscreenMode && zoomLevel === 1) {
            console.log('📱 First wheel zoom - entering fullscreen at 1x');
            enterImageFullscreen();
            showFullscreenIndicator(true);
        } else {
            // Normal zoom behavior
            const step = 0.3;
            const oldZoom = zoomLevel;
            zoomLevel = Math.min(zoomLevel + step, maxZoom);
            zoomLevel = Math.round(zoomLevel * 100) / 100;
            
            if (oldZoom !== zoomLevel) {
                updateCursor();
                applyTransform();
                showCleanZoomIndicator();
            }
        }
    } else {
        // Handle zoom-out (scroll down)
        console.log('📉 WHEEL ZOOMING OUT');
        const step = 0.3;
        const oldZoom = zoomLevel;
        zoomLevel = Math.max(zoomLevel - step, minZoom);
        
        if (zoomLevel <= minZoom) {
            panX = 0;
            panY = 0;
        }
        
        zoomLevel = Math.round(zoomLevel * 100) / 100;
        
        if (oldZoom !== zoomLevel) {
            if (zoomLevel <= 1 && isFullscreenMode) {
                exitImageFullscreen();
            }
            
            constrainPan();
            updateCursor();
            applyTransform();
            showCleanZoomIndicator();
        }
    }
    
    clearTimeout(zoomBlockTimeout);
    zoomBlockTimeout = setTimeout(() => {
        isZoomBlocked = false;
        console.log('🔓 Ready for next zoom');
    }, BLOCK_DURATION);
}


function resetZoomPan() {
    if (isFullscreenMode) {
        exitImageFullscreen();
    }
    
    zoomLevel = 1;
    panX = 0;
    panY = 0;
    isDragging = false;
    hasDragged = false;
    
    if (currentImage) {
        applyTransform();
        updateCursor();
    }
}

function applyTransform() {
    if (!currentImage) return;
    currentImage.style.transform = `scale(${zoomLevel}) translate(${panX}px, ${panY}px)`;
    currentImage.style.transformOrigin = 'center center';
}

function updateCursor() {
    if (!currentImage) return;
    
    // Allow grab cursor if zoomed > 1 OR if in fullscreen mode (even at 1x)
    if (zoomLevel > 1 || isFullscreenMode) {
        currentImage.style.cursor = isDragging ? 'grabbing' : 'grab';
    } else if (zoomLevel < maxZoom) {
        currentImage.style.cursor = 'zoom-in';
    } else {
        currentImage.style.cursor = 'zoom-out';
    }
}

function constrainPan() {
    // If not zoomed and not in fullscreen, reset pan
    if (zoomLevel <= 1 && !isFullscreenMode) {
        panX = 0;
        panY = 0;
        return;
    }
    
    // In fullscreen at 1x, allow panning if image is larger than container
    if (isFullscreenMode && zoomLevel === 1) {
        const imageRect = currentImage.getBoundingClientRect();
        const containerRect = currentImage.parentElement.getBoundingClientRect();
        
        const overflowX = Math.max(0, (imageRect.width - containerRect.width) / 2);
        const overflowY = Math.max(0, (imageRect.height - containerRect.height) / 2);
        
        panX = Math.max(-overflowX, Math.min(overflowX, panX));
        panY = Math.max(-overflowY, Math.min(overflowY, panY));
        return;
    }
    
    // Normal zoom constraint calculation
    const maxPanX = (currentImage.offsetWidth * (zoomLevel - 1)) / (2 * zoomLevel);
    const maxPanY = (currentImage.offsetHeight * (zoomLevel - 1)) / (2 * zoomLevel);
    
    panX = Math.max(-maxPanX, Math.min(maxPanX, panX));
    panY = Math.max(-maxPanY, Math.min(maxPanY, panY));
}

function handleImageClick(e) {
    if (hasDragged) {
        hasDragged = false;
        return;
    }
    window.toggleImageZoom();
}

function handleDoubleClick(e) {
    e.preventDefault();
    e.stopPropagation();
    
    if (zoomLevel === 1) {
        zoomLevel = 2;
        constrainPan();
    } else {
        resetZoomPan();
    }
    
    applyTransform();
    updateCursor();
    showCleanZoomIndicator();
}

function handleMouseDown(e) {
    if (zoomLevel <= 1 && !isFullscreenMode) return;

    
    isDragging = true;
    hasDragged = false;
    startX = e.clientX - panX;
    startY = e.clientY - panY;
    updateCursor();
    e.preventDefault();
}

function handleMouseMove(e) {
    if (!isDragging || (zoomLevel <= 1 && !isFullscreenMode)) return;
    
    const newPanX = e.clientX - startX;
    const newPanY = e.clientY - startY;
    
    const dragDistance = Math.hypot(newPanX - panX, newPanY - panY);
    if (dragDistance > 3) {
        hasDragged = true;
    }
    
    panX = newPanX;
    panY = newPanY;
    constrainPan();
    applyTransform();
}

function handleMouseUp(e) {
    if (isDragging) {
        isDragging = false;
        updateCursor();
    }
}

function enterImageFullscreen() {
    if (isFullscreenMode) return;
    
    isFullscreenMode = true;
    const lightboxContent = document.querySelector('.lightbox-content');
    const imageSection = document.querySelector('.lightbox-image-section');
    
    if (!lightboxContent || !imageSection) return;
    
    originalLightboxContent = {
        contentClass: lightboxContent.className,
        imageSectionClass: imageSection.className
    };
    
    lightboxContent.classList.add('fullscreen-mode');
    imageSection.classList.add('fullscreen-image');
    
    showFullscreenIndicator(true);
    updateCursor(); // ADD THIS LINE

}

function exitImageFullscreen() {
    if (!isFullscreenMode) return;
    
    isFullscreenMode = false;
    const lightboxContent = document.querySelector('.lightbox-content');
    const imageSection = document.querySelector('.lightbox-image-section');
    
    if (lightboxContent && originalLightboxContent) {
        lightboxContent.className = originalLightboxContent.contentClass;
    }
    
    if (imageSection && originalLightboxContent) {
        imageSection.className = originalLightboxContent.imageSectionClass;
    }
    
    showFullscreenIndicator(false);
    updateCursor(); // ADD THIS LINE

}

function showFullscreenIndicator(entering) {
    const existingIndicator = document.querySelector('.fullscreen-indicator');
    if (existingIndicator) {
        existingIndicator.remove();
    }
    
    const indicator = document.createElement('div');
    indicator.className = 'fullscreen-indicator';
    
    // Get current language
    let currentLang = 'zh';
    if (typeof portfolio !== 'undefined' && portfolio.currentLanguage) {
        currentLang = portfolio.currentLanguage;
    }
    
    // HARDCODED translations to bypass the translation system issue
    const translations = {
        zh: {
            fullscreenView: "全螢幕檢視",
            splitView: "分割檢視"
        },
        en: {
            fullscreenView: "Fullscreen View",
            splitView: "Split View"
        }
    };
    
    const t = translations[currentLang] || translations.zh;
    
    if (entering) {
        indicator.innerHTML = `📱 <span>${t.fullscreenView}</span>`;
    } else {
        indicator.innerHTML = `🖼️ <span>${t.splitView}</span>`;
    }
    
    const lightbox = document.querySelector('.lightbox-container');
    if (lightbox) {
        lightbox.appendChild(indicator);
        
        setTimeout(() => {
            indicator.style.opacity = '0';
            setTimeout(() => indicator.remove(), 300);
        }, 2000);
    }
    
    console.log('✅ Fullscreen indicator shown:', entering ? t.fullscreenView : t.splitView);
}

function addZoomControls() {
    // 🎯 手機板不添加縮放控制
    if (isMobileDevice()) {
        console.log('📱 Mobile device - skipping zoom controls');
        return;
    }
    
    const existingControls = document.querySelector('.zoom-controls');
    if (existingControls) {
        existingControls.remove();
    }
    
    const lightboxControls = document.querySelector('.lightbox-controls');
    if (!lightboxControls) return;
    
    const zoomControls = document.createElement('div');
    zoomControls.className = 'zoom-controls';
    
    // Get current language
    let currentLang = 'zh';
    if (typeof portfolio !== 'undefined' && portfolio.currentLanguage) {
        currentLang = portfolio.currentLanguage;
    }
    
    // HARDCODED translations to bypass the translation system issue
    const translations = {
        zh: {
            zoomIn: "放大 (+)",
            zoomOut: "縮小 (-)",
            fullscreen: "切換全螢幕"
        },
        en: {
            zoomIn: "Zoom In (+)",
            zoomOut: "Zoom Out (-)",
            fullscreen: "Toggle Fullscreen"
        }
    };
    
    const t = translations[currentLang] || translations.zh;
    
    zoomControls.innerHTML = `
        <button class="control-btn zoom-in-btn" onclick="zoomIn();" title="${t.zoomIn}">+</button>
        <button class="control-btn zoom-out-btn" onclick="zoomOut();" title="${t.zoomOut}">−</button>
        <button class="control-btn zoom-fullscreen-btn" onclick="toggleFullscreenZoom();" title="${t.fullscreen}">⛶</button>
    `;
    
    lightboxControls.insertBefore(zoomControls, lightboxControls.firstChild);
    
    console.log('✅ Zoom controls created with language:', currentLang);
    console.log('✅ Tooltips:', t);
}

// ================================
// BILINGUAL UPDATE: Global function to refresh lightbox language
// ================================
window.updateLightboxLanguage = function() {
    // Update UI text if lightbox is open
    const lightbox = document.getElementById('lightbox');
    if (lightbox && lightbox.classList.contains('active')) {
        updateLightboxUIText();
        
        // Re-populate the current artwork with new language
        if (artworksData[currentArtworkIndex]) {
            populateLightbox(artworksData[currentArtworkIndex]);
        }
    }
};

// ================================
// EVENT LISTENERS
// ================================

document.addEventListener('DOMContentLoaded', function() {
    function initializeLightbox() {
        if (typeof portfolio === 'undefined') {
            setTimeout(initializeLightbox, 100);
            return;
        }
        console.log('✅ Lightbox initialized with portfolio');
        setupLightboxEventListeners();
    }
    initializeLightbox();
});

function setupLightboxEventListeners() {
    const lightbox = document.getElementById('lightbox');
    if (lightbox) {
        lightbox.addEventListener('click', function(e) {
            if (e.target === this) {
                window.closeLightbox();
            }
        });
    }

    document.addEventListener('keydown', function(e) {
        const lightbox = document.getElementById('lightbox');
        if (!lightbox || !lightbox.classList.contains('active')) return;

        switch(e.key) {
            case 'Escape':
                if (isFullscreenMode) {
                    exitImageFullscreen();
                } else {
                    window.closeLightbox();
                }
                break;
            case 'ArrowLeft':
                window.navigateArtwork('prev');
                break;
            case 'ArrowRight':
                window.navigateArtwork('next');
                break;
            case '+':
            case '=':
                e.preventDefault();
                window.zoomIn();
                break;
            case '-':
                e.preventDefault();
                window.zoomOut();
                break;
            case '0':
                e.preventDefault();
                window.resetZoomPan();
                applyTransform();
                showCleanZoomIndicator();
                break;
        }
    });
}

// ================================
// MULTI-VIEW SYSTEM
// ================================

// 設置作品的多個視圖
function setupArtworkViews(artwork) {
    currentArtworkViews = [];
    
    // 如果有 productViews，使用新系統
    if (artwork.productViews && artwork.productViews.length > 0) {
        currentArtworkViews = artwork.productViews.map(view => ({
            src: view.image,
            alt: getArtworkText(artwork, 'title') + ' - ' + view.title,
            type: view.type,
            title: view.title,
            icon: view.icon,
            description: view.description
        }));
    } else {
        // 向後兼容：使用原有系統
        const placeholderImage = getPlaceholderImage();
        currentArtworkViews = [
            {
                src: artwork.imageHigh || artwork.image || placeholderImage,
                alt: getArtworkText(artwork, 'title') + ' - 原作',
                type: 'original',
                title: '原作',
                icon: '🖼️'
            }
        ];
        
        // 檢查舊的房間展示欄位
        if (artwork.roomDisplay) {
            currentArtworkViews.push({
                src: artwork.roomDisplay,
                alt: getArtworkText(artwork, 'title') + ' - 房間展示',
                type: 'room',
                title: '房間展示',
                icon: '🏠'
            });
        }
    }
    
    currentViewIndex = 0;
}

// 獲取作品文字（根據當前語言）
function getArtworkText(artwork, field) {
    if (typeof portfolio !== 'undefined' && portfolio.currentLanguage === 'en') {
        return artwork[field + 'En'] || artwork[field] || '';
    }
    return artwork[field] || artwork[field + 'En'] || '';
}

// 添加視圖指示器
function addViewIndicators() {
    const imageSection = document.querySelector('.lightbox-image-section');
    if (!imageSection || currentArtworkViews.length <= 1) return;
    
    // 移除現有指示器
    const existingIndicators = imageSection.querySelector('.view-indicators');
    if (existingIndicators) {
        existingIndicators.remove();
    }
    
    // 創建新指示器容器
    const indicators = document.createElement('div');
    indicators.className = 'view-indicators';
    
    // 如果視圖太多（>4個），使用緊湊模式
    const isCompact = currentArtworkViews.length > 4;
    if (isCompact) {
        indicators.classList.add('compact-mode');
    }
    
    currentArtworkViews.forEach((view, index) => {
        const dot = document.createElement('div');
        dot.className = `view-dot ${index === 0 ? 'active' : ''}`;
        dot.title = view.title || `視圖 ${index + 1}`;
        dot.onclick = () => switchArtworkView(index);
        
        // 如果有圖標且不是緊湊模式，顯示圖標
        if (view.icon && !isCompact) {
            dot.textContent = view.icon;
            dot.classList.add('icon-dot');
        }
        
        indicators.appendChild(dot);
    });
    
    imageSection.appendChild(indicators);
    
    console.log(`✅ Added ${currentArtworkViews.length} view indicators`);
}

// 切換作品視圖
function switchArtworkView(index) {
    if (index === currentViewIndex || index >= currentArtworkViews.length) return;
    
    const image = document.getElementById('lightboxImage');
    const dots = document.querySelectorAll('.view-dot');
    
    if (!image || !dots.length) return;
    
    console.log(`🔄 Switching to view ${index}: ${currentArtworkViews[index].title}`);
    
    // 更新指示器狀態
    dots.forEach(dot => dot.classList.remove('active'));
    dots[index].classList.add('active');
    
    // 添加淡出效果
    image.style.opacity = '0.5';
    image.style.transition = 'opacity 0.3s ease';
    
    setTimeout(() => {
        // 切換圖片
        const newView = currentArtworkViews[index];
        image.src = newView.src;
        image.alt = newView.alt;
        
        // 淡入效果
        image.style.opacity = '1';
        
        currentViewIndex = index;
        
        // 處理圖片加載錯誤
        image.onerror = function() {
            console.warn(`⚠️ Failed to load view image: ${newView.src}`);
            image.src = getPlaceholderImage();
        };
        
    }, 150);
}

// 清理視圖數據（當關閉 lightbox 時調用）
function cleanupViews() {
    currentArtworkViews = [];
    currentViewIndex = 0;
    
    // 移除指示器
    const indicators = document.querySelector('.view-indicators');
    if (indicators) {
        indicators.remove();
    }
}

// Export multi-view functions to global scope
window.setupArtworkViews = setupArtworkViews;
window.addViewIndicators = addViewIndicators;
window.switchArtworkView = switchArtworkView;
window.cleanupViews = cleanupViews;

console.log('✅ Multi-view system loaded for lightbox');
console.log('✅ Dynamic layout system loaded for lightbox');
console.log('✅ All lightbox functions exported to global scope');

// ================================
// 🆕 可點擊的可購買狀態
// ================================

function addClickableAvailabilityStatus(artwork) {
    const statusEl = document.getElementById('availabilityStatus');
    if (!statusEl) return;
    
    // 檢查作品是否可購買
    const isAvailable = portfolio ? portfolio.getBooleanValue(artwork, 'available', true) : true;
    
    if (isAvailable) {
        // 移除現有的點擊事件監聽器（如果有的話）
        const newStatusEl = statusEl.cloneNode(true);
        statusEl.parentNode.replaceChild(newStatusEl, statusEl);
        
        // 添加點擊事件
        newStatusEl.addEventListener('click', function() {
            // 確保聯絡表單系統已載入
            if (typeof openContactForm === 'function') {
                openContactForm(artwork.id);
            } else {
                console.error('Contact form system not loaded');
                // 降級處理：顯示聯絡資訊或跳轉
                alert('請透過電話或Email與我們聯繫');
            }
        });
        
        console.log('✅ Availability status is now clickable');
    } else {
        console.log('✅ Artwork is sold - status not clickable');
    }
}