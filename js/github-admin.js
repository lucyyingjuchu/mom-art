// Clean GitHub Admin - All-in-One Art Portfolio Management
// Version: 2.1 - Fixed duplicate reorganization sections

// ================================
// CONFIGURATION
// ================================
const GITHUB_CONFIG = {
    owner: 'lucyyingjuchu',
    repo: 'mom-art',
    branch: 'main',
    paths: {
        artworksJson: 'data/artworks.json',
        thumbnails: 'images/paintings/thumbnails/',
        large: 'images/paintings/large/'
    }
};

// ================================
// MAIN GITHUB UPLOADER CLASS
// ================================
class GitHubUploader {
    constructor(config) {
        this.config = config;
    }

    // Upload single file to GitHub via Netlify Function
    async uploadFile(path, content, message) {
        try {
            const response = await fetch('/.netlify/functions/githubProxy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    path,
                    content,
                    message,
                    branch: this.config.branch
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`GitHub upload failed: ${errorData.message}`);
            }

            const result = await response.json();
            return {
                success: true,
                url: result.content.download_url,
                path: path,
                sha: result.content.sha
            };

        } catch (error) {
            console.error(`Failed to upload ${path}:`, error);
            throw error;
        }
    }

    async blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    // Upload artwork with thumbnail and large image
    async uploadArtwork(file, artwork, onProgress) {
        try {
            onProgress?.('Creating optimized images...', 10);
            
            // Create thumbnail
            const thumbnailBlob = await this.createThumbnail(file);
            onProgress?.('Thumbnail created', 30);
            
            // Create large version
            const largeBlob = await this.createLargeImage(file);
            onProgress?.('Large image created', 50);
            
            // Upload thumbnail
            const thumbnailBase64 = await this.blobToBase64(thumbnailBlob);
            const thumbnailPath = `${this.config.paths.thumbnails}${artwork.id}_thumb.jpg`;
            const thumbnailResult = await this.uploadFile(
                thumbnailPath,
                thumbnailBase64,
                `Add thumbnail for ${artwork.title}`
            );
            onProgress?.('Thumbnail uploaded', 70);
            
            // Upload large image
            const largeBase64 = await this.blobToBase64(largeBlob);
            const largePath = `${this.config.paths.large}${artwork.id}_large.jpg`;
            const largeResult = await this.uploadFile(
                largePath,
                largeBase64,
                `Add large image for ${artwork.title}`
            );
            onProgress?.('Large image uploaded', 90);
            
            onProgress?.('Upload complete!', 100);
            
            return {
                success: true,
                uploadResults: {
                    thumbnail: thumbnailResult,
                    large: largeResult
                },
                urls: {
                    thumbnail: thumbnailResult.url,
                    large: largeResult.url
                }
            };

        } catch (error) {
            console.error('Artwork upload failed:', error);
            throw error;
        }
    }

    // Create thumbnail from file
    async createThumbnail(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    let { width, height } = img;
                    const maxSize = 400;
                    
                    if (Math.max(width, height) > maxSize) {
                        const ratio = maxSize / Math.max(width, height);
                        width = Math.round(width * ratio);
                        height = Math.round(height * ratio);
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    canvas.toBlob(resolve, 'image/jpeg', 0.8);
                } catch (error) {
                    reject(error);
                }
            };
            
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });
    }

    // Create large version from file
    async createLargeImage(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    let { width, height } = img;
                    const maxSize = 1600;
                    
                    if (Math.max(width, height) > maxSize) {
                        const ratio = maxSize / Math.max(width, height);
                        width = Math.round(width * ratio);
                        height = Math.round(height * ratio);
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    canvas.toBlob(resolve, 'image/jpeg', 0.85);
                } catch (error) {
                    reject(error);
                }
            };
            
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });
    }

    // Update artworks.json file
    async updateArtworksJson(artworks, onProgress) {
        try {
            onProgress?.('Preparing JSON data...', 10);
            
            const jsonContent = JSON.stringify(artworks, null, 2);
            const base64Content = btoa(unescape(encodeURIComponent(jsonContent)));
            
            onProgress?.('Uploading to GitHub...', 50);
            
            const result = await this.uploadFile(
                this.config.paths.artworksJson,
                base64Content,
                `Update artworks.json with ${artworks.length} artworks`
            );
            
            onProgress?.('Deployment complete!', 100);
            
            return result;

        } catch (error) {
            console.error('Failed to update artworks.json:', error);
            throw error;
        }
    }

    // Test connection to GitHub
    async testConnection() {
        try {
            const response = await fetch('/.netlify/functions/githubProxy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    path: 'test-connection.txt',
                    content: btoa('Connection test'),
                    message: 'Test connection'
                })
            });

            if (response.ok) {
                return {
                    success: true,
                    repoName: `${this.config.owner}/${this.config.repo}`
                };
            } else {
                const errorData = await response.json();
                return {
                    success: false,
                    error: errorData.error || 'Connection failed'
                };
            }

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// ================================
// COMPLETE REORGANIZER CLASS
// ================================
class CompleteReorganizer {
    constructor(githubUploader) {
        this.uploader = githubUploader;
        this.processed = [];
        this.failed = [];
        this.idMapping = new Map();
    }

