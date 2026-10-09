# AGENTS.md — KEAOS Universal Agent Instructions & Architecture Manual
*Authoritative onboarding, architectural specification, and coding guidelines for all AI agents and developers working on KEAOS.*

---

## 1. Executive Mission & Mental Model

**KEAOS (Enterprise Agent Operating Studio)** is an institutional-grade platform for visually designing, testing, auditing, evaluating, and exporting autonomous enterprise agents across multi-agent SDKs.

### Core Philosophy
1. **Pillar Segregation**: Unlike monolithic frameworks that mix memory, tools, and prompts, KEAOS cleanly segregates 10 architectural pillars:
   - **Model Provider** (`model`)
   - **Skills** (`skills`)
   - **MCP Servers** (`mcp`)
   - **Ingestion & Execution Tools** (`tools`)
   - **Ingress Gateway** (`gateway`)
   - **Episodic & Semantic Memory** (`memory`)
   - **Policies & Guardrails** (`policies`)
   - **Cryptographic Audit** (`audit`)
   - **Observability & Tracing** (`observability`)
   - **Cost & Benefit ROI** (`cost-benefit`)
2. **Strictly-Typed Socket Connections**: Canvas connections are not arbitrary. A Memory node cannot connect to a Model socket. Incompatible drops are rejected by the socket enforcer.
3. **Model Agnostic & Zero-Simulation**: KEAOS connects directly to live APIs (**Google GenAI**, **Anthropic**, **OpenAI**, **Ollama local**, and **OpenRouter**). No synthetic mocks; real W3C WebCrypto SHA-256 auditing; real multimodal audio ingestion; real LLM-as-a-judge alignment gate.
4. **Multi-SDK Code Synthesis**: The visual graph can be exported directly into idiomatic Python code for **Google ADK**, **LangGraph**, **LangChain**, **Microsoft AutoGen**, and **CrewAI**.
5. **Authoritative Design Adherence**: All visual screens MUST strictly adhere to `src/design.md` (institutional geometry, angular `0px` radius, deep navy `#001E50`, royal brand blue `#00338D`, taxonomy colors, and full-pill badges).
6. **Strict Anonymity Rule**: **NEVER mention any specific consulting firm or corporation name anywhere in code, comments, UI, or documentation.** The brand is strictly *KEAOS | Enterprise Agent Studio*.

---

## 2. Directory Architecture & Responsibilities

