/**
 * KEAOS Multi-Workflow Storage Engine
 * Manages atomic persistence of enterprise agent workflows,
 * supporting blank canvas genesis, cloning, inline renaming,
 * JSON export/import, search indexing, and auto-save synchronizer.
 */

import { FRAMEWORKS } from '../constants/frameworks';
import { loadCanvasState } from './persistentState';

export const WORKFLOWS_REGISTRY_KEY = 'keaos_workflows_registry';
export const ACTIVE_WORKFLOW_ID_KEY = 'keaos_active_workflow_id';

/**
 * Computes architectural topology stats from graph nodes.
 */
export function computeWorkflowStats(nodes = []) {
  let agentCount = 0;
  let mcpCount = 0;
  let modelCount = 0;
  let skillCount = 0;
  let toolCount = 0;
  let policyCount = 0;
  let hasAudit = false;

  (nodes || []).forEach((n) => {
    if (n.type === 'agentCore') agentCount++;
    if (n.type === 'pillar') {
      const pType = n.data?.pillarType;
      if (pType === 'mcp') mcpCount++;
      else if (pType === 'model') modelCount++;
      else if (pType === 'skills') skillCount++;
      else if (pType === 'tools') toolCount++;
      else if (pType === 'policies') policyCount++;
      else if (pType === 'audit') hasAudit = true;
    }
  });

  return {
    nodeCount: (nodes || []).length,
    agentCount,
    mcpCount,
    modelCount,
    skillCount,
    toolCount,
    policyCount,
    hasAudit
  };
}

/**
 * Creates the initial enterprise workflow from existing saved canvas state or default setup.
 */
function createInitialDefaultWorkflow() {
  const existingCanvas = loadCanvasState();
  const defaultFramework = FRAMEWORKS[0]; // Google ADK

  const defaultUseCase = existingCanvas?.activeUseCase || {
    id: 'uc-autonomous-agent',
    name: 'Enterprise Autonomous Agent',
    description: 'Adaptive multi-pillar workflow orchestration with live MCP tools, model reasoning, and zero-trust policies.',
    framework: defaultFramework,
    agent: {
      prompt: 'You are an autonomous enterprise AI agent whose reasoning, execution, and capabilities adapt dynamically to your active brain, connected skills, protocol gateways, and live MCP tools.',
      temperature: 0.2,
      topP: 0.95
    }
  };

  const initialNodes = existingCanvas?.nodes || [];
  const initialEdges = existingCanvas?.edges || [];

  return {
    id: 'wf-enterprise-autonomous-agent',
    name: defaultUseCase.name || 'Enterprise Autonomous Agent',
    description: defaultUseCase.description || 'Adaptive multi-pillar workflow orchestration with live MCP tools, model reasoning, and zero-trust policies.',
    framework: defaultUseCase.framework || defaultFramework,
    activeUseCase: defaultUseCase,
    nodes: initialNodes,
    edges: initialEdges,
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now(),
    isStarred: true,
    tags: ['Autonomous', 'Enterprise', 'Multi-Pillar']
  };
}

/**
 * Loads all saved workflows from localStorage with safe fallback and seamless migration.
 */
