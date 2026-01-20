// Cloudflare Pages Functions API client
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
      const error = await response.json();
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
      const error = await response.json();
      throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }
};

export const authAPI = {
  getAuthUrl: () => {
    // Redirect to auth function
    window.location.href = '/auth';
  },
  
  handleCallback: () => {
    return api.get('/callback');
  },

  logout: () => {
    // Simple client-side logout for MVP
    return Promise.resolve();
  }
};

export const userAPI = {
  getUser: (token) => {
    return api.get('/repos', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  }
};

export const repoAPI = {
  getRepositories: (token) => {
    return api.get('/repos', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  },

  getPulls: (token, owner, repo) => {
    return api.get(`/pulls?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  },

  getIssues: (token, owner, repo) => {
    return api.get(`/issues?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  },

  getCommits: (token, owner, repo) => {
    return api.get(`/commits?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  }
};

export default api;
