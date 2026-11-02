# Design System Specification: KEAOS Studio
**Document Version:** 2.0.0 (Soft Neo-Modernist Edition)  
**Scope:** Brand Tokens, Soft-Modern Geometry, Pentagon Color System, Component Blueprints, and Dual-Theme Specs.

---

## 1. Brand Architecture & Design Foundations

* **Brand Posture:** Institutional, hyper-precise, tactile, modern enterprise operating system.
* **Aesthetic Philosophy:** **Soft Neo-Modernist / Frosted Glass-Clay Operating Studio**. Combines architectural precision with tactile physical depth, continuous curvature (squircles), frosted glass overlays, and multi-layered ambient elevation.
* **Strict Anonymity Rule:** NEVER mention any specific external consulting firm or corporation name anywhere in code, comments, UI, or documentation. The platform brand is strictly **KEAOS | Enterprise Agent Operating Studio**.
* **Layout Principle:** Floating island modularity (toolbars, docks, and prompt bars float detached from viewport edges with clean margins), bilateral clustered metadata density, and breathing negative space.
* **Accessibility Target:** WCAG 2.1 Level AA / AAA compliant contrast ratios across all Light Mode and Dark Mode surfaces.

---

## 2. Core Color System: The 5-Color Pentagon Palette

All primary, interactive, socket, and badge colors are strictly mapped to the **5-Color Pentagon Palette**:

### 2.1 The 5 Brand Facet Tokens
| Token | Hex | RGB | Functional Role & Semantic Mapping |
| :--- | :--- | :--- | :--- |
| `--color-royal-navy` | `#00338D` | `rgb(0, 51, 141)` | **Primary Brand Anchor**: High-contrast headlines, deep brand surfaces, active tab indicators, primary CTAs |
| `--color-electric-blue`| `#1E49E2` | `rgb(30, 73, 226)` | **Interactive Velocity**: Secondary CTAs, hover states, host server glyphs, LangGraph framework pills |
| `--color-vivid-cyan` | `#00B8F5` | `rgb(0, 184, 245)` | **Dataflow & Telemetry**: Horizontal inflow/outflow sockets, active execution pulse, selection rings, OTel badges |
| `--color-vibrant-magenta`| `#FD349C` | `rgb(253, 52, 156)` | **Governance & Guardrails**: Top policy sockets, compliance alerts, error states, CrewAI framework pills |
| `--color-electric-violet`| `#7213EA` | `rgb(114, 19, 234)` | **Cognitive Orchestration**: Memory stores, model routing, auxiliary capability badges |

### 2.2 Dual-Theme Surfaces & Neutrals

#### Light Mode: Sculpted Porcelain Surface
| Token | Hex / RGBA | Functional Role |
| :--- | :--- | :--- |
| `--color-canvas-bg-light` | `#EDF2F7` | Soft slate-grey ambient canvas (allows white glass cards to pop) |
| `--color-card-bg-light` | `rgba(255, 255, 255, 0.95)` | Primary card & modal surface with `backdrop-blur-xl` |
| `--color-tray-bg-light` | `rgba(244, 247, 251, 0.85)` | Recessed telemetry trays, inner metadata ribbons |
| `--color-card-border-light`| `rgba(226, 232, 240, 0.9)` | Subtle card perimeter border with `rgba(0, 51, 141, 0.08)` sheen |
| `--color-text-primary-light`| `#001E50` | Deep Navy headline text (AAA contrast) |
| `--color-text-secondary-light`| `#4B5563` | Subtitles, metadata, form labels |
| `--color-text-muted-light` | `#94A3B8` | Micro-labels, timestamps, inactive icons |

