// Finerworks API Test File
// Create this as: js/finerworks-test.js

// ================================
// CONFIGURATION
// ================================
const FINERWORKS_TEST_CONFIG = {
    apiUrl: 'https://api.finerworks.com/v3',
    webApiKey: '272e858d-c387-4dc1-9eb5-eaf10170a3b4', // Replace with your actual key
    appKey: 'b9099fc5-f3c5-4870-a623-baec9d2f553d',        // Replace with your actual key
    testMode: true
};

// ================================
// API TEST FUNCTIONS
// ================================

// Test 1: Basic Connection Test
async function testAPIConnection() {
    console.log('🔧 Testing Finerworks API Connection...');
    
    try {
        const response = await fetch(`${FINERWORKS_TEST_CONFIG.apiUrl}/test_my_credentials`, {
            method: 'GET',
            headers: {
                'web_api_key': FINERWORKS_TEST_CONFIG.webApiKey,
                'app_key': FINERWORKS_TEST_CONFIG.appKey
            }
        });
        
        console.log('📡 Response Status:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Connection Success!', data);
            return { success: true, data };
        } else {
            const errorText = await response.text();
            console.error('❌ Connection Failed:', response.status, errorText);
            return { success: false, error: errorText };
        }
        
    } catch (error) {
        console.error('❌ Network Error:', error);
        return { success: false, error: error.message };
    }
}

// Test 2: Get Available Product Types
async function testGetProductTypes() {
    console.log('📦 Testing Product Types API...');
    
    try {
        const response = await fetch(`${FINERWORKS_TEST_CONFIG.apiUrl}/list_product_types`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'web_api_key': FINERWORKS_TEST_CONFIG.webApiKey,
                'app_key': FINERWORKS_TEST_CONFIG.appKey
            },
            body: JSON.stringify({}) // Empty body for listing
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Product Types:', data);
            return { success: true, data };
        } else {
            const errorText = await response.text();
            console.error('❌ Product Types Failed:', errorText);
            return { success: false, error: errorText };
        }
        
    } catch (error) {
        console.error('❌ Product Types Error:', error);
        return { success: false, error: error.message };
    }
}

// Test 3: Get Available Media Types (Paper Types)
async function testGetMediaTypes() {
    console.log('📄 Testing Media Types API...');
    
    try {
        const response = await fetch(`${FINERWORKS_TEST_CONFIG.apiUrl}/list_media_types`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'web_api_key': FINERWORKS_TEST_CONFIG.webApiKey,
                'app_key': FINERWORKS_TEST_CONFIG.appKey
            },
            body: JSON.stringify({})
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Media Types (Papers):', data);
            
            // Look for Breathing Color Elegance Velvet
            if (data.media_types) {
                const velvetPaper = data.media_types.find(media => 
                    media.name && media.name.toLowerCase().includes('velvet')
                );
                if (velvetPaper) {
                    console.log('🎨 Found Velvet Paper:', velvetPaper);
                }
            }
            
            return { success: true, data };
        } else {
            const errorText = await response.text();
            console.error('❌ Media Types Failed:', errorText);
            return { success: false, error: errorText };
        }
        
    } catch (error) {
        console.error('❌ Media Types Error:', error);
        return { success: false, error: error.message };
    }
}

// Test 4: Test Pricing with Sample Product Code
async function testGetPrices() {
    console.log('💰 Testing Pricing API...');
    
    // These are example product codes - you'll need to replace with real ones
    const testProducts = [
        {
            product_qty: 1,
            product_sku: "SAMPLE_SKU_8X10" // Replace with actual SKU
        }
    ];
    
    try {
        const response = await fetch(`${FINERWORKS_TEST_CONFIG.apiUrl}/get_prices`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'web_api_key': FINERWORKS_TEST_CONFIG.webApiKey,
                'app_key': FINERWORKS_TEST_CONFIG.appKey
            },
            body: JSON.stringify(testProducts)
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Pricing Data:', data);
            return { success: true, data };
        } else {
            const errorText = await response.text();
            console.error('❌ Pricing Failed:', errorText);
            return { success: false, error: errorText };
        }
        
    } catch (error) {
        console.error('❌ Pricing Error:', error);
        return { success: false, error: error.message };
    }
}

