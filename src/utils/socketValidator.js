/**
 * KEAOS SOCKET VALIDATOR & UNIVERSAL AUTO-WIRING ENGINE
 * 
 * Enforces strictly-typed socket connections across all 10 architectural pillars
 * and workflow nodes (Agent Core, Remote Agent, Deterministic Box, Ingestion,
 * Output Viewers, Triggers, Routers, Approvals, and MCP Gateways).
 * 
 * Aligns strictly with AGENTS.md:
 * - Rule 2: Strictly-Typed Socket Connections
 * - Rule 3: Model Agnostic & Zero-Simulation
 * - Rule 5: 5-Color Pentagon Palette
 * - Rule 10: Strict Generalization (Zero Hardcoding)
 */

import { SOCKET_RULES, PILLARS } from '../constants/pillars.js';

/**
 * Validates whether an edge connection between source and target is permitted.
 */
export function validateConnection(sourceNode, sourceHandle, targetNode, targetHandle, edges = []) {
  if (!sourceNode || !targetNode) return false;

  const sType = sourceNode.type;
  const tType = targetNode.type;
  const sPillar = sourceNode.data?.pillarType;
  const tPillar = targetNode.data?.pillarType;

  // 1. Output Nodes (Canvas Terminal Sinks)
  if (tType === 'outputNode' || tType === 'outputNodeV2') {
    if (
      sType === 'agentCore' || 
      sType === 'pillar' || 
      sType === 'outputNode' || 
      sType === 'outputNodeV2' || 
      sType === 'deterministicNode' || 
      sType === 'remoteAgentNode' ||
      sType === 'routerNode' ||
      sType === 'approvalNode'
    ) {
      return true;
    }
  }

  // Pass-through from Output Node to downstream consumers
  if (sType === 'outputNode' || sType === 'outputNodeV2') {
    if (
      tType === 'agentCore' || 
      tType === 'outputNode' || 
      tType === 'outputNodeV2' || 
      tType === 'deterministicNode' || 
      tType === 'remoteAgentNode' ||
      tType === 'routerNode' ||
      tType === 'approvalNode'
    ) {
      return true;
    }
  }

  // 2. Remote Agent Connections (Multi-Product Mesh / Hybrid Orchestration)
  if (tType === 'remoteAgentNode') {
    if (
      sType === 'agentCore' || 
      sType === 'remoteAgentNode' || 
      sType === 'deterministicNode' || 
      sType === 'ingestionNode' || 
      sType === 'triggerNode' || 
      sType === 'routerNode' || 
      sType === 'approvalNode' || 
      (sPillar === 'policies' && targetHandle === 'policy-in')
    ) {
      return true;
    }
  }

  if (sType === 'remoteAgentNode') {
    if (
      tType === 'agentCore' || 
      tType === 'remoteAgentNode' || 
      tType === 'deterministicNode' || 
      tType === 'outputNode' || 
      tType === 'outputNodeV2' || 
      tType === 'routerNode' || 
      tType === 'approvalNode'
    ) {
      return true;
    }
  }

  // 3. Ingestion Nodes
  if (sType === 'ingestionNode') {
    if (tType === 'agentCore' || tType === 'pillar' || tType === 'deterministicNode' || tType === 'remoteAgentNode') {
      return true;
    }
  }

  // 4. MCP Server <-> MCP Egress Gateway (Bidirectional)
  const isMcpToGateway = sPillar === 'mcp' && tPillar === 'gateway';
  const isGatewayToMcp = sPillar === 'gateway' && tPillar === 'mcp';
  if (isMcpToGateway || isGatewayToMcp) {
    return true;
  }

  // 5. Deterministic Logic Box
  if (sType === 'deterministicNode' && tType === 'deterministicNode') {
    return true;
  }
  if ((sType === 'deterministicNode' && tType === 'agentCore') || (sType === 'agentCore' && tType === 'deterministicNode')) {
    const alreadyConnected = edges.some(
      ed => (ed.source === sourceNode.id && ed.target === targetNode.id) || 
            (ed.source === targetNode.id && ed.target === sourceNode.id)
    );
    if (alreadyConnected) return false;
    return true;
  }
  if ((sPillar === 'tools' && tType === 'deterministicNode') || (sType === 'deterministicNode' && tPillar === 'tools')) {
    return true;
  }
  if (sType === 'ingestionNode' && tType === 'deterministicNode') {
    return true;
  }
  if (
    (sType === 'deterministicNode' && (tType === 'outputNode' || tType === 'outputNodeV2')) || 
    ((sType === 'outputNode' || sType === 'outputNodeV2') && tType === 'deterministicNode')
  ) {
    return true;
  }

  // 6. Triggers
  if (sType === 'triggerNode') {
    if (tType === 'agentCore' || tType === 'deterministicNode' || tType === 'routerNode' || tType === 'remoteAgentNode') {
      return true;
    }
  }
  if (tType === 'triggerNode') {
    return false;
  }

  // 7. Conditional Router (Logics)
  if (tType === 'routerNode') {
    if (
      sType === 'agentCore' || 
      sType === 'deterministicNode' || 
      sType === 'ingestionNode' || 
      sType === 'triggerNode' || 
      sType === 'outputNode' || 
      sType === 'outputNodeV2' || 
      sType === 'routerNode' || 
      sType === 'approvalNode' ||
      sType === 'remoteAgentNode'
    ) {
      return true;
    }
  }
  if (sType === 'routerNode') {
    if (
      tType === 'agentCore' || 
      tType === 'deterministicNode' || 
      tType === 'outputNode' || 
      tType === 'outputNodeV2' || 
      tType === 'routerNode' || 
      tType === 'approvalNode' ||
      tType === 'remoteAgentNode'
    ) {
      return true;
    }
  }

  // 8. Human-in-the-Loop Approval Gate (Governance)
  if (tType === 'approvalNode') {
    if (
      sType === 'agentCore' || 
      sType === 'deterministicNode' || 
      sType === 'ingestionNode' || 
      sType === 'triggerNode' || 
      sType === 'routerNode' || 
      sType === 'outputNode' || 
      sType === 'outputNodeV2' || 
      sType === 'approvalNode' ||
      sType === 'remoteAgentNode'
    ) {
      return true;
    }
  }
  if (sType === 'approvalNode') {
    if (
      tType === 'agentCore' || 
      tType === 'deterministicNode' || 
      tType === 'outputNode' || 
      tType === 'outputNodeV2' || 
      tType === 'routerNode' || 
      tType === 'approvalNode' ||
      tType === 'remoteAgentNode'
    ) {
      return true;
    }
  }

  // 9. MCP Egress Gateway restrictions
  if (tType === 'pillar' && tPillar === 'gateway') {
    return sPillar === 'mcp';
  }

  // 10. Agent Core Inflow
  if (tType === 'agentCore') {
    if (sPillar === 'mcp') return false; // Zero-Trust: Direct MCP forbidden
    if (sPillar === 'gateway' && (targetHandle === 'mcp-in' || targetHandle === 'gateway-in')) return true;
    if (sType === 'agentCore' && (targetHandle === 'agent-in' || !targetHandle)) return true;

    const requiredPillar = SOCKET_RULES[targetHandle];
    if (requiredPillar && requiredPillar === sPillar) {
      return true;
    }
  }

  return false;
}

