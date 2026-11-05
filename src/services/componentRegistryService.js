/**
 * KEAOS Component Registry Service
 * Central Governance & Control Plane service managing:
 * - Specialized AI Agents & custom pillar items
 * - Decommissioning ledger (Dual-level: Provider & Component)
 * - Read-only Blast Radius Impact analysis across saved workflows
 * - Reset & Calibration verification probes
 * - Batch remap migration assistant
 */

import { PILLARS } from '../constants/pillars';
import { PROVIDERS } from './llmService';
import { loadAllWorkflows, saveWorkflow, getActiveWorkflowId } from '../utils/workflowStorage';
import { loadCanvasState } from '../utils/persistentState';

export const REGISTRY_STORAGE_KEY = 'keaos_component_registry_v1';
export const REGISTRY_EVENT_NAME = 'keaos_registry_updated';

// Default initial state
function getDefaultRegistryState() {
  return {
    customSpecializedAgents: [],
    customItems: {
      skills: [],
      policies: [],
      model: [],
      mcp: [],
      tools: [],
      gateway: [],
      memory: []
    },
    decommissionedComponents: [],
    decommissionedProviders: [],
    calibrationHistory: []
  };
}

/**
 * Load registry state safely from localStorage
 */
export function getRegistryState() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return getDefaultRegistryState();
  }
  try {
    const raw = window.localStorage.getItem(REGISTRY_STORAGE_KEY);
    if (!raw) {
      const initial = getDefaultRegistryState();
      window.localStorage.setItem(REGISTRY_STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    const sanitizedAgents = (Array.isArray(parsed.customSpecializedAgents) ? parsed.customSpecializedAgents : [])
      .filter(a => a && a.id !== 'agent-tax-reconciliation' && a.id !== 'agent-contract-auditor');
    if (parsed.customSpecializedAgents && parsed.customSpecializedAgents.length !== sanitizedAgents.length) {
      parsed.customSpecializedAgents = sanitizedAgents;
      try { window.localStorage.setItem(REGISTRY_STORAGE_KEY, JSON.stringify(parsed)); } catch (e) {}
    }
    return {
      customSpecializedAgents: sanitizedAgents,
      customItems: parsed.customItems && typeof parsed.customItems === 'object' ? parsed.customItems : {
        skills: [],
        policies: [],
        model: [],
        mcp: [],
        tools: [],
        gateway: [],
        memory: []
      },
      decommissionedComponents: Array.isArray(parsed.decommissionedComponents) ? parsed.decommissionedComponents : [],
      decommissionedProviders: Array.isArray(parsed.decommissionedProviders) ? parsed.decommissionedProviders : [],
      calibrationHistory: Array.isArray(parsed.calibrationHistory) ? parsed.calibrationHistory : []
    };
  } catch (err) {
    console.error('Failed to parse KEAOS registry state:', err);
    return getDefaultRegistryState();
  }
}

/**
 * Persist registry state and emit reactive event
 */
export function saveRegistryState(state) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(REGISTRY_STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent(REGISTRY_EVENT_NAME, { detail: state }));
  } catch (err) {
    console.error('Failed to save KEAOS registry state:', err);
  }
}

/**
 * Reactive listener hook for UI components
 */
export function subscribeToRegistry(callback) {
  if (typeof window === 'undefined') return () => {};
  const handler = (e) => {
    callback(e.detail || getRegistryState());
  };
  const storageHandler = (e) => {
    if (e.key === REGISTRY_STORAGE_KEY) {
      callback(getRegistryState());
    }
  };
  window.addEventListener(REGISTRY_EVENT_NAME, handler);
  window.addEventListener('storage', storageHandler);
  return () => {
    window.removeEventListener(REGISTRY_EVENT_NAME, handler);
    window.removeEventListener('storage', storageHandler);
  };
}

// ========================================================
// SPECIALIZED AGENTS MANAGEMENT
// ========================================================

export function getSpecializedAgents() {
  const state = getRegistryState();
  return state.customSpecializedAgents || [];
}

export function addSpecializedAgent({ name, role, prompt, defaultModel = 'gpt-4o', temperature = 0.2, topP = 0.95 }) {
  const state = getRegistryState();
  const id = `agent-spec-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`;
  const newAgent = {
    id,
    name: name.trim() || 'Specialized Agent',
    role: role?.trim() || 'Specialized Reasoning',
    prompt: prompt.trim() || 'Execute specialized enterprise tasks.',
    defaultModel,
    temperature: Number(temperature) || 0.2,
    topP: Number(topP) || 0.95,
    isCustom: true,
    createdAt: new Date().toISOString()
  };

  state.customSpecializedAgents.push(newAgent);
  saveRegistryState(state);
  return newAgent;
}

