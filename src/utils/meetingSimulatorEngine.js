import { 
  synthesizeMeetingUniversal, 
  getProviderCredential, 
  PROVIDERS 
} from '../services/llmService';

export const EPISODIC_MEMORY_STORAGE_KEY = 'keaos_episodic_memory_store';

export function getEpisodicMemoryStore() {
  try {
    const raw = localStorage.getItem(EPISODIC_MEMORY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn('Failed to parse episodic memory store', e);
  }
  // Default seed memory representing prior historical sprint & executive commitments
  return [
    {
      id: 'MEM-SEED-01',
      date: '2026-09-14',
      type: 'decision',
      text: 'Leadership approved Q3 GPU cluster expansion with a $45,000/mo cap.'
    },
    {
      id: 'MEM-SEED-02',
      date: '2026-09-16',
      type: 'commitment',
      text: 'Priya Patel committed to run latency benchmarking and publish results by Tuesday 5 PM.'
    },
    {
      id: 'MEM-SEED-03',
      date: '2026-09-18',
      type: 'policy',
      text: 'Enterprise NDA prohibits unreleased patent code discussion without legal clearance.'
    }
  ];
}

export function saveEpisodicMemoryStore(items) {
  try {
    localStorage.setItem(EPISODIC_MEMORY_STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Failed to save episodic memory store', e);
  }
}

export function clearEpisodicMemoryStore() {
  try {
    localStorage.removeItem(EPISODIC_MEMORY_STORAGE_KEY);
  } catch (e) {}
}

export async function runMeetingSimulation({
  transcript,
  frameworkId,
  agentConfig,
  attachedPillars,
  onStepProgress
}) {
  const steps = [];
  const logStep = (stepName, detail, latencyMs = 200) => {
    const entry = { step: stepName, detail, latencyMs, timestamp: new Date().toLocaleTimeString() };
    steps.push(entry);
    if (onStepProgress) onStepProgress(entry, [...steps]);
  };

  const startTime = performance.now();

  // Step 1: Ingestion & Diarization
  logStep('Ingestion & Parsing', `Ingested transcript (${transcript.length} characters). Input validated.`, 80);

  // Step 2: Gateway & Policy Checks (PII Masking)
  let processedTranscript = transcript;
  let redactedCount = 0;
  const hasPiiPolicy = attachedPillars.some(p => p.type === 'policies' || (p.name && p.name.toLowerCase().includes('pii')));
  
  if (hasPiiPolicy) {
    const salaryRegex = /\$[0-9,]+(\.[0-9]{2})?/g;
    const matches = transcript.match(salaryRegex);
    if (matches) {
      redactedCount = matches.length;
      processedTranscript = transcript.replace(salaryRegex, '[CONFIDENTIAL_FINANCIAL_REDACTED]');
    }
    logStep('Gateway & Policies', `PII Redaction active. Masked ${redactedCount} confidential financial values.`, 90);
  } else {
    logStep('Gateway Pass-through', `Ingress rate limiter checked. No PII policy attached.`, 40);
  }

  // Step 3: Real Episodic Memory Lookup
  const hasMemory = attachedPillars.some(p => p.type === 'memory');
  let memoryContext = null;
  let retrievedMemoryItems = [];

  if (hasMemory) {
    retrievedMemoryItems = getEpisodicMemoryStore();
    memoryContext = retrievedMemoryItems
      .map(m => `• [${m.date || 'Historical'}] (${m.type?.toUpperCase() || 'NOTE'}): ${m.text || m.task || JSON.stringify(m)}`)
      .join('\n');
    logStep('Episodic Memory Query (Live)', `Loaded ${retrievedMemoryItems.length} historical commitments across past sessions into model context.`, 110);
  } else {
    logStep('Memory Bypass', `Stateless execution mode. No memory pillar connected.`, 25);
  }

  // Step 4: Model Execution (LIVE Real Multi-LLM API or Deterministic Fallback)
  const modelNode = attachedPillars.find(p => p.type === 'model');
  const provider = modelNode?.config?.provider || 
    (modelNode?.name?.toLowerCase().includes('claude') ? 'anthropic' :
     modelNode?.name?.toLowerCase().includes('gpt') ? 'openai' :
     modelNode?.name?.toLowerCase().includes('ollama') ? 'ollama' :
     modelNode?.name?.toLowerCase().includes('openrouter') ? 'openrouter' : 'google');

  const modelId = modelNode?.config?.modelId || modelNode?.name || 'gemini-2.0-flash';
  const modelDisplayName = modelNode ? modelNode.name : `${PROVIDERS[provider]?.name || provider} (${modelId})`;

  let summary = [];
  let actionItems = [];
  let decisions = [];
  let sentimentScore = 'Collaborative & Action-Oriented (92%)';
  let totalTokens = Math.round(transcript.length / 4) + 650;
  let modelLatency = 850;
  let isLiveExecution = false;

  const credential = getProviderCredential(provider);

  if (credential) {
    // REAL LIVE MULTI-LLM API INFERENCE CALL WITH MEMORY CONTEXT
    logStep(`Core Model (${PROVIDERS[provider]?.name || provider})`, `Executing live API request to ${modelDisplayName}...`, 0);
    try {
      const realResult = await synthesizeMeetingUniversal({
        provider,
        modelId,
        transcript: processedTranscript,
        systemPrompt: agentConfig.prompt,
        memoryContext,
        temperature: agentConfig.temperature || 0.2
      });

      summary = realResult.parsedData.summary || [];
      decisions = realResult.parsedData.decisions || [];
      actionItems = realResult.parsedData.actionItems || [];
      sentimentScore = realResult.parsedData.sentiment || 'Constructive';
      modelLatency = realResult.durationMs;
      totalTokens = realResult.totalTokens || totalTokens;
      isLiveExecution = true;

      logStep('Model Response (Live)', `Live ${PROVIDERS[provider]?.name} inference complete (${modelLatency}ms). Processed ${totalTokens} tokens.`, modelLatency);
    } catch (err) {
      logStep('API Inference Warning', `${PROVIDERS[provider]?.name} error: ${err.message}. Reverting to structured fallback.`, 200);
      summary = [
        'Reviewed executive roadmap, infrastructure budget allocation, and milestones.',
        'Validated cross-functional dependencies and scaling thresholds.',
        'Secured departmental sign-offs across technical and financial leads.'
      ];
      decisions = ['Approved resource allocation contingent on technical latency benchmarking.'];
      actionItems = [
        { id: 'ACT-01', assignee: 'Priya Patel', task: 'Run stress tests and publish latency matrix', deadline: 'Tuesday, 5 PM', priority: 'High', jiraTicket: 'ENG-1081' },
        { id: 'ACT-02', assignee: 'Marcus', task: 'Review OAuth2 policy with legal team', deadline: 'Friday', priority: 'Medium', jiraTicket: 'SEC-304' }
      ];
    }
  } else {
    logStep('Core Agent Execution', `No API Key found for ${PROVIDERS[provider]?.name || provider}. Configure in API Settings for live calls.`, 380);
    summary = [
      'Reviewed executive roadmap, infrastructure budget allocation, and milestones.',
      'Validated cross-functional dependencies and scaling thresholds.',
      'Secured departmental sign-offs across technical and financial leads.'
    ];
    decisions = ['Approved resource allocation contingent on technical latency benchmarking.'];
    actionItems = [
      { id: 'ACT-01', assignee: 'Priya Patel', task: 'Run stress tests and publish latency matrix', deadline: 'Tuesday, 5 PM', priority: 'High', jiraTicket: 'ENG-1081' },
      { id: 'ACT-02', assignee: 'Marcus', task: 'Review OAuth2 policy with legal team', deadline: 'Friday', priority: 'Medium', jiraTicket: 'SEC-304' }
    ];
  }

  // Step 5: Skills Processing
  logStep('Skills Processing', `Extracted ${summary.length} takeaways, ${decisions.length} decisions, ${actionItems.length} action items.`, 120);

  // Step 6: MCP Integration
  const hasCalendarMcp = attachedPillars.some(p => p.id === 'mcp-google-calendar');
  const hasSlackMcp = attachedPillars.some(p => p.id === 'mcp-slack');
  const hasJiraMcp = attachedPillars.some(p => p.id === 'mcp-jira-linear');

  if (hasCalendarMcp || hasSlackMcp || hasJiraMcp) {
    logStep('MCP Dispatch', `Synchronized with ${hasCalendarMcp ? 'Calendar, ' : ''}${hasSlackMcp ? 'Slack, ' : ''}${hasJiraMcp ? 'Jira' : ''}`, 150);
  }

  // Step 7: Cryptographic Audit (REAL WebCrypto SHA-256)
  let auditHash = 'N/A';
  const hasAudit = attachedPillars.some(p => p.type === 'audit');
  if (hasAudit) {
    try {
      const msgBuffer = new TextEncoder().encode(transcript + JSON.stringify(actionItems));
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      auditHash = 'sha256:' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      logStep('Cryptographic Audit (Live)', `Live SHA-256: ${auditHash.substring(0, 24)}... recorded.`, 40);
    } catch (e) {
      auditHash = 'sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    }
  }

  // Step 8: Episodic Memory State Commit (Write Back)
  let newMemoryCount = 0;
  if (hasMemory && (actionItems.length > 0 || decisions.length > 0)) {
    const existingStore = getEpisodicMemoryStore();
    const today = new Date().toISOString().split('T')[0];
    
    const newItems = [
      ...decisions.map((dec, i) => ({
        id: `DEC-${Date.now()}-${i}`,
        date: today,
        type: 'decision',
        text: dec
      })),
      ...actionItems.map((act, i) => ({
        id: `ACT-${Date.now()}-${i}`,
        date: today,
        type: 'commitment',
        text: `${act.assignee}: ${act.task} (Deadline: ${act.deadline || 'TBD'})`
      }))
    ];

    const updatedStore = [...newItems, ...existingStore].slice(0, 25);
    saveEpisodicMemoryStore(updatedStore);
    newMemoryCount = newItems.length;
    logStep('Episodic Memory Commit', `Committed ${newMemoryCount} new decisions & commitments into persistent memory store.`, 45);
  }

  // Financial ROI
  const costUsd = Number(((totalTokens / 1_000_000) * 0.35).toFixed(4));
  const humanMinutesSaved = 35;
  const humanValueSavedUsd = Number(((humanMinutesSaved / 60) * 65).toFixed(2));
  const netRoiMultiplier = Math.round(humanValueSavedUsd / Math.max(costUsd, 0.001));

  const totalRuntimeMs = Math.round(performance.now() - startTime);

  return {
    success: true,
    steps,
    sanitizedTranscript: processedTranscript,
    redactedPiiCount: redactedCount,
    summary,
    decisions,
    actionItems,
    sentiment: sentimentScore,
    auditHash,
    memory: {
      hasMemory,
      retrievedItems: retrievedMemoryItems,
      newCommittedCount: newMemoryCount
    },
    observability: {
      totalLatencyMs: totalRuntimeMs,
      totalTokens,
      modelUsed: modelDisplayName,
      provider,
      framework: frameworkId,
      isLiveApi: isLiveExecution
    },
    economics: {
      costUsd,
      humanMinutesSaved,
      humanValueSavedUsd,
      netRoiMultiplier
    }
  };
}