/**
 * Resolves auto-wiring parameters when a new component is added while an extended connector is active.
 * Handles both Outflow (downstream: Origin -> NewNode) and Inflow (upstream: NewNode -> Origin).
 */
export function resolveAutoWiring(activeConnector, newNode, existingNodes = [], existingEdges = []) {
  if (!activeConnector || !newNode) {
    return { isValid: false, reason: 'No active connector session' };
  }

  const { originNodeId, originNodeType, originPillarType, originNodeName, handleId, handleType } = activeConnector;
  const originNode = existingNodes.find(n => n.id === originNodeId) || {
    id: originNodeId,
    type: originNodeType,
    data: { name: originNodeName, pillarType: originPillarType }
  };

  const isDownstream = handleType === 'source';

  let sourceNode, sourceHandle, targetNode, targetHandle;
  let strokeColor = '#00B8F5';
  let strokeWidth = 2.0;
  let strokeDasharray = '4 4';
  let isToolBinding = false;

  if (isDownstream) {
    // ----------------------------------------------------
    // DOWNSTREAM AUTO-WIRING (Origin -> NewNode)
    // ----------------------------------------------------
    sourceNode = originNode;
    sourceHandle = handleId || 'out';
    targetNode = newNode;

    // Resolve targetHandle on newNode
    if (newNode.type === 'outputNode' || newNode.type === 'outputNodeV2') {
      targetHandle = 'data-in';
      strokeColor = '#10B981';
      strokeWidth = 1.8;
    } else if (newNode.type === 'remoteAgentNode') {
      targetHandle = originPillarType === 'policies' ? 'policy-in' : 'in';
      strokeColor = originPillarType === 'policies' ? '#FD349C' : '#00A3A6';
      strokeWidth = 2.2;
    } else if (newNode.type === 'deterministicNode') {
      targetHandle = 'in';
      strokeColor = '#EAAA00';
      strokeWidth = 2.0;
      isToolBinding = sourceHandle === 'tools-out';
    } else if (newNode.type === 'routerNode') {
      targetHandle = 'in';
      strokeColor = '#00B8F5';
      strokeWidth = 2.0;
    } else if (newNode.type === 'approvalNode') {
      targetHandle = 'in';
      strokeColor = '#EAAA00';
      strokeWidth = 2.0;
    } else if (newNode.type === 'agentCore') {
      if (sourceHandle === 'tools-out' || originNodeType === 'deterministicNode') {
        targetHandle = 'tools-in';
        strokeColor = '#0091DA';
        isToolBinding = true;
      } else if (originPillarType === 'gateway') {
        targetHandle = 'mcp-in';
        strokeColor = '#00A3A6';
      } else if (originPillarType === 'policies') {
        targetHandle = 'policy-in';
        strokeColor = '#6D2077';
      } else {
        targetHandle = 'agent-in';
        strokeColor = '#6366F1';
      }
    } else if (newNode.type === 'pillar') {
      const pType = newNode.data?.pillarType;
      if (pType === 'gateway') {
        targetHandle = 'mcp-in';
        strokeColor = '#00A3A6';
      } else {
        targetHandle = 'in';
        strokeColor = PILLARS[pType]?.color || '#0091DA';
      }
    } else {
      targetHandle = 'in';
    }
  } else {
    // ----------------------------------------------------
    // UPSTREAM AUTO-WIRING (NewNode -> Origin)
    // ----------------------------------------------------
    targetNode = originNode;
    targetHandle = handleId || 'in';
    sourceNode = newNode;

    // Resolve sourceHandle on newNode
    if (newNode.type === 'triggerNode') {
      sourceHandle = 'trigger-out';
      strokeColor = '#00A3A6';
    } else if (newNode.type === 'ingestionNode') {
      sourceHandle = 'data-out';
      strokeColor = '#0091DA';
    } else if (newNode.type === 'deterministicNode') {
      sourceHandle = 'out';
      strokeColor = '#EAAA00';
    } else if (newNode.type === 'remoteAgentNode') {
      sourceHandle = 'out';
      strokeColor = '#00A3A6';
      strokeWidth = 2.2;
    } else if (newNode.type === 'agentCore') {
      sourceHandle = 'out';
      strokeColor = '#6366F1';
    } else if (newNode.type === 'outputNode' || newNode.type === 'outputNodeV2') {
      sourceHandle = 'out';
      strokeColor = '#10B981';
    } else if (newNode.type === 'routerNode') {
      sourceHandle = 'true-out';
      strokeColor = '#00B8F5';
    } else if (newNode.type === 'approvalNode') {
      sourceHandle = 'approved';
      strokeColor = '#EAAA00';
    } else if (newNode.type === 'pillar') {
      const pType = newNode.data?.pillarType;
      sourceHandle = 'out';
      strokeColor = PILLARS[pType]?.color || '#0091DA';
    } else {
      sourceHandle = 'out';
    }
  }

  // Validate socket integrity
  const isValid = validateConnection(sourceNode, sourceHandle, targetNode, targetHandle, existingEdges);

  if (!isValid) {
    return {
      isValid: false,
      reason: `Socket mismatch between "${sourceNode.data?.name || sourceNode.type}" and "${targetNode.data?.name || targetNode.type}"`
    };
  }

  return {
    isValid: true,
    source: sourceNode.id,
    sourceHandle,
    target: targetNode.id,
    targetHandle,
    strokeColor,
    strokeWidth,
    strokeDasharray,
    isToolBinding
  };
}

