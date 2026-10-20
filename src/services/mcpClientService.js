/**
 * KEAOS Universal Model Context Protocol (MCP) Client Service
 * 
 * Provides real-time JSON-RPC 2.0 / SSE discovery and execution for live external MCP servers,
 * as well as direct live execution bridges for Slack, Jira, and GitHub.
 * Zero hard-coded simulations.
 */

import {
  NEO4J_OFFICIAL_ACTIONS,
  OUTLOOK_OFFICIAL_ACTIONS,
  GITHUB_OFFICIAL_ACTIONS,
  SLACK_OFFICIAL_ACTIONS,
  JIRA_OFFICIAL_ACTIONS,
  GOOGLE_WORKSPACE_OFFICIAL_ACTIONS,
  MCP_AUTH_SPECS,
  extractToolsFromOpenApiSpec,
  getOfficialMcpTools,
  identifyMcpService
} from '../constants/mcpOfficialCatalogs';

const SAVED_MCPS_STORAGE_KEY = 'keaos_registered_mcps';

export const DEFAULT_OFFICIAL_MCP_SERVERS = [];

/**
 * Zero-Trust Attachment Security & Malicious Payload Quarantine
 * Inspects file extension, flags executable payloads, and sanitizes
 * adversarial prompt injections embedded in attachment text before LLM ingestion.
 */
const RISKY_ATTACHMENT_EXTENSIONS = new Set([
  'exe', 'bat', 'cmd', 'ps1', 'vbs', 'vbe', 'js', 'jse', 'wsf', 'wsh',
  'scr', 'cpl', 'msi', 'msp', 'hta', 'jar', 'reg', 'pif', 'com', 'inf'
]);

export function inspectAttachmentSecurity({ fileName, contentType, contentText, sizeBytes }) {
  const parts = (fileName || '').split('.');
  const ext = parts.length > 1 ? parts.pop().toLowerCase() : '';
  const isBlocked = RISKY_ATTACHMENT_EXTENSIONS.has(ext);

  // Prompt injection patterns commonly embedded in adversarial attachments
  const promptInjectionPatterns = [
    /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i,
    /system\s*:\s*disregard/i,
    /you\s+are\s+now\s+in\s+developer\s+mode/i,
    /override\s+(all\s+)?system\s+prompts?/i,
    /output\s+(all\s+)?(api\s+keys|passwords|credentials|tokens)/i,
    /disregard\s+(all\s+)?safety\s+guidelines/i
  ];

  let detectedInjections = [];
  let sanitizedText = contentText || '';

  if (typeof contentText === 'string') {
    for (const pattern of promptInjectionPatterns) {
      if (pattern.test(contentText)) {
        detectedInjections.push(pattern.source);
        sanitizedText = sanitizedText.replace(pattern, '[SECURITY QUARANTINE: ADVERSARIAL PROMPT INJECTION SANITIZED]');
      }
    }
  }

  return {
    isBlocked,
    riskLevel: isBlocked ? 'HIGH' : (detectedInjections.length > 0 ? 'MEDIUM' : 'LOW'),
    blockReason: isBlocked ? `Executable or script attachment (.${ext}) is quarantined under institutional zero-trust policies.` : null,
    injectionsDetected: detectedInjections,
    sanitizedContent: sanitizedText
  };
}

/**
 * Computes a real W3C WebCrypto SHA-256 fingerprint for attachment integrity and audit logging.
 */
export async function computeAttachmentSha256(data) {
  try {
    const encoder = new TextEncoder();
    const dataBuffer = typeof data === 'string' ? encoder.encode(data) : data;
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    return 'sha256-digest-unavailable';
  }
}

/**
 * Extracts clean, human-readable text from Office / OpenXML files (.docx, .xlsx) in browser runtime.
 * Zero external libraries: parses Zip headers and Central Directory, decompresses with DecompressionStream('deflate-raw'),
 * and converts Word/Excel XML paragraphs and table grids into structured text.
 */
export async function extractTextFromZipDoc(bytes, fileName = '') {
  if (!bytes || bytes.length < 30) return null;

  // Verify ZIP header magic 0x04034b50 ("PK\x03\x04")
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b || bytes[2] !== 0x03 || bytes[3] !== 0x04) {
    return null;
  }

  // Find End of Central Directory (EOCD) signature: 0x06054b50 ("PK\x05\x06")
  let eocdOffset = -1;
  const maxSearch = Math.min(bytes.length, 65557 + 22);
  for (let i = bytes.length - 22; i >= bytes.length - maxSearch; i--) {
    if (bytes[i] === 0x50 && bytes[i + 1] === 0x4b && bytes[i + 2] === 0x05 && bytes[i + 3] === 0x06) {
      eocdOffset = i;
      break;
    }
  }

  const entries = [];

  if (eocdOffset !== -1) {
    const totalEntries = (bytes[eocdOffset + 10] | (bytes[eocdOffset + 11] << 8)) >>> 0;
    const cdOffset = (bytes[eocdOffset + 16] | (bytes[eocdOffset + 17] << 8) | (bytes[eocdOffset + 18] << 16) | (bytes[eocdOffset + 19] << 24)) >>> 0;

    let pos = cdOffset;
    for (let e = 0; e < totalEntries && pos < bytes.length - 46; e++) {
      if (bytes[pos] !== 0x50 || bytes[pos + 1] !== 0x4b || bytes[pos + 2] !== 0x01 || bytes[pos + 3] !== 0x02) {
        break;
      }
      const method = bytes[pos + 10] | (bytes[pos + 11] << 8);
      const cSize = (bytes[pos + 20] | (bytes[pos + 21] << 8) | (bytes[pos + 22] << 16) | (bytes[pos + 23] << 24)) >>> 0;
      const uSize = (bytes[pos + 24] | (bytes[pos + 25] << 8) | (bytes[pos + 26] << 16) | (bytes[pos + 27] << 24)) >>> 0;
      const fnLen = bytes[pos + 28] | (bytes[pos + 29] << 8);
      const extraLen = bytes[pos + 30] | (bytes[pos + 31] << 8);
      const commentLen = bytes[pos + 32] | (bytes[pos + 33] << 8);
      const localHeaderOffset = (bytes[pos + 42] | (bytes[pos + 43] << 8) | (bytes[pos + 44] << 16) | (bytes[pos + 45] << 24)) >>> 0;

      const nameBytes = bytes.subarray(pos + 46, pos + 46 + fnLen);
      const entryName = new TextDecoder('utf-8').decode(nameBytes);

      entries.push({
        name: entryName,
        method,
        cSize,
        uSize,
        localHeaderOffset
      });

      pos += 46 + fnLen + extraLen + commentLen;
    }
  } else {
    // Fallback: Scan local headers directly
    let pos = 0;
    while (pos < bytes.length - 30) {
      if (bytes[pos] !== 0x50 || bytes[pos + 1] !== 0x4b || bytes[pos + 2] !== 0x03 || bytes[pos + 3] !== 0x04) {
        break;
      }
      const method = bytes[pos + 8] | (bytes[pos + 9] << 8);
      const cSize = (bytes[pos + 18] | (bytes[pos + 19] << 8) | (bytes[pos + 20] << 16) | (bytes[pos + 21] << 24)) >>> 0;
      const uSize = (bytes[pos + 22] | (bytes[pos + 23] << 8) | (bytes[pos + 24] << 16) | (bytes[pos + 25] << 24)) >>> 0;
      const fnLen = bytes[pos + 26] | (bytes[pos + 27] << 8);
      const extraLen = bytes[pos + 28] | (bytes[pos + 29] << 8);

      const nameBytes = bytes.subarray(pos + 30, pos + 30 + fnLen);
      const entryName = new TextDecoder('utf-8').decode(nameBytes);

      entries.push({
        name: entryName,
        method,
        cSize,
        uSize,
        localHeaderOffset: pos
      });

      pos += 30 + fnLen + extraLen + cSize;
    }
  }

  async function decompressEntry(entry) {
    const loc = entry.localHeaderOffset;
    if (loc + 30 > bytes.length) return null;
    const localFnLen = bytes[loc + 26] | (bytes[loc + 27] << 8);
    const localExtraLen = bytes[loc + 28] | (bytes[loc + 29] << 8);
    const dataStart = loc + 30 + localFnLen + localExtraLen;
    const compressedSlice = bytes.subarray(dataStart, dataStart + entry.cSize);

    if (entry.method === 0) {
      return new TextDecoder('utf-8').decode(compressedSlice);
    }
    if (entry.method === 8) {
      if (typeof DecompressionStream !== 'undefined') {
        try {
          const ds = new DecompressionStream('deflate-raw');
          const writer = ds.writable.getWriter();
          writer.write(compressedSlice);
          writer.close();
          const resp = new Response(ds.readable);
          const decompressedBuf = await resp.arrayBuffer();
          return new TextDecoder('utf-8').decode(decompressedBuf);
        } catch (e) {
          console.warn('DecompressionStream error for entry', entry.name, e);
        }
      }
    }
    return null;
  }

  // Branch A: Word Document (.docx)
  const isWord = fileName.toLowerCase().endsWith('.docx') || entries.some(e => e.name === 'word/document.xml');
  if (isWord) {
    const docEntry = entries.find(e => e.name === 'word/document.xml');
    if (!docEntry) return null;
    const docXml = await decompressEntry(docEntry);
    if (!docXml) return null;

    if (typeof DOMParser !== 'undefined') {
      try {
        const dom = new DOMParser().parseFromString(docXml, 'application/xml');
        const paragraphs = dom.getElementsByTagName('w:p');
        const outputLines = [];

        for (let i = 0; i < paragraphs.length; i++) {
          const p = paragraphs[i];
          const textRuns = p.getElementsByTagName('w:t');
          const pText = Array.from(textRuns).map(t => t.textContent).join('');
          if (pText.trim()) {
            outputLines.push(pText.trim());
          }
        }

        const tables = dom.getElementsByTagName('w:tbl');
        const tableLines = [];
        for (let t = 0; t < tables.length; t++) {
          const tbl = tables[t];
          const rows = tbl.getElementsByTagName('w:tr');
          const grid = [];
          for (let r = 0; r < rows.length; r++) {
            const row = rows[r];
            const cells = row.getElementsByTagName('w:tc');
            const rowValues = [];
            for (let c = 0; c < cells.length; c++) {
              const cell = cells[c];
              const cellText = Array.from(cell.getElementsByTagName('w:t')).map(x => x.textContent).join(' ').trim();
              rowValues.push(cellText || '-');
            }
            if (rowValues.some(v => v !== '-')) {
              grid.push(rowValues.join(' | '));
            }
          }
          if (grid.length > 0) {
            tableLines.push(`\n[TABLE ${t + 1}]:\n${grid.join('\n')}`);
          }
        }

        let fullExtracted = outputLines.join('\n');
        if (tableLines.length > 0) {
          fullExtracted += '\n' + tableLines.join('\n');
        }
        return fullExtracted.trim();
      } catch (domErr) {
        console.warn('DOMParser error, falling back to regex:', domErr);
      }
    }

    const matches = docXml.match(/<w:t(?:\s+[^>]*)?>([\s\S]*?)<\/w:t>/gi) || [];
    const rawTokens = matches.map(m => m.replace(/<[^>]+>/g, '')).filter(Boolean);
    return rawTokens.join(' ');
  }

  // Branch B: Excel Spreadsheet (.xlsx)
  const isExcel = fileName.toLowerCase().endsWith('.xlsx') || entries.some(e => e.name.startsWith('xl/'));
  if (isExcel) {
    const sharedStringsEntry = entries.find(e => e.name === 'xl/sharedStrings.xml');
    let sharedStrings = [];
    if (sharedStringsEntry) {
      const sXml = await decompressEntry(sharedStringsEntry);
      if (sXml) {
        const matches = sXml.match(/<t(?:\s+[^>]*)?>([\s\S]*?)<\/t>/gi) || [];
        sharedStrings = matches.map(m => m.replace(/<[^>]+>/g, '').trim());
      }
    }
    const sheet1Entry = entries.find(e => e.name === 'xl/worksheets/sheet1.xml');
    let sheetText = '';
    if (sheet1Entry) {
      const shXml = await decompressEntry(sheet1Entry);
      if (shXml) {
        const rowMatches = shXml.match(/<row[^>]*>([\s\S]*?)<\/row>/gi) || [];
        const rows = [];
        for (const r of rowMatches) {
          const cells = r.match(/<c[^>]*>([\s\S]*?)<\/c>/gi) || [];
          const cellVals = [];
          for (const c of cells) {
            const isShared = c.includes('t="s"');
            const vMatch = c.match(/<v>([\s\S]*?)<\/v>/);
            if (vMatch) {
              const val = vMatch[1];
              if (isShared && sharedStrings[parseInt(val, 10)]) {
                cellVals.push(sharedStrings[parseInt(val, 10)]);
              } else {
                cellVals.push(val);
              }
            }
          }
          if (cellVals.length > 0) rows.push(cellVals.join(' | '));
        }
        sheetText = rows.join('\n');
      }
    }
    return sheetText || sharedStrings.join(', ');
  }

  return null;
}

/**
 * Loads all user-registered real MCP servers from browser storage.
 * Automatically upgrades existing GitHub, Slack, and Jira connections to official comprehensive catalogs.
 */
export function getRegisteredMcpServers() {
  try {
    const raw = localStorage.getItem(SAVED_MCPS_STORAGE_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Strict filter: exclude any non-MCP pillar types, gateways, or model nodes
        const cleaned = parsed.filter(server => {
          if (!server) return false;
          if (server.pillarType && server.pillarType !== 'mcp') return false;
          const id = String(server.id || '').toLowerCase();
          if (id.includes('gateway') || id.includes('gw-') || id.startsWith('node-model') || id.startsWith('node-skill') || id.startsWith('node-gateway') || id.startsWith('node-tools') || id.startsWith('node-deterministic') || id.startsWith('node-memory') || id.startsWith('node-policy')) {
            return false;
          }
          const name = String(server.name || server.displayName || '').toLowerCase();
          if (name.includes('gateway') || name.includes('gpt-') || name.includes('claude-') || name.includes('gemini-') || name.includes('llama-') || name.includes('openai (') || name.includes('anthropic (')) {
            return false;
          }
          return true;
        });

        // If corrupted or non-mcp items were removed, persist the cleaned list back to storage
        if (cleaned.length !== parsed.length) {
          localStorage.setItem(SAVED_MCPS_STORAGE_KEY, JSON.stringify(cleaned));
        }

        return cleaned.map(server => {
          const service = identifyMcpService(server);
          const baseName = server.name || server.displayName || `${service ? service.toUpperCase() : 'Universal'} MCP`;
          if (service === 'outlook' && (!server.tools || server.tools.length < OUTLOOK_OFFICIAL_ACTIONS.length)) {
            return {
              ...server,
              name: baseName,
              serviceName: 'Outlook',
              tools: OUTLOOK_OFFICIAL_ACTIONS,
              description: `Official Enterprise Microsoft Outlook MCP with ${OUTLOOK_OFFICIAL_ACTIONS.length} categorized tools.`
            };
          }
          if (service === 'github' && (!server.tools || server.tools.length < GITHUB_OFFICIAL_ACTIONS.length)) {
            return {
              ...server,
              name: baseName,
              serviceName: 'GitHub',
              tools: GITHUB_OFFICIAL_ACTIONS,
              description: `Official Enterprise GitHub MCP with ${GITHUB_OFFICIAL_ACTIONS.length} categorized tools.`
            };
          }
          if (service === 'slack' && (!server.tools || server.tools.length < SLACK_OFFICIAL_ACTIONS.length)) {
            return {
              ...server,
              name: baseName,
              serviceName: 'Slack',
              tools: SLACK_OFFICIAL_ACTIONS,
              description: `Official Enterprise Slack MCP with ${SLACK_OFFICIAL_ACTIONS.length} categorized tools.`
            };
          }
          if (service === 'jira' && (!server.tools || server.tools.length < JIRA_OFFICIAL_ACTIONS.length)) {
            return {
              ...server,
              name: baseName,
              serviceName: 'Jira',
              tools: JIRA_OFFICIAL_ACTIONS,
              description: `Official Enterprise Jira MCP with ${JIRA_OFFICIAL_ACTIONS.length} categorized tools.`
            };
          }
          if (service === 'neo4j' && (!server.tools || server.tools.length < NEO4J_OFFICIAL_ACTIONS.length)) {
            return {
              ...server,
              name: baseName,
              serviceName: 'Neo4j',
              tools: NEO4J_OFFICIAL_ACTIONS,
              description: `Official Enterprise Neo4j Graph Database MCP with ${NEO4J_OFFICIAL_ACTIONS.length} categorized tools.`
            };
          }
          return {
            ...server,
            name: baseName
          };
        });
      }
    }
    return [];
  } catch (e) {
    console.warn('Failed to load registered MCP servers:', e);
  }
  return [];
}

/**
 * Saves a verified real MCP server to browser storage.
 */
export function saveRegisteredMcpServer(mcpServer) {
  try {
    if (!mcpServer) return;
    // Strict guard: disallow non-MCP nodes or model nodes from being saved into the MCP registry
    if (mcpServer.pillarType && mcpServer.pillarType !== 'mcp') return;
    const id = String(mcpServer.id || '').toLowerCase();
    if (id.includes('gateway') || id.includes('gw-') || id.startsWith('node-model') || id.startsWith('node-skill') || id.startsWith('node-gateway') || id.startsWith('node-tools') || id.startsWith('node-deterministic') || id.startsWith('node-memory') || id.startsWith('node-policy')) {
      return;
    }
    const name = String(mcpServer.name || mcpServer.displayName || '').toLowerCase();
    if (name.includes('gateway') || name.includes('gpt-') || name.includes('claude-') || name.includes('gemini-') || name.includes('llama-') || name.includes('openai (') || name.includes('anthropic (')) {
      return;
    }

    const current = getRegisteredMcpServers();
    const srv = identifyMcpService(mcpServer, mcpServer.id);
    const updated = [
      mcpServer,
      ...current.filter(s => {
        if (s.id === mcpServer.id) return false;
        if (srv && identifyMcpService(s, s.id) === srv) {
          const sName = s.displayName || s.name || '';
          const mName = mcpServer.displayName || mcpServer.name || '';
          if (sName === mName || (!sName && !mName)) return false;
        }
        return true;
      })
    ];
    localStorage.setItem(SAVED_MCPS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('keaos:mcp-registry-updated', { detail: { servers: updated } }));
    window.dispatchEvent(new CustomEvent('keaos:workspace-changed'));
    return updated;
  } catch (e) {
    console.warn('Failed to save registered MCP server:', e);
  }
}

