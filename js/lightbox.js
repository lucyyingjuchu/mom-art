// Complete Working Lightbox - Mobile-First with Native Pinch Zoom
// Version: 8.0 - CLEAN MOBILE/DESKTOP SEPARATION
// Mobile: Native pinch-zoom, tap-to-close, swipe-to-close
// Desktop: Advanced zoom controls, fullscreen, pan/zoom

console.log('🚀 Loading mobile-optimized lightbox with clean separation...');

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

let lastScrollTime = 0;
let isScrolling = false;
const SCROLL_COOLDOWN = 500; // ms to wait after scrolling before allowing tap-to-fullscreen
let fullscreenExitHandlers = [];


// ================================
// DEVICE DETECTION
// ================================

function isMobileDevice() {
    const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const result = hasTouchScreen; // Simple: if touch screen = mobile
    
    console.log('Mobile detection - Touch screen detected:', result);
    return result;
}


function isTabletDevice() {
    const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isTabletSize = window.innerWidth > 768 && window.innerWidth <= 1024;
    return hasTouchScreen && isTabletSize;
}

// ================================
// MOBILE-SPECIFIC FUNCTIONS
// ================================

function initializeMobileLightbox() {
    console.log('Initializing mobile lightbox');
    
    const image = document.getElementById('lightboxImage');
    if (!image) return;
    
    // Reset any desktop zoom state
    zoomLevel = 1;
    panX = 0;
    panY = 0;
    
    // Remove existing event listeners by cloning
    const newImage = image.cloneNode(true);
    image.parentNode.replaceChild(newImage, image);
    
    setupMobileImage(newImage); // This now handles both tap and swipe
    // REMOVED: addMobileGestures(); - no longer needed
    removeDeskopZoomControls();
}

function removeDeskopZoomControls() {
    const existingControls = document.querySelector('.zoom-controls');
    if (existingControls) {
        existingControls.remove();
    }
}


function setupMobileImage(image) {
    image.style.touchAction = 'manipulation';
    image.style.userSelect = 'none';
    image.style.webkitUserSelect = 'none';
    image.style.transform = 'none';
    image.style.transformOrigin = 'center center';
    image.style.cursor = 'default';
    
    // UNIFIED touch handling on the image itself
    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let isMoving = false;
    
    image.addEventListener('touchstart', function(e) {
        if (e.touches.length === 1) {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            startTime = Date.now();
            isMoving = false;
        }
    }, { passive: true });
    
    image.addEventListener('touchmove', function(e) {
        if (e.touches.length === 1) {
            const currentX = e.touches[0].clientX;
            const currentY = e.touches[0].clientY;
            const deltaX = Math.abs(currentX - startX);
            const deltaY = Math.abs(currentY - startY);
            
            // If moved more than 10px, it's not a tap
            if (deltaX > 10 || deltaY > 10) {
                isMoving = true;
            }
        }
    }, { passive: true });
    
    image.addEventListener('touchend', function(e) {
        if (e.touches.length === 0) {
            const endTime = Date.now();
            const duration = endTime - startTime;
            const currentX = e.changedTouches[0].clientX;
            const deltaX = currentX - startX;
            const distance = Math.abs(deltaX);
            
            console.log('Touch end:', { duration, distance, deltaX, isMoving });
            
            if (!isMoving && duration < 300) {
                // TAP - only for original view
                const currentView = currentArtworkViews[currentViewIndex];
                const isOriginalView = !currentView || currentView.type === 'original' || currentView.type === 'artwork';
                
                if (isOriginalView) {
                    console.log('Tap detected - entering fullscreen');
                    e.stopPropagation();
                    enterMobileFullscreen();
                }
            } else if (isMoving && distance > 50 && duration < 500) {
                // SWIPE - check if we have multiple views
                if (currentArtworkViews && currentArtworkViews.length > 1) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    if (deltaX > 0) {
                        // Swipe right - previous view
                        const prevIndex = currentViewIndex > 0 ? currentViewIndex - 1 : currentArtworkViews.length - 1;
                        console.log('Swipe right - switching to view:', prevIndex);
                        switchArtworkView(prevIndex);
                    } else {
                        // Swipe left - next view
                        const nextIndex = currentViewIndex < currentArtworkViews.length - 1 ? currentViewIndex + 1 : 0;
                        console.log('Swipe left - switching to view:', nextIndex);
                        switchArtworkView(nextIndex);
                    }
                }
            }
        }
    }, { passive: false });
    
    currentImage = image;
}