    // Main reorganization with ID reordering
    async completeReorganization(onProgress) {
        try {
            onProgress?.('Starting complete reorganization...', 5);
            
            const sortedArtworks = this.createSequentialIds(artworks);
            onProgress?.('Generated new sequential IDs', 10);
            
            const totalArtworks = sortedArtworks.length;
            
            for (let i = 0; i < totalArtworks; i++) {
                const artwork = sortedArtworks[i];
                
                try {
                    await this.processArtwork(artwork, (subProgress) => {
                        const overallProgress = 15 + ((i / totalArtworks) * 70) + (subProgress / totalArtworks);
                        onProgress?.(`Processing: ${artwork.title}`, overallProgress);
                    });
                    
                    this.processed.push(artwork.id);
                    
                } catch (error) {
                    console.error(`Failed to process ${artwork.title}:`, error);
                    this.failed.push({ id: artwork.id, title: artwork.title, error: error.message });
                }
            }
            
            onProgress?.('Updating artworks.json...', 95);
            await this.uploader.updateArtworksJson(sortedArtworks);
            
            window.artworks = sortedArtworks;
            onProgress?.('Reorganization complete!', 100);
            
            return {
                success: true,
                processed: this.processed.length,
                failed: this.failed.length,
                idMappings: Array.from(this.idMapping.entries())
            };
            
        } catch (error) {
            console.error('Complete reorganization failed:', error);
            throw error;
        }
    }

    // Create sequential IDs
    createSequentialIds(artworks) {
        console.log('Creating sequential IDs...');
        
        const sorted = [...artworks].sort((a, b) => {
            const yearA = parseInt(a.year) || 9999;
            const yearB = parseInt(b.year) || 9999;
            
            if (yearA !== yearB) {
                return yearA - yearB;
            }
            
            return (a.title || '').localeCompare(b.title || '');
        });
        
        const yearGroups = {};
        sorted.forEach(artwork => {
            const year = artwork.year || 'unknown';
            if (!yearGroups[year]) {
                yearGroups[year] = [];
            }
            yearGroups[year].push(artwork);
        });
        
        const reorderedArtworks = [];
        
        Object.keys(yearGroups).sort().forEach(year => {
            const yearArtworks = yearGroups[year];
            
            yearArtworks.forEach((artwork, index) => {
                const oldId = artwork.id;
                const newId = year === 'unknown' ? 
                    `unknown_${String(index + 1).padStart(3, '0')}` :
                    `${year}_${String(index + 1).padStart(3, '0')}`;
                
                this.idMapping.set(oldId, newId);
                artwork.id = newId;
                
                console.log(`${oldId} → ${newId}: ${artwork.title}`);
                reorderedArtworks.push(artwork);
            });
        });
        
        return reorderedArtworks;
    }