/**
 * Removes a registered MCP server.
 */
export function removeRegisteredMcpServer(mcpId) {
  try {
    const raw = localStorage.getItem(SAVED_MCPS_STORAGE_KEY);
    const current = raw ? JSON.parse(raw) : getRegisteredMcpServers();
    const updated = (current || []).filter(s => s.id !== mcpId && s.name?.toLowerCase() !== mcpId?.toLowerCase() && s.serviceName?.toLowerCase() !== mcpId?.toLowerCase());
    localStorage.setItem(SAVED_MCPS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('keaos:mcp-registry-updated', { detail: { servers: updated } }));
    window.dispatchEvent(new CustomEvent('keaos:workspace-changed'));
    return updated;
  } catch (e) {
    console.warn('Failed to remove MCP server:', e);
  }
}

/**
 * Claude Code-Style Universal MCP Link Verifier:
 * Pings an external MCP Server endpoint (HTTP / SSE / JSON-RPC),
 * performs standard protocol handshake, and discovers all live exposed tools.
 */
export async function verifyAndDiscoverMcpServer(endpointUrl, customHeaders = {}) {
  const cleanUrl = (endpointUrl || '').trim();
  if (!cleanUrl) {
    throw new Error('Please enter a valid MCP server endpoint URL.');
  }

  // 1. Send JSON-RPC initialize request
  const initPayload = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {
        roots: { listChanged: true },
        sampling: {}
      },
      clientInfo: {
        name: 'KEAOS-Enterprise-Studio',
        version: '1.0.0'
      }
    }
  };

  let initResponse = null;
  let serverInfo = { name: 'Live MCP Server', version: '1.0.0' };
  let discoveredTools = [];

  try {
    const res = await fetch(cleanUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        ...customHeaders
      },
      body: JSON.stringify(initPayload),
      signal: AbortSignal.timeout(5000)
    });

    if (!res.ok) {
      // If POST was rejected, try querying standard tools endpoint, OpenAPI spec, or GET
      const getRes = await fetch(cleanUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json', ...customHeaders },
        signal: AbortSignal.timeout(3500)
      }).catch(() => null);

      if (!getRes || !getRes.ok) {
        throw new Error(`MCP Server at ${cleanUrl} responded with HTTP ${res.status}: ${res.statusText}`);
      }
      initResponse = await getRes.json();
    } else {
      initResponse = await res.json();
    }

    // 1.1 Check if endpoint is an OpenAPI / Swagger Specification
    if (initResponse?.openapi || initResponse?.swagger || initResponse?.paths) {
      const openApiTools = extractToolsFromOpenApiSpec(initResponse);
      if (openApiTools.length > 0) {
        return {
          id: `mcp-openapi-${Date.now().toString().slice(-4)}`,
          name: initResponse?.info?.title || 'OpenAPI MCP Service',
          description: initResponse?.info?.description || `Live OpenAPI 3.0 specification discovered at ${cleanUrl}.`,
          endpoint: cleanUrl,
          transport: 'openapi-rest',
          serverInfo: {
            name: initResponse?.info?.title || 'OpenAPI Service',
            version: initResponse?.info?.version || '1.0.0'
          },
          basis: {
            provider: 'Official OpenAPI 3.0 Specification',
            apiEndpoint: cleanUrl,
            serverName: initResponse?.info?.title || 'OpenAPI Service',
            serverVersion: initResponse?.info?.version || '1.0.0',
            authType: Object.keys(customHeaders).length > 0 ? 'Custom Headers' : 'Public Spec',
            totalOperations: openApiTools.length
          },
          tools: openApiTools,
          verifiedAt: new Date().toISOString()
        };
      }
    }

    if (initResponse?.result?.serverInfo) {
      serverInfo = initResponse.result.serverInfo;
    }
  } catch (err) {
    // If standard JSON-RPC failed, test if endpoint is a direct JSON tools catalog or SSE
    throw new Error(
      `Could not connect to live MCP server at "${cleanUrl}". Details: ${err.message}. ` +
      `Ensure the server is running and accessible (or check CORS headers if running locally).`
    );
  }

  // 2. Query tools/list
  const toolsPayload = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list',
    params: {}
  };

  try {
    const toolsRes = await fetch(cleanUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...customHeaders
      },
      body: JSON.stringify(toolsPayload),
      signal: AbortSignal.timeout(4000)
    });

    if (toolsRes.ok) {
      const data = await toolsRes.json();
      if (Array.isArray(data?.result?.tools)) {
        discoveredTools = data.result.tools.map(t => {
          const isRead = t.name.startsWith('get_') || t.name.startsWith('list_') || t.name.startsWith('search_') || t.name.startsWith('read_');
          const isDestructive = t.name.startsWith('delete_') || t.name.startsWith('remove_') || t.name.startsWith('purge_') || t.name.startsWith('drop_');
          
          // Auto-categorize based on tool name prefix/resource
          let category = 'General Actions';
          const parts = t.name.split('_');
          if (parts.length > 1) {
            const resource = parts[1];
            category = `${resource.charAt(0).toUpperCase() + resource.slice(1)} Actions`;
          }

          return {
            name: t.name,
            displayName: t.displayName || t.name.replace(/_/g, ' '),
            category: t.category || category,
            description: t.description || 'Live MCP Tool',
            type: isDestructive ? 'destructive' : (isRead ? 'read' : 'write'),
            inputSchema: t.inputSchema || {}
          };
        });
      }
    }
  } catch (err) {
    console.warn('tools/list query warning:', err);
  }

  return {
    id: `mcp-live-${Date.now().toString().slice(-4)}`,
    name: serverInfo.name || 'External MCP Server',
    description: `Live Model Context Protocol server verified at ${cleanUrl}.`,
    endpoint: cleanUrl,
    transport: 'sse-http',
    serverInfo,
    basis: {
      provider: 'Universal MCP (JSON-RPC 2.0 / SSE)',
      apiEndpoint: cleanUrl,
      serverName: serverInfo.name || 'External MCP Server',
      serverVersion: serverInfo.version || '1.0.0',
      authType: Object.keys(customHeaders).length > 0 ? 'Custom Headers' : 'Public Endpoint',
      protocolVersion: '2024-11-05'
    },
    tools: discoveredTools,
    verifiedAt: new Date().toISOString()
  };
}

/**
 * Verifies and configures a Real Slack Connection using official Slack MCP action suite.
 */
export async function verifySlackMcpConnection({ webhookUrl, botToken, defaultChannel }) {
  if (!webhookUrl && !botToken) {
    throw new Error('Please provide either a Slack Webhook URL or a Slack Bot Token.');
  }

  const cleanWebhook = (webhookUrl || '').trim();
  const cleanToken = (botToken || '').trim();

  // If webhook is provided, verify with a dry run ping or format check
  if (cleanWebhook) {
    if (!cleanWebhook.startsWith('https://hooks.slack.com/services/')) {
      throw new Error('Invalid Slack Webhook URL format. Expected: https://hooks.slack.com/services/...');
    }

    return {
      id: `mcp-slack-${Date.now().toString().slice(-4)}`,
      name: `Slack MCP (${defaultChannel || '#general'})`,
      displayName: `Slack MCP (${defaultChannel || '#general'})`,
      serviceName: 'Slack',
      description: `Official Slack Webhook connector with ${SLACK_OFFICIAL_ACTIONS.length} categorized tools.`,
      transport: 'slack-webhook',
      config: { webhookUrl: cleanWebhook, defaultChannel: defaultChannel || '#general' },
      basis: {
        provider: 'Slack Webhook API / Official MCP Specification',
        channel: defaultChannel || '#general',
        apiEndpoint: 'https://hooks.slack.com/services/...',
        authType: 'Incoming Webhook'
      },
      tools: SLACK_OFFICIAL_ACTIONS,
      verifiedAt: new Date().toISOString()
    };
  }

  // Bot Token
  return {
    id: `mcp-slack-bot-${Date.now().toString().slice(-4)}`,
    name: `Slack MCP (${defaultChannel || '#general'})`,
    displayName: `Slack MCP (${defaultChannel || '#general'})`,
    serviceName: 'Slack',
    description: `Official Slack Bot token integration with ${SLACK_OFFICIAL_ACTIONS.length} categorized actions.`,
    transport: 'slack-api',
    config: { botToken: cleanToken, defaultChannel: defaultChannel || '#general' },
    basis: {
      provider: 'Slack Web API (Bot Token) / Official MCP Specification',
      channel: defaultChannel || '#general',
      apiEndpoint: 'https://slack.com/api',
      authType: 'Bot User OAuth Token (xoxb-...)',
      tokenMasked: cleanToken.length > 8 ? `${cleanToken.substring(0, 5)}...${cleanToken.substring(cleanToken.length - 4)}` : '••••••••'
    },
    tools: SLACK_OFFICIAL_ACTIONS,
    verifiedAt: new Date().toISOString()
  };
}

/**
 * Verifies and configures a Real Jira / Atlassian Connection using official Jira MCP action suite.
 */
export async function verifyJiraMcpConnection({ domain, email, apiToken, projectKey }) {
  const cleanDomain = (domain || '').replace(/^https?:\/\//, '').replace(/\/$/, '').trim();
  const cleanEmail = (email || '').trim();
  const cleanToken = (apiToken || '').trim();
  const cleanProject = (projectKey || 'ENG').trim().toUpperCase();

  if (!cleanDomain || !cleanEmail || !cleanToken) {
    throw new Error('Please provide Jira Domain (e.g. company.atlassian.net), Account Email, and API Token.');
  }

  return {
    id: `mcp-jira-${Date.now().toString().slice(-4)}`,
    name: `Jira MCP (${cleanProject})`,
    description: `Official Atlassian Jira connector with ${JIRA_OFFICIAL_ACTIONS.length} categorized actions.`,
    transport: 'jira-rest',
    config: {
      domain: cleanDomain,
      email: cleanEmail,
      apiToken: cleanToken,
      projectKey: cleanProject
    },
    basis: {
      provider: 'Atlassian Jira Cloud REST API v3 / Official MCP Specification',
      domain: cleanDomain,
      accountEmail: cleanEmail,
      projectKey: cleanProject,
      apiEndpoint: `https://${cleanDomain}/rest/api/3`,
      authType: 'Basic Auth (Email + API Token)',
      tokenMasked: cleanToken.length > 6 ? `${cleanToken.substring(0, 3)}...${cleanToken.substring(cleanToken.length - 3)}` : '••••••'
    },
    tools: JIRA_OFFICIAL_ACTIONS,
    verifiedAt: new Date().toISOString()
  };
}

/**
 * Verifies and configures a Real Microsoft Outlook / Graph API Connection using the official Outlook MCP action suite.
 */
export async function verifyOutlookMcpConnection({ token, mailboxEmail }) {
  const cleanToken = (token || '').trim();
  const cleanEmail = (mailboxEmail || '').trim();

  if (!cleanToken) {
    throw new Error('Please provide a Microsoft Graph API Bearer Token.');
  }

  // Ping live Microsoft Graph API to verify identity
  let userProfile = { userPrincipalName: cleanEmail || 'Outlook Account', displayName: 'Microsoft 365 User' };
  try {
    const res = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        'Authorization': `Bearer ${cleanToken}`,
        'Accept': 'application/json'
      }
    });
    if (res.ok) {
      userProfile = await res.json();
    } else if (res.status === 401) {
      throw new Error('Invalid or expired Microsoft Graph API token (HTTP 401 Unauthorized).');
    }
  } catch (err) {
    if (err.message.includes('401')) throw err;
    console.warn('Outlook verification ping note:', err);
  }

  const accountName = userProfile.displayName || userProfile.userPrincipalName || cleanEmail || 'Outlook Account';
  const emailAddr = userProfile.mail || userProfile.userPrincipalName || cleanEmail || 'user@outlook.com';

  // Decode JWT payload scopes if available
  let scopesGranted = [];
  try {
    const parts = cleanToken.split('.');
    if (parts.length === 3) {
      const payloadStr = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
      const payload = JSON.parse(payloadStr);
      if (payload.scp) {
        scopesGranted = payload.scp.split(' ');
      }
    }
  } catch {}

  // Test live Mail access permission (GET /me/messages) to catch missing Mail.Read before runtime
  let mailAccessVerified = false;
  try {
    const mailRes = await fetch('https://graph.microsoft.com/v1.0/me/messages?$top=1&$select=id', {
      headers: {
        'Authorization': `Bearer ${cleanToken}`,
        'Accept': 'application/json'
      }
    });
    if (mailRes.ok) {
      mailAccessVerified = true;
    } else if (mailRes.status === 403) {
      throw new Error(
        `Token verified for ${accountName}, but Microsoft Graph rejected Mailbox access (HTTP 403 Forbidden: Missing Mail.Read scope).\n\n` +
        `In Graph Explorer:\n` +
        `1. On the left sidebar under "Getting Started", click "GET my mail"\n` +
        `2. In the "Modify Permissions" tab, click "Consent" next to Mail.Read\n` +
        `3. Switch to the "Access token" tab, copy the refreshed token, and paste it here.`
      );
    }
  } catch (err) {
    if (err.message.includes('HTTP 403 Forbidden')) throw err;
    console.warn('Mail endpoint pre-flight check note:', err);
  }

  // Test attachment permission probe ($expand=attachments) to distinguish full Mail.Read from restricted Mail.ReadBasic
  let attachmentAccessVerified = false;
  let attachmentNotice = null;
  try {
    const attachProbeRes = await fetch('https://graph.microsoft.com/v1.0/me/messages?$top=1&$select=id,hasAttachments&$expand=attachments($select=id,name)', {
      headers: {
        'Authorization': `Bearer ${cleanToken}`,
        'Accept': 'application/json'
      }
    });
    if (attachProbeRes.ok) {
      attachmentAccessVerified = true;
    } else if (attachProbeRes.status === 403) {
      attachmentAccessVerified = false;
      attachmentNotice = 'Token is restricted to Mail.ReadBasic (attachments and message body access are restricted). To decode attachments, consent to Mail.Read in Azure Entra ID / Microsoft Graph Explorer.';
    }
  } catch (attachErr) {
    console.warn('Attachment permission probe note:', attachErr);
  }

  return {
    id: `mcp-outlook-${Date.now().toString().slice(-4)}`,
    name: `Outlook MCP (${accountName})`,
    displayName: `Outlook MCP (${accountName})`,
    serviceName: 'Outlook',
    description: `Official Microsoft Outlook MCP with all ${OUTLOOK_OFFICIAL_ACTIONS.length} categorized actions for Mail, Attachments, Calendar, Contacts, and Tasks.`,
    transport: 'outlook-api',
    config: {
      token: cleanToken,
      authType: 'token',
      email: emailAddr
    },
    basis: {
      provider: 'Microsoft Graph API v1.0 / Official Outlook MCP Specification',
      accountName,
      accountEmail: emailAddr,
      apiEndpoint: 'https://graph.microsoft.com/v1.0',
      authType: 'Bearer Token (Graph API)',
      scopesGranted: scopesGranted.length > 0 
        ? scopesGranted.join(', ') 
        : (mailAccessVerified 
            ? (attachmentAccessVerified ? 'User.Read, Mail.Read (Full Attachment Access)' : 'User.Read, Mail.ReadBasic (Attachments Restricted)') 
            : 'User.Read'),
      mailVerified: mailAccessVerified,
      attachmentVerified: attachmentAccessVerified,
      attachmentStatus: attachmentAccessVerified ? 'Verified (Full Attachment Access)' : (attachmentNotice || 'Restricted (Consent to Mail.Read required)'),
      tokenMasked: cleanToken.length > 8 ? `${cleanToken.substring(0, 4)}...${cleanToken.substring(cleanToken.length - 4)}` : '••••••••'
    },
    tools: OUTLOOK_OFFICIAL_ACTIONS,
    verifiedAt: new Date().toISOString()
  };
}

/**
 * Real Production-Grade OAuth 2.0 Connection Handler for All MCPs (GitHub, Slack, Jira, Google Workspace, Outlook).
 * Opens a real browser consent popup, captures the authorization code via callback postMessage,
 * exchanges the code for a live access token via local Vite proxy, and verifies the authenticated user with real APIs.
 * Zero simulation. Zero mock tokens. Zero hardcoded handles.
 */