#### Dark Mode: Luminous Obsidian Surface
| Token | Hex / RGBA | Functional Role |
| :--- | :--- | :--- |
| `--color-canvas-bg-dark` | `#070A12` | Ultra-deep obsidian workspace canvas |
| `--color-card-bg-dark` | `rgba(8, 14, 28, 0.92)` | Deep navy-obsidian surface with `backdrop-blur-2xl` |
| `--color-tray-bg-dark` | `rgba(4, 8, 19, 0.90)` | Inset digital telemetry tray, terminal console backgrounds |
| `--color-card-border-dark` | `rgba(255, 255, 255, 0.09)`| Translucent boundary with subtle electric blue sheen |
| `--color-text-primary-dark` | `#FFFFFF` | Crisp white headline text (AAA contrast) |
| `--color-text-secondary-dark`| `#94A3B8` | Cool slate metadata and secondary copy |
| `--color-text-muted-dark` | `#64748B` | Monospace timestamps, inactive badges |

---

## 3. Shape, Geometry & Border Radii

KEAOS enforces **continuous concentric curvature (squircles)**. Nested elements maintain optical harmony by scaling radii proportionally:

```
┌────────────────────────────────────────────────────────┐
│  Structural Card: rounded-[22px]                       │
│  ╭──────────────────────────────────────────────────╮  │
│  │  Floating Squircle Badge: rounded-2xl (16px)     │  │
│  │  ╭────────────────────────────────────────────╮  │  │
│  │  │  Recessed Telemetry Tray: rounded-xl (12px)│  │  │
│  │  │  ( ● Status )                [ Pill: 9999px]│  │  │
│  │  ╰────────────────────────────────────────────╯  │  │
│  ╰──────────────────────────────────────────────────╯  │
└────────────────────────────────────────────────────────┘
```

* **Structural Cards & Modals:** `22px` (`rounded-[22px]` / `rounded-3xl`).
* **Floating Squircle Icon Badges & Action Buttons:** `16px` (`rounded-2xl`).
* **Recessed Trays & Nested Ribbons:** `12px` (`rounded-xl`).
* **Status Indicators, Sockets, Chips & Action Pills:** `9999px` (`rounded-full`).

---

## 4. Elevation, Lighting & Depth Physics

KEAOS uses multi-stop diffused ambient drop shadows paired with top-edge glass bevels:

* **Light Mode Elevation:**
  * Card Default: `box-shadow: 0 16px 36px rgba(0, 51, 141, 0.08), 0 2px 8px rgba(0, 0, 0, 0.03), inset 0 1px 1px rgba(255, 255, 255, 0.9);`
  * Card Hover: `box-shadow: 0 20px 42px rgba(0, 51, 141, 0.14), inset 0 1px 1px rgba(255, 255, 255, 0.95);`
  * Inset Telemetry Tray: `box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.04);`
* **Dark Mode Elevation:**
  * Card Default: `box-shadow: 0 20px 45px rgba(0, 0, 0, 0.70), inset 0 1px 0 rgba(255, 255, 255, 0.12);`
  * Card Hover: `box-shadow: 0 24px 50px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.18);`
  * Inset Telemetry Tray: `box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.60);`
* **Card Selection State:** `ring-2 ring-[#00B8F5] shadow-[0_0_26px_rgba(0,184,245,0.40)]`
* **Running Execution Aura:** `ring-2 ring-[#00B8F5] shadow-[0_0_30px_rgba(0,184,245,0.50)] animate-pulse`

---

## 5. Typography System

* **Display & Headings:** `"Univers"`, `"Helvetica Neue"`, `Arial`, sans-serif (SemiBold / Bold).
* **Body / System Text:** `Arial`, `"Helvetica Neue"`, `Helvetica`, sans-serif (Regular / Medium).
* **Data, Telemetry & Code:** `Consolas`, `Monaco`, `"Courier New"`, monospace.
* **Hierarchy:**
  * **Card Title:** `13px` SemiBold (`tracking-tight`)
  * **Endpoint / Micro-Pill:** `10px` Monospace (`tracking-normal`)
  * **Framework / Status Badges:** `9px` or `10px` Monospace Bold Uppercase (`tracking-wider`)
  * **Telemetry Metric:** `10px` or `11px` Monospace Bold (`[ 142ms ]`)

---

