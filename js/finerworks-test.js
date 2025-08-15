// Updated Finerworks Test - Frontend (No CORS issues)
// Replace your existing finerworks-test.js with this

// ================================
// CONFIGURATION
// ================================
const FINERWORKS_TEST_CONFIG = {
    // Use your Netlify function instead of direct API
    apiUrl: '/.netlify/functions/finerworks-api', // Netlify function
    testUrl: '/.netlify/functions/finerworks-test', // Test function
    
    // For local development, you might use:
    // apiUrl: 'http://localhost:8888/.netlify/functions/finerworks-api',
};

// ================================
// API TEST FUNCTIONS (Updated for Backend Proxy)
// ================================

// Test 1: Test if Netlify function is working
async function testNetlifyFunction() {
    console.log('🔧 Testing Netlify Function...');
    
    try {
        const response = await fetch(FINERWORKS_TEST_CONFIG.testUrl);
        
        console.log('📡 Response Status:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Netlify Function Success!', data);
            return { success: true, data };
        } else {
            const errorText = await response.text();
            console.error('❌ Netlify Function Failed:', response.status, errorText);
            return { success: false, error: errorText };
        }
        
    } catch (error) {
        console.error('❌ Network Error:', error);
        return { success: false, error: error.message };
    }
}

// Test 2: Test Finerworks API Connection via Backend
async function testAPIConnection() {
    console.log('🔧 Testing Finerworks API Connection via Backend...');
    
    try {
        const response = await fetch(FINERWORKS_TEST_CONFIG.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                endpoint: 'test_my_credentials',
                data: {}
            })
        });
        
        console.log('📡 Response Status:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ API Connection Success!', data);
            return { success: true, data };
        } else {
            const errorData = await response.json();
            console.error('❌ API Connection Failed:', errorData);
            return { success: false, error: errorData.error || errorData.message };
        }
        
    } catch (error) {
        console.error('❌ Network Error:', error);
        return { success: false, error: error.message };
    }
}

// Test 3: Get Product Types via Backend
async function testGetProductTypes() {
    console.log('📦 Testing Product Types API...');
    
    try {
        const response = await fetch(FINERWORKS_TEST_CONFIG.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                endpoint: 'list_product_types',
                data: {}
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Product Types:', data);
            return { success: true, data };
        } else {
            const errorData = await response.json();
            console.error('❌ Product Types Failed:', errorData);
            return { success: false, error: errorData.error || errorData.message };
        }
        
    } catch (error) {
        console.error('❌ Product Types Error:', error);
        return { success: false, error: error.message };
    }
}

// Test 4: Get Media Types via Backend
async function testGetMediaTypes() {
    console.log('📄 Testing Media Types API...');
    
    try {
        const response = await fetch(FINERWORKS_TEST_CONFIG.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                endpoint: 'list_media_types',
                data: {}
            })
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
            const errorData = await response.json();
            console.error('❌ Media Types Failed:', errorData);
            return { success: false, error: errorData.error || errorData.message };
        }
        
    } catch (error) {
        console.error('❌ Media Types Error:', error);
        return { success: false, error: error.message };
    }
}

// Test 5: Test Pricing via Backend
async function testGetPrices() {
    console.log('💰 Testing Pricing API...');
    
    // Example product request
    const testProducts = [
        {
            product_qty: 1,
            product_sku: "SAMPLE_SKU_8X10" // This will likely fail, but tests the endpoint
        }
    ];
    
    try {
        const response = await fetch(FINERWORKS_TEST_CONFIG.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                endpoint: 'get_prices',
                data: testProducts
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Pricing Data:', data);
            return { success: true, data };
        } else {
            const errorData = await response.json();
            console.error('❌ Pricing Failed:', errorData);
            return { success: false, error: errorData.error || errorData.message };
        }
        
    } catch (error) {
        console.error('❌ Pricing Error:', error);
        return { success: false, error: error.message };
    }
}

// ================================
// RUN ALL TESTS
// ================================

async function runAllTests() {
    console.log('🚀 Starting Finerworks API Tests (via Backend)...');
    console.log('=====================================');
    
    const results = {
        netlifyFunction: await testNetlifyFunction(),
        connection: await testAPIConnection(),
        productTypes: await testGetProductTypes(),
        mediaTypes: await testGetMediaTypes(),
        pricing: await testGetPrices()
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
    } else if (results.netlifyFunction.success && !results.connection.success) {
        console.log('⚠️ Backend working, but need to configure Finerworks API credentials.');
    } else {
        console.log('⚠️ Some tests failed. Check setup and credentials.');
    }
    
    return results;
}

// Function to display results in a nice format on the page
function displayTestResults(results) {
    const resultContainer = document.getElementById('api-test-results');
    if (!resultContainer) return;
    
    let html = '<h3>Finerworks API Test Results (via Backend)</h3>';
    
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
    testNetlifyFunction,
    testAPIConnection,
    testGetProductTypes,
    testGetMediaTypes,
    testGetPrices,
    displayTestResults
};

console.log('🔧 Finerworks Test Suite Loaded (Backend Proxy Version)');
console.log('💡 Usage:');
console.log('   1. Deploy Netlify functions');
console.log('   2. Set environment variables for API credentials');
console.log('   3. Run: finerworksTest.runAllTests()');
