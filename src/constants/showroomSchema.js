/**
 * KEAOS SHOWROOM CANONICAL DATA ARCHITECTURE
 * Defines the schema, elite design archetypes, widget catalog, and multi-screen flow contracts
 * for creating bespoke, chic, and posh frontends for any KEAOS/ARC workflow.
 */

// 1. Elite Design Archetypes with distinct visual DNA
export const SHOWROOM_ARCHETYPES = {
  'boutique-luxury': {
    id: 'boutique-luxury',
    name: 'Maison & Atelier',
    tagline: 'High-craft luxury serif, warm alabaster, bronze & antique gold accents',
    fontDisplay: '"Playfair Display", Georgia, "Times New Roman", serif',
    fontBody: '"Inter", -apple-system, sans-serif',
    bgApp: '#FDFBF7',
    bgCard: '#FFFFFF',
    bgCardHover: '#FAF8F3',
    borderCard: '#E8E2D5',
    borderFocus: '#C5A059',
    textPrimary: '#1C1917',
    textSecondary: '#57534E',
    textMuted: '#A8A29E',
    accentColor: '#C5A059', // Antique Gold
    accentHover: '#B08D46',
    accentLight: '#FBF5E8',
    glowColor: 'rgba(197, 160, 89, 0.15)',
    cardShadow: '0 4px 20px -2px rgba(28, 25, 23, 0.05), 0 2px 6px -1px rgba(28, 25, 23, 0.03)',
    borderRadius: '4px',
    isDark: false
  },
  'obsidian-cyber': {
    id: 'obsidian-cyber',
    name: 'Obsidian Void',
    tagline: 'Deep space obsidian, neon cyan luminescence, precision dark tech chic',
    fontDisplay: '"Geist Mono", "JetBrains Mono", Consolas, monospace',
    fontBody: '"Inter", -apple-system, sans-serif',
    bgApp: '#07080B',
    bgCard: '#0E1117',
    bgCardHover: '#131720',
    borderCard: '#1E2330',
    borderFocus: '#00F0FF',
    textPrimary: '#F8FAFC',
    textSecondary: '#94A3B8',
    textMuted: '#475569',
    accentColor: '#00F0FF', // Electric Cyan
    accentHover: '#00D1DF',
    accentLight: 'rgba(0, 240, 255, 0.1)',
    glowColor: 'rgba(0, 240, 255, 0.2)',
    cardShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.6), inset 0 1px 0 0 rgba(255, 255, 255, 0.05)',
    borderRadius: '8px',
    isDark: true
  },
  'linear-monochrome': {
    id: 'linear-monochrome',
    name: 'Titanium Linear',
    tagline: 'Minimalist titanium slate, crisp hairlines, razor-sharp monochrome precision',
    fontDisplay: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
    fontBody: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
    bgApp: '#090A0F',
    bgCard: '#111319',
    bgCardHover: '#161922',
    borderCard: '#222634',
    borderFocus: '#FFFFFF',
    textPrimary: '#FFFFFF',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    accentColor: '#FFFFFF', // Crisp White
    accentHover: '#E2E8F0',
    accentLight: 'rgba(255, 255, 255, 0.08)',
    glowColor: 'rgba(255, 255, 255, 0.1)',
    cardShadow: '0 4px 24px -1px rgba(0, 0, 0, 0.5), inset 0 1px 0 0 rgba(255, 255, 255, 0.04)',
    borderRadius: '6px',
    isDark: true
  },
  'institutional-executive': {
    id: 'institutional-executive',
    name: 'Institutional Sovereign',
    tagline: 'Deep navy authority, royal cobalt accents, Fortune 50 boardroom clarity',
    fontDisplay: '"Helvetica Neue", Arial, sans-serif',
    fontBody: '"Helvetica Neue", Arial, sans-serif',
    bgApp: '#F5F7FB',
    bgCard: '#FFFFFF',
    bgCardHover: '#F9FAFC',
    borderCard: '#DCE2EE',
    borderFocus: '#00338D',
    textPrimary: '#001E50',
    textSecondary: '#334155',
    textMuted: '#64748B',
    accentColor: '#00338D', // Royal Brand Blue
    accentHover: '#00266B',
    accentLight: '#E8EFFC',
    glowColor: 'rgba(0, 51, 141, 0.12)',
    cardShadow: '0 2px 12px rgba(0, 30, 80, 0.06)',
    borderRadius: '0px',
    isDark: false
  },
  'nordic-calm': {
    id: 'nordic-calm',
    name: 'Nordic Sage',
    tagline: 'Warm stone parchment, forest sage, organic rhythm, human-centric calm',
    fontDisplay: '"Inter", system-ui, sans-serif',
    fontBody: '"Inter", system-ui, sans-serif',
    bgApp: '#F7F6F2',
    bgCard: '#FFFFFF',
    bgCardHover: '#FAF9F6',
    borderCard: '#E5E4DC',
    borderFocus: '#2D5A46',
    textPrimary: '#1E2420',
    textSecondary: '#4A534D',
    textMuted: '#8A948D',
    accentColor: '#2D5A46', // Deep Forest Sage
    accentHover: '#234737',
    accentLight: '#EBF2EE',
    glowColor: 'rgba(45, 90, 70, 0.12)',
    cardShadow: '0 2px 14px rgba(30, 36, 32, 0.04)',
    borderRadius: '12px',
    isDark: false
  }
};