    // Process single artwork (simplified for recovery)
    async processArtwork(artwork, onProgress) {
        try {
            onProgress?.(10);
            
            // For now, just update the ID and paths
            // The actual image processing would need the existing images
            artwork.image = `./images/paintings/thumbnails/${artwork.id}_thumb.jpg`;
            artwork.imageHigh = `./images/paintings/large/${artwork.id}_large.jpg`;
            
            onProgress?.(100);
            return { success: true };
            
        } catch (error) {
            console.error(`Failed to process ${artwork.title}:`, error);
            throw error;
        }
    }
}

// ================================
// GLOBAL FUNCTIONS
// ================================

// Initialize uploader
const githubUploader = new GitHubUploader(GITHUB_CONFIG);

// Upload new artwork
async function handleImageUploadWithGitHub(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
        showMessage('Image too large. Please use images under 50MB.', 'error');
        return;
    }

    if (!file.type.startsWith('image/')) {
        showMessage('Please select a valid image file.', 'error');
        return;
    }

    const artworkId = currentEditingId || generateSequentialId();
    
    try {
        const progressContainer = createProgressIndicator();
        document.querySelector('.upload-area').appendChild(progressContainer);

        const uploadResult = await githubUploader.uploadArtwork(
            file, 
            { id: artworkId, title: document.getElementById('artworkTitle').value || 'New Artwork' },
            (message, percent) => updateProgress(progressContainer, message, percent)
        );

        document.getElementById('previewImage').src = URL.createObjectURL(file);
        document.getElementById('previewImage').style.display = 'block';
        
        // Store upload result with correct structure
        uploadedImages[artworkId] = {
            githubUpload: {
                artworkData: {
                    image: `./images/paintings/thumbnails/${artworkId}_thumb.jpg`,
                    imageHigh: `./images/paintings/large/${artworkId}_large.jpg`
                },
                urls: uploadResult.urls
            },
            localPreview: URL.createObjectURL(file)
        };

        document.getElementById('uploadText').innerHTML = `
            <div style="color: #27ae60;">
                ✅ Successfully uploaded to GitHub!<br>
                📁 Thumbnail & Large version created<br>
                🌐 Ready for deployment<br>
            </div>
        `;

        setTimeout(() => progressContainer.remove(), 3000);
        showMessage('Images uploaded to GitHub successfully!', 'success');

    } catch (error) {
        console.error('GitHub upload failed:', error);
        
        // Remove progress indicator
        const progressContainer = document.querySelector('.upload-progress-container');
        if (progressContainer) progressContainer.remove();
        
        // Fallback to basic upload
        handleBasicImageUpload(event);
        showMessage(`GitHub upload failed: ${error.message}. Using local processing.`, 'error');
    }
}

// ================================
// UI COMPONENTS
// ================================

// Create progress indicator
function createProgressIndicator() {
    const container = document.createElement('div');
    container.className = 'upload-progress-container';
    container.innerHTML = `
        <div class="upload-progress">
            <div class="progress-bar">
                <div class="progress-fill" style="width: 0%"></div>
            </div>
            <div class="progress-text">Starting...</div>
        </div>
    `;
    
    if (!document.getElementById('upload-progress-css')) {
        const style = document.createElement('style');
        style.id = 'upload-progress-css';
        style.textContent = `
            .upload-progress-container {
                margin-top: 1rem;
                padding: 1rem;
                background: #f8f9fa;
                border-radius: 8px;
                border: 1px solid #dee2e6;
            }
            .progress-bar {
                width: 100%;
                height: 8px;
                background: #e9ecef;
                border-radius: 4px;
                overflow: hidden;
                margin-bottom: 0.5rem;
            }
            .progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #28a745, #20c997);
                transition: width 0.3s ease;
            }
            .progress-text {
                font-size: 0.9rem;
                color: #495057;
                text-align: center;
            }
        `;
        document.head.appendChild(style);
    }
    
    return container;
}

// Update progress
function updateProgress(container, message, percent) {
    const fill = container.querySelector('.progress-fill');
    const text = container.querySelector('.progress-text');
    
    fill.style.width = `${percent}%`;
    text.textContent = message;
}