```
KEAOS/
├── .env.example               # Template environment configuration for all 5 LLM providers
├── AGENTS.md                  # This file: Universal AI agent instructions & specifications
├── CLAUDE.md                  # Instructions specifically tailored for Claude Code CLI
├── .cursorrules               # Instructions specifically tailored for Cursor IDE agents
├── README.md                  # Platform overview, quickstart, and feature matrix
├── docs/                      # Deep-dive architecture and development guides
│   ├── ARCHITECTURE.md        # Technical graph engine, socket enforcer, and dispatch pipeline
│   ├── DESIGN_SYSTEM.md       # Design tokens, color system, and UI component standards
│   ├── MULTI_LLM_GUIDE.md     # How to configure, invoke, and extend LLM providers
│   └── USE_CASE_BUILDING_GUIDE.md # Playbook for creating new agent use cases
└── src/
    ├── design.md              # AUTHORITATIVE BRAND & DESIGN SPECIFICATION
    ├── index.css              # Global styles, typography imports, and Tailwind directives
    ├── App.jsx                # Main workspace orchestrator, view modes, and modal managers
    ├── main.jsx               # React 18 DOM mount point
    ├── components/
    │   ├── Header.jsx         # Institutional deep-navy header with view tabs & LLM API badge
    │   ├── Canvas.jsx         # ReactFlow graph workspace with typed socket validator
    │   ├── Palette.jsx        # Sidebar component catalog for 10 segregated pillars
    │   ├── Inspector.jsx      # Dynamic node inspector & multi-LLM foundation model customizer
    │   ├── MakeUseCaseModal.jsx # Multi-SDK framework selector & template bootstrapper
    │   ├── ApiSettingsModal.jsx # 5-tab multi-LLM credential registry with live ping test
    │   ├── MeetingSimulator.jsx # Multimodal input ingestion, execution trace, and results
    │   ├── EvaluationView.jsx # Golden dataset benchmark runner & deployment gatekeeper
    │   ├── CodeExportView.jsx # Multi-SDK Python code viewer with syntax highlighting
    │   ├── common/
    │   │   └── ScreenScaffold.jsx # Standardized institutional screen wrapper for new screens
    │   ├── screens/
    │   │   ├── AuditExplorerView.jsx # Cryptographic SHA-256 audit ledger explorer
    │   │   ├── ObservabilityView.jsx # OpenTelemetry traces, token breakdown, and ROI calculator
    │   │   └── PillarCatalogView.jsx # Full registry and specifications for the 10 pillars
    │   └── nodes/
    │       ├── AgentCoreNode.jsx # Central agent block with 10 strictly-typed input handles
    │       └── PillarNode.jsx    # Modular pillar block with taxonomy-colored top border
    ├── constants/
    │   ├── designTokens.js    # Codified JS design tokens and helper classes from design.md
    │   ├── frameworks.js      # Multi-SDK definitions (Google ADK, LangGraph, AutoGen, etc.)
    │   ├── goldenDataset.js   # Ground-truth benchmark test cases and default thresholds
    │   ├── pillars.js         # Pillar definitions, catalog items, and socket rules
    │   └── sampleMeetings.js  # Realistic enterprise meeting transcripts for testing
    ├── services/
    │   ├── llmService.js      # Universal Multi-LLM engine (Google, Anthropic, OpenAI, Ollama, OpenRouter)
    │   └── geminiService.js   # Google GenAI SDK v2 client wrapper & audio transcription
    └── utils/
        ├── codeGenerators.js  # Python code generation templates for all 5 frameworks
        ├── evaluationEngine.js # Multi-LLM judge evaluation against golden datasets
        └── meetingSimulatorEngine.js # Live agent execution engine with SHA-256 cryptographic audit
```

---

## 3. The 10 Segregated Architectural Pillars & Socket Rules

Each pillar block connects to a specific typed socket on `AgentCoreNode`:

| Pillar ID | Pillar Name | Canvas Socket ID | Taxonomy Color | Max Conn. | Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `model` | Foundation Model | `model-in` | `#00338D` (Blue) | 1 | Reasoning brain (Google, Anthropic, OpenAI, Ollama, OpenRouter) |
| `skills` | Specialized Skills | `skill-in` | `#009A44` (Green) | Unlimited | Structured capabilities (Summarizer, Action Extractor, Decisions) |
| `mcp` | MCP Servers | `mcp-in` | `#00A3A6` (Teal) | Unlimited | Model Context Protocol servers (Calendar, Slack, Jira, Databases) |
| `tools` | Execution Tools | `tools-in` | `#0091DA` (Pacific) | Unlimited | Ingestion & client tools (Audio Transcriber, Doc Parser, Search) |
| `gateway` | Ingress Gateway | `gateway-in` | `#EAAA00` (Amber) | 1 | Rate limiters, token budget caps, circuit breakers, routing |
| `memory` | Memory Store | `memory-in` | `#483698` (Violet) | 1 | Episodic memory, vector search, past meeting commitments |
| `policies` | Policies & Guards | `policies-in` | `#6D2077` (Magenta) | Unlimited | PII masks, confidential data redaction, compliance rules |
| `audit` | Cryptographic Audit | `audit-in` | `#001E50` (Navy) | 1 | Immutable SHA-256 fingerprinting of input transcript + output |
| `observability`| Observability | `observability-in` | `#0091DA` (Pacific) | 1 | OpenTelemetry trace collector, token meter, latency tracker |
| `cost-benefit` | ROI Accounting | `cost-benefit-in` | `#EAAA00` (Amber) | 1 | Unit cost analysis vs labor time saved ($65/hr employee rate) |