// 4. FIX: Enhanced mobile gesture detection - separate from tap detection
function addMobileGestures() {
    console.log('Adding mobile gestures');
    
    const lightboxContent = document.querySelector('.lightbox-content');
    if (!lightboxContent) {
        console.error('lightbox-content not found for mobile gestures');
        return;
    }
    
    // Track scrolling
    lightboxContent.addEventListener('scroll', function(e) {
        lastScrollTime = Date.now();
        isScrolling = true;
        
        clearTimeout(window.scrollTimeout);
        window.scrollTimeout = setTimeout(() => {
            isScrolling = false;
        }, 150);
    }, { passive: true });
    
    // FIXED: Swipe detection on lightbox content, not image
    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let currentY = 0;
    let isHorizontalSwipe = false;
    let swipeStartTime = 0;
    let swipeThreshold = 50;
    let velocityThreshold = 0.3;
    
    lightboxContent.addEventListener('touchstart', function(e) {
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            startX = touch.clientX;
            startY = touch.clientY;
            currentX = startX;
            currentY = startY;
            swipeStartTime = Date.now();
            isHorizontalSwipe = false;
            
            console.log('Touch start for swipe:', {
                x: startX,
                y: startY,
                viewsCount: currentArtworkViews?.length || 0,
                currentViewIndex: currentViewIndex
            });
        }
    }, { passive: true });
    
    lightboxContent.addEventListener('touchmove', function(e) {
        if (e.touches.length !== 1) return;
        
        // Check if we have multiple views to swipe between
        if (!currentArtworkViews || currentArtworkViews.length <= 1) {
            return;
        }
        
        const touch = e.touches[0];
        currentX = touch.clientX;
        currentY = touch.clientY;
        const deltaX = currentX - startX;
        const deltaY = currentY - startY;
        const swipeTime = Date.now() - swipeStartTime;
        
        // Determine if this is a horizontal swipe early
        if (!isHorizontalSwipe && swipeTime < 300) {
            const horizontalDistance = Math.abs(deltaX);
            const verticalDistance = Math.abs(deltaY);
            
            if (horizontalDistance > 30 && horizontalDistance > verticalDistance * 2) {
                isHorizontalSwipe = true;
                console.log('Horizontal swipe detected:', { deltaX, deltaY });
            }
        }
        
        // Prevent vertical scrolling during horizontal swipes
        if (isHorizontalSwipe && Math.abs(deltaX) > 40) {
            e.preventDefault();
        }
        
        // Track vertical scrolling for non-horizontal movements
        if (!isHorizontalSwipe && Math.abs(deltaY) > 10) {
            lastScrollTime = Date.now();
            isScrolling = true;
        }
    }, { passive: false });
    
    lightboxContent.addEventListener('touchend', function(e) {
        if (!isHorizontalSwipe || !currentArtworkViews || currentArtworkViews.length <= 1) {
            return;
        }
        
        const deltaX = currentX - startX;
        const swipeTime = Date.now() - swipeStartTime;
        const swipeVelocity = Math.abs(deltaX) / swipeTime;
        const horizontalDistance = Math.abs(deltaX);
        
        console.log('Swipe end analysis:', {
            deltaX,
            swipeTime,
            swipeVelocity,
            horizontalDistance,
            threshold: swipeThreshold
        });
        
        // Check if swipe meets criteria
        const meetsDistanceCriteria = horizontalDistance > swipeThreshold;
        const meetsVelocityCriteria = swipeVelocity > velocityThreshold;
        const meetsTimeCriteria = swipeTime < 500;
        
        if ((meetsDistanceCriteria || meetsVelocityCriteria) && meetsTimeCriteria) {
            if (deltaX > 0) {
                // Swipe right - previous view
                const prevIndex = currentViewIndex > 0 ? currentViewIndex - 1 : currentArtworkViews.length - 1;
                console.log('Swiped right - switching to view:', prevIndex);
                switchArtworkView(prevIndex);
            } else {
                // Swipe left - next view
                const nextIndex = currentViewIndex < currentArtworkViews.length - 1 ? currentViewIndex + 1 : 0;
                console.log('Swiped left - switching to view:', nextIndex);
                switchArtworkView(nextIndex);
            }
        }
        
        // Reset swipe state
        isHorizontalSwipe = false;
    }, { passive: true });
    
    console.log('Mobile gestures initialized');
}

// Mobile fullscreen mode - dedicated image viewing
function enterMobileFullscreen() {
    const lightbox = document.querySelector('.lightbox');
    const lightboxContent = document.querySelector('.lightbox-content');
    const image = document.getElementById('lightboxImage');
    
    if (!lightbox || !lightboxContent || !image) return;
    
    // Only allow fullscreen for original view
    const currentView = currentArtworkViews[currentViewIndex];
    const isOriginalView = !currentView || currentView.type === 'original' || currentView.type === 'artwork';
    
    if (!isOriginalView) {
        console.log('Fullscreen not allowed for non-original view');
        return;
    }
    
    // Add fullscreen class for styling
    lightbox.classList.add('mobile-fullscreen');
    
    // Enable native pinch-zoom AND single-finger panning
    image.style.touchAction = 'pan-x pan-y pinch-zoom';
    image.style.maxWidth = '100vw';
    image.style.maxHeight = '100vh';
    image.style.width = 'auto';
    image.style.height = 'auto';
    image.style.objectFit = 'contain';
    
    addFullscreenExitGestures();
    
    console.log('Entered mobile fullscreen mode (original view only)');
}


function addFullscreenExitGestures() {
    const toggleButton = document.createElement('button');
    toggleButton.className = 'control-btn fullscreen-toggle';
    toggleButton.innerHTML = '⛶'; // Or use ↙ for "back to corner" or ⤓ for "exit fullscreen"
    toggleButton.onclick = exitMobileFullscreen;
    toggleButton.title = 'Exit Fullscreen';
    
    const lightbox = document.querySelector('.lightbox');
    if (lightbox) {
        lightbox.appendChild(toggleButton);
    }
    
    fullscreenExitHandlers = [
        { element: toggleButton, type: 'button' }
    ];
}

function removeFullscreenExitGestures() {
    const toggleButton = document.querySelector('.fullscreen-toggle');
    if (toggleButton) {
        toggleButton.remove();
    }
    fullscreenExitHandlers = [];
}

function exitMobileFullscreen() {
    const lightbox = document.querySelector('.lightbox');
    const image = document.getElementById('lightboxImage');
    
    if (!lightbox || !image) return;
    
    // Remove fullscreen class
    lightbox.classList.remove('mobile-fullscreen');
    
    // Restore normal mobile image settings
    image.style.touchAction = 'manipulation';
    image.style.maxWidth = '';
    image.style.maxHeight = '';
    image.style.width = '';
    image.style.height = '';
    image.style.objectFit = '';
    
    // Remove fullscreen exit gestures
    removeFullscreenExitGestures();
    
    console.log('Exited mobile fullscreen mode');
}


function exitMobileFullscreen() {
    const lightbox = document.querySelector('.lightbox');
    const image = document.getElementById('lightboxImage');
    
    if (!lightbox || !image) return;
    
    // Remove fullscreen class
    lightbox.classList.remove('mobile-fullscreen');
    
    // Restore normal mobile image settings
    image.style.touchAction = 'manipulation';
    image.style.transform = ''; // Clear any zoom/pan transforms
    // ... rest of existing restore code
    
    removeFullscreenExitGestures();
    
    console.log('Exited mobile fullscreen mode');
}

// ================================
// DESKTOP-SPECIFIC FUNCTIONS (UNCHANGED)
// ================================

