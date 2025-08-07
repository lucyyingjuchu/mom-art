// Complete Working Lightbox - ALL zoom indicators use clean progress bar
// Version: 7.0 - Absolutely NO text in any zoom indicators

console.log('🚀 Loading lightbox...');

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
const BLOCK_DURATION = 600;

// ================================
// CLEAN ZOOM INDICATOR FUNCTION
// ================================
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
// GLOBAL FUNCTIONS
// ================================

window.openLightbox = function(artworkId) {
    console.log('🎨 Opening lightbox for:', artworkId);
    
    if (typeof portfolio === 'undefined') {
        console.error('Portfolio not loaded');
        return;
    }
    
    const artwork = portfolio.getArtwork(artworkId);
    if (!artwork) {
        console.error('Artwork not found:', artworkId);
        return;
    }

    // DETERMINE CONTEXT: Are we on featured works or full gallery?
    const currentSection = document.querySelector('.section.active');
    const isHomePage = currentSection && currentSection.id === 'home';

    if (isHomePage) {
        // If on home page, use only featured artworks for navigation
        artworksData = portfolio.getFeaturedArtworks();
        if (artworksData.length === 0) {
            // Fallback if no featured works
            artworksData = portfolio.artworks.slice(0, 6);
        }
    } else {
        // If on gallery page, use all artworks (or filtered ones if filters are active)
        const hasActiveFilters = Object.values(portfolio.activeFilters).some(arr => arr.length > 0);
        if (hasActiveFilters) {
            artworksData = portfolio.categorizer.getMultiFilteredArtworks(portfolio.activeFilters, portfolio.artworks);
        } else {
            artworksData = portfolio.artworks;
        }
    }

    currentArtworkIndex = artworksData.findIndex(a => a.id === artworkId);
    populateLightbox(artwork);
    
    const lightbox = document.getElementById('lightbox');
    if (lightbox) {
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
        console.log('✅ Lightbox opened');
    }
};

