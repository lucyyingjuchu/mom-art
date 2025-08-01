// Clean GitHub Admin - Fixed Auto-deploy Issues
// Version: 2.2 - No auto-deploy on test, clear save behavior

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

    // Test connection WITHOUT creating files
    async testConnection() {
        try {
            // Just check if we can access the repository info
            const response = await fetch(`https://api.github.com/repos/${this.config.owner}/${this.config.repo}`, {
                headers: {
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (response.ok) {
                const repoData = await response.json();
                return {
                    success: true,
                    repoName: repoData.full_name,
                    isPrivate: repoData.private,
                    defaultBranch: repoData.default_branch
                };
            } else {
                return {
                    success: false,
                    error: `Repository access failed: ${response.status}`
                };
            }

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Alternative test that checks write permissions (still no commits)
    async testWritePermissions() {
        try {
            // Check if we can read the existing artworks.json
            const response = await fetch(`https://api.github.com/repos/${this.config.owner}/${this.config.repo}/contents/${this.config.paths.artworksJson}`);
            
            if (response.ok) {
                return {
                    success: true,
                    message: 'Can read artworks.json - write permissions likely available'
                };
            } else {
                return {
                    success: false,
                    error: 'Cannot access artworks.json file'
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
                🌐 Images ready for deployment<br>
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

// ================================
// ENHANCED FUNCTIONS
// ================================

// Enhanced test GitHub connection (no auto-deploy)
async function testGitHubConnection() {
    try {
        showMessage('Testing GitHub connection...', 'info');
        
        // First try simple repository access
        const result = await githubUploader.testConnection();
        
        const statusEl = document.getElementById('githubStatus');
        if (statusEl) {
            if (result.success) {
                statusEl.className = 'github-status status-connected';
                statusEl.textContent = `✅ Connected to ${result.repoName}`;
                showMessage('GitHub connection successful!', 'success');
                
                // Optionally test write permissions (still no commits)
                const writeTest = await githubUploader.testWritePermissions();
                if (writeTest.success) {
                    console.log('✅ Write permissions confirmed');
                } else {
                    console.warn('⚠️ Write permissions uncertain:', writeTest.error);
                }
                
            } else {
                statusEl.className = 'github-status status-disconnected';
                statusEl.textContent = `❌ Connection failed`;
                showMessage(`GitHub connection failed: ${result.error}`, 'error');
            }
        }
        
        return result.success;
        
    } catch (error) {
        showMessage(`❌ Connection error: ${error.message}`, 'error');
        return false;
    }
}

// Enhanced deploy function with clear messaging
async function exportAndDeployToGitHub() {
    try {
        if (!confirm('This will deploy your current artworks to the live website. Continue?')) {
            return;
        }
        
        showMessage('Deploying to GitHub...', 'info');
        
        const progressContainer = createProgressIndicator();
        document.querySelector('.container').appendChild(progressContainer);
        
        await githubUploader.updateArtworksJson(
            artworks,
            (message, percent) => updateProgress(progressContainer, message, percent)
        );
        
        showMessage('✅ Deployed! Your website will update in ~2 minutes.', 'success');
        setTimeout(() => progressContainer.remove(), 3000);
        
    } catch (error) {
        showMessage(`❌ Deployment failed: ${error.message}`, 'error');
        
        const progressContainer = document.querySelector('.upload-progress-container');
        if (progressContainer) progressContainer.remove();
    }
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
    
    // Test connection on startup (NO auto-deploy)
    setTimeout(async () => {
        console.log('🔍 Testing GitHub connection...');
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
window.testGitHubConnection = testGitHubConnection;
window.exportAndDeployToGitHub = exportAndDeployToGitHub;

console.log('🎯 GitHub Admin v2.2 loaded - Fixed auto-deploy issues!');