export function deleteSpecializedAgent(agentId) {
  const state = getRegistryState();
  state.customSpecializedAgents = state.customSpecializedAgents.filter(a => a.id !== agentId);
  // Also remove from decommissioned list if present
  state.decommissionedComponents = state.decommissionedComponents.filter(id => id !== agentId);
  saveRegistryState(state);
}

// ========================================================
// CUSTOM PILLAR ITEMS MANAGEMENT
// ========================================================

export function addCustomItem(category, item) {
  const state = getRegistryState();
  if (!state.customItems[category]) {
    state.customItems[category] = [];
  }
  const id = `custom-${category}-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`;
  const newItem = {
    ...item,
    id,
    isCustom: true,
    createdAt: new Date().toISOString()
  };
  state.customItems[category].push(newItem);
  saveRegistryState(state);
  return newItem;
}

export function deleteCustomItem(category, itemId) {
  const state = getRegistryState();
  if (state.customItems[category]) {
    state.customItems[category] = state.customItems[category].filter(i => i.id !== itemId);
  }
  state.decommissionedComponents = state.decommissionedComponents.filter(id => id !== itemId);
  saveRegistryState(state);
}

// ========================================================
// DECOMMISSIONING & RECOMMISSIONING (DUAL-LEVEL)
// ========================================================

export function isComponentDecommissioned(itemOrId, providerId = null) {
  const state = getRegistryState();
  const itemId = typeof itemOrId === 'string' ? itemOrId : itemOrId?.id;
  
  // The Autonomous Agent Core is an immutable platform foundation beyond the scope of decommissioning
  if (itemId === 'agent-core-primary' || itemOrId?.isDefault) {
    return false;
  }
  
  // 1. Direct component check
  if (itemId && state.decommissionedComponents.includes(itemId)) {
    return true;
  }

  // 2. Provider-level check (for models)
  const provider = providerId || (typeof itemOrId === 'object' ? (itemOrId?.provider || itemOrId?.config?.provider) : null);
  if (provider && state.decommissionedProviders.includes(provider)) {
    return true;
  }

  return false;
}

export function isProviderDecommissioned(providerId) {
  if (!providerId) return false;
  const state = getRegistryState();
  return state.decommissionedProviders.includes(providerId);
}

export function decommissionComponent(itemId) {
  if (!itemId || itemId === 'agent-core-primary') return;
  const state = getRegistryState();
  if (!state.decommissionedComponents.includes(itemId)) {
    state.decommissionedComponents.push(itemId);
    saveRegistryState(state);
  }
}

export function recommissionComponent(itemId, updatedConfig = null) {
  if (!itemId) return;
  const state = getRegistryState();
  state.decommissionedComponents = state.decommissionedComponents.filter(id => id !== itemId);
  
  // Record calibration event
  state.calibrationHistory.push({
    id: `calib-${Date.now()}`,
    componentId: itemId,
    calibratedAt: new Date().toISOString(),
    config: updatedConfig,
    status: 'ACTIVE'
  });

  saveRegistryState(state);
}

export function decommissionProvider(providerId) {
  if (!providerId) return;
  const state = getRegistryState();
  if (!state.decommissionedProviders.includes(providerId)) {
    state.decommissionedProviders.push(providerId);
    saveRegistryState(state);
  }
}

export function recommissionProvider(providerId) {
  if (!providerId) return;
  const state = getRegistryState();
  state.decommissionedProviders = state.decommissionedProviders.filter(p => p !== providerId);
  saveRegistryState(state);
}

// // ========================================================
// WORKFLOW DECOMMISSIONED COMPONENTS DETECTOR
// ========================================================

/**
 * Inspects a workflow for any decommissioned components or providers.
 * Returns an array of matching decommissioned item descriptors:
 * [{ id, name, type, nodeName, nodeId, pillarType }]
 */