function initializeDesktopLightbox() {
    console.log('🖥️ Initializing desktop lightbox experience');
    
    const image = document.getElementById('lightboxImage');
    if (!image) return;
    
    // Initialize with advanced zoom features
    initializeImageZoom();
    addZoomControls();
    addImageProtection();
    
    console.log('✅ Desktop lightbox initialized');
}

function showCleanZoomIndicator() {
    // Only show on desktop
    if (isMobileDevice()) return;
    
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
// BILINGUAL HELPER FUNCTIONS (UNCHANGED)
// ================================

function getPlaceholderImage() {
    if (typeof portfolio !== 'undefined' && portfolio.currentLanguage) {
        return `./images/placeholder/artwork-placeholder-${portfolio.currentLanguage}.svg`;
    }
    return './images/placeholder/artwork-placeholder.svg';
}

function getLocalizedText(key, params = {}) {
    if (typeof portfolio !== 'undefined' && typeof portfolio.t === 'function') {
        return portfolio.t(key, params);
    }
    return key;
}

function updateLightboxUIText() {
    console.log('🔄 Updating lightbox UI text...');
    
    if (typeof portfolio !== 'undefined') {
        console.log('Current language:', portfolio.currentLanguage);
    }
    
    // Update navigation tooltips
    const prevBtn = document.querySelector('.nav-arrow.prev');
    if (prevBtn) {
        prevBtn.title = getLocalizedText('lightbox.prevTitle');
    }
    
    const nextBtn = document.querySelector('.nav-arrow.next');
    if (nextBtn) {
        nextBtn.title = getLocalizedText('lightbox.nextTitle');
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
    
    // Update zoom control tooltips (desktop only)
    if (!isMobileDevice()) {
        const zoomInBtn = document.querySelector('.zoom-in-btn');
        if (zoomInBtn) {
            zoomInBtn.title = getLocalizedText('lightbox.zoomInTitle');
        }
        
        const zoomOutBtn = document.querySelector('.zoom-out-btn');
        if (zoomOutBtn) {
            zoomOutBtn.title = getLocalizedText('lightbox.zoomOutTitle');
        }
        
        const fullscreenBtn = document.querySelector('.zoom-fullscreen-btn');
        if (fullscreenBtn) {
            fullscreenBtn.title = getLocalizedText('lightbox.toggleFullscreenTitle');
        }
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

    // Remember current artwork ID for scroll-back feature
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
        
        // Reset zoom/pan state
        if (isFullscreenMode) {
            exitImageFullscreen();
        }
        
        zoomLevel = 1;
        panX = 0;
        panY = 0;
        isDragging = false;
        hasDragged = false;
        
        if (currentImage) {
            currentImage.style.transform = 'none';
            if (!isMobileDevice()) {
                updateCursor();
            }
        }
        
        // Clean up desktop controls
        const existingControls = document.querySelector('.zoom-controls');
        if (existingControls) {
            existingControls.remove();
        }
    }
    
    cleanupViews();

    // Scroll back to artwork after closing
    if (currentArtworkId && typeof portfolio !== 'undefined') {
        setTimeout(() => {
            portfolio.scrollToArtwork(currentArtworkId);
        }, 300);
    }

    // Trigger URL cleanup
    document.dispatchEvent(new CustomEvent('lightboxClosed'));
};

window.navigateArtwork = function(direction) {
    if (!artworksData.length) return;
    
    if (direction === 'prev') {
        currentArtworkIndex = currentArtworkIndex > 0 ? currentArtworkIndex - 1 : artworksData.length - 1;
    } else {
        currentArtworkIndex = currentArtworkIndex < artworksData.length - 1 ? currentArtworkIndex + 1 : 0;
    }
    
    const newArtwork = artworksData[currentArtworkIndex];
    console.log('🔄 Navigating to artwork:', newArtwork.id, newArtwork.title);
    
    populateLightbox(newArtwork);
};

// Desktop-only zoom functions
window.zoomIn = function() {
    if (isMobileDevice()) return; // No custom zoom on mobile
    if (!currentViewAllowsZoom()) return; // No zoom for non-original views  

    console.log('🔍 Button zoom in');
    
    if (!isFullscreenMode && zoomLevel === 1) {
        console.log('📱 First zoom click - entering fullscreen at 1x');
        enterImageFullscreen();
        showFullscreenIndicator(true);
        return;
    }
    
    const oldZoom = zoomLevel;
    zoomLevel = Math.min(zoomLevel + 0.5, maxZoom);
    
    if (oldZoom !== zoomLevel) {
        updateCursor();
        applyTransform();
        showCleanZoomIndicator();
    }
};

window.zoomOut = function() {
    if (isMobileDevice()) return; // No custom zoom on mobile
    if (!currentViewAllowsZoom()) return; // No zoom for non-original views
    
    console.log('🔍 Button zoom out');
    const oldZoom = zoomLevel;
    
    if (zoomLevel <= 1 && isFullscreenMode) {
        console.log('📱 At 1x zoom in fullscreen - exiting fullscreen');
        exitImageFullscreen();
        return;
    }
    
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
    if (isMobileDevice()) return; // No custom zoom on mobile
    
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

window.toggleImageZoom = function() {
    if (isMobileDevice()) return; // No custom zoom on mobile
    
    if (!isFullscreenMode && zoomLevel === 1) {
        window.zoomIn();
    } else if (zoomLevel === 1) {
        zoomLevel = 2;
        constrainPan();
        applyTransform();
        updateCursor();
        showCleanZoomIndicator();
    } else {
        window.resetZoomPan();
        applyTransform();
        showCleanZoomIndicator();
    }
};

window.downloadImage = function() {
    console.log('Download disabled - intellectual property protection');
};

window.shareArtwork = function() {
    const existingDropdown = document.querySelector('.share-dropdown');
    if (existingDropdown) {
        existingDropdown.remove();
        return;
    }

    const titleEl = document.getElementById('artworkTitle');
    if (!titleEl) {
        console.error('Artwork title not found');
        return;
    }
    
    const currentArtwork = artworksData[currentArtworkIndex];
    if (!currentArtwork) {
        console.error('Current artwork data not found');
        return;
    }
    
    // Create share URL
    const baseUrl = window.location.origin + window.location.pathname;
    const currentLang = (typeof portfolio !== 'undefined') ? portfolio.currentLanguage : 'en';
    const artworkUrl = `${baseUrl}?artwork=${currentArtwork.id}&lang=${currentLang}`;
    
    // Create dropdown menu
    const dropdown = document.createElement('div');
    dropdown.className = 'share-dropdown';
    
    // Get current language for labels
    const isZh = currentLang === 'zh';
    
    dropdown.innerHTML = `
        <div class="share-option" onclick="copyArtworkLink('${artworkUrl}')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.71"/>
            </svg>
            <span>${isZh ? '複製連結' : 'Copy Link'}</span>
        </div>
        <div class="share-option" onclick="generateQRCode('${artworkUrl}')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="5" height="5"/>
                <rect x="3" y="16" width="5" height="5"/>
                <rect x="16" y="3" width="5" height="5"/>
                <path d="M21 16h-3a2 2 0 0 0-2 2v3"/>
                <path d="M21 21v.01"/>
                <path d="M12 7v3a2 2 0 0 1-2 2H7"/>
                <path d="M3 12h.01"/>
                <path d="M12 3h.01"/>
                <path d="M12 16v.01"/>
                <path d="M16 12h1"/>
                <path d="M21 12v.01"/>
                <path d="M12 21v-1"/>
            </svg>
            <span>${isZh ? '生成二維碼' : 'Generate QR Code'}</span>
        </div>
    `;
    
    // Position dropdown
    const shareBtn = document.querySelector('.control-btn[onclick="shareArtwork()"]');
    if (shareBtn) {
        const rect = shareBtn.getBoundingClientRect();
        dropdown.style.position = 'fixed';
        dropdown.style.top = `${rect.bottom + 8}px`;
        dropdown.style.right = `${window.innerWidth - rect.right}px`;
        dropdown.style.zIndex = '10010';
    }
    
    document.body.appendChild(dropdown);
    
    // Close dropdown when clicking outside
    setTimeout(() => {
        document.addEventListener('click', function closeDropdown(e) {
            if (!dropdown.contains(e.target) && e.target !== shareBtn) {
                dropdown.remove();
                document.removeEventListener('click', closeDropdown);
            }
        });
    }, 100);
};

// Copy link function
window.copyArtworkLink = function(url) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(() => {
            showShareFeedback('Link copied to clipboard!');
        }).catch(err => {
            console.error('Clipboard write failed:', err);
            showShareFeedback('Unable to copy to clipboard');
        });
    } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = url;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            showShareFeedback('Link copied to clipboard!');
        } catch (err) {
            showShareFeedback('Unable to copy to clipboard');
        }
        document.body.removeChild(textArea);
    }
    
    // Close dropdown
    const dropdown = document.querySelector('.share-dropdown');
    if (dropdown) dropdown.remove();
};

