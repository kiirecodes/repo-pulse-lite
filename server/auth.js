const axios = require('axios');
const config = require('./config');

class AuthService {
  getAuthUrl() {
    const params = new URLSearchParams({
      client_id: config.github.clientId,
      scope: config.github.scopes.join(' '),
      redirect_uri: `http://localhost:${config.port}/auth/callback`
    });
    
    return `${config.github.oauthUrl}?${params.toString()}`;
  }

  async exchangeCodeForToken(code) {
    try {
      const response = await axios.post(config.github.tokenUrl, {
        client_id: config.github.clientId,
        client_secret: config.github.clientSecret,
        code: code
      }, {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.data.access_token) {
        throw new Error('No access token received from GitHub');
      }

      return response.data.access_token;
    } catch (error) {
      console.error('Error exchanging code for token:', error.response?.data || error.message);
      throw new Error('Failed to authenticate with GitHub');
    }
  }

  async getUserInfo(token) {
    try {
      const response = await axios.get(`${config.github.apiUrl}/user`, {
        headers: {
          'Authorization': `token ${token}`,
          'User-Agent': 'RepoPulse-Lite'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching user info:', error.response?.data || error.message);
      throw new Error('Failed to fetch user information');
    }
  }
}

module.exports = new AuthService();
