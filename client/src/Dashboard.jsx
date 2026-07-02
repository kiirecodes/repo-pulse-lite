import React, { useState, useEffect } from 'react';
import { repoAPI, healthAPI, authAPI } from './api';
import './Dashboard.css';

function Dashboard({ token, user, backendMode, expressServerOnline, onLogout }) {
  const [activeTab, setActiveTab] = useState('health'); // 'health', 'api-explorer', 'profile'
  const [repositories, setRepositories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [repoHealth, setRepoHealth] = useState(null);
  const [loadingHealth, setLoadingHealth] = useState(false);

  // API Explorer State
  const [testResult, setTestResult] = useState(null);
  const [testingEndpoint, setTestingEndpoint] = useState(null);
  const [inputOwner, setInputOwner] = useState(user?.login || 'octocat');
  const [inputRepo, setInputRepo] = useState('');

  useEffect(() => {
    fetchRepositories();
  }, [token, backendMode]);

  const fetchRepositories = async () => {
    try {
      setLoading(true);
      setError('');
      let repos = [];
      if (backendMode === 'express') {
        repos = await repoAPI.getRepositoriesExpress();
      } else {
        if (!token) return;
        repos = await repoAPI.getRepositoriesCloudflare(token);
      }
      setRepositories(repos);
      if (repos.length > 0) {
        setInputRepo(repos[0].name);
        setInputOwner(repos[0].owner);
      }
    } catch (err) {
      setError(`Failed to fetch repositories: ${err.message}`);
      console.error('Error fetching repositories:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRepoHealth = async (repo) => {
    try {
      setLoadingHealth(true);
      setError('');
      setRepoHealth(null);

      if (backendMode === 'express') {
        // Express mode executes health analysis entirely on the server
        const health = await repoAPI.getRepositoryHealthExpress(repo.owner, repo.name);
        setRepoHealth(health);
      } else {
        // Cloudflare serverless mode performs multiple fetches and aggregates on client
        const [pulls, issues, commits] = await Promise.all([
          repoAPI.getPullsCloudflare(token, repo.owner, repo.name),
          repoAPI.getIssuesCloudflare(token, repo.owner, repo.name),
          repoAPI.getCommitsCloudflare(token, repo.owner, repo.name)
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
      }
    } catch (err) {
      setError(`Failed to fetch repository health: ${err.message}`);
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
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getDaysAgo = (dateString) => {
    if (!dateString) return 'No date';
    const days = Math.floor((Date.now() - new Date(dateString)) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'today';
    if (days === 1) return 'yesterday';
    return `${days} days ago`;
  };

  // API Explorer Testing Logic
  const handleTestEndpoint = async (endpointKey) => {
    setTestingEndpoint(endpointKey);
    setTestResult(null);
    const start = Date.now();

    try {
      let data;
      switch (endpointKey) {
        // Express endpoints
        case 'express-health':
          data = await healthAPI.getExpressHealth();
          break;
        case 'express-user':
          data = await authAPI.getUserExpress();
          break;
        case 'express-repos':
          data = await repoAPI.getRepositoriesExpress();
          break;
        case 'express-health-detail':
          data = await repoAPI.getRepositoryHealthExpress(inputOwner, inputRepo);
          break;
        case 'express-auth-url':
          data = await authAPI.getAuthUrlExpress();
          data = { authUrl: data };
          break;
        
        // Cloudflare endpoints
        case 'cf-repos':
          if (!token) throw new Error('Cloudflare Bearer Token missing. Log in via Cloudflare Mode.');
          data = await repoAPI.getRepositoriesCloudflare(token);
          break;
        case 'cf-pulls':
          if (!token) throw new Error('Cloudflare Bearer Token missing. Log in via Cloudflare Mode.');
          data = await repoAPI.getPullsCloudflare(token, inputOwner, inputRepo);
          break;
        case 'cf-issues':
          if (!token) throw new Error('Cloudflare Bearer Token missing. Log in via Cloudflare Mode.');
          data = await repoAPI.getIssuesCloudflare(token, inputOwner, inputRepo);
          break;
        case 'cf-commits':
          if (!token) throw new Error('Cloudflare Bearer Token missing. Log in via Cloudflare Mode.');
          data = await repoAPI.getCommitsCloudflare(token, inputOwner, inputRepo);
          break;
        default:
          throw new Error('Unknown endpoint test');
      }

      setTestResult({
        success: true,
        latency: Date.now() - start,
        status: 200,
        statusText: 'OK',
        body: data
      });
    } catch (err) {
      setTestResult({
        success: false,
        latency: Date.now() - start,
        error: err.message
      });
    } finally {
      setTestingEndpoint(null);
    }
  };

  const endpointsList = [
    {
      key: 'express-health',
      method: 'GET',
      path: '/api/health-check',
      backend: 'Express Server',
      desc: 'Retrieves server system health status, timestamp, and version.',
      authRequired: false,
    },
    {
      key: 'express-auth-url',
      method: 'GET',
      path: '/auth/url',
      backend: 'Express Server',
      desc: 'Generates GitHub OAuth login URL containing client_id and scopes.',
      authRequired: false,
    },
    {
      key: 'express-user',
      method: 'GET',
      path: '/api/user',
      backend: 'Express Server',
      desc: 'Retrieves authenticated user profile from current Express session.',
      authRequired: true,
      activeModeRequired: 'express'
    },
    {
      key: 'express-repos',
      method: 'GET',
      path: '/api/repositories',
      backend: 'Express Server',
      desc: "Fetches user's repository catalog from GitHub via the Express backend.",
      authRequired: true,
      activeModeRequired: 'express'
    },
    {
      key: 'express-health-detail',
      method: 'GET',
      path: '/api/repositories/:owner/:repo/health',
      backend: 'Express Server',
      desc: 'Queries pull requests, issues, commits, analyzes activity, and returns a unified repository health JSON entirely computed on server.',
      authRequired: true,
      activeModeRequired: 'express',
      hasParams: true
    },
    {
      key: 'cf-repos',
      method: 'GET',
      path: '/repos',
      backend: 'Cloudflare Pages Functions',
      desc: 'Fetches user repositories utilizing Bearer Authorization Token header.',
      authRequired: true,
      activeModeRequired: 'cloudflare'
    },
    {
      key: 'cf-pulls',
      method: 'GET',
      path: '/pulls?owner=:owner&repo=:repo',
      backend: 'Cloudflare Pages Functions',
      desc: 'Fetches open pull requests for stale duration mapping.',
      authRequired: true,
      activeModeRequired: 'cloudflare',
      hasParams: true
    },
    {
      key: 'cf-issues',
      method: 'GET',
      path: '/issues?owner=:owner&repo=:repo',
      backend: 'Cloudflare Pages Functions',
      desc: 'Fetches open issues to track latency since last updates.',
      authRequired: true,
      activeModeRequired: 'cloudflare',
      hasParams: true
    },
    {
      key: 'cf-commits',
      method: 'GET',
      path: '/commits?owner=:owner&repo=:repo',
      backend: 'Cloudflare Pages Functions',
      desc: 'Queries latest commit records to assess codebase activity.',
      authRequired: true,
      activeModeRequired: 'cloudflare',
      hasParams: true
    }
  ];

  return (
    <div className="dashboard-layout">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h3>Navigation</h3>
        </div>
        <nav className="sidebar-menu">
          <button 
            className={`menu-item ${activeTab === 'health' ? 'active' : ''}`}
            onClick={() => { setActiveTab('health'); handleBack(); }}
          >
            📊 Repository Health
          </button>
          <button 
            className={`menu-item ${activeTab === 'api-explorer' ? 'active' : ''}`}
            onClick={() => setActiveTab('api-explorer')}
          >
            🔌 API & Endpoints Explorer
          </button>
          <button 
            className={`menu-item ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            👤 User Profile & Session
          </button>
        </nav>

        <div className="connection-card">
          <h4>Backend Connectivity</h4>
          <div className="status-row">
            <span>Express Server (3001)</span>
            <span className={`status-pill ${expressServerOnline ? 'online' : 'offline'}`}>
              {expressServerOnline ? 'Online' : 'Offline'}
            </span>
          </div>
          <div className="status-row">
            <span>Cloudflare Pages (8787)</span>
            <span className="status-pill online">Online</span>
          </div>
          <div className="mode-status">
            <span>Active Session Mode</span>
            <strong>{backendMode === 'express' ? 'Express Cookie' : 'Cloudflare Token'}</strong>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <section className="content-area">
        {error && (
          <div className="alert-error">
            <span className="alert-icon">⚠️</span>
            <p className="alert-text">{error}</p>
            <button onClick={() => setError('')} className="alert-close">×</button>
          </div>
        )}

        {/* TAB 1: REPOSITORY HEALTH */}
        {activeTab === 'health' && (
          <>
            {!selectedRepo ? (
              <div className="dashboard">
                <div className="dashboard-title-row">
                  <h2>Repository Pulse Audits</h2>
                  <button onClick={fetchRepositories} className="refresh-btn">
                    🔄 Refresh List
                  </button>
                </div>
                
                {loading ? (
                  <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Fetching repositories from GitHub...</p>
                  </div>
                ) : repositories.length === 0 ? (
                  <div className="empty-state">
                    <span className="empty-icon">📁</span>
                    <h3>No Repositories Found</h3>
                    <p>We couldn't retrieve any repositories. Ensure your OAuth token has sufficient permissions.</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="repo-table">
                      <thead>
                        <tr>
                          <th>Repo Name</th>
                          <th>Access</th>
                          <th>Default Branch</th>
                          <th>Last Activity</th>
                          <th>Action</th>
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
                              <div className="name-wrapper">
                                <span className="repo-icon">📦</span>
                                <span className="name">{repo.name}</span>
                              </div>
                              <span className="full-name">{repo.fullName}</span>
                            </td>
                            <td>
                              <span className={`badge ${repo.private ? 'private' : 'public'}`}>
                                {repo.private ? '🔒 Private' : '🌍 Public'}
                              </span>
                            </td>
                            <td>
                              <code className="branch-code">{repo.defaultBranch}</code>
                            </td>
                            <td>
                              <span className="date-text">{getDaysAgo(repo.pushedAt)}</span>
                            </td>
                            <td>
                              <button className="check-health-btn">
                                Inspect Health →
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <div className="repo-details">
                <div className="repo-header">
                  <button onClick={handleBack} className="back-btn">
                    ← Back to List
                  </button>
                  <div className="repo-title-block">
                    <h2>{selectedRepo.fullName}</h2>
                    {loadingHealth ? (
                      <span className="badge calculating">Calculating...</span>
                    ) : (
                      repoHealth && (
                        <span className={`health-status-badge ${repoHealth.healthStatus}`}>
                          {repoHealth.healthEmoji} {repoHealth.healthStatus.toUpperCase().replace('_', ' ')}
                        </span>
                      )
                    )}
                  </div>
                  <p className="repo-meta-desc">
                    Default Branch: <code>{selectedRepo.defaultBranch}</code> • Last Pushed: {formatDate(selectedRepo.pushedAt)}
                  </p>
                </div>

                {loadingHealth ? (
                  <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Conducting repository health audit... Querying pull requests, issues, and commits.</p>
                  </div>
                ) : (
                  repoHealth && (
                    <>
                      <div className="health-summary">
                        <div className="summary-card">
                          <span className="summary-title">Total Open PRs</span>
                          <span className="summary-value pr-val">{repoHealth.totalPRs}</span>
                        </div>
                        <div className="summary-card">
                          <span className="summary-title">Total Open Issues</span>
                          <span className="summary-value issue-val">{repoHealth.totalIssues}</span>
                        </div>
                        <div className="summary-card">
                          <span className="summary-title">Stale PRs Audit</span>
                          <span className="summary-value stale-val">{repoHealth.stalePRs.length}</span>
                        </div>
                        <div className="summary-card">
                          <span className="summary-title">Stale Issues Audit</span>
                          <span className="summary-value stale-val">{repoHealth.staleIssues.length}</span>
                        </div>
                      </div>

                      <div className="last-commit-banner">
                        <div className="banner-icon">💬</div>
                        <div className="banner-content">
                          <h4>Latest Repository Activity</h4>
                          {repoHealth.lastCommit ? (
                            <p>
                              <strong>"{repoHealth.lastCommit.message}"</strong> by <em>{repoHealth.lastCommit.author}</em> ({getDaysAgo(repoHealth.lastCommit.date)})
                            </p>
                          ) : (
                            <p>No commits found on the default branch.</p>
                          )}
                        </div>
                      </div>

                      <div className="stale-content">
                        {/* Pull Requests */}
                        <div className="stale-section">
                          <div className="section-header">
                            <h3>Stale Pull Requests ({repoHealth.stalePRs.length})</h3>
                            <span className="stale-threshold-info">Threshold: &gt; 7 days open</span>
                          </div>
                          {repoHealth.stalePRs.length === 0 ? (
                            <div className="clean-state-message">
                              <span className="clean-icon">🎉</span>
                              <p>No stale pull requests! The codebase review flow is active and efficient.</p>
                            </div>
                          ) : (
                            <div className="stale-list">
                              {repoHealth.stalePRs.map(pr => (
                                <div key={pr.id} className="stale-item">
                                  <div className="item-header">
                                    <a href={pr.url} target="_blank" rel="noopener noreferrer" className="item-title">
                                      #{pr.number} {pr.title}
                                    </a>
                                    <span className="item-age">{pr.daysOpen} days open</span>
                                  </div>
                                  <div className="item-meta">
                                    <span>By @{pr.author}</span>
                                    <span>•</span>
                                    <span>Opened {formatDate(pr.createdAt)}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Issues */}
                        <div className="stale-section">
                          <div className="section-header">
                            <h3>Stale Issues ({repoHealth.staleIssues.length})</h3>
                            <span className="stale-threshold-info">Threshold: &gt; 14 days inactive</span>
                          </div>
                          {repoHealth.staleIssues.length === 0 ? (
                            <div className="clean-state-message">
                              <span className="clean-icon">🎉</span>
                              <p>No stale issues! Task tracking is up to date.</p>
                            </div>
                          ) : (
                            <div className="stale-list">
                              {repoHealth.staleIssues.map(issue => (
                                <div key={issue.id} className="stale-item">
                                  <div className="item-header">
                                    <a href={issue.url} target="_blank" rel="noopener noreferrer" className="item-title">
                                      #{issue.number} {issue.title}
                                    </a>
                                    <span className="item-age">{issue.daysSinceUpdate} days stale</span>
                                  </div>
                                  <div className="item-meta">
                                    <span>Created {formatDate(issue.createdAt)}</span>
                                    <span>•</span>
                                    <span>Last updated {formatDate(issue.updatedAt)}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )
                )}
              </div>
            )}
          </>
        )}

        {/* TAB 2: API & ENDPOINTS EXPLORER */}
        {activeTab === 'api-explorer' && (
          <div className="api-explorer">
            <div className="api-header-section">
              <h2>🔌 API & Endpoints Explorer</h2>
              <p className="subtitle">
                Inspect, map, and run requests against all backend routes in real-time. This interactive sandbox triggers the exact Express endpoints or Cloudflare Pages Functions defined in the project backend.
              </p>
            </div>

            {/* Params Configuration Card */}
            <div className="params-card">
              <h3>🔧 Test Params Sandbox</h3>
              <p>Many endpoints below accept repository identifiers. Configure them here to tailor your API tests:</p>
              <div className="params-inputs">
                <div className="input-group">
                  <label>Repository Owner</label>
                  <input 
                    type="text" 
                    value={inputOwner} 
                    onChange={(e) => setInputOwner(e.target.value)} 
                    placeholder="e.g., octocat"
                  />
                </div>
                <div className="input-group">
                  <label>Repository Name</label>
                  <input 
                    type="text" 
                    value={inputRepo} 
                    onChange={(e) => setInputRepo(e.target.value)} 
                    placeholder="e.g., hello-world"
                  />
                </div>
              </div>
            </div>

            {/* Two Column Layout: Endpoints List vs Live Console */}
            <div className="explorer-grid">
              <div className="endpoints-column">
                <h3>Endpoints Catalog</h3>
                <div className="endpoints-list">
                  {endpointsList.map((endpoint) => {
                    const isDisabled = endpoint.activeModeRequired && backendMode !== endpoint.activeModeRequired;
                    const isSelected = testingEndpoint === endpoint.key;
                    
                    return (
                      <div key={endpoint.key} className={`endpoint-card ${endpoint.method.toLowerCase()} ${isDisabled ? 'disabled' : ''}`}>
                        <div className="endpoint-meta">
                          <span className={`method-badge ${endpoint.method}`}>
                            {endpoint.method}
                          </span>
                          <span className="backend-badge">{endpoint.backend}</span>
                        </div>
                        
                        <div className="endpoint-route">
                          <code>
                            {endpoint.path
                              .replace(':owner', inputOwner)
                              .replace(':repo', inputRepo)
                            }
                          </code>
                        </div>

                        <p className="endpoint-desc">{endpoint.desc}</p>

                        {isDisabled && (
                          <div className="requirement-warning">
                            ⚠️ Required mode: {endpoint.activeModeRequired.toUpperCase()}
                          </div>
                        )}

                        <div className="endpoint-action-row">
                          <button 
                            className="test-btn"
                            onClick={() => handleTestEndpoint(endpoint.key)}
                            disabled={testingEndpoint !== null}
                          >
                            {isSelected ? 'Sending...' : 'Test Request'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Console Output Column */}
              <div className="console-column">
                <h3>Live Console Output</h3>
                <div className="terminal-window">
                  <div className="terminal-header">
                    <span className="terminal-dot red"></span>
                    <span className="terminal-dot yellow"></span>
                    <span className="terminal-dot green"></span>
                    <span className="terminal-title">api-response-monitor.log</span>
                  </div>
                  <div className="terminal-body">
                    {testingEndpoint ? (
                      <div className="console-loading">
                        <div className="spinner small"></div>
                        <span>Awaiting Response from backend...</span>
                      </div>
                    ) : testResult ? (
                      <div className="console-result">
                        <div className="result-header-row">
                          <span className={`result-status ${testResult.success ? 'success' : 'error'}`}>
                            HTTP {testResult.status || 'ERR'} {testResult.statusText || 'FAILED'}
                          </span>
                          <span className="result-latency">RTT: {testResult.latency}ms</span>
                        </div>
                        
                        {testResult.success ? (
                          <pre className="pretty-json">
                            <code>{JSON.stringify(testResult.body, null, 2)}</code>
                          </pre>
                        ) : (
                          <div className="console-error-block">
                            <p className="error-title">❌ Request Failed</p>
                            <pre className="error-msg">{testResult.error}</pre>
                            <p className="error-hint">
                              Hint: If testing a session/token endpoint, ensure you have active credentials for that mode.
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="terminal-placeholder">
                        <p>$ repo-pulse-lite --monitor-apis</p>
                        <p className="comment"># Select an endpoint on the left and click "Test Request" to query the server live.</p>
                        <p className="comment"># Raw HTTP headers, return codes, and payloads will render here.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: USER PROFILE */}
        {activeTab === 'profile' && (
          <div className="profile-tab">
            <h2>👤 User Profile & Session Monitor</h2>
            <p className="subtitle">Auditing token states, session persistence, and GitHub scopes.</p>

            <div className="profile-grid">
              {/* GitHub Card */}
              <div className="profile-card-github">
                <div className="profile-hero">
                  <img src={user.avatar_url} alt={user.login} className="profile-avatar-large" />
                  <div className="profile-ident">
                    <h3>{user.name || user.login}</h3>
                    <p className="profile-username">@{user.login}</p>
                    {user.bio && <p className="profile-bio">{user.bio}</p>}
                  </div>
                </div>

                <div className="profile-stats-grid">
                  <div className="stat-col">
                    <span className="stat-num">{user.followers || 0}</span>
                    <span className="stat-label">Followers</span>
                  </div>
                  <div className="stat-col">
                    <span className="stat-num">{user.following || 0}</span>
                    <span className="stat-label">Following</span>
                  </div>
                  <div className="stat-col">
                    <span className="stat-num">{user.public_repos || 0}</span>
                    <span className="stat-label">Public Repos</span>
                  </div>
                </div>

                <div className="profile-details-list">
                  {user.company && (
                    <div className="detail-row">
                      <strong>🏢 Company:</strong> <span>{user.company}</span>
                    </div>
                  )}
                  {user.location && (
                    <div className="detail-row">
                      <strong>📍 Location:</strong> <span>{user.location}</span>
                    </div>
                  )}
                  {user.blog && (
                    <div className="detail-row">
                      <strong>🌐 Website:</strong> <a href={user.blog} target="_blank" rel="noreferrer">{user.blog}</a>
                    </div>
                  )}
                  {user.html_url && (
                    <div className="detail-row">
                      <strong>🐙 GitHub Profile:</strong> <a href={user.html_url} target="_blank" rel="noreferrer">Open profile</a>
                    </div>
                  )}
                </div>
              </div>

              {/* Session State Card */}
              <div className="profile-card-session">
                <h3>🔑 Session Audit Log</h3>
                <p>Diagnostic metadata for current client-backend auth loop.</p>

                <div className="audit-table">
                  <div className="audit-row">
                    <span>Active Auth Mode</span>
                    <strong className={`mode-badge ${backendMode}`}>{backendMode.toUpperCase()}</strong>
                  </div>
                  <div className="audit-row">
                    <span>Session Store Method</span>
                    <span>{backendMode === 'express' ? 'Encrypted Cookie Session' : 'Browser localStorage'}</span>
                  </div>
                  <div className="audit-row">
                    <span>Access Token Location</span>
                    <span>{backendMode === 'express' ? 'Stored Server-Side (Secure)' : 'Local Bearer Header'}</span>
                  </div>
                  <div className="audit-row">
                    <span>GitHub OAuth Scopes</span>
                    <span><code>repo read:user</code></span>
                  </div>
                  <div className="audit-row">
                    <span>Account Synced</span>
                    <span>{formatDate(user.updated_at)}</span>
                  </div>
                </div>

                <div className="session-actions">
                  <h4>Session Control Actions</h4>
                  <p>Manually trigger redirections and session terminations:</p>
                  <div className="action-btns">
                    <button onClick={onLogout} className="session-logout-btn">
                      🚪 Terminate Session (Logout)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export default Dashboard;