### Strict Socket Enforcer Rule
`Canvas.jsx` validates connections via `isValidConnection`. If a user attempts to connect a `memory` node to a `model-in` socket, the connection is blocked, and an institutional alert banner displays the mismatch error.

---

## 4. Multi-LLM Execution Engine (`src/services/llmService.js`)

KEAOS provides a model-agnostic inference layer. When any agent runs or evaluates, it invokes `synthesizeMeetingUniversal`:

```javascript
import { synthesizeMeetingUniversal } from '../services/llmService';

const result = await synthesizeMeetingUniversal({
  provider: 'anthropic', // 'google' | 'anthropic' | 'openai' | 'ollama' | 'openrouter'
  modelId: 'claude-3-5-sonnet-20241022',
  transcript: sanitizedTranscript,
  systemPrompt: agentConfig.prompt,
  temperature: 0.2
});
```

### Provider Implementation Details
1. **Google GenAI**:
   - Uses `@google/genai` (v2.24.0).
   - Multimodal native MP3 audio ingestion via inline Base64 / File API.
   - Enforces strict JSON output via `responseMimeType: 'application/json'`.
2. **Anthropic**:
   - Direct browser `fetch` to `https://api.anthropic.com/v1/messages`.
   - Uses header `'anthropic-dangerous-direct-browser-access': 'true'` to enable direct browser execution.
   - System prompt enforces clean JSON without markdown code fences.
3. **OpenAI**:
   - Direct browser `fetch` to `https://api.openai.com/v1/chat/completions`.
   - Uses `response_format: { type: 'json_object' }`.
   - Audio transcription via `https://api.openai.com/v1/audio/transcriptions` (`whisper-1`).
4. **Ollama (Local / Private)**:
   - Connects to local endpoint (default: `http://localhost:11434/v1/chat/completions`).
   - 100% private, on-device inference with **zero API key required**.
5. **OpenRouter**:
   - Connects to `https://openrouter.ai/api/v1/chat/completions`.
   - Includes `HTTP-Referer` and `X-Title` headers for unified routing to 200+ models.

---

## 5. Design System Strict Adherence (`src/design.md`)

Whenever creating new screens, cards, modals, or buttons, you MUST follow these non-negotiable rules:

1. **Angular 0px Geometry**:
   - ALL structural cards, modals, containers, form inputs, and buttons MUST use `rounded-none` (`0px` border-radius).
   - Only action chips, status badges, and taxonomy pills use `rounded-full` (`9999px`).
2. **Brand Palette**:
   - Primary Header: Deep Navy `#001E50` with `#00338D` bottom border.
   - Primary Buttons / Active Tabs: Royal Brand Blue `#00338D` (hover: `#005EB8`).
   - App Workspace Background: Light subtle gray `#F5F6F8`.
   - Card Backgrounds: Pure White `#FFFFFF` with `#E0E0E0` border.
   - Code Display / Dark Cards: Deep slate `#0B0F19` with `#001438` code blocks.
3. **Taxonomy Accents**:
   - `#EAAA00` (Amber) for Financial / ROI / Gateways
   - `#009A44` (Green) for Skills / Active Status / Verification
   - `#00A3A6` (Teal) for MCP / Infrastructure
   - `#6D2077` (Magenta) for Innovation / Policies / Alerts
   - `#483698` (Violet) for Workforce / Memory
4. **Screen Wrapper Pattern**:
   - Wrap all new screens in `<ScreenScaffold title="..." eyebrow="..." statusText="...">` located in `src/components/common/ScreenScaffold.jsx`.

---

## 6. How Any Model or Developer Can Take Over