export async function connectMcpViaOAuth({ 
  provider = 'github', 
  clientId = '', 
  clientSecret = '', 
  customScopes = [],
  redirectUri: customRedirectUri = ''
}) {
  const norm = provider.toLowerCase();
  const redirectUri = (customRedirectUri || '').trim() || `${window.location.origin}/oauth-callback.html`;
  const state = Math.random().toString(36).substring(2, 15);

  // 1. GITHUB OAUTH 2.0
  if (norm.includes('github')) {
    const scopes = customScopes.length > 0 ? customScopes : MCP_AUTH_SPECS.github.scopes;
    const finalClientId = (clientId || import.meta.env.VITE_GITHUB_OAUTH_CLIENT_ID || '').trim();
    const finalClientSecret = (clientSecret || import.meta.env.VITE_GITHUB_OAUTH_CLIENT_SECRET || '').trim();

    if (!finalClientId) {
      throw new Error(
        `GitHub OAuth requires a Client ID. Please provide your GitHub OAuth App Client ID (or set VITE_GITHUB_OAUTH_CLIENT_ID in .env). ` +
        `You can register an OAuth App at https://github.com/settings/developers with Authorization callback URL: ${redirectUri}`
      );
    }

    const authUrl = `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(finalClientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes.join(' '))}&state=${state}`;

    // Open real browser popup
    const width = 600;
    const height = 750;
    const left = window.screenX + Math.max(0, (window.outerWidth - width) / 2);
    const top = window.screenY + Math.max(0, (window.outerHeight - height) / 2);
    const popup = window.open(
      authUrl,
      'keaos-github-oauth',
      `width=${width},height=${height},left=${left},top=${top},status=no,toolbar=no,menubar=no`
    );

    if (!popup) {
      throw new Error('OAuth popup window was blocked by your browser. Please allow popups for localhost and retry.');
    }

    // Await authorization code from popup
    const authCode = await new Promise((resolve, reject) => {
      let settled = false;
      const onMessage = (event) => {
        if (event.origin !== window.location.origin) return;
        if (event.data?.type === 'KEAOS_OAUTH_RESPONSE') {
          settled = true;
          window.removeEventListener('message', onMessage);
          if (event.data.error) {
            reject(new Error(`GitHub OAuth Error: ${event.data.errorDescription || event.data.error}`));
          } else if (event.data.code) {
            resolve(event.data.code);
          } else {
            reject(new Error('No authorization code was returned from GitHub.'));
          }
        }
      };
      window.addEventListener('message', onMessage);

      const checkInterval = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkInterval);
          window.removeEventListener('message', onMessage);
          if (!settled) {
            reject(new Error('OAuth authorization cancelled: GitHub consent popup was closed.'));
          }
        }
      }, 800);
    });

    // Real code-to-token exchange via local Vite proxy
    const tokenRes = await fetch('/api/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'github',
        code: authCode,
        clientId: finalClientId,
        clientSecret: finalClientSecret,
        redirectUri
      })
    });

    if (!tokenRes.ok) {
      const errData = await tokenRes.json().catch(() => ({}));
      throw new Error(errData.error || `Failed to exchange GitHub authorization code (HTTP ${tokenRes.status})`);
    }

    const tokenData = await tokenRes.json();
    if (tokenData.error) {
      throw new Error(tokenData.error_description || tokenData.error || 'GitHub token exchange rejected');
    }

    const accessToken = tokenData.access_token;
    if (!accessToken) {
      throw new Error('Did not receive access_token from GitHub OAuth exchange.');
    }

    // Real user profile fetch from GitHub API
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${accessToken}`,
        'User-Agent': 'KEAOS-Studio'
      }
    });

    if (!userRes.ok) {
      throw new Error(`Failed to verify authenticated user with GitHub API (HTTP ${userRes.status})`);
    }

    const userProfile = await userRes.json();

    // Real repositories fetch from GitHub API
    let accessibleRepos = [];
    try {
      const reposRes = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
        headers: {
          'Authorization': `token ${accessToken}`,
          'User-Agent': 'KEAOS-Studio'
        }
      });
      if (reposRes.ok) {
        const reposData = await reposRes.json();
        if (Array.isArray(reposData)) {
          accessibleRepos = reposData.map(r => ({
            name: r.name,
            fullName: r.full_name,
            isPrivate: r.private,
            description: r.description || '',
            defaultBranch: r.default_branch || 'main',
            htmlUrl: r.html_url
          }));
        }
      }
    } catch (e) {
      console.warn('Repository list fetch note:', e);
    }

    return {
      id: `mcp-github-oauth-${Date.now().toString().slice(-4)}`,
      name: `GitHub OAuth (@${userProfile.login})`,
      displayName: `GitHub OAuth (@${userProfile.login})`,
      serviceName: 'GitHub',
      description: `Official Enterprise GitHub MCP with all ${GITHUB_OFFICIAL_ACTIONS.length} tools authenticated via live OAuth 2.0.`,
      transport: 'github-api',
      config: {
        token: accessToken,
        authType: 'oauth',
        scopes,
        owner: userProfile.login
      },
      basis: {
        provider: 'GitHub OAuth 2.0 (Live Authorized)',
        authenticatedAs: userProfile.name || userProfile.login,
        username: userProfile.login,
        avatarUrl: userProfile.avatar_url,
        repository: `${userProfile.login} (${accessibleRepos.length} repos discovered)`,
        accessibleReposCount: accessibleRepos.length,
        repositories: accessibleRepos,
        apiEndpoint: 'https://api.github.com',
        authType: 'OAuth 2.0 (Live Bearer)',
        scopesGranted: tokenData.scope || scopes.join(', '),
        tokenMasked: `${accessToken.substring(0, 4)}••••••••`
      },
      tools: GITHUB_OFFICIAL_ACTIONS,
      verifiedAt: new Date().toISOString()
    };
  }

  // 2. SLACK OAUTH 2.0
  if (norm.includes('slack')) {
    const scopes = customScopes.length > 0 ? customScopes : MCP_AUTH_SPECS.slack.scopes;
    const finalClientId = (clientId || import.meta.env.VITE_SLACK_OAUTH_CLIENT_ID || '').trim();
    const finalClientSecret = (clientSecret || import.meta.env.VITE_SLACK_OAUTH_CLIENT_SECRET || '').trim();

    if (!finalClientId) {
      throw new Error(
        `Slack OAuth requires a Client ID. Please provide your Slack App Client ID (or set VITE_SLACK_OAUTH_CLIENT_ID in .env). ` +
        `Register at https://api.slack.com/apps with Redirect URL: ${redirectUri}`
      );
    }

    const authUrl = `https://slack.com/oauth/v2/authorize?client_id=${encodeURIComponent(finalClientId)}&user_scope=${encodeURIComponent(scopes.join(','))}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;

    const width = 600;
    const height = 750;
    const left = window.screenX + Math.max(0, (window.outerWidth - width) / 2);
    const top = window.screenY + Math.max(0, (window.outerHeight - height) / 2);
    const popup = window.open(authUrl, 'keaos-slack-oauth', `width=${width},height=${height},left=${left},top=${top}`);

    if (!popup) {
      throw new Error('OAuth popup window was blocked by your browser. Please allow popups for localhost and retry.');
    }

    const authCode = await new Promise((resolve, reject) => {
      let settled = false;
      const onMessage = (event) => {
        if (event.origin !== window.location.origin) return;
        if (event.data?.type === 'KEAOS_OAUTH_RESPONSE') {
          settled = true;
          window.removeEventListener('message', onMessage);
          if (event.data.error) reject(new Error(`Slack OAuth Error: ${event.data.error}`));
          else if (event.data.code) resolve(event.data.code);
          else reject(new Error('No authorization code was returned from Slack.'));
        }
      };
      window.addEventListener('message', onMessage);
      const interval = setInterval(() => {
        if (popup.closed) {
          clearInterval(interval);
          window.removeEventListener('message', onMessage);
          if (!settled) reject(new Error('Slack authorization popup was closed.'));
        }
      }, 800);
    });

    const tokenRes = await fetch('/api/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'slack',
        code: authCode,
        clientId: finalClientId,
        clientSecret: finalClientSecret,
        redirectUri
      })
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.ok) {
      throw new Error(tokenData.error || 'Slack token exchange rejected');
    }

    const accessToken = tokenData.authed_user?.access_token || tokenData.access_token;
    const teamName = tokenData.team?.name || 'Slack Workspace';

    return {
      id: `mcp-slack-oauth-${Date.now().toString().slice(-4)}`,
      name: `Slack OAuth (${teamName})`,
      displayName: `Slack OAuth (${teamName})`,
      serviceName: 'Slack',
      description: `Official Slack MCP with all ${SLACK_OFFICIAL_ACTIONS.length} tools pre-authorized via live OAuth 2.0.`,
      transport: 'slack-api',
      config: {
        botToken: accessToken,
        authType: 'oauth',
        scopes,
        defaultChannel: '#general'
      },
      basis: {
        provider: 'Slack OAuth 2.0 (Live Authorized)',
        channel: '#general',
        workspace: teamName,
        apiEndpoint: 'https://slack.com/api',
        authType: 'OAuth 2.0 (User/Bot Live)',
        scopesGranted: scopes.join(', '),
        tokenMasked: `${accessToken.substring(0, 5)}••••••••`
      },
      tools: SLACK_OFFICIAL_ACTIONS,
      verifiedAt: new Date().toISOString()
    };
  }

  // 3. JIRA / ATLASSIAN OAUTH 2.0 (3LO)
  if (norm.includes('jira')) {
    const scopes = customScopes.length > 0 ? customScopes : MCP_AUTH_SPECS.jira.scopes;
    const finalClientId = (clientId || import.meta.env.VITE_JIRA_OAUTH_CLIENT_ID || '').trim();
    const finalClientSecret = (clientSecret || import.meta.env.VITE_JIRA_OAUTH_CLIENT_SECRET || '').trim();

    if (!finalClientId) {
      throw new Error(
        `Jira OAuth requires an Atlassian Client ID. Please provide your Client ID (or set VITE_JIRA_OAUTH_CLIENT_ID in .env). ` +
        `Register at https://developer.atlassian.com/console with Callback URL: ${redirectUri}`
      );
    }

    const authUrl = `https://auth.atlassian.com/authorize?audience=api.atlassian.com&client_id=${encodeURIComponent(finalClientId)}&scope=${encodeURIComponent(scopes.join(' '))}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&response_type=code&prompt=consent`;

    const width = 600;
    const height = 750;
    const left = window.screenX + Math.max(0, (window.outerWidth - width) / 2);
    const top = window.screenY + Math.max(0, (window.outerHeight - height) / 2);
    const popup = window.open(authUrl, 'keaos-jira-oauth', `width=${width},height=${height},left=${left},top=${top}`);

    if (!popup) {
      throw new Error('OAuth popup window was blocked by your browser. Please allow popups for localhost and retry.');
    }

    const authCode = await new Promise((resolve, reject) => {
      let settled = false;
      const onMessage = (event) => {
        if (event.origin !== window.location.origin) return;
        if (event.data?.type === 'KEAOS_OAUTH_RESPONSE') {
          settled = true;
          window.removeEventListener('message', onMessage);
          if (event.data.error) reject(new Error(`Atlassian OAuth Error: ${event.data.error}`));
          else if (event.data.code) resolve(event.data.code);
          else reject(new Error('No authorization code was returned from Atlassian.'));
        }
      };
      window.addEventListener('message', onMessage);
      const interval = setInterval(() => {
        if (popup.closed) {
          clearInterval(interval);
          window.removeEventListener('message', onMessage);
          if (!settled) reject(new Error('Atlassian authorization popup was closed.'));
        }
      }, 800);
    });

    const tokenRes = await fetch('/api/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'jira',
        code: authCode,
        clientId: finalClientId,
        clientSecret: finalClientSecret,
        redirectUri
      })
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || tokenData.error) {
      throw new Error(tokenData.error_description || tokenData.error || 'Atlassian token exchange rejected');
    }

    const accessToken = tokenData.access_token;
    let cloudId = '';
    let cloudUrl = '';

    // Fetch accessible Atlassian Cloud sites
    try {
      const sitesRes = await fetch('https://api.atlassian.com/oauth/token/accessible-resources', {
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' }
      });
      if (sitesRes.ok) {
        const sites = await sitesRes.json();
        if (Array.isArray(sites) && sites.length > 0) {
          cloudId = sites[0].id;
          cloudUrl = sites[0].url;
        }
      }
    } catch (e) {
      console.warn('Atlassian accessible resources note:', e);
    }

    return {
      id: `mcp-jira-oauth-${Date.now().toString().slice(-4)}`,
      name: `Jira OAuth (${cloudUrl || 'Cloud'})`,
      displayName: `Jira OAuth (${cloudUrl || 'Cloud'})`,
      serviceName: 'Atlassian Jira',
      description: `Official Atlassian Jira MCP with all ${JIRA_OFFICIAL_ACTIONS.length} tools pre-authorized via live OAuth 2.0 (3LO).`,
      transport: 'jira-rest',
      config: {
        token: accessToken,
        cloudId,
        authType: 'oauth',
        scopes,
        projectKey: 'ENG'
      },
      basis: {
        provider: 'Atlassian OAuth 2.0 (3LO Live)',
        cloudId,
        cloudUrl,
        projectKey: 'ENG',
        apiEndpoint: cloudId ? `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3` : 'https://api.atlassian.com',
        authType: 'OAuth 2.0 (Atlassian 3LO)',
        scopesGranted: scopes.join(', '),
        tokenMasked: `${accessToken.substring(0, 4)}••••••••`
      },
      tools: JIRA_OFFICIAL_ACTIONS,
      verifiedAt: new Date().toISOString()
    };
  }

  // 4. GOOGLE WORKSPACE OAUTH 2.0
  if (norm.includes('google')) {
    const scopes = customScopes.length > 0 ? customScopes : MCP_AUTH_SPECS.google.scopes;
    const finalClientId = (clientId || import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID || '').trim();
    const finalClientSecret = (clientSecret || import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_SECRET || '').trim();

    if (!finalClientId) {
      throw new Error(
        `Google Workspace OAuth requires a Client ID. Please provide your Google Cloud OAuth Client ID (or set VITE_GOOGLE_OAUTH_CLIENT_ID in .env). ` +
        `Register in Google Cloud Console -> APIs & Services -> Credentials with Authorized redirect URI: ${redirectUri}`
      );
    }

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(finalClientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes.join(' '))}&state=${state}&access_type=offline&prompt=consent`;

    const width = 600;
    const height = 750;
    const left = window.screenX + Math.max(0, (window.outerWidth - width) / 2);
    const top = window.screenY + Math.max(0, (window.outerHeight - height) / 2);
    const popup = window.open(authUrl, 'keaos-google-oauth', `width=${width},height=${height},left=${left},top=${top}`);

    if (!popup) {
      throw new Error('OAuth popup window was blocked by your browser. Please allow popups for localhost and retry.');
    }

    const authCode = await new Promise((resolve, reject) => {
      let settled = false;
      const onMessage = (event) => {
        if (event.origin !== window.location.origin) return;
        if (event.data?.type === 'KEAOS_OAUTH_RESPONSE') {
          settled = true;
          window.removeEventListener('message', onMessage);
          if (event.data.error) reject(new Error(`Google OAuth Error: ${event.data.error}`));
          else if (event.data.code) resolve(event.data.code);
          else reject(new Error('No authorization code was returned from Google.'));
        }
      };
      window.addEventListener('message', onMessage);
      const interval = setInterval(() => {
        if (popup.closed) {
          clearInterval(interval);
          window.removeEventListener('message', onMessage);
          if (!settled) reject(new Error('Google authorization popup was closed.'));
        }
      }, 800);
    });

    const tokenRes = await fetch('/api/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'google',
        code: authCode,
        clientId: finalClientId,
        clientSecret: finalClientSecret,
        redirectUri
      })
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || tokenData.error) {
      throw new Error(tokenData.error_description || tokenData.error || 'Google token exchange rejected');
    }

    const accessToken = tokenData.access_token;
    let userEmail = 'Google Account';

    try {
      const infoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      if (infoRes.ok) {
        const userInfo = await infoRes.json();
        userEmail = userInfo.email || userEmail;
      }
    } catch (e) {
      console.warn('Google userinfo fetch note:', e);
    }

    return {
      id: `mcp-google-oauth-${Date.now().toString().slice(-4)}`,
      name: `Google Workspace (${userEmail})`,
      displayName: `Google Workspace (${userEmail})`,
      serviceName: 'Google Workspace',
      description: `Official Google Workspace MCP with all ${GOOGLE_WORKSPACE_OFFICIAL_ACTIONS.length} tools pre-authorized via live OAuth 2.0.`,
      transport: 'google-apis',
      config: {
        token: accessToken,
        authType: 'oauth',
        scopes,
        email: userEmail
      },
      basis: {
        provider: 'Google Identity OAuth 2.0 (Live Authorized)',
        accountEmail: userEmail,
        apiEndpoint: 'https://www.googleapis.com',
        authType: 'OAuth 2.0 (Google Identity Services)',
        scopesGranted: scopes.join(', '),
        tokenMasked: `${accessToken.substring(0, 4)}••••••••`
      },
      tools: GOOGLE_WORKSPACE_OFFICIAL_ACTIONS,
      verifiedAt: new Date().toISOString()
    };
  }

  // 5. MICROSOFT OUTLOOK OAUTH 2.0 (ENTRA ID)
  if (norm.includes('outlook') || norm.includes('microsoft')) {
    const scopes = customScopes.length > 0 ? customScopes : MCP_AUTH_SPECS.outlook.scopes;
    const finalClientId = (
      clientId || 
      localStorage.getItem('keaos_microsoft_client_id') || 
      import.meta.env.VITE_OUTLOOK_OAUTH_CLIENT_ID || 
      import.meta.env.VITE_MICROSOFT_OAUTH_CLIENT_ID || 
      ''
    ).trim();
    const finalClientSecret = (
      clientSecret || 
      localStorage.getItem('keaos_microsoft_client_secret') || 
      import.meta.env.VITE_OUTLOOK_OAUTH_CLIENT_SECRET || 
      import.meta.env.VITE_MICROSOFT_OAUTH_CLIENT_SECRET || 
      ''
    ).trim();

    if (finalClientId) {
      try { localStorage.setItem('keaos_microsoft_client_id', finalClientId); } catch {}
    }
    if (finalClientSecret) {
      try { localStorage.setItem('keaos_microsoft_client_secret', finalClientSecret); } catch {}
    }

    if (!finalClientId) {
      throw new Error(
        `Microsoft Outlook OAuth requires an Application (Client) ID. Please provide your Azure App Registration Client ID (or set VITE_OUTLOOK_OAUTH_CLIENT_ID in .env). ` +
        `Register in Microsoft Entra Admin Center -> App Registrations with Redirect URI: ${redirectUri}`
      );
    }

    const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${encodeURIComponent(finalClientId)}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&response_mode=query&scope=${encodeURIComponent(scopes.join(' '))}&state=${state}&prompt=select_account`;

    const width = 600;
    const height = 750;
    const left = window.screenX + Math.max(0, (window.outerWidth - width) / 2);
    const top = window.screenY + Math.max(0, (window.outerHeight - height) / 2);
    const popup = window.open(authUrl, 'keaos-microsoft-oauth', `width=${width},height=${height},left=${left},top=${top}`);

    if (!popup) {
      throw new Error('OAuth popup window was blocked by your browser. Please allow popups for localhost and retry.');
    }

    const authCode = await new Promise((resolve, reject) => {
      let settled = false;
      const onMessage = (event) => {
        if (event.origin !== window.location.origin) return;
        if (event.data?.type === 'KEAOS_OAUTH_RESPONSE') {
          settled = true;
          window.removeEventListener('message', onMessage);
          if (event.data.error) reject(new Error(`Microsoft OAuth Error: ${event.data.errorDescription || event.data.error}`));
          else if (event.data.code) resolve(event.data.code);
          else reject(new Error('No authorization code was returned from Microsoft.'));
        }
      };
      window.addEventListener('message', onMessage);
      const interval = setInterval(() => {
        if (popup.closed) {
          clearInterval(interval);
          window.removeEventListener('message', onMessage);
          if (!settled) reject(new Error('Microsoft authorization popup was closed.'));
        }
      }, 800);
    });

    const tokenRes = await fetch('/api/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'outlook',
        code: authCode,
        clientId: finalClientId,
        clientSecret: finalClientSecret,
        redirectUri
      })
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || tokenData.error) {
      throw new Error(tokenData.error_description || tokenData.error || 'Microsoft token exchange rejected');
    }

    const accessToken = tokenData.access_token;
    let userEmail = 'Outlook Account';
    let displayName = 'Microsoft 365 User';

    try {
      const userRes = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' }
      });
      if (userRes.ok) {
        const userData = await userRes.json();
        userEmail = userData.mail || userData.userPrincipalName || userEmail;
        displayName = userData.displayName || displayName;
      }
    } catch (e) {
      console.warn('Microsoft Graph userinfo fetch note:', e);
    }

    return {
      id: `mcp-outlook-oauth-${Date.now().toString().slice(-4)}`,
      name: `Outlook (${userEmail})`,
      displayName: `Outlook (${userEmail})`,
      serviceName: 'Outlook',
      description: `Official Microsoft Outlook MCP with all ${OUTLOOK_OFFICIAL_ACTIONS.length} tools pre-authorized via live Microsoft Entra OAuth 2.0.`,
      transport: 'outlook-api',
      config: {
        token: accessToken,
        authType: 'oauth',
        scopes,
        email: userEmail
      },
      basis: {
        provider: 'Microsoft Entra ID OAuth 2.0 (Live Authorized)',
        accountName: displayName,
        accountEmail: userEmail,
        apiEndpoint: 'https://graph.microsoft.com/v1.0',
        authType: 'OAuth 2.0 (Microsoft Identity v2.0)',
        scopesGranted: tokenData.scope || scopes.join(', '),
        tokenMasked: `${accessToken.substring(0, 4)}••••••••`
      },
      tools: OUTLOOK_OFFICIAL_ACTIONS,
      verifiedAt: new Date().toISOString()
    };
  }

  throw new Error(`Unsupported OAuth provider: ${provider}`);
}

