import React, { useState } from 'react';
import { GitFork, Check, Sparkles, Play, AlertCircle } from 'lucide-react';
import { testRuleWithSample } from '../services/routerEngine';

const OPERATORS = [
  { value: '==', label: '== (Equals)' },
  { value: '!=', label: '!= (Not Equals)' },
  { value: '>', label: '> (Greater Than)' },
  { value: '>=', label: '>= (Greater Than or Equal)' },
  { value: '<', label: '< (Less Than)' },
  { value: '<=', label: '<= (Less Than or Equal)' },
  { value: 'contains', label: 'contains (Text Contains)' },
  { value: 'not_contains', label: 'not_contains (Does Not Contain)' },
  { value: 'is_not_empty', label: 'is_not_empty (Has Value)' },
  { value: 'is_empty', label: 'is_empty (Empty / Null)' }
];

export default function RouterInspectorPanel({
  selectedNode,
  onUpdateNodeData,
  isDarkMode = true,
  t
}) {
  const nodeData = selectedNode?.data || {};

  const targetField = nodeData.targetField ?? 'status';
  const operator = nodeData.operator ?? '==';
  const comparisonValue = nodeData.comparisonValue ?? 'approved';
  const trueLabel = nodeData.trueLabel ?? 'True / Match';
  const falseLabel = nodeData.falseLabel ?? 'False / Default';

  // Live Rule Tester State
  const upstreamPayload = nodeData?.upstreamPayload || nodeData?.currentInput;
  const [testPayloadText, setTestPayloadText] = useState(() => {
    return upstreamPayload ? JSON.stringify(upstreamPayload, null, 2) : '{\n  "status": "approved"\n}';
  });
  const [testResult, setTestResult] = useState(null);

  const handleFieldChange = (field, value) => {
    onUpdateNodeData(selectedNode.id, { [field]: value });
  };

  const handleRunTest = () => {
    const rule = { targetField, operator, comparisonValue };
    const res = testRuleWithSample(rule, testPayloadText);
    setTestResult(res);
  };

  return (
    <div className="space-y-4">
      {/* 1. Routing Condition Builder */}
      <div className={`p-4 ${t.card} rounded-2xl space-y-3.5`}>
        <div className="flex items-center justify-between">
          <label className={`text-xs font-semibold uppercase tracking-wider ${t.label} block font-mono flex items-center gap-1.5`}>
            <span>Evaluation Rule</span>
          </label>
          <span className="text-[9px] font-mono text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            0 TOKENS
          </span>
        </div>

        {/* Target Field Input */}
        <div className="space-y-1">
          <span className={`text-[10px] font-mono ${t.subText} uppercase`}>Target Field Name</span>
          <input
            type="text"
            value={targetField}
            onChange={(e) => handleFieldChange('targetField', e.target.value)}
            placeholder="e.g. status or riskScore or data.amount"
            className={`w-full px-3 py-2 text-xs font-mono rounded-xl transition-all ${t.input}`}
          />
        </div>

        {/* Operator Selector */}
        <div className="space-y-1">
          <span className={`text-[10px] font-mono ${t.subText} uppercase`}>Comparison Operator</span>
          <select
            value={operator}
            onChange={(e) => handleFieldChange('operator', e.target.value)}
            className={`w-full px-3 py-2 text-xs font-mono rounded-xl transition-all ${t.input}`}
          >
            {OPERATORS.map((op) => (
              <option key={op.value} value={op.value} className="bg-slate-900 text-white">
                {op.label}
              </option>
            ))}
          </select>
        </div>

        {/* Comparison Value Input */}
        {!['is_empty', 'is_not_empty'].includes(operator) && (
          <div className="space-y-1">
            <span className={`text-[10px] font-mono ${t.subText} uppercase`}>Expected Value</span>
            <input
              type="text"
              value={comparisonValue}
              onChange={(e) => handleFieldChange('comparisonValue', e.target.value)}
              placeholder="e.g. approved or 0.75"
              className={`w-full px-3 py-2 text-xs font-mono rounded-xl transition-all ${t.input}`}
            />
          </div>
        )}
      </div>

      {/* 2. Branch Output Labels */}
      <div className={`p-4 ${t.card} rounded-2xl space-y-3`}>
        <span className={`text-xs font-semibold uppercase tracking-wider ${t.label} block font-mono`}>
          Output Branch Labels
        </span>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <span className="text-[10px] font-mono font-bold text-[#10B981] flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#10B981]" />
              True Port
            </span>
            <input
              type="text"
              value={trueLabel}
              onChange={(e) => handleFieldChange('trueLabel', e.target.value)}
              placeholder="True Branch"
              className={`w-full px-2.5 py-1.5 text-xs font-mono rounded-lg transition-all ${t.input}`}
            />
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-mono font-bold text-[#0091DA] flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#0091DA]" />
              False Port
            </span>
            <input
              type="text"
              value={falseLabel}
              onChange={(e) => handleFieldChange('falseLabel', e.target.value)}
              placeholder="False Branch"
              className={`w-full px-2.5 py-1.5 text-xs font-mono rounded-lg transition-all ${t.input}`}
            />
          </div>
        </div>
      </div>

      {/* 3. Live Rule Simulator */}
      <div className={`p-4 ${t.card} rounded-2xl space-y-3`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#0091DA]" />
            <span className={`text-xs font-semibold uppercase tracking-wider ${t.label} font-mono`}>
              Rule Quick Test
            </span>
          </div>
          <button
            type="button"
            onClick={handleRunTest}
            className="px-2.5 py-1 bg-[#00338D] hover:bg-[#005EB8] text-white text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-sm active:scale-95"
          >
            <Play className="w-3 h-3 fill-white" />
            <span>Evaluate</span>
          </button>
        </div>

        <textarea
          rows={4}
          value={testPayloadText}
          onChange={(e) => setTestPayloadText(e.target.value)}
          className={`w-full p-2.5 text-[11px] font-mono rounded-xl transition-all ${t.input} resize-none leading-relaxed`}
          placeholder='{"status": "approved"}'
        />

        {testResult && (
          <div className={`p-2.5 rounded-xl border text-xs font-mono transition-all animate-in fade-in duration-150 ${
            testResult.success
              ? testResult.matched
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}>
            {testResult.success ? (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Directs to: [{testResult.branch === 'true-out' ? trueLabel : falseLabel}] ({testResult.branch})
                  </span>
                </div>
                <div className="text-[10px] opacity-80 pl-5">
                  {testResult.reason}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-red-400">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{testResult.error}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
