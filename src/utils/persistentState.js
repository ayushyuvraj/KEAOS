/**
 * KEAOS Persistent Memory Utility
 * Manages atomic persistence of UI states (theme, sidebar collapse/push/close, summary bar minimization, summary map, inspector)
 * and canvas topology state across browser reloads and sessions.
 */

const UI_STATE_KEY = 'keaos_ui_state';
const CANVAS_STATE_KEY = 'keaos_canvas_state';

export const DEFAULT_UI_STATE = {
  isDarkMode: true,
  isSidebarCollapsed: false,
  isSidebarClosed: false,
  isDrawerExpanded: false,
  showMiniMap: true,
  miniMapPos: { x: 0, y: 0 },
  isInspectorOpen: false,
  isEnforcerActive: true,
  viewMode: 'home',
  isWorkflowLocked: false
};

/**
 * Loads UI State from localStorage with safe defaults.
 */
export function loadUIState() {
  try {
    const raw = localStorage.getItem(UI_STATE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_UI_STATE, ...parsed, isDrawerExpanded: false, isEnforcerActive: true };
    }
  } catch (e) {
    console.warn('Failed to load UI state from localStorage:', e);
  }
  return DEFAULT_UI_STATE;
}

/**
 * Merges and saves partial UI state updates into localStorage.
 */
export function saveUIState(updates) {
  try {
    const current = loadUIState();
    const updated = { ...current, ...updates };
    localStorage.setItem(UI_STATE_KEY, JSON.stringify(updated));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('keaos:workspace-changed'));
    }
    return updated;
  } catch (e) {
    console.warn('Failed to save UI state to localStorage:', e);
  }
}

const CANVAS_VERSION = 'v7_real_mcp_engine';

/**
 * Loads Canvas topology state (nodes, edges, active use case) if saved.
 */
export function loadCanvasState() {
  try {
    const raw = localStorage.getItem(CANVAS_STATE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.version === CANVAS_VERSION && Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) {
        // Sanitize on startup: ensure no zombie executing or generating states persist across reloads
        parsed.nodes = parsed.nodes.map((n, idx) => {
          let updatedData = { ...n.data };
          if (n.type === 'outputNode' || n.type === 'outputNodeV2' || n.type === 'ingestionNode') {
            if (updatedData.status === 'generating') {
              updatedData.status = updatedData.outputContent ? 'ready' : 'idle';
            }
            // By default on reload / refresh, badges must always be in circular badge form
            updatedData.isExpanded = false;
          }
          if (updatedData.isExecuting) {
            updatedData.isExecuting = false;
          }
          let nodeType = n.type;
          if (nodeType === 'tools' || nodeType === 'model' || nodeType === 'skills' || nodeType === 'policies' || nodeType === 'memory' || nodeType === 'mcp' || nodeType === 'gateway') {
            nodeType = 'pillar';
          }
          const safePos = (n.position && typeof n.position.x === 'number' && typeof n.position.y === 'number' && !isNaN(n.position.x) && !isNaN(n.position.y))
            ? n.position
            : { x: 500 + (idx * 40), y: 180 + (idx * 30) };

          return {
            ...n,
            type: nodeType,
            position: safePos,
            data: updatedData
          };
        });

        // Ensure edges are not stuck in animated streaming state upon cold start
        parsed.edges = parsed.edges.map(e => ({
          ...e,
          animated: false
        }));

        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load Canvas state from localStorage:', e);
  }
  return null;
}

/**
 * Saves current Canvas topology to localStorage.
 */
export function saveCanvasState(data) {
  try {
    if (data && Array.isArray(data.nodes)) {
      data.nodes = data.nodes.map((n, idx) => {
        let nodeType = n.type;
        if (nodeType === 'tools' || nodeType === 'model' || nodeType === 'skills' || nodeType === 'policies' || nodeType === 'memory' || nodeType === 'mcp' || nodeType === 'gateway') {
          nodeType = 'pillar';
        }
        return {
          ...n,
          type: nodeType,
          position: (n.position && typeof n.position.x === 'number' && typeof n.position.y === 'number' && !isNaN(n.position.x) && !isNaN(n.position.y))
            ? n.position
            : { x: 500 + (idx * 40), y: 180 + (idx * 30) }
        };
      });
    }
    localStorage.setItem(CANVAS_STATE_KEY, JSON.stringify({ ...data, version: CANVAS_VERSION }));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('keaos:workspace-changed'));
    }
  } catch (e) {
    console.warn('Failed to save Canvas state to localStorage:', e);
  }
}

/**
 * Clears saved Canvas topology to restore default template.
 */
export function clearCanvasState() {
  try {
    localStorage.removeItem(CANVAS_STATE_KEY);
  } catch (e) {
    console.warn('Failed to clear Canvas state from localStorage:', e);
  }
}

const CANVAS_VIEWPORT_PREFIX = 'keaos_canvas_viewport_';
const GLOBAL_VIEWPORT_KEY = 'keaos_canvas_viewport_global';

/**
 * Loads saved Canvas viewport (x, y, zoom) for specific workflow or global fallback.
 */
export function loadCanvasViewport(workflowId) {
  try {
    if (workflowId) {
      const wfRaw = localStorage.getItem(`${CANVAS_VIEWPORT_PREFIX}${workflowId}`);
      if (wfRaw) {
        const parsed = JSON.parse(wfRaw);
        if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number' && typeof parsed?.zoom === 'number') {
          return parsed;
        }
      }
    }
    const globalRaw = localStorage.getItem(GLOBAL_VIEWPORT_KEY);
    if (globalRaw) {
      const parsed = JSON.parse(globalRaw);
      if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number' && typeof parsed?.zoom === 'number') {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load Canvas viewport from localStorage:', e);
  }
  return null;
}

/**
 * Saves Canvas viewport (x, y, zoom) for specific workflow and global fallback.
 */
export function saveCanvasViewport(viewport, workflowId) {
  try {
    if (viewport && typeof viewport.x === 'number' && typeof viewport.y === 'number' && typeof viewport.zoom === 'number') {
      const payload = JSON.stringify(viewport);
      localStorage.setItem(GLOBAL_VIEWPORT_KEY, payload);
      if (workflowId) {
        localStorage.setItem(`${CANVAS_VIEWPORT_PREFIX}${workflowId}`, payload);
      }
    }
  } catch (e) {
    console.warn('Failed to save Canvas viewport to localStorage:', e);
  }
}

