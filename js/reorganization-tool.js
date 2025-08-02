// Enhanced Reorganization Tool with Automatic File Operations
// Handles ID changes, file renaming, and thumbnail generation

console.log('🛠️ Loading Enhanced Reorganization Tool with File Operations...');

// Function to detect artworks that need processing (ID changes OR missing thumbnails)
async function detectArtworksNeedingProcessing(artworksList) {
    console.log('🔍 Detecting artworks needing processing...');
    
    const needsProcessing = [];
    
    for (const artwork of artworksList) {
        const currentYear = artwork.year || 'unknown';
        const idYear = extractYearFromId(artwork.id);
        const needsIdChange = idYear && idYear !== currentYear;
        
        // Generate what the new ID would be (we'll calculate proper sequence later)
        const tempNewId = `${currentYear}_temp`;
        
        // Check for missing thumbnail
        const thumbnailPath = `images/paintings/thumbnails/${artwork.id}_thumb.png`;
        const hasThumbnailField = artwork.image && artwork.image.trim() !== '';
        
        // We'll check if file actually exists during processing, for now assume missing if no field
        const likelyMissingThumbnail = !hasThumbnailField;
        
        if (needsIdChange || likelyMissingThumbnail) {
            needsProcessing.push({
                artwork: artwork,
                reasons: {
                    idChange: needsIdChange,
                    missingThumbnail: likelyMissingThumbnail,
                    oldYear: idYear,
                    newYear: currentYear
                }
            });
        }
    }
    
    console.log(`📋 Found ${needsProcessing.length} artworks needing processing:`);
    needsProcessing.forEach(item => {
        const reasons = [];
        if (item.reasons.idChange) reasons.push(`year change: ${item.reasons.oldYear} → ${item.reasons.newYear}`);
        if (item.reasons.missingThumbnail) reasons.push('missing thumbnail');
        console.log(`  • ${item.artwork.id}: ${item.artwork.title} (${reasons.join(', ')})`);
    });
    
    return needsProcessing;
}

// Function to extract year from artwork ID (keeping existing function)
function extractYearFromId(id) {
    if (!id) return null;
    
    // Handle unknown IDs
    if (id.startsWith('unknown_')) return 'unknown';
    
    // Extract year from format like "2022_001", "2022.8_001", etc.
    const yearMatch = id.match(/^(\d{4}(?:\.\d+)?)_/);
    return yearMatch ? yearMatch[1] : null;
}

// Enhanced reorganization function with file operations
function reorganizeArtworks() {
    console.log('🔧 Starting enhanced reorganization with file operations...');
    
    // Check if artworks exist
    if (typeof window.artworks === 'undefined' || !window.artworks || window.artworks.length === 0) {
        console.error('❌ No artworks found in window.artworks');
        return null;
    }
    
    const artworksList = window.artworks;
    console.log(`📊 Found ${artworksList.length} artworks to reorganize`);
    
    // Sort artworks by year, then by title
    const sorted = [...artworksList].sort((a, b) => {
        const yearA = parseInt(a.year) || 9999;
        const yearB = parseInt(b.year) || 9999;
        
        if (yearA !== yearB) {
            return yearA - yearB;
        }
        
        return (a.title || '').localeCompare(b.title || '');
    });
    
    // Group by year and assign sequential IDs
    const yearGroups = {};
    sorted.forEach(artwork => {
        const year = artwork.year || 'unknown';
        if (!yearGroups[year]) {
            yearGroups[year] = [];
        }
        yearGroups[year].push(artwork);
    });
    
    const reorganizedArtworks = [];
    const artworksToProcess = []; // Track artworks that need file operations
    let changesCount = 0;
    let fileOperationsCount = 0;
    
    Object.keys(yearGroups).sort().forEach(year => {
        const yearArtworks = yearGroups[year];
        
        yearArtworks.forEach((artwork, index) => {
            const oldId = artwork.id;
            const oldYear = extractYearFromId(oldId);
            const newId = year === 'unknown' ? 
                `unknown_${String(index + 1).padStart(3, '0')}` :
                `${year}_${String(index + 1).padStart(3, '0')}`;
            
            // Check if this artwork needs file operations
            const needsIdChange = oldId !== newId;
            const hasThumbnailField = artwork.image && artwork.image.trim() !== '';
            
            if (needsIdChange || !hasThumbnailField) {
                artworksToProcess.push({
                    artwork: artwork,
                    newId: newId,
                    needsIdChange: needsIdChange,
                    needsThumbnail: !hasThumbnailField,
                    isYearChange: oldYear && oldYear !== year
                });
                fileOperationsCount++;
            }
            
            // Create updated artwork with new ID and corrected image paths
            const updatedArtwork = {
                ...artwork,
                id: newId,
                image: `./images/paintings/thumbnails/${newId}_thumb.png`,
                imageHigh: `./images/paintings/large/${newId}_large.png`
            };
            
            if (oldId !== newId) {
                const changeType = oldYear && oldYear !== year ? 'YEAR CHANGE' : 'ID UPDATE';
                console.log(`🔄 ${changeType}: ${oldId} → ${newId}: ${artwork.title}`);
                changesCount++;
            }
            
            reorganizedArtworks.push(updatedArtwork);
        });
    });
    
    // Store file operations for processing
    window.artworksToProcess = artworksToProcess;
    
    console.log(`✅ Reorganization plan complete:`);
    console.log(`  • Total artworks: ${reorganizedArtworks.length}`);
    console.log(`  • ID changes: ${changesCount}`);
    console.log(`  • File operations needed: ${fileOperationsCount}`);
    
    return reorganizedArtworks;
}

