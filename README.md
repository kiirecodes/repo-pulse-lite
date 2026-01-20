# RepoPulse Lite - Cloudflare Pages

A serverless web application that integrates with the GitHub REST API to show developers which repositories have stale pull requests and issues. Deployed on Cloudflare Pages with Pages Functions.

## Features

- **GitHub OAuth Authentication** - Secure login using GitHub OAuth 2.0
- **Repository Overview** - View all your repositories with visibility and last updated timestamps
- **Stale Detection** - Automatically detects stale PRs and issues based on configurable thresholds
- **Health Status** - Simple visual indicators for repository health (🟢 Healthy, 🟡 Needs Attention, 🔴 Stale)
- **Detailed Views** - Click on any repository to see detailed lists of stale PRs and issues
- **Serverless Architecture** - Runs entirely on Cloudflare Edge with no traditional backend

## Architecture

```
Browser
  ↓
Cloudflare Pages (Static Frontend)
  ↓
Cloudflare Pages Functions (Backend APIs)
  ↓
GitHub REST API
```

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- GitHub Account
- Cloudflare Account (free tier works)

## GitHub OAuth Setup

1. **Create a GitHub OAuth App**
   - Go to GitHub Settings → Developer settings → OAuth Apps
   - Click "New OAuth App"
   - Fill in the form:
     - **Application name**: RepoPulse Lite
     - **Homepage URL**: `https://your-app.pages.dev`
     - **Authorization callback URL**: `https://your-app.pages.dev/callback`
   - Click "Register application"

2. **Get Your Credentials**
   - Note the **Client ID**
   - Generate a new **Client Secret** and save it securely

## Installation

1. **Clone or download the project**
   ```bash
   cd repo-pulse-lite
   ```

2. **Install dependencies**
   ```bash
   npm run install-all
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit the `.env` file and add your GitHub OAuth credentials:
   ```env
   GITHUB_CLIENT_ID=your_actual_github_client_id
   GITHUB_CLIENT_SECRET=your_actual_github_client_secret
   GITHUB_REDIRECT_URI=https://your-app.pages.dev/callback
   ```

## Development

### Local Development

Start both frontend and backend locally:

```bash
npm run dev
```

This will start:
- Cloudflare Pages Functions dev server on `http://localhost:8787`
- Vite frontend dev server on `http://localhost:3000` with proxy to Functions

### Building for Production

```bash
npm run build
```

This builds the React frontend to the `dist/` directory.

## Cloudflare Pages Deployment

### Method 1: Using Wrangler CLI

1. **Login to Cloudflare**
   ```bash
   npx wrangler login
   ```

2. **Deploy to Pages**
   ```bash
   npm run deploy
   ```

3. **Configure Environment Variables**
   - Go to Cloudflare Dashboard → Pages → Your Project → Settings → Environment Variables
   - Add your GitHub OAuth credentials:
     - `GITHUB_CLIENT_ID`
     - `GITHUB_CLIENT_SECRET`
     - `GITHUB_REDIRECT_URI` (set to your Pages URL + `/callback`)

### Method 2: Git Integration

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Deploy RepoPulse Lite"
   git push origin main
   ```

2. **Connect to Cloudflare Pages**
   - Go to Cloudflare Dashboard → Pages → Create a project
   - Connect to your Git repository
   - Configure build settings:
     - **Build command**: `npm run build`
     - **Build output directory**: `dist`
   - Add environment variables in Settings

## Configuration

The application uses the following thresholds for detecting stale items:

- **Stale Pull Requests**: Open for more than 7 days
- **Stale Issues**: No updates for more than 14 days
- **Stale Commits**: No commits for more than 14 days

These can be modified in the Functions:
- `functions/pulls.js` - PR threshold
- `functions/issues.js` - Issue threshold
- `functions/commits.js` - Commit threshold

## API Endpoints (Cloudflare Functions)

### Authentication
- `GET /auth` - Redirect to GitHub OAuth
- `GET /callback` - OAuth callback handler

### Repository Data
- `GET /repos` - Get user's repositories (requires Bearer token)
- `GET /pulls?owner=X&repo=Y` - Get repository PRs (requires Bearer token)
- `GET /issues?owner=X&repo=Y` - Get repository issues (requires Bearer token)
- `GET /commits?owner=X&repo=Y` - Get last commit info (requires Bearer token)

## Project Structure

```
repo-pulse-lite/
├── functions/             # Cloudflare Pages Functions
│   ├── auth.js           # GitHub OAuth redirect
│   ├── callback.js       # OAuth callback handler
│   ├── repos.js          # Repository listing
│   ├── pulls.js          # Pull requests API
│   ├── issues.js         # Issues API
│   └── commits.js        # Commit info API
├── client/               # React frontend
│   ├── src/
│   │   ├── App.jsx      # Main React application
│   │   ├── Dashboard.jsx # Repository dashboard
│   │   ├── api.js       # API client functions
│   │   └── *.css        # Styles
│   ├── vite.config.js    # Vite configuration
│   └── package.json     # Frontend dependencies
├── dist/                 # Build output (generated)
├── wrangler.toml         # Cloudflare configuration
├── .env.example          # Environment variables template
└── README.md            # This file
```

## Repository Health Logic

| Condition | Status |
|-----------|--------|
| No stale PRs/issues | 🟢 Healthy |
| 1–2 stale items | 🟡 Needs Attention |
| 3+ stale items OR no commits in 14 days | 🔴 Stale |

## Known Limitations

- **No Database**: Uses localStorage for token persistence (MVP simplicity)
- **Rate Limiting**: Subject to GitHub API rate limits (5000 requests/hour for authenticated users)
- **Single User**: Designed for individual use, not multi-tenant scenarios
- **No Persistence**: Repository health is calculated on-demand and not cached
- **GitHub API Only**: Works only with GitHub repositories
- **Edge Constraints**: Limited to Cloudflare Edge runtime capabilities

## Security Considerations

- **Environment Variables**: Never commit `.env` files to version control
- **Token Storage**: Uses localStorage for MVP (consider more secure storage for production)
- **OAuth Scopes**: Requests only necessary permissions (`repo`, `read:user`)
- **No Hardcoded Secrets**: All sensitive data stored in environment variables

## Troubleshooting

### Common Issues

1. **"Authentication failed" error**
   - Ensure your GitHub OAuth app callback URL matches exactly
   - Check environment variables are set correctly in Cloudflare

2. **"Failed to fetch repositories"**
   - Verify your GitHub token has the correct permissions
   - Check if you've hit GitHub API rate limits

3. **Build failures**
   - Ensure all dependencies are installed: `npm run install-all`
   - Check Node.js version (v16+ required)

4. **CORS errors**
   - Functions include CORS headers automatically
   - Ensure you're calling relative paths from frontend

### Debug Mode

For local development, use Wrangler's verbose logging:

```bash
wrangler pages dev dist --port 8787 --verbose
```

## Performance Considerations

- **Edge Caching**: Static assets are cached at Cloudflare edge locations
- **Function Cold Starts**: First request may be slower (subsequent requests are fast)
- **API Rate Limits**: Consider implementing caching for frequently accessed data
- **Bundle Size**: Vite optimizes bundle size for edge deployment

## Contributing

This is a minimal MVP project. When contributing:

1. Keep changes minimal and focused
2. Follow the existing code style
3. Test locally before deploying
4. Consider edge runtime constraints
5. Update documentation as needed

## License

MIT License - feel free to use this project for learning or as a foundation for your own applications.