// Test 5: Image Upload Test (with dummy data)
async function testImageUpload() {
    console.log('🖼️ Testing Image Upload API...');
    
    // Create a small test image (1x1 pixel PNG in base64)
    const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    
    const imageData = [{
        image_data: testImageBase64,
        image_name: 'test_artwork.png',
        image_description: 'Test image for API verification'
    }];
    
    try {
        const response = await fetch(`${FINERWORKS_TEST_CONFIG.apiUrl}/add_images`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'web_api_key': FINERWORKS_TEST_CONFIG.webApiKey,
                'app_key': FINERWORKS_TEST_CONFIG.appKey
            },
            body: JSON.stringify(imageData)
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Image Upload Success:', data);
            return { success: true, data };
        } else {
            const errorText = await response.text();
            console.error('❌ Image Upload Failed:', errorText);
            return { success: false, error: errorText };
        }
        
    } catch (error) {
        console.error('❌ Image Upload Error:', error);
        return { success: false, error: error.message };
    }
}

// ================================
// RUN ALL TESTS
// ================================

async function runAllTests() {
    console.log('🚀 Starting Finerworks API Tests...');
    console.log('=====================================');
    
    // Check configuration first
    if (FINERWORKS_TEST_CONFIG.webApiKey === 'YOUR_WEB_API_KEY_HERE') {
        console.error('❌ Please update FINERWORKS_TEST_CONFIG with your actual API credentials!');
        return;
    }
    
    const results = {
        connection: await testAPIConnection(),
        productTypes: await testGetProductTypes(),
        mediaTypes: await testGetMediaTypes(),
        pricing: await testGetPrices(),
        imageUpload: await testImageUpload()
    };
    
    console.log('=====================================');
    console.log('📊 TEST RESULTS SUMMARY:');
    console.log('=====================================');
    
    Object.entries(results).forEach(([test, result]) => {
        const status = result.success ? '✅ PASS' : '❌ FAIL';
        console.log(`${status} - ${test}`);
        if (!result.success) {
            console.log(`   Error: ${result.error}`);
        }
    });
    
    const passedTests = Object.values(results).filter(r => r.success).length;
    const totalTests = Object.keys(results).length;
    
    console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
        console.log('🎉 All tests passed! Ready for integration.');
    } else {
        console.log('⚠️ Some tests failed. Check credentials and API documentation.');
    }
    
    return results;
}

// ================================
// HELPER FUNCTIONS
// ================================

// Function to display results in a nice format on the page
function displayTestResults(results) {
    const resultContainer = document.getElementById('api-test-results');
    if (!resultContainer) return;
    
    let html = '<h3>Finerworks API Test Results</h3>';
    
    Object.entries(results).forEach(([test, result]) => {
        const statusClass = result.success ? 'success' : 'error';
        const statusIcon = result.success ? '✅' : '❌';
        
        html += `
            <div class="test-result ${statusClass}">
                <strong>${statusIcon} ${test}</strong>
                ${result.success ? 
                    '<p>✅ Test passed successfully</p>' : 
                    `<p>❌ Error: ${result.error}</p>`
                }
                ${result.data ? `<details><summary>View Data</summary><pre>${JSON.stringify(result.data, null, 2)}</pre></details>` : ''}
            </div>
        `;
    });
    
    resultContainer.innerHTML = html;
}

// Make functions available globally for testing in browser console
window.finerworksTest = {
    runAllTests,
    testAPIConnection,
    testGetProductTypes,
    testGetMediaTypes,
    testGetPrices,
    testImageUpload,
    displayTestResults
};

console.log('🔧 Finerworks Test Suite Loaded');
console.log('💡 Usage:');
console.log('   1. Update API credentials in FINERWORKS_TEST_CONFIG');
console.log('   2. Run: finerworksTest.runAllTests()');
console.log('   3. Or test individual functions: finerworksTest.testAPIConnection()');