### How to add a new Screen
1. Create `src/components/screens/YourNewView.jsx`.
2. Wrap it with `ScreenScaffold` and use `DESIGN_CLASSES` from `src/constants/designTokens.js`.
3. Add a navigation button in `src/components/Header.jsx`.
4. Add the view branch in `src/App.jsx`.

### How to add a new Pillar Component
1. Open `src/constants/pillars.js`.
2. Locate the appropriate pillar (e.g. `skills`, `mcp`, `tools`, `model`).
3. Add an entry to the `items` array with `id`, `name`, `description`, and `config`.
4. It will immediately appear in the Canvas Palette and be connectable to the socket.

### How to add a new Foundation Model Provider
1. Open `src/services/llmService.js`.
2. Add provider metadata to the `PROVIDERS` object.
3. Add inference handling inside `synthesizeMeetingUniversal`.
4. Add testing ping in `testProviderConnection`.
5. It will automatically populate the Inspector, the Credential Registry modal, and the evaluation engine.

---

## 7. Quality & Verification Gates

Before committing or deploying:
- `npm run dev`: Check that Vite runs with 0 compile or runtime warnings.
- `npm run build`: Verify that production bundling succeeds with 0 JSX/TypeScript errors.
- Run the **Golden Dataset Alignment Gate** in the Evaluation view to verify that agent faithfulness is ≥ 90% and action item extraction F1 is ≥ 85%.

---

## 8. Strict Runtime Safety & Scoping Rules (Zero-ReferenceError Mandate)

All agents and developers writing code in KEAOS MUST enforce these three invariant runtime safety rules:

1. **Outer Scope Declaration Invariant in Node Mappings (`nodesWithTheme`, `nodes.map`)**:
   - In any mapping or transformation callback, EVERY property returned in the resulting node or object MUST be explicitly declared and initialized at the very top of the iteration scope (e.g. `let connectedModelName = null; let inheritedModelName = null;`).
   - **FORBIDDEN**: Never introduce or assign a variable inside an `if (n.type === 'agentCore')` block if that variable is referenced in the return object, because other node types (`pillar`, `ingestionNode`, `outputDisplayNode`) will skip the block and trigger a fatal `ReferenceError: [variable] is not defined`.
   - **REQUIRED PATTERN**:
     ```javascript
     return (nodes || []).map(n => {
       // 1. Explicitly initialize all prospective return fields in outer iteration scope
       let agentCounts = n.data?.attachedCounts;
       let connectedModelName = null;
       let inheritedModelName = null;
       let upstreamAgentNames = [];

       if (n.type === 'agentCore') {
         // 2. Populate conditionally
         if (agentCounts.model === 0) {
           inheritedModelName = ...;
         }
       }

       // 3. Safe to return for all node types
       return { ...n, data: { ...n.data, inheritedModelName, connectedModelName } };
     });
     ```

2. **Hook Order & Temporal Dead Zone (TDZ) Invariant**:
   - Fundamental state refs and core callbacks (`pastRef`, `futureRef`, `takeSnapshot`, `undo`, `redo`) MUST ALWAYS be declared BEFORE any `useEffect` or dependent handler that invokes them or includes them in dependency arrays.
   - **FORBIDDEN**: Never write a `useEffect(..., [takeSnapshot])` above the `const takeSnapshot = useCallback(...)` definition line.

3. **Mandatory 3-Point Pre-Flight Verification on Every Code Change**:
   - Before completing any task, check:
     1. Is every newly introduced variable declared in its immediate enclosing scope?
     2. Does every alternate branch (`else`, non-agent nodes, uninitialized state) safely evaluate without throwing?
     3. Are all hook dependencies declared above the hook invocation?

---

## 9. Strict Credential Integrity & Zero-Mock OAuth Invariant

All agents and developers writing code in KEAOS MUST enforce the following integrity rule:

1. **Zero Hardcoded Credentials or Personal Handles**:
   - **ABSOLUTELY FORBIDDEN**: Never hardcode any user's personal handle, email, username, repository name, or token anywhere in code, fallbacks, or mock responses.
   - All credentials MUST originate exclusively from active user inputs or authenticated session storage.