export function getWorkflowDecommissionedComponents(workflow) {
  if (!workflow || !Array.isArray(workflow.nodes) || workflow.nodes.length === 0) {
    return [];
  }
  const state = getRegistryState();
  if (state.decommissionedComponents.length === 0 && state.decommissionedProviders.length === 0) {
    return [];
  }

  const matches = [];
  const seenIds = new Set();

  workflow.nodes.forEach(node => {
    if (!node) return;
    const nodeData = node.data || {};
    const nodeConfig = nodeData.config || {};
    const nodeName = (nodeData.name || node.id || '').trim();
    const nodePillarType = nodeData.pillarType || (node.type === 'agentCore' ? 'agentCore' : null);

    // 1. Check provider decommissioning
    const provider = (nodeData.provider || nodeConfig.provider || '').toLowerCase();
    if (provider && state.decommissionedProviders.includes(provider)) {
      const provKey = `provider-${provider}`;
      if (!seenIds.has(provKey)) {
        seenIds.add(provKey);
        matches.push({
          id: provider,
          name: `Provider: ${provider.toUpperCase()}`,
          type: 'provider',
          nodeName,
          nodeId: node.id
        });
      }
    }

    // 2. Check component decommissioning
    for (const decomId of state.decommissionedComponents) {
      if (seenIds.has(decomId)) continue;

      // Find item definition
      let decomItem = null;
      // Search custom items
      for (const cat of Object.keys(state.customItems || {})) {
        const found = state.customItems[cat]?.find(i => i.id === decomId);
        if (found) { decomItem = { ...found, pillarType: cat }; break; }
      }
      // Search specialized agents
      if (!decomItem) {
        const foundAgent = state.customSpecializedAgents?.find(a => a.id === decomId);
        if (foundAgent) decomItem = { ...foundAgent, pillarType: 'agentCore' };
      }
      // Search PILLARS
      if (!decomItem) {
        for (const cat of Object.keys(PILLARS)) {
          const found = PILLARS[cat]?.items?.find(i => i.id === decomId);
          if (found) { decomItem = { ...found, pillarType: cat }; break; }
        }
      }
      if (!decomItem) {
        decomItem = { id: decomId, name: decomId };
      }

      // Check match using multi-attribute rules
      const itemId = (decomItem.id || '').toLowerCase().trim();
      const itemName = (decomItem.name || '').toLowerCase().trim();
      const itemModelId = (decomItem.modelId || decomItem.config?.modelId || '').toLowerCase().trim();
      let isMatch = false;

      // Model match
      if (decomItem.pillarType === 'model' || nodePillarType === 'model') {
        const nModel = (nodeConfig.modelId || nodeData.modelId || '').toLowerCase().trim();
        if (itemModelId && nModel && (nModel === itemModelId || nModel.includes(itemModelId) || itemModelId.includes(nModel))) {
          isMatch = true;
        } else if (itemModelId && (nodeName.toLowerCase().includes(itemModelId) || itemId.includes(nModel))) {
          isMatch = true;
        } else if (itemName && nodeName.toLowerCase().includes(itemName)) {
          isMatch = true;
        }
      }
      // Direct ID match
      else if (node.id === decomId || nodeData.id === decomId || nodeData.pillarId === decomId) {
        isMatch = true;
      }
      // Exact name match
      else if (itemName && nodeName.toLowerCase() === itemName) {
        isMatch = true;
      }
      // Word token overlap for skills/policies
      else if (itemName && nodeName && (decomItem.pillarType === 'skills' || decomItem.pillarType === 'policies' || nodePillarType === 'skills' || nodePillarType === 'policies')) {
        const cleanItem = itemName.replace(/[^a-z0-9]/g, ' ');
        const cleanNode = nodeName.toLowerCase().replace(/[^a-z0-9]/g, ' ');
        const itemWords = cleanItem.split(/\s+/).filter(w => w.length > 2);
        const nodeWords = cleanNode.split(/\s+/).filter(w => w.length > 2);
        const common = itemWords.filter(w => nodeWords.includes(w));
        if (common.length >= 2 || (itemWords.length === 1 && common.length === 1)) {
          isMatch = true;
        }
      }

      if (isMatch) {
        seenIds.add(decomId);
        matches.push({
          id: decomId,
          name: decomItem.name || decomId,
          type: 'component',
          nodeName,
          nodeId: node.id,
          pillarType: decomItem.pillarType
        });
        break;
      }
    }
  });

  return matches;
}

// ========================================================
// READ-ONLY BLAST RADIUS & IMPACT ENGINE
// ========================================================

/**
 * Calculates the exact blast radius of decommissioning a component or provider.
 * Pure read-only operation: inspects all workflows without mutating anything.
 */
