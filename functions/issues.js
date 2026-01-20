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
    const issues = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues?state=open&per_page=100&page=${page}&sort=updated&direction=desc`, {
        headers: {
          'Authorization': `token ${token}`,
          'User-Agent': 'RepoPulse-Lite',
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      const pageIssues = await response.json();
      // Filter out pull requests
      const filteredIssues = pageIssues.filter(issue => !issue.pull_request);
      issues.push(...filteredIssues);
      hasMore = pageIssues.length === 100;
      page++;
    }

    const staleThresholdDays = 14;
    const formattedIssues = issues.map(issue => {
      const daysSinceUpdate = Math.floor((Date.now() - new Date(issue.updated_at)) / (1000 * 60 * 60 * 24));
      return {
        id: issue.id,
        number: issue.number,
        title: issue.title,
        createdAt: issue.created_at,
        updatedAt: issue.updated_at,
        url: issue.html_url,
        daysSinceUpdate,
        isStale: daysSinceUpdate > staleThresholdDays
      };
    });

    return new Response(JSON.stringify(formattedIssues), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error(`Error fetching issues for ${owner}/${repo}:`, error);
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch issues',
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
