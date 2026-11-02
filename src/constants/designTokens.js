/**
 * KEAOS DESIGN TOKENS
 * Authoritative JavaScript tokens and helper classes adhering strictly to src/design.md (v2.0)
 * Soft Neo-Modernist Edition with 5-Color Pentagon Palette.
 * 
 * Rules for all screens and components:
 * 1. Geometry: Continuous concentric curvature (Squircles).
 *    - Structural Containers & Cards: 22px (rounded-[22px] / rounded-3xl).
 *    - Floating Badges & Action Buttons: 16px (rounded-2xl).
 *    - Inner Trays & Ribbons: 12px (rounded-xl).
 *    - Status Badges, Sockets, and Action Chips: 9999px (rounded-full).
 * 2. 5-Color Pentagon Palette:
 *    - Royal Navy (#00338D): Primary brand anchor, high-contrast dark accents.
 *    - Electric Blue (#1E49E2): Interactive velocity, hovers, secondary CTAs.
 *    - Vivid Cyan (#00B8F5): Horizontal dataflow sockets, live execution pulse, OTel.
 *    - Vibrant Magenta (#FD349C): Top security policy socket, compliance alerts, error states.
 *    - Electric Violet (#7213EA): Cognitive routing, memory stores, capability tags.
 * 3. Elevation & Surfaces:
 *    - Frosted glassmorphism with backdrop-blur and multi-layered ambient drop shadows.
 *    - Inner glass top-bevel highlights (inset 0 1px 0).
 * 4. Strict Anonymity: No proprietary corporate or consulting firm names allowed anywhere.
 */

export const DESIGN_TOKENS = {
  // Brand Color Palette (Pentagon 5-Facet Tokens)
  colors: {
    royalNavy: '#00338D',     // Primary brand color, primary CTAs, active states
    electricBlue: '#1E49E2',  // Interactive hovers, velocity, secondary CTAs
    vividCyan: '#00B8F5',     // Dataflow sockets, active pulse, live telemetry
    vibrantMagenta: '#FD349C',// Governance sockets, alerts, security policies
    electricViolet: '#7213EA',// Memory stores, auxiliary routing

    // Dual-Theme Surface & Neutral Colors
    surface: {
      canvasLight: '#EDF2F7', // Soft ambient slate canvas
      canvasDark: '#070A12',  // Deep obsidian canvas
      cardLight: 'rgba(255, 255, 255, 0.95)',
      cardDark: 'rgba(8, 14, 28, 0.92)',
      trayLight: 'rgba(244, 247, 251, 0.85)',
      trayDark: 'rgba(4, 8, 19, 0.90)',
      textPrimaryLight: '#001E50',
      textPrimaryDark: '#FFFFFF',
      textSecondaryLight: '#4B5563',
      textSecondaryDark: '#94A3B8',
      textMuted: '#64748B',
      borderLight: 'rgba(226, 232, 240, 0.90)',
      borderDark: 'rgba(255, 255, 255, 0.09)'
    }
  },

  // Geometry & Border Radii (Continuous Squircle Hierarchy)
  radii: {
    card: '22px',             // Structural cards, modal panels (rounded-[22px])
    badge: '16px',            // Floating icon badges, primary action buttons (rounded-2xl)
    tray: '12px',             // Recessed telemetry trays, inner ribbons (rounded-xl)
    pill: '9999px'            // Status badges, sockets, action chips (rounded-full)
  },

  // Typography Hierarchy
  typography: {
    fontFamilies: {
      display: '"Univers", "Helvetica Neue", Arial, sans-serif',
      body: 'Arial, "Helvetica Neue", Helvetica, sans-serif',
      mono: 'Consolas, Monaco, "Courier New", monospace'
    },
    sizes: {
      heroDisplay: '3.25rem', // 52px
      sectionH1: '2.5rem',    // 40px
      subheadingH2: '1.75rem',// 28px
      cardTitleH3: '1.25rem', // 20px
      eyebrow: '0.75rem',     // 12px uppercase bold
      lead: '1.125rem',       // 18px
      body: '0.9375rem',      // 15px
      caption: '0.75rem',     // 12px
      cta: '0.875rem'         // 14px semibold
    }
  },

  // Elevation, Ambient Shadows & Glass Highlights
  shadows: {
    cardLight: '0 16px 36px rgba(0, 51, 141, 0.08), 0 2px 8px rgba(0, 0, 0, 0.03)',
    cardDark: '0 20px 45px rgba(0, 0, 0, 0.70)',
    trayLightInset: 'inset 0 1px 3px rgba(0, 0, 0, 0.04)',
    trayDarkInset: 'inset 0 2px 5px rgba(0, 0, 0, 0.60)',
    selectionAura: '0 0 26px rgba(0, 184, 245, 0.40)',
    executionPulse: '0 0 30px rgba(0, 184, 245, 0.50)'
  }
};

