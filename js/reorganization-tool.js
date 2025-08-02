// Simple Reorganization Tool - Fixed Version
// This replaces the complex reorganization-tool.js file

console.log('🛠️ Loading Simple Reorganization Tool...');

// Simple reorganization function that works with the existing artworks array
function reorganizeArtworks() {
    console.log('🔧 Starting simple reorganization...');
    
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
    let changesCount = 0;
    
    Object.keys(yearGroups).sort().forEach(year => {
        const yearArtworks = yearGroups[year];
        
        yearArtworks.forEach((artwork, index) => {
            const oldId = artwork.id;
            const newId = year === 'unknown' ? 
                `unknown_${String(index + 1).padStart(3, '0')}` :
                `${year}_${String(index + 1).padStart(3, '0')}`;
            
            // Create updated artwork with new ID and corrected image paths
            const updatedArtwork = {
                ...artwork,
                id: newId,
                image: `./images/paintings/thumbnails/${newId}_thumb.png`,
                imageHigh: `./images/paintings/large/${newId}_large.png`
            };
            
            if (oldId !== newId) {
                console.log(`🔄 ${oldId} → ${newId}: ${artwork.title}`);
                changesCount++;
            }
            
            reorganizedArtworks.push(updatedArtwork);
        });
    });
    
    console.log(`✅ Reorganization complete: ${changesCount} artworks updated`);
    return reorganizedArtworks;
}

// Function to fix image extensions from .jpg to .png
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

// Function to generate corrected JSON data
function generateCorrectedJson() {
    console.log('📄 Generating corrected JSON...');
    
    // First fix image extensions
    const extensionFixed = fixImageExtensions();
    if (!extensionFixed) {
        console.error('❌ Failed to fix extensions');
        return null;
    }
    
    // Then reorganize IDs
    window.artworks = extensionFixed;
    const reorganized = reorganizeArtworks();
    if (!reorganized) {
        console.error('❌ Failed to reorganize');
        return null;
    }
    
    return reorganized;
}

// Function to download JSON file
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

// Main function that gets called by the admin interface
async function startCompleteReorganization() {
    console.log('🚀 Starting complete reorganization...');
    
    // Check if artworks are loaded
    if (typeof window.artworks === 'undefined' || !window.artworks || window.artworks.length === 0) {
        if (typeof window.showMessage === 'function') {
            window.showMessage('❌ No artworks found! Please make sure artworks are loaded first.', 'error');
        }
        console.error('❌ No artworks found in window.artworks');
        return;
    }
    
    console.log(`📊 Found ${window.artworks.length} artworks to process`);
    
    // Confirm action
    const confirmed = confirm(`This will reorganize all ${window.artworks.length} artworks and fix image extensions. Continue?`);
    if (!confirmed) {
        console.log('❌ User cancelled reorganization');
        return;
    }
    
    try {
        // Generate corrected data
        const correctedData = generateCorrectedJson();
        
        if (!correctedData) {
            throw new Error('Failed to generate corrected data');
        }
        
        // Update the global artworks array
        window.artworks = correctedData;

        // Re-render the display if functions are available
        if (typeof window.renderArtworks === 'function') {
            window.renderArtworks();
        }
        if (typeof window.updateStats === 'function') {
            window.updateStats();
        }

        // Deploy to GitHub
        if (typeof window.githubUploader !== 'undefined') {
            await window.githubUploader.updateArtworksJson(correctedData);
            window.showMessage('✅ Reorganization deployed to GitHub! Website will update in ~2 minutes.', 'success');
        } else {
            // Fallback: Download the corrected JSON file
            downloadJsonFile(correctedData, 'artworks_corrected.json');
            window.showMessage('⚠️ GitHub uploader not found. JSON file downloaded instead.', 'warning');
        }        
        // Show success message
        if (typeof window.showMessage === 'function') {
            window.showMessage(`✅ Reorganization complete! ${correctedData.length} artworks processed. JSON file downloaded.`, 'success');
        }
        
        console.log('✅ Reorganization completed successfully');
        
    } catch (error) {
        console.error('❌ Reorganization failed:', error);
        if (typeof window.showMessage === 'function') {
            window.showMessage(`❌ Reorganization failed: ${error.message}`, 'error');
        }
    }
}

// Make functions available globally
window.reorganizeArtworks = reorganizeArtworks;
window.fixImageExtensions = fixImageExtensions;
window.generateCorrectedJson = generateCorrectedJson;
window.downloadJsonFile = downloadJsonFile;
window.startCompleteReorganization = startCompleteReorganization;

console.log('✅ Simple Reorganization Tool loaded successfully!');