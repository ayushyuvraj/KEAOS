/**
 * KEAOS Universal Deterministic Blueprints
 * 
 * Domain-agnostic Computer Science starter templates for the Deterministic Studio.
 * 100% Deterministic • Zero Tokens • Sub-millisecond Execution
 */

export const STREAM_TRANSFORMER_PROCESS_CODE = `/**
 * Universal Stream Transformer & Schema Normalizer
 * Ingests incoming datasets, normalizes property keys, sanitizes data types,
 * computes statistical aggregates, and emits clean tabular records.
 *
 * Execution Contract: 0 Tokens • Sub-millisecond Browser Native • 100% Deterministic
 */

async function process(inputs = {}, state = {}) {
  const rawList = Array.isArray(inputs.data) 
    ? inputs.data 
    : Array.isArray(inputs.items) 
    ? inputs.items 
    : [
        { id: 'REC-101', rawName: '   Quantum Core   ', amount: '1240.50', status: 'ACTIVE', category: 'Hardware' },
        { id: 'REC-102', rawName: 'Neural Net API', amount: '890.00', status: 'ACTIVE', category: 'Software' },
        { id: 'REC-103', rawName: 'Legacy DB Sync', amount: '-45.00', status: 'FLAGGED', category: 'Database' },
        { id: 'REC-104', rawName: ' Edge Gateway ', amount: '3410.25', status: 'ACTIVE', category: 'Network' },
        { id: 'REC-105', rawName: 'Audit Sentry', amount: '0.00', status: 'PENDING', category: 'Security' }
      ];

  const normalized = [];
  let validCount = 0;
  let flaggedCount = 0;
  let totalVal = 0;

  for (const item of rawList) {
    const cleanName = String(item.rawName || item.name || '').trim();
    const parsedAmount = Math.max(0, parseFloat(item.amount || 0));
    const isFlagged = item.status === 'FLAGGED' || parseFloat(item.amount || 0) < 0;

    if (isFlagged) flaggedCount++;
    else validCount++;

    totalVal += parsedAmount;

    normalized.push({
      id: item.id || \`ID-\${normalized.length + 1}\`,
      name: cleanName,
      category: item.category || 'General',
      amount: parsedAmount,
      status: isFlagged ? 'FLAGGED' : (item.status || 'PROCESSED'),
      validatedAt: new Date().toISOString().split('T')[0]
    });
  }

  const summary = {
    totalProcessed: normalized.length,
    validRecords: validCount,
    flaggedRecords: flaggedCount,
    totalVolume: Math.round(totalVal),
    passRate: \`\${Math.round((validCount / (normalized.length || 1)) * 100)}%\`
  };

  return {
    summary,
    records: normalized
  };
}`;

export const KEY_JOINER_PROCESS_CODE = `/**
 * High-Speed In-Memory Multi-Key Dataset Joiner
 * Performs an O(N) hash-join between Table A and Table B on matching keys,
 * calculating deltas and segregating matched vs orphaned records.
 *
 * Execution Contract: 0 Tokens • Sub-millisecond Browser Native • 100% Deterministic
 */

async function process(inputs = {}, state = {}) {
  const tableA = Array.isArray(inputs.tableA) ? inputs.tableA : [
    { key: 'TX-01', entity: 'Alpha Corp', expectedAmount: 5000 },
    { key: 'TX-02', entity: 'Beta LLC', expectedAmount: 12000 },
    { key: 'TX-03', entity: 'Gamma Inc', expectedAmount: 7500 },
    { key: 'TX-04', entity: 'Delta Group', expectedAmount: 3200 }
  ];

  const tableB = Array.isArray(inputs.tableB) ? inputs.tableB : [
    { key: 'TX-01', entity: 'Alpha Corp', settledAmount: 5000 },
    { key: 'TX-02', entity: 'Beta LLC', settledAmount: 11950 },
    { key: 'TX-04', entity: 'Delta Group', settledAmount: 3200 },
    { key: 'TX-05', entity: 'Epsilon Partners', settledAmount: 8400 }
  ];

  const mapB = new Map(tableB.map(b => [String(b.key).trim().toUpperCase(), b]));
  const matched = [];
  const unmatchedA = [];
  const matchedKeys = new Set();

  for (const a of tableA) {
    const k = String(a.key).trim().toUpperCase();
    const b = mapB.get(k);
    if (b) {
      matchedKeys.add(k);
      const delta = (b.settledAmount || 0) - (a.expectedAmount || 0);
      matched.push({
        key: k,
        entity: a.entity,
        expectedAmount: a.expectedAmount,
        settledAmount: b.settledAmount,
        delta,
        status: delta === 0 ? 'EXACT_MATCH' : 'DELTA_VARIANCE'
      });
    } else {
      unmatchedA.push({
        key: k,
        entity: a.entity,
        expectedAmount: a.expectedAmount,
        status: 'ORPHAN_IN_A'
      });
    }
  }

  const unmatchedB = tableB
    .filter(b => !matchedKeys.has(String(b.key).trim().toUpperCase()))
    .map(b => ({
      key: b.key,
      entity: b.entity,
      settledAmount: b.settledAmount,
      status: 'ORPHAN_IN_B'
    }));

  const records = [...matched, ...unmatchedA, ...unmatchedB];

  return {
    summary: {
      totalTableA: tableA.length,
      totalTableB: tableB.length,
      matchedCount: matched.length,
      exactMatchCount: matched.filter(m => m.status === 'EXACT_MATCH').length,
      varianceCount: matched.filter(m => m.status === 'DELTA_VARIANCE').length,
      orphansCount: unmatchedA.length + unmatchedB.length,
      matchRate: \`\${Math.round((matched.length / (tableA.length || 1)) * 100)}%\`
    },
    records
  };
}`;