// QR Code generation function
window.generateQRCode = function(url) {
    // Create QR code modal
    const modal = document.createElement('div');
    modal.className = 'qr-modal';
    
    const currentLang = (typeof portfolio !== 'undefined') ? portfolio.currentLanguage : 'zh';
    const isZh = currentLang === 'zh';
    
    modal.innerHTML = `
        <div class="qr-modal-content">
            <div class="qr-header">
                <h3>${isZh ? '掃描二維碼分享' : 'Scan QR Code to Share'}</h3>
                <button class="qr-close" onclick="this.closest('.qr-modal').remove()">×</button>
            </div>
            <div class="qr-code-container">
                <div id="qrcode"></div>
            </div>
            <p class="qr-url">${url}</p>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Generate QR code using a simple library-free approach
    generateSimpleQR(url, 'qrcode');
    
    // Close dropdown
    const dropdown = document.querySelector('.share-dropdown');
    if (dropdown) dropdown.remove();
};

// Simple QR code generation (library-free)
function generateSimpleQR(text, elementId) {
    const qrContainer = document.getElementById(elementId);
    if (!qrContainer) return;
    
    // Use a free QR code API service
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(text)}`;
    
    const img = document.createElement('img');
    img.src = qrUrl;
    img.alt = 'QR Code';
    img.style.cssText = `
        width: 200px;
        height: 200px;
        border: 1px solid #ddd;
        border-radius: 8px;
    `;
    
    img.onerror = function() {
        qrContainer.innerHTML = `
            <div style="width: 200px; height: 200px; border: 1px solid #ddd; border-radius: 8px; 
                        display: flex; align-items: center; justify-content: center; 
                        background: #f5f5f5; color: #666; text-align: center; font-size: 14px;">
                QR Code generation failed<br>
                Please copy the link instead
            </div>
        `;
    };
    
    qrContainer.appendChild(img);
}

window.showZoomIndicator = function() {
    showCleanZoomIndicator();
};

window.toggleFullscreenZoom = function() {
    if (isMobileDevice()) return; // No fullscreen toggle on mobile
    if (!currentViewAllowsZoom()) return; // No fullscreen for non-original views
    
    if (isFullscreenMode) {
        exitImageFullscreen();
    } else {
        enterImageFullscreen();
    }
};

console.log('✅ Global functions defined with mobile/desktop separation');

// ================================
// MAIN POPULATE FUNCTION
// ================================

