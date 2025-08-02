// Complete GitHub Admin - Fixed Large File Downloads and Thumbnail Generation
// Version: 2.6 - Handles files >1MB, consistent PNG extensions, proper blob handling

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

    // Convert blob to base64
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

    // Upload artwork with thumbnail and large image (for new uploads)
    async uploadArtwork(file, artwork, onProgress) {
        try {
            onProgress?.('Creating optimized images...', 10);
            
            // Create thumbnail (PNG format for consistency)
            const thumbnailBlob = await this.createImageFromFile(file, 400, 'thumbnail');
            onProgress?.('Thumbnail created', 30);
            
            // Create large version (PNG format for consistency)
            const largeBlob = await this.createImageFromFile(file, 1600, 'large');
            onProgress?.('Large image created', 50);
            
            // Upload thumbnail
            const thumbnailBase64 = await this.blobToBase64(thumbnailBlob);
            const thumbnailPath = `${this.config.paths.thumbnails}${artwork.id}_thumb.png`;
            const thumbnailResult = await this.uploadFile(
                thumbnailPath,
                thumbnailBase64,
                `Add thumbnail for ${artwork.title}`
            );
            onProgress?.('Thumbnail uploaded', 70);
            
            // Upload large image
            const largeBase64 = await this.blobToBase64(largeBlob);
            const largePath = `${this.config.paths.large}${artwork.id}_large.png`;
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

    // Create optimized image from file (handles both thumbnails and large images)
    async createImageFromFile(file, maxSize, type = 'thumbnail') {
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    let { width, height } = img;
                    
                    // Resize if needed
                    if (Math.max(width, height) > maxSize) {
                        const ratio = maxSize / Math.max(width, height);
                        width = Math.round(width * ratio);
                        height = Math.round(height * ratio);
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    // High quality settings
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Convert to PNG with appropriate quality
                    const quality = type === 'thumbnail' ? 0.8 : 0.9;
                    canvas.toBlob(resolve, 'image/png', quality);
                    
                } catch (error) {
                    reject(error);
                }
            };
            
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });
    }

    // Create optimized image from blob (for generating thumbnails from existing large images)
    async createImageFromBlob(blob, maxSize, type = 'thumbnail') {
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    let { width, height } = img;
                    
                    // Resize if needed
                    if (Math.max(width, height) > maxSize) {
                        const ratio = maxSize / Math.max(width, height);
                        width = Math.round(width * ratio);
                        height = Math.round(height * ratio);
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    // High quality settings
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Convert to PNG with appropriate quality
                    const quality = type === 'thumbnail' ? 0.8 : 0.9;
                    canvas.toBlob(resolve, 'image/png', quality);
                    
                    // Clean up object URL
                    URL.revokeObjectURL(img.src);
                    
                } catch (error) {
                    URL.revokeObjectURL(img.src);
                    reject(error);
                }
            };
            
            img.onerror = (error) => {
                URL.revokeObjectURL(img.src);
                reject(error);
            };
            
            img.src = URL.createObjectURL(blob);
        });
    }

    // FIXED: Download file from GitHub with proper large file handling (>1MB)
    async downloadFile(path) {
        try {
            console.log(`📥 Downloading ${path}...`);
            const response = await fetch(`https://api.github.com/repos/${this.config.owner}/${this.config.repo}/contents/${path}`, {
                headers: {
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (!response.ok) {
                if (response.status === 404) {
                    return { success: false, error: 'File not found', notFound: true };
                }
                throw new Error(`Download failed: ${response.status}`);
            }

            const data = await response.json();
            console.log(`📊 File size: ${data.size} bytes (${Math.round(data.size/1024)}KB)`);
            
            // GitHub Contents API limit is 1MB - use download_url for larger files
            if (data.size > 1048576 || !data.content) {
                console.log(`📁 Large file detected (${Math.round(data.size/1024/1024)}MB) - using download URL`);
                
                // Download the file directly using the download_url
                const downloadResponse = await fetch(data.download_url);
                if (!downloadResponse.ok) {
                    throw new Error(`Direct download failed: ${downloadResponse.status}`);
                }
                
                const blob = await downloadResponse.blob();
                console.log(`✅ Downloaded via URL: ${blob.size} bytes, type: ${blob.type}`);
                
                return {
                    success: true,
                    blob: blob,
                    sha: data.sha,
                    downloadUrl: data.download_url,
                    size: blob.size
                };
                
            } else {
                // Small file - use base64 content (original method)
                console.log(`📄 Small file - using base64 content`);
                
                try {
                    const cleanContent = data.content.replace(/\s/g, '');
                    console.log(`📊 Content length: ${cleanContent.length} chars`);
                    
                    if (!cleanContent || cleanContent.length === 0) {
                        throw new Error('Empty content received from GitHub');
                    }
                    
                    const binaryString = atob(cleanContent);
                    console.log(`📊 Decoded binary length: ${binaryString.length} bytes`);
                    
                    if (binaryString.length === 0) {
                        throw new Error('Base64 decoding resulted in empty data');
                    }
                    
                    // Create proper typed array
                    const bytes = new Uint8Array(binaryString.length);
                    for (let i = 0; i < binaryString.length; i++) {
                        bytes[i] = binaryString.charCodeAt(i);
                    }
                    
                    // Create blob with proper MIME type
                    const mimeType = path.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
                    const blob = new Blob([bytes], { type: mimeType });
                    
                    console.log(`✅ Created blob: ${blob.size} bytes, type: ${blob.type}`);

                    return {
                        success: true,
                        blob: blob,
                        sha: data.sha,
                        downloadUrl: data.download_url,
                        size: blob.size
                    };
                    
                } catch (decodeError) {
                    console.error('Base64 decode error:', decodeError);
                    throw new Error(`Failed to decode file content: ${decodeError.message}`);
                }
            }

        } catch (error) {
            console.error(`Failed to download ${path}:`, error);
            return { success: false, error: error.message };
        }
    }

    // Check if file exists on GitHub
    async checkFileExists(path) {
        try {
            const response = await fetch(`https://api.github.com/repos/${this.config.owner}/${this.config.repo}/contents/${path}`, {
                method: 'HEAD',
                headers: {
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    // Delete file from GitHub
    async deleteFile(path, message) {
        try {
            console.log(`🗑️ Deleting ${path}...`);
            
            // First get the file's SHA
            const fileInfo = await this.downloadFile(path);
            if (!fileInfo.success) {
                console.log(`File ${path} doesn't exist, skipping delete`);
                return { success: true, skipped: true };
            }

            const response = await fetch('/.netlify/functions/githubProxy', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    path,
                    message,
                    sha: fileInfo.sha,
                    branch: this.config.branch
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`GitHub delete failed: ${errorData.message}`);
            }

            return { success: true };

        } catch (error) {
            console.error(`Failed to delete ${path}:`, error);
            throw error;
        }
    }

    // Generate thumbnail from existing large image (consistent PNG format)
    async generateThumbnailFromLargeImage(largeImagePath, artworkId, onProgress) {
        try {
            onProgress?.('Downloading large image...', 10);
            
            // Download the large image
            const downloadResult = await this.downloadFile(largeImagePath);
            if (!downloadResult.success) {
                throw new Error(`Failed to download large image: ${downloadResult.error}`);
            }

            console.log(`📥 Downloaded ${downloadResult.size} bytes from ${largeImagePath}`);
            onProgress?.('Creating thumbnail...', 40);

            // Create thumbnail from the blob using consolidated function
            const thumbnailBlob = await this.createImageFromBlob(downloadResult.blob, 400, 'thumbnail');
            
            onProgress?.('Uploading thumbnail...', 70);

            // Upload thumbnail with consistent PNG extension
            const thumbnailBase64 = await this.blobToBase64(thumbnailBlob);
            const thumbnailPath = `${this.config.paths.thumbnails}${artworkId}_thumb.png`;
            const thumbnailResult = await this.uploadFile(
                thumbnailPath,
                thumbnailBase64,
                `Generate thumbnail for ${artworkId}`
            );

            onProgress?.('Thumbnail generated!', 100);

            return {
                success: true,
                thumbnailPath: thumbnailPath,
                thumbnailUrl: thumbnailResult.url
            };

        } catch (error) {
            console.error('Thumbnail generation failed:', error);
            throw error;
        }
    }

    // Rename file (download, upload with new name, delete old)
    async renameFile(oldPath, newPath, message, onProgress) {
        try {
            onProgress?.(`Renaming ${oldPath} to ${newPath}...`, 0);

            // Download existing file
            onProgress?.('Downloading existing file...', 20);
            const downloadResult = await this.downloadFile(oldPath);
            if (!downloadResult.success) {
                if (downloadResult.notFound) {
                    console.log(`File ${oldPath} not found, skipping rename`);
                    return { success: true, skipped: true };
                }
                throw new Error(`Failed to download ${oldPath}: ${downloadResult.error}`);
            }

            // Upload with new name
            onProgress?.('Uploading with new name...', 60);
            const base64Content = await this.blobToBase64(downloadResult.blob);
            await this.uploadFile(newPath, base64Content, message);

            // Delete old file
            onProgress?.('Deleting old file...', 80);
            await this.deleteFile(oldPath, `Remove old file after rename to ${newPath}`);

            onProgress?.('Rename complete!', 100);

            return { success: true };

        } catch (error) {
            console.error(`Failed to rename ${oldPath} to ${newPath}:`, error);
            throw error;
        }
    }

    // Process artwork for reorganization with consistent PNG extensions
    async processArtworkForReorganization(artwork, newId, onProgress) {
        try {
            const oldId = artwork.id;
            const operations = [];

            // Use consistent PNG extensions throughout
            const needsIdChange = oldId !== newId;
            const oldThumbnailPath = `${this.config.paths.thumbnails}${oldId}_thumb.png`;
            const oldLargePath = `${this.config.paths.large}${oldId}_large.png`;
            const newThumbnailPath = `${this.config.paths.thumbnails}${newId}_thumb.png`;
            const newLargePath = `${this.config.paths.large}${newId}_large.png`;

            onProgress?.(`Processing ${artwork.title}...`, 0);

            // Check what files exist
            const [thumbnailExists, largeExists] = await Promise.all([
                this.checkFileExists(oldThumbnailPath),
                this.checkFileExists(oldLargePath)
            ]);

            console.log(`📋 ${oldId}: thumbnail=${thumbnailExists}, large=${largeExists}`);

            if (!largeExists) {
                console.warn(`⚠️ No large image found for ${oldId}, skipping...`);
                return { success: true, skipped: true, reason: 'No large image found' };
            }

            // If ID changed, rename large image
            if (needsIdChange) {
                onProgress?.('Renaming large image...', 25);
                await this.renameFile(
                    oldLargePath, 
                    newLargePath, 
                    `Rename large image: ${oldId} → ${newId}`,
                    (subMessage, subProgress) => {
                        const adjustedProgress = 25 + (subProgress * 0.25);
                        onProgress?.(subMessage, adjustedProgress);
                    }
                );
                operations.push(`Renamed large: ${oldId} → ${newId}`);
            }

            // Generate/regenerate thumbnail (either missing or ID changed)
            if (!thumbnailExists || needsIdChange) {
                onProgress?.('Generating thumbnail...', 50);
                
                // If we renamed the large image, use new path, otherwise use old path
                const sourceImagePath = needsIdChange ? newLargePath : oldLargePath;
                
                await this.generateThumbnailFromLargeImage(
                    sourceImagePath, 
                    newId,
                    (subMessage, subProgress) => {
                        const adjustedProgress = 50 + (subProgress * 0.4);
                        onProgress?.(subMessage, adjustedProgress);
                    }
                );
                
                if (thumbnailExists && needsIdChange) {
                    // Delete old thumbnail if it existed and we renamed
                    await this.deleteFile(oldThumbnailPath, `Remove old thumbnail after rename`);
                    operations.push(`Regenerated and renamed thumbnail: ${oldId} → ${newId}`);
                } else {
                    operations.push(`Generated missing thumbnail: ${newId}`);
                }
            }

            onProgress?.('Processing complete!', 100);

            return {
                success: true,
                operations: operations,
                paths: {
                    thumbnail: newThumbnailPath,
                    large: newLargePath
                }
            };

        } catch (error) {
            console.error(`Failed to process artwork ${artwork.id}:`, error);
            throw error;
        }
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

    // Test write permissions
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

// Process multiple artworks for reorganization - PROPERLY GLOBAL
async function processArtworksForReorganization(artworksToProcess, onProgress) {
    console.log(`🔄 Processing ${artworksToProcess.length} artworks for reorganization...`);
    
    const results = [];
    const total = artworksToProcess.length;
    
    for (let i = 0; i < artworksToProcess.length; i++) {
        const { artwork, newId } = artworksToProcess[i];
        
        try {
            const overallProgress = (i / total) * 100;
            onProgress?.(`Processing ${i + 1}/${total}: ${artwork.title}`, overallProgress);
            
            const result = await githubUploader.processArtworkForReorganization(
                artwork, 
                newId,
                (subMessage, subProgress) => {
                    const adjustedProgress = overallProgress + (subProgress / total);
                    onProgress?.(subMessage, adjustedProgress);
                }
            );
            
            results.push({
                artwork: artwork,
                newId: newId,
                result: result
            });
            
        } catch (error) {
            console.error(`Failed to process ${artwork.id}:`, error);
            results.push({
                artwork: artwork,
                newId: newId,
                result: { success: false, error: error.message }
            });
        }
    }
    
    const successful = results.filter(r => r.result.success).length;
    const failed = results.filter(r => !r.result.success).length;
    
    console.log(`✅ Reorganization processing complete: ${successful} successful, ${failed} failed`);
    
    return results;
}

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
        
        // Store upload result with consistent PNG extensions
        uploadedImages[artworkId] = {
            githubUpload: {
                artworkData: {
                    image: `./images/paintings/thumbnails/${artworkId}_thumb.png`,
                    imageHigh: `./images/paintings/large/${artworkId}_large.png`
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
// TESTING/DEBUG FUNCTIONS
// ================================

// Test single thumbnail generation
async function testSingleThumbnailGeneration(artworkId) {
    console.log(`🧪 Testing thumbnail generation for ${artworkId}...`);
    
    try {
        const result = await githubUploader.generateThumbnailFromLargeImage(
            `images/paintings/large/${artworkId}_large.png`,
            artworkId,
            (message, percent) => {
                console.log(`${percent}%: ${message}`);
            }
        );
        
        console.log('✅ Test successful:', result);
        return result;
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        return { success: false, error: error.message };
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

// ================================
// MAKE FUNCTIONS AVAILABLE GLOBALLY
// ================================
window.githubUploader = githubUploader;
window.handleImageUploadWithGitHub = handleImageUploadWithGitHub;
window.testGitHubConnection = testGitHubConnection;
window.exportAndDeployToGitHub = exportAndDeployToGitHub;
window.processArtworksForReorganization = processArtworksForReorganization;
window.testSingleThumbnailGeneration = testSingleThumbnailGeneration;

console.log('🎯 GitHub Admin v2.6 loaded - Fixed large file downloads and thumbnail generation!');