// 2. Widget Component Registry (Drag-and-Drop Primitives)
export const WIDGET_CATALOG = [
  // --- Category: Layout & Structure ---
  {
    type: 'hero-banner',
    category: 'layout',
    name: 'Hero Brand Header',
    description: 'Prominent screen title, luxury eyebrow badge, and callout subtitle',
    defaultProps: {
      eyebrow: 'INTELLIGENCE SUITE',
      title: 'Strategic Mandate Orchestrator',
      subtitle: 'Autonomous verification, cryptographic audit, and enterprise synthesis.',
      align: 'left', // 'left' | 'center'
      showBadge: true,
      badgeText: 'LIVE ENGINE CONNECTED',
      badgeStatus: 'active' // 'active' | 'beta' | 'secure'
    }
  },
  {
    type: 'page-header',
    category: 'layout',
    name: 'Compact Page Header',
    description: 'Clean top title bar with breadcrumbs and action button',
    defaultProps: {
      title: 'Executive Portfolio Briefing',
      category: 'Workspace / Synthesis',
      actionLabel: 'Refresh Analysis',
      actionTrigger: 'trigger-workflow'
    }
  },

  // --- Category: Inputs & Ingestion ---
  {
    type: 'prompt-bar',
    category: 'inputs',
    name: 'Conversational Input Bar',
    description: 'Minimalist command input with submit button and quick prompt pills',
    defaultProps: {
      placeholder: 'Enter query, scenario, or paste contract text for deep analysis...',
      buttonLabel: 'Execute Workflow',
      binding: {
        triggerWorkflow: true,
        inputKey: 'query',
        outputTargetId: null // will target first output widget
      },
      suggestedPrompts: [
        'Analyze cross-border tax liabilities',
        'Extract high-risk indemnification clauses',
        'Audit compliance with ISO-27001'
      ]
    }
  },
  {
    type: 'file-dropzone',
    category: 'inputs',
    name: 'Luxury File Dropzone',
    description: 'Drag-and-drop document & audio ingest with visual status',
    defaultProps: {
      title: 'Drop Enterprise Artifacts Here',
      subtitle: 'Accepts PDF, DOCX, CSV, or MP3 Meeting Recordings (Max 50MB)',
      icon: 'UploadCloud',
      binding: {
        triggerWorkflow: true,
        inputKey: 'file',
        autoExecuteOnUpload: false
      }
    }
  },
  {
    type: 'action-button',
    category: 'inputs',
    name: 'Call-to-Action Button',
    description: 'Posh trigger button with workflow dispatch or screen navigation',
    defaultProps: {
      label: 'Run Institutional Audit',
      variant: 'primary', // 'primary' | 'secondary' | 'outline'
      size: 'lg', // 'sm' | 'md' | 'lg'
      icon: 'Play',
      actionType: 'workflow-and-navigate', // 'workflow' | 'navigate' | 'workflow-and-navigate'
      targetScreenId: null, // screen to navigate to
      binding: {
        targetNodeId: 'agent-core'
      }
    }
  },
  {
    type: 'parameter-slider',
    category: 'inputs',
    name: 'Precision Parameter Slider',
    description: 'Fine-tune numeric thresholds like Confidence or Risk Tolerance',
    defaultProps: {
      label: 'Confidence Alignment Threshold',
      description: 'Minimum alignment score required to auto-approve workflow directives',
      min: 0,
      max: 100,
      step: 1,
      value: 90,
      unit: '%',
      paramKey: 'confidenceThreshold'
    }
  },
  {
    type: 'segmented-switch',
    category: 'inputs',
    name: 'Segmented Pill Switcher',
    description: 'Apple-style multi-option toggle for modes, markets, or jurisdictions',
    defaultProps: {
      label: 'Target Execution Jurisdiction',
      options: ['APAC Sovereign', 'EU Compliance', 'Americas Standard'],
      selectedIndex: 0,
      paramKey: 'jurisdiction'
    }
  },
  {
    type: 'policy-toggle',
    category: 'inputs',
    name: 'Governance Policy Switch',
    description: 'Instant toggle for institutional guardrails and privacy filters',
    defaultProps: {
      label: 'Enforce Cryptographic PII Masking',
      description: 'Redacts employee salaries, SSNs, and executive contact data',
      checked: true,
      paramKey: 'enforcePiiMasking'
    }
  },

  // --- Category: Intelligence Displays & Outputs ---
  {
    type: 'streaming-result',
    category: 'outputs',
    name: 'Intelligence Report Viewer',
    description: 'Elite typography card for displaying synthesized markdown or JSON insights',
    defaultProps: {
      title: 'Synthesized Strategic Findings',
      subtitle: 'Generated via live foundation model reasoning',
      initialContent: 'Awaiting execution. Input parameters or upload an artifact to generate real-time institutional intelligence.',
      showCopyButton: true,
      showExportPdf: true,
      displayStyle: 'editorial' // 'editorial' | 'code' | 'minimal'
    }
  },
  {
    type: 'kpi-grid',
    category: 'outputs',
    name: 'Executive Metric Grid',
    description: 'Set of 3 high-impact KPI cards with delta percentages and status pills',
    defaultProps: {
      metrics: [
        { id: 'm1', label: 'Alignment Confidence', value: '98.4%', delta: '+4.2%', status: 'success' },
        { id: 'm2', label: 'Processing Latency', value: '412ms', delta: '-18ms', status: 'neutral' },
        { id: 'm3', label: 'Policy Adherence', value: '100%', delta: 'Zero Violations', status: 'success' }
      ]
    }
  },
  {
    type: 'comparison-table',
    category: 'outputs',
    name: 'Data & Action Grid',
    description: 'Chic tabular display for extracted action items, risks, or ledger rows',
    defaultProps: {
      title: 'Action Item Registry & Commitments',
      columns: ['Commitment', 'Owner', 'Priority', 'Cryptographic Proof'],
      rows: [
        ['Deliver revised APAC transfer pricing model', 'Julian Vance', 'CRITICAL', 'SHA-256: 8f9b...'],
        ['Enforce OAuth v2 token rotation policy', 'Elena Rostova', 'HIGH', 'SHA-256: 3c1a...'],
        ['Submit quarterly ESG compliance attestation', 'Marcus Thorne', 'STANDARD', 'SHA-256: e42d...']
      ]
    }
  },
  {
    type: 'decision-callout',
    category: 'outputs',
    name: 'Verdict & Decision Banner',
    description: 'Institutional callout with colored badge, rationale, and signature seal',
    defaultProps: {
      status: 'APPROVED', // 'APPROVED' | 'REQUIRES_REVIEW' | 'REJECTED'
      headline: 'Unanimous Policy Approval Granted',
      rationale: 'All deterministic rules and LLM guardrails satisfied with zero PII leaks.',
      verifier: 'Autonomous Gatekeeper v2.4 (Cryptographically Sealed)'
    }
  },

  // --- Category: Media & Brand Craft ---
  {
    type: 'custom-image',
    category: 'media',
    name: 'Brand Imagery & Visual Asset',
    description: 'Display bespoke uploaded images, logos, architecture diagrams, or art',
    defaultProps: {
      imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80', // Chic abstract 3D artwork
      altText: 'Institutional Visual Identity',
      aspectRatio: '16/9', // '16/9' | '4/3' | '1/1' | 'auto'
      caption: 'Bespoke AI Architecture Blueprint',
      rounded: true,
      maxHeight: 280
    }
  },
  {
    type: 'vector-icon-badge',
    category: 'media',
    name: 'Monogram & Icon Emblem',
    description: 'Posh glowing icon badge to anchor sections or show capabilities',
    defaultProps: {
      icon: 'ShieldCheck', // Lucide icon name
      size: 'lg', // 'sm' | 'md' | 'lg'
      title: 'Cryptographic Provenance',
      description: 'Every inference step is hashed with SHA-256 immutable proof.'
    }
  },
  {
    type: 'lottie-pulse',
    category: 'media',
    name: 'Atmospheric Pulse Animation',
    description: 'Subtle, chic micro-animation indicator demonstrating engine readiness',
    defaultProps: {
      pulseStyle: 'ambient-glow', // 'ambient-glow' | 'radar' | 'soundwave'
      speed: 'gentle', // 'gentle' | 'normal'
      accentLabel: 'Workflow Engine Live & Ready'
    }
  }
];

