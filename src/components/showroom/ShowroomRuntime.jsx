import React, { useState } from 'react';
import { 
  ArrowLeft, 
  ExternalLink, 
  ShieldCheck, 
  Maximize2, 
  Minimize2, 
  Layers,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { SHOWROOM_ARCHETYPES } from '../../constants/showroomSchema';
import { RenderShowroomWidget } from './ShowroomWidgets';
import { executeShowroomWorkflow } from './showroomExecutionBridge';

export default function ShowroomRuntime({
  showroomApp,
  activeUseCase,
  nodes = [],
  edges = [],
  onExitPreview,
  isStandalone = false
}) {
  const theme = SHOWROOM_ARCHETYPES[showroomApp.archetypeId] || SHOWROOM_ARCHETYPES['boutique-luxury'];
  const [currentScreenId, setCurrentScreenId] = useState(showroomApp.activeScreenId || showroomApp.screens[0]?.id);
  const [isExecuting, setIsExecuting] = useState(false);
  const [liveOutputs, setLiveOutputs] = useState({});
  const [isFullscreen, setIsFullscreen] = useState(false);

  const currentScreen = showroomApp.screens.find(s => s.id === currentScreenId) || showroomApp.screens[0];

  const handleNavigate = (targetScreenId) => {
    // Check if target is a special slug or direct ID
    if (targetScreenId === 'navigate-screen-1') {
      setCurrentScreenId(showroomApp.screens[0]?.id);
    } else if (targetScreenId) {
      const match = showroomApp.screens.find(s => s.id === targetScreenId);
      if (match) setCurrentScreenId(match.id);
    }
  };

  const handleExecute = async (userPrompt, binding) => {
    setIsExecuting(true);
    try {
      const res = await executeShowroomWorkflow({
        userPrompt,
        binding,
        activeUseCase,
        nodes,
        edges
      });

      if (res.output) {
        setLiveOutputs(prev => ({
          ...prev,
          [currentScreenId]: res.output,
          global: res.output
        }));
      }

      if (res.targetScreenId) {
        handleNavigate(res.targetScreenId);
      }
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div 
      className={`w-full h-full flex flex-col transition-all overflow-hidden ${isFullscreen ? 'fixed inset-0 z-50' : 'relative'}`}
      style={{
        backgroundColor: theme.bgApp,
        color: theme.textPrimary,
        fontFamily: theme.fontBody
      }}
    >
      {/* Posh App Shell Bar */}
      <header 
        className="h-14 px-6 md:px-12 flex items-center justify-between shrink-0 border-b transition-colors z-20"
        style={{
          backgroundColor: theme.bgCard,
          borderColor: theme.borderCard
        }}
      >
        {/* Brand Monogram & App Title */}
        <div className="flex items-center gap-3">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs tracking-wider"
            style={{
              backgroundColor: theme.accentLight,
              color: theme.accentColor,
              border: `1px solid ${theme.borderCard}`
            }}
          >
            {showroomApp.name ? showroomApp.name.charAt(0) : 'K'}
          </div>

          <div>
            <h2 className="text-sm font-bold tracking-tight leading-tight" style={{ fontFamily: theme.fontDisplay }}>
              {showroomApp.name}
            </h2>
            <p className="text-[10px] font-mono" style={{ color: theme.textMuted }}>
              Institutional Client Portal • Live Connected
            </p>
          </div>
        </div>

        {/* Center: Multi-Screen Tab Stepper */}
        {showroomApp.screens.length > 1 && (
          <nav className="hidden md:flex items-center gap-1 p-1 rounded-lg border" style={{ borderColor: theme.borderCard, backgroundColor: theme.bgApp }}>
            {showroomApp.screens.map((screen, idx) => {
              const isActive = screen.id === currentScreenId;
              return (
                <button
                  key={screen.id}
                  onClick={() => setCurrentScreenId(screen.id)}
                  className="px-3.5 py-1 text-xs font-semibold rounded transition-all flex items-center gap-1.5"
                  style={{
                    backgroundColor: isActive ? theme.bgCard : 'transparent',
                    color: isActive ? theme.accentColor : theme.textMuted,
                    boxShadow: isActive ? theme.cardShadow : 'none'
                  }}
                >
                  <span className="font-mono text-[10px] opacity-70">{idx + 1}.</span>
                  <span>{screen.title}</span>
                </button>
              );
            })}
          </nav>
        )}

        {/* Right Controls: Exit Preview & Fullscreen */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded text-xs border transition-colors"
            style={{ borderColor: theme.borderCard, color: theme.textSecondary }}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Experience'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {onExitPreview && (
            <button
              onClick={onExitPreview}
              className="px-3 py-1.5 rounded text-xs font-semibold border transition-all flex items-center gap-1.5"
              style={{
                backgroundColor: theme.accentLight,
                borderColor: theme.borderCard,
                color: theme.accentColor
              }}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Studio</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Canvas Scroll Area */}
      <main className="flex-1 overflow-y-auto px-6 py-8 md:px-16 md:py-12">
        <div className="max-w-4xl mx-auto flex flex-col gap-6 animate-fadeIn">
          {/* Active Screen Widgets */}
          {currentScreen?.widgets && currentScreen.widgets.length > 0 ? (
            currentScreen.widgets.map((widget) => (
              <RenderShowroomWidget
                key={widget.id}
                widget={widget}
                theme={theme}
                isSelected={false}
                onExecute={handleExecute}
                onNavigate={handleNavigate}
                liveOutput={liveOutputs[currentScreenId] || liveOutputs.global}
                isExecuting={isExecuting}
              />
            ))
          ) : (
            <div className="py-20 text-center border-2 border-dashed rounded-xl" style={{ borderColor: theme.borderCard }}>
              <p className="text-sm" style={{ color: theme.textMuted }}>
                No widgets placed on this screen yet. Switch to Studio to add components.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Institutional Micro Footer */}
      <footer 
        className="h-10 px-8 flex items-center justify-between text-[11px] font-mono border-t shrink-0 opacity-80"
        style={{ borderColor: theme.borderCard, color: theme.textMuted, backgroundColor: theme.bgCard }}
      >
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>W3C WebCrypto SHA-256 Audit Sealed</span>
        </div>
        <div>
          <span>KEAOS Autonomous Engine Runtime</span>
        </div>
      </footer>
    </div>
  );
}
