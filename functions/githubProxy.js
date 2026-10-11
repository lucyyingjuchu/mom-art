// functions/githubProxy.js
// Writes/deletes files in the repo on behalf of the admin page.
//
// SECURITY:
//  - Every request must carry the admin password (env ADMIN_PASSWORD) in the
//    X-Admin-Key header. Without it the function refuses to touch GitHub.
//  - Only artwork data and artwork images can be written; the branch is fixed.
//    Even with the password, nobody can overwrite index.html, functions, etc.

const crypto = require('crypto');

const GITHUB_API_BASE = 'https://api.github.com';
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB (Netlify request body limit is ~6MB anyway)
const TIMEOUT = 25000;
const BRANCH = 'main';

// Paths the admin page is allowed to write or delete
const ALLOWED_PATHS = [
    /^data\/artworks\.json$/,
    /^images\/paintings\/(thumbnails|large|details)\/[A-Za-z0-9._-]+\.(jpe?g|png|webp)$/i,
    /^images\/mockups\/[A-Za-z0-9_-]+\/[A-Za-z0-9._-]+\.(jpe?g|png|webp)$/i
];

const CORS = {
    'Access-Control-Allow-Origin': process.env.URL || 'https://xiaoranart.com',
    'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
    'Content-Type': 'application/json'
};

function reply(statusCode, body) {
    return { statusCode, headers: CORS, body: JSON.stringify(body) };
}

function isAuthorized(event) {
    const expected = process.env.ADMIN_PASSWORD || '';
    const given = event.headers['x-admin-key'] || event.headers['X-Admin-Key'] || '';
    if (!expected || !given) return false;
    const a = crypto.createHash('sha256').update(given).digest();
    const b = crypto.createHash('sha256').update(expected).digest();
    return crypto.timingSafeEqual(a, b);
}

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') return reply(204, {});
    if (event.httpMethod !== 'POST' && event.httpMethod !== 'DELETE') {
        return reply(405, { error: 'Method not allowed' });
    }

    if (!process.env.ADMIN_PASSWORD) {
        return reply(500, { error: 'ADMIN_PASSWORD is not set in Netlify environment variables' });
    }
    if (!isAuthorized(event)) {
        return reply(401, { error: 'Admin password required or incorrect' });
    }

    let body;
    try {
        body = JSON.parse(event.body || '{}');
    } catch {
        return reply(400, { error: 'Invalid JSON in request body' });
    }

    // Lets the admin page check the password without changing anything
    if (body.action === 'verify') return reply(200, { ok: true });

    const { path, content, message, sha } = body;
    if (!path || !message) return reply(400, { error: 'Missing required fields: path, message' });
    if (!ALLOWED_PATHS.some(rx => rx.test(path))) {
        return reply(403, { error: `Writing to "${path}" is not allowed from the admin page` });
    }

    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    if (!GITHUB_TOKEN) return reply(500, { error: 'GitHub token not configured' });

    let method;
    let githubBody;
    if (event.httpMethod === 'POST') {
        if (!content) return reply(400, { error: 'Missing file content' });
        if (Buffer.byteLength(content, 'base64') > MAX_FILE_SIZE) {
            return reply(413, { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` });
        }
        method = 'PUT';
        githubBody = { message, content, branch: BRANCH };
        if (sha) githubBody.sha = sha;
    } else {
        if (!sha) return reply(400, { error: 'SHA required for file deletion' });
        method = 'DELETE';
        githubBody = { message, sha, branch: BRANCH };
    }

    const owner = process.env.GITHUB_OWNER || 'lucyyingjuchu';
    const repo = process.env.GITHUB_REPO || 'mom-art';
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT);

    try {
        const response = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}`, {
            method,
            headers: {
                'Authorization': `Bearer ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
                'User-Agent': 'Netlify-Function-GitHubProxy/2.0'
            },
            body: JSON.stringify(githubBody),
            signal: controller.signal
        });
        clearTimeout(timer);
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            console.error('GitHub API error:', response.status, data.message);
            const messages = {
                403: 'GitHub API rate limit exceeded or insufficient permissions',
                404: 'Repository or file not found',
                409: 'File changed on GitHub since it was loaded - reload the admin page and try again',
                422: 'Invalid request data or file already exists'
            };
            return reply(response.status, {
                error: messages[response.status] || data.message || `GitHub API error: ${response.status}`,
                message: data.message
            });
        }

        console.log(`GitHub ${method} ok: ${path}`);
        return reply(200, data);
    } catch (err) {
        clearTimeout(timer);
        console.error('GitHub proxy error:', err);
        return reply(500, {
            error: err.name === 'AbortError' ? 'Request timeout - file may be too large' : 'Network error communicating with GitHub'
        });
    }
};
