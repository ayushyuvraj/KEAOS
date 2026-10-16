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
 * Canonical Meeting Intelligence Workflow definition with full multi-pillar topology
 */
export function createMeetingIntelligenceWorkflow() {
  const defaultFramework = FRAMEWORKS[0]; // Google ADK

  const defaultUseCase = {
    id: 'uc-meeting-intel',
    name: 'Meeting Intelligence Agent',
    description: 'Autonomous multi-speaker synthesis, action items with owners, and task sync.',
    framework: defaultFramework,
    agent: {
      prompt: 'Analyze meeting transcripts, extract decisions, action items with owners, and draft follow-up communications.',
      temperature: 0.2,
      topP: 0.95
    }
  };

  const initialNodes = [
    {
      id: 'agent-core',
      type: 'agentCore',
      position: { x: 520, y: 165 },
      data: {
        name: 'Meeting Intelligence Agent',
        framework: defaultFramework,
        prompt: 'Analyze meeting transcripts, extract decisions, action items with owners, and draft follow-up communications.',
        temperature: 0.2,
        topP: 0.95,
        attachedCounts: {
          model: 1,
          skills: 1,
          mcp: 1,
          tools: 1,
          gateway: 1,
          memory: 1,
          policies: 1
        }
      }
    },
    {
      id: 'node-model-1',
      type: 'pillar',
      position: { x: 595, y: -20 },
      data: {
        pillarType: 'model',
        name: 'Gemini 2.0 Flash',
        description: 'Fast, multimodal, 1M+ context window for long transcripts.',
        config: { provider: 'google', modelId: 'gemini-2.0-flash', temperature: 0.2, topP: 0.95 }
      }
    },
    {
      id: 'node-tool-1',
      type: 'pillar',
      position: { x: 230, y: -20 },
      data: {
        pillarType: 'tools',
        toolId: 'tool-audio-transcribe',
        name: 'Audio Transcriber',
        description: 'Accepts MP3 audio, runs Whisper/Speech-to-Text with speaker diarization.',
        config: { format: 'mp3', diarization: true }
      }
    },
    {
      id: 'node-mcp-gw-1',
      type: 'pillar',
      position: { x: 780, y: -20 },
      data: {
        pillarType: 'gateway',
        itemId: 'gw-mcp-controller',
        name: 'MCP Egress Gateway',
        description: 'Enforces zero-trust mediation between Agent Core and external MCP servers. Awaiting live MCP server connection.',
        config: { gatewayType: 'mcp-egress', auditAllActions: true }
      }
    },
    {
      id: 'node-policy-1',
      type: 'pillar',
      position: { x: 410, y: 440 },
      data: {
        pillarType: 'policies',
        name: 'PII Redactor',
        description: 'Detects and redacts salaries, personal phones, SSNs, and passwords.',
        config: { redactSalaries: true, maskEmails: true }
      }
    },
    {
      id: 'node-memory-1',
      type: 'pillar',
      position: { x: 595, y: 440 },
      data: {
        pillarType: 'memory',
        name: 'Episodic Sync Memory',
        description: 'Remembers past meeting action items to verify resolution across weeks.',
        config: { ttlDays: 90, store: 'vector-sqlite' }
      }
    },
    {
      id: 'node-skill-1',
      type: 'pillar',
      position: { x: 780, y: 440 },
      data: {
        pillarType: 'skills',
        name: 'Executive Summarizer',
        description: 'Generates TL;DR, high-level takeaways, and strategic themes.',
        config: { length: 'concise', focus: 'decisions' }
      }
    },
    {
      id: 'node-output-1',
      type: 'outputNode',
      position: { x: 800, y: 260 },
      data: {
        title: 'Meeting Intelligence Output',
        content: '',
        status: 'idle',
        format: 'markdown',
        isExpanded: false
      }
    },
    {
      id: 'node-ingest-1',
      type: 'ingestionNode',
      position: { x: 410, y: -20 },
      data: {
        title: 'Data & Audio Ingestion',
        content: '',
        status: 'idle',
        isExpanded: false
      }
    }
  ];

  const initialEdges = [
    {
      id: 'edge-model',
      source: 'node-model-1',
      sourceHandle: 'out',
      target: 'agent-core',
      targetHandle: 'model-in',
      type: 'deletable',
      animated: false,
      style: { stroke: '#00338D', strokeWidth: 1.8, strokeDasharray: '4 4' }
    },
    {
      id: 'edge-ingest-1',
      source: 'node-ingest-1',
      sourceHandle: 'data-out',
      target: 'agent-core',
      targetHandle: 'tools-in',
      type: 'deletable',
      animated: false,
      style: { stroke: '#0091DA', strokeWidth: 1.8, strokeDasharray: '4 4' }
    },
    {
      id: 'edge-tool',
      source: 'node-tool-1',
      sourceHandle: 'out',
      target: 'agent-core',
      targetHandle: 'tools-in',
      type: 'deletable',
      animated: false,
      style: { stroke: '#0091DA', strokeWidth: 1.8, strokeDasharray: '4 4' }
    },
    {
      id: 'edge-mcp-gw',
      source: 'node-mcp-gw-1',
      sourceHandle: 'out',
      target: 'agent-core',
      targetHandle: 'mcp-in',
      type: 'deletable',
      animated: false,
      style: { stroke: '#00A3A6', strokeWidth: 1.8, strokeDasharray: '4 4' }
    },
    {
      id: 'edge-policy',
      source: 'node-policy-1',
      sourceHandle: 'out',
      target: 'agent-core',
      targetHandle: 'policies-in',
      type: 'deletable',
      animated: false,
      style: { stroke: '#6D2077', strokeWidth: 1.8, strokeDasharray: '4 4' }
    },
    {
      id: 'edge-memory',
      source: 'node-memory-1',
      sourceHandle: 'out',
      target: 'agent-core',
      targetHandle: 'memory-in',
      type: 'deletable',
      animated: false,
      style: { stroke: '#483698', strokeWidth: 1.8, strokeDasharray: '4 4' }
    },
    {
      id: 'edge-skill',
      source: 'node-skill-1',
      sourceHandle: 'out',
      target: 'agent-core',
      targetHandle: 'skill-in',
      type: 'deletable',
      animated: false,
      style: { stroke: '#009A44', strokeWidth: 1.8, strokeDasharray: '4 4' }
    },
    {
      id: 'edge-output',
      source: 'agent-core',
      sourceHandle: 'out',
      target: 'node-output-1',
      targetHandle: 'data-in',
      type: 'deletable',
      animated: false,
      style: { stroke: '#10B981', strokeWidth: 1.8, strokeDasharray: '4 4' }
    }
  ];

  return {
    id: 'wf-meeting-intelligence',
    name: 'Meeting Intelligence Agent',
    description: 'Autonomous multi-speaker meeting intelligence: transcript & audio ingestion, executive summarization, action item extraction, PII redaction, and episodic sync.',
    framework: defaultFramework,
    activeUseCase: defaultUseCase,
    nodes: initialNodes,
    edges: initialEdges,
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now(),
    isStarred: true,
    isLocked: false,
    isWorkflowLocked: false,
    tags: ['Meeting Intelligence', 'Audio Ingestion', 'Summarizer', 'PII Redactor'],
    stats: computeWorkflowStats(initialNodes)
  };
}

