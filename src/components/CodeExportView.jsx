import React, { useState } from 'react';
import { Terminal, Copy, Check, Download, FileCode, GitFork, Users } from 'lucide-react';
import { FRAMEWORKS } from '../constants/frameworks';
import { generateFrameworkCode, generateMultiAgentPipelineCode } from '../utils/codeGenerators';

export default function CodeExportView({ activeUseCase, nodes, edges = [] }) {
  const agentNodes = (nodes || []).filter(n => n.type === 'agentCore');
  const isMultiAgent = agentNodes.length > 1;

  const [selectedFwId, setSelectedFwId] = useState(
    isMultiAgent ? 'multi-agent-fleet' : (activeUseCase?.framework?.id || 'google-adk')
  );
  const [copied, setCopied] = useState(false);

  const attachedPillars = {
    model: nodes.find(n => n.data?.pillarType === 'model')?.data,
    skills: nodes.filter(n => n.data?.pillarType === 'skills').map(n => n.data),
    mcp: nodes.filter(n => n.data?.pillarType === 'mcp').map(n => n.data),
    tools: nodes.filter(n => n.data?.pillarType === 'tools').map(n => n.data),
    gateway: nodes.filter(n => n.data?.pillarType === 'gateway').map(n => n.data),
    memory: nodes.filter(n => n.data?.pillarType === 'memory').map(n => n.data),
    policies: nodes.filter(n => n.data?.pillarType === 'policies').map(n => n.data)
  };

  const code = selectedFwId === 'multi-agent-fleet'
    ? generateMultiAgentPipelineCode(nodes, edges, activeUseCase)
    : generateFrameworkCode(selectedFwId, activeUseCase.agent, attachedPillars);

  const fileName = selectedFwId === 'multi-agent-fleet'
    ? 'keaos_multi_agent_pipeline.py'
    : `keaos_agent_${selectedFwId}.py`;

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([code], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = fileName;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="flex-1 h-full bg-[#F8F9FB] flex flex-col overflow-hidden select-none">
      {/* Top Bar */}
      <div className="h-14 px-6 border-b border-[#CBD5E1] flex items-center justify-between bg-[#FFFFFF] shrink-0 shadow-[0_2px_8px_rgba(0,30,80,0.04)]">
        <div className="flex items-center gap-3">
          <Terminal className="w-4 h-4 text-[#00338D]" />
          <span className="text-xs font-bold uppercase tracking-[0.1em] text-[#0B0F19] font-mono">
            SDK Code Exporter
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#E6EDF7] text-[#00338D] border border-[#00338D]/20 font-bold">
            {isMultiAgent ? `HETEROGENEOUS DAG (${agentNodes.length} AGENTS)` : 'PRODUCTION SYNTHESIS'}
          </span>
        </div>

        {/* Framework Selector Tabs */}
        <div className="flex items-center gap-1 bg-[#F8F9FB] p-1 border border-[#CBD5E1] overflow-x-auto">
          {isMultiAgent && (
            <button
              onClick={() => setSelectedFwId('multi-agent-fleet')}
              className={`btn-tactile flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition-all rounded-none font-mono ${
                selectedFwId === 'multi-agent-fleet'
                  ? 'bg-[#6366F1] text-white shadow-sm border-b-2 border-[#4338CA]'
                  : 'text-[#6366F1] hover:bg-[#EEF2FF] bg-[#F5F3FF]'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Multi-Agent Fleet ({agentNodes.length})</span>
            </button>
          )}

          {FRAMEWORKS.map((fw) => (
            <button
              key={fw.id}
              onClick={() => setSelectedFwId(fw.id)}
              className={`btn-tactile px-3 py-1.5 text-xs font-bold transition-all rounded-none font-mono whitespace-nowrap ${
                selectedFwId === fw.id
                  ? 'bg-[#00338D] text-white shadow-sm border-b-2 border-[#001E50]'
                  : 'text-slate-600 hover:text-[#0B0F19]'
              }`}
            >
              {fw.name}
            </button>
          ))}
        </div>

        {/* Copy / Download buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="btn-tactile flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-[#FFFFFF] hover:bg-[#F5F6F8] text-[#00338D] border border-[#00338D] transition-colors rounded-none shadow-sm"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#009A44]" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Code'}</span>
          </button>

          <button
            onClick={handleDownload}
            className="btn-tactile flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold bg-[#00338D] hover:bg-[#005EB8] text-white transition-all shadow-sm rounded-none border-b-2 border-[#001E50]"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .py</span>
          </button>
        </div>
      </div>

      {/* Code Display Area */}
      <div className="flex-1 overflow-auto p-6 bg-[#0B0F19]">
        <div className="max-w-6xl mx-auto shadow-2xl">
          <div className="px-4 py-2 bg-[#001E50] border-t border-l border-r border-[#00338D] flex items-center justify-between text-xs text-slate-300 font-mono">
            <span className="flex items-center gap-2 font-bold text-white">
              <FileCode className="w-3.5 h-3.5 text-[#0091DA]" />
              {fileName}
            </span>
            <span className="text-[10px] text-slate-400">
              {selectedFwId === 'multi-agent-fleet'
                ? 'Python 3.10+ / Heterogeneous Multi-SDK DAG Orchestrator'
                : 'Python 3.10+ / Strict Asyncio'}
            </span>
          </div>
          <pre className="p-6 bg-[#001438] border border-[#00338D] text-xs text-slate-100 font-mono leading-relaxed overflow-x-auto selection:bg-[#005EB8]">
            <code>{code}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}
