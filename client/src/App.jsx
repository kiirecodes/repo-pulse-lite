import React, { useState, useEffect } from 'react';
import { authAPI, healthAPI } from './api';
import Dashboard from './Dashboard';
import ErrorBoundary from './ErrorBoundary';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [backendMode, setBackendMode] = useState(null); // 'express' or 'cloudflare'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expressServerOnline, setExpressServerOnline] = useState(false);

  // Check Express health status
  const checkExpressHealth = async () => {
    try {
      await healthAPI.getExpressHealth();
      setExpressServerOnline(true);
      return true;
    } catch (err) {
      setExpressServerOnline(false);
      return false;
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true);
      const urlParams = new URLSearchParams(window.location.search);
      const authParam = urlParams.get('auth');
      const errorParam = urlParams.get('error');
      const codeParam = urlParams.get('code');

      // Check if Express server is reachable
      const expressOnline = await checkExpressHealth();

      // Handle OAuth error from URL (Express or general)
      if (errorParam) {
        setError(`Authentication failed: ${errorParam}`);
        setLoading(false);
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }

      // 1. If redirected back from Express auth success
      if (authParam === 'success' && expressOnline) {
        try {
          const userData = await authAPI.getUserExpress();
          setUser(userData);
          setBackendMode('express');
          window.history.replaceState({}, document.title, window.location.pathname);
          setLoading(false);
          return;
        } catch (err) {
          console.error('Failed to get user after Express redirect success', err);
        }
      }

      // 2. Check if there's an existing active session on the Express backend
      if (expressOnline) {
        try {
          const userData = await authAPI.getUserExpress();
          if (userData && userData.login) {
            setUser(userData);
            setBackendMode('express');
            setLoading(false);
            return;
          }
        } catch (err) {
          // No active Express session, proceed to check Cloudflare Pages auth
          console.log('No active Express session found. Checking Cloudflare Pages session...');
        }
      }

      // 3. Handle Cloudflare Pages callback (has code in query param)
      if (codeParam) {
        try {
          const response = await authAPI.handleCallbackCloudflare(codeParam);
          const { access_token, user: userData } = response;
          
          setToken(access_token);
          setUser(userData);
          setBackendMode('cloudflare');
          
          // Store in localStorage for Cloudflare Mode persistence
          localStorage.setItem('github_token', access_token);
          localStorage.setItem('github_user', JSON.stringify(userData));
          
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (err) {
          setError(`Authentication failed (Cloudflare Mode): ${err.message}`);
        } finally {
          setLoading(false);
        }
        return;
      }

      // 4. Fallback to Cloudflare stored session
      const storedToken = localStorage.getItem('github_token');
      const storedUser = localStorage.getItem('github_user');

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        setBackendMode('cloudflare');
        setLoading(false);
        return;
      }

      setLoading(false);
    };

    initializeAuth();
  }, []);

  const handleLoginExpress = async () => {
    try {
      setLoading(true);
      const authUrl = await authAPI.getAuthUrlExpress();
      window.location.href = authUrl;
    } catch (err) {
      setError(`Failed to initiate Express login: ${err.message}`);
      setLoading(false);
    }
  };

  const handleLoginCloudflare = () => {
    authAPI.getAuthUrlCloudflare();
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      if (backendMode === 'express') {
        await authAPI.logoutExpress();
      } else {
        localStorage.removeItem('github_token');
        localStorage.removeItem('github_user');
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      setToken(null);
      setBackendMode(null);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="app">
        <div className="loading-container">
          <div className="spinner"></div>
          <div className="loading-text">Verifying Session Status...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app">
        <div className="error-card">
          <div className="error-icon">⚠️</div>
          <h2>Authentication Error</h2>
          <p className="error-message">{error}</p>
          <button onClick={() => setError('')} className="retry-btn">Dismiss & Try Again</button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="app login-layout">
        <div className="login-card">
          <div className="logo-badge">⚡</div>
          <h1>RepoPulse Lite</h1>
          <p className="subtitle">
            Monitor and audit your GitHub repositories for stale pull requests, issues, and active commit health.
          </p>
          
          <div className="login-options">
            <div className="option-card">
              <h3>Express Server Mode</h3>
              <p>Uses a traditional Express backend server with secure sessions.</p>
              <button 
                onClick={handleLoginExpress} 
                className="login-btn express-btn"
                disabled={!expressServerOnline}
              >
                {expressServerOnline ? 'Login with Express' : 'Express Server Offline'}
              </button>
              <span className={`status-indicator ${expressServerOnline ? 'online' : 'offline'}`}>
                {expressServerOnline ? '● Express Server Available (Port 3001)' : '○ Express Server Offline'}
              </span>
            </div>

            <div className="option-card">
              <h3>Cloudflare Pages Mode</h3>
              <p>Uses serverless Cloudflare Pages Functions and local access tokens.</p>
              <button onClick={handleLoginCloudflare} className="login-btn cloudflare-btn">
                Login with Cloudflare
              </button>
              <span className="status-indicator online">● Pages Functions Available</span>
            </div>
          </div>
          
          <footer className="login-footer">
            Fully responsive, dual-mode GitHub audit utility.
          </footer>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="app">
        <header className="app-header">
          <div className="brand-header">
            <span className="brand-logo">⚡</span>
            <h1>RepoPulse Lite</h1>
            <span className={`backend-mode-tag ${backendMode}`}>
              {backendMode === 'express' ? 'Express Server' : 'Cloudflare Serverless'}
            </span>
          </div>
          <div className="user-info">
            {user.avatar_url && (
              <img src={user.avatar_url} alt={user.login} className="user-avatar" />
            )}
            <div className="user-details-compact">
              <span className="welcome-text">Welcome,</span>
              <span className="user-name">{user.name || user.login}</span>
            </div>
            <button onClick={handleLogout} className="logout-btn">
              Logout
            </button>
          </div>
        </header>
        <main>
          <Dashboard 
            token={token} 
            user={user} 
            backendMode={backendMode} 
            expressServerOnline={expressServerOnline}
            onLogout={handleLogout}
          />
        </main>
      </div>
    </ErrorBoundary>
  );
}

export default App;