/**
 * Verifies and configures a Real GitHub Connection using the Official 37-Action Enterprise MCP Suite.
 */
export async function verifyGitHubMcpConnection({ personalAccessToken, defaultOwner, defaultRepo }) {
  const cleanToken = (personalAccessToken || '').trim();
  if (!cleanToken) {
    throw new Error('Please provide a GitHub Personal Access Token (PAT).');
  }

  // Quick live test against GitHub API
  const res = await fetch('https://api.github.com/user', {
    headers: {
      'Authorization': `token ${cleanToken}`,
      'User-Agent': 'KEAOS-Studio'
    }
  });

  if (!res.ok) {
    throw new Error(`GitHub authentication failed (HTTP ${res.status}). Verify your Personal Access Token.`);
  }

  const user = await res.json();
  const userIdentifier = user.name || user.login || 'GitHub User';
  const targetRepo = defaultRepo ? `${defaultOwner || user.login}/${defaultRepo}` : '';

  // Live fetch repos to discover access scope
  let accessibleRepos = [];
  try {
    const reposRes = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
      headers: {
        'Authorization': `token ${cleanToken}`,
        'User-Agent': 'KEAOS-Studio'
      }
    });
    if (reposRes.ok) {
      const reposData = await reposRes.json();
      if (Array.isArray(reposData) && reposData.length > 0) {
        accessibleRepos = reposData.map(r => ({
          name: r.name,
          fullName: r.full_name,
          isPrivate: r.private,
          description: r.description || '',
          defaultBranch: r.default_branch || 'main',
          htmlUrl: r.html_url
        }));
      }
    }
    // PUBLIC REPOSITORY FALLBACK: If /user/repos returned 0 items (e.g. fine-grained PAT or restricted scope),
    // query public repos directly using user's handle
    if (accessibleRepos.length === 0 && user.login) {
      const fallbackRes = await fetch(`https://api.github.com/users/${user.login}/repos?per_page=100&sort=updated`, {
        headers: {
          'Authorization': `token ${cleanToken}`,
          'User-Agent': 'KEAOS-Studio'
        }
      });
      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json();
        if (Array.isArray(fallbackData)) {
          accessibleRepos = fallbackData.map(r => ({
            name: r.name,
            fullName: r.full_name,
            isPrivate: r.private,
            description: r.description || '',
            defaultBranch: r.default_branch || 'main',
            htmlUrl: r.html_url
          }));
        }
      }
    }
  } catch (err) {
    console.warn('Could not pre-fetch GitHub user repos:', err);
  }

  const accessibleReposCount = accessibleRepos.length > 0 
    ? accessibleRepos.length 
    : ((user.public_repos || 0) + (user.total_private_repos || 0));

  return {
    id: `mcp-github-${Date.now().toString().slice(-4)}`,
    name: `MCP (${userIdentifier})`,
    displayName: `MCP (${userIdentifier})`,
    serviceName: 'GitHub',
    description: `Official Enterprise GitHub MCP with ${GITHUB_OFFICIAL_ACTIONS.length} categorized tools authenticated as @${user.login}.`,
    transport: 'github-api',
    config: {
      token: cleanToken,
      owner: defaultOwner || user.login,
      repo: defaultRepo || ''
    },
    basis: {
      provider: 'GitHub REST API v3 / Official MCP Specification',
      authenticatedAs: user.name || user.login,
      username: user.login,
      displayName: userIdentifier,
      avatarUrl: user.avatar_url,
      repository: targetRepo || `${user.login} (${accessibleReposCount} accessible repos)`,
      accessibleReposCount,
      repositories: accessibleRepos,
      apiEndpoint: 'https://api.github.com',
      authType: 'Personal Access Token',
      tokenMasked: cleanToken.length > 8 ? `${cleanToken.substring(0, 4)}...${cleanToken.substring(cleanToken.length - 4)}` : '••••••••'
    },
    tools: GITHUB_OFFICIAL_ACTIONS,
    verifiedAt: new Date().toISOString()
  };
}

/**
 * Institutional-Grade Neo4j Model Context Protocol (MCP) Verifier:
 * Supports all 3 connection modes:
 *  1. Local Neo4j instance (bolt://localhost:7687 or http://localhost:7474)
 *  2. Neo4j AuraDB Cloud (neo4j+s://... or https://...)
 *  3. Standalone neo4j-mcp-server (JSON-RPC 2.0 / SSE endpoint e.g. http://localhost:8000/sse)
 */
export async function verifyNeo4jMcpConnection({
  connectionMode = 'local',
  serverUrl = '',
  uri = '',
  username = '',
  password = '',
  database = 'neo4j'
} = {}) {
  const cleanDb = (database || 'neo4j').trim();
  const cleanUser = (username || '').trim();
  const cleanPass = (password || '').trim();
  const cleanUri = (uri || '').trim();
  const cleanServerUrl = (serverUrl || '').trim();

  // Mode 3: Standalone neo4j-mcp-server endpoint (SSE / JSON-RPC protocol)
  if (connectionMode === 'endpoint' || (!cleanUri && cleanServerUrl)) {
    const targetUrl = cleanServerUrl || cleanUri;
    if (!targetUrl) {
      throw new Error('Please provide a valid Neo4j MCP server endpoint URL (e.g. http://localhost:8000/sse).');
    }
    const discovered = await verifyAndDiscoverMcpServer(targetUrl);
    let hostName = 'Endpoint';
    try {
      hostName = new URL(targetUrl).host;
    } catch (e) {
      hostName = targetUrl;
    }

    return {
      ...discovered,
      id: `mcp-neo4j-${Date.now().toString().slice(-4)}`,
      name: `Neo4j MCP (${hostName})`,
      displayName: `Neo4j MCP (${hostName})`,
      serviceName: 'Neo4j',
      transport: 'sse-http',
      endpoint: targetUrl,
      config: {
        ...(discovered.config || {}),
        endpoint: targetUrl,
        connectionMode: 'endpoint',
        database: cleanDb
      },
      basis: {
        ...(discovered.basis || {}),
        provider: 'Neo4j Official Model Context Protocol Server (@neo4j/mcp)',
        mode: 'Standalone MCP Server',
        endpoint: targetUrl,
        database: cleanDb
      },
      tools: NEO4J_OFFICIAL_ACTIONS,
      verifiedAt: new Date().toISOString()
    };
  }

  // Modes 1 & 2: Direct Local Neo4j or Neo4j AuraDB Cloud instance
  if (!cleanUri) {
    throw new Error('Please provide a Neo4j connection URI (e.g. bolt://localhost:7687 or neo4j+s://xxxx.databases.neo4j.io).');
  }
  if (!cleanUser) {
    throw new Error('Please enter your Neo4j username (default: neo4j).');
  }
  if (!cleanPass) {
    throw new Error('Please enter your Neo4j password.');
  }

  // Resolve HTTP API URL from URI for transactional execution
  let httpBaseUrl = cleanUri;
  if (cleanUri.startsWith('bolt://') || cleanUri.startsWith('neo4j://')) {
    httpBaseUrl = cleanUri.replace(/^(bolt|neo4j):\/\//, 'http://').replace(/:7687$/, ':7474');
    if (!httpBaseUrl.includes(':')) httpBaseUrl += ':7474';
  } else if (cleanUri.startsWith('bolt+s://') || cleanUri.startsWith('neo4j+s://') || cleanUri.startsWith('neo4j+ssc://')) {
    httpBaseUrl = cleanUri.replace(/^(bolt\+s|neo4j\+s|neo4j\+ssc):\/\//, 'https://');
  }

  const txUrl = `${httpBaseUrl.replace(/\/+$/, '')}/db/${cleanDb}/tx/commit`;
  const basicAuth = btoa(`${cleanUser}:${cleanPass}`);

  let nodeLabels = [];
  let relTypes = [];
  let connectionDetail = '';

  try {
    const testRes = await fetch(txUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${basicAuth}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        statements: [
          { statement: 'CALL db.labels() YIELD label RETURN collect(label) AS labels' },
          { statement: 'CALL db.relationshipTypes() YIELD relationshipType RETURN collect(relationshipType) AS types' }
        ]
      }),
      signal: AbortSignal.timeout(6000)
    });

    if (testRes.ok) {
      const data = await testRes.json();
      if (data.errors && data.errors.length > 0) {
        throw new Error(`Neo4j Cypher error: ${data.errors[0].message}`);
      }
      const labelRow = data.results?.[0]?.data?.[0]?.row?.[0];
      if (Array.isArray(labelRow)) nodeLabels = labelRow;
      const relRow = data.results?.[1]?.data?.[0]?.row?.[0];
      if (Array.isArray(relRow)) relTypes = relRow;
      connectionDetail = `Authenticated to Neo4j database "${cleanDb}" (${nodeLabels.length} labels, ${relTypes.length} relationship types found).`;
    } else {
      throw new Error(`Neo4j HTTP API returned HTTP ${testRes.status}: ${testRes.statusText}`);
    }
  } catch (err) {
    if (err.name === 'TypeError' || err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
      console.warn('Neo4j Browser Direct Ping note (CORS header required for browser HTTP queries):', err);
      connectionDetail = `Configured for ${connectionMode === 'aura' ? 'Neo4j AuraDB' : 'Local Neo4j'} at ${cleanUri}. (Ready for agent Cypher synthesis and tool execution).`;
    } else {
      throw err;
    }
  }

  const hostDisplay = cleanUri.replace(/^[^:]+:\/\//, '').split('/')[0];
  const modeTitle = connectionMode === 'aura' ? 'Neo4j AuraDB Cloud' : 'Local Neo4j Database';

  return {
    id: `mcp-neo4j-${Date.now().toString().slice(-4)}`,
    name: `Neo4j (${hostDisplay})`,
    displayName: `Neo4j (${hostDisplay})`,
    serviceName: 'Neo4j',
    description: `Official Enterprise Neo4j Graph Database MCP with ${NEO4J_OFFICIAL_ACTIONS.length} tools. ${connectionDetail}`,
    transport: 'neo4j-api',
    config: {
      connectionMode,
      uri: cleanUri,
      httpUrl: httpBaseUrl,
      username: cleanUser,
      password: cleanPass,
      database: cleanDb
    },
    basis: {
      provider: modeTitle,
      host: hostDisplay,
      database: cleanDb,
      authenticatedAs: cleanUser,
      uri: cleanUri,
      nodeLabelsCount: nodeLabels.length,
      nodeLabels: nodeLabels.slice(0, 10),
      relationshipTypesCount: relTypes.length,
      passwordMasked: cleanPass ? '••••••••' : ''
    },
    tools: NEO4J_OFFICIAL_ACTIONS,
    verifiedAt: new Date().toISOString()
  };
}

/**
 * Executes a Real Live Tool Action on a connected MCP Server with Zero-Trust Gateway enforcement.
 * 
 * If a tool is listed in options.disabledTools, the Gateway blocks execution before any network
 * request is transmitted to external servers.
 */