window.closeLightbox = function() {
    console.log('🚪 Closing lightbox');
    
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

window.zoomIn = function() {
    console.log('🔍 Button zoom in');
    const oldZoom = zoomLevel;
    zoomLevel = Math.min(zoomLevel + 0.5, maxZoom);
    
    if (oldZoom !== zoomLevel) {
        if (zoomLevel > 1 && !isFullscreenMode) {
            enterImageFullscreen();
        }
        updateCursor();
        applyTransform();
        showCleanZoomIndicator();
    }
};

window.zoomOut = function() {
    console.log('🔍 Button zoom out');
    const oldZoom = zoomLevel;
    zoomLevel = Math.max(zoomLevel - 0.5, minZoom);
    
    if (zoomLevel === minZoom) {
        panX = 0;
        panY = 0;
    }
    
    if (oldZoom !== zoomLevel) {
        if (zoomLevel <= 1 && isFullscreenMode) {
            exitImageFullscreen();
        }
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

window.toggleImageZoom = function() {
    if (zoomLevel === 1) {
        window.zoomIn();
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
    const titleEl = document.getElementById('artworkTitle');
    
    if (navigator.share && titleEl) {
        navigator.share({
            title: titleEl.textContent,
            url: window.location.href
        }).catch(console.error);
    } else {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(window.location.href).then(() => {
                alert('Link copied to clipboard!');
            });
        }
    }
};

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
    image.src = artwork.imageHigh || artwork.image || './images/placeholder/artwork-placeholder.svg';
    
    image.onload = function() {
        image.classList.remove('loading');
        setTimeout(() => {
            initializeImageZoom();
            addZoomControls();
        }, 100);
    };

    image.onerror = function() {
        image.src = './images/placeholder/artwork-placeholder.svg';
        image.classList.remove('loading');
    };

    // Set artwork details
    const elements = {
        'artworkTitle': artwork.title || 'Untitled',
        'artworkTitleEn': artwork.titleEn || '',
        'artworkDescription': artwork.description || 'No description available',
        'artworkYear': artwork.year || 'Unknown',
        'artworkSize': artwork.sizeCm || 'Size not specified',
        'artworkMedium': artwork.mediumEn || artwork.format || 'Medium not specified',
        'artworkFormat': artwork.format || 'Format not specified'
    };

    Object.entries(elements).forEach(([id, text]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    });

    const statusEl = document.getElementById('availabilityStatus');
    if (statusEl && portfolio) {
        const isAvailable = portfolio.getBooleanValue(artwork, 'available', true);
        statusEl.textContent = isAvailable ? 'Available for Purchase' : 'Sold';
        statusEl.className = `availability-status ${isAvailable ? 'available' : 'sold'}`;
    }

    const tagsEl = document.getElementById('artworkTags');
    if (tagsEl) {
        if (artwork.tags && artwork.tags.length > 0) {
            tagsEl.innerHTML = artwork.tags.map(tag => `<span class="tag">#${tag}</span>`).join('');
        } else {
            tagsEl.innerHTML = '';
        }
    }
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

function handleWheelZoom(e) {
    e.preventDefault();
    e.stopPropagation();
    
    if (isZoomBlocked) {
        return;
    }
    
    isZoomBlocked = true;
    console.log('✅ ZOOM ACCEPTED - IMMEDIATE RESPONSE');
    
    const step = 0.3;
    const oldZoom = zoomLevel;
    
    if (e.deltaY < 0) {
        console.log('📈 ZOOMING IN');
        zoomLevel = Math.min(zoomLevel + step, maxZoom);
    } else {
        console.log('📉 ZOOMING OUT');
        zoomLevel = Math.max(zoomLevel - step, minZoom);
        if (zoomLevel <= minZoom) {
            panX = 0;
            panY = 0;
        }
    }
    
    zoomLevel = Math.round(zoomLevel * 100) / 100;
    console.log('ZOOM:', oldZoom, '→', zoomLevel);
    
    if (oldZoom !== zoomLevel) {
        if (zoomLevel > 1 && !isFullscreenMode) {
            console.log('🖥️ AUTO-FULLSCREEN on zoom');
            enterImageFullscreen();
        }
        if (zoomLevel <= 1 && isFullscreenMode) {
            exitImageFullscreen();
        }
        
        updateCursor();
        applyTransform();
        showCleanZoomIndicator();
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
    
    if (zoomLevel > 1) {
        currentImage.style.cursor = isDragging ? 'grabbing' : 'grab';
    } else if (zoomLevel < maxZoom) {
        currentImage.style.cursor = 'zoom-in';
    } else {
        currentImage.style.cursor = 'zoom-out';
    }
}

function constrainPan() {
    if (zoomLevel <= 1) {
        panX = 0;
        panY = 0;
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
    if (zoomLevel <= 1) return;
    
    isDragging = true;
    hasDragged = false;
    startX = e.clientX - panX;
    startY = e.clientY - panY;
    updateCursor();
    e.preventDefault();
}

function handleMouseMove(e) {
    if (!isDragging || zoomLevel <= 1) return;
    
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
}

function showFullscreenIndicator(entering) {
    const existingIndicator = document.querySelector('.fullscreen-indicator');
    if (existingIndicator) {
        existingIndicator.remove();
    }
    
    const indicator = document.createElement('div');
    indicator.className = 'fullscreen-indicator';
    indicator.innerHTML = entering ? 
        '📱 <span>Fullscreen View</span>' : 
        '🖼️ <span>Split View</span>';
    
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
    const existingControls = document.querySelector('.zoom-controls');
    if (existingControls) {
        existingControls.remove();
    }
    
    const lightboxControls = document.querySelector('.lightbox-controls');
    if (!lightboxControls) return;
    
    const zoomControls = document.createElement('div');
    zoomControls.className = 'zoom-controls';
    
    zoomControls.innerHTML = `
        <button class="control-btn zoom-in-btn" onclick="zoomIn();" title="Zoom In (+)">+</button>
        <button class="control-btn zoom-out-btn" onclick="zoomOut();" title="Zoom Out (-)">−</button>
        <button class="control-btn zoom-fullscreen-btn" onclick="toggleFullscreenZoom();" title="Toggle Fullscreen">⛶</button>
    `;
    
    lightboxControls.insertBefore(zoomControls, lightboxControls.firstChild);
}

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

console.log('🎨 Clean Lightbox v7.0 loaded - NO TEXT in zoom indicators!');