export const REACTIVE_UI_PROCESS_CODE = `/**
 * Interactive Reactive UI & Canvas Applet
 * Generates an interactive HTML5 / Canvas widget rendered inside
 * the sandboxed browser preview iframe with live DOM controls.
 *
 * Execution Contract: 0 Tokens • Sub-millisecond Browser Native • 100% Deterministic
 */

async function process(inputs = {}, state = {}) {
  const html = \`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace; margin: 0; background: #0B0F19; color: #F1F5F9; }
    input[type=range] { accent-color: #0091DA; }
  </style>
</head>
<body class="p-4 flex flex-col gap-4">
  <div class="flex items-center justify-between border-b border-slate-800 pb-3">
    <div>
      <h1 class="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        Reactive Metric Simulator
      </h1>
      <p class="text-[10px] text-slate-400 mt-0.5">Real-time client-side calculation inside browser isolate</p>
    </div>
    <span class="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-bold border border-blue-500/40">Active Preview</span>
  </div>

  <div class="grid grid-cols-3 gap-3">
    <div class="p-3 bg-slate-900 border border-slate-800 rounded">
      <span class="text-[9px] uppercase text-slate-400 block">Baseline Value</span>
      <span id="displayBase" class="text-lg font-bold text-white block mt-1">1,000</span>
      <input id="sliderBase" type="range" min="100" max="10000" step="100" value="1000" class="w-full mt-2 cursor-pointer">
    </div>
    <div class="p-3 bg-slate-900 border border-slate-800 rounded">
      <span class="text-[9px] uppercase text-slate-400 block">Multiplier Coefficient</span>
      <span id="displayMult" class="text-lg font-bold text-[#EAAA00] block mt-1">2.5x</span>
      <input id="sliderMult" type="range" min="1" max="10" step="0.5" value="2.5" class="w-full mt-2 cursor-pointer">
    </div>
    <div class="p-3 bg-slate-900 border border-slate-800 rounded">
      <span class="text-[9px] uppercase text-slate-400 block">Calculated Yield</span>
      <span id="displayYield" class="text-lg font-bold text-emerald-400 block mt-1">2,500</span>
      <span class="text-[9px] text-slate-500 block mt-2">Zero server round-trips</span>
    </div>
  </div>

  <div class="p-4 bg-slate-900/50 border border-slate-800 rounded flex-1 flex flex-col">
    <span class="text-[10px] uppercase text-slate-400 font-bold mb-2">Simulation Trajectory</span>
    <canvas id="chartCanvas" class="w-full h-40 bg-black/40 rounded"></canvas>
  </div>

  <script>
    const sliderBase = document.getElementById('sliderBase');
    const sliderMult = document.getElementById('sliderMult');
    const displayBase = document.getElementById('displayBase');
    const displayMult = document.getElementById('displayMult');
    const displayYield = document.getElementById('displayYield');
    const canvas = document.getElementById('chartCanvas');
    const ctx = canvas.getContext('2d');

    function redraw() {
      const b = parseFloat(sliderBase.value);
      const m = parseFloat(sliderMult.value);
      displayBase.textContent = b.toLocaleString();
      displayMult.textContent = m.toFixed(1) + 'x';
      displayYield.textContent = Math.round(b * m).toLocaleString();

      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = '#0091DA';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < canvas.width; i++) {
        const t = i / canvas.width;
        const y = canvas.height - (Math.sin(t * Math.PI * 2 * (m / 2)) * 0.35 + 0.5) * canvas.height;
        if (i === 0) ctx.moveTo(i, y);
        else ctx.lineTo(i, y);
      }
      ctx.stroke();
    }

    sliderBase.addEventListener('input', redraw);
    sliderMult.addEventListener('input', redraw);
    window.addEventListener('resize', redraw);
    redraw();
  </script>
</body>
</html>\`;

  return {
    html,
    summary: {
      status: 'RENDERED',
      widgetType: 'HTML5 Reactive Simulation',
      fps: 60
    }
  };
}`;

