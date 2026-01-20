export async function onRequest(context) {
  const { env, request } = context;
  
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }

  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Missing or invalid authorization header' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const token = authHeader.substring(7);
  const url = new URL(request.url);
  const owner = url.searchParams.get('owner');
  const repo = url.searchParams.get('repo');

  if (!owner || !repo) {
    return new Response(JSON.stringify({ error: 'Missing owner or repo parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=1&page=1`, {
      headers: {
        'Authorization': `token ${token}`,
        'User-Agent': 'RepoPulse-Lite',
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    const commits = await response.json();
    
    if (commits.length === 0) {
      return new Response(JSON.stringify({ 
        lastCommit: null,
        hasRecentCommits: false
      }), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    const lastCommit = commits[0];
    const daysAgo = Math.floor((Date.now() - new Date(lastCommit.commit.author.date)) / (1000 * 60 * 60 * 24));
    const staleThresholdDays = 14;

    return new Response(JSON.stringify({
      lastCommit: {
        sha: lastCommit.sha,
        message: lastCommit.commit.message,
        author: lastCommit.commit.author.name,
        date: lastCommit.commit.author.date,
        daysAgo
      },
      hasRecentCommits: daysAgo <= staleThresholdDays
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error(`Error fetching commits for ${owner}/${repo}:`, error);
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch commits',
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
