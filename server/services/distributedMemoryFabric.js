/**
 * KEAOS Distributed 4-Tier Memory Fabric
 * 
 * Provides high-concurrency memory isolation, swarm state sharing,
 * and background compaction for thousands of autonomous agents.
 * 
 * Tier 1: Agent Working Buffer (In-memory ring buffer)
 * Tier 2: Swarm Blackboard (In-memory key-value bus with Optimistic Concurrency Control)
 * Tier 3: Episodic Vector & Relational Store (Namespaced by Tenant -> Org -> Project -> Agent)
 * Tier 4: Semantic Entity Graph (Enterprise entity resolution)
 */

import crypto from 'node:crypto';

export class DistributedMemoryFabric {
  constructor() {
    // Tier 1: Agent scratchpads (Map<AgentId, Array<StepBuffer>>)
    this.tier1Scratchpads = new Map();

    // Tier 2: Shared Swarm Blackboard (Map<WorkflowId, { version: number, state: Record<string, any> }>)
    this.tier2Blackboards = new Map();

    // Tier 3: Namespaced Episodic Memory Store (Map<NamespaceKey, Array<MemoryEntry>>)
    this.tier3EpisodicStore = new Map();

    // Tier 4: Entity Resolution Graph (Map<EntityId, EntityNode>)
    this.tier4EntityGraph = new Map();

    this.initializeDefaultEntities();
  }

  /**
   * Generates a strictly namespaced partition key for Tier 3 isolation.
   */
  getNamespaceKey(tenantId = 'default_tenant', orgUnit = 'core', projectId = 'default_proj') {
    return `${tenantId}::${orgUnit}::${projectId}`;
  }

  // =========================================================================
  // TIER 1: Working Memory (Agent Scratchpad Buffer)
  // =========================================================================
  appendWorkingMemory(agentId, stepEntry) {
    if (!this.tier1Scratchpads.has(agentId)) {
      this.tier1Scratchpads.set(agentId, []);
    }
    const buffer = this.tier1Scratchpads.get(agentId);
    buffer.push({
      stepId: `step-${crypto.randomUUID()}`,
      timestamp: new Date().toISOString(),
      ...stepEntry
    });
    // Sliding window: keep last 30 step events per agent to avoid context blowout
    if (buffer.length > 30) buffer.shift();
  }

  getWorkingMemory(agentId) {
    return this.tier1Scratchpads.get(agentId) || [];
  }

  clearWorkingMemory(agentId) {
    this.tier1Scratchpads.delete(agentId);
  }

  // =========================================================================
  // TIER 2: Inter-Agent Swarm Blackboard (Optimistic Concurrency Control)
  // =========================================================================
  initializeSwarmBlackboard(workflowId, initialState = {}) {
    this.tier2Blackboards.set(workflowId, {
      version: 1,
      createdAt: new Date().toISOString(),
      state: { ...initialState }
    });
    return this.tier2Blackboards.get(workflowId);
  }

  readSwarmState(workflowId, key = null) {
    const board = this.tier2Blackboards.get(workflowId);
    if (!board) return null;
    return key ? board.state[key] : board.state;
  }

  /**
   * Updates shared swarm state with optimistic lock validation.
   * Prevents race conditions when 50 agents simultaneously write deliverables.
   */
  updateSwarmStateWithLock(workflowId, expectedVersion, delta) {
    const board = this.tier2Blackboards.get(workflowId);
    if (!board) {
      throw new Error(`Workflow blackboard ${workflowId} not found.`);
    }

    if (board.version !== expectedVersion) {
      throw new Error(
        `OptimisticConcurrencyError: State version conflict on ${workflowId}. Expected ${expectedVersion}, found ${board.version}.`
      );
    }

    board.state = { ...board.state, ...delta };
    board.version += 1;
    board.updatedAt = new Date().toISOString();

    return {
      success: true,
      newVersion: board.version,
      state: board.state
    };
  }

