const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const authService = require('./auth');
const GitHubService = require('./githubService');

const app = express();

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());
app.use(session(config.session));

function isAuthenticated(req, res, next) {
  if (!req.session.accessToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
}

app.get('/auth/url', (req, res) => {
  try {
    const authUrl = authService.getAuthUrl();
    res.json({ authUrl });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({ error: 'Failed to generate authentication URL' });
  }
});

app.get('/auth/callback', async (req, res) => {
  try {
    const { code } = req.query;
    
    if (!code) {
      return res.redirect('http://localhost:3000?error=no_code');
    }

    const accessToken = await authService.exchangeCodeForToken(code);
    const userInfo = await authService.getUserInfo(accessToken);

    req.session.accessToken = accessToken;
    req.session.user = userInfo;

    res.redirect('http://localhost:3000?auth=success');
  } catch (error) {
    console.error('Error in OAuth callback:', error);
    res.redirect(`http://localhost:3000?error=${encodeURIComponent(error.message)}`);
  }
});

app.get('/api/user', isAuthenticated, (req, res) => {
  res.json(req.session.user);
});

app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.json({ success: true });
  });
});

app.get('/api/repositories', isAuthenticated, async (req, res) => {
  try {
    const githubService = new GitHubService(req.session.accessToken);
    const repositories = await githubService.getUserRepositories();
    res.json(repositories);
  } catch (error) {
    console.error('Error fetching repositories:', error);
    res.status(500).json({ error: 'Failed to fetch repositories' });
  }
});

app.get('/api/repositories/:owner/:repo/health', isAuthenticated, async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const githubService = new GitHubService(req.session.accessToken);
    const health = await githubService.getRepositoryHealth(owner, repo);
    res.json(health);
  } catch (error) {
    console.error(`Error fetching health for ${req.params.owner}/${req.params.repo}:`, error);
    res.status(500).json({ error: 'Failed to fetch repository health' });
  }
});

app.get('/api/health-check', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

app.use(express.static(path.join(__dirname, '../client/build')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = config.port;
app.listen(PORT, () => {
  console.log(`RepoPulse Lite server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health-check`);
});