/**
 * Creates the initial enterprise workflow from existing saved canvas state or default setup.
 */
function createInitialDefaultWorkflow() {
  const existingCanvas = loadCanvasState();
  if (existingCanvas && existingCanvas.nodes && existingCanvas.nodes.length > 0) {
    const rawUseCase = existingCanvas.activeUseCase || {};
    const ucName = rawUseCase.name && rawUseCase.name !== 'Enterprise Autonomous Agent'
      ? rawUseCase.name
      : 'Meeting Intelligence Agent';
    const ucDesc = rawUseCase.description || 'Autonomous multi-speaker synthesis, action items, and task sync.';
    const ucFramework = rawUseCase.framework || FRAMEWORKS[0];
    const initialLock = Boolean(existingCanvas.isWorkflowLocked ?? existingCanvas.isLocked ?? false);

    return {
      id: 'wf-meeting-intelligence',
      name: ucName,
      description: ucDesc,
      framework: ucFramework,
      activeUseCase: {
        ...rawUseCase,
        name: ucName,
        description: ucDesc,
        framework: ucFramework,
        agent: {
          prompt: 'Analyze meeting transcripts, extract decisions, action items with owners, and draft follow-up communications.',
          temperature: 0.2,
          topP: 0.95,
          ...(rawUseCase.agent || {})
        }
      },
      nodes: existingCanvas.nodes,
      edges: existingCanvas.edges || [],
      createdAt: Date.now() - 86400000,
      updatedAt: Date.now(),
      isStarred: true,
      isLocked: initialLock,
      isWorkflowLocked: initialLock,
      tags: ['Meeting Intelligence', 'Audio Ingestion', 'Summarizer'],
      stats: computeWorkflowStats(existingCanvas.nodes)
    };
  }

  return createMeetingIntelligenceWorkflow();
}