// Function to fix image extensions from .jpg to .png (keeping existing function)
function fixImageExtensions() {
    console.log('🔧 Fixing image extensions...');
    
    if (typeof window.artworks === 'undefined' || !window.artworks) {
        console.error('❌ No artworks found');
        return null;
    }
    
    let fixedCount = 0;
    const fixedArtworks = window.artworks.map(artwork => {
        const updatedArtwork = { ...artwork };
        
        // Fix thumbnail image extension
        if (updatedArtwork.image && updatedArtwork.image.includes('.jpg')) {
            updatedArtwork.image = updatedArtwork.image.replace('.jpg', '.png');
            fixedCount++;
        }
        
        // Fix large image extension
        if (updatedArtwork.imageHigh && updatedArtwork.imageHigh.includes('.jpg')) {
            updatedArtwork.imageHigh = updatedArtwork.imageHigh.replace('.jpg', '.png');
            fixedCount++;
        }
        
        return updatedArtwork;
    });
    
    console.log(`✅ Fixed ${fixedCount} image extensions`);
    return fixedArtworks;
}

// Enhanced function to generate corrected JSON data
function generateCorrectedJson() {
    console.log('📄 Generating corrected JSON with file operations...');
    
    // First fix image extensions
    const extensionFixed = fixImageExtensions();
    if (!extensionFixed) {
        console.error('❌ Failed to fix extensions');
        return null;
    }
    
    // Then reorganize IDs (this also identifies artworks needing file operations)
    window.artworks = extensionFixed;
    const reorganized = reorganizeArtworks();
    if (!reorganized) {
        console.error('❌ Failed to reorganize');
        return null;
    }
    
    return reorganized;
}

// Function to download JSON file (keeping existing function)
function downloadJsonFile(data, filename = 'artworks_fixed.json') {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log(`📥 Downloaded ${filename}`);
}

