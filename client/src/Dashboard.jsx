import React, { useState, useEffect } from 'react';
import { repoAPI } from './api';
import './Dashboard.css';

function Dashboard({ token }) {
  const [repositories, setRepositories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [repoHealth, setRepoHealth] = useState(null);
  const [loadingHealth, setLoadingHealth] = useState(false);

  useEffect(() => {
    fetchRepositories();
  }, [token]);

  const fetchRepositories = async () => {
    if (!token) return;
    
    try {
      setLoading(true);
      const repos = await repoAPI.getRepositories(token);
      setRepositories(repos);
    } catch (err) {
      setError('Failed to fetch repositories');
      console.error('Error fetching repositories:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRepoHealth = async (repo) => {
    if (!token) return;
    
    try {
      setLoadingHealth(true);
      const [pulls, issues, commits] = await Promise.all([
        repoAPI.getPulls(token, repo.owner, repo.name),
        repoAPI.getIssues(token, repo.owner, repo.name),
        repoAPI.getCommits(token, repo.owner, repo.name)
      ]);

      const stalePRs = pulls.filter(pr => pr.isStale);
      const staleIssues = issues.filter(issue => issue.isStale);

      let healthStatus = 'healthy';
      let healthEmoji = '🟢';
      
      const staleCount = stalePRs.length + staleIssues.length;
      const hasOldCommits = !commits.hasRecentCommits;
      
      if (staleCount >= 3 || hasOldCommits) {
        healthStatus = 'stale';
        healthEmoji = '🔴';
      } else if (staleCount >= 1) {
        healthStatus = 'needs_attention';
        healthEmoji = '🟡';
      }

      setRepoHealth({
        healthStatus,
        healthEmoji,
        stalePRs,
        staleIssues,
        lastCommit: commits.lastCommit,
        totalPRs: pulls.length,
        totalIssues: issues.length
      });
    } catch (err) {
      setError('Failed to fetch repository health');
      console.error('Error fetching repo health:', err);
    } finally {
      setLoadingHealth(false);
    }
  };

  const handleRepoClick = (repo) => {
    setSelectedRepo(repo);
    fetchRepoHealth(repo);
  };

  const handleBack = () => {
    setSelectedRepo(null);
    setRepoHealth(null);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getDaysAgo = (dateString) => {
    const days = Math.floor((Date.now() - new Date(dateString)) / (1000 * 60 * 60 * 24));
    return `${days} days ago`;
  };

  if (loading) {
    return <div className="loading">Loading repositories...</div>;
  }

  if (error) {
    return (
      <div className="error">
        <p>{error}</p>
        <button onClick={() => setError('')}>Dismiss</button>
      </div>
    );
  }

  if (selectedRepo && repoHealth) {
    return (
      <div className="repo-details">
        <div className="repo-header">
          <button onClick={handleBack} className="back-btn">
            ← Back to Repositories
          </button>
          <h2>{selectedRepo.fullName}</h2>
          <div className="health-badge">
            {repoHealth.healthEmoji} {repoHealth.healthStatus.replace('_', ' ')}
          </div>
        </div>

        <div className="health-summary">
          <div className="summary-item">
            <span>Total PRs:</span>
            <span>{repoHealth.totalPRs}</span>
          </div>
          <div className="summary-item">
            <span>Total Issues:</span>
            <span>{repoHealth.totalIssues}</span>
          </div>
          <div className="summary-item">
            <span>Last Commit:</span>
            <span>
              {repoHealth.lastCommit 
                ? `${getDaysAgo(repoHealth.lastCommit.date)} by ${repoHealth.lastCommit.author}`
                : 'No commits found'
              }
            </span>
          </div>
        </div>

        <div className="stale-content">
          <div className="stale-section">
            <h3>Stale Pull Requests ({repoHealth.stalePRs.length})</h3>
            {repoHealth.stalePRs.length === 0 ? (
              <p className="no-stale">No stale pull requests 🎉</p>
            ) : (
              <div className="stale-list">
                {repoHealth.stalePRs.map(pr => (
                  <div key={pr.id} className="stale-item">
                    <div className="item-header">
                      <a href={pr.url} target="_blank" rel="noopener noreferrer" className="item-title">
                        {pr.title}
                      </a>
                      <span className="item-age">{pr.daysOpen} days open</span>
                    </div>
                    <div className="item-meta">
                      <span>By {pr.author}</span>
                      <span>Created {formatDate(pr.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="stale-section">
            <h3>Stale Issues ({repoHealth.staleIssues.length})</h3>
            {repoHealth.staleIssues.length === 0 ? (
              <p className="no-stale">No stale issues 🎉</p>
            ) : (
              <div className="stale-list">
                {repoHealth.staleIssues.map(issue => (
                  <div key={issue.id} className="stale-item">
                    <div className="item-header">
                      <a href={issue.url} target="_blank" rel="noopener noreferrer" className="item-title">
                        {issue.title}
                      </a>
                      <span className="item-age">{issue.daysSinceUpdate} days since update</span>
                    </div>
                    <div className="item-meta">
                      <span>Updated {formatDate(issue.updatedAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <h2>Your Repositories</h2>
      {repositories.length === 0 ? (
        <p>No repositories found.</p>
      ) : (
        <table className="repo-table">
          <thead>
            <tr>
              <th>Repo Name</th>
              <th>Health</th>
              <th>Stale PRs</th>
              <th>Stale Issues</th>
              <th>Last Commit</th>
            </tr>
          </thead>
          <tbody>
            {repositories.map(repo => (
              <tr 
                key={repo.id} 
                onClick={() => handleRepoClick(repo)}
                className="repo-row"
              >
                <td className="repo-name">
                  <div>
                    <div className="name">{repo.name}</div>
                    <div className="visibility">
                      {repo.private ? '🔒 Private' : '🌍 Public'}
                    </div>
                  </div>
                </td>
                <td className="health-cell">
                  <span className="health-placeholder">Click to check</span>
                </td>
                <td>-</td>
                <td>-</td>
                <td>{getDaysAgo(repo.pushedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default Dashboard;
