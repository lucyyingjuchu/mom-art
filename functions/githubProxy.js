exports.handler = async (event, context) => {
    // 允許 POST 和 DELETE
    if (event.httpMethod !== 'POST' && event.httpMethod !== 'DELETE') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
        
        if (!GITHUB_TOKEN) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'GitHub token not configured' })
            };
        }

        const { path, content, message, branch = 'main', sha } = JSON.parse(event.body);
        
        const GITHUB_OWNER = 'lucyyingjuchu';
        const GITHUB_REPO = 'mom-art';

        // 處理 DELETE 請求
        if (event.httpMethod === 'DELETE') {
            if (!path || !message || !sha) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ 
                        message: 'Missing required fields for delete: path, message, sha' 
                    })
                };
            }

            console.log(`Deleting file: ${path} with SHA: ${sha}`);

            const deleteResponse = await fetch(
                `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`,
                {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${GITHUB_TOKEN}`,
                        'Accept': 'application/vnd.github+json',
                        'Content-Type': 'application/json',
                        'User-Agent': 'netlify-function'
                    },
                    body: JSON.stringify({
                        message: message,
                        sha: sha,
                        branch: branch
                    })
                }
            );

            if (!deleteResponse.ok) {
                let errorMessage = 'GitHub API delete error';
                let errorDetails = '';
                
                try {
                    // Try to get JSON error first
                    const errorData = await deleteResponse.json();
                    errorMessage = errorData.message || errorMessage;
                    errorDetails = JSON.stringify(errorData);
                } catch (e) {
                    // If not JSON, get as text
                    errorDetails = await deleteResponse.text();
                }
                
                console.error(`Delete failed for ${path}:`, errorDetails);
                
                return {
                    statusCode: deleteResponse.status,
                    body: JSON.stringify({ 
                        message: `${errorMessage}: ${errorDetails}`
                    })
                };
            }

            console.log(`Successfully deleted: ${path}`);
            
            return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS'
                },
                body: JSON.stringify({ 
                    success: true, 
                    message: 'File deleted successfully' 
                })
            };
        }

        // 原本的 POST 處理（上傳/更新檔案）
        if (!path || !content || !message) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Missing required fields: path, content, message' })
            };
        }

        // Check if file exists first (to get SHA for updates)
        let existingSha = null;
        try {
            const checkResponse = await fetch(
                `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`,
                {
                    headers: {
                        'Authorization': `Bearer ${GITHUB_TOKEN}`,
                        'Accept': 'application/vnd.github+json',
                        'User-Agent': 'netlify-function'
                    }
                }
            );
            
            if (checkResponse.ok) {
                const fileData = await checkResponse.json();
                existingSha = fileData.sha;
            }
        } catch (error) {
            // File doesn't exist, which is fine for new files
        }

        // Upload or update the file
        const uploadBody = {
            message: message,
            content: content,
            branch: branch
        };
        
        // Add SHA if file exists (for updates)
        if (existingSha) {
            uploadBody.sha = existingSha;
        }

        const uploadResponse = await fetch(
            `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`,
            {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github+json',
                    'Content-Type': 'application/json',
                    'User-Agent': 'netlify-function'
                },
                body: JSON.stringify(uploadBody)
            }
        );

        if (!uploadResponse.ok) {
            let errorMessage = 'GitHub API error';
            let errorDetails = '';
            
            try {
                const errorData = await uploadResponse.json();
                errorMessage = errorData.message || errorMessage;
                errorDetails = JSON.stringify(errorData);
            } catch (e) {
                errorDetails = await uploadResponse.text();
            }
            
            return {
                statusCode: uploadResponse.status,
                body: JSON.stringify({ 
                    message: `${errorMessage}: ${errorDetails}`
                })
            };
        }

        const result = await uploadResponse.json();
        
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS'
            },
            body: JSON.stringify(result)
        };

    } catch (error) {
        console.error('GitHub proxy error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                message: `Internal server error: ${error.message}`
            })
        };
    }
}