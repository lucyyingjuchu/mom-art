// Complete Portfolio Reorganization Tool
// Version: 3.0 - With proper ID sequencing and image quality checking

class CompleteReorganizer {
    constructor(githubUploader) {
        this.uploader = githubUploader;
        this.processed = [];
        this.flagged = [];
        this.idMapping = new Map();
        
        // Quality standards
        this.QUALITY_STANDARDS = {
            large: { minWidth: 1200, minFileSize: 200000 }, // 200KB min
            thumbnail: { minWidth: 300, maxWidth: 500, minFileSize: 50000 }, // 50KB min
            promotable: { minWidth: 1200, minFileSize: 150000 } // For promoting thumbnail to large
        };
    }

    // Main reorganization with sequential ID assignment
    async completeReorganization(onProgress) {
        try {
            onProgress?.('Starting complete reorganization...', 5);
            
            // Step 1: Create sequential IDs (no gaps)
            const reorderedArtworks = this.createSequentialIds(artworks);
            onProgress?.('Generated sequential IDs without gaps', 10);
            
            const totalArtworks = reorderedArtworks.length;
            
            // Step 2: Process each artwork's images
            for (let i = 0; i < totalArtworks; i++) {
                const artwork = reorderedArtworks[i];
                const oldId = Array.from(this.idMapping.entries()).find(([old, new_]) => new_ === artwork.id)?.[0];
                
                try {
                    const overallProgress = 15 + ((i / totalArtworks) * 70);
                    onProgress?.(`Processing: ${artwork.title}`, overallProgress);
                    
                    await this.processArtworkImages(artwork, oldId);
                    this.processed.push(artwork.id);
                    
                } catch (error) {
                    console.error(`Failed to process ${artwork.title}:`, error);
                    this.flagged.push({ 
                        id: artwork.id, 
                        title: artwork.title, 
                        issue: `Processing error: ${error.message}` 
                    });
                }
            }
            
            // Step 3: Update JSON with new structure
            onProgress?.('Updating artworks.json...', 90);
            await this.uploader.updateArtworksJson(reorderedArtworks);
            
            // Step 4: Clean up old image files
            onProgress?.('Cleaning up old files...', 95);
            await this.cleanupOldFiles();
            
            // Update global artworks array
            window.artworks = reorderedArtworks;
            onProgress?.('Reorganization complete!', 100);
            
            return {
                success: true,
                processed: this.processed.length,
                flagged: this.flagged.length,
                flaggedDetails: this.flagged,
                idMappings: Array.from(this.idMapping.entries())
            };
            
        } catch (error) {
            console.error('Complete reorganization failed:', error);
            throw error;
        }
    }

