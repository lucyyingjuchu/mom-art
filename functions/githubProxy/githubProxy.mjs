export default async (req, context) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      }
    });
  }

  try {
    const GITHUB_TOKEN = Netlify.env.get('GITHUB_TOKEN');
    
    if (!GITHUB_TOKEN) {
      return new Response(JSON.stringify({ error: 'GitHub token not configured' }), {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        }
      });
    }

    // Parse the request body
    const { path, content, message, branch = 'main' } = await req.json();
    
    if (!path || !content || !message) {
      return new Response(JSON.stringify({ error: 'Missing required fields: path, content, message' }), {
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        }
      });
    }

    // Your GitHub repo configuration
    const GITHUB_OWNER = 'lucyyingjuchu';
    const GITHUB_REPO = 'mom-art';
    
    // Check if file exists first (to get SHA for updates)
    let sha = null;
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
        sha = fileData.sha;
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
    if (sha) {
      uploadBody.sha = sha;
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
      const errorText = await uploadResponse.text();
      return new Response(JSON.stringify({ 
        error: 'GitHub API error', 
        details: errorText 
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
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('GitHub proxy error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      message: error.message 
    }), {
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      }
    });
  }
};