// Create progress indicator for file operations
function createFileOperationProgress() {
    const existing = document.getElementById('fileOperationProgress');
    if (existing) existing.remove();
    
    const progressDiv = document.createElement('div');
    progressDiv.id = 'fileOperationProgress';
    progressDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 2rem;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        z-index: 10000;
        min-width: 400px;
        text-align: center;
    `;
    
    progressDiv.innerHTML = `
        <h3 style="margin-bottom: 1rem; color: #2c3e50;">🔄 Processing Files</h3>
        <div style="width: 100%; height: 8px; background: #e9ecef; border-radius: 4px; margin: 1rem 0;">
            <div id="fileProgressBar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #28a745, #20c997); border-radius: 4px; transition: width 0.3s ease;"></div>
        </div>
        <div id="fileProgressText" style="color: #6c757d; font-size: 0.9rem;">Starting...</div>
    `;
    
    document.body.appendChild(progressDiv);
    return progressDiv;
}

// Enhanced main function with file operations
async function startCompleteReorganization() {
    console.log('🚀 Starting complete reorganization with file operations...');
    
    // Check if artworks are loaded
    if (typeof window.artworks === 'undefined' || !window.artworks || window.artworks.length === 0) {
        if (typeof window.showMessage === 'function') {
            window.showMessage('❌ No artworks found! Please make sure artworks are loaded first.', 'error');
        }
        console.error('❌ No artworks found in window.artworks');
        return;
    }
    
    console.log(`📊 Found ${window.artworks.length} artworks to process`);
    
    // Check if GitHub integration is available
    if (typeof window.githubUploader === 'undefined' || typeof window.processArtworksForReorganization === 'undefined') {
        window.showMessage('❌ GitHub file operations not available. Please ensure github-admin.js is loaded with the enhanced functions.', 'error');
        return;
    }
    
    try {
        // Generate corrected data (this identifies artworks needing file operations)
        const correctedData = generateCorrectedJson();
        
        if (!correctedData) {
            throw new Error('Failed to generate corrected data');
        }
        
        const artworksToProcess = window.artworksToProcess || [];
        
        // Prepare confirmation message
        let confirmMessage = `This will reorganize all ${window.artworks.length} artworks and fix image extensions.`;
        
        if (artworksToProcess.length > 0) {
            const yearChanges = artworksToProcess.filter(item => item.isYearChange).length;
            const thumbnailGen = artworksToProcess.filter(item => item.needsThumbnail).length;
            
            confirmMessage += `\n\n📁 File Operations Required:`;
            confirmMessage += `\n• ${artworksToProcess.length} artworks need file processing`;
            if (yearChanges > 0) confirmMessage += `\n• ${yearChanges} year changes (file renaming)`;
            if (thumbnailGen > 0) confirmMessage += `\n• ${thumbnailGen} missing thumbnails (generation)`;
            confirmMessage += `\n\nThis will automatically rename files and generate thumbnails via GitHub API.`;
        }
        
        confirmMessage += `\n\nContinue?`;
        
        // Confirm action
        const confirmed = confirm(confirmMessage);
        if (!confirmed) {
            console.log('❌ User cancelled reorganization');
            return;
        }
        
        // Process file operations if needed
        if (artworksToProcess.length > 0) {
            const progressModal = createFileOperationProgress();
            
            try {
                console.log(`🔄 Processing ${artworksToProcess.length} artworks for file operations...`);
                
                const fileResults = await window.processArtworksForReorganization(
                    artworksToProcess,
                    (message, percent) => {
                        document.getElementById('fileProgressBar').style.width = `${percent}%`;
                        document.getElementById('fileProgressText').textContent = message;
                    }
                );
                
                progressModal.remove();
                
                const successful = fileResults.filter(r => r.result.success).length;
                const failed = fileResults.filter(r => !r.result.success).length;
                
                console.log(`📁 File operations complete: ${successful} successful, ${failed} failed`);
                
                if (failed > 0) {
                    console.warn('⚠️ Some file operations failed, but continuing with JSON update...');
                }
                
            } catch (error) {
                progressModal.remove();
                throw new Error(`File operations failed: ${error.message}`);
            }
        }
        
        // Update the global artworks array
        window.artworks = correctedData;

        // Re-render the display
        if (typeof window.renderArtworks === 'function') {
            window.renderArtworks();
        }
        if (typeof window.updateStats === 'function') {
            window.updateStats();
        }

        // Deploy JSON to GitHub
        await window.githubUploader.updateArtworksJson(correctedData);
        
        let successMessage = '✅ Complete reorganization finished!';
        if (artworksToProcess.length > 0) {
            successMessage += ` Files processed: ${artworksToProcess.length} artworks.`;
        }
        successMessage += ' Website will update in ~2 minutes.';
        
        window.showMessage(successMessage, 'success');
        console.log('✅ Complete reorganization completed successfully');
        
    } catch (error) {
        console.error('❌ Reorganization failed:', error);
        
        // Remove progress modal if it exists
        const progressModal = document.getElementById('fileOperationProgress');
        if (progressModal) progressModal.remove();
        
        if (typeof window.showMessage === 'function') {
            window.showMessage(`❌ Reorganization failed: ${error.message}`, 'error');
        }
    }
}

// Make functions available globally (keeping existing exports and adding new ones)
window.reorganizeArtworks = reorganizeArtworks;
window.fixImageExtensions = fixImageExtensions;
window.generateCorrectedJson = generateCorrectedJson;
window.downloadJsonFile = downloadJsonFile;
window.startCompleteReorganization = startCompleteReorganization;
window.detectArtworksNeedingProcessing = detectArtworksNeedingProcessing;
window.extractYearFromId = extractYearFromId;

console.log('✅ Enhanced Reorganization Tool with File Operations loaded successfully!');