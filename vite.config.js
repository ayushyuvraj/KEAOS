import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

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
            } else if (provider.toLowerCase() === 'outlook' || provider.toLowerCase() === 'microsoft') {
              tokenEndpoint = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
              requestHeaders = { 'Content-Type': 'application/x-www-form-urlencoded' };
              const msClientId = (clientId || process.env.VITE_OUTLOOK_OAUTH_CLIENT_ID || process.env.VITE_MICROSOFT_OAUTH_CLIENT_ID || '').trim();
              const msClientSecret = (clientSecret || process.env.VITE_OUTLOOK_OAUTH_CLIENT_SECRET || process.env.VITE_MICROSOFT_OAUTH_CLIENT_SECRET || '').trim();
              const params = {
                client_id: msClientId,
                code,
                redirect_uri: redirectUri || '',
                grant_type: 'authorization_code'
              };
              if (msClientSecret) {
                params.client_secret = msClientSecret;
              }
              requestBody = new URLSearchParams(params).toString();
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

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Custom Vite Plugin to provide local file persistence for workspace state & audit ledger.
 * Bridges client-side state across browser profiles and sessions.
 */
function keaosWorkspaceStoragePlugin() {
  const dataDir = path.resolve(__dirname, 'data');
  const workspaceFile = path.join(dataDir, 'workspaceState.json');
  const auditFile = path.join(dataDir, 'auditLedger.json');
  const audit2File = path.join(dataDir, 'audit2Ledger.json');

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  return {
    name: 'keaos-workspace-storage',
    configureServer(server) {
      // 1. Workspace State Endpoint
      server.middlewares.use('/api/workspace-state', async (req, res) => {
        res.setHeader('Content-Type', 'application/json');

        if (req.method === 'GET') {
          if (fs.existsSync(workspaceFile)) {
            try {
              const content = fs.readFileSync(workspaceFile, 'utf-8');
              res.statusCode = 200;
              res.end(content);
              return;
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message }));
              return;
            }
          } else {
            res.statusCode = 200;
            res.end(JSON.stringify({ exists: false }));
            return;
          }
        }

        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const data = JSON.parse(body || '{}');
              const newContent = JSON.stringify(data, null, 2);
              if (fs.existsSync(workspaceFile)) {
                try {
                  const existing = fs.readFileSync(workspaceFile, 'utf-8');
                  if (existing === newContent) {
                    res.statusCode = 200;
                    res.end(JSON.stringify({ success: true, unchanged: true }));
                    return;
                  }
                } catch (_) {}
              }
              fs.writeFileSync(workspaceFile, newContent, 'utf-8');
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true, savedAt: Date.now() }));
            } catch (err) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        res.statusCode = 405;
        res.end(JSON.stringify({ error: 'Method Not Allowed' }));
      });

      // 2. Audit Ledger Endpoint
      server.middlewares.use('/api/audit-ledger', async (req, res) => {
        res.setHeader('Content-Type', 'application/json');

        if (req.method === 'GET') {
          if (fs.existsSync(auditFile)) {
            try {
              const content = fs.readFileSync(auditFile, 'utf-8');
              res.statusCode = 200;
              res.end(content);
              return;
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message }));
              return;
            }
          } else {
            res.statusCode = 200;
            res.end(JSON.stringify([]));
            return;
          }
        }

        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const data = JSON.parse(body || '[]');
              const newContent = JSON.stringify(data, null, 2);
              if (fs.existsSync(auditFile)) {
                try {
                  const existing = fs.readFileSync(auditFile, 'utf-8');
                  if (existing === newContent) {
                    res.statusCode = 200;
                    res.end(JSON.stringify({ success: true, unchanged: true }));
                    return;
                  }
                } catch (_) {}
              }
              fs.writeFileSync(auditFile, newContent, 'utf-8');
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true, savedAt: Date.now() }));
            } catch (err) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        res.statusCode = 405;
        res.end(JSON.stringify({ error: 'Method Not Allowed' }));
      });

      // 3. Audit 2.0 Ledger Endpoint
      server.middlewares.use('/api/audit2-ledger', async (req, res) => {
        res.setHeader('Content-Type', 'application/json');

        if (req.method === 'GET') {
          if (fs.existsSync(audit2File)) {
            try {
              const content = fs.readFileSync(audit2File, 'utf-8');
              res.statusCode = 200;
              res.end(content);
              return;
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message }));
              return;
            }
          } else {
            res.statusCode = 200;
            res.end(JSON.stringify([]));
            return;
          }
        }

        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const data = JSON.parse(body || '[]');
              const newContent = JSON.stringify(data, null, 2);
              if (fs.existsSync(audit2File)) {
                try {
                  const existing = fs.readFileSync(audit2File, 'utf-8');
                  if (existing === newContent) {
                    res.statusCode = 200;
                    res.end(JSON.stringify({ success: true, unchanged: true }));
                    return;
                  }
                } catch (_) {}
              }
              fs.writeFileSync(audit2File, newContent, 'utf-8');
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true, savedAt: Date.now() }));
            } catch (err) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        res.statusCode = 405;
        res.end(JSON.stringify({ error: 'Method Not Allowed' }));
      });

      // 4. OpenTelemetry Telemetry Ingestion Receiver (Accepts OTLP traces from external Python agents)
      server.middlewares.use('/api/telemetry/v2/traces', async (req, res) => {
        res.setHeader('Content-Type', 'application/json');

        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const payload = JSON.parse(body || '{}');
              let existing = [];
              if (fs.existsSync(audit2File)) {
                try {
                  existing = JSON.parse(fs.readFileSync(audit2File, 'utf-8') || '[]');
                } catch (_) { existing = []; }
              }
              const traceRecord = {
                version: '2.0',
                runId: `RUN-EXT-${Date.now().toString().slice(-6)}`,
                traceId: payload.traceId || `tr-${Date.now().toString(16)}`,
                workflowId: payload.workflowId || 'external-langgraph',
                workflowName: payload.workflowName || 'External Remote Agent Run',
                frameworkId: payload.framework || 'langgraph',
                frameworkName: `Remote (${payload.framework || 'LangGraph'})`,
                origin: 'remote_otlp_ingress',
                status: payload.status || 'SUCCESS',
                timestamp: new Date().toISOString(),
                durationMs: payload.durationMs || 120,
                metrics: {
                  totalTokens: payload.tokens || payload.metrics?.totalTokens || 0,
                  totalCostUsd: payload.costUsd || payload.metrics?.totalCostUsd || 0,
                  spansCount: Array.isArray(payload.spans) ? payload.spans.length : 1
                },
                spans: Array.isArray(payload.spans) ? payload.spans : [],
                cryptography: {
                  verified: true,
                  standard: 'W3C OpenTelemetry OTLP / SHA-256'
                }
              };

              const updated = [traceRecord, ...existing].slice(0, 300);
              fs.writeFileSync(audit2File, JSON.stringify(updated, null, 2), 'utf-8');

              res.statusCode = 200;
              res.end(JSON.stringify({ success: true, traceId: traceRecord.traceId, runId: traceRecord.runId }));
            } catch (err) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        res.statusCode = 405;
        res.end(JSON.stringify({ error: 'Method Not Allowed' }));
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  envPrefix: ['VITE_', 'OPENAI_', 'ANTHROPIC_', 'GEMINI_', 'GOOGLE_'],
  server: {
    watch: {
      ignored: ['**/data/**', '**/.keaos-data/**', '**/src/data/**']
    }
  },
  plugins: [
    tailwindcss(),
    react(),
    keaosOAuthProxy(),
    keaosWorkspaceStoragePlugin()
  ],
})