/**
 * Standard Tailwind CSS class strings adhering strictly to design.md (v2.0)
 * Soft Neo-Modernist surfaces with frosted glass depth and tactile squircle geometry.
 */
export const DESIGN_CLASSES = {
  // Container & Card Classes (Squircles with multi-stop elevation)
  card: 'bg-white/95 dark:bg-[#080E1C]/92 border border-slate-200/90 dark:border-white/[0.09] rounded-[22px] backdrop-blur-xl shadow-[0_16px_36px_rgba(0,51,141,0.08),0_2px_8px_rgba(0,0,0,0.03)] dark:shadow-[0_20px_45px_rgba(0,0,0,0.7)]',
  cardHover: 'transition-all duration-200 hover:shadow-[0_20px_42px_rgba(0,51,141,0.14)] dark:hover:shadow-[0_24px_50px_rgba(0,0,0,0.85)] hover:scale-[1.01]',
  
  // Recessed Telemetry Tray
  recessedTray: 'bg-slate-100/80 dark:bg-[#040813]/90 border border-slate-200/80 dark:border-white/[0.06] rounded-xl shadow-[inset_0_1px_3px_rgba(0,0,0,0.03)] dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]',

  // Headers & Subheaders
  screenHeader: 'bg-white/90 dark:bg-[#080E1C]/90 backdrop-blur-xl border-b border-slate-200/80 dark:border-white/[0.08] text-[#001E50] dark:text-white px-6 py-4 flex items-center justify-between shadow-xs',
  sectionTitle: 'text-sm font-bold text-[#001E50] dark:text-white tracking-tight',
  eyebrow: 'text-[10px] font-bold uppercase tracking-[0.08em] text-[#00B8F5] font-mono',
  
  // Buttons (Tactile Squircle with subtle spring response)
  buttonPrimary: 'px-4 py-2 text-xs font-bold bg-[#00338D] hover:bg-[#1E49E2] text-white active:scale-[0.97] rounded-2xl transition-all duration-150 shadow-[0_4px_14px_rgba(0,51,141,0.3)] focus:outline-none focus:ring-2 focus:ring-[#00B8F5]',
  buttonSecondary: 'px-4 py-2 text-xs font-bold bg-white dark:bg-white/[0.05] text-[#00338D] dark:text-[#00B8F5] border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10 active:scale-[0.97] rounded-2xl transition-all duration-150 shadow-xs focus:outline-none focus:ring-2 focus:ring-[#00B8F5]',
  buttonDanger: 'px-4 py-2 text-xs font-bold bg-[#FD349C] text-white hover:bg-[#FD349C]/90 active:scale-[0.97] rounded-2xl transition-all duration-150 shadow-[0_4px_14px_rgba(253,52,156,0.35)]',
  buttonTertiary: 'px-3 py-1.5 text-xs font-semibold text-[#00338D] dark:text-[#00B8F5] hover:bg-[#00338D]/10 dark:hover:bg-white/5 active:scale-[0.97] rounded-xl transition-all duration-150',

  // Status & Wayfinding Pills (9999px Full Pill mapped to Pentagon Colors)
  statusPillActive: 'px-2.5 py-0.5 text-[10px] font-mono font-bold rounded-full bg-[#00B8F5]/15 text-[#00B8F5] border border-[#00B8F5]/30 shadow-[0_2px_8px_rgba(0,184,245,0.2)]',
  statusPillPending: 'px-2.5 py-0.5 text-[10px] font-mono font-bold rounded-full bg-[#1E49E2]/15 text-[#1E49E2] border border-[#1E49E2]/30 shadow-xs',
  statusPillAlert: 'px-2.5 py-0.5 text-[10px] font-mono font-bold rounded-full bg-[#FD349C]/15 text-[#FD349C] border border-[#FD349C]/30 shadow-[0_2px_8px_rgba(253,52,156,0.2)]',
  statusPillBrand: 'px-2.5 py-0.5 text-[10px] font-mono font-bold rounded-full bg-[#00338D]/15 text-[#00338D] dark:text-[#00B8F5] border border-[#00338D]/25',
  statusPillViolet: 'px-2.5 py-0.5 text-[10px] font-mono font-bold rounded-full bg-[#7213EA]/15 text-[#7213EA] border border-[#7213EA]/30',

  // Form Controls (Squircles with clean focus auras)
  input: 'w-full px-3.5 py-2.5 bg-white dark:bg-[#040813]/90 border border-slate-200/90 dark:border-white/[0.08] text-xs text-[#001E50] dark:text-white rounded-xl focus:outline-none focus:border-[#00B8F5] focus:ring-2 focus:ring-[#00B8F5]/30 transition-all placeholder-slate-400',
  textarea: 'w-full p-3.5 bg-white dark:bg-[#040813]/90 border border-slate-200/90 dark:border-white/[0.08] text-xs text-[#001E50] dark:text-white rounded-xl focus:outline-none focus:border-[#00B8F5] focus:ring-2 focus:ring-[#00B8F5]/30 resize-none transition-all placeholder-slate-400'
};
