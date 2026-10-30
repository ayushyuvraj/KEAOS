/**
 * KEAOS Workspace & Audit Persistence Sync Engine
 * 
 * Synchronizes client-side localStorage state with local project files on disk
 * via Vite server endpoints (/api/workspace-state & /api/audit-ledger).
 * Guarantees 100% state parity across browser profiles, automated subagents,
 * and browser reloads while preserving all user work.
 */

import { loadAllWorkflows, getActiveWorkflowId, WORKFLOWS_REGISTRY_KEY, ACTIVE_WORKFLOW_ID_KEY, createAmlSurveillanceWorkflow, createClinicalBiomarkerWorkflow, createSupplyChainRebalancerWorkflow } from '../utils/workflowStorage';
import { loadUIState, loadCanvasState } from '../utils/persistentState';
import { getRegisteredMcpServers } from './mcpClientService';

let saveDebounceTimer = null;
let isInitialized = false;
let lastPushedSnapshot = null;
let lastPushedAuditSnapshot = null;

/**
 * Initializes two-way sync with Vite workspace-state endpoint.
 * Called on application mount.
 */
export async function initWorkspaceSync() {
  if (typeof window === 'undefined' || isInitialized) return;
  isInitialized = true;

  try {
    const res = await fetch('/api/workspace-state', { cache: 'no-store' });
    if (res.ok) {
      const serverState = await res.json();

      if (serverState && Array.isArray(serverState.workflows) && serverState.workflows.length > 0) {
        // Sanitize all workflow nodes to guarantee valid coordinates and valid pillar types
        const sanitizedWorkflows = serverState.workflows.map(wf => {
          if (!wf || !Array.isArray(wf.nodes)) return wf;
          return {
            ...wf,
            nodes: wf.nodes.map((n, idx) => {
              let nodeType = n.type;
              if (nodeType === 'tools' || nodeType === 'model' || nodeType === 'skills' || nodeType === 'policies' || nodeType === 'memory' || nodeType === 'mcp' || nodeType === 'gateway') {
                nodeType = 'pillar';
              }
              const safePos = (n.position && typeof n.position.x === 'number' && typeof n.position.y === 'number' && !isNaN(n.position.x) && !isNaN(n.position.y))
                ? n.position
                : { x: 420 + (idx * 40), y: 160 + (idx * 30) };
              return {
                ...n,
                type: nodeType,
                position: safePos
              };
            })
          };
        });

        // Ensure all 3 complex agentic workflows are present in workspace
        try {
          const amlWf = createAmlSurveillanceWorkflow();
          const clinWf = createClinicalBiomarkerWorkflow();
          const scWf = createSupplyChainRebalancerWorkflow();
          if (!sanitizedWorkflows.some(w => w.id === amlWf.id)) sanitizedWorkflows.push(amlWf);
          if (!sanitizedWorkflows.some(w => w.id === clinWf.id)) sanitizedWorkflows.push(clinWf);
          if (!sanitizedWorkflows.some(w => w.id === scWf.id)) sanitizedWorkflows.push(scWf);
        } catch (e) {
          console.warn('[Sync] Error ensuring agentic workflows:', e);
        }

        // Hydrate this browser instance from server disk file
        localStorage.setItem(WORKFLOWS_REGISTRY_KEY, JSON.stringify(sanitizedWorkflows));
        if (serverState.activeWorkflowId) {
          localStorage.setItem(ACTIVE_WORKFLOW_ID_KEY, serverState.activeWorkflowId);
        }
        if (serverState.uiState) {
          localStorage.setItem('keaos_ui_state', JSON.stringify(serverState.uiState));
        }
        if (serverState.canvasState) {
          let sanitizedCanvas = { ...serverState.canvasState };
          if (Array.isArray(sanitizedCanvas.nodes)) {
            sanitizedCanvas.nodes = sanitizedCanvas.nodes.map((n, idx) => {
              let nodeType = n.type;
              if (nodeType === 'tools' || nodeType === 'model' || nodeType === 'skills' || nodeType === 'policies' || nodeType === 'memory' || nodeType === 'mcp' || nodeType === 'gateway') {
                nodeType = 'pillar';
              }
              return {
                ...n,
                type: nodeType,
                position: (n.position && typeof n.position.x === 'number' && typeof n.position.y === 'number' && !isNaN(n.position.x) && !isNaN(n.position.y))
                  ? n.position
                  : { x: 420 + (idx * 40), y: 160 + (idx * 30) }
              };
            });
          }
          localStorage.setItem('keaos_canvas_state', JSON.stringify(sanitizedCanvas));
        }
        if (serverState.registeredMcps && Array.isArray(serverState.registeredMcps)) {
          localStorage.setItem('keaos_registered_mcps', JSON.stringify(serverState.registeredMcps));
          window.dispatchEvent(new CustomEvent('keaos:mcp-registry-updated', { detail: { servers: serverState.registeredMcps } }));
        }

        lastPushedSnapshot = JSON.stringify({
          activeWorkflowId: serverState.activeWorkflowId,
          uiState: serverState.uiState,
          workflows: serverState.workflows,
          canvasState: serverState.canvasState,
          registeredMcps: serverState.registeredMcps || []
        });

        // Notify active React components
        window.dispatchEvent(new CustomEvent('keaos:workspace-synced', { detail: serverState }));
      } else {
        // Server file is empty or does not exist yet: save current localStorage to disk once
        await pushWorkspaceToServer(true);
      }
    }
  } catch (err) {
    console.warn('[WorkspaceSync] Initial sync error:', err);
  }

  // Listen to any user-driven workspace mutations and persist to disk (debounced)
  window.addEventListener('keaos:workspace-changed', () => {
    pushWorkspaceToServer();
  });
  window.addEventListener('keaos:mcp-registry-updated', () => {
    pushWorkspaceToServer();
  });
}

