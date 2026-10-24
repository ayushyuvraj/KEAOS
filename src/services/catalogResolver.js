/**
 * KEAOS Institutional Catalog Resolution & Live Sync Engine
 * Strictly maps user directives, IDs, and LLM synthesis outputs to official
 * registered components available in the right panel.
 * 
 * ZERO CHANGES TO THE RIGHT PANEL:
 * Reads live from PILLARS, right-panel canvas node categories, live registered
 * MCP servers, and custom skills in real-time.
 */

import { PILLARS } from '../constants/pillars';
import { 
  SLACK_OFFICIAL_ACTIONS,
  GITHUB_OFFICIAL_ACTIONS,
  JIRA_OFFICIAL_ACTIONS,
  NEO4J_OFFICIAL_ACTIONS,
  OUTLOOK_OFFICIAL_ACTIONS
} from '../constants/mcpOfficialCatalogs';
import { getRegisteredMcpServers } from './mcpClientService';

// Additional official MCP Servers recognized in KEAOS
export const OFFICIAL_MCP_SERVERS = [
  {
    id: 'mcp-outlook',
    name: 'Microsoft Outlook MCP',
    pillarType: 'mcp',
    description: 'Official Model Context Protocol integration for Microsoft Outlook & M365. Manages emails, scheduling calendar events, contacts, tasks, and mailbox rules via Microsoft Graph API.',
    serviceName: 'Outlook',
    transport: 'outlook-api',
    config: {
      connectionMode: 'oauth',
      endpoint: 'https://graph.microsoft.com/v1.0'
    },
    tools: OUTLOOK_OFFICIAL_ACTIONS
  },
  {
    id: 'mcp-neo4j-graph',
    name: 'Neo4j Graph Database MCP',
    pillarType: 'mcp',
    description: 'Official Model Context Protocol integration for Neo4j. Introspects schema, executes read/write Cypher queries, GDS algorithms, and traverses subgraphs.',
    serviceName: 'Neo4j',
    transport: 'neo4j-api',
    config: {
      connectionMode: 'local',
      uri: 'bolt://localhost:7687',
      httpUrl: 'http://localhost:7474',
      database: 'neo4j'
    },
    tools: NEO4J_OFFICIAL_ACTIONS
  },
  {
    id: 'mcp-slack',
    name: 'Slack MCP Server',
    pillarType: 'mcp',
    description: 'Real-time JSON-RPC connection to Slack workspace. Posts channel updates, sends direct messages, and routes meeting action summaries.',
    serviceName: 'Slack',
    transport: 'sse',
    config: {
      connectionMode: 'bot_token',
      defaultChannel: '#general'
    },
    tools: SLACK_OFFICIAL_ACTIONS
  },
  {
    id: 'mcp-jira',
    name: 'Atlassian Jira MCP Server',
    pillarType: 'mcp',
    description: 'Bi-directional issue tracking integration. Creates user stories, tickets, and updates sprint boards from extracted meeting deliverables.',
    serviceName: 'Jira',
    transport: 'sse',
    config: {
      connectionMode: 'api_token',
      projectKey: 'KEA'
    },
    tools: JIRA_OFFICIAL_ACTIONS
  },
  {
    id: 'mcp-github',
    name: 'GitHub MCP Server',
    pillarType: 'mcp',
    description: 'Official GitHub repository context protocol. Inspects branches, queries pull requests, audits code changes, and files tracking issues.',
    serviceName: 'GitHub',
    transport: 'sse',
    config: {
      connectionMode: 'oauth'
    },
    tools: GITHUB_OFFICIAL_ACTIONS
  }
];