function populateLightbox(artwork) {
    console.log('🎨 Populating lightbox for:', isMobileDevice() ? 'mobile' : 'desktop');

    // CLEAN UP: Remove any existing indicators from previous artwork
    const existingIndicators = document.querySelector('.view-indicators');
    if (existingIndicators) {
        existingIndicators.remove();
        console.log('🧹 Cleaned up old view indicators');
    }
    
    const image = document.getElementById('lightboxImage');
    if (!image) {
        console.error('Lightbox image element not found');
        return;
    }
    
    // Reset state
    if (isFullscreenMode) {
        exitImageFullscreen();
    }
    
    zoomLevel = 1;
    panX = 0;
    panY = 0;
    isDragging = false;
    hasDragged = false;
    
    image.classList.add('loading');
    
    const placeholderImage = getPlaceholderImage();
    image.src = artwork.imageHigh || artwork.image || placeholderImage;
    
    // SETUP VIEWS FIRST - before image loads
    setupArtworkViews(artwork);
    
    image.onload = function() {
        image.classList.remove('loading');
        setTimeout(() => {
            addImageProtection();

            // Device-specific initialization
            if (isMobileDevice()) {
                initializeMobileLightbox();
            } else {
                initializeDesktopLightbox();
            }
            
            // ADD VIEW INDICATORS AFTER INITIALIZATION
            addViewIndicators();
        }, 100);
    };

    image.onerror = function() {
        image.src = placeholderImage;
        image.classList.remove('loading');
        addImageProtection();
        
        // Still add view indicators even on error
        setTimeout(() => {
            if (isMobileDevice()) {
                initializeMobileLightbox();
            } else {
                initializeDesktopLightbox();
            }
            addViewIndicators();
        }, 100);
    };

    // ... rest of the function remains the same for setting text content etc.
    const currentLang = (typeof portfolio !== 'undefined') ? portfolio.currentLanguage : 'zh';
    
    let title, titleEn, description, format, size;

    if (currentLang === 'zh') {
        title = artwork.title || artwork.titleEn || 'Untitled';
        titleEn = artwork.titleEn || '';
        description = artwork.description || artwork.descriptionEn || '';
        format = artwork.format || artwork.formatEn || '';
        size = artwork.heightCm && artwork.widthCm ? 
            `${artwork.heightCm} x ${artwork.widthCm} cm` : 
            artwork.sizeCm || 'Size not specified';
    } else {
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

    // Set artwork details
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

    // Update availability status
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
    
    addClickableAvailabilityStatus(artwork);
    updateLightboxUIText();

    // Dispatch event for shopping cart and other systems
    document.dispatchEvent(new CustomEvent('artworkChanged', { 
        detail: { artwork } 
    }));
}

// ================================
// DESKTOP-ONLY FUNCTIONS (Keep existing advanced features)
// ================================

function initializeImageZoom() {
    console.log('🔧 INITIALIZING DESKTOP IMAGE ZOOM');
    
    const image = document.getElementById('lightboxImage');
    if (!image) {
        console.error('❌ NO IMAGE FOUND');
        return;
    }

    currentImage = image;
    
    zoomLevel = 1;
    panX = 0;
    panY = 0;
    isDragging = false;
    hasDragged = false;

    // Remove existing listeners by cloning
    const newImage = image.cloneNode(true);
    image.parentNode.replaceChild(newImage, image);
    currentImage = newImage;
    
    // Add desktop-specific event listeners
    currentImage.addEventListener('wheel', function(e) {
        handleWheelZoom(e);
    }, { passive: false });
    
    currentImage.addEventListener('mousedown', handleMouseDown);
    currentImage.addEventListener('mousemove', handleMouseMove);
    currentImage.addEventListener('mouseup', handleMouseUp);
    currentImage.addEventListener('mouseleave', handleMouseUp);
    currentImage.addEventListener('click', handleImageClick);
    currentImage.addEventListener('dblclick', handleDoubleClick);
    
    updateCursor();
}

function handleWheelZoom(e) {
    e.preventDefault();
    e.stopPropagation();
    
    // Block zoom for non-original views
    if (!currentViewAllowsZoom()) {
        return; // Do nothing for non-original views
    }

    if (isZoomBlocked) return;
    
    isZoomBlocked = true;
    console.log('✅ ZOOM ACCEPTED - IMMEDIATE RESPONSE');
    
    if (e.deltaY < 0) {
        console.log('📈 WHEEL ZOOMING IN');
        
        if (!isFullscreenMode && zoomLevel === 1) {
            console.log('📱 First wheel zoom - entering fullscreen at 1x');
            enterImageFullscreen();
            showFullscreenIndicator(true);
        } else {
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

function applyTransform() {
    if (!currentImage) return;
    currentImage.style.transform = `scale(${zoomLevel}) translate(${panX}px, ${panY}px)`;
    currentImage.style.transformOrigin = 'center center';
}

// Helper function to check if current view allows zoom
function currentViewAllowsZoom() {
    if (!currentArtworkViews || currentArtworkViews.length === 0){
        console.log('🔍 No views, allowing zoom by default');
        return true; // Default allow
    }

    const currentView = currentArtworkViews[currentViewIndex];
    if (!currentView){
        console.log('🔍 No current view, allowing zoom by default');
        return true; // Default allow
    } 
    
    const allowsZoom = currentView.type === 'original' || currentView.type === 'artwork' || !currentView.type;
    
    return allowsZoom;
}

function updateCursor() {
    if (!currentImage) {
        console.log('No current image');
        return;
    }
    
    console.log('updateCursor called:', {
        isFullscreenMode,
        zoomLevel,
        isDragging,
        allowsZoom: currentViewAllowsZoom()
    });
    
    // Remove all cursor classes first
    currentImage.classList.remove('zoomable', 'zoomed', 'dragging');
    console.log('Removed all cursor classes');
    
    const allowsZoom = currentViewAllowsZoom();
    
    // For non-zoomable views, default cursor
    if (!allowsZoom) {
        console.log('Non-zoomable view, returning');
        return; 
    }
    
    // For original artwork:
    if (isDragging) {
        currentImage.classList.add('dragging');
        console.log('Added dragging class');
    } else if (isFullscreenMode || zoomLevel > 1) {
        currentImage.classList.add('zoomed');
        console.log('Added zoomed class (fullscreen or zoomed)');
    } else {
        currentImage.classList.add('zoomable');
        console.log('Added zoomable class');
    }
    
    console.log('Final image classes:', currentImage.className);
    console.log('Computed cursor:', window.getComputedStyle(currentImage).cursor);
}

function constrainPan() {
    if (zoomLevel <= 1 && !isFullscreenMode) {
        panX = 0;
        panY = 0;
        return;
    }
    
    if (isFullscreenMode && zoomLevel === 1) {
        const imageRect = currentImage.getBoundingClientRect();
        const containerRect = currentImage.parentElement.getBoundingClientRect();
        
        const overflowX = Math.max(0, (imageRect.width - containerRect.width) / 2);
        const overflowY = Math.max(0, (imageRect.height - containerRect.height) / 2);
        
        panX = Math.max(-overflowX, Math.min(overflowX, panX));
        panY = Math.max(-overflowY, Math.min(overflowY, panY));
        return;
    }
    
    const maxPanX = (currentImage.offsetWidth * (zoomLevel - 1)) / (2 * zoomLevel);
    const maxPanY = (currentImage.offsetHeight * (zoomLevel - 1)) / (2 * zoomLevel);
    
    panX = Math.max(-maxPanX, Math.min(maxPanX, panX));
    panY = Math.max(-maxPanY, Math.min(maxPanY, panY));
}

function handleImageClick(e) {
    if (hasDragged) {
        hasDragged = false;
        return; // Don't do anything if user was dragging
    }
    
    // Only allow fullscreen entry when in normal view
    if (!currentViewAllowsZoom() || isFullscreenMode || zoomLevel > 1) {
        return; // Do nothing in fullscreen or when zoomed
    }
    
    // Enter fullscreen from normal view
    enterImageFullscreen();
    showFullscreenIndicator(true);
}

function handleDoubleClick(e) {
    e.preventDefault();
    e.stopPropagation();
}

function handleMouseDown(e) {
    // Allow panning in fullscreen mode OR when zoomed > 1x
    if (!currentViewAllowsZoom() || (!isFullscreenMode && zoomLevel <= 1)) {
        return;
    }
    
    isDragging = true;
    hasDragged = false;
    startX = e.clientX - panX;
    startY = e.clientY - panY;
    updateCursor(); // This should show 'grabbing'
    e.preventDefault();
}

function handleMouseMove(e) {
    // Only allow panning for zoomable views AND when zoom > 1 or fullscreen
    if (!isDragging || !currentViewAllowsZoom() || (zoomLevel <= 1 && !isFullscreenMode)) {
        return;
    }    
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
    updateCursor();
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
    updateCursor();
}

function showFullscreenIndicator(entering) {
    const existingIndicator = document.querySelector('.fullscreen-indicator');
    if (existingIndicator) {
        existingIndicator.remove();
    }
    
    const indicator = document.createElement('div');
    indicator.className = 'fullscreen-indicator';
    
    let currentLang = 'zh';
    if (typeof portfolio !== 'undefined' && portfolio.currentLanguage) {
        currentLang = portfolio.currentLanguage;
    }
    
    const translations = {
        zh: {
            fullscreenView: "全螢幕檢視(滾動縮放)",
            splitView: "分割檢視"
        },
        en: {
            fullscreenView: "Fullscreen View (Scroll to zoom)",
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
}

function addZoomControls() {
    // Only add on desktop
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
    
    let currentLang = 'zh';
    if (typeof portfolio !== 'undefined' && portfolio.currentLanguage) {
        currentLang = portfolio.currentLanguage;
    }
    
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
    
    console.log('✅ Desktop zoom controls created');
}

function addImageProtection() {
    const image = document.getElementById('lightboxImage');
    if (!image) return;
    
    image.setAttribute('draggable', 'false');
    image.style.userSelect = 'none';
    image.style.webkitUserSelect = 'none';
    image.style.mozUserSelect = 'none';
    image.style.msUserSelect = 'none';
    
    console.log('Image protection enabled');
}

// ================================
// UTILITY FUNCTIONS
// ================================

function copyToClipboard(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            showShareFeedback('Shareable link copied to clipboard!');
        }).catch(err => {
            console.error('Clipboard write failed:', err);
            showShareFeedback('Unable to copy to clipboard');
        });
    } else {
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

function showShareFeedback(message) {
    const existingFeedback = document.querySelector('.share-feedback');
    if (existingFeedback) {
        existingFeedback.remove();
    }
    
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
    
    setTimeout(() => {
        feedback.style.opacity = '1';
    }, 10);
    
    setTimeout(() => {
        feedback.style.opacity = '0';
        setTimeout(() => {
            if (feedback.parentNode) {
                feedback.parentNode.removeChild(feedback);
            }
        }, 300);
    }, 2000);
}

// ================================
// BILINGUAL FRAMEWORK UPDATE
// ================================

window.updateLightboxLanguage = function() {
    const lightbox = document.getElementById('lightbox');
    if (lightbox && lightbox.classList.contains('active')) {
        updateLightboxUIText();
        
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

        const activeElement = document.activeElement;
        const isTypingInForm = activeElement && (
            activeElement.tagName === 'INPUT' || 
            activeElement.tagName === 'TEXTAREA' || 
            activeElement.isContentEditable
        );
        
        if (isTypingInForm) {
            if (e.key === 'Escape') {
                if (isFullscreenMode) {
                    exitImageFullscreen();
                } else {
                    window.closeLightbox();
                }
            }
            return;
        }

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
                if (!isMobileDevice()) {
                    e.preventDefault();
                    window.zoomIn();
                }
                break;
            case '-':
                if (!isMobileDevice()) {
                    e.preventDefault();
                    window.zoomOut();
                }
                break;
            case '0':
                if (!isMobileDevice()) {
                    e.preventDefault();
                    window.resetZoomPan();
                    applyTransform();
                    showCleanZoomIndicator();
                }
                break;
        }
    });
}

// ================================
// MULTI-VIEW SYSTEM
// ================================

function setupArtworkViews(artwork) {
    console.log('Setting up artwork views for:', artwork.id);
    
    currentArtworkViews = [];
    
    if (artwork.productViews && artwork.productViews.length > 0) {
        console.log(`Found ${artwork.productViews.length} product views in data`);
        currentArtworkViews = artwork.productViews.map(view => ({
            src: view.image,
            alt: getArtworkText(artwork, 'title') + ' - ' + view.title,
            type: view.type,
            title: view.title,
            icon: view.icon,
            description: view.description
        }));
    } else {
        console.log('No product views, creating default views');
        const placeholderImage = getPlaceholderImage();
        
        currentArtworkViews = [
            {
                src: artwork.imageHigh || artwork.image || placeholderImage,
                alt: getArtworkText(artwork, 'title') + ' - Original',
                type: 'original',
                title: 'Original',
                icon: '🖼️'
            }
        ];
        
        // Only add room display if it exists
        if (artwork.roomDisplay) {
            currentArtworkViews.push({
                src: artwork.roomDisplay,
                alt: getArtworkText(artwork, 'title') + ' - Room Display',
                type: 'room',
                title: 'Room Display',
                icon: '🏠'
            });
        }
    }
    
    currentViewIndex = 0;
    
    console.log('Final views setup:', currentArtworkViews.map(v => ({
        title: v.title,
        type: v.type,
        src: v.src.substring(v.src.lastIndexOf('/') + 1) // Just filename
    })));
    
    console.log(`Total views: ${currentArtworkViews.length}`);
}


function getArtworkText(artwork, field) {
    if (typeof portfolio !== 'undefined' && portfolio.currentLanguage === 'en') {
        return artwork[field + 'En'] || artwork[field] || '';
    }
    return artwork[field] || artwork[field + 'En'] || '';
}

function addViewIndicators() {
    const image = document.getElementById('lightboxImage');
    if (!image) {
        console.error('Lightbox image not found');
        return;
    }
    
    // Check if we actually have multiple views from the real data
    if (!currentArtworkViews || currentArtworkViews.length <= 1) {
        console.log('No multiple views in data - skipping indicators');
        return; // NO test creation - use real data only
    }
    
    console.log(`Creating indicators for ${currentArtworkViews.length} REAL views`);
    
    // Remove existing indicators
    const existingIndicators = document.querySelector('.view-indicators');
    if (existingIndicators) {
        existingIndicators.remove();
    }
    
    // Create new indicators container
    const indicators = document.createElement('div');
    indicators.className = 'view-indicators';
    
    const isCompact = currentArtworkViews.length > 4;
    if (isCompact) {
        indicators.classList.add('compact-mode');
    }
    
    // Create dots ONLY for real views
    currentArtworkViews.forEach((view, index) => {
        const dot = document.createElement('div');
        dot.className = `view-dot ${index === currentViewIndex ? 'active' : ''}`;
        
        let tooltipText = view.title || view.type || `View ${index + 1}`;
        dot.title = tooltipText;
        dot.onclick = () => switchArtworkView(index);
        
        if (view.icon && !isCompact) {
            dot.textContent = view.icon;
            dot.classList.add('icon-dot');
        }
        
        indicators.appendChild(dot);
        console.log(`Added real dot ${index}: ${tooltipText}`);
    });
    
    // Always use mobile positioning if touch screen detected
    if (isMobileDevice()) {
        console.log('Touch device: Adding indicators to image section');
        
        const imageSection = document.querySelector('.lightbox-image-section');
        if (imageSection) {
            imageSection.appendChild(indicators);
            console.log('Mobile indicators added');
        }
    } else {
        // Desktop positioning
        const imageContainer = image.parentElement;
        imageContainer.appendChild(indicators);
        indicators.style.position = 'absolute';
        indicators.style.zIndex = '1001';
        
        function positionIndicators() {
            const imageRect = image.getBoundingClientRect();
            const containerRect = imageContainer.getBoundingClientRect();
            const imageBottomRelative = imageRect.bottom - containerRect.top;
            const imageCenterRelative = (imageRect.left + imageRect.right) / 2 - containerRect.left;
            
            indicators.style.top = `${imageBottomRelative + 10}px`;
            indicators.style.left = `${imageCenterRelative}px`;
            indicators.style.transform = 'translateX(-50%)';
        }
        
        positionIndicators();
        image.addEventListener('load', positionIndicators);
    }
    
    console.log(`Added ${currentArtworkViews.length} real view indicators`);
}



function switchArtworkView(index) {
    if (index === currentViewIndex || index >= currentArtworkViews.length) return;

    // Reset zoom when switching away from original view
    if (isFullscreenMode) {
        exitImageFullscreen();
    }
    if (zoomLevel > 1) {
        window.resetZoomPan();
    }
    
    const image = document.getElementById('lightboxImage');
    const dots = document.querySelectorAll('.view-dot');
    
    if (!image || !dots.length) return;
    
    console.log(`🔄 Switching to view ${index}: ${currentArtworkViews[index].title || currentArtworkViews[index].type}`);
    
    // Update dot states immediately for better responsiveness
    dots.forEach(dot => dot.classList.remove('active'));
    if (dots[index]) {
        dots[index].classList.add('active');
    }
    
    // Add loading state
    image.style.opacity = '0.5';
    image.style.transition = 'opacity 0.3s ease';
    
    // Mobile haptic feedback (if supported)
    if (isMobileDevice() && navigator.vibrate) {
        navigator.vibrate(50); // Short vibration
    }
    
    setTimeout(() => {
        const newView = currentArtworkViews[index];
        image.src = newView.src;
        image.alt = newView.alt;
        
        image.onload = function() {
            image.style.opacity = '1';
            currentViewIndex = index;
            console.log(`✅ Successfully switched to view ${index}`);
        };
        
        image.onerror = function() {
            console.warn(`⚠️ Failed to load view image: ${newView.src}`);
            image.src = getPlaceholderImage();
            image.style.opacity = '1';
            currentViewIndex = index;
        };

        updateCursor();
    }, 150);
}

function cleanupViews() {
    currentArtworkViews = [];
    currentViewIndex = 0;
    
    const indicators = document.querySelector('.view-indicators');
    if (indicators) {
        indicators.remove();
    }
}

function addClickableAvailabilityStatus(artwork) {
    const statusEl = document.getElementById('availabilityStatus');
    if (!statusEl) return;
    
    const isAvailable = portfolio ? portfolio.getBooleanValue(artwork, 'available', true) : true;
    
    if (isAvailable) {
        const newStatusEl = statusEl.cloneNode(true);
        statusEl.parentNode.replaceChild(newStatusEl, statusEl);
        
        newStatusEl.addEventListener('click', function() {
            if (typeof openContactForm === 'function') {
                openContactForm(artwork.id);
            } else {
                console.error('Contact form system not loaded');
                alert('請透過電話或Email與我們聯繫');
            }
        });
        
        console.log('✅ Availability status is now clickable');
    } else {
        console.log('✅ Artwork is sold - status not clickable');
    }
}

// Export functions to global scope
window.setupArtworkViews = setupArtworkViews;
window.addViewIndicators = addViewIndicators;
window.switchArtworkView = switchArtworkView;
window.cleanupViews = cleanupViews;

console.log('🎯 Mobile-optimized lightbox loaded successfully!');
console.log('📱 Mobile: Native pinch-zoom + tap-to-close + swipe-to-close');
console.log('🖥️ Desktop: Advanced zoom controls + fullscreen + pan/zoom');
console.log('✅ Clean device separation implemented');

// SIMPLE MOBILE DEBUG - Add this to the very end of lightbox.js

// Debug function to check what's happening
window.checkMobileMultiview = function() {
    console.log('=== MOBILE MULTIVIEW DEBUG ===');
    console.log('1. Is mobile device:', isMobileDevice());
    console.log('2. Current artwork views:', currentArtworkViews);
    console.log('3. Views count:', currentArtworkViews?.length || 0);
    console.log('4. Current view index:', currentViewIndex);
    console.log('5. View indicators element:', document.querySelector('.view-indicators'));
    console.log('6. Lightbox image section:', document.querySelector('.lightbox-image-section'));
    
    // Force mobile device detection for testing
    console.log('7. User agent:', navigator.userAgent);
    console.log('8. Touch points:', navigator.maxTouchPoints);
    console.log('9. Window width:', window.innerWidth);
    
    const indicators = document.querySelector('.view-indicators');
    if (indicators) {
        const rect = indicators.getBoundingClientRect();
        console.log('10. Indicators position:', rect);
        console.log('11. Indicators visible:', rect.width > 0 && rect.height > 0);
        console.log('12. Indicators styles:', window.getComputedStyle(indicators));
    } else {
        console.log('10. NO VIEW INDICATORS FOUND');
    }
};

// Force mobile mode for testing
window.forceMobileMode = function() {
    // Override the mobile detection temporarily
    window.originalIsMobile = isMobileDevice;
    window.isMobileDevice = function() { return true; };
    
    console.log('Forced mobile mode ON');
    console.log('Opening lightbox should now use mobile mode');
};

// Restore original mobile detection
window.restoreMobileMode = function() {
    if (window.originalIsMobile) {
        window.isMobileDevice = window.originalIsMobile;
        console.log('Restored original mobile detection');
    }
};

// Test by manually creating view indicators
window.forceCreateIndicators = function() {
    console.log('Manually creating view indicators for testing...');
    
    // Remove any existing indicators
    const existing = document.querySelector('.view-indicators');
    if (existing) existing.remove();
    
    // Get image section
    const imageSection = document.querySelector('.lightbox-image-section');
    if (!imageSection) {
        console.error('No image section found');
        return;
    }
    
    // Create test indicators
    const indicators = document.createElement('div');
    indicators.className = 'view-indicators';
    indicators.style.cssText = `
        position: absolute !important;
        bottom: 20px !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        z-index: 1002 !important;
        display: flex !important;
        gap: 12px;
        padding: 8px 16px;
        background: rgba(0, 0, 0, 0.8) !important;
        border-radius: 20px;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.3);
    `;
    
    // Create test dots
    for (let i = 0; i < 3; i++) {
        const dot = document.createElement('div');
        dot.className = i === 0 ? 'view-dot active' : 'view-dot';
        dot.style.cssText = `
            width: 16px !important;
            height: 16px !important;
            border-radius: 50%;
            background: ${i === 0 ? 'white' : 'rgba(255, 255, 255, 0.6)'} !important;
            cursor: pointer;
            transition: all 0.3s ease;
        `;
        dot.onclick = () => console.log(`Clicked dot ${i}`);
        indicators.appendChild(dot);
    }
    
    imageSection.appendChild(indicators);
    
    console.log('Test indicators created');
    console.log('Indicators element:', indicators);
    console.log('Parent:', indicators.parentElement);
    
    setTimeout(() => {
        const rect = indicators.getBoundingClientRect();
        console.log('Test indicators position:', rect);
        console.log('Visible:', rect.width > 0 && rect.height > 0);
    }, 100);
};

// Replace this function in lightbox.js
// Replace this function in lightbox.js
function shouldUseMobileLayout() {
    return window.innerWidth <= 768 || isMobileDevice();
}

// Then in addViewIndicators(), replace:
if (isMobileDevice()) {
    // mobile positioning
} else {
    // desktop positioning  
}

// With:
if (shouldUseMobileLayout()) {
    // mobile positioning
} else {
    // desktop positioning
}

// Also update populateLightbox() image.onload section:
if (shouldUseMobileLayout()) {
    initializeMobileLightbox();
} else {
    initializeDesktopLightbox();
}

// Then in addViewIndicators(), replace:
if (isMobileDevice()) {
    // mobile positioning
} else {
    // desktop positioning  
}

// With:
if (shouldUseMobileLayout()) {
    // mobile positioning
} else {
    // desktop positioning
}

// Also update populateLightbox() image.onload section:
if (shouldUseMobileLayout()) {
    initializeMobileLightbox();
} else {
    initializeDesktopLightbox();
}

// 7. SIMPLE debug function to check what's really happening
window.simpleDebug = function() {
    console.log('=== SIMPLE DEBUG ===');
    console.log('Mobile detected:', isMobileDevice());
    console.log('Touch support:', 'ontouchstart' in window);
    console.log('Max touch points:', navigator.maxTouchPoints);
    console.log('Current views:', currentArtworkViews?.length || 0);
    console.log('View details:', currentArtworkViews?.map(v => v.title) || []);
    console.log('Indicators element:', !!document.querySelector('.view-indicators'));
};