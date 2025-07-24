// lightbox.js - Separate Premium Lightbox Module
// This file handles all lightbox functionality for the art portfolio

// Wait for both DOM and portfolio to be ready
document.addEventListener('DOMContentLoaded', function() {
    // Check if portfolio is loaded, if not wait for it
    function initializeLightbox() {
        if (typeof portfolio === 'undefined') {
            // Portfolio not loaded yet, wait 100ms and try again
            setTimeout(initializeLightbox, 100);
            return;
        }
        
        console.log('Lightbox initialized with portfolio');
        setupLightboxEventListeners();
    }
    
    initializeLightbox();
});

// Global lightbox state
let currentArtworkIndex = 0;
let artworksData = [];

// Main lightbox functions
function openLightbox(artworkId) {
    // Check if portfolio is available
    if (typeof portfolio === 'undefined') {
        console.error('Portfolio not loaded yet');
        return;
    }
    
    const artwork = portfolio.getArtwork(artworkId);
    if (!artwork) {
        console.error('Artwork not found:', artworkId);
        return;
    }

    // Find current artwork index for navigation
    currentArtworkIndex = portfolio.artworks.findIndex(a => a.id === artworkId);
    artworksData = portfolio.artworks;

    populateLightbox(artwork);
    
    const lightbox = document.getElementById('lightbox');
    if (lightbox) {
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function populateLightbox(artwork) {
    // Set image with error handling
    const image = document.getElementById('lightboxImage');
    if (image) {
        image.classList.add('loading');
        image.src = artwork.imageHigh || artwork.image || './images/placeholder/artwork-placeholder.svg';
        
        image.onload = function() {
            image.classList.remove('loading');
        };
        
        image.onerror = function() {
            image.src = './images/placeholder/artwork-placeholder.svg';
            image.classList.remove('loading');
        };
    }

    // Set artwork details with null checks
    const elements = {
        'artworkTitle': artwork.title || 'Untitled',
        'artworkTitleEn': artwork.titleEn || '',
        'artworkDescription': artwork.description || 'No description available',
        'artworkYear': artwork.year || 'Unknown',
        'artworkSize': artwork.sizeCm || 'Size not specified',
        'artworkMedium': artwork.mediumEn || artwork.format || 'Medium not specified',
        'artworkFormat': artwork.format || 'Format not specified'
    };

    // Update all elements safely
    Object.entries(elements).forEach(([id, text]) => {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = text;
        } else {
            console.warn(`Element with id '${id}' not found`);
        }
    });

    // Set availability status
    const statusEl = document.getElementById('availabilityStatus');
    if (statusEl && portfolio) {
        const isAvailable = portfolio.getBooleanValue(artwork, 'available', true);
        statusEl.textContent = isAvailable ? 'Available for Purchase' : 'Sold';
        statusEl.className = `availability-status ${isAvailable ? 'available' : 'sold'}`;
    }

    // Set tags
    const tagsEl = document.getElementById('artworkTags');
    if (tagsEl) {
        if (artwork.tags && artwork.tags.length > 0) {
            tagsEl.innerHTML = artwork.tags.map(tag => `<span class="tag">#${tag}</span>`).join('');
        } else {
            tagsEl.innerHTML = '';
        }
    }
}

function closeLightbox() {
    const lightbox = document.getElementById('lightbox');
    if (lightbox) {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
        
        // Reset image zoom
        const image = document.getElementById('lightboxImage');
        if (image) {
            image.classList.remove('zoomed');
        }
    }
}

function navigateArtwork(direction) {
    if (!artworksData.length) return;
    
    if (direction === 'prev') {
        currentArtworkIndex = currentArtworkIndex > 0 ? currentArtworkIndex - 1 : artworksData.length - 1;
    } else {
        currentArtworkIndex = currentArtworkIndex < artworksData.length - 1 ? currentArtworkIndex + 1 : 0;
    }
    
    populateLightbox(artworksData[currentArtworkIndex]);
}

function toggleImageZoom() {
    const image = document.getElementById('lightboxImage');
    if (image) {
        image.classList.toggle('zoomed');
    }
}

function downloadImage() {
    const image = document.getElementById('lightboxImage');
    if (image && image.src) {
        const link = document.createElement('a');
        link.href = image.src;
        link.download = 'artwork.jpg';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

function shareArtwork() {
    const titleEl = document.getElementById('artworkTitle');
    const descEl = document.getElementById('artworkDescription');
    
    if (navigator.share && titleEl && descEl) {
        navigator.share({
            title: titleEl.textContent,
            text: descEl.textContent,
            url: window.location.href
        }).catch(console.error);
    } else {
        // Fallback: copy URL to clipboard
        if (navigator.clipboard) {
            navigator.clipboard.writeText(window.location.href).then(() => {
                alert('Link copied to clipboard!');
            }).catch(() => {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = window.location.href;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                alert('Link copied to clipboard!');
            });
        }
    }
}

// Setup event listeners
function setupLightboxEventListeners() {
    // Close lightbox on background click
    const lightbox = document.getElementById('lightbox');
    if (lightbox) {
        lightbox.addEventListener('click', function(e) {
            if (e.target === this) {
                closeLightbox();
            }
        });
    }

    // Keyboard navigation
    document.addEventListener('keydown', function(e) {
        const lightbox = document.getElementById('lightbox');
        if (!lightbox || !lightbox.classList.contains('active')) return;

        switch(e.key) {
            case 'Escape':
                closeLightbox();
                break;
            case 'ArrowLeft':
                navigateArtwork('prev');
                break;
            case 'ArrowRight':
                navigateArtwork('next');
                break;
            case ' ': // Spacebar
                e.preventDefault();
                toggleImageZoom();
                break;
        }
    });
}

// Make functions globally available
window.openLightbox = openLightbox;
window.closeLightbox = closeLightbox;
window.navigateArtwork = navigateArtwork;
window.toggleImageZoom = toggleImageZoom;
window.downloadImage = downloadImage;
window.shareArtwork = shareArtwork;

// Debug helper
window.debugLightbox = function() {
    console.log('Portfolio available:', typeof portfolio !== 'undefined');
    console.log('Artworks count:', portfolio ? portfolio.artworks.length : 'N/A');
    console.log('Current artwork index:', currentArtworkIndex);
    console.log('Lightbox element:', document.getElementById('lightbox'));
};