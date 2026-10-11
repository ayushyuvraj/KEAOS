import React, { useState } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Clock, 
  Award, 
  HelpCircle, 
  Sliders, 
  ShieldCheck, 
  CheckCircle2 
} from 'lucide-react';

export default function ModelRoiCard({
  roi = {},
  overallMatchRate = 90,
  laborRateHr = 75,
  reviewMinsSaved = 15,
  onUpdateEconomics = null,
  isDarkMode = true
}) {
  const [showConfig, setShowConfig] = useState(false);
  const [rate, setRate] = useState(laborRateHr);
  const [mins, setMins] = useState(reviewMinsSaved);

  const avgCostPerRun = roi.avgCostPerRun ?? 0.0024;
  const costPer1k = (avgCostPerRun * 1000).toFixed(2);
  const grossSavings = ((mins / 60) * rate).toFixed(2);
  const netSavings = Math.max(0, (grossSavings - avgCostPerRun)).toFixed(2);
  const roiMultiple = avgCostPerRun > 0 ? Math.round(grossSavings / avgCostPerRun) : 6000;

  const handleApplyConfig = () => {
    if (onUpdateEconomics) {
      onUpdateEconomics({ laborRateHr: rate, reviewMinsSaved: mins });
    }
    setShowConfig(false);
  };

  return (
    <div className={`p-4 border shadow-sm space-y-4 select-none ${
      isDarkMode ? 'bg-[#121622] border-[#222736]' : 'bg-white border-[#CBD5E1]'
    }`}>
      {/* Top Header */}
      <div className={`flex items-center justify-between border-b pb-3 ${
        isDarkMode ? 'border-[#222736]' : 'border-[#E0E0E0]'
      }`}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-[#EAAA00] text-[#001E50] flex items-center justify-center font-bold">
            <DollarSign className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className={`text-xs font-bold uppercase font-mono tracking-tight ${
                isDarkMode ? 'text-white' : 'text-[#0B0F19]'
              }`}>
                "Is the Model Worth It?" ROI & Pareto Economics
              </h4>
              <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#009A44]/15 text-[#009A44] border border-[#009A44]/30">
                {roi.paretoAssessment || 'OPTIMAL SWEET SPOT'}
              </span>
            </div>
            <p className={`text-[11px] ${
              isDarkMode ? 'text-slate-400' : 'text-slate-500'
            }`}>
              Measures inference compute spend against corporate professional labor hours saved.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowConfig(!showConfig)}
          className={`text-xs font-mono flex items-center gap-1 border px-2.5 py-1 hover:border-[#00338D] transition-colors ${
            isDarkMode 
              ? 'text-slate-400 hover:text-white border-white/10' 
              : 'text-slate-600 hover:text-black border-slate-300'
          }`}
        >
          <Sliders className="w-3 h-3" />
          <span>{showConfig ? 'Hide Config' : 'Tweak Economics'}</span>
        </button>
      </div>

      {/* Economics Config Drawer */}
      {showConfig && (
        <div className={`p-3.5 border space-y-3 animate-fade-in ${
          isDarkMode ? 'bg-[#0B0E16] border-[#222736]' : 'bg-[#F8F9FB] border-[#CBD5E1]'
        }`}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className={`font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Corporate Billing Rate ($/hr)</span>
                <span className="font-mono font-bold text-[#EAAA00]">${rate}/hr</span>
              </div>
              <input
                type="range"
                min="40"
                max="250"
                step="5"
                value={rate}
                onChange={(e) => setRate(Number(e.target.value))}
                className="w-full accent-[#EAAA00] cursor-pointer"
              />
            </div>
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className={`font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Manual Review Time Saved per Task</span>
                <span className="font-mono font-bold text-[#0091DA]">{mins} mins</span>
              </div>
              <input
                type="range"
                min="5"
                max="60"
                step="5"
                value={mins}
                onChange={(e) => setMins(Number(e.target.value))}
                className="w-full accent-[#0091DA] cursor-pointer"
              />
            </div>
          </div>
          <button
            onClick={handleApplyConfig}
            className="px-3 py-1 bg-[#00338D] hover:bg-[#005EB8] text-white text-[11px] font-bold font-mono"
          >
            Update Baseline Model Assumptions
          </button>
        </div>
      )}

      {/* 4 Primary Metric Cards */}
      <div className="grid grid-cols-4 gap-3">
        <div className={`p-3 border ${
          isDarkMode ? 'bg-[#161B29] border-[#222736]' : 'bg-[#F8F9FB] border-[#CBD5E1]'
        }`}>
          <span className={`text-[10px] font-mono font-bold uppercase block ${
            isDarkMode ? 'text-slate-400' : 'text-slate-600'
          }`}>Net Savings / Task</span>
          <span className="text-xl font-bold font-mono text-[#009A44] block mt-1">${netSavings}</span>
          <span className="text-[10px] text-slate-500 block mt-0.5">After AI compute deduction</span>
        </div>

        <div className={`p-3 border ${
          isDarkMode ? 'bg-[#161B29] border-[#222736]' : 'bg-[#F8F9FB] border-[#CBD5E1]'
        }`}>
          <span className={`text-[10px] font-mono font-bold uppercase block ${
            isDarkMode ? 'text-slate-400' : 'text-slate-600'
          }`}>Labor ROI Multiple</span>
          <span className="text-xl font-bold font-mono text-[#0091DA] block mt-1">{roiMultiple.toLocaleString()}x</span>
          <span className="text-[10px] text-slate-500 block mt-0.5">Return on token spend</span>
        </div>

        <div className={`p-3 border ${
          isDarkMode ? 'bg-[#161B29] border-[#222736]' : 'bg-[#F8F9FB] border-[#CBD5E1]'
        }`}>
          <span className={`text-[10px] font-mono font-bold uppercase block ${
            isDarkMode ? 'text-slate-400' : 'text-slate-600'
          }`}>Cost per 1k Tasks</span>
          <span className="text-xl font-bold font-mono text-[#EAAA00] block mt-1">${costPer1k}</span>
          <span className="text-[10px] text-slate-500 block mt-0.5">Avg ~${avgCostPerRun}/call</span>
        </div>

        <div className={`p-3 border ${
          isDarkMode ? 'bg-[#161B29] border-[#222736]' : 'bg-[#F8F9FB] border-[#CBD5E1]'
        }`}>
          <span className={`text-[10px] font-mono font-bold uppercase block ${
            isDarkMode ? 'text-slate-400' : 'text-slate-600'
          }`}>Pareto Assessment</span>
          <span className={`text-xs font-bold font-mono block mt-2 truncate ${
            isDarkMode ? 'text-white' : 'text-[#0B0F19]'
          }`}>
            {overallMatchRate >= 85 ? 'Justified for Prod' : 'Requires Tuning'}
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            {overallMatchRate >= 85 ? 'High Value per Token' : 'Sub-optimal Match'}
          </span>
        </div>
      </div>
    </div>
  );
}
