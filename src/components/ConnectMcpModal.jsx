import React, { useState, useEffect } from 'react';
import { 
  X, 
  Check, 
  Copy, 
  ExternalLink, 
  Loader2, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle2, 
  Info,
  Server,
  Layers,
  MessageSquare,
  Mail,
  ChevronDown,
  Database
} from 'lucide-react';
import { 
  verifyAndDiscoverMcpServer, 
  verifySlackMcpConnection, 
  verifyJiraMcpConnection, 
  verifyGitHubMcpConnection,
  verifyNeo4jMcpConnection,
  verifyOutlookMcpConnection,
  connectMcpViaOAuth,
  saveRegisteredMcpServer,
  getStoredMicrosoftOAuthCredentials,
  saveStoredMicrosoftOAuthCredentials
} from '../services/mcpClientService';

function OutlookLogo({ className = 'w-6 h-6' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect width="24" height="24" rx="2" fill="#0078D4" />
      <path d="M14 6H19C19.5523 6 20 6.44772 20 7V17C20 17.5523 19.5523 18 19 18H14V6Z" fill="#28A8EA" />
      <path d="M4 8C4 7.44772 4.44772 7 5 7H14V17H5C4.44772 17 4 16.5523 4 16V8Z" fill="#0078D4" />
      <circle cx="9" cy="12" r="3.2" fill="#FFFFFF" fillOpacity="0.2" />
      <text x="9" y="15" fill="#FFFFFF" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">O</text>
    </svg>
  );
}

// Authentic GitHub Invertocat Logo (Matches Screenshots 1-4)
function GitHubLogo({ className = 'w-6 h-6' }) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="currentColor" 
      className={className}
    >
      <path 
        fillRule="evenodd" 
        clipRule="evenodd" 
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" 
      />
    </svg>
  );
}

// Service Providers Registry
const PROVIDERS_CONFIG = {
  github: {
    id: 'github',
    title: 'GitHub account',
    apiSubtitles: {
      token: 'GitHub API',
      oauth: 'GitHub OAuth2 API'
    },
    icon: GitHubLogo,
    defaultServer: 'https://api.github.com',
    authModes: [
      { id: 'token', label: 'Access Token' },
      { id: 'oauth', label: 'OAuth2' }
    ],
    docsUrl: 'https://docs.github.com/en/rest',
    directTokenGenUrl: 'https://github.com/settings/tokens',
    directTokenGenLabel: 'Generate Personal Access Token at github.com/settings/tokens',
    directOAuthGenUrl: 'https://github.com/settings/developers',
    directOAuthGenLabel: 'Register OAuth App at github.com/settings/developers'
  },
  slack: {
    id: 'slack',
    title: 'Slack account',
    apiSubtitles: {
      token: 'Slack Webhook / Bot API',
      oauth: 'Slack OAuth2 API'
    },
    icon: MessageSquare,
    defaultServer: 'https://slack.com/api',
    authModes: [
      { id: 'token', label: 'Webhook / Token' },
      { id: 'oauth', label: 'OAuth2' }
    ],
    docsUrl: 'https://api.slack.com',
    directTokenGenUrl: 'https://api.slack.com/apps',
    directTokenGenLabel: 'Manage Slack Apps & Incoming Webhooks at api.slack.com/apps',
    directOAuthGenUrl: 'https://api.slack.com/apps',
    directOAuthGenLabel: 'Create Slack OAuth App at api.slack.com/apps'
  },
  jira: {
    id: 'jira',
    title: 'Jira account',
    apiSubtitles: {
      token: 'Jira Cloud API',
      oauth: 'Jira OAuth2 API'
    },
    icon: Layers,
    defaultServer: 'https://api.atlassian.com',
    authModes: [
      { id: 'token', label: 'API Token' },
      { id: 'oauth', label: 'OAuth2' }
    ],
    docsUrl: 'https://developer.atlassian.com/cloud/jira/platform/rest/v3/',
    directTokenGenUrl: 'https://id.atlassian.com/manage-profile/security/api-tokens',
    directTokenGenLabel: 'Generate Atlassian API Token at id.atlassian.com',
    directOAuthGenUrl: 'https://developer.atlassian.com/console',
    directOAuthGenLabel: 'Register Atlassian OAuth App at developer.atlassian.com/console'
  },
  google: {
    id: 'google',
    title: 'Google Workspace account',
    apiSubtitles: {
      oauth: 'Google Workspace OAuth2 API'
    },
    icon: Mail,
    defaultServer: 'https://www.googleapis.com',
    authModes: [
      { id: 'oauth', label: 'OAuth2' }
    ],
    docsUrl: 'https://developers.google.com/workspace',
    directOAuthGenUrl: 'https://console.cloud.google.com/apis/credentials',
    directOAuthGenLabel: 'Configure Google Cloud OAuth Client ID at console.cloud.google.com'
  },
  neo4j: {
    id: 'neo4j',
    title: 'Neo4j Graph Database',
    apiSubtitles: {
      credentials: 'Neo4j Bolt / AuraDB / HTTP Cypher API',
      endpoint: 'Neo4j MCP Server (JSON-RPC 2.0 / SSE)'
    },
    icon: Database,
    defaultServer: 'bolt://localhost:7687',
    authModes: [
      { id: 'credentials', label: 'Bolt / AuraDB / HTTP' },
      { id: 'endpoint', label: 'MCP Server Endpoint' }
    ],
    docsUrl: 'https://github.com/neo4j/mcp',
    directTokenGenUrl: 'https://neo4j.com/docs/operations-manual/current/authentication-authorization/',
    directTokenGenLabel: 'Neo4j Database Security & Credentials Guide',
    directOAuthGenUrl: 'https://github.com/neo4j/mcp',
    directOAuthGenLabel: 'Neo4j Official Model Context Protocol Reference'
  },
  outlook: {
    id: 'outlook',
    title: 'Microsoft Outlook account',
    apiSubtitles: {
      oauth: 'Microsoft Entra ID (Azure AD) OAuth2',
      token: 'Microsoft Graph API (Bearer Token)'
    },
    icon: OutlookLogo,
    defaultServer: 'https://graph.microsoft.com/v1.0',
    authModes: [
      { id: 'oauth', label: 'OAuth2 (Entra ID)' },
      { id: 'token', label: 'Graph Bearer Token' }
    ],
    docsUrl: 'https://learn.microsoft.com/en-us/graph/api/resources/mail-api-overview',
    directTokenGenUrl: 'https://developer.microsoft.com/en-us/graph/graph-explorer',
    directTokenGenLabel: 'Copy Access Token at Microsoft Graph Explorer',
    directOAuthGenUrl: 'https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade',
    directOAuthGenLabel: 'Register App in Microsoft Entra Admin Center'
  },
  url: {
    id: 'url',
    title: 'Universal MCP Server',
    apiSubtitles: {
      token: 'JSON-RPC 2.0 / SSE Protocol'
    },
    icon: Server,
    defaultServer: 'http://localhost:8000/sse',
    authModes: [
      { id: 'token', label: 'Direct Endpoint' }
    ],
    docsUrl: 'https://modelcontextprotocol.io',
    directTokenGenUrl: 'https://modelcontextprotocol.io',
    directTokenGenLabel: 'Model Context Protocol Documentation'
  }
};

