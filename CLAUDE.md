# CLAUDE.md — Claude Code Developer & Agent Guidelines

## Project Overview
**KEAOS (Enterprise Agent Operating Studio)** is an institutional-grade platform for visual multi-agent architecture design, multimodal meeting intelligence, multi-LLM execution, and cross-framework code synthesis.

For complete architectural specifications, see **`AGENTS.md`** and **`src/design.md`**.

---

## Core Commands
- `npm run dev`: Start Vite development server with HMR on `http://localhost:5173/`
- `npm run build`: Build production bundle into `dist/`
- `npm run preview`: Preview production build locally

---

## Non-Negotiable Architectural & Design Constraints
1. **Model Agnostic Inference**: Never hardcode Gemini or any single LLM. Use `synthesizeMeetingUniversal` and `PROVIDERS` from `src/services/llmService.js` supporting **Google**, **Anthropic**, **OpenAI**, **Ollama (local)**, and **OpenRouter**.
2. **Authoritative Design System (`src/design.md`)**:
   - Angular `0px` border-radius (`rounded-none`) for all structural cards, containers, inputs, and buttons.
   - `9999px` border-radius (`rounded-full`) exclusively for status pills, badges, and action chips.
   - Deep Navy `#001E50` header, Royal Blue `#00338D` CTAs, Subtle Gray `#F5F6F8` workspace surface.
   - Reusable screens MUST use `ScreenScaffold` (`src/components/common/ScreenScaffold.jsx`) and `DESIGN_CLASSES` (`src/constants/designTokens.js`).
3. **Strict Anonymity Rule**: Absolutely ZERO mention of any specific corporate consulting firm or company name anywhere in code, comments, UI, or artifacts. Brand is strictly *KEAOS | Enterprise Agent Studio*.
4. **Pillar Segregation**: The 10 pillars (Model, Skills, MCP, Tools, Gateway, Memory, Policies, Audit, Observability, Cost & Benefit) must remain strictly segregated with typed socket enforcement on the visual canvas.
5. **Strict Variable Scoping & Zero-ReferenceError Mandate**:
   - In all mapping functions (`nodesWithTheme`, `nodes.map`), ALWAYS initialize all returned data fields (`let connectedModelName = null; let inheritedModelName = null;`) at the top of the outer map iteration scope. Never introduce variables inside an `if (n.type === ...)` block that are referenced in the return object.
   - Declare helper callbacks/refs (`takeSnapshot`, `undo`, `redo`) BEFORE any `useEffect` that calls them or lists them in dependencies.

---

## Key Files to Know
- `src/design.md`: Authoritative design specification
- `src/constants/designTokens.js`: Programmatic design tokens and utility classes
- `src/constants/pillars.js`: The 10 segregated pillars and socket rules
- `src/services/llmService.js`: Universal multi-LLM execution engine
- `src/utils/meetingSimulatorEngine.js`: Simulation and live meeting synthesis engine
- `src/utils/evaluationEngine.js`: Golden dataset benchmark runner and judge scoring
- `src/components/common/ScreenScaffold.jsx`: Base wrapper for all screens