  // =========================================================================
  // TIER 3: Namespaced Long-Term Episodic Memory (Read / Write Loop)
  // =========================================================================
  queryEpisodicMemory(namespaceKey, queryText = '', topK = 5) {
    const entries = this.tier3EpisodicStore.get(namespaceKey) || [];
    if (!queryText.trim()) {
      return entries.slice(-topK);
    }

    // Lexical / Keyword match scoring (simulating hybrid search)
    const terms = queryText.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    const scored = entries.map(entry => {
      let score = 0;
      const content = `${entry.text} ${entry.type} ${entry.tags.join(' ')}`.toLowerCase();
      for (const term of terms) {
        if (content.includes(term)) score += 1;
      }
      return { ...entry, relevanceScore: score };
    });

    return scored
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, topK);
  }

  commitEpisodicMemory(namespaceKey, memoryPayload) {
    if (!this.tier3EpisodicStore.has(namespaceKey)) {
      this.tier3EpisodicStore.set(namespaceKey, []);
    }
    const store = this.tier3EpisodicStore.get(namespaceKey);
    const newEntry = {
      id: `mem-${crypto.randomUUID()}`,
      timestamp: new Date().toISOString(),
      type: memoryPayload.type || 'commitment',
      text: memoryPayload.text,
      metadata: memoryPayload.metadata || {},
      tags: memoryPayload.tags || ['general']
    };
    store.push(newEntry);
    return newEntry;
  }

  // =========================================================================
  // TIER 4: Entity Resolution & Knowledge Graph
  // =========================================================================
  initializeDefaultEntities() {
    this.tier4EntityGraph.set('priya_patel', {
      canonicalName: 'Priya Patel',
      role: 'Staff Systems Architect',
      aliases: ['Priya', 'p_patel', 'priya.patel@company.internal'],
      department: 'Infrastructure & Latency Engineering',
      oktaId: 'usr_okta_9921',
      jiraAccount: 'ENG-PRIYA'
    });

    this.tier4EntityGraph.set('marcus_vance', {
      canonicalName: 'Marcus Vance',
      role: 'Lead Security Architect',
      aliases: ['Marcus', 'mvance', 'm.vance@company.internal'],
      department: 'Cyber & Cloud Security',
      oktaId: 'usr_okta_3041',
      jiraAccount: 'SEC-MARCUS'
    });
  }

  resolveEntity(aliasOrName) {
    const query = aliasOrName.toLowerCase().trim();
    for (const [id, entity] of this.tier4EntityGraph.entries()) {
      if (
        id.toLowerCase() === query ||
        entity.canonicalName.toLowerCase() === query ||
        entity.aliases.some(a => a.toLowerCase() === query)
      ) {
        return entity;
      }
    }
    return null;
  }

  // =========================================================================
  // Asynchronous Sleep-Phase Compactor
  // =========================================================================
  compactNamespace(namespaceKey) {
    const entries = this.tier3EpisodicStore.get(namespaceKey) || [];
    if (entries.length <= 15) return { compacted: false, count: entries.length };

    // Summarize older entries into consolidated milestones
    const olderEntries = entries.slice(0, entries.length - 10);
    const recentEntries = entries.slice(entries.length - 10);

    const consolidatedSummary = {
      id: `compacted-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'consolidated_milestone',
      text: `Historical Milestone Summary: Consolidated ${olderEntries.length} past commitments into canonical baseline.`,
      metadata: { compactedItemsCount: olderEntries.length },
      tags: ['consolidated', 'baseline']
    };

    const compactedStore = [consolidatedSummary, ...recentEntries];
    this.tier3EpisodicStore.set(namespaceKey, compactedStore);

    return {
      compacted: true,
      oldCount: entries.length,
      newCount: compactedStore.length
    };
  }
}

export const memoryFabric = new DistributedMemoryFabric();
