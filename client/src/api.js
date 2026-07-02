// API client supporting both Cloudflare Pages Functions and Node.js Express Backend
const API_BASE = '';

const api = {
  async get(url, options = {}) {
    const response = await fetch(`${API_BASE}${url}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }));
      throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  },

  async post(url, data, options = {}) {
    const response = await fetch(`${API_BASE}${url}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: JSON.stringify(data),
      ...options
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }));
      throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }
};

export const authAPI = {
  // Cloudflare Auth
  getAuthUrlCloudflare: () => {
    window.location.href = '/auth';
  },
  
  handleCallbackCloudflare: (code) => {
    return api.get(`/callback?code=${encodeURIComponent(code)}`);
  },

  // Express Auth
  getAuthUrlExpress: async () => {
    const data = await api.get('/auth/url');
    return data.authUrl;
  },

  getUserExpress: () => {
    return api.get('/api/user');
  },

  logoutExpress: () => {
    return api.post('/api/logout');
  },

  // Legacy fallback compatibility
  getAuthUrl: () => {
    window.location.href = '/auth';
  },
  
  handleCallback: () => {
    // Falls back to checking search params if not passed
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    return api.get(`/callback?code=${encodeURIComponent(code || '')}`);
  },

  logout: () => {
    return Promise.resolve();
  }
};

export const repoAPI = {
  // Cloudflare Repos & Health details
  getRepositoriesCloudflare: (token) => {
    return api.get('/repos', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  },

  getPullsCloudflare: (token, owner, repo) => {
    return api.get(`/pulls?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  },

  getIssuesCloudflare: (token, owner, repo) => {
    return api.get(`/issues?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  },

  getCommitsCloudflare: (token, owner, repo) => {
    return api.get(`/commits?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  },

  // Express Repos & Health details
  getRepositoriesExpress: () => {
    return api.get('/api/repositories');
  },

  getRepositoryHealthExpress: (owner, repo) => {
    return api.get(`/api/repositories/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/health`);
  },

  // Legacy fallback compatibility
  getRepositories: (token) => {
    return repoAPI.getRepositoriesCloudflare(token);
  },

  getPulls: (token, owner, repo) => {
    return repoAPI.getPullsCloudflare(token, owner, repo);
  },

  getIssues: (token, owner, repo) => {
    return repoAPI.getIssuesCloudflare(token, owner, repo);
  },

  getCommits: (token, owner, repo) => {
    return repoAPI.getCommitsCloudflare(token, owner, repo);
  }
};

export const healthAPI = {
  getExpressHealth: () => {
    return api.get('/api/health-check');
  }
};

export default api;