export default function ConnectMcpModal({
  isOpen,
  initialTab = 'github',
  onClose,
  onAddMcpNodeToCanvas,
  isDarkMode = true
}) {
  // Normalize provider tab
  const resolvedProviderKey = PROVIDERS_CONFIG[initialTab] ? initialTab : 'github';
  const [selectedProvider, setSelectedProvider] = useState(resolvedProviderKey);
  const [authMode, setAuthMode] = useState('token'); // 'token' | 'oauth'

  // Update selected provider when opened or tab changes
  useEffect(() => {
    if (initialTab && PROVIDERS_CONFIG[initialTab]) {
      setSelectedProvider(initialTab);
      // Google & Outlook default to OAuth2 mode
      if (initialTab === 'google' || initialTab === 'outlook') {
        setAuthMode('oauth');
      } else if (initialTab === 'neo4j') {
        setAuthMode('credentials');
      } else {
        setAuthMode('token');
      }
    }
  }, [initialTab, isOpen]);

  // Pre-fill stored credentials for Outlook when active
  useEffect(() => {
    if (selectedProvider === 'outlook') {
      const ms = getStoredMicrosoftOAuthCredentials();
      if (ms.clientId && !clientId) setClientId(ms.clientId);
      if (ms.clientSecret && !clientSecret) setClientSecret(ms.clientSecret);
    }
  }, [selectedProvider, isOpen]);

  // Form Fields State
  const [serverUrl, setServerUrl] = useState('https://api.github.com');
  const [username, setUsername] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [showAccessToken, setShowAccessToken] = useState(false);
  const [allowedDomains, setAllowedDomains] = useState('All');

  // Neo4j Specific State (All 3 connection modes: Local, AuraDB, Standalone MCP)
  const [neo4jUri, setNeo4jUri] = useState('bolt://localhost:7687');
  const [neo4jUsername, setNeo4jUsername] = useState('neo4j');
  const [neo4jPassword, setNeo4jPassword] = useState('');
  const [showNeo4jPassword, setShowNeo4jPassword] = useState(false);
  const [neo4jDatabase, setNeo4jDatabase] = useState('neo4j');
  const [neo4jMode, setNeo4jMode] = useState('local'); // 'local' | 'aura'

  // OAuth2 Fields State
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [showClientSecret, setShowClientSecret] = useState(false);
  const [copiedRedirect, setCopiedRedirect] = useState(false);

  // Jira & Slack Specific State
  const [jiraDomain, setJiraDomain] = useState('');
  const [jiraEmail, setJiraEmail] = useState('');
  const [slackWebhook, setSlackWebhook] = useState('');
  const [slackChannel, setSlackChannel] = useState('#general');

  // Execution & Error State
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successInfo, setSuccessInfo] = useState(null);

  // Compute active provider metadata
  const currentProvider = PROVIDERS_CONFIG[selectedProvider] || PROVIDERS_CONFIG.github;
  const ServiceIcon = currentProvider.icon;
  const currentSubtitle = currentProvider.apiSubtitles[authMode] || currentProvider.apiSubtitles.token || 'API Protocol';

  // OAuth Redirect URL
  const callbackUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/oauth-callback.html` 
    : 'http://localhost:5678/rest/oauth2-credential/callback';

  // Reset errors on switch
  useEffect(() => {
    setErrorMessage(null);
    setSuccessInfo(null);
  }, [selectedProvider, authMode]);

  // Sync default server URL when switching providers
  useEffect(() => {
    if (currentProvider.defaultServer) {
      setServerUrl(currentProvider.defaultServer);
    }
  }, [selectedProvider]);

  if (!isOpen) return null;

  const handleCopyRedirect = () => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(callbackUrl);
      setCopiedRedirect(true);
      setTimeout(() => setCopiedRedirect(false), 2000);
    }
  };

  // Main Save / Connect Handler
  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessInfo(null);

    try {
      let result = null;

      // ==========================================
      // 1. GITHUB PROVIDER
      // ==========================================
      if (selectedProvider === 'github') {
        if (authMode === 'token') {
          if (!accessToken.trim()) {
            throw new Error('Please enter your GitHub Access Token.');
          }
          result = await verifyGitHubMcpConnection({
            personalAccessToken: accessToken.trim(),
            defaultOwner: username.trim() || undefined,
            defaultRepo: ''
          });
        } else {
          // OAuth2 Mode
          if (!clientId.trim()) {
            throw new Error('Please enter your GitHub Client ID.');
          }
          if (!clientSecret.trim()) {
            throw new Error('Please enter your GitHub Client Secret.');
          }
          result = await connectMcpViaOAuth({
            provider: 'github',
            clientId: clientId.trim(),
            clientSecret: clientSecret.trim(),
            redirectUri: callbackUrl
          });
        }
      }

      // ==========================================
      // 2. SLACK PROVIDER
      // ==========================================
      else if (selectedProvider === 'slack') {
        if (authMode === 'token') {
          if (!slackWebhook.trim() && !accessToken.trim()) {
            throw new Error('Please provide a Slack Webhook URL or Bot Token.');
          }
          result = await verifySlackMcpConnection({
            webhookUrl: slackWebhook.trim() || (accessToken.startsWith('https://') ? accessToken.trim() : ''),
            botToken: !slackWebhook.trim() && !accessToken.startsWith('https://') ? accessToken.trim() : '',
            defaultChannel: slackChannel.trim() || '#general'
          });
        } else {
          result = await connectMcpViaOAuth({
            provider: 'slack',
            clientId: clientId.trim(),
            clientSecret: clientSecret.trim()
          });
        }
      }

      // ==========================================
      // 3. JIRA PROVIDER
      // ==========================================
      else if (selectedProvider === 'jira') {
        if (authMode === 'token') {
          if (!jiraDomain.trim() || !jiraEmail.trim() || !accessToken.trim()) {
            throw new Error('Please provide Jira Domain, Email, and API Token.');
          }
          result = await verifyJiraMcpConnection({
            domain: jiraDomain.trim(),
            email: jiraEmail.trim(),
            apiToken: accessToken.trim(),
            projectKey: 'ENG'
          });
        } else {
          result = await connectMcpViaOAuth({
            provider: 'jira',
            clientId: clientId.trim(),
            clientSecret: clientSecret.trim()
          });
        }
      }

      // ==========================================
      // ==========================================
      // 4. GOOGLE WORKSPACE PROVIDER
      // ==========================================
      else if (selectedProvider === 'google') {
        result = await connectMcpViaOAuth({
          provider: 'google',
          clientId: clientId.trim(),
          clientSecret: clientSecret.trim()
        });
      }

      // ==========================================
      // 4.5 MICROSOFT OUTLOOK PROVIDER
      // ==========================================
      else if (selectedProvider === 'outlook') {
        if (authMode === 'token') {
          if (!accessToken.trim()) {
            throw new Error('Please provide a Microsoft Graph API Bearer Token.');
          }
          result = await verifyOutlookMcpConnection({
            token: accessToken.trim(),
            mailboxEmail: ''
          });
        } else {
          result = await connectMcpViaOAuth({
            provider: 'outlook',
            clientId: clientId.trim(),
            clientSecret: clientSecret.trim()
          });
          if (clientId.trim()) {
            saveStoredMicrosoftOAuthCredentials(clientId.trim(), clientSecret.trim());
          }
        }
      }

      // ==========================================
      // 5. NEO4J GRAPH DATABASE PROVIDER (All 3 Modes)
      // ==========================================
      else if (selectedProvider === 'neo4j') {
        if (authMode === 'endpoint') {
          if (!serverUrl.trim()) {
            throw new Error('Please enter a valid Neo4j MCP server endpoint URL (e.g. http://localhost:8000/sse).');
          }
          result = await verifyNeo4jMcpConnection({
            connectionMode: 'endpoint',
            serverUrl: serverUrl.trim(),
            database: neo4jDatabase.trim() || 'neo4j'
          });
        } else {
          // Direct Credentials mode (Local or AuraDB)
          if (!neo4jUri.trim()) {
            throw new Error('Please enter your Neo4j connection URI (e.g. bolt://localhost:7687 or neo4j+s://xxxx.databases.neo4j.io).');
          }
          if (!neo4jUsername.trim()) {
            throw new Error('Please enter your Neo4j username (default: neo4j).');
          }
          if (!neo4jPassword.trim()) {
            throw new Error('Please enter your Neo4j password.');
          }
          result = await verifyNeo4jMcpConnection({
            connectionMode: neo4jMode,
            uri: neo4jUri.trim(),
            username: neo4jUsername.trim(),
            password: neo4jPassword.trim(),
            database: neo4jDatabase.trim() || 'neo4j'
          });
        }
      }

      // ==========================================
      // 6. UNIVERSAL URL / SSE PROVIDER
      // ==========================================
      else if (selectedProvider === 'url') {
        if (!serverUrl.trim()) {
          throw new Error('Please enter a valid MCP server endpoint URL.');
        }
        result = await verifyAndDiscoverMcpServer(serverUrl.trim());
      }

      // Save to registered store and deploy to Canvas
      if (result) {
        saveRegisteredMcpServer(result);
        if (onAddMcpNodeToCanvas) {
          onAddMcpNodeToCanvas(result);
        }
        setSuccessInfo(result);

        window.dispatchEvent(
          new CustomEvent('keaos:toast', {
            detail: { message: `🔗 Connected ${currentProvider.title}: "${result.name || result.displayName}" to Canvas` }
          })
        );

        // Close after brief visual confirmation
        setTimeout(() => {
          onClose();
        }, 350);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to authenticate credential with MCP server.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 select-none animate-in fade-in duration-150">
      {/* Outer Dialog Box - Sleek n8n-style dark container */}
      <div 
        className="w-full max-w-[720px] bg-[#2B2D31] text-white border border-[#3E4148] shadow-[0_24px_64px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden rounded-md animate-in zoom-in-95 duration-150"
      >
        {/* ======================================================== */}
        {/* DIALOG HEADER (Matches Screenshot)                       */}
        {/* ======================================================== */}
        <div className="px-6 py-4 bg-[#2B2D31] flex items-center justify-between border-b border-[#383A40]">
          <div className="flex items-center gap-3.5">
            <div className="text-white shrink-0">
              <ServiceIcon className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-white tracking-tight leading-tight">
                {currentProvider.title}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 font-normal">
                {currentSubtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Save Button (Coral red #FF6D5A) */}
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="bg-[#FF6D5A] hover:bg-[#E55B49] active:bg-[#D44A39] disabled:opacity-50 text-white text-xs font-semibold px-4 py-1.5 rounded transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save</span>
              )}
            </button>

            {/* Close 'X' Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white hover:bg-white/5 rounded transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Provider Switcher Tabs (Allows seamless switching between all 6 MCP servers) */}
        <div className="px-6 py-2 bg-[#232529] border-b border-[#383A40] flex items-center gap-1.5 overflow-x-auto">
          {Object.values(PROVIDERS_CONFIG).map((p) => {
            const isPActive = selectedProvider === p.id;
            const Icon = p.icon;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setSelectedProvider(p.id);
                  if (p.id === 'google' || p.id === 'outlook') setAuthMode('oauth');
                  else if (p.id === 'neo4j') setAuthMode('credentials');
                  else setAuthMode('token');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-all cursor-pointer whitespace-nowrap ${
                  isPActive
                    ? 'bg-[#00A3A6]/20 text-[#00A3A6] border border-[#00A3A6]/40 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{p.title.replace(' account', '').replace(' Server', '')}</span>
              </button>
            );
          })}
        </div>

        {/* ======================================================== */}
        {/* DIALOG BODY (Full Width - No Left Sidebar as Requested)   */}
        {/* ======================================================== */}
        <div className="p-6 overflow-y-auto max-h-[75vh] space-y-5 custom-dialog-scroll">
          
          {/* Top Amber Callout Banner with Docs & Direct Generator Link */}
          <div className="bg-[#2E281C] border border-[#6B5A33] rounded px-4 py-3 flex flex-wrap items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-2 text-[#D4CEBF]">
              <span>Need help filling out these fields?</span>
              <a 
                href={currentProvider.docsUrl} 
                target="_blank" 
                rel="noreferrer" 
                className="text-[#FF6D5A] hover:underline font-medium inline-flex items-center gap-1"
              >
                Open docs
              </a>
            </div>

            {/* Direct Token / OAuth Generation Link (User explicit requirement) */}
            {authMode === 'token' && currentProvider.directTokenGenUrl && (
              <a
                href={currentProvider.directTokenGenUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[#FF6D5A] hover:underline font-medium inline-flex items-center gap-1 text-[11px] bg-black/20 px-2 py-1 rounded border border-[#6B5A33]/50"
              >
                <span>{currentProvider.directTokenGenLabel}</span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            )}

            {authMode === 'oauth' && currentProvider.directOAuthGenUrl && (
              <a
                href={currentProvider.directOAuthGenUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[#FF6D5A] hover:underline font-medium inline-flex items-center gap-1 text-[11px] bg-black/20 px-2 py-1 rounded border border-[#6B5A33]/50"
              >
                <span>{currentProvider.directOAuthGenLabel}</span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            )}
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded flex items-start gap-2.5 text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
              <p className="leading-relaxed flex-1">{errorMessage}</p>
            </div>
          )}

          {/* Success Banner */}
          {successInfo && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded flex items-start gap-2.5 text-emerald-400 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              <p className="leading-relaxed flex-1">
                Successfully authenticated and registered! Deploying to canvas...
              </p>
            </div>
          )}

          {/* Connect using * Selector */}
          <div>
            <label className="text-xs font-medium text-slate-200 block mb-2">
              Connect using <span className="text-[#FF6D5A]">*</span>
            </label>
            <div className="flex items-center gap-2.5">
              {currentProvider.authModes.map((mode) => {
                const isActive = authMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setAuthMode(mode.id)}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded text-xs font-medium transition-all cursor-pointer ${
                      isActive
                        ? 'border border-[#FF6D5A] bg-[#232529] text-[#FF6D5A] shadow-xs'
                        : 'border border-[#3E4148] bg-[#232529] text-slate-400 hover:text-slate-200 hover:border-slate-500'
                    }`}
                  >
                    {/* Radio Dot indicator (●) vs (○) */}
                    <span 
                      className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border transition-all ${
                        isActive 
                          ? 'border-[#FF6D5A] bg-transparent' 
                          : 'border-slate-500 bg-transparent'
                      }`}
                    >
                      {isActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FF6D5A]" />
                      )}
                    </span>
                    <span>{mode.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ======================================================== */}
          {/* OUTLOOK CAPABILITIES OVERVIEW PILL                      */}
          {/* ======================================================== */}
          {selectedProvider === 'outlook' && (
            <div className="p-3 bg-[#1A1F26] border border-[#2D3748] rounded text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#00A3A6]" />
                  <span>38 Official Microsoft Outlook & M365 Tools</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#00A3A6]/20 text-[#00A3A6] font-bold">
                  Zero Simulation
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Connects directly to Microsoft Graph API v1.0. Full 6-suite integration covering <strong className="text-slate-200">Mail Operations</strong> (12 tools), <strong className="text-slate-200">Folders & Attachments</strong> (4 tools), <strong className="text-slate-200">Calendar & Scheduling</strong> (10 tools), <strong className="text-slate-200">Contacts</strong> (5 tools), <strong className="text-slate-200">Tasks / To Do</strong> (5 tools), and <strong className="text-slate-200">Mailbox Rules</strong> (2 tools).
              </p>
            </div>
          )}

          {/* ======================================================== */}
          {/* FIELDS FOR NEO4J GRAPH DATABASE (ALL 3 MODES)            */}
          {/* ======================================================== */}
          {selectedProvider === 'neo4j' && (
            <div className="space-y-4">
              {authMode === 'credentials' ? (
                <>
                  {/* Environment Selector: Local vs AuraDB */}
                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1.5">
                      Target Neo4j Environment
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setNeo4jMode('local');
                          if (neo4jUri.includes('databases.neo4j.io')) {
                            setNeo4jUri('bolt://localhost:7687');
                          }
                        }}
                        className={`p-2.5 rounded border text-left transition-all cursor-pointer ${
                          neo4jMode === 'local'
                            ? 'border-[#00A3A6] bg-[#00A3A6]/10 text-white'
                            : 'border-[#383A40] bg-[#1F2125] text-slate-400 hover:border-slate-500'
                        }`}
                      >
                        <div className="font-semibold text-xs flex items-center gap-1.5 text-white">
                          <span className={`w-2 h-2 rounded-full ${neo4jMode === 'local' ? 'bg-[#00A3A6]' : 'bg-slate-500'}`} />
                          <span>Local Neo4j Instance</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                          bolt://localhost:7687 or http://localhost:7474
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setNeo4jMode('aura');
                          if (neo4jUri === 'bolt://localhost:7687') {
                            setNeo4jUri('neo4j+s://');
                          }
                        }}
                        className={`p-2.5 rounded border text-left transition-all cursor-pointer ${
                          neo4jMode === 'aura'
                            ? 'border-[#00A3A6] bg-[#00A3A6]/10 text-white'
                            : 'border-[#383A40] bg-[#1F2125] text-slate-400 hover:border-slate-500'
                        }`}
                      >
                        <div className="font-semibold text-xs flex items-center gap-1.5 text-white">
                          <span className={`w-2 h-2 rounded-full ${neo4jMode === 'aura' ? 'bg-[#00A3A6]' : 'bg-slate-500'}`} />
                          <span>Neo4j AuraDB Cloud</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                          neo4j+s://xxxx.databases.neo4j.io
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* URI & Database Name */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="text-xs font-medium text-slate-300 block mb-1.5">
                        Neo4j Connection URI <span className="text-[#FF6D5A]">*</span>
                      </label>
                      <input
                        type="text"
                        value={neo4jUri}
                        onChange={(e) => setNeo4jUri(e.target.value)}
                        placeholder={neo4jMode === 'aura' ? 'neo4j+s://xxxx.databases.neo4j.io' : 'bolt://localhost:7687'}
                        className="w-full bg-[#1F2125] border border-[#383A40] focus:border-[#00A3A6] focus:outline-none rounded px-3.5 py-2 text-xs text-white placeholder-slate-500 font-mono transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-300 block mb-1.5">
                        Database Name
                      </label>
                      <input
                        type="text"
                        value={neo4jDatabase}
                        onChange={(e) => setNeo4jDatabase(e.target.value)}
                        placeholder="neo4j"
                        className="w-full bg-[#1F2125] border border-[#383A40] focus:border-[#00A3A6] focus:outline-none rounded px-3.5 py-2 text-xs text-white placeholder-slate-500 font-mono transition-colors"
                      />
                    </div>
                  </div>

                  {/* Username & Password */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-slate-300 block mb-1.5">
                        Username <span className="text-[#FF6D5A]">*</span>
                      </label>
                      <input
                        type="text"
                        value={neo4jUsername}
                        onChange={(e) => setNeo4jUsername(e.target.value)}
                        placeholder="neo4j"
                        className="w-full bg-[#1F2125] border border-[#383A40] focus:border-[#00A3A6] focus:outline-none rounded px-3.5 py-2 text-xs text-white placeholder-slate-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-300 block mb-1.5">
                        Password <span className="text-[#FF6D5A]">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showNeo4jPassword ? 'text' : 'password'}
                          value={neo4jPassword}
                          onChange={(e) => setNeo4jPassword(e.target.value)}
                          placeholder="Database password"
                          className="w-full bg-[#1F2125] border border-[#383A40] focus:border-[#00A3A6] focus:outline-none rounded pl-3.5 pr-10 py-2 text-xs text-white placeholder-slate-500 font-mono transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNeo4jPassword(!showNeo4jPassword)}
                          className="absolute right-3 top-2.5 text-slate-400 hover:text-white cursor-pointer"
                        >
                          {showNeo4jPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Standalone MCP Server Endpoint */}
                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1.5">
                      Neo4j MCP Server Endpoint URL <span className="text-[#FF6D5A]">*</span>
                    </label>
                    <input
                      type="text"
                      value={serverUrl}
                      onChange={(e) => setServerUrl(e.target.value)}
                      placeholder="http://localhost:8000/sse or http://localhost:8000/mcp"
                      className="w-full bg-[#1F2125] border border-[#383A40] focus:border-[#00A3A6] focus:outline-none rounded px-3.5 py-2 text-xs text-white placeholder-slate-500 font-mono transition-colors"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Runs via standard JSON-RPC 2.0 / SSE protocol. Install with <code className="text-[#00A3A6]">pip install neo4j-mcp-server</code>.
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1.5">
                      Target Database Name
                    </label>
                    <input
                      type="text"
                      value={neo4jDatabase}
                      onChange={(e) => setNeo4jDatabase(e.target.value)}
                      placeholder="neo4j"
                      className="w-full bg-[#1F2125] border border-[#383A40] focus:border-[#00A3A6] focus:outline-none rounded px-3.5 py-2 text-xs text-white placeholder-slate-500 font-mono transition-colors"
                    />
                  </div>
                </>
              )}

              {/* Pre-Authorized Tools Inventory Pill */}
              <div className="p-3 bg-[#1A1F26] border border-[#2D3748] rounded text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#00A3A6]" />
                    <span>7 Pre-Authorized Graph Database Actions</span>
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#00A3A6]/20 text-[#00A3A6] font-bold">
                    Gateway Controllable
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Includes <code className="text-[#00A3A6]">get-schema</code>, <code className="text-[#00A3A6]">read-cypher</code>, <code className="text-[#00A3A6]">write-cypher</code>, <code className="text-[#00A3A6]">list-gds-procedures</code>, <code className="text-[#00A3A6]">get-neighbors</code>, <code className="text-[#00A3A6]">create-node</code>, and <code className="text-[#00A3A6]">create-relationship</code>. Each action can be individually enabled or blocked in the MCP Gateway.
                </p>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* FIELDS FOR ACCESS TOKEN MODE (Screenshots 1 & 2)         */}
          {/* ======================================================== */}
          {selectedProvider !== 'neo4j' && authMode === 'token' && (
            <div className="space-y-4">
              
              {/* Field 1: Server URL */}
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1.5">
                  {selectedProvider === 'github' ? 'Github Server' : selectedProvider === 'outlook' ? 'Microsoft Graph Endpoint' : 'Server Endpoint'}
                </label>
                <input
                  type="text"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  placeholder={selectedProvider === 'outlook' ? 'https://graph.microsoft.com/v1.0' : 'https://api.github.com'}
                  className="w-full bg-[#1F2125] border border-[#383A40] focus:border-[#FF6D5A] focus:outline-none rounded px-3.5 py-2 text-xs text-white placeholder-slate-500 font-mono transition-colors"
                />
              </div>

              {/* Field 2: User (Optional GitHub handle) */}
              {selectedProvider === 'github' && (
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1.5">
                    User
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. username or organization"
                    className="w-full bg-[#1F2125] border border-[#383A40] focus:border-[#FF6D5A] focus:outline-none rounded px-3.5 py-2 text-xs text-white placeholder-slate-500 transition-colors"
                  />
                </div>
              )}

              {/* Slack Specific Inputs */}
              {selectedProvider === 'slack' && (
                <>
                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1.5">
                      Slack Incoming Webhook URL
                    </label>
                    <input
                      type="url"
                      value={slackWebhook}
                      onChange={(e) => setSlackWebhook(e.target.value)}
                      placeholder="https://hooks.slack.com/services/T00/B00/XXXX"
                      className="w-full bg-[#1F2125] border border-[#383A40] focus:border-[#FF6D5A] focus:outline-none rounded px-3.5 py-2 text-xs text-white placeholder-slate-500 font-mono transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1.5">
                      Default Target Channel
                    </label>
                    <input
                      type="text"
                      value={slackChannel}
                      onChange={(e) => setSlackChannel(e.target.value)}
                      placeholder="#general"
                      className="w-full bg-[#1F2125] border border-[#383A40] focus:border-[#FF6D5A] focus:outline-none rounded px-3.5 py-2 text-xs text-white placeholder-slate-500 transition-colors"
                    />
                  </div>
                </>
              )}

              {/* Jira Specific Inputs */}
              {selectedProvider === 'jira' && (
                <>
                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1.5">
                      Jira Cloud Domain
                    </label>
                    <input
                      type="text"
                      value={jiraDomain}
                      onChange={(e) => setJiraDomain(e.target.value)}
                      placeholder="company.atlassian.net"
                      className="w-full bg-[#1F2125] border border-[#383A40] focus:border-[#FF6D5A] focus:outline-none rounded px-3.5 py-2 text-xs text-white placeholder-slate-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1.5">
                      Account Email
                    </label>
                    <input
                      type="email"
                      value={jiraEmail}
                      onChange={(e) => setJiraEmail(e.target.value)}
                      placeholder="developer@company.com"
                      className="w-full bg-[#1F2125] border border-[#383A40] focus:border-[#FF6D5A] focus:outline-none rounded px-3.5 py-2 text-xs text-white placeholder-slate-500 transition-colors"
                    />
                  </div>
                </>
              )}

              {/* Field 3: Access Token / API Token */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    {selectedProvider === 'jira' ? 'API Token' : 'Access Token'}
                  </label>
                  {currentProvider.directTokenGenUrl && (
                    <a
                      href={currentProvider.directTokenGenUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-[#FF6D5A] hover:underline flex items-center gap-1"
                    >
                      <span>get token</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showAccessToken ? 'text' : 'password'}
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    placeholder={selectedProvider === 'github' ? 'ghp_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX' : selectedProvider === 'outlook' ? 'EwB... or Bearer Token from Microsoft Graph Explorer' : 'Paste API Token'}
                    className="w-full bg-[#1F2125] border border-[#383A40] focus:border-[#FF6D5A] focus:outline-none rounded pl-3.5 pr-10 py-2 text-xs text-white placeholder-slate-500 font-mono transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAccessToken(!showAccessToken)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-white cursor-pointer"
                    title={showAccessToken ? 'Hide token' : 'Show token'}
                  >
                    {showAccessToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                {selectedProvider === 'outlook' && (
                  <p className="mt-1.5 text-[11px] text-amber-400 font-sans leading-relaxed">
                    💡 <strong>Important for Graph Explorer:</strong> By default, tokens only grant <code>User.Read</code> (which allows reading your profile name). To access messages or calendar, click the <strong>"Modify permissions"</strong> tab in Graph Explorer, search for <strong>Mail.Read</strong>, click <strong>Consent</strong>, and then copy the refreshed token.
                  </p>
                )}
              </div>

              {/* Field 4: Allowed HTTP Request Domains */}
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1.5">
                  Allowed HTTP Request Domains
                </label>
                <div className="relative">
                  <select
                    value={allowedDomains}
                    onChange={(e) => setAllowedDomains(e.target.value)}
                    className="w-full appearance-none bg-[#1F2125] border border-[#383A40] focus:border-[#FF6D5A] focus:outline-none rounded px-3.5 py-2 text-xs text-white transition-colors cursor-pointer"
                  >
                    <option value="All">All</option>
                    <option value="api.github.com">api.github.com only</option>
                    <option value="custom">Custom Restricted Domains</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* FIELDS FOR OAUTH2 MODE (Screenshots 3 & 4)               */}
          {/* ======================================================== */}
          {selectedProvider !== 'neo4j' && authMode === 'oauth' && (
            <div className="space-y-4">
              
              {/* One-Click Sign In Banner for Microsoft */}
              {selectedProvider === 'outlook' && (
                <div className="p-3.5 bg-[#171D26] border border-[#0078D4]/50 rounded space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <OutlookLogo className="w-5 h-5 shrink-0" />
                      <span className="font-bold text-xs text-white">One-Click Microsoft Account Authorization</span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0078D4]/20 text-[#28A8EA] font-bold border border-[#0078D4]/40">
                      LIVE POPUP
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Opens the real Microsoft identity consent window, grants delegated access for Mail, Calendar, Contacts, and Tasks, and securely links the session to your Gateway.
                  </p>

                  {/* Inline Client ID input if not yet configured */}
                  {!clientId.trim() && (
                    <div className="p-2.5 bg-black/40 border border-slate-700 rounded space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-mono text-slate-300 font-medium">Azure / Entra App Client ID:</span>
                        <a 
                          href="https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade" 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-[#28A8EA] hover:underline flex items-center gap-1 text-[10px]"
                        >
                          <span>Get free ID at entra.microsoft.com</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                      <input
                        type="text"
                        value={clientId}
                        onChange={(e) => setClientId(e.target.value)}
                        placeholder="00000000-0000-0000-0000-000000000000"
                        className="w-full bg-[#1F2125] border border-slate-600 focus:border-[#0078D4] focus:outline-none rounded px-2.5 py-1.5 text-xs text-white font-mono placeholder-slate-500"
                      />
                      <div className="flex items-center justify-between pt-1 text-[10.5px]">
                        <span className="text-slate-400">Don't have an Azure App ID?</span>
                        <button
                          type="button"
                          onClick={() => setAuthMode('token')}
                          className="text-[#FF6D5A] hover:underline font-medium cursor-pointer"
                        >
                          Use Graph Bearer Token instead (0 setup) →
                        </button>
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full py-2.5 px-3 bg-[#0078D4] hover:bg-[#006CBD] disabled:opacity-50 text-white text-xs font-bold font-mono rounded flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer active:scale-98"
                  >
                    <OutlookLogo className="w-4 h-4 shrink-0" />
                    <span>{isSaving ? 'Awaiting Microsoft Consent Popup...' : 'Sign in with Microsoft'}</span>
                  </button>
                </div>
              )}
              
              {/* Field 1: OAuth Redirect URL (Read-only box with copy) */}
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1.5">
                  OAuth Redirect URL
                </label>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={callbackUrl}
                    className="w-full bg-[#1F2125] border border-[#383A40] rounded pl-3.5 pr-10 py-2 text-xs text-slate-200 font-mono select-all cursor-default"
                  />
                  <button
                    type="button"
                    onClick={handleCopyRedirect}
                    className="absolute right-2.5 top-2 p-1 text-slate-400 hover:text-white rounded hover:bg-white/5 cursor-pointer transition-colors"
                    title="Copy Redirect URL"
                  >
                    {copiedRedirect ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                <div className="mt-1.5 p-2 bg-[#232529] border border-[#3E4148] rounded text-[11px] text-slate-300 font-sans space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-400 font-medium">
                    <Info className="w-3 h-3 shrink-0" />
                    <span>
                      {selectedProvider === 'outlook' 
                        ? 'Important Microsoft Entra ID Configuration:' 
                        : selectedProvider === 'google'
                          ? 'Important Google Cloud Configuration:'
                          : 'Important GitHub Configuration:'}
                    </span>
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    {selectedProvider === 'outlook' ? (
                      <>
                        In your Azure / Microsoft Entra app registration (<a href="https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade" target="_blank" rel="noreferrer" className="text-[#FF6D5A] hover:underline">entra.microsoft.com</a>), add a <strong className="text-slate-200">"Single-page application (SPA)"</strong> or <strong className="text-slate-200">"Web"</strong> platform with redirect URI matching the URL above. Supported scopes: Mail.ReadWrite, Calendars.ReadWrite, Contacts.ReadWrite, Tasks.ReadWrite.
                      </>
                    ) : selectedProvider === 'google' ? (
                      <>
                        In your Google Cloud Console OAuth 2.0 Client credentials, add the URL above to <strong className="text-slate-200">"Authorized redirect URIs"</strong>.
                      </>
                    ) : (
                      <>
                        In your GitHub OAuth App settings (<a href="https://github.com/settings/developers" target="_blank" rel="noreferrer" className="text-[#FF6D5A] hover:underline">github.com/settings/developers</a>), the <strong className="text-slate-200">"Authorization callback URL"</strong> must match the URL above character-for-character. If it doesn't match, GitHub shows <em>"redirect_uri is not associated with this application"</em>.
                      </>
                    )}
                  </p>
                </div>
              </div>

              {/* Field 2: Client ID * */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    Client ID <span className="text-[#FF6D5A]">*</span>
                  </label>
                  {currentProvider.directOAuthGenUrl && (
                    <a
                      href={currentProvider.directOAuthGenUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-[#FF6D5A] hover:underline flex items-center gap-1"
                    >
                      <span>register at {selectedProvider === 'github' ? 'github.com/settings/developers' : selectedProvider === 'outlook' ? 'entra.microsoft.com' : 'developer portal'}</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
                <input
                  type="text"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder={selectedProvider === 'outlook' ? 'Application (client) ID from Microsoft Entra (e.g. 00000000-0000-0000-0000-000000000000)' : selectedProvider === 'github' ? 'e.g. Ov23liXXXXXXXXXXXXXX or Iv1.XXXXXXXXXXXX' : 'Client ID'}
                  className="w-full bg-[#1F2125] border border-[#383A40] focus:border-[#FF6D5A] focus:outline-none rounded px-3.5 py-2 text-xs text-white placeholder-slate-500 font-mono transition-colors"
                />
              </div>

              {/* Field 3: Client Secret * */}
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1.5">
                  Client Secret {selectedProvider === 'outlook' ? <span className="text-slate-400 font-normal text-[11px]">(Optional for SPA)</span> : <span className="text-[#FF6D5A]">*</span>}
                </label>
                <div className="relative">
                  <input
                    type={showClientSecret ? 'text' : 'password'}
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    placeholder="Paste Client Secret"
                    className="w-full bg-[#1F2125] border border-[#383A40] focus:border-[#FF6D5A] focus:outline-none rounded pl-3.5 pr-10 py-2 text-xs text-white placeholder-slate-500 font-mono transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowClientSecret(!showClientSecret)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-white cursor-pointer"
                    title={showClientSecret ? 'Hide secret' : 'Show secret'}
                  >
                    {showClientSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Field 4: Allowed HTTP Request Domains */}
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1.5">
                  Allowed HTTP Request Domains
                </label>
                <div className="relative">
                  <select
                    value={allowedDomains}
                    onChange={(e) => setAllowedDomains(e.target.value)}
                    className="w-full appearance-none bg-[#1F2125] border border-[#383A40] focus:border-[#FF6D5A] focus:outline-none rounded px-3.5 py-2 text-xs text-white transition-colors cursor-pointer"
                  >
                    <option value="All">All</option>
                    <option value="api.github.com">api.github.com only</option>
                    <option value="custom">Custom Restricted Domains</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>

              {/* Field 5: Server URL */}
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1.5">
                  {selectedProvider === 'github' ? 'Github Server' : 'Server Endpoint'}
                </label>
                <input
                  type="text"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  placeholder="https://api.github.com"
                  className="w-full bg-[#1F2125] border border-[#383A40] focus:border-[#FF6D5A] focus:outline-none rounded px-3.5 py-2 text-xs text-white placeholder-slate-500 font-mono transition-colors"
                />
              </div>
            </div>
          )}

          {/* Footer Information / Vault Notice (Matches Screenshots 2 & 4) */}
          <div className="pt-2 border-t border-[#383A40]/50 flex items-center gap-1.5 text-[11px] text-slate-400 font-sans">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Enterprise plan users can pull in credentials from external vaults.</span>
            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(
                  new CustomEvent('keaos:toast', {
                    detail: { message: 'Vault sync is managed securely through your enterprise governance gateway.' }
                  })
                );
              }}
              className="text-[#FF6D5A] hover:underline cursor-pointer font-medium ml-0.5"
            >
              More info
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