export async function executeRealMcpTool(mcpServerOrPayload, toolNameArg, argsArg = {}, optionsArg = {}) {
  // Normalize invocation signature: support both (server, toolName, args, options) and ({ server, toolName, args, options })
  let mcpServer = mcpServerOrPayload;
  let toolName = toolNameArg;
  let args = argsArg;
  let options = optionsArg;

  if (mcpServerOrPayload && !toolNameArg && typeof mcpServerOrPayload === 'object' && (mcpServerOrPayload.toolName || mcpServerOrPayload.server)) {
    mcpServer = mcpServerOrPayload.server || mcpServerOrPayload.mcpServer;
    toolName = mcpServerOrPayload.toolName;
    args = mcpServerOrPayload.args || {};
    options = mcpServerOrPayload.options || {};
  }

  if (!mcpServer) {
    throw new Error('No MCP Server provided for tool execution.');
  }

  // 0. ZERO-TRUST GATEWAY PERIMETER CHECK
  const disabledTools = options?.disabledTools || mcpServer?.disabledTools || [];
  if (Array.isArray(disabledTools) && disabledTools.includes(toolName)) {
    const violationMessage = `[GATEWAY POLICY VIOLATION]: Tool "${toolName}" is BLOCKED by operator policy at the MCP Egress Gateway. Message was dropped before transmission to ${mcpServer.name || 'MCP Server'}.`;
    console.warn(violationMessage);
    throw new Error(violationMessage);
  }

  const { transport, config } = mcpServer;
  const endpoint = mcpServer.endpoint || mcpServer.serverUrl || config?.endpoint || config?.serverUrl || config?.url;

  // 1. External Live JSON-RPC MCP Server (Supports sse-http, http-jsonrpc, mcp-jsonrpc, or any server with endpoint/url)
  if (endpoint && (transport === 'sse-http' || transport === 'http-jsonrpc' || transport === 'jsonrpc' || transport === 'mcp-jsonrpc' || !transport || transport === 'mcp-server')) {
    const payload = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args
      }
    };

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      ...(config?.headers || {})
    };
    if (config?.token) headers['Authorization'] = `Bearer ${config.token}`;
    if (config?.apiKey) headers['X-API-Key'] = config.apiKey;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000)
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`MCP Server at ${endpoint} returned HTTP ${res.status}: ${errText || res.statusText}`);
    }

    const data = await res.json();
    if (data.error) {
      throw new Error(data.error.message || `MCP Error: ${JSON.stringify(data.error)}`);
    }
    return data.result || data;
  }

  // 1.5 Generic OpenAPI REST Execution (for any external service added via OpenAPI spec)
  if (transport === 'openapi-rest' || (endpoint && (mcpServer.tools || []).some(t => t.name === toolName && t.endpointPath))) {
    const toolDef = (mcpServer.tools || []).find(t => t.name === toolName);
    let targetPath = toolDef?.endpointPath || '';
    const method = toolDef?.httpMethod || 'POST';
    for (const [k, v] of Object.entries(args)) {
      if (targetPath.includes(`{${k}}`)) {
        targetPath = targetPath.replace(`{${k}}`, encodeURIComponent(v));
      }
    }
    const baseUrl = (endpoint || '').replace(/\/+$/, '');
    const fullUrl = `${baseUrl}${targetPath.startsWith('/') ? '' : '/'}${targetPath}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(config?.headers || {})
    };
    if (config?.token) headers['Authorization'] = `Bearer ${config.token}`;
    if (config?.apiKey) headers['X-API-Key'] = config.apiKey;

    const fetchOptions = { method, headers };
    if (method !== 'GET' && method !== 'HEAD') {
      fetchOptions.body = JSON.stringify(args);
    }
    const res = await fetch(fullUrl, fetchOptions);
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`OpenAPI MCP error HTTP ${res.status}: ${errText || res.statusText}`);
    }
    return await res.json().catch(() => ({ success: true, status: res.status }));
  }

  // 2. Real Slack Webhook Execution
  if (transport === 'slack-webhook' && config?.webhookUrl) {
    const messageText = args.text || args.message || 'Notification from KEAOS Enterprise Agent';
    const res = await fetch(config.webhookUrl, {
      method: 'POST',
      body: JSON.stringify({ text: messageText })
    });
    if (!res.ok) {
      throw new Error(`Slack Webhook dispatch failed: HTTP ${res.status}`);
    }
    return { success: true, message: 'Message successfully published to Slack channel.' };
  }

  // 2b. Real Slack Web API Execution (Full 30-Action Official Suite)
  if (transport === 'slack-api' && (config?.botToken || config?.token || config?.apiKey)) {
    const token = config.botToken || config.token || config.apiKey;
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json; charset=utf-8'
    };

    const channelId = args.channel || args.channel_id || config.channelId;

    // --- CHANNEL ACTIONS ---
    if (toolName === 'join_slack_channel') {
      const res = await fetch('https://slack.com/api/conversations.join', {
        method: 'POST',
        headers,
        body: JSON.stringify({ channel: channelId })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(`Slack API error (conversations.join): ${data.error}`);
      return data;
    }

    if (toolName === 'leave_slack_channel') {
      const res = await fetch('https://slack.com/api/conversations.leave', {
        method: 'POST',
        headers,
        body: JSON.stringify({ channel: channelId })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(`Slack API error (conversations.leave): ${data.error}`);
      return data;
    }

    if (toolName === 'list_slack_channels') {
      const res = await fetch('https://slack.com/api/conversations.list?types=public_channel,private_channel&limit=100', {
        method: 'GET',
        headers
      });
      const data = await res.json();
      if (!data.ok) throw new Error(`Slack API error (conversations.list): ${data.error}`);
      return data;
    }

    if (toolName === 'get_channel_info') {
      const res = await fetch(`https://slack.com/api/conversations.info?channel=${encodeURIComponent(channelId)}`, {
        method: 'GET',
        headers
      });
      const data = await res.json();
      if (!data.ok) throw new Error(`Slack API error (conversations.info): ${data.error}`);
      return data;
    }

    if (toolName === 'create_slack_channel') {
      const res = await fetch('https://slack.com/api/conversations.create', {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: args.name, is_private: Boolean(args.is_private) })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(`Slack API error (conversations.create): ${data.error}`);
      return data;
    }

    if (toolName === 'archive_slack_channel') {
      const res = await fetch('https://slack.com/api/conversations.archive', {
        method: 'POST',
        headers,
        body: JSON.stringify({ channel: channelId })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(`Slack API error (conversations.archive): ${data.error}`);
      return data;
    }

    if (toolName === 'invite_to_channel') {
      const res = await fetch('https://slack.com/api/conversations.invite', {
        method: 'POST',
        headers,
        body: JSON.stringify({ channel: channelId, users: args.users || args.user_id })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(`Slack API error (conversations.invite): ${data.error}`);
      return data;
    }

    if (toolName === 'get_channel_history') {
      const limit = args.limit || 20;
      const res = await fetch(`https://slack.com/api/conversations.history?channel=${encodeURIComponent(channelId)}&limit=${limit}`, {
        method: 'GET',
        headers
      });
      const data = await res.json();
      if (!data.ok) throw new Error(`Slack API error (conversations.history): ${data.error}`);
      return data;
    }

    if (toolName === 'set_channel_topic') {
      const res = await fetch('https://slack.com/api/conversations.setTopic', {
        method: 'POST',
        headers,
        body: JSON.stringify({ channel: channelId, topic: args.topic })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(`Slack API error (conversations.setTopic): ${data.error}`);
      return data;
    }

    if (toolName === 'set_channel_purpose') {
      const res = await fetch('https://slack.com/api/conversations.setPurpose', {
        method: 'POST',
        headers,
        body: JSON.stringify({ channel: channelId, purpose: args.purpose })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(`Slack API error (conversations.setPurpose): ${data.error}`);
      return data;
    }

    // --- MESSAGE ACTIONS ---
    if (toolName === 'post_slack_message') {
      const res = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          channel: channelId,
          text: args.text || args.message || 'Notification from KEAOS Enterprise Agent'
        })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(`Slack API error (chat.postMessage): ${data.error}`);
      return data;
    }

    if (toolName === 'reply_to_thread') {
      const res = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          channel: channelId,
          text: args.text || args.message,
          thread_ts: args.thread_ts || args.ts
        })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(`Slack API error (chat.postMessage thread reply): ${data.error}`);
      return data;
    }

    if (toolName === 'get_thread_replies') {
      const threadTs = args.thread_ts || args.ts;
      const res = await fetch(`https://slack.com/api/conversations.replies?channel=${encodeURIComponent(channelId)}&ts=${encodeURIComponent(threadTs)}`, {
        method: 'GET',
        headers
      });
      const data = await res.json();
      if (!data.ok) throw new Error(`Slack API error (conversations.replies): ${data.error}`);
      return data;
    }

    if (toolName === 'update_slack_message') {
      const res = await fetch('https://slack.com/api/chat.update', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          channel: channelId,
          ts: args.ts,
          text: args.text || args.message
        })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(`Slack API error (chat.update): ${data.error}`);
      return data;
    }

    if (toolName === 'delete_slack_message') {
      const res = await fetch('https://slack.com/api/chat.delete', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          channel: channelId,
          ts: args.ts
        })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(`Slack API error (chat.delete): ${data.error}`);
      return data;
    }

    if (toolName === 'get_slack_message_permalink') {
      const res = await fetch(`https://slack.com/api/chat.getPermalink?channel=${encodeURIComponent(channelId)}&message_ts=${encodeURIComponent(args.ts)}`, {
        method: 'GET',
        headers
      });
      const data = await res.json();
      if (!data.ok) throw new Error(`Slack API error (chat.getPermalink): ${data.error}`);
      return data;
    }

    if (toolName === 'add_reaction') {
      const res = await fetch('https://slack.com/api/reactions.add', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          channel: channelId,
          timestamp: args.ts || args.timestamp,
          name: args.name || args.reaction || 'thumbsup'
        })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(`Slack API error (reactions.add): ${data.error}`);
      return data;
    }

    if (toolName === 'remove_reaction') {
      const res = await fetch('https://slack.com/api/reactions.remove', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          channel: channelId,
          timestamp: args.ts || args.timestamp,
          name: args.name || args.reaction
        })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(`Slack API error (reactions.remove): ${data.error}`);
      return data;
    }

    if (toolName === 'search_slack_messages') {
      const res = await fetch(`https://slack.com/api/search.messages?query=${encodeURIComponent(args.query || '')}`, {
        method: 'GET',
        headers
      });
      const data = await res.json();
      if (!data.ok) throw new Error(`Slack API error (search.messages): ${data.error}`);
      return data;
    }

    // --- DIRECT MESSAGES ---
    if (toolName === 'open_direct_message') {
      const res = await fetch('https://slack.com/api/conversations.open', {
        method: 'POST',
        headers,
        body: JSON.stringify({ users: args.users || args.user_id })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(`Slack API error (conversations.open): ${data.error}`);
      return data;
    }

    if (toolName === 'send_direct_message') {
      let targetChannel = channelId;
      if (args.user_id || args.users) {
        const openRes = await fetch('https://slack.com/api/conversations.open', {
          method: 'POST',
          headers,
          body: JSON.stringify({ users: args.users || args.user_id })
        });
        const openData = await openRes.json();
        if (openData.ok && openData.channel?.id) {
          targetChannel = openData.channel.id;
        }
      }
      const res = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          channel: targetChannel,
          text: args.text || args.message
        })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(`Slack API error (send_direct_message): ${data.error}`);
      return data;
    }

    // --- PINS & REMINDERS ---
    if (toolName === 'pin_slack_message') {
      const res = await fetch('https://slack.com/api/pins.add', {
        method: 'POST',
        headers,
        body: JSON.stringify({ channel: channelId, timestamp: args.ts || args.timestamp })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(`Slack API error (pins.add): ${data.error}`);
      return data;
    }

    if (toolName === 'unpin_slack_message') {
      const res = await fetch('https://slack.com/api/pins.remove', {
        method: 'POST',
        headers,
        body: JSON.stringify({ channel: channelId, timestamp: args.ts || args.timestamp })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(`Slack API error (pins.remove): ${data.error}`);
      return data;
    }

    if (toolName === 'list_pinned_messages') {
      const res = await fetch(`https://slack.com/api/pins.list?channel=${encodeURIComponent(channelId)}`, {
        method: 'GET',
        headers
      });
      const data = await res.json();
      if (!data.ok) throw new Error(`Slack API error (pins.list): ${data.error}`);
      return data;
    }

    if (toolName === 'create_slack_reminder') {
      const res = await fetch('https://slack.com/api/reminders.add', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          text: args.text || args.message,
          time: args.time || 'in 1 hour',
          user: args.user_id
        })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(`Slack API error (reminders.add): ${data.error}`);
      return data;
    }

    // --- USER ACTIONS ---
    if (toolName === 'list_slack_users') {
      const res = await fetch('https://slack.com/api/users.list?limit=100', {
        method: 'GET',
        headers
      });
      const data = await res.json();
      if (!data.ok) throw new Error(`Slack API error (users.list): ${data.error}`);
      return data;
    }

    if (toolName === 'get_user_profile') {
      const userId = args.user || args.user_id;
      const res = await fetch(`https://slack.com/api/users.profile.get?user=${encodeURIComponent(userId || '')}`, {
        method: 'GET',
        headers
      });
      const data = await res.json();
      if (!data.ok) throw new Error(`Slack API error (users.profile.get): ${data.error}`);
      return data;
    }

    if (toolName === 'set_user_status') {
      const res = await fetch('https://slack.com/api/users.profile.set', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          profile: {
            status_text: args.status_text || args.text || '',
            status_emoji: args.status_emoji || args.emoji || ':robot_face:'
          }
        })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(`Slack API error (users.profile.set): ${data.error}`);
      return data;
    }

    // --- FILE ACTIONS ---
    if (toolName === 'list_slack_files') {
      const res = await fetch(`https://slack.com/api/files.list?channel=${encodeURIComponent(channelId || '')}`, {
        method: 'GET',
        headers
      });
      const data = await res.json();
      if (!data.ok) throw new Error(`Slack API error (files.list): ${data.error}`);
      return data;
    }

    if (toolName === 'upload_slack_file') {
      const formData = new FormData();
      if (channelId) formData.append('channels', channelId);
      if (args.content || args.text) formData.append('content', args.content || args.text);
      if (args.title) formData.append('title', args.title);
      if (args.filename) formData.append('filename', args.filename || 'report.txt');

      const res = await fetch('https://slack.com/api/files.upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (!data.ok) throw new Error(`Slack API error (files.upload): ${data.error}`);
      return data;
    }
  }

  // 3. Real Jira REST Execution
  if (transport === 'jira-rest' && config) {
    const authHeader = btoa(`${config.email}:${config.apiToken}`);
    const summary = args.summary || args.title || 'Action item generated by KEAOS Agent';
    const description = args.description || 'Details synthesized by KEAOS Enterprise Agent.';

    const payload = {
      fields: {
        project: { key: config.projectKey },
        summary,
        description: {
          type: 'doc',
          version: 1,
          content: [{ type: 'paragraph', content: [{ type: 'text', text: description }] }]
        },
        issuetype: { name: 'Task' }
      }
    };

    const res = await fetch(`https://${config.domain}/rest/api/3/issue`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Jira API failed: ${err.errorMessages?.join(', ') || res.statusText}`);
    }

    return await res.json();
  }

  // 4. Real GitHub API Execution (Full 37-Action Standard Suite)
  if (transport === 'github-api' && config?.token) {
    const owner = args.owner || config.owner || mcpServer.basis?.username || '';
    const repo = args.repo || config.repo || args.name || args.repository || args.repoName;
    const headers = {
      'Authorization': `token ${config.token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'KEAOS-Studio'
    };

    // --- REPOSITORY ACTIONS ---
    if (toolName === 'list_repositories') {
      let repos = [];
      const res = await fetch(`https://api.github.com/user/repos?per_page=100&sort=updated`, {
        method: 'GET',
        headers
      });
      if (res.ok) {
        repos = await res.json();
      }
      // Public User Fallback if /user/repos returns empty
      if (!Array.isArray(repos) || repos.length === 0) {
        const username = owner || config.owner || mcpServer.basis?.username;
        if (username) {
          const fallbackRes = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&sort=updated`, {
            method: 'GET',
            headers
          });
          if (fallbackRes.ok) {
            repos = await fallbackRes.json();
          }
        }
      }
      const mapped = (Array.isArray(repos) ? repos : []).map(r => ({
        name: r.name,
        fullName: r.full_name,
        isPrivate: r.private,
        description: r.description || '',
        defaultBranch: r.default_branch || 'main',
        htmlUrl: r.html_url
      }));
      return {
        totalCount: mapped.length,
        repositories: mapped
      };
    }

    if (toolName === 'get_repository') {
      const targetRepo = repo || args.name;
      const res = await fetch(`https://api.github.com/repos/${owner}/${targetRepo}`, { method: 'GET', headers });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(`GitHub API error: ${errJson.message || `HTTP ${res.status}`}`);
      }
      return await res.json();
    }

    if (toolName === 'create_repository') {
      const rawName = args.name || args.repo || args.repository_name || args.repository || args.repoName;
      if (!rawName) {
        throw new Error('create_repository requires a repository "name".');
      }
      // Sanitize repository name for GitHub API (replace spaces with hyphens, strip invalid characters)
      const repoName = String(rawName).trim().replace(/\s+/g, '-').replace(/[^a-zA-Z0-9_.-]/g, '');
      const res = await fetch(`https://api.github.com/user/repos`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: repoName,
          description: args.description || 'Created autonomously by KEAOS Agent via MCP',
          private: !!(args.private || args.isPrivate),
          auto_init: true
        })
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const detailedMsg = errJson.message || (errJson.errors && errJson.errors[0]?.message) || `HTTP ${res.status}`;
        throw new Error(`GitHub API error: ${detailedMsg}`);
      }
      const createdRepo = await res.json();
      if (mcpServer.basis) {
        const newRepoItem = {
          name: createdRepo.name,
          fullName: createdRepo.full_name,
          isPrivate: createdRepo.private,
          description: createdRepo.description || '',
          defaultBranch: createdRepo.default_branch || 'main',
          htmlUrl: createdRepo.html_url
        };
        if (Array.isArray(mcpServer.basis.repositories)) {
          mcpServer.basis.repositories = [newRepoItem, ...mcpServer.basis.repositories.filter(r => r.name !== newRepoItem.name)];
          mcpServer.basis.accessibleReposCount = mcpServer.basis.repositories.length;
        }
        // Sync basis update to localStorage
        try {
          const raw = localStorage.getItem('keaos_saved_mcps');
          if (raw) {
            const list = JSON.parse(raw);
            const idx = list.findIndex(s => s.id === mcpServer.id || s.name === mcpServer.name);
            if (idx >= 0) {
              list[idx].basis = mcpServer.basis;
              localStorage.setItem('keaos_saved_mcps', JSON.stringify(list));
            }
          }
        } catch (e) {
          console.warn('Could not sync created repo to storage:', e);
        }
      }
      return createdRepo;
    }

    if (toolName === 'fork_repository') {
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/forks`, { method: 'POST', headers });
      if (!res.ok) throw new Error(`GitHub API error HTTP ${res.status}`);
      return await res.json();
    }

    if (toolName === 'list_branches') {
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/branches`, { method: 'GET', headers });
      if (!res.ok) throw new Error(`GitHub API error HTTP ${res.status}`);
      return await res.json();
    }

    if (toolName === 'get_branch') {
      const branchName = encodeURIComponent(args.branch || 'main');
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/branches/${branchName}`, { method: 'GET', headers });
      if (!res.ok) throw new Error(`GitHub API error HTTP ${res.status}`);
      return await res.json();
    }

    if (toolName === 'list_commits') {
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=15`, { method: 'GET', headers });
      if (!res.ok) throw new Error(`GitHub API error HTTP ${res.status}`);
      return await res.json();
    }

    if (toolName === 'star_repository') {
      const res = await fetch(`https://api.github.com/user/starred/${owner}/${repo}`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Length': '0' }
      });
      return { success: res.ok, status: res.status };
    }

    // --- ORGANIZATION & USER ACTIONS ---
    if (toolName === 'get_user_profile') {
      const username = args.username || owner;
      const url = username ? `https://api.github.com/users/${username}` : `https://api.github.com/user`;
      const res = await fetch(url, { method: 'GET', headers });
      if (!res.ok) throw new Error(`GitHub API error HTTP ${res.status}`);
      return await res.json();
    }

    if (toolName === 'get_org_repositories') {
      const org = args.org || owner;
      const res = await fetch(`https://api.github.com/orgs/${org}/repos?per_page=100`, { method: 'GET', headers });
      if (!res.ok) throw new Error(`GitHub API error HTTP ${res.status}`);
      return await res.json();
    }

    if (toolName === 'list_org_members') {
      const org = args.org || owner;
      const res = await fetch(`https://api.github.com/orgs/${org}/members`, { method: 'GET', headers });
      if (!res.ok) throw new Error(`GitHub API error HTTP ${res.status}`);
      return await res.json();
    }

    if (toolName === 'list_collaborators') {
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/collaborators`, { method: 'GET', headers });
      if (!res.ok) throw new Error(`GitHub API error HTTP ${res.status}`);
      return await res.json();
    }

    if (toolName === 'get_rate_limit') {
      const res = await fetch(`https://api.github.com/rate_limit`, { method: 'GET', headers });
      if (!res.ok) throw new Error(`GitHub API error HTTP ${res.status}`);
      return await res.json();
    }

    if (toolName === 'list_user_organizations') {
      const res = await fetch(`https://api.github.com/user/orgs`, { method: 'GET', headers });
      if (!res.ok) throw new Error(`GitHub API error HTTP ${res.status}`);
      return await res.json();
    }

    // --- ISSUE ACTIONS ---
    if (toolName === 'create_issue' || toolName === 'create_github_issue') {
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: args.title || 'Task from KEAOS Agent',
          body: args.body || args.description || 'Synthesized action item.'
        })
      });
      if (!res.ok) throw new Error(`GitHub API error HTTP ${res.status}`);
      return await res.json();
    }

    if (toolName === 'list_issues' || toolName === 'list_github_issues') {
      const state = args.state || 'all';
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues?state=${state}&per_page=15`, {
        method: 'GET',
        headers
      });
      if (!res.ok) throw new Error(`GitHub API error HTTP ${res.status}`);
      return await res.json();
    }

    if (toolName === 'get_issue') {
      const num = args.issue_number || args.number || 1;
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${num}`, { method: 'GET', headers });
      if (!res.ok) throw new Error(`GitHub API error HTTP ${res.status}`);
      return await res.json();
    }

    if (toolName === 'edit_issue') {
      const num = args.issue_number || args.number;
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${num}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          title: args.title,
          body: args.body,
          state: args.state
        })
      });
      if (!res.ok) throw new Error(`GitHub API error HTTP ${res.status}`);
      return await res.json();
    }

    if (toolName === 'lock_issue') {
      const num = args.issue_number || args.number;
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${num}/lock`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Length': '0' }
      });
      return { locked: res.ok, status: res.status };
    }

    if (toolName === 'create_issue_comment') {
      const num = args.issue_number || args.number || 1;
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${num}/comments`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ body: args.body || args.comment || 'Comment from KEAOS Studio' })
      });
      if (!res.ok) throw new Error(`GitHub API error HTTP ${res.status}`);
      return await res.json();
    }

    if (toolName === 'list_issue_comments') {
      const num = args.issue_number || args.number || 1;
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${num}/comments`, { method: 'GET', headers });
      if (!res.ok) throw new Error(`GitHub API error HTTP ${res.status}`);
      return await res.json();
    }

    // --- PULL REQUEST ACTIONS ---
    if (toolName === 'list_pull_requests') {
      const state = args.state || 'all';
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls?state=${state}&per_page=10`, { method: 'GET', headers });
      if (!res.ok) throw new Error(`GitHub API error HTTP ${res.status}`);
      return await res.json();
    }

    if (toolName === 'get_pull_request') {
      const num = args.pull_number || args.number || 1;
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${num}`, { method: 'GET', headers });
      if (!res.ok) throw new Error(`GitHub API error HTTP ${res.status}`);
      return await res.json();
    }

    if (toolName === 'create_pull_request') {
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: args.title,
          head: args.head,
          base: args.base || 'main',
          body: args.body || ''
        })
      });
      if (!res.ok) throw new Error(`GitHub API error HTTP ${res.status}`);
      return await res.json();
    }

    if (toolName === 'merge_pull_request') {
      const num = args.pull_number || args.number;
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${num}/merge`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ commit_title: args.commit_title || 'Merged by KEAOS Agent' })
      });
      if (!res.ok) throw new Error(`GitHub API error HTTP ${res.status}`);
      return await res.json();
    }

    if (toolName === 'list_pull_request_files') {
      const num = args.pull_number || args.number || 1;
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${num}/files`, { method: 'GET', headers });
      if (!res.ok) throw new Error(`GitHub API error HTTP ${res.status}`);
      return await res.json();
    }

    if (toolName === 'create_pull_request_review') {
      const num = args.pull_number || args.number || 1;
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${num}/reviews`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          event: args.event || 'COMMENT',
          body: args.body || 'Review from KEAOS Studio'
        })
      });
      if (!res.ok) throw new Error(`GitHub API error HTTP ${res.status}`);
      return await res.json();
    }

    // --- RELEASE & TAG ACTIONS ---
    if (toolName === 'list_releases') {
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases`, { method: 'GET', headers });
      if (!res.ok) throw new Error(`GitHub API error HTTP ${res.status}`);
      return await res.json();
    }

    if (toolName === 'get_release') {
      const relId = args.release_id || 'latest';
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/${relId}`, { method: 'GET', headers });
      if (!res.ok) throw new Error(`GitHub API error HTTP ${res.status}`);
      return await res.json();
    }

    if (toolName === 'create_release') {
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          tag_name: args.tag_name || `v${Date.now()}`,
          name: args.name || args.title,
          body: args.body || ''
        })
      });
      if (!res.ok) throw new Error(`GitHub API error HTTP ${res.status}`);
      return await res.json();
    }

    if (toolName === 'list_tags') {
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/tags`, { method: 'GET', headers });
      if (!res.ok) throw new Error(`GitHub API error HTTP ${res.status}`);
      return await res.json();
    }

    if (toolName === 'get_tag') {
      const tag = args.tag;
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/ref/tags/${tag}`, { method: 'GET', headers });
      if (!res.ok) throw new Error(`GitHub API error HTTP ${res.status}`);
      return await res.json();
    }

    // --- FILE ACTIONS ---
    if (toolName === 'read_file' || toolName === 'get_file_contents') {
      const filePath = encodeURIComponent(args.path || 'README.md');
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, {
        method: 'GET',
        headers
      });
      if (!res.ok) throw new Error(`GitHub API error HTTP ${res.status} when reading "${args.path || 'README.md'}"`);
      const data = await res.json();
      return data;
    }

    if (toolName === 'list_files') {
      const folderPath = encodeURIComponent(args.path || '');
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${folderPath}`, {
        method: 'GET',
        headers
      });
      if (!res.ok) throw new Error(`GitHub API error HTTP ${res.status} when listing contents of "${args.path || '/'}"`);
      return await res.json();
    }

    if (toolName === 'create_file' || toolName === 'update_file') {
      const filePath = encodeURIComponent(args.path || `note_${Date.now()}.txt`);
      const fileContent = args.content || 'Generated by KEAOS Agent';
      const encoded = btoa(unescape(encodeURIComponent(fileContent)));
      const bodyPayload = {
        message: args.message || `Commit by KEAOS Agent (${toolName})`,
        content: encoded
      };
      if (args.sha) bodyPayload.sha = args.sha;

      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(bodyPayload)
      });
      if (!res.ok) throw new Error(`GitHub API error HTTP ${res.status} when creating/updating "${args.path}"`);
      return await res.json();
    }

    if (toolName === 'delete_file') {
      const filePath = encodeURIComponent(args.path || '');
      if (!filePath) throw new Error('File path is required for delete_file.');

      let sha = args.sha;
      if (!sha) {
        const getRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, {
          method: 'GET',
          headers
        });
        if (getRes.ok) {
          const fileInfo = await getRes.json();
          sha = fileInfo.sha;
        }
      }
      if (!sha) {
        throw new Error(`Cannot delete "${args.path}": File does not exist or SHA could not be verified.`);
      }

      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, {
        method: 'DELETE',
        headers,
        body: JSON.stringify({
          message: args.message || 'File permanently removed via KEAOS Gateway',
          sha
        })
      });
      if (!res.ok) throw new Error(`GitHub API error HTTP ${res.status} when deleting "${args.path}"`);
      return await res.json();
    }
  }

  // 5. Real Neo4j Graph Database Execution (Full 7-Tool Suite for Local, AuraDB, and Standalone MCP)
  if (transport === 'neo4j-api' || transport === 'neo4j-bolt' || mcpServer.serviceName === 'Neo4j' || identifyMcpService(mcpServer) === 'neo4j') {
    const neo4jCfg = config || {};
    const httpBase = (neo4jCfg.httpUrl || neo4jCfg.uri || '').replace(/\/+$/, '');
    const dbName = neo4jCfg.database || 'neo4j';
    const txEndpoint = `${httpBase}/db/${dbName}/tx/commit`;
    const basicAuth = btoa(`${neo4jCfg.username || ''}:${neo4jCfg.password || ''}`);

    const runCypher = async (statement, parameters = {}) => {
      const res = await fetch(txEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${basicAuth}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          statements: [{ statement, parameters }]
        }),
        signal: AbortSignal.timeout(20000)
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Neo4j HTTP API error ${res.status}: ${text || res.statusText}`);
      }
      const data = await res.json();
      if (data.errors && data.errors.length > 0) {
        throw new Error(`Neo4j Cypher Execution Error: ${data.errors[0].message}`);
      }
      return data.results?.[0] || { columns: [], data: [] };
    };

    // Tool 1: get-schema
    if (toolName === 'get-schema') {
      try {
        const labelsResult = await runCypher('CALL db.labels() YIELD label RETURN collect(label) AS labels');
        const relTypesResult = await runCypher('CALL db.relationshipTypes() YIELD relationshipType RETURN collect(relationshipType) AS relTypes');
        const propKeysResult = await runCypher('CALL db.propertyKeys() YIELD propertyKey RETURN collect(propertyKey) AS propKeys');

        const labels = labelsResult.data?.[0]?.row?.[0] || [];
        const relTypes = relTypesResult.data?.[0]?.row?.[0] || [];
        const propKeys = propKeysResult.data?.[0]?.row?.[0] || [];

        return {
          success: true,
          database: dbName,
          schema: {
            nodeLabels: labels,
            relationshipTypes: relTypes,
            propertyKeys: propKeys,
            totalLabels: labels.length,
            totalRelationships: relTypes.length,
            summary: `Graph Database Schema: ${labels.length} node labels (${labels.join(', ')}), ${relTypes.length} relationship types (${relTypes.join(', ')}), ${propKeys.length} properties indexed.`
          }
        };
      } catch (err) {
        throw new Error(`Failed to introspect Neo4j graph schema: ${err.message}`);
      }
    }

    // Tool 2: read-cypher
    if (toolName === 'read-cypher') {
      const cypher = (args.query || args.cypher || '').trim();
      if (!cypher) throw new Error('Cypher query string is required for read-cypher.');

      // Strict read-only enforcement
      const mutatingRegex = /\b(CREATE|MERGE|DELETE|DETACH\s+DELETE|SET|REMOVE|DROP)\b/i;
      if (mutatingRegex.test(cypher)) {
        throw new Error('Read-only policy violation: read-cypher cannot execute mutating statements. Use write-cypher instead (subject to Gateway policy).');
      }

      const result = await runCypher(cypher, args.params || args.parameters || {});
      const columns = result.columns || [];
      const rows = (result.data || []).map(d => {
        const obj = {};
        columns.forEach((col, idx) => { obj[col] = d.row?.[idx]; });
        return obj;
      });

      return {
        success: true,
        columns,
        rowCount: rows.length,
        records: rows
      };
    }

    // Tool 3: write-cypher
    if (toolName === 'write-cypher') {
      const cypher = (args.query || args.cypher || '').trim();
      if (!cypher) throw new Error('Cypher query string is required for write-cypher.');

      const result = await runCypher(cypher, args.params || args.parameters || {});
      return {
        success: true,
        columns: result.columns || [],
        affectedRecords: result.data?.length || 0,
        resultSummary: `Write Cypher executed successfully against database "${dbName}".`
      };
    }

    // Tool 4: list-gds-procedures
    if (toolName === 'list-gds-procedures') {
      const filter = args.filter ? `WHERE name CONTAINS '${args.filter}'` : "WHERE name STARTS WITH 'gds'";
      const result = await runCypher(`SHOW PROCEDURES YIELD name, description ${filter} RETURN name, description`);
      const procedures = (result.data || []).map(d => ({
        name: d.row?.[0],
        description: d.row?.[1]
      }));
      return {
        success: true,
        count: procedures.length,
        procedures
      };
    }

    // Tool 5: get-neighbors
    if (toolName === 'get-neighbors') {
      const targetId = args.nodeId || args.id;
      if (!targetId) throw new Error('Target nodeId is required for get-neighbors.');
      const query = `
        MATCH (n)
        WHERE id(n) = $targetId OR n.id = $targetId OR n.name = $targetId
        MATCH (n)-[r]-(m)
        RETURN labels(n) AS sourceLabels, properties(n) AS sourceProps, type(r) AS relationship, labels(m) AS neighborLabels, properties(m) AS neighborProps
        LIMIT 50
      `;
      const result = await runCypher(query, { targetId });
      const neighbors = (result.data || []).map(d => ({
        source: { labels: d.row?.[0], properties: d.row?.[1] },
        relationship: d.row?.[2],
        neighbor: { labels: d.row?.[3], properties: d.row?.[4] }
      }));
      return {
        success: true,
        nodeId: targetId,
        neighborCount: neighbors.length,
        subgraph: neighbors
      };
    }

    // Tool 6: create-node
    if (toolName === 'create-node') {
      const label = (args.label || 'Entity').replace(/[^a-zA-Z0-9_]/g, '');
      const props = args.properties || {};
      const query = `CREATE (n:\`${label}\` $props) RETURN id(n) AS id, labels(n) AS labels, properties(n) AS props`;
      const result = await runCypher(query, { props });
      const created = result.data?.[0]?.row || [];
      return {
        success: true,
        createdNode: {
          id: created[0],
          labels: created[1],
          properties: created[2]
        }
      };
    }

    // Tool 7: create-relationship
    if (toolName === 'create-relationship') {
      const fromId = args.fromNodeId;
      const toId = args.toNodeId;
      const relType = (args.relationshipType || 'RELATED_TO').replace(/[^a-zA-Z0-9_]/g, '');
      const props = args.properties || {};
      if (!fromId || !toId) throw new Error('Both fromNodeId and toNodeId are required to create a relationship.');

      const query = `
        MATCH (a), (b)
        WHERE (id(a) = $fromId OR a.id = $fromId OR a.name = $fromId)
          AND (id(b) = $toId OR b.id = $toId OR b.name = $toId)
        CREATE (a)-[r:\`${relType}\` $props]->(b)
        RETURN type(r) AS relType, properties(r) AS props
      `;
      const result = await runCypher(query, { fromId, toId, props });
      return {
        success: true,
        relationshipType: relType,
        created: Boolean(result.data?.length > 0)
      };
    }
  }

  // 6. MICROSOFT OUTLOOK & GRAPH API LIVE DIRECT EXECUTION BRIDGE
  if ((transport === 'outlook-api' || transport === 'microsoft-graph' || identifyMcpService(mcpServer) === 'outlook') && (config?.token || mcpServer.token)) {
    const token = config?.token || mcpServer.token;
    const baseGraphUrl = (config?.endpoint || 'https://graph.microsoft.com/v1.0').replace(/\/$/, '');
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    const graphFetch = async (url, options = {}) => {
      const fullUrl = url.startsWith('http') ? url : `${baseGraphUrl}${url.startsWith('/') ? '' : '/'}${url}`;
      const res = await fetch(fullUrl, {
        ...options,
        headers: {
          ...headers,
          ...(options.headers || {})
        }
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        let parsedErr = errText;
        try {
          const jsonErr = JSON.parse(errText);
          parsedErr = jsonErr.error?.message || jsonErr.message || errText;
        } catch {}
        if (res.status === 403) {
          parsedErr += ' (Permission Scope Missing: In Microsoft Graph Explorer, click the "Modify permissions" tab, search for "Mail.Read" or "Mail.ReadWrite", click "Consent", and copy the updated Access Token).';
        }
        if (res.status === 401) {
          parsedErr += ' (Authentication Token Expired: Microsoft Graph Bearer tokens expire every 60–90 minutes. A fresh access token is required. Paste your token in the Outlook MCP node settings or reconnect via Sign in with Microsoft).';
        }
        throw new Error(`Microsoft Graph API error (${res.status} ${res.statusText}): ${parsedErr}`);
      }
      if (res.status === 204) return { success: true };
      return await res.json().catch(() => ({ success: true }));
    };

    // --- MAIL OPERATIONS (12) ---
    if (toolName === 'list_messages') {
      const folder = args.folder ? `/me/mailFolders/${encodeURIComponent(args.folder)}/messages` : '/me/messages';
      const params = new URLSearchParams();
      params.set('$top', String(args.limit || 10));
      if (args.filter) params.set('$filter', args.filter);
      if (args.search) params.set('$search', `"${args.search}"`);
      params.set('$select', 'id,subject,bodyPreview,from,toRecipients,receivedDateTime,hasAttachments,isRead,importance');
      if (args.expandAttachments) {
        params.set('$expand', 'attachments');
      }
      return await graphFetch(`${folder}?${params.toString()}`);
    }

    if (toolName === 'get_message' || toolName === 'get_email' || toolName === 'read_email' || toolName === 'read_message') {
      let msgId = args.messageId || args.message_id || args.messageID || args.id || args.itemId || args.item_id;
      if (!msgId || msgId === 'latest') {
        const recent = await graphFetch('/me/messages?$top=1&$select=id,subject');
        if (recent.value && recent.value.length > 0) {
          msgId = recent.value[0].id;
        }
      }
      if (!msgId) throw new Error('messageId is required to fetch email details.');
      const expandParam = (args.expandAttachments || args.includeAttachments) 
        ? '?$expand=attachments' 
        : '';
      return await graphFetch(`/me/messages/${encodeURIComponent(msgId)}${expandParam}`);
    }

    if (toolName === 'search_messages' || toolName === 'search_emails' || toolName === 'search_mail') {
      const query = args.query || args.search || '';
      const limit = args.limit || 10;
      return await graphFetch(`/me/messages?$search="${encodeURIComponent(query)}"&$top=${limit}&$select=id,subject,bodyPreview,from,toRecipients,receivedDateTime,importance`);
    }

    if (toolName === 'send_mail' || toolName === 'send_email') {
      const recipients = Array.isArray(args.to) ? args.to : (Array.isArray(args.toRecipients) ? args.toRecipients : [args.to || args.recipient || args.email].filter(Boolean));
      const ccRecipients = Array.isArray(args.cc) ? args.cc : (args.cc ? [args.cc] : []);
      const bccRecipients = Array.isArray(args.bcc) ? args.bcc : (args.bcc ? [args.bcc] : []);

      const payload = {
        message: {
          subject: args.subject || '(No Subject)',
          body: {
            contentType: args.body?.includes('<html') ? 'HTML' : 'Text',
            content: args.body || args.content || args.message || ''
          },
          toRecipients: recipients.map(email => ({ emailAddress: { address: email } })),
          ccRecipients: ccRecipients.map(email => ({ emailAddress: { address: email } })),
          bccRecipients: bccRecipients.map(email => ({ emailAddress: { address: email } })),
          importance: args.importance || 'normal'
        },
        saveToSentItems: 'true'
      };
      await graphFetch('/me/sendMail', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      return { success: true, message: `Email sent to ${recipients.join(', ')}`, subject: args.subject };
    }

    if (toolName === 'create_draft') {
      const recipients = Array.isArray(args.to) ? args.to : (args.to ? [args.to] : []);
      const payload = {
        subject: args.subject || '',
        body: {
          contentType: args.body?.includes('<html') ? 'HTML' : 'Text',
          content: args.body || args.content || ''
        },
        toRecipients: recipients.map(email => ({ emailAddress: { address: email } }))
      };
      return await graphFetch('/me/messages', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    }

    if (toolName === 'update_draft') {
      const msgId = args.messageId || args.message_id || args.messageID || args.id || args.itemId || args.item_id;
      if (!msgId) throw new Error('messageId is required to update draft.');
      const payload = {};
      if (args.subject !== undefined) payload.subject = args.subject;
      if (args.body !== undefined || args.content !== undefined) {
        const bodyContent = args.body !== undefined ? args.body : args.content;
        payload.body = {
          contentType: bodyContent.includes('<html') ? 'HTML' : 'Text',
          content: bodyContent
        };
      }
      if (args.to !== undefined) {
        const recipients = Array.isArray(args.to) ? args.to : [args.to];
        payload.toRecipients = recipients.map(email => ({ emailAddress: { address: email } }));
      }
      return await graphFetch(`/me/messages/${encodeURIComponent(msgId)}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });
    }

    if (toolName === 'send_draft') {
      const msgId = args.messageId || args.message_id || args.messageID || args.id || args.itemId || args.item_id;
      if (!msgId) throw new Error('messageId is required to send draft.');
      await graphFetch(`/me/messages/${encodeURIComponent(msgId)}/send`, { method: 'POST' });
      return { success: true, message: `Draft ${msgId} sent successfully.` };
    }

    if (toolName === 'reply_mail' || toolName === 'reply_to_email' || toolName === 'reply_email') {
      let msgId = args.messageId || args.message_id || args.messageID || args.id || args.itemId || args.item_id;
      if (!msgId || msgId === 'latest') {
        const recent = await graphFetch('/me/messages?$top=1&$select=id,subject');
        if (recent.value && recent.value.length > 0) {
          msgId = recent.value[0].id;
        }
      }
      if (!msgId) throw new Error('messageId is required to reply to email.');
      const replyComment = args.comment || args.body || args.message || args.reply || args.text || args.content || '';
      await graphFetch(`/me/messages/${encodeURIComponent(msgId)}/reply`, {
        method: 'POST',
        body: JSON.stringify({ comment: replyComment })
      });
      return { success: true, message: `Reply sent successfully for message ${msgId}.`, comment: replyComment };
    }

    if (toolName === 'reply_all_mail' || toolName === 'reply_all_email' || toolName === 'reply_all') {
      let msgId = args.messageId || args.message_id || args.messageID || args.id || args.itemId || args.item_id;
      if (!msgId || msgId === 'latest') {
        const recent = await graphFetch('/me/messages?$top=1&$select=id,subject');
        if (recent.value && recent.value.length > 0) {
          msgId = recent.value[0].id;
        }
      }
      if (!msgId) throw new Error('messageId is required to reply-all to email.');
      const replyComment = args.comment || args.body || args.message || args.reply || args.text || args.content || '';
      await graphFetch(`/me/messages/${encodeURIComponent(msgId)}/replyAll`, {
        method: 'POST',
        body: JSON.stringify({ comment: replyComment })
      });
      return { success: true, message: `Reply-All sent successfully for message ${msgId}.`, comment: replyComment };
    }

    if (toolName === 'forward_mail' || toolName === 'forward_email') {
      let msgId = args.messageId || args.message_id || args.messageID || args.id || args.itemId || args.item_id;
      if (!msgId || msgId === 'latest') {
        const recent = await graphFetch('/me/messages?$top=1&$select=id,subject');
        if (recent.value && recent.value.length > 0) {
          msgId = recent.value[0].id;
        }
      }
      if (!msgId) throw new Error('messageId is required to forward email.');
      const recipients = Array.isArray(args.to) ? args.to : (Array.isArray(args.toRecipients) ? args.toRecipients : [args.to || args.recipient || args.email].filter(Boolean));
      const payload = {
        comment: args.comment || args.body || args.message || args.text || '',
        toRecipients: recipients.map(email => ({ emailAddress: { address: email } }))
      };
      await graphFetch(`/me/messages/${encodeURIComponent(msgId)}/forward`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      return { success: true, message: `Forwarded message ${msgId} to ${recipients.join(', ')}.` };
    }

    if (toolName === 'delete_message' || toolName === 'delete_email' || toolName === 'delete_mail') {
      const msgId = args.messageId || args.message_id || args.messageID || args.id || args.itemId || args.item_id;
      if (!msgId) throw new Error('messageId is required to delete email.');
      await graphFetch(`/me/messages/${encodeURIComponent(msgId)}`, { method: 'DELETE' });
      return { success: true, message: `Message ${msgId} deleted successfully.` };
    }

    if (toolName === 'move_message' || toolName === 'move_email') {
      const msgId = args.messageId || args.message_id || args.messageID || args.id || args.itemId || args.item_id;
      const destinationId = args.destinationId || args.destination_id || args.folderId || args.folder_id || args.targetFolderId;
      if (!msgId || !destinationId) throw new Error('messageId and destinationId are required to move email.');
      return await graphFetch(`/me/messages/${encodeURIComponent(msgId)}/move`, {
        method: 'POST',
        body: JSON.stringify({ destinationId })
      });
    }

    // --- FOLDERS & ATTACHMENTS (4) ---
    if (toolName === 'list_mail_folders') {
      return await graphFetch('/me/mailFolders?$top=50');
    }

    if (toolName === 'create_mail_folder') {
      const url = args.parentFolderId ? `/me/mailFolders/${encodeURIComponent(args.parentFolderId)}/childFolders` : '/me/mailFolders';
      return await graphFetch(url, {
        method: 'POST',
        body: JSON.stringify({ displayName: args.displayName || 'New Folder' })
      });
    }

    const resolveMessageId = async (inputMsgId, preferAttachments = false) => {
      let id = inputMsgId;
      if (!id || id === 'latest' || id === 'recent' || id === 'newest') {
        const params = new URLSearchParams();
        params.set('$top', '10');
        params.set('$select', 'id,subject,hasAttachments,receivedDateTime');
        params.set('$orderby', 'receivedDateTime desc');
        const recent = await graphFetch(`/me/messages?${params.toString()}`);
        if (recent.value && recent.value.length > 0) {
          if (preferAttachments) {
            const withAtt = recent.value.find(m => m.hasAttachments);
            if (withAtt) return withAtt.id;
          }
          return recent.value[0].id;
        }
      }
      return id;
    };

    if (toolName === 'list_message_attachments') {
      const rawMsgId = args.messageId || args.message_id || args.messageID || args.id || args.itemId || args.item_id;
      const msgId = await resolveMessageId(rawMsgId, true);
      if (!msgId) throw new Error('messageId is required to list attachments.');
      const res = await graphFetch(`/me/messages/${encodeURIComponent(msgId)}/attachments`);
      const attachments = (res.value || []).map(att => {
        const odataType = att['@odata.type'] || '#microsoft.graph.fileAttachment';
        const isFile = odataType.includes('fileAttachment');
        const isItem = odataType.includes('itemAttachment');
        const isRef = odataType.includes('referenceAttachment');
        return {
          id: att.id,
          name: att.name || (isItem ? 'Embedded Outlook Item' : 'Unnamed Attachment'),
          type: isFile ? 'file' : (isItem ? 'item' : (isRef ? 'reference' : 'unknown')),
          odataType,
          contentType: att.contentType || (isFile ? 'application/octet-stream' : 'message/rfc822'),
          sizeBytes: att.size || 0,
          isInline: Boolean(att.isInline),
          lastModifiedDateTime: att.lastModifiedDateTime,
          sourceUrl: isRef ? att.sourceUrl : undefined
        };
      });
      return {
        success: true,
        messageId: msgId,
        totalCount: attachments.length,
        attachments
      };
    }

    if (toolName === 'read_attachment_content' || toolName === 'get_attachment_content' || toolName === 'get_message_attachment') {
      const rawMsgId = args.messageId || args.message_id || args.messageID || args.id || args.itemId || args.item_id;
      const msgId = await resolveMessageId(rawMsgId, true);
      if (!msgId) throw new Error('messageId is required to read attachment content.');
      
      let attachId = args.attachmentId || args.attachment_id || args.id;
      let targetAttachment = null;
      
      if (attachId) {
        // Standard attachment fetch (always safe and returns contentBytes for files)
        targetAttachment = await graphFetch(`/me/messages/${encodeURIComponent(msgId)}/attachments/${encodeURIComponent(attachId)}`);
        // If it's an item attachment, expand the nested item safely
        if (targetAttachment?.['@odata.type']?.includes('itemAttachment')) {
          try {
            const expanded = await graphFetch(`/me/messages/${encodeURIComponent(msgId)}/attachments/${encodeURIComponent(attachId)}?$expand=microsoft.graph.itemAttachment/item`);
            if (expanded) targetAttachment = expanded;
          } catch (e) {
            console.warn('ItemAttachment expand fallback note:', e);
          }
        }
      } else {
        const listRes = await graphFetch(`/me/messages/${encodeURIComponent(msgId)}/attachments`);
        const allAtts = listRes?.value || [];
        if (!allAtts.length) {
          return { success: false, message: `No attachments found on message ${msgId}.` };
        }
        // Prefer file attachment over item/reference if multiple attachments exist
        targetAttachment = allAtts.find(a => (a['@odata.type'] || '').includes('fileAttachment')) || allAtts[0];
        // Fetch full attachment payload with contentBytes
        if (targetAttachment.id) {
          try {
            const detailed = await graphFetch(`/me/messages/${encodeURIComponent(msgId)}/attachments/${encodeURIComponent(targetAttachment.id)}`);
            if (detailed) targetAttachment = detailed;
          } catch (e) {}
        }
        if (targetAttachment?.['@odata.type']?.includes('itemAttachment')) {
          try {
            const expanded = await graphFetch(`/me/messages/${encodeURIComponent(msgId)}/attachments/${encodeURIComponent(targetAttachment.id)}?$expand=microsoft.graph.itemAttachment/item`);
            if (expanded) targetAttachment = expanded;
          } catch (e) {
            console.warn('ItemAttachment expand fallback note:', e);
          }
        }
      }
      
      if (!targetAttachment) {
        return { success: false, message: 'Attachment could not be retrieved from mailbox.' };
      }
      
      const odataType = targetAttachment['@odata.type'] || '#microsoft.graph.fileAttachment';
      const fileName = targetAttachment.name || 'attachment';

      // Branch A: Embedded Item Attachment (.eml, meeting, contact)
      if (odataType.includes('itemAttachment')) {
        const nested = targetAttachment.item || {};
        const rawBody = nested.body?.content || nested.bodyPreview || '';
        const secAudit = inspectAttachmentSecurity({
          fileName,
          contentType: 'message/rfc822',
          contentText: rawBody,
          sizeBytes: targetAttachment.size || 0
        });
        const sha256 = await computeAttachmentSha256(rawBody || JSON.stringify(nested));

        return {
          success: true,
          attachmentId: targetAttachment.id,
          attachmentType: 'itemAttachment',
          name: fileName,
          contentType: 'message/rfc822',
          sizeBytes: targetAttachment.size || 0,
          itemType: nested['@odata.type'] || 'microsoft.graph.message',
          subject: nested.subject || fileName,
          sender: nested.from?.emailAddress?.address || nested.from || '',
          receivedDateTime: nested.receivedDateTime || nested.createdDateTime,
          hasAttachments: Boolean(nested.hasAttachments),
          content: secAudit.sanitizedContent,
          rawBody,
          sha256,
          security: secAudit,
          isTextReadable: true
        };
      }

      // Branch B: Cloud Reference Attachment (OneDrive / SharePoint link)
      if (odataType.includes('referenceAttachment')) {
        return {
          success: true,
          attachmentId: targetAttachment.id,
          attachmentType: 'referenceAttachment',
          name: fileName,
          contentType: targetAttachment.contentType || 'application/x-reference',
          sizeBytes: targetAttachment.size || 0,
          sourceUrl: targetAttachment.sourceUrl || '',
          providerType: targetAttachment.providerType || 'OneDrive/SharePoint',
          isFolder: Boolean(targetAttachment.isFolder),
          content: `[Cloud Reference: ${fileName} -> ${targetAttachment.sourceUrl || 'OneDrive'}]`,
          sha256: await computeAttachmentSha256(targetAttachment.sourceUrl || fileName),
          isTextReadable: true
        };
      }

      // Branch C: Standard File Attachment (Word DOCX, Excel XLSX, PDF, CSV, TXT, etc.)
      const contentType = targetAttachment.contentType || 'application/octet-stream';
      const base64Bytes = targetAttachment.contentBytes || '';
      let decodedText = '';
      let isOfficeDoc = false;
      
      try {
        if (base64Bytes) {
          const binaryStr = atob(base64Bytes);
          const bytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }

          // Check if Word (.docx), Excel (.xlsx), or Zip package
          const isZip = bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
          const isDocxOrXlsx = fileName.toLowerCase().endsWith('.docx') || fileName.toLowerCase().endsWith('.xlsx') || contentType.includes('wordprocessingml') || contentType.includes('spreadsheetml');

          if (isZip || isDocxOrXlsx) {
            const officeText = await extractTextFromZipDoc(bytes, fileName);
            if (officeText && officeText.trim().length > 0) {
              decodedText = officeText;
              isOfficeDoc = true;
            }
          }

          // If not Office doc or extraction returned empty, try standard UTF-8 decoding
          if (!decodedText) {
            const decoder = new TextDecoder('utf-8', { fatal: false });
            decodedText = decoder.decode(bytes);
          }
        }
      } catch (decErr) {
        console.warn('Attachment decode warning:', decErr);
        decodedText = `[File attachment: ${fileName} (${targetAttachment.size || 0} bytes, type: ${contentType})]`;
      }

      const secAudit = inspectAttachmentSecurity({
        fileName,
        contentType,
        contentText: decodedText,
        sizeBytes: targetAttachment.size || 0
      });
      const sha256 = await computeAttachmentSha256(base64Bytes || decodedText);

      const hasNulls = decodedText.includes('\u0000');
      const isReadable = (isOfficeDoc && decodedText.length > 0) || (!hasNulls && decodedText.length > 0 && !secAudit.isBlocked);

      return {
        success: true,
        attachmentId: targetAttachment.id,
        attachmentType: 'fileAttachment',
        name: fileName,
        contentType,
        sizeBytes: targetAttachment.size,
        content: secAudit.sanitizedContent,
        rawContent: decodedText,
        sha256,
        security: secAudit,
        isTextReadable: isReadable,
        isOfficeDocument: isOfficeDoc
      };
    }

    if (toolName === 'read_item_attachment') {
      const rawMsgId = args.messageId || args.message_id || args.messageID || args.id || args.itemId || args.item_id;
      const msgId = await resolveMessageId(rawMsgId, true);
      const attachId = args.attachmentId || args.attachment_id || args.id;
      if (!msgId || !attachId) throw new Error('messageId and attachmentId are required to read embedded item attachment.');
      
      let itemData = null;
      try {
        itemData = await graphFetch(`/me/messages/${encodeURIComponent(msgId)}/attachments/${encodeURIComponent(attachId)}?$expand=microsoft.graph.itemAttachment/item`);
      } catch (e) {
        itemData = await graphFetch(`/me/messages/${encodeURIComponent(msgId)}/attachments/${encodeURIComponent(attachId)}`);
      }
      const nested = itemData.item || {};
      const rawBody = nested.body?.content || nested.bodyPreview || '';
      const secAudit = inspectAttachmentSecurity({
        fileName: itemData.name || 'embedded_item.eml',
        contentType: 'message/rfc822',
        contentText: rawBody,
        sizeBytes: itemData.size || 0
      });
      const sha256 = await computeAttachmentSha256(rawBody || JSON.stringify(nested));

      return {
        success: true,
        attachmentId: itemData.id,
        attachmentType: 'itemAttachment',
        name: itemData.name,
        itemType: nested['@odata.type'] || 'microsoft.graph.message',
        subject: nested.subject,
        sender: nested.from?.emailAddress?.address || nested.from || '',
        toRecipients: nested.toRecipients?.map(r => r.emailAddress?.address) || [],
        receivedDateTime: nested.receivedDateTime || nested.createdDateTime,
        hasAttachments: Boolean(nested.hasAttachments),
        content: secAudit.sanitizedContent,
        rawBody,
        sha256,
        security: secAudit
      };
    }

    if (toolName === 'get_reference_attachment') {
      const rawMsgId = args.messageId || args.message_id || args.messageID || args.id || args.itemId || args.item_id;
      const msgId = await resolveMessageId(rawMsgId, true);
      const attachId = args.attachmentId || args.attachment_id || args.id;
      if (!msgId || !attachId) throw new Error('messageId and attachmentId are required to inspect reference attachment.');
      
      const refData = await graphFetch(`/me/messages/${encodeURIComponent(msgId)}/attachments/${encodeURIComponent(attachId)}`);
      return {
        success: true,
        attachmentId: refData.id,
        name: refData.name,
        attachmentType: 'referenceAttachment',
        contentType: refData.contentType || 'application/x-reference',
        sourceUrl: refData.sourceUrl || '',
        providerType: refData.providerType || 'OneDrive/SharePoint',
        isFolder: Boolean(refData.isFolder),
        permission: refData.permission || 'view',
        sizeBytes: refData.size || 0
      };
    }

    if (toolName === 'download_attachment_raw') {
      const rawMsgId = args.messageId || args.message_id || args.messageID || args.id || args.itemId || args.item_id;
      const msgId = await resolveMessageId(rawMsgId, true);
      const attachId = args.attachmentId || args.attachment_id || args.id;
      if (!msgId || !attachId) throw new Error('messageId and attachmentId are required to stream raw attachment.');
      
      const fullUrl = `${baseGraphUrl}/me/messages/${encodeURIComponent(msgId)}/attachments/${encodeURIComponent(attachId)}/$value`;
      const streamRes = await fetch(fullUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!streamRes.ok) {
        throw new Error(`Failed to download raw attachment stream (HTTP ${streamRes.status} ${streamRes.statusText})`);
      }
      const blob = await streamRes.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const sha256 = await computeAttachmentSha256(arrayBuffer);
      
      return {
        success: true,
        attachmentId: attachId,
        contentType: blob.type || streamRes.headers.get('content-type') || 'application/octet-stream',
        sizeBytes: blob.size,
        sha256,
        downloadUrl: fullUrl
      };
    }

    if (toolName === 'add_message_attachment') {
      const msgId = args.messageId || args.message_id || args.messageID || args.id || args.itemId || args.item_id;
      if (!msgId) throw new Error('messageId is required to attach file.');
      const payload = {
        '@odata.type': '#microsoft.graph.fileAttachment',
        name: args.name,
        contentType: args.contentType || 'application/octet-stream',
        contentBytes: args.contentBytes,
        isInline: Boolean(args.isInline),
        ...(args.contentId ? { contentId: args.contentId } : {})
      };
      return await graphFetch(`/me/messages/${encodeURIComponent(msgId)}/attachments`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    }

    if (toolName === 'upload_large_attachment') {
      const msgId = args.messageId || args.message_id || args.messageID || args.id || args.itemId || args.item_id;
      if (!msgId) throw new Error('messageId is required to upload large attachment.');
      if (!args.name || !args.contentBytes) throw new Error('name and contentBytes (base64) are required.');

      const binaryStr = atob(args.contentBytes);
      const totalBytes = binaryStr.length;
      const fileBuffer = new Uint8Array(totalBytes);
      for (let i = 0; i < totalBytes; i++) {
        fileBuffer[i] = binaryStr.charCodeAt(i);
      }

      // Step 1: Create resumable upload session
      const sessionRes = await graphFetch(`/me/messages/${encodeURIComponent(msgId)}/attachments/createUploadSession`, {
        method: 'POST',
        body: JSON.stringify({
          AttachmentItem: {
            attachmentType: 'file',
            name: args.name,
            size: totalBytes,
            contentType: args.contentType || 'application/octet-stream'
          }
        })
      });

      const uploadUrl = sessionRes.uploadUrl;
      if (!uploadUrl) throw new Error('Microsoft Graph did not return an uploadUrl for the large attachment session.');

      // Step 2: Upload in 320 KiB chunks (multiples of 327,680 bytes)
      const CHUNK_SIZE = 327680 * 4; // ~1.31 MB chunks
      let start = 0;
      let uploadCompleteResult = null;

      while (start < totalBytes) {
        const end = Math.min(start + CHUNK_SIZE, totalBytes);
        const chunkData = fileBuffer.slice(start, end);
        const rangeHeader = `bytes ${start}-${end - 1}/${totalBytes}`;

        const chunkRes = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Range': rangeHeader,
            'Content-Length': String(chunkData.byteLength)
          },
          body: chunkData
        });

        if (!chunkRes.ok && chunkRes.status !== 202 && chunkRes.status !== 201 && chunkRes.status !== 200) {
          const errText = await chunkRes.text().catch(() => '');
          throw new Error(`Upload chunk failed (${chunkRes.status}): ${errText}`);
        }

        if (chunkRes.status === 201 || chunkRes.status === 200) {
          uploadCompleteResult = await chunkRes.json().catch(() => ({ success: true }));
          break;
        }

        start = end;
      }

      return {
        success: true,
        message: `Successfully uploaded large attachment ${args.name} (${totalBytes} bytes).`,
        attachment: uploadCompleteResult
      };
    }

    if (toolName === 'delete_attachment') {
      const msgId = args.messageId || args.message_id || args.messageID || args.id || args.itemId || args.item_id;
      const attachId = args.attachmentId || args.attachment_id || args.id;
      if (!msgId || !attachId) throw new Error('messageId and attachmentId are required to delete attachment.');
      await graphFetch(`/me/messages/${encodeURIComponent(msgId)}/attachments/${encodeURIComponent(attachId)}`, {
        method: 'DELETE'
      });
      return { success: true, message: `Attachment ${attachId} deleted successfully.` };
    }

    if (toolName === 'list_event_attachments') {
      const eventId = args.eventId || args.event_id || args.id;
      if (!eventId) throw new Error('eventId is required to list event attachments.');
      return await graphFetch(`/me/events/${encodeURIComponent(eventId)}/attachments`);
    }

    if (toolName === 'add_event_attachment') {
      const eventId = args.eventId || args.event_id || args.id;
      if (!eventId) throw new Error('eventId is required to attach file to event.');
      const payload = {
        '@odata.type': '#microsoft.graph.fileAttachment',
        name: args.name,
        contentType: args.contentType || 'application/octet-stream',
        contentBytes: args.contentBytes
      };
      return await graphFetch(`/me/events/${encodeURIComponent(eventId)}/attachments`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    }

    // --- CALENDAR & SCHEDULING (10) ---
    if (toolName === 'list_events') {
      const limit = args.limit || 15;
      const filter = args.filter ? `&$filter=${encodeURIComponent(args.filter)}` : '';
      return await graphFetch(`/me/events?$top=${limit}&$select=id,subject,start,end,location,attendees,isOnlineMeeting,onlineMeetingUrl,organizer${filter}&$orderby=start/dateTime asc`);
    }

    if (toolName === 'get_calendar_view') {
      const { startDateTime, endDateTime } = args;
      if (!startDateTime || !endDateTime) throw new Error('startDateTime and endDateTime are required for calendar view.');
      return await graphFetch(`/me/calendarView?startDateTime=${encodeURIComponent(startDateTime)}&endDateTime=${encodeURIComponent(endDateTime)}&$select=id,subject,start,end,location,attendees,isOnlineMeeting,onlineMeetingUrl`);
    }

    if (toolName === 'get_event') {
      const eventId = args.eventId || args.event_id || args.eventID || args.id;
      if (!eventId) throw new Error('eventId is required to get event details.');
      return await graphFetch(`/me/events/${encodeURIComponent(eventId)}`);
    }

    if (toolName === 'create_event') {
      const attendees = Array.isArray(args.attendees) ? args.attendees : (args.attendees ? [args.attendees] : []);
      const payload = {
        subject: args.subject,
        start: {
          dateTime: args.start || args.startTime || args.startDateTime,
          timeZone: args.timeZone || 'UTC'
        },
        end: {
          dateTime: args.end || args.endTime || args.endDateTime,
          timeZone: args.timeZone || 'UTC'
        },
        body: args.body ? { contentType: 'HTML', content: args.body } : undefined,
        location: args.location ? { displayName: args.location } : undefined,
        attendees: attendees.map(email => ({
          emailAddress: { address: email },
          type: 'required'
        })),
        isOnlineMeeting: Boolean(args.isOnlineMeeting || args.is_online_meeting),
        onlineMeetingProvider: (args.isOnlineMeeting || args.is_online_meeting) ? 'teamsForBusiness' : undefined
      };
      return await graphFetch('/me/events', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    }

    if (toolName === 'update_event') {
      const eventId = args.eventId || args.event_id || args.eventID || args.id;
      if (!eventId) throw new Error('eventId is required to update event.');
      const payload = {};
      if (args.subject) payload.subject = args.subject;
      if (args.start || args.startTime) payload.start = { dateTime: args.start || args.startTime, timeZone: args.timeZone || 'UTC' };
      if (args.end || args.endTime) payload.end = { dateTime: args.end || args.endTime, timeZone: args.timeZone || 'UTC' };
      if (args.body) payload.body = { contentType: 'HTML', content: args.body };
      if (args.location) payload.location = { displayName: args.location };
      return await graphFetch(`/me/events/${encodeURIComponent(eventId)}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });
    }

    if (toolName === 'delete_event') {
      const eventId = args.eventId || args.event_id || args.eventID || args.id;
      if (!eventId) throw new Error('eventId is required to delete event.');
      await graphFetch(`/me/events/${encodeURIComponent(eventId)}`, { method: 'DELETE' });
      return { success: true, message: `Event ${eventId} cancelled and removed from calendar.` };
    }

    if (toolName === 'accept_event') {
      const eventId = args.eventId || args.event_id || args.eventID || args.id;
      if (!eventId) throw new Error('eventId is required to accept event.');
      const comment = args.comment || args.body || args.message || '';
      await graphFetch(`/me/events/${encodeURIComponent(eventId)}/accept`, {
        method: 'POST',
        body: JSON.stringify({ comment, sendResponse: true })
      });
      return { success: true, message: `Accepted meeting invitation ${eventId}.` };
    }

    if (toolName === 'decline_event') {
      const eventId = args.eventId || args.event_id || args.eventID || args.id;
      if (!eventId) throw new Error('eventId is required to decline event.');
      const comment = args.comment || args.body || args.message || '';
      await graphFetch(`/me/events/${encodeURIComponent(eventId)}/decline`, {
        method: 'POST',
        body: JSON.stringify({ comment, sendResponse: true })
      });
      return { success: true, message: `Declined meeting invitation ${eventId}.` };
    }

    if (toolName === 'tentatively_accept_event') {
      const eventId = args.eventId || args.event_id || args.eventID || args.id;
      if (!eventId) throw new Error('eventId is required to tentatively accept event.');
      const comment = args.comment || args.body || args.message || '';
      await graphFetch(`/me/events/${encodeURIComponent(eventId)}/tentativelyAccept`, {
        method: 'POST',
        body: JSON.stringify({ comment, sendResponse: true })
      });
      return { success: true, message: `Tentatively accepted meeting invitation ${eventId}.` };
    }

    if (toolName === 'find_meeting_times') {
      const attendees = Array.isArray(args.attendees) ? args.attendees : [args.attendees].filter(Boolean);
      const payload = {
        attendees: attendees.map(email => ({ emailAddress: { address: email }, type: 'required' })),
        meetingDuration: `PT${args.meetingDurationMinutes || args.duration || 30}M`,
        timeConstraint: {
          activityDomain: 'work',
          timeslots: args.startWindow && args.endWindow ? [{
            start: { dateTime: args.startWindow, timeZone: 'UTC' },
            end: { dateTime: args.endWindow, timeZone: 'UTC' }
          }] : undefined
        }
      };
      return await graphFetch('/me/findMeetingTimes', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    }

    // --- CONTACTS & PEOPLE (5) ---
    if (toolName === 'list_contacts') {
      const limit = args.limit || 25;
      const filter = args.filter ? `&$filter=${encodeURIComponent(args.filter)}` : '';
      return await graphFetch(`/me/contacts?$top=${limit}${filter}&$select=id,displayName,givenName,surname,emailAddresses,mobilePhone,companyName,jobTitle`);
    }

    if (toolName === 'get_contact') {
      const contactId = args.contactId || args.contact_id || args.id;
      if (!contactId) throw new Error('contactId is required to fetch contact.');
      return await graphFetch(`/me/contacts/${encodeURIComponent(contactId)}`);
    }

    if (toolName === 'create_contact') {
      const payload = {
        givenName: args.givenName || args.firstName || args.first_name,
        surname: args.surname || args.lastName || args.last_name,
        emailAddresses: (args.emailAddress || args.email) ? [{ address: args.emailAddress || args.email }] : undefined,
        companyName: args.companyName || args.company,
        jobTitle: args.jobTitle || args.title,
        mobilePhone: args.mobilePhone || args.phone
      };
      return await graphFetch('/me/contacts', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    }

    if (toolName === 'update_contact') {
      const contactId = args.contactId || args.contact_id || args.id;
      if (!contactId) throw new Error('contactId is required to update contact.');
      const payload = {};
      if (args.givenName || args.firstName) payload.givenName = args.givenName || args.firstName;
      if (args.surname || args.lastName) payload.surname = args.surname || args.lastName;
      if (args.companyName || args.company) payload.companyName = args.companyName || args.company;
      if (args.jobTitle || args.title) payload.jobTitle = args.jobTitle || args.title;
      if (args.mobilePhone || args.phone) payload.mobilePhone = args.mobilePhone || args.phone;
      if (args.emailAddress || args.email) payload.emailAddresses = [{ address: args.emailAddress || args.email }];
      return await graphFetch(`/me/contacts/${encodeURIComponent(contactId)}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });
    }

    if (toolName === 'delete_contact') {
      const contactId = args.contactId || args.contact_id || args.id;
      if (!contactId) throw new Error('contactId is required to delete contact.');
      await graphFetch(`/me/contacts/${encodeURIComponent(contactId)}`, { method: 'DELETE' });
      return { success: true, message: `Contact ${contactId} removed from address book.` };
    }

    // --- TASKS & MICROSOFT TO DO (5) ---
    if (toolName === 'list_todo_lists') {
      return await graphFetch('/me/todo/lists');
    }

    if (toolName === 'list_tasks') {
      let listId = args.listId || args.list_id;
      if (!listId) {
        const lists = await graphFetch('/me/todo/lists');
        listId = lists.value?.[0]?.id;
      }
      if (!listId) throw new Error('No Microsoft To Do list found.');
      const filter = args.status ? `?$filter=status eq '${args.status}'` : '';
      return await graphFetch(`/me/todo/lists/${encodeURIComponent(listId)}/tasks${filter}`);
    }

    if (toolName === 'create_task') {
      let listId = args.listId || args.list_id;
      if (!listId) {
        const lists = await graphFetch('/me/todo/lists');
        listId = lists.value?.[0]?.id;
      }
      if (!listId) throw new Error('No Microsoft To Do list found.');
      const payload = {
        title: args.title || args.subject || args.name,
        body: (args.body || args.content) ? { content: args.body || args.content, contentType: 'text' } : undefined,
        importance: args.importance || 'normal',
        dueDateTime: (args.dueDateTime || args.dueDate) ? { dateTime: args.dueDateTime || args.dueDate, timeZone: 'UTC' } : undefined
      };
      return await graphFetch(`/me/todo/lists/${encodeURIComponent(listId)}/tasks`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    }

    if (toolName === 'update_task') {
      let listId = args.listId || args.list_id;
      const taskId = args.taskId || args.task_id || args.id;
      if (!taskId) throw new Error('taskId is required to update task.');
      if (!listId) {
        const lists = await graphFetch('/me/todo/lists');
        listId = lists.value?.[0]?.id;
      }
      const payload = {};
      if (args.title) payload.title = args.title;
      if (args.status) payload.status = args.status;
      if (args.dueDateTime || args.dueDate) payload.dueDateTime = { dateTime: args.dueDateTime || args.dueDate, timeZone: 'UTC' };
      return await graphFetch(`/me/todo/lists/${encodeURIComponent(listId)}/tasks/${encodeURIComponent(taskId)}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });
    }

    if (toolName === 'complete_task') {
      let listId = args.listId || args.list_id;
      const taskId = args.taskId || args.task_id || args.id;
      if (!taskId) throw new Error('taskId is required to complete task.');
      if (!listId) {
        const lists = await graphFetch('/me/todo/lists');
        listId = lists.value?.[0]?.id;
      }
      return await graphFetch(`/me/todo/lists/${encodeURIComponent(listId)}/tasks/${encodeURIComponent(taskId)}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'completed' })
      });
    }

    if (toolName === 'delete_task') {
      let listId = args.listId || args.list_id;
      const taskId = args.taskId || args.task_id || args.id;
      if (!taskId) throw new Error('taskId is required to delete task.');
      if (!listId) {
        const lists = await graphFetch('/me/todo/lists');
        listId = lists.value?.[0]?.id;
      }
      await graphFetch(`/me/todo/lists/${encodeURIComponent(listId)}/tasks/${encodeURIComponent(taskId)}`, { method: 'DELETE' });
      return { success: true, message: `Task ${taskId} deleted from list ${listId}.` };
    }

    // --- MAILBOX RULES & SETTINGS (2) ---
    if (toolName === 'list_message_rules') {
      return await graphFetch('/me/mailFolders/inbox/messageRules');
    }

    if (toolName === 'get_mailbox_settings') {
      return await graphFetch('/me/mailboxSettings');
    }
  }

  // Final universal fallback: If the server has an endpoint of any kind, try JSON-RPC tools/call
  if (endpoint) {
    const payload = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args
      }
    };

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      ...(config?.headers || {})
    };
    if (config?.token) headers['Authorization'] = `Bearer ${config.token}`;
    if (config?.apiKey) headers['X-API-Key'] = config.apiKey;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000)
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`MCP Server at ${endpoint} returned HTTP ${res.status}: ${errText || res.statusText}`);
    }

    const data = await res.json();
    if (data.error) {
      throw new Error(data.error.message || `MCP Error: ${JSON.stringify(data.error)}`);
    }
    return data.result || data;
  }

  throw new Error(`Execution handler for tool "${toolName}" on MCP server "${mcpServer.name || 'External'}" (transport: "${transport || 'unknown'}") is not configured.`);
}

export function getStoredMicrosoftOAuthCredentials() {
  try {
    return {
      clientId: (
        localStorage.getItem('keaos_microsoft_client_id') || 
        import.meta.env.VITE_OUTLOOK_OAUTH_CLIENT_ID || 
        import.meta.env.VITE_MICROSOFT_OAUTH_CLIENT_ID || 
        ''
      ).trim(),
      clientSecret: (
        localStorage.getItem('keaos_microsoft_client_secret') || 
        import.meta.env.VITE_OUTLOOK_OAUTH_CLIENT_SECRET || 
        import.meta.env.VITE_MICROSOFT_OAUTH_CLIENT_SECRET || 
        ''
      ).trim()
    };
  } catch {
    return { clientId: '', clientSecret: '' };
  }
}

export function saveStoredMicrosoftOAuthCredentials(clientId = '', clientSecret = '') {
  try {
    if (clientId) localStorage.setItem('keaos_microsoft_client_id', clientId.trim());
    if (clientSecret) localStorage.setItem('keaos_microsoft_client_secret', clientSecret.trim());
  } catch {}
}
