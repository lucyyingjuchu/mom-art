// reorganization-tool.js
// Complete Portfolio Reorganization Tool - Standalone
// Version: 4.0 - Clean, self-contained, with proper error handling

console.log('🔧 Loading Reorganization Tool v4.0...');

class CompleteReorganizer {
    constructor(githubUploader) {
        if (!githubUploader) {
            throw new Error('GitHub uploader is required');
        }
        
        this.uploader = githubUploader;
        this.processed = [];
        this.flagged = [];
        this.idMapping = new Map();
        this.errors = [];
        
        // Quality standards
        this.QUALITY_STANDARDS = {
            large: { minWidth: 1200, minFileSize: 200000 }, // 200KB min
            thumbnail: { minWidth: 300, maxWidth: 500, minFileSize: 50000 }, // 50KB min
            promotable: { minWidth: 1200, minFileSize: 150000 } // For promoting thumbnail to large
        };
        
        console.log('✅ CompleteReorganizer initialized');
    }

    // Main reorganization with sequential ID assignment
    async completeReorganization(onProgress) {
        try {
            console.log('🚀 Starting complete reorganization process');
            onProgress?.('Starting complete reorganization...', 5);
            
            // Step 1: Validate prerequisites
            await this.validatePrerequisites();
            
            // Step 2: Create sequential IDs (no gaps)
            const reorderedArtworks = this.createSequentialIds(window.artworks);
            onProgress?.('Generated sequential IDs without gaps', 10);
            
            const totalArtworks = reorderedArtworks.length;
            console.log(`📊 Processing ${totalArtworks} artworks`);
            
            // Step 3: Process each artwork's images
            for (let i = 0; i < totalArtworks; i++) {
                const artwork = reorderedArtworks[i];
                const oldId = Array.from(this.idMapping.entries()).find(([old, new_]) => new_ === artwork.id)?.[0];
                
                try {
                    const overallProgress = 15 + ((i / totalArtworks) * 70);
                    onProgress?.(`Processing: ${artwork.title}`, overallProgress);
                    
                    await this.processArtworkImages(artwork, oldId);
                    this.processed.push(artwork.id);
                    console.log(`✅ Processed: ${artwork.title}`);
                    
                } catch (error) {
                    console.error(`💥 Failed to process ${artwork.title}:`, error);
                    this.flagged.push({ 
                        id: artwork.id, 
                        title: artwork.title, 
                        issue: `Processing error: ${error.message}` 
                    });
                }
            }
            
            // Step 4: Update JSON with new structure
            onProgress?.('Updating artworks.json...', 90);
            await this.uploader.updateArtworksJson(reorderedArtworks);
            
            // Step 5: Clean up old image files
            onProgress?.('Cleaning up old files...', 95);
            await this.cleanupOldFiles();
            
            // Update global artworks array
            window.artworks = reorderedArtworks;
            onProgress?.('Reorganization complete!', 100);
            
            const result = {
                success: true,
                processed: this.processed.length,
                flagged: this.flagged.length,
                errors: this.errors.length,
                flaggedDetails: this.flagged,
                errorDetails: this.errors,
                idMappings: Array.from(this.idMapping.entries())
            };
            
            console.log('🎉 Reorganization completed successfully:', result);
            return result;
            
        } catch (error) {
            console.error('💥 Complete reorganization failed:', error);
            throw error;
        }
    }

    // Validate that everything is ready
    async validatePrerequisites() {
        console.log('🔍 Validating prerequisites...');
        
        // Check artworks exist
        if (!window.artworks || !Array.isArray(window.artworks) || window.artworks.length === 0) {
            throw new Error('No artworks found to reorganize');
        }
        
        // Test GitHub connection
        const connectionTest = await this.testGitHubAccess();
        if (!connectionTest.success) {
            throw new Error(`GitHub connection failed: ${connectionTest.error}`);
        }
        
        console.log('✅ All prerequisites validated');
    }

