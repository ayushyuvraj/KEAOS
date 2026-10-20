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
  Server,
  Layers,
  MessageSquare,
  Mail,
  Database
} from 'lucide-react';
import { 
  verifySlackMcpConnection, 
  verifyJiraMcpConnection, 
  verifyGitHubMcpConnection, 
  verifyNeo4jMcpConnection, 
  verifyOutlookMcpConnection, 
  connectMcpViaOAuth, 
  verifyAndDiscoverMcpServer,
  getStoredMicrosoftOAuthCredentials, 
  saveStoredMicrosoftOAuthCredentials,
  saveRegisteredMcpServer 
} from '../services/mcpClientService';

function OutlookLogo({ className = 'w-5 h-5' }) {
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

function GitHubLogo({ className = 'w-5 h-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

const PROVIDERS_CONFIG = {
  github: {
    id: 'github',
    title: 'GitHub',
    icon: GitHubLogo,
    defaultServer: 'https://api.github.com',
    authModes: [
      { id: 'token', label: 'Personal Token' },
      { id: 'oauth', label: 'OAuth App' }
    ],
    docsUrl: 'https://docs.github.com/en/rest',
    portalUrl: 'https://github.com/settings/tokens',
    portalLabel: 'github.com/settings/tokens'
  },
  slack: {
    id: 'slack',
    title: 'Slack',
    icon: MessageSquare,
    defaultServer: 'https://slack.com/api',
    authModes: [
      { id: 'token', label: 'Bot Token / Webhook' },
      { id: 'oauth', label: 'OAuth2' }
    ],
    docsUrl: 'https://api.slack.com',
    portalUrl: 'https://api.slack.com/apps',
    portalLabel: 'api.slack.com/apps'
  },
  jira: {
    id: 'jira',
    title: 'Jira',
    icon: Layers,
    defaultServer: 'https://api.atlassian.com',
    authModes: [
      { id: 'token', label: 'API Token' },
      { id: 'oauth', label: 'OAuth2' }
    ],
    docsUrl: 'https://developer.atlassian.com/cloud/jira/platform/rest/v3/',
    portalUrl: 'https://id.atlassian.com/manage-profile/security/api-tokens',
    portalLabel: 'id.atlassian.com'
  },
  google: {
    id: 'google',
    title: 'Google Workspace',
    icon: Mail,
    defaultServer: 'https://www.googleapis.com',
    authModes: [
      { id: 'oauth', label: 'OAuth2' }
    ],
    docsUrl: 'https://developers.google.com/workspace',
    portalUrl: 'https://console.cloud.google.com/apis/credentials',
    portalLabel: 'console.cloud.google.com'
  },
  neo4j: {
    id: 'neo4j',
    title: 'Neo4j Graph Database',
    icon: Database,
    defaultServer: 'bolt://localhost:7687',
    authModes: [
      { id: 'local', label: 'Local Bolt' },
      { id: 'aura', label: 'AuraDB Cloud' },
      { id: 'endpoint', label: 'MCP Server URL' }
    ],
    docsUrl: 'https://github.com/neo4j/mcp',
    portalUrl: 'https://console.neo4j.io',
    portalLabel: 'console.neo4j.io'
  },
  outlook: {
    id: 'outlook',
    title: 'Microsoft Outlook',
    icon: OutlookLogo,
    defaultServer: 'https://graph.microsoft.com/v1.0',
    authModes: [
      { id: 'oauth', label: 'OAuth2 (Sign in)' },
      { id: 'token', label: 'Graph Bearer Token' }
    ],
    docsUrl: 'https://learn.microsoft.com/en-us/graph/api/resources/mail-api-overview',
    portalUrl: 'https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade',
    portalLabel: 'entra.microsoft.com'
  },
  url: {
    id: 'url',
    title: 'Universal MCP Server',
    icon: Server,
    defaultServer: 'http://localhost:8000/sse',
    authModes: [
      { id: 'token', label: 'SSE / JSON-RPC' }
    ],
    docsUrl: 'https://modelcontextprotocol.io',
    portalUrl: 'https://modelcontextprotocol.io',
    portalLabel: 'modelcontextprotocol.io'
  }
};

export default function ConnectMcpModal({
  isOpen,
  initialTab = 'github',
  onClose,
  onAddMcpNodeToCanvas,
  isDarkMode = true
}) {
  const isDark = Boolean(isDarkMode);

  // Normalize provider tab
  const resolvedProviderKey = PROVIDERS_CONFIG[initialTab] ? initialTab : 'github';
  const [selectedProvider, setSelectedProvider] = useState(resolvedProviderKey);
  const [authMode, setAuthMode] = useState('token');

  // Sync initial tab when opened
  useEffect(() => {
    if (initialTab && PROVIDERS_CONFIG[initialTab]) {
      setSelectedProvider(initialTab);
      if (initialTab === 'google' || initialTab === 'outlook') {
        setAuthMode('oauth');
      } else if (initialTab === 'neo4j') {
        setAuthMode('local');
      } else {
        setAuthMode('token');
      }
    }
  }, [initialTab, isOpen]);

  // Form Fields State
  const [serverUrl, setServerUrl] = useState('https://api.github.com');
  const [username, setUsername] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [showAccessToken, setShowAccessToken] = useState(false);

  // Neo4j Specific State
  const [neo4jUri, setNeo4jUri] = useState('bolt://localhost:7687');
  const [neo4jUsername, setNeo4jUsername] = useState('neo4j');
  const [neo4jPassword, setNeo4jPassword] = useState('');
  const [showNeo4jPassword, setShowNeo4jPassword] = useState(false);
  const [neo4jDatabase, setNeo4jDatabase] = useState('neo4j');

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

  // Pre-fill stored credentials for Outlook when active
  useEffect(() => {
    if (selectedProvider === 'outlook') {
      const ms = getStoredMicrosoftOAuthCredentials();
      if (ms.clientId && !clientId) setClientId(ms.clientId);
      if (ms.clientSecret && !clientSecret) setClientSecret(ms.clientSecret);
    }
  }, [selectedProvider, isOpen]);

  // Execution & Feedback State
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successInfo, setSuccessInfo] = useState(null);

  const currentProvider = PROVIDERS_CONFIG[selectedProvider] || PROVIDERS_CONFIG.github;
  const ServiceIcon = currentProvider.icon;

  const callbackUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/oauth-callback.html` 
    : 'http://127.0.0.1:5173/oauth-callback.html';

  useEffect(() => {
    setErrorMessage(null);
    setSuccessInfo(null);
  }, [selectedProvider, authMode]);

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

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessInfo(null);

    try {
      let result = null;

      if (selectedProvider === 'github') {
        if (authMode === 'token') {
          if (!accessToken.trim()) throw new Error('Please enter your GitHub Access Token.');
          result = await verifyGitHubMcpConnection({
            personalAccessToken: accessToken.trim(),
            defaultOwner: username.trim() || undefined,
            defaultRepo: ''
          });
        } else {
          if (!clientId.trim()) throw new Error('Please enter your GitHub Client ID.');
          if (!clientSecret.trim()) throw new Error('Please enter your GitHub Client Secret.');
          result = await connectMcpViaOAuth({
            provider: 'github',
            clientId: clientId.trim(),
            clientSecret: clientSecret.trim(),
            redirectUri: callbackUrl
          });
        }
      } else if (selectedProvider === 'slack') {
        if (authMode === 'token') {
          if (!slackWebhook.trim() && !accessToken.trim()) throw new Error('Please provide a Slack Webhook URL or Bot Token.');
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
      } else if (selectedProvider === 'jira') {
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
      } else if (selectedProvider === 'google') {
        result = await connectMcpViaOAuth({
          provider: 'google',
          clientId: clientId.trim(),
          clientSecret: clientSecret.trim()
        });
      } else if (selectedProvider === 'outlook') {
        if (authMode === 'token') {
          if (!accessToken.trim()) throw new Error('Please provide a Microsoft Graph API Bearer Token.');
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
      } else if (selectedProvider === 'neo4j') {
        if (authMode === 'endpoint') {
          if (!serverUrl.trim()) throw new Error('Please enter a valid Neo4j MCP server endpoint URL.');
          result = await verifyNeo4jMcpConnection({
            connectionMode: 'endpoint',
            serverUrl: serverUrl.trim(),
            database: neo4jDatabase.trim() || 'neo4j'
          });
        } else {
          if (!neo4jUri.trim()) throw new Error('Please enter your Neo4j connection URI.');
          if (!neo4jUsername.trim()) throw new Error('Please enter your Neo4j username.');
          if (!neo4jPassword.trim()) throw new Error('Please enter your Neo4j password.');
          result = await verifyNeo4jMcpConnection({
            connectionMode: authMode === 'aura' ? 'aura' : 'local',
            uri: neo4jUri.trim(),
            username: neo4jUsername.trim(),
            password: neo4jPassword.trim(),
            database: neo4jDatabase.trim() || 'neo4j'
          });
        }
      } else if (selectedProvider === 'url') {
        if (!serverUrl.trim()) throw new Error('Please enter an MCP server endpoint URL.');
        result = await verifyAndDiscoverMcpServer(serverUrl.trim());
      }

      if (result) {
        saveRegisteredMcpServer(result);
        if (onAddMcpNodeToCanvas) {
          onAddMcpNodeToCanvas(result);
        }
        setSuccessInfo(result);
        window.dispatchEvent(
          new CustomEvent('keaos:toast', {
            detail: { message: `Connected ${currentProvider.title}` }
          })
        );
        setTimeout(() => {
          onClose();
        }, 300);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to authenticate credential with MCP server.');
    } finally {
      setIsSaving(false);
    }
  };

  // Google-clean styling tokens adapted strictly to canvas theme
  const themeCard = isDark 
    ? 'bg-[#111827] text-white border-[#334155]' 
    : 'bg-white text-slate-900 border-slate-200';
  
  const themeHeader = isDark 
    ? 'border-[#1F2937] bg-[#111827]' 
    : 'border-slate-100 bg-white';

  const themeInput = isDark 
    ? 'bg-[#1E293B] border-[#334155] focus:border-sky-400 focus:bg-[#0F172A] text-white placeholder-slate-500' 
    : 'bg-slate-50 border-slate-200 focus:border-blue-600 focus:bg-white text-slate-900 placeholder-slate-400';

  const themeLabel = isDark ? 'text-slate-300' : 'text-slate-700';

  return (
    <div className="fixed inset-0 z-50 bg-black/50 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 select-none animate-in fade-in duration-150">
      <div 
        className={`w-full max-w-[500px] border shadow-2xl overflow-hidden transition-all duration-200 ease-out rounded-xl animate-in zoom-in-95 ${themeCard}`}
      >
        {/* Simplified Header: Icon + Title + Docs Link + Action Buttons */}
        <div className={`px-5 py-3.5 flex items-center justify-between border-b ${themeHeader}`}>
          <div className="flex items-center gap-3">
            <div className="shrink-0">
              <ServiceIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold tracking-tight leading-none">
                  {currentProvider.title}
                </h3>
                {currentProvider.docsUrl && (
                  <a 
                    href={currentProvider.docsUrl} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-[11px] text-blue-600 dark:text-sky-400 hover:underline inline-flex items-center gap-0.5 font-medium"
                    title="Open official documentation"
                  >
                    <span>Docs</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="bg-[#00338D] hover:bg-[#005EB8] active:scale-95 disabled:opacity-50 text-white text-xs font-semibold px-3.5 py-1.5 rounded-md transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              <span>{isSaving ? 'Connecting...' : 'Connect'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className={`p-1.5 rounded-md transition-colors cursor-pointer active:scale-95 ${
                isDark ? 'text-slate-400 hover:text-white hover:bg-white/10' : 'text-slate-400 hover:text-slate-800 hover:bg-slate-100'
              }`}
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dialog Body (Minimalist, Zero Unnecessary Text) */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          
          {/* Subtle Auth Mode Segmented Pill */}
          {currentProvider.authModes.length > 1 && (
            <div className={`p-0.5 rounded-lg flex items-center gap-1 ${isDark ? 'bg-[#1F2937]' : 'bg-slate-100'}`}>
              {currentProvider.authModes.map((mode) => {
                const isActive = authMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setAuthMode(mode.id)}
                    className={`flex-1 py-1 px-2.5 text-xs font-medium rounded-md transition-all active:scale-98 cursor-pointer ${
                      isActive
                        ? (isDark ? 'bg-[#374151] text-white shadow-xs' : 'bg-white text-slate-900 shadow-xs')
                        : (isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')
                    }`}
                  >
                    {mode.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-2.5 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2 text-red-500 dark:text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="leading-snug flex-1">{errorMessage}</p>
            </div>
          )}

          {/* Success Banner */}
          {successInfo && (
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-start gap-2 text-emerald-600 dark:text-emerald-400 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="leading-snug flex-1">Connected successfully!</p>
            </div>
          )}

          {/* ======================================================== */}
          {/* 1. OUTLOOK MCP FORM                                      */}
          {/* ======================================================== */}
          {selectedProvider === 'outlook' && (
            authMode === 'oauth' ? (
              <div className="space-y-3.5">
                {/* One-Click Sign In Button */}
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="w-full py-2.5 px-4 bg-[#0078D4] hover:bg-[#006CBD] disabled:opacity-50 text-white text-xs font-medium rounded-lg flex items-center justify-center gap-2 transition-all shadow-sm active:scale-98 cursor-pointer"
                >
                  <OutlookLogo className="w-4 h-4 shrink-0" />
                  <span>{isSaving ? 'Awaiting Microsoft Sign-in...' : 'Sign in with Microsoft'}</span>
                </button>

                {/* Redirect URL with quick copy */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className={`text-xs font-medium ${themeLabel}`}>Redirect URL</label>
                    <button
                      type="button"
                      onClick={handleCopyRedirect}
                      className="text-[11px] text-blue-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                    >
                      {copiedRedirect ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-500" />
                          <span className="text-emerald-500">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <input
                    type="text"
                    readOnly
                    value={callbackUrl}
                    className={`w-full rounded-md px-3 py-1.5 text-xs font-mono border transition-colors outline-none cursor-default select-all ${themeInput}`}
                  />
                </div>

                {/* Client ID */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className={`text-xs font-medium ${themeLabel}`}>Client ID</label>
                    {currentProvider.portalUrl && (
                      <a
                        href={currentProvider.portalUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-blue-600 dark:text-sky-400 hover:underline flex items-center gap-1 font-medium"
                      >
                        <span>{currentProvider.portalLabel}</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                  <input
                    type="text"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    placeholder="00000000-0000-0000-0000-000000000000"
                    className={`w-full rounded-md px-3 py-1.5 text-xs font-mono border transition-colors outline-none ${themeInput}`}
                  />
                </div>

                {/* Client Secret (Optional) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className={`text-xs font-medium ${themeLabel}`}>
                      Client Secret <span className="text-[10px] opacity-60 font-normal">(Optional for SPA)</span>
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      type={showClientSecret ? 'text' : 'password'}
                      value={clientSecret}
                      onChange={(e) => setClientSecret(e.target.value)}
                      placeholder="Paste secret if configured"
                      className={`w-full rounded-md pl-3 pr-9 py-1.5 text-xs font-mono border transition-colors outline-none ${themeInput}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowClientSecret(!showClientSecret)}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                      title={showClientSecret ? 'Hide' : 'Show'}
                    >
                      {showClientSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className={`text-xs font-medium ${themeLabel}`}>Bearer Token</label>
                    <a
                      href="https://developer.microsoft.com/en-us/graph/graph-explorer"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-blue-600 dark:text-sky-400 hover:underline flex items-center gap-1 font-medium"
                    >
                      <span>Graph Explorer</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                  <div className="relative">
                    <input
                      type={showAccessToken ? 'text' : 'password'}
                      value={accessToken}
                      onChange={(e) => setAccessToken(e.target.value)}
                      placeholder="Paste Bearer Token"
                      className={`w-full rounded-md pl-3 pr-9 py-1.5 text-xs font-mono border transition-colors outline-none ${themeInput}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowAccessToken(!showAccessToken)}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                    >
                      {showAccessToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            )
          )}

          {/* ======================================================== */}
          {/* 2. GITHUB MCP FORM                                       */}
          {/* ======================================================== */}
          {selectedProvider === 'github' && (
            authMode === 'token' ? (
              <div className="space-y-3.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className={`text-xs font-medium ${themeLabel}`}>Personal Access Token</label>
                    <a
                      href="https://github.com/settings/tokens"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-blue-600 dark:text-sky-400 hover:underline flex items-center gap-1 font-medium"
                    >
                      <span>settings/tokens</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                  <div className="relative">
                    <input
                      type={showAccessToken ? 'text' : 'password'}
                      value={accessToken}
                      onChange={(e) => setAccessToken(e.target.value)}
                      placeholder="ghp_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                      className={`w-full rounded-md pl-3 pr-9 py-1.5 text-xs font-mono border transition-colors outline-none ${themeInput}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowAccessToken(!showAccessToken)}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                    >
                      {showAccessToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className={`text-xs font-medium block mb-1 ${themeLabel}`}>User / Organization (Optional)</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. username"
                    className={`w-full rounded-md px-3 py-1.5 text-xs border transition-colors outline-none ${themeInput}`}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className={`text-xs font-medium ${themeLabel}`}>Redirect URL</label>
                    <button
                      type="button"
                      onClick={handleCopyRedirect}
                      className="text-[11px] text-blue-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                    >
                      {copiedRedirect ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedRedirect ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    readOnly
                    value={callbackUrl}
                    className={`w-full rounded-md px-3 py-1.5 text-xs font-mono border transition-colors outline-none cursor-default select-all ${themeInput}`}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className={`text-xs font-medium ${themeLabel}`}>Client ID</label>
                    <a
                      href="https://github.com/settings/developers"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-blue-600 dark:text-sky-400 hover:underline flex items-center gap-1 font-medium"
                    >
                      <span>settings/developers</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                  <input
                    type="text"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    placeholder="Ov23liXXXXXXXXXXXXXX"
                    className={`w-full rounded-md px-3 py-1.5 text-xs font-mono border transition-colors outline-none ${themeInput}`}
                  />
                </div>
                <div>
                  <label className={`text-xs font-medium block mb-1 ${themeLabel}`}>Client Secret</label>
                  <div className="relative">
                    <input
                      type={showClientSecret ? 'text' : 'password'}
                      value={clientSecret}
                      onChange={(e) => setClientSecret(e.target.value)}
                      placeholder="Paste Client Secret"
                      className={`w-full rounded-md pl-3 pr-9 py-1.5 text-xs font-mono border transition-colors outline-none ${themeInput}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowClientSecret(!showClientSecret)}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                    >
                      {showClientSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            )
          )}

          {/* ======================================================== */}
          {/* 3. SLACK MCP FORM                                        */}
          {/* ======================================================== */}
          {selectedProvider === 'slack' && (
            authMode === 'token' ? (
              <div className="space-y-3.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className={`text-xs font-medium ${themeLabel}`}>Webhook URL or Bot Token</label>
                    <a
                      href="https://api.slack.com/apps"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-blue-600 dark:text-sky-400 hover:underline flex items-center gap-1 font-medium"
                    >
                      <span>api.slack.com/apps</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                  <input
                    type="text"
                    value={slackWebhook}
                    onChange={(e) => setSlackWebhook(e.target.value)}
                    placeholder="https://hooks.slack.com/services/... or xoxb-..."
                    className={`w-full rounded-md px-3 py-1.5 text-xs font-mono border transition-colors outline-none ${themeInput}`}
                  />
                </div>
                <div>
                  <label className={`text-xs font-medium block mb-1 ${themeLabel}`}>Default Channel</label>
                  <input
                    type="text"
                    value={slackChannel}
                    onChange={(e) => setSlackChannel(e.target.value)}
                    placeholder="#general"
                    className={`w-full rounded-md px-3 py-1.5 text-xs border transition-colors outline-none ${themeInput}`}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3.5">
                <div>
                  <label className={`text-xs font-medium block mb-1 ${themeLabel}`}>Client ID</label>
                  <input
                    type="text"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    placeholder="Slack Client ID"
                    className={`w-full rounded-md px-3 py-1.5 text-xs font-mono border transition-colors outline-none ${themeInput}`}
                  />
                </div>
                <div>
                  <label className={`text-xs font-medium block mb-1 ${themeLabel}`}>Client Secret</label>
                  <input
                    type="password"
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    placeholder="Slack Client Secret"
                    className={`w-full rounded-md px-3 py-1.5 text-xs font-mono border transition-colors outline-none ${themeInput}`}
                  />
                </div>
              </div>
            )
          )}

          {/* ======================================================== */}
          {/* 4. JIRA MCP FORM                                         */}
          {/* ======================================================== */}
          {selectedProvider === 'jira' && (
            authMode === 'token' ? (
              <div className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`text-xs font-medium block mb-1 ${themeLabel}`}>Domain</label>
                    <input
                      type="text"
                      value={jiraDomain}
                      onChange={(e) => setJiraDomain(e.target.value)}
                      placeholder="company.atlassian.net"
                      className={`w-full rounded-md px-3 py-1.5 text-xs border transition-colors outline-none ${themeInput}`}
                    />
                  </div>
                  <div>
                    <label className={`text-xs font-medium block mb-1 ${themeLabel}`}>Account Email</label>
                    <input
                      type="email"
                      value={jiraEmail}
                      onChange={(e) => setJiraEmail(e.target.value)}
                      placeholder="you@company.com"
                      className={`w-full rounded-md px-3 py-1.5 text-xs border transition-colors outline-none ${themeInput}`}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className={`text-xs font-medium ${themeLabel}`}>API Token</label>
                    <a
                      href="https://id.atlassian.com/manage-profile/security/api-tokens"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-blue-600 dark:text-sky-400 hover:underline flex items-center gap-1 font-medium"
                    >
                      <span>id.atlassian.com</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                  <input
                    type="password"
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    placeholder="Paste Atlassian API Token"
                    className={`w-full rounded-md px-3 py-1.5 text-xs font-mono border transition-colors outline-none ${themeInput}`}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3.5">
                <div>
                  <label className={`text-xs font-medium block mb-1 ${themeLabel}`}>Client ID</label>
                  <input
                    type="text"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    placeholder="Atlassian Client ID"
                    className={`w-full rounded-md px-3 py-1.5 text-xs font-mono border transition-colors outline-none ${themeInput}`}
                  />
                </div>
                <div>
                  <label className={`text-xs font-medium block mb-1 ${themeLabel}`}>Client Secret</label>
                  <input
                    type="password"
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    placeholder="Atlassian Client Secret"
                    className={`w-full rounded-md px-3 py-1.5 text-xs font-mono border transition-colors outline-none ${themeInput}`}
                  />
                </div>
              </div>
            )
          )}

          {/* ======================================================== */}
          {/* 5. GOOGLE WORKSPACE MCP FORM                             */}
          {/* ======================================================== */}
          {selectedProvider === 'google' && (
            <div className="space-y-3.5">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className={`text-xs font-medium ${themeLabel}`}>Redirect URL</label>
                  <button
                    type="button"
                    onClick={handleCopyRedirect}
                    className="text-[11px] text-blue-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                  >
                    {copiedRedirect ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedRedirect ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <input
                  type="text"
                  readOnly
                  value={callbackUrl}
                  className={`w-full rounded-md px-3 py-1.5 text-xs font-mono border transition-colors outline-none cursor-default select-all ${themeInput}`}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className={`text-xs font-medium ${themeLabel}`}>Client ID</label>
                  <a
                    href="https://console.cloud.google.com/apis/credentials"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-blue-600 dark:text-sky-400 hover:underline flex items-center gap-1 font-medium"
                  >
                    <span>console.cloud.google.com</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <input
                  type="text"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="xxxx.apps.googleusercontent.com"
                  className={`w-full rounded-md px-3 py-1.5 text-xs font-mono border transition-colors outline-none ${themeInput}`}
                />
              </div>
              <div>
                <label className={`text-xs font-medium block mb-1 ${themeLabel}`}>Client Secret</label>
                <input
                  type="password"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  placeholder="Google Client Secret"
                  className={`w-full rounded-md px-3 py-1.5 text-xs font-mono border transition-colors outline-none ${themeInput}`}
                />
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 6. NEO4J GRAPH DATABASE MCP FORM                         */}
          {/* ======================================================== */}
          {selectedProvider === 'neo4j' && (
            authMode === 'endpoint' ? (
              <div className="space-y-3.5">
                <div>
                  <label className={`text-xs font-medium block mb-1 ${themeLabel}`}>MCP Endpoint URL</label>
                  <input
                    type="text"
                    value={serverUrl}
                    onChange={(e) => setServerUrl(e.target.value)}
                    placeholder="http://localhost:8000/sse"
                    className={`w-full rounded-md px-3 py-1.5 text-xs font-mono border transition-colors outline-none ${themeInput}`}
                  />
                </div>
                <div>
                  <label className={`text-xs font-medium block mb-1 ${themeLabel}`}>Database</label>
                  <input
                    type="text"
                    value={neo4jDatabase}
                    onChange={(e) => setNeo4jDatabase(e.target.value)}
                    placeholder="neo4j"
                    className={`w-full rounded-md px-3 py-1.5 text-xs font-mono border transition-colors outline-none ${themeInput}`}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3.5">
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className={`text-xs font-medium block mb-1 ${themeLabel}`}>Connection URI</label>
                    <input
                      type="text"
                      value={neo4jUri}
                      onChange={(e) => setNeo4jUri(e.target.value)}
                      placeholder={authMode === 'aura' ? 'neo4j+s://xxxx.databases.neo4j.io' : 'bolt://localhost:7687'}
                      className={`w-full rounded-md px-3 py-1.5 text-xs font-mono border transition-colors outline-none ${themeInput}`}
                    />
                  </div>
                  <div>
                    <label className={`text-xs font-medium block mb-1 ${themeLabel}`}>Database</label>
                    <input
                      type="text"
                      value={neo4jDatabase}
                      onChange={(e) => setNeo4jDatabase(e.target.value)}
                      placeholder="neo4j"
                      className={`w-full rounded-md px-3 py-1.5 text-xs font-mono border transition-colors outline-none ${themeInput}`}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`text-xs font-medium block mb-1 ${themeLabel}`}>Username</label>
                    <input
                      type="text"
                      value={neo4jUsername}
                      onChange={(e) => setNeo4jUsername(e.target.value)}
                      placeholder="neo4j"
                      className={`w-full rounded-md px-3 py-1.5 text-xs border transition-colors outline-none ${themeInput}`}
                    />
                  </div>
                  <div>
                    <label className={`text-xs font-medium block mb-1 ${themeLabel}`}>Password</label>
                    <div className="relative">
                      <input
                        type={showNeo4jPassword ? 'text' : 'password'}
                        value={neo4jPassword}
                        onChange={(e) => setNeo4jPassword(e.target.value)}
                        placeholder="••••••••"
                        className={`w-full rounded-md pl-3 pr-9 py-1.5 text-xs font-mono border transition-colors outline-none ${themeInput}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNeo4jPassword(!showNeo4jPassword)}
                        className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                      >
                        {showNeo4jPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          )}

          {/* ======================================================== */}
          {/* 7. UNIVERSAL MCP SERVER FORM                             */}
          {/* ======================================================== */}
          {selectedProvider === 'url' && (
            <div className="space-y-3.5">
              <div>
                <label className={`text-xs font-medium block mb-1 ${themeLabel}`}>Server Endpoint URL</label>
                <input
                  type="text"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  placeholder="http://localhost:8000/sse"
                  className={`w-full rounded-md px-3 py-1.5 text-xs font-mono border transition-colors outline-none ${themeInput}`}
                />
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