// Canvas Nodes available in the right panel (Triggers, Routers, Approvals, Deterministic, Outputs)
export const CANVAS_NODE_DEFINITIONS = [
  {
    id: 'agent-core-primary',
    name: 'Autonomous Agent',
    pillarType: 'agentCore',
    nodeType: 'agentCore',
    badge: 'CORE AGENT',
    description: 'Primary reasoning core, persona directive instructions, multi-SDK code synthesis, and typed socket coordinator.',
    config: { framework: 'google-adk', temperature: 0.2, topP: 0.95 }
  },
  {
    id: 'trigger-manual-instant',
    name: 'Manual Start Trigger',
    pillarType: 'triggers',
    nodeType: 'triggerNode',
    badge: 'TRIGGER',
    description: 'Tactile circular origin disc. Emits manual execution impulse directly into AI Agents or Deterministic Boxes.',
    config: { triggerType: 'manual', defaultPayload: '{\n  "source": "manual_dispatch",\n  "test": true\n}' }
  },
  {
    id: 'trigger-schedule-cron',
    name: 'Schedule / Time Trigger',
    pillarType: 'triggers',
    nodeType: 'triggerNode',
    badge: 'TRIGGER',
    description: 'Temporal ignition. Executes at a scheduled date and time or on a recurring interval with zero cognitive burden.',
    config: { triggerType: 'schedule', intervalMinutes: 15 }
  },
  {
    id: 'trigger-webhook-universal',
    name: 'Webhook Ingress Trigger',
    pillarType: 'triggers',
    nodeType: 'triggerNode',
    badge: 'TRIGGER',
    description: 'Universal HTTP webhook endpoint. Subscribes to external systems, fast ACKs (200 OK), and dispatches payload.',
    config: { triggerType: 'webhook', webhookPath: '/api/ingress/v1/wh_live' }
  },
  {
    id: 'trigger-file-drop',
    name: 'File Watcher Trigger',
    pillarType: 'triggers',
    nodeType: 'triggerNode',
    badge: 'TRIGGER',
    description: 'Tactile file drop zone. Ingests local PDFs, text files, audio recordings, or CSVs and forwards into workflows.',
    config: { triggerType: 'file', acceptedTypes: ['pdf', 'txt', 'csv', 'json', 'mp3'] }
  },
  {
    id: 'trigger-poll-api',
    name: 'API Polling Watcher Trigger',
    pillarType: 'triggers',
    nodeType: 'triggerNode',
    badge: 'TRIGGER',
    description: 'Smart periodic REST/GraphQL watcher with SHA-256 watermark deduplication. Only triggers on payload changes.',
    config: { triggerType: 'poll', pollIntervalSeconds: 60 }
  },
  {
    id: 'router-conditional-switch',
    name: 'Conditional Router',
    pillarType: 'logics',
    nodeType: 'routerNode',
    badge: 'ROUTER',
    description: 'Subtle visual decision fork. Evaluates incoming data and routes execution to True or False branches.',
    config: { targetField: 'status', operator: '==', comparisonValue: 'approved', trueLabel: 'True / Match', falseLabel: 'False / Default' }
  },
  {
    id: 'approval-gate-primary',
    name: 'Approval Gate',
    pillarType: 'governance',
    nodeType: 'approvalNode',
    badge: 'SIGN-OFF',
    description: 'Human-in-the-Loop checkpoint. Pauses execution for explicit human review, sign-off, or rejection.',
    config: { reviewerRole: 'Compliance Officer', instructions: 'Verify payload criteria before releasing downstream.', timeoutPolicy: 'manual' }
  },
  {
    id: 'deterministic-box-primary',
    name: 'Deterministic Logic Box',
    pillarType: 'deterministicNode',
    nodeType: 'deterministicNode',
    badge: '⚡ 0 TOKENS',
    description: 'Zero-token mathematical join, table pivot, VLOOKUP, variable swapping, and custom Python/SQL/JS logic from simple human language.',
    config: { language: 'python', engine: 'auto' }
  },
  {
    id: 'output-final-viewer-v2',
    name: 'Output Viewer v2.0 (Artifact Studio)',
    pillarType: 'outputNode',
    nodeType: 'outputNodeV2',
    badge: 'OUTPUT SINK',
    description: 'Next-generation square studio with live Markdown, interactive sortable/searchable Data Grid, Monospace JSON stream, and export suite.',
    config: { format: 'markdown', persistenceStrategy: 'append' }
  },
  {
    id: 'output-final-viewer',
    name: 'Final Output Viewer & Exporter',
    pillarType: 'outputNode',
    nodeType: 'outputNode',
    badge: 'OUTPUT SINK',
    description: 'Universal terminal canvas sink with live Markdown inspection and multi-format exporter.',
    config: { format: 'markdown', persistenceStrategy: 'append' }
  }
];

/**
 * Gathers the complete, live catalog currently available in KEAOS.
 * Dynamically aggregates:
 * 1. Built-in PILLARS
 * 2. Canvas node categories
 * 3. Registered live MCP servers from persistent storage
 * 4. User-created Custom Skills from localStorage
 */