    // Create sequential IDs without gaps
    createSequentialIds(artworks) {
        console.log('Creating sequential IDs...');
        
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
            
            yearArtworks.forEach((artwork, index) => {
                const oldId = artwork.id;
                const newId = year === 'unknown' ? 
                    `unknown_${String(index + 1).padStart(3, '0')}` :
                    `${year}_${String(index + 1).padStart(3, '0')}`;
                
                // Store the mapping
                this.idMapping.set(oldId, newId);
                
                // Update artwork with new ID
                artwork.id = newId;
                
                console.log(`${oldId} → ${newId}: ${artwork.title}`);
                reorderedArtworks.push(artwork);
            });
        });
        
        return reorderedArtworks;
    }

    // Process images for a single artwork with quality checking
    async processArtworkImages(artwork, oldId) {
        const newId = artwork.id;
        
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
                }
            } catch (e) {
                console.log(`Large image not found: ${largePath}`);
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
                }
            } catch (e) {
                console.log(`Thumbnail not found: ${thumbPath}`);
            }
            
        } catch (error) {
            console.error(`Error checking images for ${oldId}:`, error);
        }
        
        return result;
    }

    // Scenario 1: Both thumbnail and large exist
    async processBothExist(existingImages, newId, title) {
        console.log(`Processing both images for ${newId}`);
        
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
                thumbnailPath: existingImages.thumbnail ? `./images/paintings/thumbnails/${newId}_thumb.jpg` : '',
                largePath: existingImages.large ? `./images/paintings/large/${newId}_large.jpg` : '',
                flag: `Large image quality insufficient (${largeQuality.width}×${largeQuality.height}, ${Math.round(largeQuality.fileSize/1024)}KB)`
            };
        }
    }

    // Scenario 2: Only large image exists
    async processOnlyLarge(existingImages, newId, title) {
        console.log(`Processing only large image for ${newId}`);
        
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
                largePath: existingImages.large ? `./images/paintings/large/${newId}_large.jpg` : '',
                flag: `Large image quality insufficient (${largeQuality.width}×${largeQuality.height}, ${Math.round(largeQuality.fileSize/1024)}KB)`
            };
        }
    }

    // Scenario 3: Only thumbnail exists
    async processOnlyThumbnail(existingImages, newId, title) {
        console.log(`Processing only thumbnail for ${newId}`);
        
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
                thumbnailPath: existingImages.thumbnail ? `./images/paintings/thumbnails/${newId}_thumb.jpg` : '',
                largePath: '',
                flag: `Only thumbnail exists, insufficient quality for large image (${thumbQuality.width}×${thumbQuality.height}, ${Math.round(thumbQuality.fileSize/1024)}KB)`
            };
        }
    }

    // Scenario 4: No images exist
    async processNoImages(newId, title) {
        console.log(`No images found for ${newId}`);
        
        return {
            thumbnailPath: '',
            largePath: '',
            flag: 'No images found'
        };
    }

    // Check image quality
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

    // Download image from URL
    async downloadImage(url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to download image: ${response.status}`);
        }
        return await response.blob();
    }

    // Create thumbnail from image blob
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

    // Upload image blob to GitHub
    async uploadImageBlob(blob, path, message) {
        const base64 = await this.blobToBase64(blob);
        return await this.uploader.uploadFile(path, base64, message);
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

    // Clean up old image files
    async cleanupOldFiles() {
        console.log('Cleaning up old image files...');
        
        // Get list of old IDs that were changed
        const oldIds = Array.from(this.idMapping.keys());
        
        for (const oldId of oldIds) {
            try {
                // Try to delete old thumbnail
                const oldThumbPath = `images/paintings/thumbnails/${oldId}_thumb.jpg`;
                await this.deleteFileIfExists(oldThumbPath);
                
                // Try to delete old large image
                const oldLargePath = `images/paintings/large/${oldId}_large.jpg`;
                await this.deleteFileIfExists(oldLargePath);
                
            } catch (error) {
                console.log(`Could not clean up files for ${oldId}:`, error.message);
            }
        }
    }

    // Delete file if it exists
    async deleteFileIfExists(path) {
        try {
            // First check if file exists
            const response = await fetch(`https://api.github.com/repos/${this.uploader.config.owner}/${this.uploader.config.repo}/contents/${path}`);
            
            if (response.ok) {
                const fileData = await response.json();
                
                // Delete the file
                await fetch(`https://api.github.com/repos/${this.uploader.config.owner}/${this.uploader.config.repo}/contents/${path}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `token ${process.env.GITHUB_TOKEN}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        message: `Clean up old file: ${path}`,
                        sha: fileData.sha
                    })
                });
                
                console.log(`Deleted old file: ${path}`);
            }
        } catch (error) {
            console.log(`File ${path} does not exist or could not be deleted`);
        }
    }
}

// Enhanced reorganization report function
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

// Update the global reorganization function
window.startCompleteReorganization = async function() {
    if (typeof CompleteReorganizer !== 'undefined' && typeof githubUploader !== 'undefined') {
        if (!confirm('This will reorganize ALL artwork IDs sequentially and process all images. This process takes 10-15 minutes. Continue?')) {
            return;
        }
        
        showMessage('Starting complete reorganization...', 'info');
        
        try {
            const progressModal = createCompleteReorgProgress();
            document.body.appendChild(progressModal);
            
            const reorganizer = new CompleteReorganizer(githubUploader);
            const result = await reorganizer.completeReorganization((message, percent) => {
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
            console.error('Reorganization error:', error);
            showMessage(`❌ Reorganization failed: ${error.message}`, 'error');
            
            const progressModal = document.querySelector('.complete-reorg-progress');
            if (progressModal) progressModal.remove();
        }
    } else {
        showMessage('Complete reorganization not available. Please check github-admin.js', 'error');
    }
};

console.log('✅ Complete Reorganization Tool v3.0 loaded with quality checking!');