// Netlify Function to check deployment status
exports.handler = async (event, context) => {
  const { httpMethod } = event;
  
  // Only allow GET requests
  if (httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Get site ID from Netlify environment
    const SITE_ID = process.env.SITE_ID || 'xiaoran';
    
    // Netlify API endpoint for deployments
    const response = await fetch(`https://api.netlify.com/api/v1/sites/${SITE_ID}/deploys?per_page=1`, {
      headers: {
        'Authorization': `Bearer ${process.env.NETLIFY_AUTH_TOKEN}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch deployment status');
    }

    const deploys = await response.json();
    const latestDeploy = deploys[0];

    if (!latestDeploy) {
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          status: 'unknown',
          message: 'No deployments found'
        })
      };
    }

    // Return deployment status
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: latestDeploy.state, // "ready", "building", "error", etc.
        createdAt: latestDeploy.created_at,
        deployUrl: latestDeploy.deploy_ssl_url,
        branch: latestDeploy.branch,
        deployId: latestDeploy.id,
        title: latestDeploy.title || 'Deploy',
        deployTime: latestDeploy.deploy_time,
        publishedAt: latestDeploy.published_at
      })
    };

  } catch (error) {
    console.error('Error fetching deploy status:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to fetch deployment status',
        details: error.message 
      })
    };
  }
};