export function getAllRegisteredCatalogItems() {
  const items = [];

  // 1. Gather all items from standard PILLARS
  Object.entries(PILLARS).forEach(([pillarKey, pillarDef]) => {
    (pillarDef.items || []).forEach(item => {
      items.push({
        ...item,
        pillarType: pillarKey,
        badge: pillarDef.badge,
        socketId: pillarDef.socketId,
        color: pillarDef.color
      });
    });
  });

  // 2. Add extra official MCP Servers
  OFFICIAL_MCP_SERVERS.forEach(mcp => {
    if (!items.some(i => i.id === mcp.id)) {
      items.push({
        ...mcp,
        badge: 'MCP SERVER',
        socketId: 'mcp-in',
        color: '#00A3A6'
      });
    }
  });

  // 3. Add canvas node categories (Triggers, Routers, Approvals, Deterministic, Output)
  CANVAS_NODE_DEFINITIONS.forEach(def => {
    if (!items.some(i => i.id === def.id)) {
      items.push(def);
    }
  });

  // 4. Live Custom Skills (Dynamically added in right panel and saved to localStorage)
  if (typeof window !== 'undefined') {
    try {
      const rawCustomSkills = localStorage.getItem('keaos_custom_skills');
      if (rawCustomSkills) {
        const parsed = JSON.parse(rawCustomSkills);
        if (Array.isArray(parsed)) {
          parsed.forEach(cs => {
            if (cs && cs.id && !items.some(i => i.id === cs.id)) {
              items.push({
                ...cs,
                pillarType: 'skills',
                badge: 'CUSTOM SKILL',
                socketId: 'skill-in',
                color: '#009A44'
              });
            }
          });
        }
      }
    } catch (e) {}

    // 5. Live Registered MCP Servers (Dynamically connected in right panel)
    try {
      const liveMcps = getRegisteredMcpServers();
      if (Array.isArray(liveMcps)) {
        liveMcps.forEach(s => {
          if (s && s.id && !items.some(i => i.id === s.id)) {
            items.push({
              id: s.id,
              name: s.displayName || s.name || 'MCP Server',
              description: s.description || `Live MCP integration exposing ${s.tools?.length || 0} tools.`,
              tools: s.tools || [],
              config: s.config || {},
              pillarType: 'mcp',
              badge: 'MCP SERVER',
              socketId: 'mcp-in',
              color: '#00A3A6'
            });
          }
        });
      }
    } catch (e) {}
  }

  return items;
}

/**
 * Resolves a component identifier (ID, name, or keyword) against the live catalog.
 * Supports any alias like modelName, skillName, policyName, etc.
 * Returns the authoritative catalog record or null if not found.
 */
export function resolveCatalogItem(identifier, pillarTypeHint = null) {
  if (!identifier) return null;
  const raw = String(identifier).trim().toLowerCase();
  const allItems = getAllRegisteredCatalogItems();

  // 1. Exact ID Match (e.g. 'pol-pii-masker', 'skill-summarizer', 'model-gpt-4o')
  let match = allItems.find(i => i.id.toLowerCase() === raw);
  if (match) return match;

  // 1b. Check if identifier had prefix stripped or added
  match = allItems.find(i => i.id.toLowerCase().replace(/^(model|skill|pol|mem|gw|mcp|obs|tool|node|trigger|router|approval)-/, '') === raw.replace(/^(model|skill|pol|mem|gw|mcp|obs|tool|node|trigger|router|approval)-/, ''));
  if (match) return match;

  // 2. Exact Name Match (e.g. 'PII & Confidentiality Redactor', 'Executive Summarizer', 'GPT-4o')
  match = allItems.find(i => i.name.toLowerCase() === raw);
  if (match) return match;

  // 3. Filter candidates by pillarTypeHint if provided
  const candidates = pillarTypeHint 
    ? allItems.filter(i => i.pillarType === pillarTypeHint)
    : allItems;

  // 4. Normalized Name Match (strip non-alphanumeric)
  const cleanRaw = raw.replace(/[^a-z0-9]/g, '');
  match = candidates.find(i => i.name.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanRaw);
  if (match) return match;

  // 5. Keyword & Semantic Alias Mapping
  const keywordMatch = findByKeywords(raw, candidates);
  if (keywordMatch) return keywordMatch;

  // 6. If pillarTypeHint was provided but no match in hint candidates, try all items
  if (pillarTypeHint && candidates.length !== allItems.length) {
    const fallbackMatch = findByKeywords(raw, allItems);
    if (fallbackMatch) return fallbackMatch;
  }

  return null;
}

