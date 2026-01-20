import React, { useState, useEffect } from 'react';
import { authAPI, repoAPI } from './api';
import Dashboard from './Dashboard';
import ErrorBoundary from './ErrorBoundary';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const authSuccess = urlParams.get('code');

    // Check for token in localStorage first
    const storedToken = localStorage.getItem('github_token');
    const storedUser = localStorage.getItem('github_user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      setLoading(false);
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (authSuccess) {
      handleOAuthCallback();
    } else {
      setLoading(false);
    }
  }, []);

  const handleOAuthCallback = async () => {
    try {
      const response = await authAPI.handleCallback();
      const { access_token, user: userData } = response;
      
      setToken(access_token);
      setUser(userData);
      
      // Store in localStorage for MVP simplicity
      localStorage.setItem('github_token', access_token);
      localStorage.setItem('github_user', JSON.stringify(userData));
      
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (err) {
      setError(`Authentication failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    authAPI.getAuthUrl();
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('github_token');
    localStorage.removeItem('github_user');
    authAPI.logout();
  };

  if (loading) {
    return (
      <div className="app">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app">
        <div className="error">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={() => setError('')}>Try Again</button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="app">
        <div className="login">
          <h1>RepoPulse Lite</h1>
          <p>Monitor your GitHub repositories for stale pull requests and issues</p>
          <button onClick={handleLogin} className="login-btn">
            Login with GitHub
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="app">
        <header className="app-header">
          <h1>RepoPulse Lite</h1>
          <div className="user-info">
            <span>Welcome, {user.login}</span>
            <button onClick={handleLogout} className="logout-btn">
              Logout
            </button>
          </div>
        </header>
        <main>
          <Dashboard token={token} />
        </main>
      </div>
    </ErrorBoundary>
  );
}

export default App;