## 6. Component Blueprint Specifications

### 6.1 Canvas Node Blueprint
* **Outer Chassis:** `w-[290px] rounded-[22px] p-3.5 backdrop-blur-xl border`.
* **Top Header Row:**
  * Left: Tactile Squircle Icon Badge (`w-9 h-9 rounded-2xl flex items-center justify-center`). Gradient fill from `#00B8F5` via `#1E49E2` to `#00338D`.
  * Title & Endpoint: Node name (`text-xs font-bold`) paired with a monospace domain micro-pill.
  * Right: Framework Pill Badge (`rounded-full px-2.5 py-0.5 text-[9px] uppercase font-bold`).
* **Middle Telemetry Ribbon:** `rounded-xl px-3 py-1.5` displaying `Host: LOCALHOST` and `∿ OTel 2.0`.
* **Bottom Inset Telemetry Tray:** `rounded-xl p-2 flex items-center justify-between` featuring a live pulsing status dot (`#00B8F5` for running/complete, `#FD349C` for error, `#94A3B8` for idle) and latency badge.

### 6.2 Strictly-Typed Sockets
* **Horizontal Pipeline Sockets (Left: `in`, Right: `out`):**
  * Color: **Vivid Cyan (`#00B8F5`)**
  * Styling: `w-3 h-3 rounded-full border-2 border-white dark:border-[#080E1C] shadow-[0_2px_8px_rgba(0,184,245,0.5)]`
* **Vertical Governance Socket (Top: `policy-in`):**
  * Color: **Vibrant Magenta (`#FD349C`)**
  * Styling: `w-3 h-3 rounded-full border-2 border-white dark:border-[#080E1C] shadow-[0_2px_8px_rgba(253,52,156,0.5)]`

### 6.3 Floating Navigation Dock & Island Elements
* Floating capsule styling (`rounded-full` or `rounded-3xl` with detached viewport margins).
* Background: `backdrop-blur-2xl` with soft dual-stop shadows.
* Action buttons use soft-hover lifts (`hover:scale-105 active:scale-95`).

---

## 7. Ready-to-Use CSS Implementation Tokens

```css
:root {
  /* 5-Color Pentagon Palette */
  --keaos-royal-navy: #00338D;
  --keaos-electric-blue: #1E49E2;
  --keaos-vivid-cyan: #00B8F5;
  --keaos-vibrant-magenta: #FD349C;
  --keaos-electric-violet: #7213EA;

  /* Dual-Theme Neutrals (Light Mode) */
  --keaos-canvas-light: #EDF2F7;
  --keaos-surface-light: rgba(255, 255, 255, 0.95);
  --keaos-tray-light: rgba(244, 247, 251, 0.85);
  --keaos-border-light: rgba(226, 232, 240, 0.90);
  --keaos-text-primary-light: #001E50;
  --keaos-text-secondary-light: #4B5563;

  /* Dual-Theme Neutrals (Dark Mode) */
  --keaos-canvas-dark: #070A12;
  --keaos-surface-dark: rgba(8, 14, 28, 0.92);
  --keaos-tray-dark: rgba(4, 8, 19, 0.90);
  --keaos-border-dark: rgba(255, 255, 255, 0.09);
  --keaos-text-primary-dark: #FFFFFF;
  --keaos-text-secondary-dark: #94A3B8;

  /* Continuous Squircle Radii */
  --radius-card: 22px;
  --radius-badge: 16px;
  --radius-tray: 12px;
  --radius-pill: 9999px;

  /* Shadows & Glass Bevels */
  --shadow-light-card: 0 16px 36px rgba(0, 51, 141, 0.08), 0 2px 8px rgba(0, 0, 0, 0.03);
  --shadow-dark-card: 0 20px 45px rgba(0, 0, 0, 0.70);
  --glass-top-light: inset 0 1px 1px rgba(255, 255, 255, 0.90);
  --glass-top-dark: inset 0 1px 0 rgba(255, 255, 255, 0.12);
}
```
