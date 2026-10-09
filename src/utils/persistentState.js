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
  viewMode: 'canvas'
};

/**
 * Loads UI State from localStorage with safe defaults.
 */
export function loadUIState() {
  try {
    const raw = localStorage.getItem(UI_STATE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_UI_STATE, ...parsed };
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
        parsed.nodes = parsed.nodes.map(n => {
          let updatedData = { ...n.data };
          if (n.type === 'outputNode') {
            if (updatedData.status === 'generating') {
              updatedData.status = updatedData.outputContent ? 'ready' : 'idle';
            }
            // By default on reload / refresh, output boxes must always be in circular badge form
            updatedData.isExpanded = false;
          }
          if (updatedData.isExecuting) {
            updatedData.isExecuting = false;
          }
          return {
            ...n,
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
    localStorage.setItem(CANVAS_STATE_KEY, JSON.stringify({ ...data, version: CANVAS_VERSION }));
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