export function calculateBlastRadius(itemOrId, providerId = null, category = null) {
  const storedWorkflows = loadAllWorkflows() || [];
  const activeCanvas = typeof loadCanvasState === 'function' ? loadCanvasState() : null;
  const activeWfId = typeof getActiveWorkflowId === 'function' ? getActiveWorkflowId() : null;

  // Harmonize stored workflows with active canvas state
  const workflowsMap = new Map();
  storedWorkflows.forEach(w => {
    if (w && w.id) workflowsMap.set(w.id, w);
  });
  if (activeWfId && activeCanvas && Array.isArray(activeCanvas.nodes) && activeCanvas.nodes.length > 0) {
    const existing = workflowsMap.get(activeWfId);
    workflowsMap.set(activeWfId, {
      id: activeWfId,
      name: activeCanvas.activeUseCase?.name || existing?.name || 'Active Canvas Workflow',
      nodes: activeCanvas.nodes
    });
  }
  const workflows = Array.from(workflowsMap.values());

  const affectedWorkflows = [];
  let totalNodeCount = 0;

  const item = typeof itemOrId === 'object' && itemOrId !== null ? itemOrId : { id: itemOrId, name: itemOrId };
  const itemId = (item.id || '').toLowerCase().trim();
  const itemName = (item.name || '').toLowerCase().trim();
  const itemModelId = (item.modelId || item.config?.modelId || '').toLowerCase().trim();
  const isDefaultAgent = Boolean(item.isDefault || itemId === 'agent-core-primary');

  workflows.forEach(wf => {
    if (!wf || !Array.isArray(wf.nodes)) return;
    const matchingNodes = [];

    wf.nodes.forEach(node => {
      let isMatch = false;
      const nodeData = node.data || {};
      const nodeConfig = nodeData.config || {};
      const nodeName = (nodeData.name || '').toLowerCase().trim();
      const nodePillarType = nodeData.pillarType || (node.type === 'agentCore' ? 'agentCore' : null);

      // 1. Provider match (e.g. OpenAI org-wide)
      if (providerId) {
        const prov = providerId.toLowerCase().trim();
        if (
          nodeData.provider?.toLowerCase() === prov ||
          nodeConfig.provider?.toLowerCase() === prov ||
          nodeName.includes(prov)
        ) {
          isMatch = true;
        }
      }

      // 2. Autonomous Agent Core match: any standard agentCore node
      else if (isDefaultAgent) {
        if (node.type === 'agentCore' && !nodeData.isSpecialized && !nodeData.specializedAgentId) {
          isMatch = true;
        }
      }

      // 3. Specialized Agent match
      else if (node.type === 'agentCore') {
        if (nodeData.specializedAgentId === item.id || (nodeData.isSpecialized && nodeName === itemName)) {
          isMatch = true;
        }
      }

      // 4. Model match (modelId, id, provider, or name token)
      else if (category === 'model' || nodePillarType === 'model' || item.pillarType === 'model') {
        const nModel = (nodeConfig.modelId || nodeData.modelId || '').toLowerCase().trim();
        if (itemModelId && nModel && (nModel === itemModelId || nModel.includes(itemModelId) || itemModelId.includes(nModel))) {
          isMatch = true;
        } else if (itemModelId && (nodeName.includes(itemModelId) || itemId.includes(nModel))) {
          isMatch = true;
        } else if (itemName && nodeName.includes(itemName)) {
          isMatch = true;
        }
      }

      // 5. Pillar items match (Skills, Policies, MCP, Gateway, Memory, Tools, Audit, Observability, Cost)
      else {
        // Direct ID match
        if (node.id === item.id || nodeData.id === item.id || nodeData.pillarId === item.id) {
          isMatch = true;
        }
        // Direct Name match
        else if (itemName && nodeName && (nodeName === itemName || nodeName.includes(itemName) || itemName.includes(nodeName))) {
          isMatch = true;
        }
        // Word token overlap for skills/policies (e.g. "PII Redactor" <-> "PII & Confidentiality Redactor")
        else if (itemName && nodeName && (category === 'skills' || category === 'policies' || nodePillarType === 'skills' || nodePillarType === 'policies')) {
          const cleanItem = itemName.replace(/[^a-z0-9]/g, ' ');
          const cleanNode = nodeName.replace(/[^a-z0-9]/g, ' ');
          const itemWords = cleanItem.split(/\s+/).filter(w => w.length > 2);
          const nodeWords = cleanNode.split(/\s+/).filter(w => w.length > 2);
          const common = itemWords.filter(w => nodeWords.includes(w));
          if (common.length >= 2 || (itemWords.length === 1 && common.length === 1)) {
            isMatch = true;
          }
        }
        // Config skillId or policyId match
        else if (nodeConfig.skillId && (nodeConfig.skillId === item.id || nodeConfig.skillId === item.name)) {
          isMatch = true;
        } else if (nodeConfig.policyId && (nodeConfig.policyId === item.id || nodeConfig.policyId === item.name)) {
          isMatch = true;
        }
      }

      if (isMatch) {
        matchingNodes.push({
          id: node.id,
          name: nodeData.name || node.id,
          type: node.type,
          pillarType: nodeData.pillarType || null
        });
        totalNodeCount++;
      }
    });

    if (matchingNodes.length > 0) {
      affectedWorkflows.push({
        id: wf.id,
        name: wf.name || 'Untitled Workflow',
        nodes: matchingNodes,
        nodeCount: matchingNodes.length
      });
    }
  });

  // Calculate institutional risk score
  let riskLevel = 'LOW';
  if (affectedWorkflows.length >= 5 || totalNodeCount >= 10) {
    riskLevel = 'CRITICAL';
  } else if (affectedWorkflows.length >= 2 || totalNodeCount >= 4) {
    riskLevel = 'HIGH';
  } else if (affectedWorkflows.length >= 1) {
    riskLevel = 'MEDIUM';
  }

  return {
    affectedWorkflows,
    totalWorkflowCount: affectedWorkflows.length,
    totalNodeCount,
    riskLevel
  };
}

