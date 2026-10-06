import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Custom Vite Plugin to provide a local OAuth 2.0 Token Exchange Endpoint.
 * Bypasses browser CORS restrictions by exchanging authorization codes with providers directly on the server.
 */
function keaosOAuthProxy() {
  return {
    name: 'keaos-oauth-proxy',
    configureServer(server) {
      server.middlewares.use('/api/oauth/token', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method Not Allowed' }));
          return;
        }

        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const data = JSON.parse(body || '{}');
            const { provider = 'github', code, clientId, clientSecret, redirectUri } = data;

            if (!code) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Missing authorization code' }));
              return;
            }

            let tokenEndpoint = '';
            let requestBody = {};
            let requestHeaders = { 'Accept': 'application/json', 'Content-Type': 'application/json' };

            if (provider.toLowerCase() === 'github') {
              tokenEndpoint = 'https://github.com/login/oauth/access_token';
              requestBody = {
                client_id: clientId || process.env.VITE_GITHUB_OAUTH_CLIENT_ID,
                client_secret: clientSecret || process.env.VITE_GITHUB_OAUTH_CLIENT_SECRET,
                code,
                redirect_uri: redirectUri
              };
            } else if (provider.toLowerCase() === 'slack') {
              tokenEndpoint = 'https://slack.com/api/oauth.v2.access';
              requestHeaders = { 'Content-Type': 'application/x-www-form-urlencoded' };
              requestBody = new URLSearchParams({
                client_id: clientId || process.env.VITE_SLACK_OAUTH_CLIENT_ID || '',
                client_secret: clientSecret || process.env.VITE_SLACK_OAUTH_CLIENT_SECRET || '',
                code,
                redirect_uri: redirectUri || ''
              }).toString();
            } else if (provider.toLowerCase() === 'jira') {
              tokenEndpoint = 'https://auth.atlassian.com/oauth/token';
              requestBody = {
                grant_type: 'authorization_code',
                client_id: clientId || process.env.VITE_JIRA_OAUTH_CLIENT_ID,
                client_secret: clientSecret || process.env.VITE_JIRA_OAUTH_CLIENT_SECRET,
                code,
                redirect_uri: redirectUri
              };
            } else if (provider.toLowerCase() === 'google') {
              tokenEndpoint = 'https://oauth2.googleapis.com/token';
              requestBody = {
                grant_type: 'authorization_code',
                client_id: clientId || process.env.VITE_GOOGLE_OAUTH_CLIENT_ID,
                client_secret: clientSecret || process.env.VITE_GOOGLE_OAUTH_CLIENT_SECRET,
                code,
                redirect_uri: redirectUri
              };
            } else {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: `Unsupported OAuth provider: ${provider}` }));
              return;
            }

            const isFormUrl = typeof requestBody === 'string';
            const upstreamRes = await fetch(tokenEndpoint, {
              method: 'POST',
              headers: requestHeaders,
              body: isFormUrl ? requestBody : JSON.stringify(requestBody)
            });

            const tokenResult = await upstreamRes.json().catch(async () => {
              const text = await upstreamRes.text();
              return { raw: text };
            });

            res.statusCode = upstreamRes.status;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(tokenResult));
          } catch (err) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message || 'Internal token exchange error' }));
          }
        });
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    keaosOAuthProxy()
  ],
})