export function loadAllWorkflows() {
  try {
    const raw = localStorage.getItem(WORKFLOWS_REGISTRY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to parse workflows registry from localStorage:', err);
  }

  // If no registry exists yet, bootstrap with the active canvas state
  const initialWf = createInitialDefaultWorkflow();
  const initialList = [initialWf];
  try {
    localStorage.setItem(WORKFLOWS_REGISTRY_KEY, JSON.stringify(initialList));
    localStorage.setItem(ACTIVE_WORKFLOW_ID_KEY, initialWf.id);
  } catch (err) {
    console.warn('Failed to seed initial workflow in localStorage:', err);
  }
  return initialList;
}

/**
 * Gets the current active workflow ID.
 */
export function getActiveWorkflowId() {
  try {
    const activeId = localStorage.getItem(ACTIVE_WORKFLOW_ID_KEY);
    if (activeId) return activeId;
  } catch (err) {
    console.warn('Failed to read active workflow id:', err);
  }
  const all = loadAllWorkflows();
  return all[0]?.id || 'wf-enterprise-autonomous-agent';
}

/**
 * Sets the active workflow ID.
 */
export function setActiveWorkflowId(id) {
  try {
    localStorage.setItem(ACTIVE_WORKFLOW_ID_KEY, id);
  } catch (err) {
    console.warn('Failed to save active workflow id:', err);
  }
}

/**
 * Retrieves a single workflow by ID.
 */
export function getWorkflowById(id) {
  const all = loadAllWorkflows();
  return all.find((wf) => wf.id === id) || all[0] || null;
}

/**
 * Saves/updates a single workflow in the registry and syncs timestamp.
 */
export function saveWorkflow(workflow) {
  if (!workflow || !workflow.id) return;
  const all = loadAllWorkflows();
  const index = all.findIndex((w) => w.id === workflow.id);
  const updatedRecord = {
    ...workflow,
    updatedAt: Date.now(),
    stats: computeWorkflowStats(workflow.nodes)
  };

  let newList;
  if (index >= 0) {
    newList = [...all];
    newList[index] = updatedRecord;
  } else {
    newList = [updatedRecord, ...all];
  }

  try {
    localStorage.setItem(WORKFLOWS_REGISTRY_KEY, JSON.stringify(newList));
  } catch (err) {
    console.warn('Failed to save workflows registry:', err);
  }
  return updatedRecord;
}

/**
 * Creates a brand new workflow. Defaults to a clean blank canvas.
 */
export function createWorkflow({
  name = 'Untitled Workflow',
  description = 'Autonomous enterprise agent workflow created in KEAOS Studio.',
  framework = FRAMEWORKS[0],
  isBlank = true,
  nodes = [],
  edges = [],
  tags = ['New']
} = {}) {
  const newId = `wf-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const useCaseObj = {
    id: `uc-${newId}`,
    name,
    description,
    framework,
    agent: {
      prompt: 'You are an autonomous enterprise AI agent configured to execute domain workflows.',
      temperature: 0.2,
      topP: 0.95
    }
  };

  const newWorkflow = {
    id: newId,
    name,
    description,
    framework,
    activeUseCase: useCaseObj,
    nodes: isBlank ? [] : nodes,
    edges: isBlank ? [] : edges,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isStarred: false,
    tags: tags.length ? tags : ['New'],
    stats: computeWorkflowStats(isBlank ? [] : nodes)
  };

  const all = loadAllWorkflows();
  const updatedList = [newWorkflow, ...all];

  try {
    localStorage.setItem(WORKFLOWS_REGISTRY_KEY, JSON.stringify(updatedList));
    localStorage.setItem(ACTIVE_WORKFLOW_ID_KEY, newId);
  } catch (err) {
    console.warn('Failed to persist new workflow:', err);
  }

  return newWorkflow;
}

/**
 * Duplicates / clones an existing workflow.
 */
export function duplicateWorkflow(sourceId) {
  const all = loadAllWorkflows();
  const source = all.find((w) => w.id === sourceId);
  if (!source) return null;

  const newId = `wf-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const clonedUseCase = {
    ...source.activeUseCase,
    id: `uc-${newId}`,
    name: `${source.name} (Copy)`
  };

  const clonedWorkflow = {
    ...JSON.parse(JSON.stringify(source)),
    id: newId,
    name: `${source.name} (Copy)`,
    activeUseCase: clonedUseCase,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isStarred: false,
    stats: computeWorkflowStats(source.nodes)
  };

  const updatedList = [clonedWorkflow, ...all];
  try {
    localStorage.setItem(WORKFLOWS_REGISTRY_KEY, JSON.stringify(updatedList));
  } catch (err) {
    console.warn('Failed to duplicate workflow:', err);
  }

  return clonedWorkflow;
}

/**
 * Updates workflow metadata (title, description, tags, star status).
 */
export function updateWorkflowMetadata(id, updates = {}) {
  const all = loadAllWorkflows();
  const index = all.findIndex((w) => w.id === id);
  if (index === -1) return null;

  const existing = all[index];
  const updatedUseCase = {
    ...existing.activeUseCase,
    name: updates.name !== undefined ? updates.name : existing.activeUseCase?.name,
    description: updates.description !== undefined ? updates.description : existing.activeUseCase?.description,
    framework: updates.framework || existing.activeUseCase?.framework
  };

  const updated = {
    ...existing,
    ...updates,
    activeUseCase: updatedUseCase,
    updatedAt: Date.now()
  };

  all[index] = updated;
  try {
    localStorage.setItem(WORKFLOWS_REGISTRY_KEY, JSON.stringify(all));
  } catch (err) {
    console.warn('Failed to update workflow metadata:', err);
  }
  return updated;
}

/**
 * Deletes a workflow by ID. Safely ensures at least one workflow remains.
 */
export function deleteWorkflow(id) {
  const all = loadAllWorkflows();
  if (all.length <= 1) {
    return { success: false, reason: 'Cannot delete the only remaining workflow.' };
  }

  const filtered = all.filter((w) => w.id !== id);
  try {
    localStorage.setItem(WORKFLOWS_REGISTRY_KEY, JSON.stringify(filtered));
    const activeId = getActiveWorkflowId();
    if (activeId === id) {
      setActiveWorkflowId(filtered[0].id);
    }
  } catch (err) {
    console.warn('Failed to delete workflow from registry:', err);
    return { success: false, reason: err.message };
  }

  return { success: true, nextActiveId: filtered[0].id };
}

/**
 * Exports a single workflow as a clean, downloadable JSON file.
 */
export function exportWorkflowAsJson(workflow) {
  try {
    const payload = {
      keaosVersion: '1.0.0',
      exportedAt: new Date().toISOString(),
      workflow
    };
    const jsonStr = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeName = (workflow.name || 'workflow').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    a.href = url;
    a.download = `${safeName}.keaos.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  } catch (err) {
    console.error('Failed to export workflow JSON:', err);
    return false;
  }
}

/**
 * Imports a workflow from JSON string content.
 */
export function importWorkflowFromJson(rawString) {
  try {
    const data = JSON.parse(rawString);
    const sourceWf = data.workflow || data;

    if (!sourceWf || (!sourceWf.nodes && !sourceWf.name)) {
      throw new Error('Invalid KEAOS workflow format.');
    }

    const newId = `wf-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const importedWf = {
      ...sourceWf,
      id: newId,
      name: sourceWf.name ? `${sourceWf.name} (Imported)` : 'Imported Workflow',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isStarred: false,
      nodes: Array.isArray(sourceWf.nodes) ? sourceWf.nodes : [],
      edges: Array.isArray(sourceWf.edges) ? sourceWf.edges : [],
      stats: computeWorkflowStats(sourceWf.nodes || [])
    };

    const all = loadAllWorkflows();
    const updated = [importedWf, ...all];
    localStorage.setItem(WORKFLOWS_REGISTRY_KEY, JSON.stringify(updated));
    setActiveWorkflowId(newId);
    return { success: true, workflow: importedWf };
  } catch (err) {
    console.error('Failed to import workflow JSON:', err);
    return { success: false, error: err.message };
  }
}
