# Universal Workflow Execution Invariants

This rule applies to all agents, subagents, and workflows in KEAOS.

## Invariant 1: Universal Observable Sequential Glowing Parity
- When ANY workflow executes (via Trigger, "Execute Workflow" button, or node quick-run), EVERY node triggered at any point in time MUST visibly illuminate with its taxonomy color on the canvas in real time.
- **Trigger Nodes**: Render expanding concentric sonar waves (`animate-ping`), glowing active border, and flashing Zap glyph.
- **Pillar Nodes (Model, Skills, MCP, Gateway, Tools, Memory, Policies, Audit)**: Render scaled token disc (`scale-110`), glowing border ring with taxonomy shadow, animated radar ripple wave, and active floating beacon.
- **Agent Core Nodes**: Render glowing border (`ring-4 ring-[#0091DA]/30`), animated spinning brain icon, and active status halo.
- **Deterministic Nodes**: Render amber glowing border (`ring-4 ring-amber-400/40`), glowing diamond socket handles, and live latency tracker.
- **Output Display Nodes**: Render emerald pulsing halo (`ring-4 ring-[#10B981]/50`) and active stream indicator in both collapsed and expanded states.
- **Connecting Wires**: Pulse with thick glowing dashed lines transmitting data in the direction of the flow.
- **Observable Human Pacing**: Step transitions MUST incorporate deliberate 250–380ms delays so the visual execution path is clearly observable by the user.

## Invariant 2: Absolute Zero Mandatory File/MP3 Ingestion
- Workflows NEVER require an MP3, audio file, meeting transcript, or file upload to run.
- The legacy meeting-audio check is permanently prohibited across all workflows.
- A workflow without an ingestion node or trigger node can run immediately on clicking "Execute Workflow".
- If an Ingestion Node exists, it is strictly optional and flexible (accepts text, PDF, CSV, JSON, or can be skipped).

## Invariant 3: Absolute Zero Presets & Pure Real Data
- **ABSOLUTELY FORBIDDEN**: Never generate or hardcode dummy/canned presets anywhere in the system (e.g. fake invoices with `$48,500.00`, canned webhooks, preset proposal buttons, dummy tables, or synthetic batch data).
- All components (Triggers, Agents, Deterministic Rules, Routers, Approvals, Ingestion, MCP Gateways) MUST operate exclusively on authentic real-time inputs:
  - Real MCP queries (e.g. `executeRealMcpTool('list_messages')`)
  - Real user-typed directives and prompt instructions
  - Real user-uploaded documents and payloads
  - Real live webhooks and API watcher HTTP responses
- If a test or run is initiated without upstream input, default cleanly to an empty object `{}` or transparently prompt the user for input rather than injecting synthetic mock records.

## Invariant 4: Bottom Chat Drawer Remains Closed on Execution
- Hitting "Execute Workflow" or running any node MUST NEVER expand or force-open the bottom drawer into chat mode or fleet mode.
- The drawer must stay collapsed at 40px height to leave the canvas unobstructed.
