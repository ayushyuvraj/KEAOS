import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Sparkles,
  Rocket,
  ChevronDown,
  ChevronUp,
  Mic,
  MicOff,
  ArrowUp,
  X,
  Key,
  CheckCircle2,
  Clock,
  AlertCircle,
  HelpCircle,
  Layers,
  Check,
  Maximize2,
  RotateCcw,
  Zap,
  Sliders
} from 'lucide-react';
import { PROVIDERS, getProviderCredential, getCachedDiscoveredModels, getAllConfiguredProviders } from '../services/llmService';
import { PROVIDER_LOGOS } from '../constants/providerLogos';
import { synthesizeCanvasWorkflow, computeArchitectLayout } from '../services/aiCanvasArchitectService';

export default function CanvasPromptBar({
  nodes = [],
  edges = [],
  setNodes,
  setEdges,
  takeSnapshot,
  rfInstance,
  isDarkMode = true,
  onToast,
  isDrawerExpanded = false
}) {
  const [promptText, setPromptText] = useState('');
  const [isBuilding, setIsBuilding] = useState(false);
  const [currentStepText, setCurrentStepText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isAgentLogOpen, setIsAgentLogOpen] = useState(false);
  const [agentLogs, setAgentLogs] = useState([]);
  const [clarification, setClarification] = useState(null); // { question, options }
  const [safeCanvasPending, setSafeCanvasPending] = useState(null); // { result, prompt }
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef(null);
  const recognitionRef = useRef(null);
  const basePromptRef = useRef('');
  const logContainerRef = useRef(null);

  // Model & Provider Selection State
  const [selectedProvider, setSelectedProvider] = useState(() => {
    return localStorage.getItem('keaos_prompt_provider') || 'google';
  });

  const [selectedModelId, setSelectedModelId] = useState(() => {
    const prov = localStorage.getItem('keaos_prompt_provider') || 'google';
    return localStorage.getItem(`keaos_prompt_model_${prov}`) || PROVIDERS[prov]?.defaultModel || 'gemini-2.0-flash';
  });

  const [isProviderMenuOpen, setIsProviderMenuOpen] = useState(false);
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);

  // Check if active provider has credentials
  const hasCredential = useMemo(() => {
    if (selectedProvider === 'ollama') return true;
    const cred = getProviderCredential(selectedProvider);
    return Boolean(cred);
  }, [selectedProvider]);

  // Derived compatible models for the chosen provider
  const availableModels = useMemo(() => {
    const cached = getCachedDiscoveredModels(selectedProvider);
    if (Array.isArray(cached) && cached.length > 0) {
      return cached.map(m => typeof m === 'string' ? { id: m, name: m } : { id: m.id, name: m.name || m.id });
    }
    const defModels = PROVIDERS[selectedProvider]?.models || [];
    return defModels.map(m => ({ id: m, name: m }));
  }, [selectedProvider]);

  // Sync model when provider changes
  const handleSelectProvider = (provId) => {
    setSelectedProvider(provId);
    localStorage.setItem('keaos_prompt_provider', provId);
    const cached = getCachedDiscoveredModels(provId);
    const defModel = cached?.[0]?.id || PROVIDERS[provId]?.defaultModel || PROVIDERS[provId]?.models?.[0] || 'default';
    setSelectedModelId(defModel);
    localStorage.setItem(`keaos_prompt_model_${provId}`, defModel);
    setIsProviderMenuOpen(false);
  };

  const handleSelectModel = (modelId) => {
    setSelectedModelId(modelId);
    localStorage.setItem(`keaos_prompt_model_${selectedProvider}`, modelId);
    setIsModelMenuOpen(false);
  };

  // Open API Settings Modal with specific provider tab
  const handleOpenApiSettings = () => {
    window.dispatchEvent(new CustomEvent('keaos:open-api-settings', { detail: { tab: selectedProvider } }));
  };

  // Auto-resize textarea to match input height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [promptText]);

  // Auto-scroll Agent Log to bottom when new logs arrive
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [agentLogs]);

  // Close menus on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('#canvas-prompt-bar-container')) {
        setIsProviderMenuOpen(false);
        setIsModelMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', handleOutsideClick);
    return () => window.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Cleanup speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (err) {}
      }
    };
  }, []);

  // Web Speech API Microphone Integration
  const toggleListening = useCallback(() => {
    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (err) {
          console.warn('Error stopping speech recognition:', err);
        }
        recognitionRef.current = null;
      }
      setIsListening(false);
      basePromptRef.current = '';
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      if (onToast) onToast('Speech recognition is not supported by your current browser.');
      return;
    }

    try {
      // Capture any preexisting text before starting speech stream so we don't erase it
      basePromptRef.current = promptText ? promptText.trim() : '';

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        let sessionFinal = '';
        let sessionInterim = '';

        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i];
          const text = res[0]?.transcript || '';
          if (res.isFinal) {
            sessionFinal += text;
          } else {
            sessionInterim += text;
          }
        }

        const sessionText = (sessionFinal + sessionInterim).trim();
        const base = basePromptRef.current;

        if (base && sessionText) {
          setPromptText(`${base} ${sessionText}`);
        } else if (sessionText) {
          setPromptText(sessionText);
        } else if (base) {
          setPromptText(base);
        }
      };

      recognition.onerror = (e) => {
        console.warn('Speech recognition error:', e.error);
        if (e.error === 'not-allowed') {
          if (onToast) onToast('Microphone access was denied. Please allow microphone permissions.');
        } else if (e.error === 'network') {
          if (onToast) onToast('Speech recognition network error. Please check your connection.');
        }
        setIsListening(false);
        recognitionRef.current = null;
        basePromptRef.current = '';
      };

      recognition.onend = () => {
        setIsListening(false);
        recognitionRef.current = null;
        basePromptRef.current = '';
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setIsListening(false);
      recognitionRef.current = null;
      basePromptRef.current = '';
    }
  }, [isListening, promptText, onToast]);

  // Append entry to Agent Log
  const logStep = useCallback((text, status = 'done') => {
    setAgentLogs((prev) => [
      ...prev,
      {
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        status
      }
    ]);
  }, []);

  // Sequential Live Animated Placement on Canvas
  const executeSequentialBuild = useCallback(async (newNodes, newEdges, summaryText) => {
    if (!Array.isArray(newNodes) || newNodes.length === 0) return;

    if (takeSnapshot) takeSnapshot();
    setIsBuilding(true);
    setIsAgentLogOpen(true);

    // Initial log
    logStep(`Initializing visual synthesis: ${newNodes.length} nodes, ${newEdges.length} connections`, 'running');

    // 1. Clear or prepare canvas
    setNodes([]);
    setEdges([]);
    await new Promise((r) => setTimeout(r, 120));

    // 2. Sort nodes by logical layer for sequential drop
    const orderScore = (n) => {
      if (n.type === 'triggerNode') return 1;
      if (n.type === 'ingestionNode') return 2;
      if (n.type === 'agentCore') return 3;
      if (n.type === 'pillar') {
        const pt = n.data?.pillarType;
        if (pt === 'model') return 4;
        if (pt === 'tools') return 5;
        if (pt === 'memory') return 6;
        if (pt === 'policies') return 7;
        if (pt === 'skills') return 8;
        if (pt === 'mcp' || pt === 'gateway') return 9;
        return 10;
      }
      if (n.type === 'routerNode' || n.type === 'approvalNode') return 11;
      if (n.type === 'deterministicNode') return 12;
      if (n.type === 'outputNode' || n.type === 'outputNodeV2') return 13;
      return 14;
    };

    const sortedNodes = [...newNodes].sort((a, b) => orderScore(a) - orderScore(b));

    // 3. Sequentially place nodes with glowing highlight
    const placedNodes = [];
    for (let i = 0; i < sortedNodes.length; i++) {
      const node = sortedNodes[i];
      const nodeName = node.data?.name || node.data?.title || node.data?.pillarType || node.type;
      setCurrentStepText(`Placing ${nodeName}...`);
      
      const nodeWithGlow = {
        ...node,
        className: 'animate-in zoom-in-95 duration-200'
      };
      placedNodes.push(nodeWithGlow);
      setNodes([...placedNodes]);
      logStep(`Added node [${node.type}]: "${nodeName}"`, 'done');

      // Subtle pause for sequential aesthetic
      await new Promise((r) => setTimeout(r, 160));
    }

    // 4. Sequentially attach edges
    setCurrentStepText('Wiring strictly-typed socket connections...');
    logStep(`Wiring ${newEdges.length} strictly-typed socket connections`, 'running');
    await new Promise((r) => setTimeout(r, 140));
    setEdges([...newEdges]);
    logStep(`Connected all socket ports: Model, Ingest, Memory, Skills, Policies, Output`, 'done');

    // 5. Fit View so the new architecture is centered
    if (rfInstance?.fitView) {
      setTimeout(() => {
        rfInstance.fitView({ padding: 0.22, duration: 450 });
      }, 100);
    }

    setIsBuilding(false);
    setCurrentStepText('');
    logStep(`✨ ${summaryText || 'Workflow successfully assembled.'}`, 'success');

    if (onToast) {
      onToast(`✨ AI Architect built ${sortedNodes.length} nodes`);
    }
  }, [setNodes, setEdges, takeSnapshot, rfInstance, logStep, onToast]);

  // Main Prompt Submission Handler
  const handleBuildSubmit = useCallback(async (customPrompt, clarificationAnswer = null) => {
    const textToUse = (customPrompt !== undefined ? customPrompt : promptText).trim();
    if (!textToUse && !clarificationAnswer) return;

    // Stop voice listening if active
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {}
      recognitionRef.current = null;
      setIsListening(false);
      basePromptRef.current = '';
    }

    setClarification(null);
    setSafeCanvasPending(null);
    setIsBuilding(true);
    setCurrentStepText('Analyzing architectural intent with AI...');
    setIsAgentLogOpen(true);

    const providerObj = PROVIDERS[selectedProvider];
    logStep(`User Directive: "${textToUse}"`, 'done');
    logStep(`Reasoning with ${providerObj?.name || selectedProvider} (${selectedModelId})`, 'running');

    try {
      const res = await synthesizeCanvasWorkflow({
        prompt: textToUse,
        existingNodes: nodes,
        existingEdges: edges,
        clarificationAnswer,
        provider: selectedProvider,
        modelId: selectedModelId,
        isEditMode: false
      });

      // 1. Clarification needed
      if (res.needsClarification) {
        setIsBuilding(false);
        setCurrentStepText('');
        logStep(`Clarification Required: "${res.clarificationQuestion}"`, 'running');
        setClarification({
          question: res.clarificationQuestion,
          options: res.clarificationOptions || [],
          originalPrompt: textToUse
        });
        return;
      }

      // 2. Safe Canvas Check: If canvas already has nodes and user requested a full new workflow
      if (nodes.length > 0 && res.nodes?.length > 0 && res.action === 'create' && !clarificationAnswer) {
        setIsBuilding(false);
        setCurrentStepText('');
        logStep(`Canvas has ${nodes.length} existing nodes. Awaiting user safety choice: Replace or Add alongside?`, 'running');
        setSafeCanvasPending({
          result: res,
          prompt: textToUse
        });
        return;
      }

      // 3. Ready to place on canvas
      setPromptText('');
      basePromptRef.current = '';
      await executeSequentialBuild(res.nodes, res.edges, res.summary);
    } catch (err) {
      console.error('AI Canvas Architect error:', err);
      logStep(`Error: ${err.message || 'Failed to synthesize workflow.'}`, 'error');
      setIsBuilding(false);
      setCurrentStepText('');
      if (onToast) onToast(`⚠️ ${err.message || 'Build failed.'}`);
    }
  }, [promptText, selectedProvider, selectedModelId, nodes, edges, logStep, executeSequentialBuild, onToast]);

  // Handle Clarification Option Click
  const handleSelectClarification = (option) => {
    const origPrompt = clarification?.originalPrompt || promptText;
    const answerLabel = option.label || option.id;
    setClarification(null);
    handleBuildSubmit(origPrompt, answerLabel);
  };

  // Safe Canvas Choice Handlers
  const handleSafeCanvasReplace = () => {
    if (!safeCanvasPending?.result) return;
    const { nodes: newNodes, edges: newEdges, summary } = safeCanvasPending.result;
    setSafeCanvasPending(null);
    setPromptText('');
    basePromptRef.current = '';
    executeSequentialBuild(newNodes, newEdges, summary);
  };

  const handleSafeCanvasAddAlongside = () => {
    if (!safeCanvasPending?.result) return;
    const { nodes: newNodes, edges: newEdges, summary } = safeCanvasPending.result;
    setSafeCanvasPending(null);
    setPromptText('');
    basePromptRef.current = '';

    // Shift coordinates of new nodes to the right of existing nodes
    const maxX = Math.max(...nodes.map(n => n.position?.x || 0), 0);
    const offsetX = maxX > 0 ? maxX + 600 : 600;

    const shiftedNodes = newNodes.map(n => ({
      ...n,
      id: `${n.id}-copy-${Date.now().toString().slice(-4)}`,
      position: { x: (n.position?.x || 0) + offsetX, y: n.position?.y || 180 }
    }));

    if (takeSnapshot) takeSnapshot();
    setNodes(prev => [...prev, ...shiftedNodes]);
    setEdges(prev => [...prev, ...(newEdges || [])]);
    logStep(`Added new workflow alongside existing canvas at X: +${offsetX}px`, 'done');
    if (rfInstance?.fitView) {
      setTimeout(() => rfInstance.fitView({ padding: 0.2, duration: 400 }), 100);
    }
  };

  const ProviderLogoComponent = PROVIDER_LOGOS[selectedProvider] || Sparkles;

  return (
    <div 
      id="canvas-prompt-bar-container" 
      className={`absolute ${
        isDrawerExpanded ? 'bottom-[445px]' : 'bottom-16'
      } left-1/2 -translate-x-1/2 z-30 w-full max-w-2xl px-4 pointer-events-none select-none transition-all duration-300`}
    >
      <div className="relative pointer-events-auto flex flex-col items-center">
        
        {/* 1. CLARIFICATION CARD (Floating above the prompt bar) */}
        {clarification && (
          <div className="w-full mb-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className={`p-4 border rounded-2xl shadow-[0_12px_36px_rgba(0,0,0,0.45)] backdrop-blur-xl ${
              isDarkMode 
                ? 'bg-[#0B0F19]/95 border-[#00338D]/60 text-white' 
                : 'bg-white/95 border-[#00338D]/40 text-[#0B0F19]'
            }`}>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-[#00338D] text-white flex items-center justify-center shrink-0">
                    <HelpCircle className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#0091DA]">
                    Architect Clarification
                  </span>
                </div>
                <button
                  onClick={() => setClarification(null)}
                  className="text-slate-400 hover:text-white p-1 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <p className={`text-xs font-semibold mb-2.5 leading-relaxed ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                {clarification.question}
              </p>

              {/* Clickable Choice Pills */}
              <div className="flex flex-wrap gap-2">
                {clarification.options?.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => handleSelectClarification(opt)}
                    className="btn-tactile px-3.5 py-1.5 rounded-full border text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer bg-[#00338D]/15 border-[#00338D] hover:bg-[#00338D] text-white shadow-sm"
                  >
                    <span>{opt.label}</span>
                    {opt.description && (
                      <span className="text-[10px] opacity-75">({opt.description})</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 2. SAFE CANVAS CONFIRMATION CARD (Floating above the prompt bar) */}
        {safeCanvasPending && (
          <div className="w-full mb-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className={`p-4 border rounded-2xl shadow-[0_12px_36px_rgba(0,0,0,0.45)] backdrop-blur-xl ${
              isDarkMode 
                ? 'bg-[#0B0F19]/95 border-amber-500/50 text-white' 
                : 'bg-white/95 border-amber-500/40 text-[#0B0F19]'
            }`}>
              <div className="flex items-center gap-2 mb-1.5">
                <AlertCircle className={`w-4 h-4 shrink-0 ${isDarkMode ? 'text-amber-400' : 'text-amber-700'}`} />
                <h4 className={`text-xs font-bold font-mono uppercase tracking-wider ${isDarkMode ? 'text-amber-400' : 'text-amber-800'}`}>
                  Canvas Currently Contains {nodes.length} Components
                </h4>
              </div>
              <p className={`text-xs mb-3 leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Would you like the AI Architect to replace the current canvas with your new workflow, or add it alongside existing components?
              </p>
              <div className="flex items-center gap-2.5">
                <button
                  onClick={handleSafeCanvasReplace}
                  className="btn-tactile px-3.5 py-1.5 rounded-full bg-[#00338D] hover:bg-[#005EB8] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Start Fresh (Replace)</span>
                </button>
                <button
                  onClick={handleSafeCanvasAddAlongside}
                  className="btn-tactile px-3.5 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Add Alongside</span>
                </button>
                <button
                  onClick={() => setSafeCanvasPending(null)}
                  className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3. EXPANDABLE AGENT LOG DRAWER (Stitch Style Step-by-Step Reasoner) */}
        {isAgentLogOpen && (
          <div className="w-full mb-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className={`border shadow-[0_16px_48px_rgba(0,0,0,0.6)] backdrop-blur-xl overflow-hidden rounded-2xl ${
              isDarkMode 
                ? 'bg-[#0B0F19]/95 border-[#1E293B]' 
                : 'bg-white/95 border-slate-200'
            }`}>
              {/* Log Header */}
              <div className="px-3.5 py-2 border-b border-white/[0.08] flex items-center justify-between bg-black/20">
                <div className="flex items-center gap-2">
                  <Rocket className="w-3.5 h-3.5 text-[#0091DA]" />
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-300">
                    Agent Log • AI Canvas Architect
                  </span>
                  {isBuilding && (
                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#0091DA]/20 text-[#0091DA] text-[9px] font-mono font-bold animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0091DA]" />
                      BUILDING
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setAgentLogs([])}
                    className="text-[10px] text-slate-400 hover:text-slate-200 px-1.5 py-0.5 rounded hover:bg-white/5 transition-colors font-mono"
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => setIsAgentLogOpen(false)}
                    className="text-slate-400 hover:text-white p-1 rounded hover:bg-white/10 transition-colors"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Log Items Stream */}
              <div ref={logContainerRef} className="max-h-52 overflow-y-auto p-3 space-y-1.5 text-xs font-mono">
                {agentLogs.length === 0 ? (
                  <div className="py-4 text-center text-slate-500 text-[11px]">
                    No architecture actions yet. Type a workflow request below to begin.
                  </div>
                ) : (
                  agentLogs.map((log) => (
                    <div key={log.id} className="flex items-start gap-2 leading-relaxed">
                      <span className="text-[10px] text-slate-500 shrink-0 select-none pt-0.5">
                        {log.timestamp}
                      </span>
                      {log.status === 'running' ? (
                        <span className={`w-2 h-2 rounded-full shrink-0 mt-1.5 animate-ping ${isDarkMode ? 'bg-amber-400' : 'bg-amber-600'}`} />
                      ) : log.status === 'error' ? (
                        <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                      ) : log.status === 'success' ? (
                        <Sparkles className="w-3.5 h-3.5 text-[#009A44] shrink-0 mt-0.5" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#0091DA] shrink-0 mt-0.5" />
                      )}
                      <span className={`text-[11px] ${
                        log.status === 'error' 
                          ? 'text-rose-400 font-semibold' 
                          : log.status === 'success'
                            ? 'text-emerald-400 font-semibold'
                            : 'text-slate-300'
                      }`}>
                        {log.text}
                      </span>
                    </div>
                  ))
                )}
                {isBuilding && currentStepText && (
                  <div className="flex items-center gap-2 pt-1 text-[11px] text-[#0091DA] animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0091DA]" />
                    <span>{currentStepText}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 4. MAIN PROMPT BAR PILL (Google Stitch Inspired Smooth Capsule with Animated Glowing Border) */}
        <div 
          className={`w-full transition-all duration-300 relative rounded-[28px] p-[1.5px] ${
            isBuilding || isFocused
              ? 'stitch-glow-border-active shadow-[0_12px_40px_rgba(139,92,246,0.25)]'
              : 'stitch-glow-border shadow-[0_12px_36px_rgba(0,0,0,0.2)]'
          }`}
        >
          {/* Inner Card Container */}
          <div className={`w-full rounded-[26.5px] backdrop-blur-2xl transition-colors duration-200 overflow-visible relative ${
            isDarkMode 
              ? 'bg-[#12141D]/95 text-white shadow-[0_20px_50px_rgba(0,0,0,0.6)]' 
              : 'bg-white/95 text-[#0B0F19] shadow-[0_16px_48px_rgba(0,30,80,0.12)]'
          }`}>
            {/* Top: Multi-line Input Area */}
            <div className="p-3.5 pb-1 rounded-t-[26.5px]">
              <textarea
                ref={textareaRef}
                rows={1}
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (!isBuilding && promptText.trim()) {
                      handleBuildSubmit();
                    }
                  }
                }}
                placeholder="What would you like to change or create?"
                className={`w-full bg-transparent resize-none text-xs focus:outline-none placeholder-slate-400 leading-relaxed font-sans px-1 ${
                  isDarkMode ? 'text-white' : 'text-[#0B0F19]'
                }`}
              />
            </div>

            {/* Bottom Bar: Tools & Action Controls */}
            <div className={`px-3.5 py-2 flex items-center justify-between border-t rounded-b-[26.5px] transition-colors ${
              isDarkMode 
                ? 'border-white/[0.06] bg-black/25' 
                : 'border-slate-100 bg-slate-50/80'
            }`}>
              {/* Left: Stitch-Style "🚀 Agent log" Toggle */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsAgentLogOpen((prev) => !prev)}
                  className={`btn-tactile flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono font-medium rounded-full transition-all cursor-pointer ${
                    isAgentLogOpen
                      ? 'bg-[#0091DA]/20 text-[#0091DA] border border-[#0091DA]/40'
                      : isDarkMode
                        ? 'text-slate-400 hover:text-white hover:bg-white/5'
                        : 'text-slate-600 hover:text-black hover:bg-slate-100'
                  }`}
                  title="Toggle Agent Reasoning & Activity Log"
                >
                  <Rocket className="w-3.5 h-3.5" />
                  <span>Agent log</span>
                  {isAgentLogOpen ? (
                    <ChevronUp className="w-3 h-3 opacity-70" />
                  ) : (
                    <ChevronDown className="w-3 h-3 opacity-70" />
                  )}
                </button>
              </div>

              {/* Right: Cascading Model Selector, Voice Mic & Send Button */}
              <div className="flex items-center gap-1.5 relative">
                
                {/* 1. Provider Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setIsProviderMenuOpen((prev) => !prev);
                      setIsModelMenuOpen(false);
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-full border transition-all cursor-pointer ${
                      isDarkMode
                        ? 'bg-white/5 border-white/10 hover:border-white/20 text-slate-300'
                        : 'bg-slate-100 border-slate-200 hover:border-slate-300 text-slate-800'
                    }`}
                    title="Select AI Provider"
                  >
                    <ProviderLogoComponent className="w-3.5 h-3.5" />
                    <span className="capitalize">{PROVIDERS[selectedProvider]?.name || selectedProvider}</span>
                    <ChevronDown className="w-3 h-3 opacity-60" />
                  </button>

                  {/* Provider Popover */}
                  {isProviderMenuOpen && (
                    <div className={`absolute bottom-full right-0 mb-2 w-48 border shadow-xl rounded-lg py-1 z-50 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 ${
                      isDarkMode ? 'bg-[#0E121D] border-[#1E293B] text-white' : 'bg-white border-slate-200 text-[#0B0F19]'
                    }`}>
                      <div className="px-2.5 py-1 text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400">
                        Select Provider
                      </div>
                      {Object.entries(PROVIDERS).map(([pId, pDef]) => {
                        const IconComp = PROVIDER_LOGOS[pId] || Sparkles;
                        const isConfigured = pId === 'ollama' || Boolean(getProviderCredential(pId));
                        const isSelected = selectedProvider === pId;

                        return (
                          <button
                            key={pId}
                            type="button"
                            onClick={() => handleSelectProvider(pId)}
                            className={`w-full px-2.5 py-1.5 flex items-center justify-between text-xs transition-colors cursor-pointer ${
                              isSelected 
                                ? 'bg-[#00338D]/20 text-[#0091DA] font-bold' 
                                : isDarkMode ? 'hover:bg-white/5 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <IconComp className="w-3.5 h-3.5" />
                              <span>{pDef.name}</span>
                            </div>
                            {!isConfigured && (
                              <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                isDarkMode 
                                  ? 'bg-amber-500/20 text-amber-400' 
                                  : 'bg-amber-100 border border-amber-400 text-amber-900'
                              }`}>
                                No Key
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 2. Model Dropdown (when credentials available) OR Configure Key Button */}
                {hasCredential ? (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setIsModelMenuOpen((prev) => !prev);
                        setIsProviderMenuOpen(false);
                      }}
                      className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono rounded-full border transition-all cursor-pointer ${
                        isDarkMode
                          ? 'bg-white/5 border-white/10 hover:border-white/20 text-slate-300'
                          : 'bg-slate-100 border-slate-200 hover:border-slate-300 text-slate-800'
                      }`}
                      title="Select Specific Model"
                    >
                      <span className="max-w-[110px] truncate">{selectedModelId}</span>
                      <ChevronDown className="w-3 h-3 opacity-60" />
                    </button>

                    {/* Model Popover */}
                    {isModelMenuOpen && (
                      <div className={`absolute bottom-full right-0 mb-2 w-56 max-h-60 overflow-y-auto border shadow-xl rounded-lg py-1 z-50 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 ${
                        isDarkMode ? 'bg-[#0E121D] border-[#1E293B] text-white' : 'bg-white border-slate-200 text-[#0B0F19]'
                      }`}>
                        <div className="px-2.5 py-1 text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400">
                          Compatible Models ({availableModels.length})
                        </div>
                        {availableModels.map((m) => {
                          const isSelected = selectedModelId === m.id;
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => handleSelectModel(m.id)}
                              className={`w-full px-2.5 py-1.5 flex items-center justify-between text-xs font-mono transition-colors cursor-pointer ${
                                isSelected 
                                  ? 'bg-[#00338D]/20 text-[#0091DA] font-bold' 
                                  : isDarkMode ? 'hover:bg-white/5 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
                              }`}
                            >
                              <span className="truncate">{m.name}</span>
                              {isSelected && <Check className="w-3 h-3 text-[#0091DA] shrink-0 ml-1" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleOpenApiSettings}
                    className={`btn-tactile flex items-center gap-1.5 px-3 py-1 text-[11px] font-mono font-bold rounded-full border transition-all cursor-pointer shadow-xs ${
                      isDarkMode
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-400 hover:bg-amber-500/25'
                        : 'bg-amber-100/90 border-amber-500 text-amber-900 hover:bg-amber-200'
                    }`}
                    title="Configure API Credentials for this provider"
                  >
                    <Key className={`w-3.5 h-3.5 shrink-0 ${isDarkMode ? 'text-amber-400' : 'text-amber-800'}`} />
                    <span className="font-semibold">Configure Key</span>
                  </button>
                )}

                {/* 3. Microphone Voice Button */}
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`btn-tactile w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                    isListening
                      ? 'bg-rose-600 text-white animate-pulse shadow-[0_0_12px_rgba(225,29,72,0.6)]'
                      : isDarkMode
                        ? 'text-slate-400 hover:text-white hover:bg-white/10'
                        : 'text-slate-600 hover:text-black hover:bg-slate-100'
                  }`}
                  title={isListening ? "Listening... Click to stop" : "Speak request with voice input"}
                >
                  {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                </button>

                {/* 4. Clear Prompt Button (when text present) */}
                {promptText && (
                  <button
                    type="button"
                    onClick={() => {
                      setPromptText('');
                      basePromptRef.current = '';
                      if (recognitionRef.current) {
                        try {
                          recognitionRef.current.stop();
                        } catch (err) {}
                        recognitionRef.current = null;
                        setIsListening(false);
                      }
                    }}
                    className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
                    title="Clear input"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* 5. Submit Arrow Button (↑) */}
                <button
                  type="button"
                  disabled={isBuilding || !promptText.trim()}
                  onClick={() => handleBuildSubmit()}
                  className={`btn-tactile w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                    isBuilding
                      ? 'bg-[#00338D]/40 text-slate-400 cursor-wait'
                      : promptText.trim()
                        ? 'bg-[#00338D] hover:bg-[#005EB8] text-white shadow-md cursor-pointer'
                        : 'bg-white/5 text-slate-500 cursor-not-allowed opacity-40'
                  }`}
                  title="Synthesize Workflow with AI Architect (Enter)"
                >
                  <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>

              </div>
            </div>

            {/* Signature Stitch Bottom Drag Handle / Center Notch */}
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 pointer-events-none flex items-center justify-center z-10">
              <div className={`w-8 h-1 rounded-full border transition-colors ${
                isDarkMode 
                  ? 'bg-[#181B26] border-white/20 shadow-xs' 
                  : 'bg-white border-slate-300 shadow-xs'
              }`} />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