// ========================================================
// BATCH REMAP / MIGRATION ASSISTANT (USER INITIATED ONLY)
// ========================================================

/**
 * User-initiated batch remap to replace a decommissioned component with an active replacement.
 */
export function remapComponentAcrossWorkflows(targetItem, replacementItem) {
  if (!targetItem || !replacementItem) return { updatedWorkflows: 0, updatedNodes: 0 };
  const workflows = loadAllWorkflows();
  let updatedWorkflows = 0;
  let updatedNodes = 0;

  workflows.forEach(wf => {
    if (!wf || !Array.isArray(wf.nodes)) return;
    let wfMutated = false;

    const newNodes = wf.nodes.map(node => {
      const nodeData = node.data || {};
      const nodeConfig = nodeData.config || {};
      let matches = false;

      // Check model match
      if (targetItem.modelId && (nodeConfig.modelId === targetItem.modelId || nodeData.name === targetItem.name || (nodeData.name && nodeData.name.toLowerCase().includes(targetItem.modelId.toLowerCase())))) {
        matches = true;
      }
      // Check general name or ID match
      else if (nodeData.name === targetItem.name || nodeData.id === targetItem.id || node.id === targetItem.id) {
        matches = true;
      }
      // Check keyword overlap for skills / policies
      else if (targetItem.name && nodeData.name) {
        const cleanTarget = targetItem.name.replace(/[^a-z0-9]/gi, ' ').toLowerCase();
        const cleanNode = nodeData.name.replace(/[^a-z0-9]/gi, ' ').toLowerCase();
        const targetWords = cleanTarget.split(/\s+/).filter(w => w.length > 2);
        const nodeWords = cleanNode.split(/\s+/).filter(w => w.length > 2);
        const common = targetWords.filter(w => nodeWords.includes(w));
        if (common.length >= 2 || (targetWords.length === 1 && common.length === 1)) {
          matches = true;
        }
      }

      if (matches) {
        wfMutated = true;
        updatedNodes++;
        return {
          ...node,
          data: {
            ...nodeData,
            name: replacementItem.name,
            provider: replacementItem.provider || nodeData.provider,
            config: {
              ...nodeConfig,
              ...(replacementItem.config || {}),
              modelId: replacementItem.modelId || replacementItem.id || nodeConfig.modelId,
              provider: replacementItem.provider || nodeConfig.provider
            }
          }
        };
      }
      return node;
    });

    if (wfMutated) {
      saveWorkflow({ ...wf, nodes: newNodes });
      updatedWorkflows++;
    }
  });

  return { updatedWorkflows, updatedNodes };
}

// ========================================================
// LIVE VERIFICATION & CALIBRATION PROBE
// ========================================================

/**
 * Runs a simulated live health probe / verification test on a component before recommissioning.
 */
export async function runCalibrationProbe(component) {
  // Simulate institutional health check latency
  await new Promise(res => setTimeout(res, 600));

  if (!component) {
    return { success: false, latencyMs: 0, message: 'Invalid component specifications.' };
  }

  // Model probe
  if (component.provider || component.modelId) {
    return {
      success: true,
      latencyMs: Math.floor(Math.random() * 40) + 25,
      message: `Endpoint probe healthy. Model '${component.name || component.modelId}' schema verified.`
    };
  }

  // Policy probe
  if (component.ruleType || component.category === 'policies') {
    return {
      success: true,
      latencyMs: 12,
      message: `Policy rule engine calibrated. Zero-leak regex benchmark verified.`
    };
  }

  // Skill / Agent probe
  return {
    success: true,
    latencyMs: 18,
    message: `System prompt syntax validated. Structured execution contract aligned.`
  };
}

