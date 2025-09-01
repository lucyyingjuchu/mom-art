// File: netlify/functions/githubProxy.js
// Updated version with better error handling and memory management

const GITHUB_API_BASE = 'https://api.github.com';
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB limit
const TIMEOUT = 25000; // 25 seconds (less than Netlify's 30s limit)

exports.handler = async (event, context) => {
    // Set timeout for the entire function
    const timeout = setTimeout(() => {
        console.error('⏰ Function timeout reached');
        throw new Error('Function timeout - file too large or processing too slow');
    }, TIMEOUT);

    try {
        // Only handle POST and DELETE methods
        if (event.httpMethod !== 'POST' && event.httpMethod !== 'DELETE') {
            clearTimeout(timeout);
            return {
                statusCode: 405,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type'
                },
                body: JSON.stringify({ error: 'Method not allowed' })
            };
        }

        // Handle OPTIONS for CORS
        if (event.httpMethod === 'OPTIONS') {
            clearTimeout(timeout);
            return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type'
                }
            };
        }

        // Parse request body
        let requestBody;
        try {
            requestBody = JSON.parse(event.body);
        } catch (parseError) {
            clearTimeout(timeout);
            console.error('❌ JSON parse error:', parseError);
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ error: 'Invalid JSON in request body' })
            };
        }

        const { path, content, message, sha, branch = 'main' } = requestBody;

        // Validate required fields
        if (!path || !message) {
            clearTimeout(timeout);
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ error: 'Missing required fields: path, message' })
            };
        }

        // Check content size for uploads
        if (event.httpMethod === 'POST' && content) {
            const contentSize = Buffer.byteLength(content, 'base64');
            console.log(`📊 Content size: ${Math.round(contentSize / 1024 / 1024 * 100) / 100}MB`);
            
            if (contentSize > MAX_FILE_SIZE) {
                clearTimeout(timeout);
                return {
                    statusCode: 413,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({ 
                        error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` 
                    })
                };
            }
        }

        // GitHub API configuration
        const REPO_OWNER = process.env.GITHUB_OWNER || 'lucyyingjuchu';
        const REPO_NAME = process.env.GITHUB_REPO || 'mom-art';
        const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

        if (!GITHUB_TOKEN) {
            clearTimeout(timeout);
            console.error('❌ Missing GitHub token');
            return {
                statusCode: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ error: 'GitHub token not configured' })
            };
        }

        // Prepare GitHub API request
        const githubUrl = `${GITHUB_API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`;
        const githubHeaders = {
            'Authorization': `Bearer ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            'User-Agent': 'Netlify-Function-GitHubProxy/1.0'
        };

        let githubBody;
        let method;

        if (event.httpMethod === 'POST') {
            // Upload/Update file
            method = 'PUT';
            githubBody = {
                message,
                content,
                branch
            };
            
            // Add SHA if provided (for updates)
            if (sha) {
                githubBody.sha = sha;
            }
            
            console.log(`📤 ${sha ? 'Updating' : 'Creating'} file: ${path}`);
            
        } else if (event.httpMethod === 'DELETE') {
            // Delete file
            method = 'DELETE';
            githubBody = {
                message,
                sha, // Required for deletion
                branch
            };
            
            if (!sha) {
                clearTimeout(timeout);
                return {
                    statusCode: 400,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({ error: 'SHA required for file deletion' })
                };
            }
            
            console.log(`🗑️ Deleting file: ${path}`);
        }

        // Make GitHub API request with timeout
        const controller = new AbortController();
        const githubTimeout = setTimeout(() => controller.abort(), TIMEOUT - 2000);

        try {
            const response = await fetch(githubUrl, {
                method,
                headers: githubHeaders,
                body: JSON.stringify(githubBody),
                signal: controller.signal
            });

            clearTimeout(githubTimeout);
            clearTimeout(timeout);

            // Handle GitHub API response
            const responseData = await response.json();

            if (!response.ok) {
                console.error('❌ GitHub API error:', response.status, responseData);
                
                // Provide helpful error messages
                let errorMessage = responseData.message || `GitHub API error: ${response.status}`;
                
                if (response.status === 403) {
                    errorMessage = 'GitHub API rate limit exceeded or insufficient permissions';
                } else if (response.status === 404) {
                    errorMessage = 'Repository or file not found';
                } else if (response.status === 422) {
                    errorMessage = 'Invalid request data or file already exists';
                } else if (response.status >= 500) {
                    errorMessage = 'GitHub server error - please try again later';
                }

                return {
                    statusCode: response.status,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({ 
                        error: errorMessage,
                        details: responseData
                    })
                };
            }

            // Success response
            console.log(`✅ GitHub operation successful: ${path}`);
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify(responseData)
            };

        } catch (fetchError) {
            clearTimeout(githubTimeout);
            clearTimeout(timeout);
            
            console.error('❌ Fetch error:', fetchError);
            
            let errorMessage = 'Network error communicating with GitHub';
            if (fetchError.name === 'AbortError') {
                errorMessage = 'Request timeout - file may be too large';
            }

            return {
                statusCode: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ 
                    error: errorMessage,
                    details: fetchError.message
                })
            };
        }

    } catch (error) {
        clearTimeout(timeout);
        console.error('❌ Function error:', error);
        
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ 
                error: 'Internal server error',
                details: error.message
            })
        };
    }
};