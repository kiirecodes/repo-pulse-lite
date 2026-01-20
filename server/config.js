require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3001,
  github: {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    apiUrl: 'https://api.github.com',
    oauthUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    scopes: ['repo', 'read:user']
  },
  session: {
    secret: process.env.SESSION_SECRET || 'fallback-secret-change-in-production',
    resave: false,
    saveUninitialized: false
  },
  staleThresholds: {
    prDays: 7,
    issueDays: 14,
    commitDays: 14
  }
};