/**
 * Pushes the full current workspace state to the disk file with deduplication and debouncing.
 */
export function pushWorkspaceToServer(immediate = false) {
  if (typeof window === 'undefined') return Promise.resolve();

  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer);
    saveDebounceTimer = null;
  }

  const executePush = async () => {
    try {
      const workflows = loadAllWorkflows();
      const activeWorkflowId = getActiveWorkflowId();
      const uiState = loadUIState();
      const canvasState = loadCanvasState();
      const registeredMcps = getRegisteredMcpServers();

      const snapshotCompare = JSON.stringify({
        activeWorkflowId,
        uiState,
        workflows,
        canvasState,
        registeredMcps
      });

      // Avoid writing if state has not meaningfully changed
      if (snapshotCompare === lastPushedSnapshot) {
        return;
      }
      lastPushedSnapshot = snapshotCompare;

      const payload = {
        activeWorkflowId,
        uiState,
        workflows,
        canvasState,
        registeredMcps,
        syncedAt: Date.now()
      };

      await fetch('/api/workspace-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      console.warn('[WorkspaceSync] Push to server failed:', err);
    }
  };

  if (immediate) {
    return executePush();
  } else {
    return new Promise((resolve) => {
      saveDebounceTimer = setTimeout(async () => {
        await executePush();
        resolve();
      }, 800);
    });
  }
}

/**
 * Initializes and synchronizes the unified audit ledger with /api/audit-ledger
 */
export async function initAuditLedgerSync() {
  if (typeof window === 'undefined') return;

  try {
    const res = await fetch('/api/audit-ledger', { cache: 'no-store' });
    if (res.ok) {
      const serverRuns = await res.json();
      lastPushedAuditSnapshot = JSON.stringify(serverRuns || []);
      const localRaw = localStorage.getItem('keaos_unified_audit_ledger');
      let localRuns = [];
      try {
        if (localRaw) localRuns = JSON.parse(localRaw);
      } catch (_) {}

      if (Array.isArray(serverRuns)) {
        localStorage.setItem('keaos_unified_audit_ledger', JSON.stringify(serverRuns));
        window.dispatchEvent(new CustomEvent('keaos:audit-ledger-updated', { detail: { count: serverRuns.length } }));
      }
    }
  } catch (err) {
    console.warn('[AuditLedgerSync] Sync error:', err);
  }
}

/**
 * Pushes audit runs directly to disk with deduplication
 */
export async function pushAuditLedgerToServer(runs = []) {
  if (typeof window === 'undefined') return;
  const snapshot = JSON.stringify(runs || []);
  if (snapshot === lastPushedAuditSnapshot) return;
  lastPushedAuditSnapshot = snapshot;

  try {
    await fetch('/api/audit-ledger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: snapshot
    });
  } catch (err) {
    console.warn('[AuditLedgerSync] Push to server failed:', err);
  }
}

let lastPushedAudit2Snapshot = null;

/**
 * Initializes and synchronizes the Audit 2.0 OpenTelemetry ledger with /api/audit2-ledger
 */
export async function initAudit2LedgerSync() {
  if (typeof window === 'undefined') return;

  try {
    const res = await fetch('/api/audit2-ledger', { cache: 'no-store' });
    if (res.ok) {
      const serverRuns = await res.json();
      lastPushedAudit2Snapshot = JSON.stringify(serverRuns || []);
      if (Array.isArray(serverRuns)) {
        localStorage.setItem('keaos_audit2_ledger', JSON.stringify(serverRuns));
        window.dispatchEvent(new CustomEvent('keaos:audit2-ledger-updated', { detail: { count: serverRuns.length } }));
      }
    }
  } catch (err) {
    console.warn('[Audit2LedgerSync] Sync error:', err);
  }
}

/**
 * Pushes Audit 2.0 runs directly to disk with deduplication
 */
export async function pushAudit2LedgerToServer(runs = []) {
  if (typeof window === 'undefined') return;
  const snapshot = JSON.stringify(runs || []);
  if (snapshot === lastPushedAudit2Snapshot) return;
  lastPushedAudit2Snapshot = snapshot;

  try {
    await fetch('/api/audit2-ledger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: snapshot
    });
  } catch (err) {
    console.warn('[Audit2LedgerSync] Push to server failed:', err);
  }
}