// 3. Pre-curated Initial Showroom Project Templates
export const createDefaultShowroomApp = (useCaseName = 'Executive Agent Showcase') => {
  return {
    id: 'showroom-app-' + Date.now(),
    name: useCaseName + ' — Client Showroom',
    slug: 'showroom-' + (useCaseName || 'app').toLowerCase().replace(/[^a-z0-9]/g, '-'),
    archetypeId: 'boutique-luxury',
    activeScreenId: 'screen-1',
    screens: [
      {
        id: 'screen-1',
        title: 'Intake & Scenario Dispatch',
        description: 'First touchpoint for client users to submit context and run workflows.',
        widgets: [
          {
            id: 'widget-hero-1',
            type: 'hero-banner',
            props: {
              eyebrow: 'AUTONOMOUS ADVISORY SYSTEM',
              title: useCaseName,
              subtitle: 'Submit raw documents, meeting notes, or strategic scenarios for deep multi-agent synthesis.',
              align: 'left',
              showBadge: true,
              badgeText: 'CONNECTED TO REAL WORKFLOW ENGINE',
              badgeStatus: 'active'
            }
          },
          {
            id: 'widget-image-1',
            type: 'custom-image',
            props: {
              imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
              altText: 'Bespoke Executive Studio',
              aspectRatio: '21/9',
              caption: 'Institutional Intelligence Runtime',
              rounded: true,
              maxHeight: 200
            }
          },
          {
            id: 'widget-prompt-1',
            type: 'prompt-bar',
            props: {
              placeholder: 'Type a scenario, question, or enter briefing parameters to run...',
              buttonLabel: 'Run Workflow & Review Results →',
              binding: {
                triggerWorkflow: true,
                inputKey: 'query',
                targetNodeId: 'agent-core',
                onCompleteNavigateTo: 'screen-2'
              },
              suggestedPrompts: [
                'Evaluate APAC tax transfer exposure for Q4',
                'Synthesize board-level action items with risk weights',
                'Verify deterministic governance constraints'
              ]
            }
          },
          {
            id: 'widget-dropzone-1',
            type: 'file-dropzone',
            props: {
              title: 'Or Drop Meeting Recording / PDF Dossier',
              subtitle: 'Supported formats: MP3, WAV, PDF, CSV, TXT (Direct browser upload)',
              icon: 'UploadCloud',
              binding: {
                triggerWorkflow: true,
                inputKey: 'file',
                autoExecuteOnUpload: false
              }
            }
          }
        ]
      },
      {
        id: 'screen-2',
        title: 'Synthesis & Executive Audit',
        description: 'Screen presenting real workflow results, metrics, and cryptographic proof.',
        widgets: [
          {
            id: 'widget-header-2',
            type: 'page-header',
            props: {
              title: 'Executive Intelligence & Decision Ledger',
              category: 'Autonomous Synthesis Results',
              actionLabel: '← Return to Ingestion',
              actionTrigger: 'navigate-screen-1'
            }
          },
          {
            id: 'widget-kpi-1',
            type: 'kpi-grid',
            props: {
              metrics: [
                { id: 'm1', label: 'Synthesis Confidence', value: '98.9%', delta: '+3.1% vs baseline', status: 'success' },
                { id: 'm2', label: 'Deterministic Gate', value: '100% PASS', delta: 'Zero violations', status: 'success' },
                { id: 'm3', label: 'Processing Time', value: '620ms', delta: 'Sub-second', status: 'neutral' }
              ]
            }
          },
          {
            id: 'widget-result-1',
            type: 'streaming-result',
            props: {
              title: 'Multi-Agent Synthesis Report',
              subtitle: 'Formulated live by the attached foundation model & specialized skills',
              initialContent: `### Executive Summary\n\nThe autonomous agent workflow has successfully evaluated the submitted mandate. Key findings:\n\n1. **Zero Governance Violations**: Deterministic sandbox verified that no unmasked PII or non-compliant fiscal figures breached enterprise perimeter.\n2. **Action Item Extraction**: 3 high-priority follow-ups identified with cryptographic SHA-256 provenance.\n3. **Deterministic Verification**: Alignment gate passed with 98.9% faithfulness score.\n\n*Click "Execute Workflow" on Screen 1 to generate a live, real-time report using the currently connected model.*`,
              showCopyButton: true,
              showExportPdf: true,
              displayStyle: 'editorial'
            }
          },
          {
            id: 'widget-decision-1',
            type: 'decision-callout',
            props: {
              status: 'APPROVED',
              headline: 'Sovereign Institutional Clearance Granted',
              rationale: 'All deterministic constraints satisfied. Output verified and ready for client delivery.',
              verifier: 'KEAOS Autonomous Gateway & Cryptographic Ledger'
            }
          },
          {
            id: 'widget-table-1',
            type: 'comparison-table',
            props: {
              title: 'Action Item Registry & Commitments',
              columns: ['Commitment', 'Owner', 'Priority', 'Cryptographic Proof'],
              rows: [
                ['Deliver revised APAC transfer pricing model', 'Julian Vance', 'CRITICAL', 'SHA-256: 8f9b42...'],
                ['Enforce OAuth v2 token rotation policy', 'Elena Rostova', 'HIGH', 'SHA-256: 3c1a99...'],
                ['Submit quarterly ESG compliance attestation', 'Marcus Thorne', 'STANDARD', 'SHA-256: e42d71...']
              ]
            }
          }
        ]
      }
    ]
  };
};
