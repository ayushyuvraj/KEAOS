import React, { useState } from 'react';
import { 
  Bot,
  Cpu, 
  Sparkles, 
  Layers, 
  Wrench, 
  GitFork, 
  Database, 
  ShieldCheck, 
  FileCheck, 
  Activity, 
  DollarSign, 
  Plus, 
  Search,
  ChevronDown,
  ChevronRight,
  Mic,
  FileText,
  Type,
  Plug,
  UploadCloud,
  Code2
} from 'lucide-react';
import { PILLARS } from '../constants/pillars';
import { getRegisteredMcpServers } from '../services/mcpClientService';

const PILLAR_ICONS = {
  model: Cpu,
  skills: Sparkles,
  mcp: Layers,
  tools: Wrench,
  gateway: GitFork,
  memory: Database,
  policies: ShieldCheck,
  audit: FileCheck,
  observability: Activity,
  cost_benefit: DollarSign
};

export default function Palette({ onAddNode }) {
  const [search, setSearch] = useState('');
  const [registeredMcps, setRegisteredMcps] = useState(() => getRegisteredMcpServers());

  React.useEffect(() => {
    const handleUpdate = () => {
      setRegisteredMcps(getRegisteredMcpServers());
    };
    window.addEventListener('keaos:mcp-registry-updated', handleUpdate);
    return () => window.removeEventListener('keaos:mcp-registry-updated', handleUpdate);
  }, []);
  const [openCategories, setOpenCategories] = useState({
    model: true,
    skills: true,
    tools: true,
    mcp: true,
    gateway: true,
    memory: false,
    policies: false,
    audit: false,
    observability: false,
    cost_benefit: false
  });

  const toggleCategory = (cat) => {
    setOpenCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  return (
    <aside className="w-84 h-full bg-[#FFFFFF] border-r border-[#CBD5E1] flex flex-col shrink-0 overflow-hidden shadow-sm select-none">
      {/* Header */}
      <div className="p-4 border-b border-[#E0E0E0] bg-[#F8F9FB]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#00338D] font-mono">
            Component Dock
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#E6EDF7] text-[#00338D] border border-[#00338D]/30 font-bold">
            10 PILLARS
          </span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search skills, MCP, tools, models..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[#FFFFFF] border border-[#CBD5E1] text-xs text-[#0B0F19] placeholder-slate-400 focus:outline-none focus:border-[#00338D] focus:ring-1 focus:ring-[#00338D] rounded-none transition-colors"
          />
        </div>
      </div>

      {/* Accordion Categories */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-[#F8F9FB]">
        {/* Autonomous AI Agent Core Provisioner */}
        {(!search || 'ai agent core autonomous'.includes(search.toLowerCase())) && (
          <div 
            className="border border-[#00338D]/30 bg-[#FFFFFF] overflow-hidden shadow-sm transition-all" 
            style={{ borderLeft: '3px solid #00338D' }}
          >
            <div className="p-2.5 bg-gradient-to-r from-[#F0F4FA] to-white flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#00338D] text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h5 className="text-xs font-bold text-[#0B0F19] tracking-tight">AI Agent Core</h5>
                    <span className="text-[8px] font-mono px-1 py-0.2 bg-[#00338D]/10 text-[#00338D] font-bold rounded">
                      AGENT
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500">Autonomous multi-pillar agent</p>
                </div>
              </div>
              <button
                onClick={() => onAddNode('agentCore', { name: 'Autonomous Agent' })}
                className="btn-tactile w-7 h-7 bg-[#00338D] hover:bg-[#005EB8] text-white flex items-center justify-center transition-all shrink-0 border border-[#001E50] shadow-sm cursor-pointer"
                title="Add new AI Agent to canvas"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Output Display Component Provisioner */}
        {(!search || 'output result response display stream'.includes(search.toLowerCase())) && (
          <div 
            className="border border-[#10B981]/30 bg-[#FFFFFF] overflow-hidden shadow-sm transition-all" 
            style={{ borderLeft: '3px solid #10B981' }}
          >
            <div className="p-2.5 bg-gradient-to-r from-[#F0FDF4] to-white flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#10B981] text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h5 className="text-xs font-bold text-[#0B0F19] tracking-tight">Output Display</h5>
                    <span className="text-[8px] font-mono px-1 py-0.2 bg-[#10B981]/10 text-[#059669] font-bold rounded">
                      STREAM
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500">Morphing output card & audit</p>
                </div>
              </div>
              <button
                onClick={() => onAddNode('outputNode', { name: 'Agent Output' })}
                className="btn-tactile w-7 h-7 bg-[#10B981] hover:bg-[#059669] text-white flex items-center justify-center transition-all shrink-0 border border-[#047857] shadow-sm cursor-pointer"
                title="Add new Output Component to canvas"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Data & Audio Ingestion Component Provisioner */}
        {(!search || 'ingest upload audio file data document input source'.includes(search.toLowerCase())) && (
          <div 
            className="border border-[#0091DA]/30 bg-[#FFFFFF] overflow-hidden shadow-sm transition-all" 
            style={{ borderLeft: '3px solid #0091DA' }}
          >
            <div className="p-2.5 bg-gradient-to-r from-[#F0F8FF] to-white flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#0091DA] text-white flex items-center justify-center shrink-0 shadow-sm">
                  <UploadCloud className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h5 className="text-xs font-bold text-[#0B0F19] tracking-tight">File Ingestion</h5>
                    <span className="text-[8px] font-mono px-1 py-0.2 bg-[#0091DA]/10 text-[#0091DA] font-bold rounded">
                      INPUT
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500">Audio, Docs & Data stream</p>
                </div>
              </div>
              <button
                onClick={() => onAddNode('ingestionNode', { name: 'File Ingestion' })}
                className="btn-tactile w-7 h-7 bg-[#0091DA] hover:bg-[#005EB8] text-white flex items-center justify-center transition-all shrink-0 border border-[#00338D] shadow-sm cursor-pointer"
                title="Add new Ingestion Tool to canvas"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {Object.entries(PILLARS).map(([pillarKey, pillar]) => {
          const Icon = PILLAR_ICONS[pillarKey] || Wrench;
          const isOpen = openCategories[pillarKey];
          
          const filteredItems = pillar.items.filter(item => 
            item.name.toLowerCase().includes(search.toLowerCase()) ||
            item.description.toLowerCase().includes(search.toLowerCase())
          );

          if (search && filteredItems.length === 0) return null;

          return (
            <div 
              key={pillarKey} 
              className="border border-[#CBD5E1] bg-[#FFFFFF] overflow-hidden shadow-sm transition-all"
              style={{ borderLeft: `3px solid ${pillar.color}` }}
            >
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(pillarKey)}
                className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-[#F5F6F8] transition-colors text-left"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-6 h-6 flex items-center justify-center shrink-0 shadow-inner"
                    style={{ 
                      backgroundColor: pillar.bgColor, 
                      color: pillar.color,
                      border: `1px solid ${pillar.color}40`
                    }}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#0B0F19] tracking-tight block">{pillar.label}</span>
                    <span className="text-[9px] font-mono text-slate-500">Port: {pillar.socketId}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 bg-[#F8F9FB] border border-[#CBD5E1] text-slate-600">
                    {pillarKey === 'mcp' ? registeredMcps.length : pillar.items.length}
                  </span>
                  {isOpen ? (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                  )}
                </div>
              </button>

              {/* Items List */}
              {isOpen && (
                <div className="p-2 space-y-2 border-t border-[#E0E0E0] bg-[#FAFAFC]">
                  {pillarKey === 'mcp' ? (
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => window.dispatchEvent(new CustomEvent('keaos:open-connect-mcp'))}
                        className="btn-tactile w-full py-2 px-2.5 bg-[#00A3A6] hover:bg-[#008D90] text-white text-xs font-mono font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Connect Live MCP Server</span>
                      </button>

                      {registeredMcps.length === 0 ? (
                        <div className="p-3 bg-white border border-dashed border-[#00A3A6]/40 text-center space-y-1">
                          <span className="text-[10px] font-mono font-bold text-[#00A3A6] block uppercase tracking-wider">
                            Zero Simulation Policy
                          </span>
                          <p className="text-[11px] text-slate-500 font-sans leading-relaxed">
                            No hardcoded mocks. Click above to connect a real external MCP URL, Slack, Jira, or GitHub.
                          </p>
                        </div>
                      ) : (
                        registeredMcps.map((mcp) => (
                          <div
                            key={mcp.id}
                            className="p-2.5 border border-[#E0E0E0] bg-[#FFFFFF] hover:border-[#00A3A6] transition-all flex items-start justify-between gap-2 shadow-xs"
                          >
                            <div className="flex-1 overflow-hidden">
                              <div className="flex items-center gap-1.5">
                                <Layers className="w-3.5 h-3.5 shrink-0 text-[#00A3A6]" />
                                <h5 className="text-xs font-bold text-[#0B0F19] truncate tracking-tight">{mcp.name}</h5>
                              </div>
                              <p className="text-[11px] text-[#475569] mt-0.5 line-clamp-1">
                                {mcp.tools?.length || 0} live tools discovered ({mcp.transport})
                              </p>
                            </div>
                            <button
                              onClick={() => onAddNode('mcp', {
                                id: mcp.id,
                                name: mcp.name,
                                description: mcp.description,
                                config: mcp.config || {},
                                tools: mcp.tools || []
                              })}
                              className="btn-tactile w-7 h-7 bg-[#00A3A6] hover:bg-[#008D90] text-white flex items-center justify-center shrink-0 border border-[#007D80] shadow-xs cursor-pointer"
                              title="Add to visual canvas"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  ) : (
                    filteredItems.map((item) => {
                      let ItemIcon = Icon;
                      if (item.id === 'tool-audio-transcribe') ItemIcon = Mic;
                      if (item.id === 'tool-doc-parser') ItemIcon = FileText;
                      if (item.id === 'tool-text-box-ingest') ItemIcon = Type;
                      if (item.id === 'tool-deterministic-box') ItemIcon = Code2;

                      return (
                        <div
                          key={item.id}
                          className="group p-2.5 border border-[#E0E0E0] bg-[#FFFFFF] hover:border-[#00338D] hover:translate-x-1 transition-all duration-150 flex items-start justify-between gap-2 shadow-[0_2px_4px_rgba(0,30,80,0.02)] hover:shadow-[0_4px_12px_rgba(0,30,80,0.08)]"
                        >
                          <div className="flex-1 overflow-hidden">
                            <div className="flex items-center gap-1.5">
                              <ItemIcon className="w-3.5 h-3.5 shrink-0" style={{ color: pillar.color }} />
                              <h5 className="text-xs font-bold text-[#0B0F19] truncate tracking-tight">{item.name}</h5>
                            </div>
                            <p className="text-[11px] text-[#475569] mt-1 line-clamp-2 leading-relaxed">
                              {item.description}
                            </p>
                            <div className="mt-2 flex items-center gap-1.5">
                              <span
                                className="text-[9px] font-mono px-1.5 py-0.5 uppercase font-bold border flex items-center gap-1"
                                style={{ backgroundColor: pillar.bgColor, color: pillar.color, borderColor: `${pillar.color}40` }}
                              >
                                <Plug className="w-2.5 h-2.5" />
                                {pillar.socketId}
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={() => onAddNode(pillarKey, item)}
                            className="btn-tactile w-7 h-7 bg-[#00338D] hover:bg-[#005EB8] text-white flex items-center justify-center transition-all shrink-0 mt-0.5 border border-[#001E50] shadow-sm"
                            title="Add block to visual canvas"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