function findByKeywords(raw, list) {
  // Model Keywords
  if (/\b(gpt[- ]?4o?[- ]?mini|gpt[- ]?4[- ]?mini)\b/i.test(raw) || (raw.includes('mini') && (raw.includes('gpt') || raw.includes('4o')))) {
    return list.find(i => i.id === 'model-gpt-4o-mini') || null;
  }
  if (/\b(gpt[- ]?4o|gpt4o|gpt[- ]?4|gpt4|openai|chatgpt)\b/i.test(raw)) {
    return list.find(i => i.id === 'model-gpt-4o') || null;
  }
  if (/\b(gemini[- ]?2|flash)\b/i.test(raw)) {
    return list.find(i => i.id === 'model-gemini-2-flash') || null;
  }
  if (/\b(gemini[- ]?1\.?5|gemini[- ]?pro|gemini)\b/i.test(raw)) {
    return list.find(i => i.id === 'model-gemini-1-5-pro') || null;
  }
  if (/\b(sonnet|claude[- ]?3[- ]?5[- ]?sonnet)\b/i.test(raw) || (raw.includes('claude') && !raw.includes('haiku'))) {
    return list.find(i => i.id === 'model-claude-3-5-sonnet') || null;
  }
  if (/\b(haiku|claude[- ]?3[- ]?5[- ]?haiku)\b/i.test(raw)) {
    return list.find(i => i.id === 'model-claude-3-5-haiku') || null;
  }
  if (/\b(llama|ollama)\b/i.test(raw) && !raw.includes('deepseek')) {
    return list.find(i => i.id === 'model-ollama-llama3') || null;
  }
  if (/\bdeepseek\b/i.test(raw) && (raw.includes('local') || raw.includes('ollama'))) {
    return list.find(i => i.id === 'model-ollama-deepseek') || null;
  }
  if (/\bdeepseek\b/i.test(raw)) {
    return list.find(i => i.id === 'model-openrouter-deepseek') || null;
  }

  // Policy Keywords
  if (raw.includes('pii') || raw.includes('redactor') || raw.includes('masker') || raw.includes('confidentiality') || raw.includes('privacy')) {
    return list.find(i => i.id === 'pol-pii-masker') || null;
  }
  if (raw.includes('nda') || raw.includes('trade secret') || raw.includes('legal guard') || raw.includes('compliance')) {
    return list.find(i => i.id === 'pol-nda-guard') || null;
  }

  // Skill Keywords
  if (raw.includes('mom') || raw.includes('minutes') || raw.includes('comprehensive')) {
    return list.find(i => i.id === 'skill-comprehensive-mom') || null;
  }
  if (raw.includes('action') || raw.includes('tasks') || raw.includes('assignee')) {
    return list.find(i => i.id === 'skill-action-items') || null;
  }
  if (raw.includes('summar') || raw.includes('tldr') || raw.includes('executive summary')) {
    return list.find(i => i.id === 'skill-summarizer') || null;
  }
  if (raw.includes('markdown') || raw.includes('reporter')) {
    return list.find(i => i.id === 'skill-markdown-reporter') || null;
  }
  if (raw.includes('sentiment') || raw.includes('conflict') || raw.includes('morale')) {
    return list.find(i => i.id === 'skill-sentiment') || null;
  }
  if (raw.includes('decision') || raw.includes('register') || raw.includes('agreements')) {
    return list.find(i => i.id === 'skill-decisions-log') || null;
  }
  if (raw.includes('email') || raw.includes('followup') || raw.includes('recap email')) {
    return list.find(i => i.id === 'skill-followup-email') || null;
  }
  if (raw.includes('depth') || raw.includes('maximizer') || raw.includes('exhaustive')) {
    return list.find(i => i.id === 'skill-depth-maximizer') || null;
  }

  // Gateway Keywords
  if (raw.includes('mcp controller') || raw.includes('egress') || (raw.includes('gateway') && !raw.includes('rate') && !raw.includes('fallback'))) {
    return list.find(i => i.id === 'gw-mcp-controller') || null;
  }
  if (raw.includes('rate limiter') || raw.includes('rpm') || raw.includes('quota')) {
    return list.find(i => i.id === 'gw-rate-limiter') || null;
  }
  if (raw.includes('fallback') || raw.includes('reroute')) {
    return list.find(i => i.id === 'gw-fallback-router') || null;
  }

  // Memory Keywords
  if (raw.includes('episodic') || raw.includes('recurring') || raw.includes('commitments')) {
    return list.find(i => i.id === 'mem-episodic-sync') || null;
  }
  if (raw.includes('chroma') || raw.includes('vector') || raw.includes('rag') || raw.includes('semantic search')) {
    return list.find(i => i.id === 'mem-chroma-vector') || null;
  }

  // MCP Server Keywords
  if (raw.includes('outlook') || raw.includes('email') || raw.includes('m365') || raw.includes('calendar')) {
    return list.find(i => i.id === 'mcp-outlook') || null;
  }
  if (raw.includes('neo4j') || raw.includes('cypher') || raw.includes('graph database')) {
    return list.find(i => i.id === 'mcp-neo4j-graph') || null;
  }
  if (raw.includes('slack')) {
    return list.find(i => i.id === 'mcp-slack') || null;
  }
  if (raw.includes('jira') || raw.includes('atlassian') || raw.includes('ticket')) {
    return list.find(i => i.id === 'mcp-jira') || null;
  }
  if (raw.includes('github') || raw.includes('git') || raw.includes('repo')) {
    return list.find(i => i.id === 'mcp-github') || null;
  }

  // Tool / Ingest Keywords
  if (raw.includes('audio') || raw.includes('speech') || raw.includes('transcri')) {
    return list.find(i => i.id === 'ingest-audio-stream') || null;
  }
  if (raw.includes('text') || raw.includes('paste')) {
    return list.find(i => i.id === 'ingest-raw-text') || null;
  }
  if (raw.includes('file') || raw.includes('doc') || raw.includes('pdf') || raw.includes('ingest')) {
    return list.find(i => i.id === 'ingest-universal-file') || null;
  }

  // Triggers, Routers, Approvals, Deterministic, Output
  if (raw.includes('trigger') || raw.includes('webhook') || raw.includes('cron') || raw.includes('schedule')) {
    if (raw.includes('cron') || raw.includes('schedule') || raw.includes('time')) return list.find(i => i.id === 'trigger-schedule-cron') || null;
    if (raw.includes('webhook')) return list.find(i => i.id === 'trigger-webhook-universal') || null;
    if (raw.includes('file')) return list.find(i => i.id === 'trigger-file-drop') || null;
    if (raw.includes('poll')) return list.find(i => i.id === 'trigger-poll-api') || null;
    return list.find(i => i.id === 'trigger-manual-instant') || null;
  }
  if (raw.includes('router') || raw.includes('branch') || raw.includes('condition')) {
    return list.find(i => i.id === 'router-conditional-switch') || null;
  }
  if (raw.includes('approval') || raw.includes('human') || raw.includes('review') || raw.includes('gate')) {
    return list.find(i => i.id === 'approval-gate-primary') || null;
  }
  if (raw.includes('deterministic') || raw.includes('python') || raw.includes('code') || raw.includes('zero token')) {
    return list.find(i => i.id === 'deterministic-box-primary') || null;
  }
  if (raw.includes('output') || raw.includes('artifact') || raw.includes('studio') || raw.includes('export')) {
    return list.find(i => i.id === 'output-final-viewer-v2') || null;
  }

  // Audit / Observability
  if (raw.includes('audit') || raw.includes('sha-256') || raw.includes('tamper')) {
    return list.find(i => i.id === 'audit-tamper-proof') || null;
  }
  if (raw.includes('opentelemetry') || raw.includes('trace') || raw.includes('telemetry')) {
    return list.find(i => i.id === 'obs-opentelemetry') || null;
  }
  if (raw.includes('roi') || raw.includes('cost') || raw.includes('time-saved')) {
    return list.find(i => i.id === 'roi-tracker') || null;
  }

  return null;
}

/**
 * Produces a clear, readable catalog manifest to inject directly into
 * the AI Canvas Architect system prompt so the LLM is strictly bound
 * to all available right-panel components.
 */
export function getCatalogManifestForPrompt() {
  const items = getAllRegisteredCatalogItems();
  const byPillar = {};
  items.forEach(item => {
    const key = item.pillarType || 'other';
    if (!byPillar[key]) byPillar[key] = [];
    byPillar[key].push(`- [ID: "${item.id}"] "${item.name}": ${item.description}`);
  });

  return Object.entries(byPillar)
    .map(([pillar, lines]) => `### Category: ${pillar.toUpperCase()}\n${lines.join('\n')}`)
    .join('\n\n');
}
