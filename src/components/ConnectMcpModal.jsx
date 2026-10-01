import React, { useState, useEffect } from 'react';
import { 
  X, 
  Server, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Link, 
  Send, 
  FileCode, 
  Layers, 
  Plus, 
  ExternalLink,
  ShieldCheck,
  Check,
  Zap,
  Globe,
  MessageSquare
} from 'lucide-react';
import { 
  verifyAndDiscoverMcpServer, 
  verifySlackMcpConnection, 
  verifyJiraMcpConnection, 
  verifyGitHubMcpConnection,
  saveRegisteredMcpServer 
} from '../services/mcpClientService';

export default function ConnectMcpModal({
  isOpen,
  initialTab = 'url',
  onClose,
  onAddMcpNodeToCanvas,
  isDarkMode = true
}) {
  const [activeTab, setActiveTab] = useState(initialTab || 'url');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  // URL Tab State (Claude Code style)
  const [mcpUrl, setMcpUrl] = useState('');
  const [isVerifyingUrl, setIsVerifyingUrl] = useState(false);
  const [verifiedUrlResult, setVerifiedUrlResult] = useState(null);
  const [urlError, setUrlError] = useState(null);

  // Slack Tab State
  const [slackWebhook, setSlackWebhook] = useState('');
  const [slackChannel, setSlackChannel] = useState('#general');
  const [isVerifyingSlack, setIsVerifyingSlack] = useState(false);
  const [verifiedSlackResult, setVerifiedSlackResult] = useState(null);
  const [slackError, setSlackError] = useState(null);

  // Jira Tab State
  const [jiraDomain, setJiraDomain] = useState('');
  const [jiraEmail, setJiraEmail] = useState('');
  const [jiraToken, setJiraToken] = useState('');
  const [jiraProject, setJiraProject] = useState('ENG');
  const [isVerifyingJira, setIsVerifyingJira] = useState(false);
  const [verifiedJiraResult, setVerifiedJiraResult] = useState(null);
  const [jiraError, setJiraError] = useState(null);

  // GitHub Tab State
  const [githubToken, setGithubToken] = useState('');
  const [githubRepo, setGithubRepo] = useState('');
  const [isVerifyingGithub, setIsVerifyingGithub] = useState(false);
  const [verifiedGithubResult, setVerifiedGithubResult] = useState(null);
  const [githubError, setGithubError] = useState(null);

  if (!isOpen) return null;

  // Handlers
  const handleVerifyUrl = async () => {
    setIsVerifyingUrl(true);
    setUrlError(null);
    setVerifiedUrlResult(null);

    try {
      const result = await verifyAndDiscoverMcpServer(mcpUrl);
      setVerifiedUrlResult(result);
    } catch (err) {
      setUrlError(err.message);
    } finally {
      setIsVerifyingUrl(false);
    }
  };

  const handleVerifySlack = async () => {
    setIsVerifyingSlack(true);
    setSlackError(null);
    setVerifiedSlackResult(null);

    try {
      const result = await verifySlackMcpConnection({
        webhookUrl: slackWebhook,
        defaultChannel: slackChannel
      });
      setVerifiedSlackResult(result);
    } catch (err) {
      setSlackError(err.message);
    } finally {
      setIsVerifyingSlack(false);
    }
  };

  const handleVerifyJira = async () => {
    setIsVerifyingJira(true);
    setJiraError(null);
    setVerifiedJiraResult(null);

    try {
      const result = await verifyJiraMcpConnection({
        domain: jiraDomain,
        email: jiraEmail,
        apiToken: jiraToken,
        projectKey: jiraProject
      });
      setVerifiedJiraResult(result);
    } catch (err) {
      setJiraError(err.message);
    } finally {
      setIsVerifyingJira(false);
    }
  };

  const handleVerifyGithub = async () => {
    setIsVerifyingGithub(true);
    setGithubError(null);
    setVerifiedGithubResult(null);

    try {
      const [owner, repo] = githubRepo.split('/');
      const result = await verifyGitHubMcpConnection({
        personalAccessToken: githubToken,
        defaultOwner: owner,
        defaultRepo: repo || ''
      });
      setVerifiedGithubResult(result);
    } catch (err) {
      setGithubError(err.message);
    } finally {
      setIsVerifyingGithub(false);
    }
  };

  const handleDeployToCanvas = (mcpResult) => {
    saveRegisteredMcpServer(mcpResult);
    if (onAddMcpNodeToCanvas) {
      onAddMcpNodeToCanvas(mcpResult);
    }
    onClose();
    window.dispatchEvent(
      new CustomEvent('keaos:toast', {
        detail: { message: `🔗 Connected Real MCP Server: "${mcpResult.name}" to Canvas` }
      })
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#001E50]/70 backdrop-blur-xs flex items-center justify-center p-4 select-none animate-in fade-in duration-150">
      <div 
        className={`w-full max-w-2xl border flex flex-col shadow-2xl overflow-hidden rounded-none ${
          isDarkMode 
            ? 'bg-[#12141A] border-[#383C4A] text-white shadow-[0_24px_64px_rgba(0,0,0,0.8)]' 
            : 'bg-white border-[#CBD5E1] text-[#0B0F19] shadow-[0_24px_64px_rgba(0,30,80,0.2)]'
        }`}
        style={{ borderTop: '4px solid #00A3A6' }}
      >
        {/* Header */}
        <div className="p-4 bg-[#001E50] text-white flex items-center justify-between border-b border-[#00338D]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-none bg-[#00A3A6] text-white flex items-center justify-center font-bold">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold tracking-tight">Connect Real MCP Server</h3>
                <span className="text-[9px] font-mono uppercase px-2 py-0.2 bg-[#00A3A6] text-white font-bold rounded-none">
                  JSON-RPC 2.0 / SSE
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-sans mt-0.5">
                Connect live external MCP tools. Zero simulation. Live discovery and execution.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-300 hover:text-white hover:bg-white/10 rounded-none transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4 Tabs */}
        <div className="flex border-b border-[#CBD5E1] dark:border-[#2D3139] bg-[#F8F9FB] dark:bg-[#181B22]">
          <button
            onClick={() => setActiveTab('url')}
            className={`flex-1 py-2.5 px-3 text-xs font-mono font-bold flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'url'
                ? 'border-[#00A3A6] text-[#00A3A6] bg-white dark:bg-[#12141A]'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Link className="w-3.5 h-3.5" />
            <span>Universal MCP Link</span>
          </button>

          <button
            onClick={() => setActiveTab('slack')}
            className={`flex-1 py-2.5 px-3 text-xs font-mono font-bold flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'slack'
                ? 'border-[#00A3A6] text-[#00A3A6] bg-white dark:bg-[#12141A]'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Slack MCP</span>
          </button>

          <button
            onClick={() => setActiveTab('jira')}
            className={`flex-1 py-2.5 px-3 text-xs font-mono font-bold flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'jira'
                ? 'border-[#00A3A6] text-[#00A3A6] bg-white dark:bg-[#12141A]'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Jira / Atlassian</span>
          </button>

          <button
            onClick={() => setActiveTab('github')}
            className={`flex-1 py-2.5 px-3 text-xs font-mono font-bold flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'github'
                ? 'border-[#00A3A6] text-[#00A3A6] bg-white dark:bg-[#12141A]'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>GitHub MCP</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 overflow-y-auto max-h-[60vh] space-y-4">
          {/* TAB 1: Claude Code Style Link Box */}
          {activeTab === 'url' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-mono font-bold uppercase tracking-wider block mb-1.5 text-slate-700 dark:text-slate-300">
                  Paste MCP Server Endpoint URL
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="url"
                      placeholder="e.g. http://localhost:8000/sse or http://127.0.0.1:3001/mcp"
                      value={mcpUrl}
                      onChange={(e) => setMcpUrl(e.target.value)}
                      className={`w-full pl-9 pr-3 py-2.5 text-xs font-mono rounded-none border focus:outline-none transition-colors ${
                        isDarkMode
                          ? 'bg-[#181B22] border-[#383C4A] text-white focus:border-[#00A3A6]'
                          : 'bg-white border-[#CBD5E1] text-[#0B0F19] focus:border-[#00A3A6]'
                      }`}
                    />
                  </div>
                  <button
                    onClick={handleVerifyUrl}
                    disabled={isVerifyingUrl || !mcpUrl.trim()}
                    className="px-5 py-2.5 bg-[#00A3A6] hover:bg-[#008D90] disabled:opacity-40 text-white text-xs font-mono font-bold rounded-none flex items-center gap-2 transition-all cursor-pointer"
                  >
                    {isVerifyingUrl ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Discovering...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        <span>Connect & Discover</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2 text-[11px] text-slate-500 font-mono">
                  <span>Accepts standard Model Context Protocol (SSE / HTTP / JSON-RPC).</span>
                  <button
                    type="button"
                    onClick={() => setMcpUrl('http://localhost:8000/sse')}
                    className="text-[#00A3A6] hover:underline cursor-pointer"
                  >
                    Use localhost:8000 preset
                  </button>
                </div>
              </div>

              {urlError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-none flex items-start gap-2.5 text-red-600 dark:text-red-400 text-xs font-mono">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">{urlError}</p>
                </div>
              )}

              {verifiedUrlResult && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-none space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        Live MCP Server Verified
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold">
                      {verifiedUrlResult.tools.length} Tools Discovered
                    </span>
                  </div>

                  <div className="text-xs font-mono space-y-1">
                    <div><span className="text-slate-400">Server:</span> {verifiedUrlResult.name}</div>
                    <div><span className="text-slate-400">Endpoint:</span> {verifiedUrlResult.endpoint}</div>
                  </div>

                  {verifiedUrlResult.tools.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                        Discovered Tools:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {verifiedUrlResult.tools.map((t, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] font-mono px-2 py-1 bg-white/10 dark:bg-black/20 border border-white/20 rounded-none text-slate-200"
                          >
                            ✓ {t.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => handleDeployToCanvas(verifiedUrlResult)}
                    className="w-full py-2.5 bg-[#00338D] hover:bg-[#005EB8] text-white text-xs font-mono font-bold rounded-none flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Deploy Verified MCP Server to Canvas</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Slack MCP */}
          {activeTab === 'slack' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-mono font-bold uppercase tracking-wider block mb-1 text-slate-700 dark:text-slate-300">
                  Slack Incoming Webhook URL
                </label>
                <input
                  type="url"
                  placeholder="https://hooks.slack.com/services/T00/B00/XXXX"
                  value={slackWebhook}
                  onChange={(e) => setSlackWebhook(e.target.value)}
                  className={`w-full px-3 py-2.5 text-xs font-mono rounded-none border focus:outline-none transition-colors ${
                    isDarkMode
                      ? 'bg-[#181B22] border-[#383C4A] text-white focus:border-[#00A3A6]'
                      : 'bg-white border-[#CBD5E1] text-[#0B0F19] focus:border-[#00A3A6]'
                  }`}
                />
                <p className="text-[11px] text-slate-500 font-sans mt-1">
                  Create an Incoming Webhook in your Slack workspace under Custom Integrations or Slack App settings.
                </p>
              </div>

              <div>
                <label className="text-xs font-mono font-bold uppercase tracking-wider block mb-1 text-slate-700 dark:text-slate-300">
                  Default Target Channel
                </label>
                <input
                  type="text"
                  placeholder="#leadership-syncs or #general"
                  value={slackChannel}
                  onChange={(e) => setSlackChannel(e.target.value)}
                  className={`w-full px-3 py-2 text-xs font-mono rounded-none border focus:outline-none transition-colors ${
                    isDarkMode
                      ? 'bg-[#181B22] border-[#383C4A] text-white focus:border-[#00A3A6]'
                      : 'bg-white border-[#CBD5E1] text-[#0B0F19] focus:border-[#00A3A6]'
                  }`}
                />
              </div>

              {slackError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-none flex items-start gap-2.5 text-red-600 dark:text-red-400 text-xs font-mono">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">{slackError}</p>
                </div>
              )}

              {verifiedSlackResult ? (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-none space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      Slack Webhook Verified ✓
                    </span>
                  </div>
                  <p className="text-xs font-mono text-slate-300">
                    Exposes tool: <code className="text-[#00A3A6] font-bold">post_slack_message</code> (live dispatch to {slackChannel})
                  </p>
                  <button
                    onClick={() => handleDeployToCanvas(verifiedSlackResult)}
                    className="w-full py-2.5 bg-[#00338D] hover:bg-[#005EB8] text-white text-xs font-mono font-bold rounded-none flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Deploy Slack MCP to Canvas</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleVerifySlack}
                  disabled={isVerifyingSlack || !slackWebhook.trim()}
                  className="w-full py-2.5 bg-[#00A3A6] hover:bg-[#008D90] disabled:opacity-40 text-white text-xs font-mono font-bold rounded-none flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {isVerifyingSlack ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>Verify Slack Connection</span>
                </button>
              )}
            </div>
          )}

          {/* TAB 3: Jira MCP */}
          {activeTab === 'jira' && (
            <div className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-mono font-bold uppercase tracking-wider block mb-1 text-slate-700 dark:text-slate-300">
                    Jira Cloud Domain
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. company.atlassian.net"
                    value={jiraDomain}
                    onChange={(e) => setJiraDomain(e.target.value)}
                    className={`w-full px-3 py-2 text-xs font-mono rounded-none border focus:outline-none transition-colors ${
                      isDarkMode
                        ? 'bg-[#181B22] border-[#383C4A] text-white focus:border-[#00A3A6]'
                        : 'bg-white border-[#CBD5E1] text-[#0B0F19] focus:border-[#00A3A6]'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-xs font-mono font-bold uppercase tracking-wider block mb-1 text-slate-700 dark:text-slate-300">
                    Project Key
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ENG, PROD, SPRINT"
                    value={jiraProject}
                    onChange={(e) => setJiraProject(e.target.value)}
                    className={`w-full px-3 py-2 text-xs font-mono rounded-none border focus:outline-none transition-colors ${
                      isDarkMode
                        ? 'bg-[#181B22] border-[#383C4A] text-white focus:border-[#00A3A6]'
                        : 'bg-white border-[#CBD5E1] text-[#0B0F19] focus:border-[#00A3A6]'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-mono font-bold uppercase tracking-wider block mb-1 text-slate-700 dark:text-slate-300">
                  Atlassian Account Email
                </label>
                <input
                  type="email"
                  placeholder="developer@company.com"
                  value={jiraEmail}
                  onChange={(e) => setJiraEmail(e.target.value)}
                  className={`w-full px-3 py-2 text-xs font-mono rounded-none border focus:outline-none transition-colors ${
                    isDarkMode
                      ? 'bg-[#181B22] border-[#383C4A] text-white focus:border-[#00A3A6]'
                      : 'bg-white border-[#CBD5E1] text-[#0B0F19] focus:border-[#00A3A6]'
                  }`}
                />
              </div>

              <div>
                <label className="text-xs font-mono font-bold uppercase tracking-wider block mb-1 text-slate-700 dark:text-slate-300">
                  Atlassian API Token
                </label>
                <input
                  type="password"
                  placeholder="Paste Atlassian API Token"
                  value={jiraToken}
                  onChange={(e) => setJiraToken(e.target.value)}
                  className={`w-full px-3 py-2 text-xs font-mono rounded-none border focus:outline-none transition-colors ${
                    isDarkMode
                      ? 'bg-[#181B22] border-[#383C4A] text-white focus:border-[#00A3A6]'
                      : 'bg-white border-[#CBD5E1] text-[#0B0F19] focus:border-[#00A3A6]'
                  }`}
                />
                <p className="text-[11px] text-slate-500 font-sans mt-1">
                  Generate from: <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noreferrer" className="text-[#00A3A6] hover:underline">id.atlassian.com/manage-profile/security/api-tokens</a>
                </p>
              </div>

              {jiraError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-none flex items-start gap-2.5 text-red-600 dark:text-red-400 text-xs font-mono">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">{jiraError}</p>
                </div>
              )}

              {verifiedJiraResult ? (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-none space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      Jira Cloud Configured ✓
                    </span>
                  </div>
                  <p className="text-xs font-mono text-slate-300">
                    Exposes tools: <code className="text-[#00A3A6]">create_jira_issue</code>, <code className="text-[#00A3A6]">search_jira_issues</code>
                  </p>
                  <button
                    onClick={() => handleDeployToCanvas(verifiedJiraResult)}
                    className="w-full py-2.5 bg-[#00338D] hover:bg-[#005EB8] text-white text-xs font-mono font-bold rounded-none flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Deploy Jira MCP to Canvas</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleVerifyJira}
                  disabled={isVerifyingJira || !jiraDomain.trim() || !jiraToken.trim()}
                  className="w-full py-2.5 bg-[#00A3A6] hover:bg-[#008D90] disabled:opacity-40 text-white text-xs font-mono font-bold rounded-none flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {isVerifyingJira ? <Loader2 className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
                  <span>Verify Jira Cloud Connection</span>
                </button>
              )}
            </div>
          )}

          {/* TAB 4: GitHub MCP */}
          {activeTab === 'github' && (
            <div className="space-y-3.5">
              <div>
                <label className="text-xs font-mono font-bold uppercase tracking-wider block mb-1 text-slate-700 dark:text-slate-300">
                  GitHub Personal Access Token (PAT)
                </label>
                <input
                  type="password"
                  placeholder="ghp_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  className={`w-full px-3 py-2 text-xs font-mono rounded-none border focus:outline-none transition-colors ${
                    isDarkMode
                      ? 'bg-[#181B22] border-[#383C4A] text-white focus:border-[#00A3A6]'
                      : 'bg-white border-[#CBD5E1] text-[#0B0F19] focus:border-[#00A3A6]'
                  }`}
                />
                <p className="text-[11px] text-slate-500 font-sans mt-1">
                  Generate from: <a href="https://github.com/settings/tokens" target="_blank" rel="noreferrer" className="text-[#00A3A6] hover:underline">github.com/settings/tokens</a> (repo scope).
                </p>
              </div>

              <div>
                <label className="text-xs font-mono font-bold uppercase tracking-wider block mb-1 text-slate-700 dark:text-slate-300">
                  Target Repository (owner/repo)
                </label>
                <input
                  type="text"
                  placeholder="e.g. facebook/react or yourorg/backend"
                  value={githubRepo}
                  onChange={(e) => setGithubRepo(e.target.value)}
                  className={`w-full px-3 py-2 text-xs font-mono rounded-none border focus:outline-none transition-colors ${
                    isDarkMode
                      ? 'bg-[#181B22] border-[#383C4A] text-white focus:border-[#00A3A6]'
                      : 'bg-white border-[#CBD5E1] text-[#0B0F19] focus:border-[#00A3A6]'
                  }`}
                />
              </div>

              {githubError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-none flex items-start gap-2.5 text-red-600 dark:text-red-400 text-xs font-mono">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">{githubError}</p>
                </div>
              )}

              {verifiedGithubResult ? (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-none space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      GitHub Authenticated: {verifiedGithubResult.name} ✓
                    </span>
                  </div>
                  <p className="text-xs font-mono text-slate-300">
                    Exposes tools: <code className="text-[#00A3A6]">create_github_issue</code>, <code className="text-[#00A3A6]">list_github_issues</code>, <code className="text-[#00A3A6]">get_file_contents</code>
                  </p>
                  <button
                    onClick={() => handleDeployToCanvas(verifiedGithubResult)}
                    className="w-full py-2.5 bg-[#00338D] hover:bg-[#005EB8] text-white text-xs font-mono font-bold rounded-none flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Deploy GitHub MCP to Canvas</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleVerifyGithub}
                  disabled={isVerifyingGithub || !githubToken.trim()}
                  className="w-full py-2.5 bg-[#00A3A6] hover:bg-[#008D90] disabled:opacity-40 text-white text-xs font-mono font-bold rounded-none flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {isVerifyingGithub ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCode className="w-4 h-4" />}
                  <span>Verify GitHub Authentication</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-[#CBD5E1] dark:border-[#2D3139] bg-[#F8F9FB] dark:bg-[#181B22] flex items-center justify-between text-xs font-mono text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#00A3A6]" />
            <span>Credentials stay 100% encrypted in your local browser sandbox.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 border border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 text-xs font-mono rounded-none"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
