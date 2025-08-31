export default async (req, context) => {
  // Allow POST and DELETE requests
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return new Response(JSON.stringify({ message: 'Method not allowed' }), {
      status: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      }
    });
  }

  try {
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  
    if (!GITHUB_TOKEN) {
      return new Response(JSON.stringify({ message: 'GitHub token not configured' }), {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        }
      });
    }

    // Parse the request body
    const { path, content, message, branch = 'main', sha } = await req.json();
    
    // Your GitHub repo configuration
    const GITHUB_OWNER = 'lucyyingjuchu';
    const GITHUB_REPO = 'mom-art';

    // Handle DELETE requests
    if (req.method === 'DELETE') {
      if (!path || !message || !sha) {
        return new Response(JSON.stringify({ 
          message: 'Missing required fields for delete: path, message, sha' 
        }), {
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
          }
        });
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
        
        return new Response(JSON.stringify({ 
          message: `${errorMessage}: ${errorDetails}`
        }), {
          status: deleteResponse.status,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
          }
        });
      }

      console.log(`Successfully deleted: ${path}`);
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'File deleted successfully' 
      }), {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
          'Content-Type': 'application/json'
        }
      });
    }

    // Handle POST requests (original upload logic)
    if (!path || !content || !message) {
      return new Response(JSON.stringify({ message: 'Missing required fields: path, content, message' }), {
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        }
      });
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
      
      return new Response(JSON.stringify({ 
        message: `${errorMessage}: ${errorDetails}`
      }), {
        status: uploadResponse.status,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        }
      });
    }

    const result = await uploadResponse.json();
    
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('GitHub proxy error:', error);
    return new Response(JSON.stringify({ 
      message: `Internal server error: ${error.message}`
    }), {
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      }
    });
  }
};