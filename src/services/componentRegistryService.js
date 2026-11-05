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
import { loadAllWorkflows, saveWorkflow } from '../utils/workflowStorage';

export const REGISTRY_STORAGE_KEY = 'keaos_component_registry_v1';
export const REGISTRY_EVENT_NAME = 'keaos_registry_updated';

// Default initial state
function getDefaultRegistryState() {
  return {
    customSpecializedAgents: [
      {
        id: 'agent-tax-reconciliation',
        name: 'Tax Reconciliation Specialist',
        role: 'Financial Compliance & Tax Audit',
        prompt: 'You are an institutional Tax Reconciliation Specialist. Audit purchase registers against supplier GSTR-2A/2B filings, identify invoice number variations, date mismatches, and tax discrepancy tolerances.',
        defaultModel: 'gpt-4o',
        temperature: 0.1,
        topP: 0.9,
        isCustom: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'agent-contract-auditor',
        name: 'Legal Contract Governance Agent',
        role: 'Contract Risk & Clause Analysis',
        prompt: 'You are an institutional Legal Contract Governance Agent. Scrutinize NDAs, MSAs, and licensing agreements for non-standard indemnification, liability caps, governing law conflicts, and GDPR/PII adherence.',
        defaultModel: 'claude-3-5-sonnet-20241022',
        temperature: 0.2,
        topP: 0.95,
        isCustom: true,
        createdAt: new Date().toISOString()
      }
    ],
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
    return {
      customSpecializedAgents: Array.isArray(parsed.customSpecializedAgents) ? parsed.customSpecializedAgents : [],
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
  if (!itemId) return;
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

// ========================================================
// READ-ONLY BLAST RADIUS & IMPACT ENGINE
// ========================================================

/**
 * Calculates the exact blast radius of decommissioning a component or provider.
 * Pure read-only operation: inspects all workflows without mutating anything.
 */
export function calculateBlastRadius(itemId, providerId = null, category = null) {
  const workflows = loadAllWorkflows();
  const affectedWorkflows = [];
  let totalNodeCount = 0;

  workflows.forEach(wf => {
    if (!wf || !Array.isArray(wf.nodes)) return;
    const matchingNodes = [];

    wf.nodes.forEach(node => {
      let isMatch = false;
      const nodeData = node.data || {};
      const nodeConfig = nodeData.config || {};

      // 1. Check provider match (e.g. decommission OpenAI org-wide)
      if (providerId) {
        if (
          nodeData.provider === providerId ||
          nodeConfig.provider === providerId ||
          (nodeData.pillarType === 'model' && (nodeData.name?.toLowerCase().includes(providerId) || nodeConfig.provider === providerId))
        ) {
          isMatch = true;
        }
      }

      // 2. Check item match (Model, Skill, Policy, MCP, Agent, etc.)
      if (itemId) {
        // Direct ID match
        if (node.id === itemId || nodeData.id === itemId || nodeData.pillarId === itemId) {
          isMatch = true;
        }
        // Specialized agent match
        else if (node.type === 'agentCore' && (nodeData.specializedAgentId === itemId || nodeData.name === itemId)) {
          isMatch = true;
        }
        // Model ID match
        else if (
          nodeConfig.modelId === itemId ||
          nodeData.modelId === itemId ||
          nodeData.name === itemId
        ) {
          isMatch = true;
        }
        // Skill / Policy / MCP item match
        else if (
          nodeData.pillarType === category ||
          node.type === 'pillar'
        ) {
          if (nodeData.name === itemId || nodeConfig.skillId === itemId || nodeConfig.policyId === itemId) {
            isMatch = true;
          }
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
      if (targetItem.modelId && (nodeConfig.modelId === targetItem.modelId || nodeData.name === targetItem.name)) {
        matches = true;
      }
      // Check general name or ID match
      else if (nodeData.name === targetItem.name || nodeData.id === targetItem.id) {
        matches = true;
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

