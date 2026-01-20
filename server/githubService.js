const axios = require('axios');
const config = require('./config');

class GitHubService {
  constructor(token) {
    this.token = token;
    this.client = axios.create({
      baseURL: config.github.apiUrl,
      headers: {
        'Authorization': `token ${token}`,
        'User-Agent': 'RepoPulse-Lite',
        'Accept': 'application/vnd.github.v3+json'
      }
    });
  }

  async getUserRepositories() {
    try {
      const repos = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const response = await this.client.get('/user/repos', {
          params: {
            per_page: 100,
            page: page,
            sort: 'updated',
            direction: 'desc'
          }
        });

        repos.push(...response.data);
        hasMore = response.data.length === 100;
        page++;
      }

      return repos.map(repo => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        private: repo.private,
        defaultBranch: repo.default_branch,
        updatedAt: repo.updated_at,
        pushedAt: repo.pushed_at,
        owner: repo.owner.login
      }));
    } catch (error) {
      console.error('Error fetching repositories:', error.response?.data || error.message);
      throw new Error('Failed to fetch repositories');
    }
  }

  async getPullRequests(owner, repo) {
    try {
      const prs = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const response = await this.client.get(`/repos/${owner}/${repo}/pulls`, {
          params: {
            state: 'open',
            per_page: 100,
            page: page,
            sort: 'created',
            direction: 'desc'
          }
        });

        prs.push(...response.data);
        hasMore = response.data.length === 100;
        page++;
      }

      return prs.map(pr => ({
        id: pr.id,
        number: pr.number,
        title: pr.title,
        author: pr.user.login,
        createdAt: pr.created_at,
        updatedAt: pr.updated_at,
        url: pr.html_url,
        daysOpen: Math.floor((Date.now() - new Date(pr.created_at)) / (1000 * 60 * 60 * 24))
      }));
    } catch (error) {
      console.error(`Error fetching PRs for ${owner}/${repo}:`, error.response?.data || error.message);
      return [];
    }
  }

  async getIssues(owner, repo) {
    try {
      const issues = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const response = await this.client.get(`/repos/${owner}/${repo}/issues`, {
          params: {
            state: 'open',
            per_page: 100,
            page: page,
            sort: 'updated',
            direction: 'desc'
          }
        });

        const filteredIssues = response.data.filter(issue => !issue.pull_request);
        issues.push(...filteredIssues);
        hasMore = response.data.length === 100;
        page++;
      }

      return issues.map(issue => ({
        id: issue.id,
        number: issue.number,
        title: issue.title,
        createdAt: issue.created_at,
        updatedAt: issue.updated_at,
        url: issue.html_url,
        daysSinceUpdate: Math.floor((Date.now() - new Date(issue.updated_at)) / (1000 * 60 * 60 * 24))
      }));
    } catch (error) {
      console.error(`Error fetching issues for ${owner}/${repo}:`, error.response?.data || error.message);
      return [];
    }
  }

  async getLastCommit(owner, repo) {
    try {
      const response = await this.client.get(`/repos/${owner}/${repo}/commits`, {
        params: {
          per_page: 1,
          page: 1
        }
      });

      if (response.data.length === 0) {
        return null;
      }

      const lastCommit = response.data[0];
      return {
        sha: lastCommit.sha,
        message: lastCommit.commit.message,
        author: lastCommit.commit.author.name,
        date: lastCommit.commit.author.date,
        daysAgo: Math.floor((Date.now() - new Date(lastCommit.commit.author.date)) / (1000 * 60 * 60 * 24))
      };
    } catch (error) {
      console.error(`Error fetching last commit for ${owner}/${repo}:`, error.response?.data || error.message);
      return null;
    }
  }

  async getRepositoryHealth(owner, repo) {
    try {
      const [prs, issues, lastCommit] = await Promise.all([
        this.getPullRequests(owner, repo),
        this.getIssues(owner, repo),
        this.getLastCommit(owner, repo)
      ]);

      const stalePRs = prs.filter(pr => pr.daysOpen > config.staleThresholds.prDays);
      const staleIssues = issues.filter(issue => issue.daysSinceUpdate > config.staleThresholds.issueDays);

      let healthStatus = 'healthy';
      let healthEmoji = '🟢';
      
      const staleCount = stalePRs.length + staleIssues.length;
      const hasOldCommits = lastCommit && lastCommit.daysAgo > config.staleThresholds.commitDays;
      
      if (staleCount >= 3 || hasOldCommits) {
        healthStatus = 'stale';
        healthEmoji = '🔴';
      } else if (staleCount >= 1) {
        healthStatus = 'needs_attention';
        healthEmoji = '🟡';
      }

      return {
        healthStatus,
        healthEmoji,
        stalePRs,
        staleIssues,
        lastCommit,
        totalPRs: prs.length,
        totalIssues: issues.length
      };
    } catch (error) {
      console.error(`Error calculating health for ${owner}/${repo}:`, error.message);
      return {
        healthStatus: 'error',
        healthEmoji: '❌',
        stalePRs: [],
        staleIssues: [],
        lastCommit: null,
        totalPRs: 0,
        totalIssues: 0,
        error: error.message
      };
    }
  }
}

module.exports = GitHubService;
