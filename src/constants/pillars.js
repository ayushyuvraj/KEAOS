export const PILLARS = {
  model: {
    id: 'model',
    label: 'Model Provider',
    socketId: 'model-in',
    color: '#00338D', // Brand Blue
    bgColor: '#E6EDF7',
    borderColor: '#00338D',
    badge: 'FOUNDATION MODEL',
    description: 'Enterprise foundation intelligence provider',
    maxConnections: 1,
    items: [
      {
        id: 'model-gemini-2-flash',
        name: 'Gemini 2.0 Flash',
        provider: 'google',
        modelId: 'gemini-2.0-flash',
        description: 'Google: Fast, multimodal audio & text, 1M+ context window for meeting transcripts.',
        config: { provider: 'google', modelId: 'gemini-2.0-flash', temperature: 0.2, topP: 0.95 }
      },
      {
        id: 'model-gemini-1-5-pro',
        name: 'Gemini 1.5 Pro',
        provider: 'google',
        modelId: 'gemini-1.5-pro',
        description: 'Google: Deep reasoning, 2M context window, high fidelity executive synthesis.',
        config: { provider: 'google', modelId: 'gemini-1.5-pro', temperature: 0.1, topP: 0.95 }
      },
      {
        id: 'model-claude-3-5-sonnet',
        name: 'Claude 3.5 Sonnet',
        provider: 'anthropic',
        modelId: 'claude-3-5-sonnet-20241022',
        description: 'Anthropic: State-of-the-art reasoning, nuanced writing, and structured artifact generation.',
        config: { provider: 'anthropic', modelId: 'claude-3-5-sonnet-20241022', temperature: 0.2, topP: 0.9 }
      },
      {
        id: 'model-claude-3-5-haiku',
        name: 'Claude 3.5 Haiku',
        provider: 'anthropic',
        modelId: 'claude-3-5-haiku-20241022',
        description: 'Anthropic: Ultra-fast intelligence and high-throughput summarization.',
        config: { provider: 'anthropic', modelId: 'claude-3-5-haiku-20241022', temperature: 0.2, topP: 0.9 }
      },
      {
        id: 'model-gpt-4o',
        name: 'GPT-4o',
        provider: 'openai',
        modelId: 'gpt-4o',
        description: 'OpenAI: Flagship omni model with strong instruction following and JSON schemas.',
        config: { provider: 'openai', modelId: 'gpt-4o', temperature: 0.2, topP: 1.0 }
      },
      {
        id: 'model-gpt-4o-mini',
        name: 'GPT-4o Mini',
        provider: 'openai',
        modelId: 'gpt-4o-mini',
        description: 'OpenAI: Fast, cost-efficient model for lightweight meeting processing.',
        config: { provider: 'openai', modelId: 'gpt-4o-mini', temperature: 0.2, topP: 1.0 }
      },
      {
        id: 'model-ollama-llama3',
        name: 'Ollama: Llama 3.3 (Local)',
        provider: 'ollama',
        modelId: 'llama3.3',
        description: 'Ollama: 100% Private local inference on your own hardware via localhost:11434.',
        config: { provider: 'ollama', modelId: 'llama3.3', baseUrl: 'http://localhost:11434', temperature: 0.2 }
      },
      {
        id: 'model-ollama-deepseek',
        name: 'Ollama: DeepSeek R1 (Local)',
        provider: 'ollama',
        modelId: 'deepseek-r1',
        description: 'Ollama: Local open-weights reasoning model running on private infrastructure.',
        config: { provider: 'ollama', modelId: 'deepseek-r1', baseUrl: 'http://localhost:11434', temperature: 0.2 }
      },
      {
        id: 'model-openrouter-auto',
        name: 'OpenRouter: Multi-Provider Gateway',
        provider: 'openrouter',
        modelId: 'anthropic/claude-3.5-sonnet',
        description: 'OpenRouter: Single unified API gateway routing to 200+ global models with failovers.',
        config: { provider: 'openrouter', modelId: 'anthropic/claude-3.5-sonnet', temperature: 0.2 }
      },
      {
        id: 'model-openrouter-deepseek',
        name: 'OpenRouter: DeepSeek R1',
        provider: 'openrouter',
        modelId: 'deepseek/deepseek-r1',
        description: 'OpenRouter: Deep reasoning with zero local GPU setup required.',
        config: { provider: 'openrouter', modelId: 'deepseek/deepseek-r1', temperature: 0.2 }
      }
    ]
  },
  skills: {
    id: 'skills',
    label: 'Skills',
    socketId: 'skill-in',
    color: '#009A44', // ESG / Sustainability Green
    bgColor: '#E6F5EC',
    borderColor: '#009A44',
    badge: 'SKILL',
    description: 'Specialized behavioral reasoning capabilities',
    maxConnections: 10,
    items: [
      {
        id: 'skill-summarizer',
        name: 'Executive Summarizer',
        description: 'Generates TL;DR, high-level takeaways, and strategic themes.',
        config: { format: 'bullet_points', length: 'concise', focus: 'decisions' }
      },
      {
        id: 'skill-action-items',
        name: 'Action Item Extractor',
        description: 'Extracts exact tasks, assignees, deadlines, and dependencies.',
        config: { extractAssignee: true, extractDeadlines: true, strictJson: true }
      },
      {
        id: 'skill-sentiment',
        name: 'Sentiment & Conflict Detector',
        description: 'Identifies unaddressed objections, team morale, and debates.',
        config: { trackConsensus: true, highlightFriction: true }
      },
      {
        id: 'skill-decisions-log',
        name: 'Key Decisions Register',
        description: 'Isolates binding agreements made during the conversation.',
        config: { format: 'formal_register', verifyConsensus: true }
      },
      {
        id: 'skill-followup-email',
        name: 'Follow-Up Email Drafter',
        description: 'Drafts a personalized recap email ready to send to all attendees.',
        config: { tone: 'professional', includeNextMeetingAgenda: true }
      }
    ]
  },
  mcp: {
    id: 'mcp',
    label: 'Model Context Protocol (MCP)',
    socketId: 'mcp-in',
    color: '#00A3A6', // Cyber Teal
    bgColor: '#E6F6F6',
    borderColor: '#00A3A6',
    badge: 'MCP SERVER',
    description: 'Standardized client/server external resources',
    maxConnections: 10,
    items: [
      {
        id: 'mcp-google-calendar',
        name: 'Google Calendar MCP',
        description: 'Fetches meeting metadata, attendees, scheduled start/end, and invites.',
        config: { endpoint: 'mcp://calendar.google.internal', auth: 'oauth2' }
      },
      {
        id: 'mcp-slack',
        name: 'Slack Notification MCP',
        description: 'Publishes formatted recap thread and tags action item owners.',
        config: { channel: '#leadership-syncs', notifyAssignees: true }
      },
      {
        id: 'mcp-jira-linear',
        name: 'Jira / Linear Tasks MCP',
        description: 'Automatically creates sprint tickets for confirmed action items.',
        config: { projectKey: 'ENG', autoAssign: true }
      },
      {
        id: 'mcp-filesystem',
        name: 'Corporate Drive Filesystem MCP',
        description: 'Saves markdown meeting minutes to knowledge repository.',
        config: { basePath: '/Drive/Company/Minutes', format: 'markdown' }
      }
    ]
  },
  gateway: {
    id: 'gateway',
    label: 'Gateway & Routing',
    socketId: 'gateway-in',
    color: '#EAAA00', // Tax & Advisory Amber
    bgColor: '#FDF7E6',
    borderColor: '#EAAA00',
    badge: 'GATEWAY',
    description: 'Traffic ingress, rate limiting, and fallbacks',
    maxConnections: 2,
    items: [
      {
        id: 'gw-rate-limiter',
        name: 'Ingress Rate Limiter',
        description: 'Caps execution at 60 RPM to protect API quotas and prevent spikes.',
        config: { maxRpm: 60, burstSize: 10, queueStrategy: 'fifo' }
      },
      {
        id: 'gw-fallback-router',
        name: 'Model Fallback Router',
        description: 'Reroutes traffic to secondary model if primary encounters 429/500.',
        config: { fallbackModel: 'gemini-1.5-flash', timeoutSeconds: 15 }
      }
    ]
  },
  memory: {
    id: 'memory',
    label: 'Memory & Context',
    socketId: 'memory-in',
    color: '#483698', // Workforce / Transformation Violet
    bgColor: '#EFEBF5',
    borderColor: '#483698',
    badge: 'MEMORY',
    description: 'Long-term episodic and semantic knowledge state',
    maxConnections: 2,
    items: [
      {
        id: 'mem-episodic-sync',
        name: 'Episodic Recurring Sync Memory',
        description: 'Remembers past meeting action items to verify resolution across weeks.',
        config: { ttlDays: 90, storage: 'sqlite-vector', sessionScoped: false }
      },
      {
        id: 'mem-chroma-vector',
        name: 'Chroma Semantic Vector Store',
        description: 'Embeds and indexes all company meetings for cross-meeting RAG.',
        config: { collection: 'org_transcripts', topK: 5, embeddingModel: 'text-embedding-004' }
      }
    ]
  },
  policies: {
    id: 'policies',
    label: 'Policies & Guardrails',
    socketId: 'policy-in',
    color: '#6D2077', // Tech / Regulatory Magenta
    bgColor: '#F2E9F4',
    borderColor: '#6D2077',
    badge: 'POLICY',
    description: 'Compliance, PII redaction, and safety controls',
    maxConnections: 5,
    items: [
      {
        id: 'pol-pii-masker',
        name: 'PII & Confidentiality Redactor',
        description: 'Detects and redacts salaries, personal phones, SSNs, and passwords.',
        config: { redactSalaries: true, maskEmails: true, regexRules: 'strict' }
      },
      {
        id: 'pol-nda-guard',
        name: 'Enterprise NDA & Trade Secret Guard',
        description: 'Blocks leak of unreleased patent codes and financial guidance.',
        config: { enforceStrictTerms: true, alertLegalOnTrigger: true }
      }
    ]
  },
  audit: {
    id: 'audit',
    label: 'Audit & Compliance',
    socketId: 'audit-in',
    color: '#001E50', // Deep Navy
    bgColor: '#E6EBF2',
    borderColor: '#001E50',
    badge: 'AUDIT LOG',
    description: 'Immutable, tamper-proof execution record',
    maxConnections: 1,
    items: [
      {
        id: 'audit-tamper-proof',
        name: 'Cryptographic Audit Trail',
        description: 'Generates SHA-256 hash of raw transcripts and agent outputs with timestamp.',
        config: { hashingAlgorithm: 'sha256', immutableStorage: true, logInputs: true }
      }
    ]
  },
  observability: {
    id: 'observability',
    label: 'Observability & Tracing',
    socketId: 'observability-in',
    color: '#0091DA', // Pacific Blue
    bgColor: '#E6F4FC',
    borderColor: '#0091DA',
    badge: 'TELEMETRY',
    description: 'Distributed OpenTelemetry spans & metrics',
    maxConnections: 1,
    items: [
      {
        id: 'obs-opentelemetry',
        name: 'OpenTelemetry Trace Collector',
        description: 'Captures per-step execution spans, token usage, and latency waterfalls.',
        config: { exportOtlp: true, sampleRate: 1.0, detailedTokens: true }
      }
    ]
  },
  cost_benefit: {
    id: 'cost_benefit',
    label: 'Cost & Benefit (ROI)',
    socketId: 'cost-benefit-in',
    color: '#EAAA00', // Advisory Gold
    bgColor: '#FDF7E6',
    borderColor: '#EAAA00',
    badge: 'ROI / UNIT COST',
    description: 'Unit economics & business value calculation',
    maxConnections: 1,
    items: [
      {
        id: 'roi-tracker',
        name: 'ROI & Time-Saved Calculator',
        description: 'Measures agent compute cost ($0.02) vs employee manual transcription value ($45.00).',
        config: { hourlyRateUsd: 65, averageMinsSaved: 40, inputCostPer1M: 0.15, outputCostPer1M: 0.60 }
      }
    ]
  },
  tools: {
    id: 'tools',
    label: 'Tools & Ingestion',
    socketId: 'tool-in',
    color: '#005EB8', // Medium Blue
    bgColor: '#E6EFF8',
    borderColor: '#005EB8',
    badge: 'TOOL',
    description: 'Input processors, parsers, and custom utilities',
    maxConnections: 10,
    items: [
      {
        id: 'tool-audio-transcribe',
        name: 'MP3 Audio Transcription Tool',
        description: 'Accepts MP3 audio, runs Whisper/Speech-to-Text with speaker diarization.',
        config: { format: 'mp3', diarization: true, language: 'auto' },
        category: 'ingestion'
      },
      {
        id: 'tool-doc-parser',
        name: 'TXT / VTT Document Parser',
        description: 'Ingests uploaded meeting documents, parses timestamps and speaker names.',
        config: { supportedFormats: ['.txt', '.vtt', '.srt', '.docx'], cleanArtifacts: true },
        category: 'ingestion'
      },
      {
        id: 'tool-text-box-ingest',
        name: 'Direct Text Ingest Tool',
        description: 'Captures raw pasted meeting notes and formats into structured context.',
        config: { maxChars: 500000, autoSanitizeWhitespace: true },
        category: 'ingestion'
      },
      {
        id: 'tool-calendar-query',
        name: 'Calendar Sync Tool',
        description: 'Queries attendee status and agenda from corporate calendar API.',
        config: { syncIntervalMins: 15 },
        category: 'utility'
      }
    ]
  }
};

export const CANVAS_PILLARS = [
  'model',
  'skills',
  'mcp',
  'tools',
  'gateway',
  'memory',
  'policies'
];

export const AMBIENT_PILLARS = [
  'audit',
  'observability',
  'cost_benefit'
];

export const SOCKET_RULES = {
  'model-in': 'model',
  'skill-in': 'skills',
  'skills-in': 'skills',
  'mcp-in': 'mcp',
  'gateway-in': 'gateway',
  'memory-in': 'memory',
  'policy-in': 'policies',
  'policies-in': 'policies',
  'tool-in': 'tools',
  'tools-in': 'tools'
};