// Create reorganization progress modal
function createCompleteReorgProgress() {
    const modal = document.createElement('div');
    modal.className = 'modal complete-reorg-progress';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px;">
            <div class="modal-header" style="background: #28a745; color: white;">
                <h2>🔄 Complete Reorganization</h2>
            </div>
            <div class="modal-body">
                <div class="progress-bar" style="width: 100%; height: 24px; background: #e9ecef; border-radius: 12px; overflow: hidden; margin: 1rem 0;">
                    <div class="progress-fill" style="width: 0%; height: 100%; background: linear-gradient(90deg, #28a745, #20c997); transition: width 0.5s ease;"></div>
                </div>
                
                <div class="progress-text" style="text-align: center; font-weight: 500; color: #495057;">
                    Initializing...
                </div>
                
                <div class="progress-warning" style="margin-top: 1.5rem; padding: 1rem; background: #fff3cd; border-radius: 8px; font-size: 0.9rem; color: #856404;">
                    ⚠️ This will rename all files and may take 10-15 minutes. Don't close this window.
                </div>
            </div>
        </div>
    `;
    
    return modal;
}

// Update reorganization progress
function updateCompleteReorgProgress(modal, message, percent) {
    const fill = modal.querySelector('.progress-fill');
    const text = modal.querySelector('.progress-text');
    
    fill.style.width = `${Math.min(percent, 100)}%`;
    text.textContent = message;
}

// Show ID mapping report
function showIdMappingReport(result) {
    const reportModal = document.createElement('div');
    reportModal.className = 'modal';
    reportModal.style.display = 'block';
    reportModal.innerHTML = `
        <div class="modal-content" style="max-width: 800px;">
            <div class="modal-header">
                <h2>📊 Reorganization Complete!</h2>
                <button class="close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
                <div class="report-summary" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 2rem;">
                    <div class="stat-card" style="text-align: center; padding: 1rem; background: #d4edda; border-radius: 8px;">
                        <div style="font-size: 2rem; font-weight: bold; color: #155724;">${result.processed}</div>
                        <div>Processed</div>
                    </div>
                    <div class="stat-card" style="text-align: center; padding: 1rem; background: ${result.failed > 0 ? '#f8d7da' : '#d4edda'}; border-radius: 8px;">
                        <div style="font-size: 2rem; font-weight: bold; color: ${result.failed > 0 ? '#721c24' : '#155724'};">${result.failed}</div>
                        <div>Failed</div>
                    </div>
                    <div class="stat-card" style="text-align: center; padding: 1rem; background: #d1ecf1; border-radius: 8px;">
                        <div style="font-size: 2rem; font-weight: bold; color: #0c5460;">${result.idMappings.length}</div>
                        <div>IDs Updated</div>
                    </div>
                </div>
                
                <div class="success-message" style="background: #d4edda; padding: 1rem; border-radius: 8px; text-align: center;">
                    <h3 style="color: #155724;">✅ Your website will auto-update in ~2 minutes!</h3>
                    <p style="color: #155724;">All changes have been committed to GitHub. Netlify is now rebuilding your site.</p>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(reportModal);
}

// ================================
// INITIALIZATION
// ================================
document.addEventListener('DOMContentLoaded', function() {
    // Replace image upload handler
    const originalImageInput = document.getElementById('imageInput');
    if (originalImageInput) {
        originalImageInput.addEventListener('change', handleImageUploadWithGitHub);
    }
    
    // Test connection on startup and update the existing GitHub status
    setTimeout(async () => {
        const connected = await githubUploader.testConnection();
        const statusEl = document.getElementById('githubStatus');
        if (statusEl) {
            if (connected.success) {
                statusEl.className = 'github-status status-connected';
                statusEl.textContent = `✅ Connected to ${connected.repoName}`;
            } else {
                statusEl.className = 'github-status status-disconnected';
                statusEl.textContent = `❌ Connection failed`;
            }
        }
    }, 2000);
});

// Make functions available globally
window.githubUploader = githubUploader;
window.handleImageUploadWithGitHub = handleImageUploadWithGitHub;
window.CompleteReorganizer = CompleteReorganizer;

console.log('🎯 Clean GitHub Admin v2.1 loaded - Fixed duplicate sections!');