2. **Zero Synthetic OAuth Simulation**:
   - When an OAuth flow is triggered, it MUST initiate a REAL browser authorization handshake (opening the provider's authorization portal, e.g. `https://github.com/login/oauth/authorize`, or the official Device Flow at `https://github.com/login/device`).
   - Never generate dummy tokens (`gho_oauth_...`) or fake verified responses that bypass genuine provider authentication.
   - If an OAuth Client ID or configuration is missing, fail transparently with a clear, honest setup prompt rather than pretending the connection succeeded.

---

## 10. Strict Generalization & Absolute Zero-Hardcoding Mandate

All agents, subagents, and developers writing code or configuring KEAOS MUST enforce this absolute, non-negotiable directive:

1. **Every User Example is Strictly a Use Case**:
   - **MANDATE**: Every example, prompt, sample value, threshold, condition, or scenario provided by the user is **PURELY AN ILLUSTRATIVE USE CASE**.
   - **UNDERSTAND THE UNDERLYING CONCEPT**: The agent must extract and understand the underlying concept, abstraction, and logic the user is trying to convey, rather than fixing or hardcoding the specific example values into the system.
   - **CONFIRM AGAIN IF NEEDED & ACT ACCORDINGLY**: If an instruction or requirement is ambiguous or underspecified, clarify the underlying concept rather than making synthetic assumptions.
   - **ABSOLUTE ZERO-HARDCODING RULE**: **NO HARDCODING AT ALL IN THE SYSTEM, FOR ANY USE CASE, UNLESS SPECIFICALLY AND EXPLICITLY MENTIONED BY THE USER.**

2. **Zero Keyword Intercepts & Zero Synthetic Mock Responses**:
   - **FORBIDDEN**: Never intercept natural language prompts with hardcoded keyword checks (e.g. never check `if (text.includes('token'))` or `if (text.includes('cost'))` to return static tables, mock statuses, or pre-baked numbers like `4000`, `2500`, or `NOMINAL`).
   - **FORBIDDEN**: Never return synthetic mock outputs, dummy tables, fake audit rows, or canned templates.
   - **REQUIRED**: All components (Deterministic Rules, Ingestion, Agents, Memory, Observability, Evaluators) MUST dynamically compile, parse, evaluate, and execute the user's actual logic, using real runtime data and real LLM compilation or real execution engines. If code compilation or evaluation is needed, it must be generated and executed dynamically based on the exact user directive.

---

## 11. Strict Minimalist UI & Zero-Verbose Loading State Mandate

All agents and developers writing code or designing UI in KEAOS MUST enforce this non-negotiable directive:

1. **Zero Verbose Sentences During Loading / Thinking / Background Fetching**:
   - **ABSOLUTELY FORBIDDEN**: Never write out explicit explanatory sentences (e.g. *"I'm looking at it"*, *"It is still working..."*, *"Reasoning through brain..."*, *"Executing connected peripheral tools..."*) or render nested card containers while an agent is thinking or fetching data in the background.
   - **ABSOLUTELY FORBIDDEN**: Never render loud, hyperactive animations (such as jumping bouncing dots, spinning clocks, flashing warning banners, or rainbow progress shimmer bars).

2. **Whispered, Minimalist Indicators Only (Gemini / Claude / ChatGPT Standard)**:
   - When an agent is waiting, thinking, or running background tools, use ONLY a subtle, quiet, non-intrusive indicator:
     - Three subtle pulsing dots or a gentle breathing sparkle with soft opacity easing (`0.4` to `0.9` opacity cycle).
     - No giant card borders, no heavy dark frames, no multi-line progress blocks, and zero verbose text.
   - Keep user controls (such as the ChatGPT-style Stop button) clean and minimal near the input bar without cluttering the conversation stream.



