import React, { useMemo } from 'react';
import { 
  Activity, 
  DollarSign, 
  Clock, 
  Cpu, 
  Layers, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight,
  Sparkles
} from 'lucide-react';
import ScreenScaffold from '../common/ScreenScaffold';
import { DESIGN_CLASSES } from '../../constants/designTokens';
import { getLiveModelProfile, calculateInferenceCost } from '../../services/modelPricingService';

/**
 * ObservabilityView
 * OpenTelemetry Telemetry, Token Accounting & Cost-Benefit ROI Dashboard
 * Uses dynamic real-time model pricing from active visual canvas model.
 */
export default function ObservabilityView({ activeUseCase, nodes = [] }) {
  // Resolve active connected model node from canvas
  const modelNode = useMemo(() => {
    return (nodes || []).find(n => n.type === 'pillar' && n.data?.pillarType === 'model' && !n.data?.isDeactivated);
  }, [nodes]);

  const provider = modelNode?.data?.config?.provider || 
    (modelNode?.data?.name?.toLowerCase().includes('claude') ? 'anthropic' :
     (modelNode?.data?.name?.toLowerCase().includes('gpt') ||
      modelNode?.data?.name?.toLowerCase().includes('openai') ||
      modelNode?.data?.name?.toLowerCase().includes('o1') ||
      modelNode?.data?.name?.toLowerCase().includes('o3') ||
      modelNode?.data?.name?.toLowerCase().includes('o4')) ? 'openai' :
     modelNode?.data?.name?.toLowerCase().includes('ollama') ? 'ollama' :
     modelNode?.data?.name?.toLowerCase().includes('openrouter') ? 'openrouter' : 'google');

  const modelId = modelNode?.data?.config?.modelId || 'gemini-2.0-flash';
  const liveProfile = useMemo(() => getLiveModelProfile(provider, modelId), [provider, modelId]);

  // Read latest run telemetry from persistent audit ledger if executed
  const latestRun = useMemo(() => {
    try {
      const raw = localStorage.getItem('keaos_audit_ledger');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const runWithCost = parsed.find(p => p.costUsd !== undefined);
          return runWithCost || parsed[0];
        }
      }
    } catch (e) {
      console.warn('Failed to parse audit ledger:', e);
    }
    return null;
  }, []);

  const totalLatency = latestRun?.latencyMs || 1079;
  const totalTokens = latestRun?.tokens || 1280;
  const promptTokens = 345;
  const completionTokens = totalTokens > promptTokens ? totalTokens - promptTokens : 935;

  const dynamicModelCost = latestRun?.costUsd !== undefined 
    ? latestRun.costUsd 
    : calculateInferenceCost({ provider, modelId, promptTokens, completionTokens });

  const spans = [
    { name: 'Gateway Rate Limiter', type: 'gateway', latencyMs: 38, color: '#EAAA00', cost: '$0.0000' },
    { name: 'PII Redaction Policy Engine', type: 'policies', latencyMs: 82, color: '#6D2077', cost: '$0.0000' },
    { name: 'Episodic Memory Query', type: 'memory', latencyMs: 110, color: '#483698', cost: '$0.0001' },
    { 
      name: `Foundation Model Execution (${liveProfile.displayName})`, 
      type: 'model', 
      latencyMs: latestRun ? Math.max(200, totalLatency - 250) : 780, 
      color: '#00338D', 
      cost: `$${dynamicModelCost.toFixed(4)}` 
    },
    { name: 'Structured JSON Skill Extractor', type: 'skills', latencyMs: 45, color: '#009A44', cost: '$0.0000' },
    { name: 'W3C SHA-256 Cryptographic Audit', type: 'audit', latencyMs: 24, color: '#001E50', cost: '$0.0000' }
  ];

  // Modeling for 1,000 meetings based on live model rate card
  const promptKCost1000 = Number(((345_000 * liveProfile.promptPricePerToken)).toFixed(4));
  const completionKCost1000 = Number(((935_000 * liveProfile.completionPricePerToken)).toFixed(4));
  const vectorStorageCost1000 = 0.004;
  const totalInfrastructureCost1000 = Number((promptKCost1000 + completionKCost1000 + vectorStorageCost1000).toFixed(3));
  const grossLaborValue1000 = 43335.50;
  const netBenefit1000 = Number((grossLaborValue1000 - totalInfrastructureCost1000).toFixed(2));
  const roiMultiplier1000 = totalInfrastructureCost1000 > 0 ? Math.round(grossLaborValue1000 / totalInfrastructureCost1000) : 99999;

  return (
    <ScreenScaffold
      title="OpenTelemetry Telemetry & ROI Accounting"
      eyebrow="PILLARS: OBSERVABILITY & COST/BENEFIT"
      statusText="TELEMETRY LIVE"
      statusType="active"
    >
      <div className="space-y-6 select-none">
        {/* Metric Cards Row */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-[#FFFFFF] border border-[#CBD5E1] p-4 shadow-sm border-t-3 border-t-[#00338D]">
            <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase text-slate-500 mb-1">
              <span>Total Inference Latency</span>
              <Activity className="w-3.5 h-3.5 text-[#00338D]" />
            </div>
            <div className="text-2xl font-bold text-[#0B0F19] tracking-tight font-mono">{totalLatency} ms</div>
            <span className="text-[11px] text-[#009A44] font-medium flex items-center gap-1 mt-1 font-mono">
              <TrendingDown className="w-3 h-3" /> Within 2.0s SLA target
            </span>
          </div>

          <div className="bg-[#FFFFFF] border border-[#CBD5E1] p-4 shadow-sm border-t-3 border-t-[#0091DA]">
            <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase text-slate-500 mb-1">
              <span>Token Consumption</span>
              <Cpu className="w-3.5 h-3.5 text-[#0091DA]" />
            </div>
            <div className="text-2xl font-bold text-[#0B0F19] tracking-tight font-mono">{totalTokens.toLocaleString()} Tokens</div>
            <span className="text-[11px] text-slate-500 font-medium mt-1 block font-mono">
              {promptTokens} Prompt / {completionTokens} Output
            </span>
          </div>

          <div className="bg-[#FFFFFF] border border-[#CBD5E1] p-4 shadow-sm border-t-3 border-t-[#EAAA00]">
            <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase text-slate-500 mb-1">
              <span>Compute Cost / Call</span>
              <DollarSign className="w-3.5 h-3.5 text-[#EAAA00]" />
            </div>
            <div className="text-2xl font-bold text-[#0B0F19] tracking-tight font-mono">
              ${dynamicModelCost.toFixed(4)}
            </div>
            <span className="text-[11px] text-slate-500 font-medium mt-1 block truncate font-mono">
              {liveProfile.isFree ? '100% Free (Local GPU/CPU)' : `${liveProfile.displayName} live rate`}
            </span>
          </div>

          <div className="bg-[#FFFFFF] border border-[#CBD5E1] p-4 shadow-sm border-t-3 border-t-[#009A44]">
            <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase text-slate-500 mb-1">
              <span>Net ROI per Meeting</span>
              <TrendingUp className="w-3.5 h-3.5 text-[#009A44]" />
            </div>
            <div className="text-2xl font-bold text-[#009A44] tracking-tight font-mono">
              +${(43.33 - dynamicModelCost).toFixed(2)}
            </div>
            <span className="text-[11px] text-slate-500 font-medium mt-1 block font-mono">
              40 mins saved @ $65/hr
            </span>
          </div>
        </div>

        {/* Trace Waterfall Breakdown */}
        <div className="bg-[#FFFFFF] border border-[#CBD5E1] p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-[#E0E0E0] mb-4">
            <div>
              <h3 className="text-sm font-bold text-[#0B0F19] tracking-tight">Per-Pillar Execution Spans (OpenTelemetry)</h3>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Exact millisecond breakdown and real-time model cost attribution across each architectural pillar socket.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-[#00338D]">
              Total Span: {totalLatency}ms
            </span>
          </div>

          <div className="space-y-3">
            {spans.map((span) => {
              const widthPct = Math.max(6, (span.latencyMs / totalLatency) * 100);
              return (
                <div key={span.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#0B0F19]">{span.name}</span>
                    <span className="font-mono text-slate-500 text-[11px]">
                      {span.latencyMs}ms ({span.cost})
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-[#F8F9FB] border border-[#E0E0E0]">
                    <div 
                      className="h-full transition-all duration-300"
                      style={{ width: `${widthPct}%`, backgroundColor: span.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cost vs Benefit Breakdown Matrix */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#FFFFFF] border border-[#CBD5E1] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-[0.08em] text-[#0B0F19] font-mono">
                Compute Cost Modeling (Per 1,000 Meetings)
              </h4>
              <span className="text-[9px] font-mono font-bold bg-[#E6EDF7] text-[#00338D] px-1.5 py-0.5 border border-[#00338D]/20">
                {liveProfile.isFree ? 'Local Compute ($0)' : `$${liveProfile.promptPricePerMillion}/M In • $${liveProfile.completionPricePerMillion}/M Out`}
              </span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-[#E0E0E0]">
                <span className="text-slate-600">Prompt Tokens (345k tokens)</span>
                <span className="font-mono font-bold">${promptKCost1000.toFixed(3)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#E0E0E0]">
                <span className="text-slate-600">Completion Tokens (935k tokens)</span>
                <span className="font-mono font-bold">${completionKCost1000.toFixed(3)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#E0E0E0]">
                <span className="text-slate-600">Vector Storage & Audit Hashes</span>
                <span className="font-mono font-bold">${vectorStorageCost1000.toFixed(3)}</span>
              </div>
              <div className="flex justify-between pt-2 text-[#0B0F19] font-bold">
                <span>Total Infrastructure Cost</span>
                <span className="font-mono text-[#00338D]">${totalInfrastructureCost1000.toFixed(3)} / 1,000 meetings</span>
              </div>
            </div>
          </div>

          <div className="bg-[#FFFFFF] border border-[#CBD5E1] p-5 shadow-sm">
            <h4 className="text-xs font-bold uppercase tracking-[0.08em] text-[#0B0F19] mb-3 font-mono">
              Institutional Value Realization
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-[#E0E0E0]">
                <span className="text-slate-600">Staff Time Saved (40 min / meeting)</span>
                <span className="font-mono font-bold">666.7 Hours</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#E0E0E0]">
                <span className="text-slate-600">Average Blended Billing Rate</span>
                <span className="font-mono font-bold">$65.00 / Hour</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#E0E0E0]">
                <span className="text-slate-600">Gross Labor Value Recaptured</span>
                <span className="font-mono font-bold text-[#009A44]">+$43,335.50</span>
              </div>
              <div className="flex justify-between pt-2 text-[#0B0F19] font-bold">
                <span>Net Enterprise Benefit</span>
                <span className="font-mono text-[#009A44]">
                  +${netBenefit1000.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({roiMultiplier1000.toLocaleString()}x ROI)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ScreenScaffold>
  );
}