/**
 * Loads all saved workflows from localStorage with safe fallback and seamless migration.
 * Preserves custom workflows (e.g. MIA2) without forced renaming.
 */
export function loadAllWorkflows() {
  try {
    const raw = localStorage.getItem(WORKFLOWS_REGISTRY_KEY);
    if (raw) {
      let parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to parse workflows registry from localStorage:', err);
  }

  // If no registry exists yet, bootstrap with initial default workflow
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
  return all[0]?.id || 'wf-meeting-intelligence';
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
  let found = all.find((wf) => wf.id === id) || all[0] || null;
  if (found && (!found.nodes || found.nodes.length === 0) && (found.id === 'wf-meeting-intelligence' || found.name?.toLowerCase().includes('meeting intelligence'))) {
    const canonical = createMeetingIntelligenceWorkflow();
    found = {
      ...found,
      nodes: canonical.nodes,
      edges: canonical.edges,
      stats: canonical.stats,
      activeUseCase: canonical.activeUseCase
    };
  }
  return found;
}

/**
 * Saves/updates a single workflow in the registry and syncs timestamp.
 */
export function saveWorkflow(workflow) {
  if (!workflow || !workflow.id) return;
  const all = loadAllWorkflows();
  const index = all.findIndex((w) => w.id === workflow.id);
  const isLocked = Boolean(workflow.isLocked ?? workflow.isWorkflowLocked ?? false);
  const updatedRecord = {
    ...workflow,
    isLocked,
    isWorkflowLocked: isLocked,
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
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('keaos:workspace-changed'));
    }
  } catch (err) {
    console.warn('Failed to save workflows registry:', err);
  }
  return updatedRecord;
}

/**
 * Updates the lock state of a specific workflow.
 */
export function setWorkflowLock(id, isLocked) {
  if (!id) return;
  const wf = getWorkflowById(id);
  if (wf) {
    return saveWorkflow({
      ...wf,
      isLocked: Boolean(isLocked),
      isWorkflowLocked: Boolean(isLocked)
    });
  }
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
    isLocked: false,
    isWorkflowLocked: false,
    tags: tags.length ? tags : ['New'],
    stats: computeWorkflowStats(isBlank ? [] : nodes)
  };

  const all = loadAllWorkflows();
  const updatedList = [newWorkflow, ...all];

  try {
    localStorage.setItem(WORKFLOWS_REGISTRY_KEY, JSON.stringify(updatedList));
    localStorage.setItem(ACTIVE_WORKFLOW_ID_KEY, newId);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('keaos:workspace-changed'));
    }
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
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('keaos:workspace-changed'));
    }
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
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('keaos:workspace-changed'));
    }
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
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('keaos:workspace-changed'));
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