    // Test GitHub access
    async testGitHubAccess() {
        try {
            const response = await fetch(`https://api.github.com/repos/${this.uploader.config.owner}/${this.uploader.config.repo}`);
            
            if (!response.ok) {
                return {
                    success: false,
                    error: `Repository access failed: ${response.status}`
                };
            }
            
            return { success: true };
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Create sequential IDs without gaps
    createSequentialIds(artworks) {
        console.log('📝 Creating sequential IDs...');
        
        // Sort artworks by year, then by title
        const sorted = [...artworks].sort((a, b) => {
            const yearA = parseInt(a.year) || 9999;
            const yearB = parseInt(b.year) || 9999;
            
            if (yearA !== yearB) {
                return yearA - yearB;
            }
            
            return (a.title || '').localeCompare(b.title || '');
        });
        
        // Group by year
        const yearGroups = {};
        sorted.forEach(artwork => {
            const year = artwork.year || 'unknown';
            if (!yearGroups[year]) {
                yearGroups[year] = [];
            }
            yearGroups[year].push(artwork);
        });
        
        const reorderedArtworks = [];
        
        // Assign sequential IDs for each year
        Object.keys(yearGroups).sort().forEach(year => {
            const yearArtworks = yearGroups[year];
            console.log(`📅 Processing year ${year}: ${yearArtworks.length} artworks`);
            
            yearArtworks.forEach((artwork, index) => {
                const oldId = artwork.id;
                const newId = year === 'unknown' ? 
                    `unknown_${String(index + 1).padStart(3, '0')}` :
                    `${year}_${String(index + 1).padStart(3, '0')}`;
                
                // Store the mapping
                this.idMapping.set(oldId, newId);
                
                // Update artwork with new ID
                artwork.id = newId;
                
                console.log(`  📝 ${oldId} → ${newId}: ${artwork.title}`);
                reorderedArtworks.push(artwork);
            });
        });
        
        console.log(`✅ Created ${reorderedArtworks.length} sequential IDs`);
        return reorderedArtworks;
    }

    // Process images for a single artwork with quality checking
    async processArtworkImages(artwork, oldId) {
        const newId = artwork.id;
        console.log(`🎨 Processing images: ${oldId} → ${newId}`);
        
        // Check what images currently exist
        const existingImages = await this.checkExistingImages(oldId);
        
        let processResult;
        
        if (existingImages.large && existingImages.thumbnail) {
            // Scenario 1: Both exist
            processResult = await this.processBothExist(existingImages, newId, artwork.title);
        } else if (existingImages.large && !existingImages.thumbnail) {
            // Scenario 2: Only large exists
            processResult = await this.processOnlyLarge(existingImages, newId, artwork.title);
        } else if (!existingImages.large && existingImages.thumbnail) {
            // Scenario 3: Only thumbnail exists
            processResult = await this.processOnlyThumbnail(existingImages, newId, artwork.title);
        } else {
            // Scenario 4: No images exist
            processResult = await this.processNoImages(newId, artwork.title);
        }
        
        // Update artwork paths
        artwork.image = processResult.thumbnailPath;
        artwork.imageHigh = processResult.largePath;
        
        // Add any flags
        if (processResult.flag) {
            this.flagged.push({
                id: newId,
                title: artwork.title,
                issue: processResult.flag
            });
        }
        
        return processResult;
    }

    // Check what images currently exist for an artwork
    async checkExistingImages(oldId) {
        const result = { large: null, thumbnail: null };
        
        if (!oldId) return result;
        
        try {
            // Check for large image
            const largePath = `images/paintings/large/${oldId}_large.jpg`;
            try {
                const largeResponse = await fetch(`https://api.github.com/repos/${this.uploader.config.owner}/${this.uploader.config.repo}/contents/${largePath}`);
                if (largeResponse.ok) {
                    const largeData = await largeResponse.json();
                    result.large = {
                        path: largePath,
                        downloadUrl: largeData.download_url,
                        size: largeData.size
                    };
                    console.log(`  ✅ Found large: ${Math.round(largeData.size / 1024)}KB`);
                }
            } catch (e) {
                console.log(`  ❌ Large not found: ${largePath}`);
            }
            
            // Check for thumbnail
            const thumbPath = `images/paintings/thumbnails/${oldId}_thumb.jpg`;
            try {
                const thumbResponse = await fetch(`https://api.github.com/repos/${this.uploader.config.owner}/${this.uploader.config.repo}/contents/${thumbPath}`);
                if (thumbResponse.ok) {
                    const thumbData = await thumbResponse.json();
                    result.thumbnail = {
                        path: thumbPath,
                        downloadUrl: thumbData.download_url,
                        size: thumbData.size
                    };
                    console.log(`  ✅ Found thumbnail: ${Math.round(thumbData.size / 1024)}KB`);
                }
            } catch (e) {
                console.log(`  ❌ Thumbnail not found: ${thumbPath}`);
            }
            
        } catch (error) {
            console.error(`💥 Error checking images for ${oldId}:`, error);
        }
        
        return result;
    }

    // Scenario 1: Both thumbnail and large exist
    async processBothExist(existingImages, newId, title) {
        console.log(`📊 Processing both images for ${newId}`);
        
        // Download and check large image quality
        const largeBlob = await this.downloadImage(existingImages.large.downloadUrl);
        const largeQuality = await this.checkImageQuality(largeBlob);
        
        if (largeQuality.isGoodLarge) {
            // Good large image - keep it and recreate thumbnail
            const newThumbnail = await this.createThumbnailFromBlob(largeBlob);
            
            // Upload both with new names
            await this.uploadImageBlob(newThumbnail, `${this.uploader.config.paths.thumbnails}${newId}_thumb.jpg`, `Update thumbnail for ${title}`);
            await this.uploadImageBlob(largeBlob, `${this.uploader.config.paths.large}${newId}_large.jpg`, `Update large image for ${title}`);
            
            return {
                thumbnailPath: `./images/paintings/thumbnails/${newId}_thumb.jpg`,
                largePath: `./images/paintings/large/${newId}_large.jpg`,
                flag: null
            };
        } else {
            // Poor large image quality
            return {
                thumbnailPath: `./images/paintings/thumbnails/${newId}_thumb.jpg`,
                largePath: `./images/paintings/large/${newId}_large.jpg`,
                flag: `Large image quality insufficient (${largeQuality.width}×${largeQuality.height}, ${Math.round(largeQuality.fileSize/1024)}KB)`
            };
        }
    }

    // Scenario 2: Only large image exists
    async processOnlyLarge(existingImages, newId, title) {
        console.log(`📊 Processing only large image for ${newId}`);
        
        const largeBlob = await this.downloadImage(existingImages.large.downloadUrl);
        const largeQuality = await this.checkImageQuality(largeBlob);
        
        if (largeQuality.isGoodLarge) {
            // Good large - create thumbnail
            const newThumbnail = await this.createThumbnailFromBlob(largeBlob);
            
            // Upload both
            await this.uploadImageBlob(newThumbnail, `${this.uploader.config.paths.thumbnails}${newId}_thumb.jpg`, `Create thumbnail for ${title}`);
            await this.uploadImageBlob(largeBlob, `${this.uploader.config.paths.large}${newId}_large.jpg`, `Update large image for ${title}`);
            
            return {
                thumbnailPath: `./images/paintings/thumbnails/${newId}_thumb.jpg`,
                largePath: `./images/paintings/large/${newId}_large.jpg`,
                flag: null
            };
        } else {
            // Poor large image quality
            return {
                thumbnailPath: '',
                largePath: `./images/paintings/large/${newId}_large.jpg`,
                flag: `Large image quality insufficient (${largeQuality.width}×${largeQuality.height}, ${Math.round(largeQuality.fileSize/1024)}KB)`
            };
        }
    }

    // Scenario 3: Only thumbnail exists
    async processOnlyThumbnail(existingImages, newId, title) {
        console.log(`📊 Processing only thumbnail for ${newId}`);
        
        const thumbBlob = await this.downloadImage(existingImages.thumbnail.downloadUrl);
        const thumbQuality = await this.checkImageQuality(thumbBlob);
        
        if (thumbQuality.width >= this.QUALITY_STANDARDS.promotable.minWidth && 
            thumbQuality.fileSize >= this.QUALITY_STANDARDS.promotable.minFileSize) {
            // Good enough to promote to large image
            const newThumbnail = await this.createThumbnailFromBlob(thumbBlob);
            
            // Upload thumbnail as large, and create proper thumbnail
            await this.uploadImageBlob(newThumbnail, `${this.uploader.config.paths.thumbnails}${newId}_thumb.jpg`, `Create thumbnail for ${title}`);
            await this.uploadImageBlob(thumbBlob, `${this.uploader.config.paths.large}${newId}_large.jpg`, `Promote thumbnail to large for ${title}`);
            
            return {
                thumbnailPath: `./images/paintings/thumbnails/${newId}_thumb.jpg`,
                largePath: `./images/paintings/large/${newId}_large.jpg`,
                flag: null
            };
        } else {
            // Not good enough quality
            return {
                thumbnailPath: `./images/paintings/thumbnails/${newId}_thumb.jpg`,
                largePath: '',
                flag: `Only thumbnail exists, insufficient quality for large image (${thumbQuality.width}×${thumbQuality.height}, ${Math.round(thumbQuality.fileSize/1024)}KB)`
            };
        }
    }

    // Scenario 4: No images exist
    async processNoImages(newId, title) {
        console.log(`📊 No images found for ${newId}`);
        
        return {
            thumbnailPath: '',
            largePath: '',
            flag: 'No images found'
        };
    }

    // Helper functions for image processing
    async checkImageQuality(blob) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const quality = {
                    width: img.naturalWidth,
                    height: img.naturalHeight,
                    fileSize: blob.size,
                    isGoodLarge: img.naturalWidth >= this.QUALITY_STANDARDS.large.minWidth && 
                                blob.size >= this.QUALITY_STANDARDS.large.minFileSize
                };
                resolve(quality);
            };
            img.onerror = () => {
                resolve({ width: 0, height: 0, fileSize: blob.size, isGoodLarge: false });
            };
            img.src = URL.createObjectURL(blob);
        });
    }

    async downloadImage(url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to download image: ${response.status}`);
        }
        return await response.blob();
    }

    async createThumbnailFromBlob(blob) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                let { width, height } = img;
                const maxSize = 400;
                
                // Calculate new dimensions
                if (Math.max(width, height) > maxSize) {
                    const ratio = maxSize / Math.max(width, height);
                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                }
                
                canvas.width = width;
                canvas.height = height;
                
                // Draw and convert to blob
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, width, height);
                
                canvas.toBlob(resolve, 'image/jpeg', 0.8);
            };
            img.onerror = reject;
            img.src = URL.createObjectURL(blob);
        });
    }

    async uploadImageBlob(blob, path, message) {
        const base64 = await this.blobToBase64(blob);
        return await this.uploader.uploadFile(path, base64, message);
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

    async cleanupOldFiles() {
        console.log('🧹 Cleaning up old image files...');
        
        // Get list of old IDs that were changed
        const oldIds = Array.from(this.idMapping.keys());
        
        for (const oldId of oldIds) {
            try {
                // Try to delete old files (simplified for now)
                console.log(`🗑️ Would delete old files for ${oldId}`);
                // TODO: Implement actual file deletion
                
            } catch (error) {
                console.log(`⚠️ Could not clean up files for ${oldId}:`, error.message);
            }
        }
    }
}

// Enhanced UI functions for the reorganization tool
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

function updateCompleteReorgProgress(modal, message, percent) {
    const fill = modal.querySelector('.progress-fill');
    const text = modal.querySelector('.progress-text');
    
    fill.style.width = `${Math.min(percent, 100)}%`;
    text.textContent = message;
}

function showEnhancedIdMappingReport(result) {
    const reportModal = document.createElement('div');
    reportModal.className = 'modal';
    reportModal.style.display = 'block';
    reportModal.innerHTML = `
        <div class="modal-content" style="max-width: 900px;">
            <div class="modal-header">
                <h2>📊 Reorganization Complete!</h2>
                <button class="close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
                <div class="report-summary" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 2rem;">
                    <div class="stat-card" style="text-align: center; padding: 1rem; background: #d4edda; border-radius: 8px;">
                        <div style="font-size: 2rem; font-weight: bold; color: #155724;">${result.processed}</div>
                        <div>Successfully Processed</div>
                    </div>
                    <div class="stat-card" style="text-align: center; padding: 1rem; background: ${result.flagged > 0 ? '#fff3cd' : '#d4edda'}; border-radius: 8px;">
                        <div style="font-size: 2rem; font-weight: bold; color: ${result.flagged > 0 ? '#856404' : '#155724'};">${result.flagged}</div>
                        <div>Flagged for Review</div>
                    </div>
                    <div class="stat-card" style="text-align: center; padding: 1rem; background: #d1ecf1; border-radius: 8px;">
                        <div style="font-size: 2rem; font-weight: bold; color: #0c5460;">${result.idMappings.length}</div>
                        <div>IDs Reorganized</div>
                    </div>
                </div>
                
                ${result.flagged > 0 ? `
                <div class="flagged-items" style="margin-bottom: 2rem;">
                    <h4 style="color: #856404; margin-bottom: 1rem;">⚠️ Items Flagged for Review:</h4>
                    <div style="max-height: 200px; overflow-y: auto; background: #fff3cd; padding: 1rem; border-radius: 8px;">
                        ${result.flaggedDetails.map(item => `
                            <div style="margin-bottom: 0.5rem; padding: 0.5rem; background: white; border-radius: 4px;">
                                <strong>${item.id}</strong>: ${item.title}<br>
                                <small style="color: #856404;">${item.issue}</small>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
                
                <div class="success-message" style="background: #d4edda; padding: 1rem; border-radius: 8px; text-align: center;">
                    <h3 style="color: #155724;">✅ Reorganization Complete!</h3>
                    <p style="color: #155724;">All IDs are now sequential without gaps. Your website will auto-update in ~2 minutes.</p>
                    ${result.flagged > 0 ? `<p style="color: #856404; margin-top: 0.5rem;"><strong>Note:</strong> Please review flagged items and re-upload better quality images if needed.</p>` : ''}
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(reportModal);
}

// Main function to start reorganization
window.startCompleteReorganization = async function() {
    console.log('🔥 REORGANIZATION STARTED');
    
    // Check dependencies
    if (typeof githubUploader === 'undefined') {
        console.error('❌ githubUploader not found!');
        showMessage('❌ GitHub uploader not loaded. Please check github-admin.js', 'error');
        return;
    }
    
    if (!window.artworks || window.artworks.length === 0) {
        console.error('❌ No artworks found!');
        showMessage('❌ No artworks found to reorganize!', 'error');
        return;
    }
    
    console.log('✅ Dependencies found');
    console.log(`📊 Found ${window.artworks.length} artworks to reorganize`);
    
    // Confirm with user
    if (!confirm(`This will reorganize ${window.artworks.length} artworks and rename files. This process takes 10-15 minutes. Continue?`)) {
        return;
    }
    
    console.log('✅ User confirmed, starting reorganization...');
    
    try {
        // Create progress modal
        const progressModal = createCompleteReorgProgress();
        document.body.appendChild(progressModal);
        
        // Initialize reorganizer
        const reorganizer = new CompleteReorganizer(githubUploader);
        
        // Start reorganization
        const result = await reorganizer.completeReorganization((message, percent) => {
            console.log(`📈 Progress: ${percent}% - ${message}`);
            updateCompleteReorgProgress(progressModal, message, percent);
        });
        
        setTimeout(() => {
            progressModal.remove();
            
            if (result.success) {
                showMessage(
                    `✅ Reorganization complete! Processed: ${result.processed}, Flagged: ${result.flagged}`, 
                    'success'
                );
                
                showEnhancedIdMappingReport(result);
                
                // Reload the artworks display
                if (typeof renderArtworks === 'function') {
                    renderArtworks();
                }
                if (typeof updateStats === 'function') {
                    updateStats();
                }
            }
        }, 2000);
        
    } catch (error) {
        console.error('💥 Reorganization error:', error);
        showMessage(`❌ Reorganization failed: ${error.message}`, 'error');
        
        const progressModal = document.querySelector('.complete-reorg-progress');
        if (progressModal) progressModal.remove();
    }
};

console.log('✅ Reorganization Tool v4.0 loaded successfully!');