/**
 * Checks whether a catalog category or specific item is compatible with the active connector.
 * Used by NodeCatalogPanel to render the '✓ Compatible' badge.
 */
export function isCatalogItemCompatible(activeConnector, categoryId, item = null) {
  if (!activeConnector || !categoryId) return false;

  const { originNodeType, originPillarType, handleId, handleType } = activeConnector;
  const isDownstream = handleType === 'source';

  // Normalize categoryId aliases (e.g. 'deterministicNode' <-> 'deterministic')
  const cat = categoryId === 'deterministicNode' ? 'deterministic' : categoryId;
  const matchCat = (allowedList) => allowedList.some(c => c === cat || c === categoryId);

  // 1. Remote Agent (Universal External Agent)
  if (originNodeType === 'remoteAgentNode') {
    if (isDownstream || handleId === 'out') {
      return matchCat(['outputNode', 'remoteAgents', 'agentCore', 'deterministic', 'logics', 'governance']);
    }
    if (!isDownstream || handleId === 'in') {
      return matchCat(['triggers', 'tools', 'agentCore', 'deterministic', 'remoteAgents']);
    }
    if (handleId === 'policy-in') {
      return categoryId === 'policies';
    }
  }

  // 2. Agent Core
  if (originNodeType === 'agentCore') {
    if (isDownstream || handleId === 'out') {
      return matchCat(['outputNode', 'remoteAgents', 'agentCore', 'deterministic', 'logics', 'governance']);
    }
    if (handleId === 'tools-out') {
      return matchCat(['deterministic', 'tools']);
    }
    if (handleId === 'model-in') return categoryId === 'model';
    if (handleId === 'tools-in' || handleId === 'tool-in') return matchCat(['tools', 'deterministic']);
    if (handleId === 'mcp-in') return categoryId === 'gateway';
    if (handleId === 'policy-in' || handleId === 'policies-in') return categoryId === 'policies';
    if (handleId === 'memory-in') return categoryId === 'memory';
    if (handleId === 'skill-in' || handleId === 'skills-in') return categoryId === 'skills';
    if (handleId === 'agent-in') return matchCat(['agentCore', 'remoteAgents', 'triggers']);
  }

  // 3. Deterministic Box
  if (originNodeType === 'deterministicNode') {
    if (isDownstream || handleId === 'out') {
      return matchCat(['outputNode', 'agentCore', 'remoteAgents', 'deterministic', 'logics', 'governance']);
    }
    if (!isDownstream || handleId === 'in') {
      return matchCat(['tools', 'triggers', 'agentCore', 'remoteAgents']);
    }
  }

  // 4. Triggers
  if (originNodeType === 'triggerNode') {
    return matchCat(['agentCore', 'remoteAgents', 'deterministic', 'logics']);
  }

  // 5. Ingestion
  if (originNodeType === 'ingestionNode') {
    return matchCat(['agentCore', 'remoteAgents', 'deterministic']);
  }

  // 6. Output Node
  if (originNodeType === 'outputNode' || originNodeType === 'outputNodeV2') {
    if (isDownstream || handleId === 'out') {
      return matchCat(['remoteAgents', 'agentCore', 'deterministic', 'outputNode']);
    }
    if (!isDownstream || handleId === 'data-in') {
      return matchCat(['agentCore', 'remoteAgents', 'deterministic', 'outputNode']);
    }
  }

  // 7. Pillars
  if (originNodeType === 'pillar') {
    if (originPillarType === 'gateway') {
      if (handleId === 'mcp-in' || handleId === 'mcp-in-left') return categoryId === 'mcp';
      return categoryId === 'agentCore';
    }
    if (originPillarType === 'mcp') return categoryId === 'gateway';
    if (originPillarType === 'policies') return matchCat(['agentCore', 'remoteAgents']);
    return categoryId === 'agentCore';
  }

  return false;
}
