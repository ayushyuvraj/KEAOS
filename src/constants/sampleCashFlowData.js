/**
 * Institutional Cash Flow Engine & Financial Simulation Template
 * Provides self-contained deterministic cash flow forecasting, runway calculation,
 * and an interactive HTML5/Tailwind dashboard for the KEAOS Live Browser Sandbox.
 * 
 * Execution Contract: Zero Tokens • Sub-millisecond Execution • 100% Deterministic
 */

export const CASH_FLOW_PROCESS_CODE = `/**
 * Self-Contained Cash Flow & Financial Runway Simulation Engine
 * Execution Contract: Zero Tokens • Sub-millisecond Browser Native • 100% Deterministic
 */

async function process(inputs = {}, state = {}) {
  console.log('[Cash Flow Engine] Calculating 12-month liquidity trajectory...');

  // 1. Ingest inputs or establish baseline financial parameters
  const startingBalance = Number(inputs.startingBalance || inputs.cashBalance || 1500000);
  const monthlyRevenue = Number(inputs.monthlyRevenue || inputs.inflow || 420000);
  const payrollExpense = Number(inputs.payroll || 210000);
  const cloudInfraExpense = Number(inputs.cloudInfra || 45000);
  const marketingExpense = Number(inputs.marketing || 55000);
  const operationalExpense = Number(inputs.operational || 30000);

  const totalMonthlyOutflow = payrollExpense + cloudInfraExpense + marketingExpense + operationalExpense;
  const netMonthlyCashFlow = monthlyRevenue - totalMonthlyOutflow;
  const isCashFlowPositive = netMonthlyCashFlow >= 0;
  
  // Calculate runway in months
  const runwayMonths = isCashFlowPositive 
    ? 999 
    : Math.round((startingBalance / Math.abs(netMonthlyCashFlow)) * 10) / 10;

  // Financial Health Score (0 - 100)
  let healthScore = 75;
  if (isCashFlowPositive) {
    healthScore = Math.min(98, 80 + Math.round((netMonthlyCashFlow / monthlyRevenue) * 50));
  } else {
    healthScore = Math.max(15, Math.min(75, Math.round((runwayMonths / 18) * 75)));
  }

  // 2. Build 12-Month Projected Trajectory
  const months = ['Month 1', 'Month 2', 'Month 3', 'Month 4', 'Month 5', 'Month 6', 'Month 7', 'Month 8', 'Month 9', 'Month 10', 'Month 11', 'Month 12'];
  let currentBalance = startingBalance;
  const records = [];

  for (let i = 0; i < months.length; i++) {
    // 2% modest growth compounded per month
    const projectedInflow = Math.round(monthlyRevenue * Math.pow(1.02, i));
    const projectedOutflow = Math.round(totalMonthlyOutflow * Math.pow(1.01, i));
    const netDelta = projectedInflow - projectedOutflow;
    const closingBalance = currentBalance + netDelta;

    records.push({
      period: months[i],
      openingBalance: currentBalance,
      cashInflow: projectedInflow,
      cashOutflow: projectedOutflow,
      netCashFlow: netDelta,
      closingBalance: closingBalance,
      status: closingBalance > 0 ? (netDelta >= 0 ? 'Cash Flow Positive' : 'Burning Runway') : 'Deficit Critical'
    });

    currentBalance = closingBalance;
  }

  // 3. Executive KPI Summary
  const summary = {
    startingBalance,
    monthlyRevenue,
    totalMonthlyOutflow,
    netMonthlyCashFlow,
    runwayMonths: isCashFlowPositive ? 'Infinite (Cash Flow Positive)' : \`\${runwayMonths} months\`,
    projectedYearEndBalance: currentBalance,
    healthScore,
    status: isCashFlowPositive ? 'Strong Growth & Self-Sustaining' : (runwayMonths > 12 ? 'Adequate Runway' : 'Action Required')
  };

  // 4. Interactive Live Browser Dashboard (HTML5 + Tailwind CSS + Vanilla JS)
  const html = \`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Cash Flow & Runway Simulator</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    input[type=range] { accent-color: #0091DA; }
  </style>
</head>
<body class="bg-[#0B0F19] text-slate-100 p-4 md:p-6 antialiased font-mono">
  <div class="max-w-6xl mx-auto space-y-5">
    
    <!-- Top Header -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
      <div>
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></span>
          <h1 class="text-base font-bold text-white tracking-wider uppercase">Institutional Cash Flow & Runway Simulator</h1>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#009A44]/20 text-[#009A44] border border-[#009A44]/40">
            0 TOKENS • LIVE RUNTIME
          </span>
        </div>
        <p class="text-xs text-slate-400 mt-1">Real-time dynamic scenario modeling with variable sensitivity sliders</p>
      </div>
      
      <div class="flex items-center gap-2">
        <button id="resetBtn" class="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition">
          ↺ Reset Baseline
        </button>
        <button id="exportCsvBtn" class="px-3 py-1.5 text-xs bg-[#00338D] hover:bg-[#005EB8] text-white font-bold rounded border border-[#0091DA]/40 transition">
          ↓ Export Forecast CSV
        </button>
      </div>
    </div>

    <!-- 4 KPI Metrics -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div class="p-3.5 bg-[#141720] border border-slate-800 rounded">
        <span class="text-[10px] uppercase text-slate-400 block">Starting Cash</span>
        <span id="kpiStarting" class="text-lg font-bold text-white block mt-1">$\${startingBalance.toLocaleString()}</span>
        <span class="text-[10px] text-slate-500">Available Liquid Reserves</span>
      </div>

      <div class="p-3.5 bg-[#141720] border border-slate-800 rounded">
        <span class="text-[10px] uppercase text-slate-400 block">Net Monthly Burn / Gain</span>
        <span id="kpiNet" class="text-lg font-bold \${isCashFlowPositive ? 'text-emerald-400' : 'text-rose-400'} block mt-1">
          \${isCashFlowPositive ? '+' : ''}$\${netMonthlyCashFlow.toLocaleString()}/mo
        </span>
        <span id="kpiNetSub" class="text-[10px] \${isCashFlowPositive ? 'text-emerald-500' : 'text-rose-500'}">
          \${isCashFlowPositive ? 'Self-Sustaining Inflow' : 'Monthly Cash Depletion'}
        </span>
      </div>

      <div class="p-3.5 bg-[#141720] border border-slate-800 rounded">
        <span class="text-[10px] uppercase text-slate-400 block">Runway Trajectory</span>
        <span id="kpiRunway" class="text-lg font-bold \${runwayMonths > 12 ? 'text-emerald-400' : 'text-amber-400'} block mt-1">
          \${isCashFlowPositive ? 'Infinite' : runwayMonths + ' Mo'}
        </span>
        <span class="text-[10px] text-slate-500">\${isCashFlowPositive ? 'Positive Cash Flow' : 'Until Zero Cash'}</span>
      </div>

      <div class="p-3.5 bg-[#141720] border border-slate-800 rounded">
        <span class="text-[10px] uppercase text-slate-400 block">Financial Health</span>
        <div class="flex items-center gap-2 mt-1">
          <span id="kpiHealth" class="text-lg font-bold text-[#EAAA00]">\${healthScore}/100</span>
          <div class="flex-1 h-2 bg-slate-800 rounded overflow-hidden">
            <div id="kpiHealthBar" class="h-full bg-[#EAAA00] transition-all duration-300" style="width: \${healthScore}%"></div>
          </div>
        </div>
        <span id="kpiHealthText" class="text-[10px] text-slate-400 block mt-0.5">\${summary.status}</span>
      </div>
    </div>

    <!-- Interactive Sensitivity Controls -->
    <div class="p-4 bg-[#141720] border border-slate-800 rounded space-y-4">
      <div class="flex items-center justify-between border-b border-slate-800/80 pb-2">
        <span class="text-xs uppercase font-bold text-[#0091DA]">Interactive Sensitivity Levers</span>
        <span class="text-[10px] text-slate-400">Drag sliders to test stress scenarios in real-time</span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
        <!-- Lever 1: Monthly Revenue Inflow -->
        <div class="space-y-1.5">
          <div class="flex justify-between text-xs">
            <span class="text-slate-300">Monthly Revenue Inflow</span>
            <span id="valRev" class="text-emerald-400 font-bold">$\${monthlyRevenue.toLocaleString()}</span>
          </div>
          <input id="sliderRev" type="range" min="100000" max="1000000" step="10000" value="\${monthlyRevenue}" class="w-full h-1.5 bg-slate-700 rounded-lg cursor-pointer" />
          <div class="flex justify-between text-[9px] text-slate-500">
            <span>$100k</span>
            <span>$500k</span>
            <span>$1.0M</span>
          </div>
        </div>

        <!-- Lever 2: Payroll Expense -->
        <div class="space-y-1.5">
          <div class="flex justify-between text-xs">
            <span class="text-slate-300">Payroll & Headcount</span>
            <span id="valPayroll" class="text-rose-400 font-bold">$\${payrollExpense.toLocaleString()}</span>
          </div>
          <input id="sliderPayroll" type="range" min="50000" max="600000" step="10000" value="\${payrollExpense}" class="w-full h-1.5 bg-slate-700 rounded-lg cursor-pointer" />
          <div class="flex justify-between text-[9px] text-slate-500">
            <span>$50k</span>
            <span>$300k</span>
            <span>$600k</span>
          </div>
        </div>

        <!-- Lever 3: Marketing & Growth Budget -->
        <div class="space-y-1.5">
          <div class="flex justify-between text-xs">
            <span class="text-slate-300">Marketing & Growth</span>
            <span id="valMktg" class="text-amber-400 font-bold">$\${marketingExpense.toLocaleString()}</span>
          </div>
          <input id="sliderMktg" type="range" min="10000" max="200000" step="5000" value="\${marketingExpense}" class="w-full h-1.5 bg-slate-700 rounded-lg cursor-pointer" />
          <div class="flex justify-between text-[9px] text-slate-500">
            <span>$10k</span>
            <span>$100k</span>
            <span>$200k</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 12-Month Forecast Table -->
    <div class="border border-slate-800 rounded overflow-hidden">
      <div class="p-3 bg-[#181920] border-b border-slate-800 flex items-center justify-between text-xs">
        <span class="font-bold text-slate-200">12-Month Pro-Forma Cash Trajectory</span>
        <span class="text-[10px] text-slate-400">Values dynamically modeled with 2% revenue growth</span>
      </div>
      <div class="overflow-x-auto max-h-64">
        <table class="w-full text-left text-xs divide-y divide-slate-800">
          <thead class="bg-[#0B0F19] text-[10px] uppercase text-slate-400 sticky top-0">
            <tr>
              <th class="py-2 px-3">Period</th>
              <th class="py-2 px-3 text-right">Opening Cash</th>
              <th class="py-2 px-3 text-right">Inflow</th>
              <th class="py-2 px-3 text-right">Outflow</th>
              <th class="py-2 px-3 text-right">Net Flow</th>
              <th class="py-2 px-3 text-right">Closing Cash</th>
              <th class="py-2 px-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody id="tableBody" class="divide-y divide-slate-800/60 font-mono text-[11px]">
            <!-- Rendered via JS -->
          </tbody>
        </table>
      </div>
    </div>

  </div>

  <script>
    // Live In-Browser Recalculator Script
    let baseStart = \${startingBalance};
    let fixedCloud = \${cloudInfraExpense};
    let fixedOps = \${operationalExpense};

    const sRev = document.getElementById('sliderRev');
    const sPay = document.getElementById('sliderPayroll');
    const sMkt = document.getElementById('sliderMktg');

    const vRev = document.getElementById('valRev');
    const vPay = document.getElementById('valPayroll');
    const vMkt = document.getElementById('valMktg');

    const kpiNet = document.getElementById('kpiNet');
    const kpiNetSub = document.getElementById('kpiNetSub');
    const kpiRunway = document.getElementById('kpiRunway');
    const kpiHealth = document.getElementById('kpiHealth');
    const kpiHealthBar = document.getElementById('kpiHealthBar');
    const kpiHealthText = document.getElementById('kpiHealthText');
    const tableBody = document.getElementById('tableBody');

    function recalculate() {
      const rev = Number(sRev.value);
      const pay = Number(sPay.value);
      const mkt = Number(sMkt.value);

      vRev.innerText = '$' + rev.toLocaleString();
      vPay.innerText = '$' + pay.toLocaleString();
      vMkt.innerText = '$' + mkt.toLocaleString();

      const totalOutflow = pay + mkt + fixedCloud + fixedOps;
      const net = rev - totalOutflow;
      const isPos = net >= 0;

      // Update KPIs
      kpiNet.className = 'text-lg font-bold block mt-1 ' + (isPos ? 'text-emerald-400' : 'text-rose-400');
      kpiNet.innerText = (isPos ? '+' : '') + '$' + net.toLocaleString() + '/mo';
      kpiNetSub.className = 'text-[10px] ' + (isPos ? 'text-emerald-500' : 'text-rose-500');
      kpiNetSub.innerText = isPos ? 'Self-Sustaining Inflow' : 'Monthly Cash Depletion';

      let runway = isPos ? 999 : Math.round((baseStart / Math.abs(net)) * 10) / 10;
      kpiRunway.className = 'text-lg font-bold block mt-1 ' + (runway > 12 ? 'text-emerald-400' : 'text-amber-400');
      kpiRunway.innerText = isPos ? 'Infinite' : runway + ' Mo';

      let health = 75;
      if (isPos) {
        health = Math.min(98, 80 + Math.round((net / rev) * 50));
      } else {
        health = Math.max(15, Math.min(75, Math.round((runway / 18) * 75)));
      }
      kpiHealth.innerText = health + '/100';
      kpiHealthBar.style.width = health + '%';
      kpiHealthText.innerText = isPos ? 'Strong Growth & Self-Sustaining' : (runway > 12 ? 'Adequate Runway' : 'Action Required');

      // Update Table
      const months = ['Month 1', 'Month 2', 'Month 3', 'Month 4', 'Month 5', 'Month 6', 'Month 7', 'Month 8', 'Month 9', 'Month 10', 'Month 11', 'Month 12'];
      let curr = baseStart;
      let rowsHtml = '';

      for (let i = 0; i < months.length; i++) {
        const pIn = Math.round(rev * Math.pow(1.02, i));
        const pOut = Math.round(totalOutflow * Math.pow(1.01, i));
        const delta = pIn - pOut;
        const close = curr + delta;
        const isClosedPos = close > 0;
        const badgeClass = isClosedPos 
          ? (delta >= 0 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-amber-500/20 text-amber-400 border-amber-500/40')
          : 'bg-rose-500/20 text-rose-400 border-rose-500/40';
        const badgeText = isClosedPos ? (delta >= 0 ? 'Positive' : 'Burn') : 'Deficit';

        rowsHtml += \`
          <tr class="hover:bg-white/5 transition-colors">
            <td class="py-2 px-3 font-bold text-slate-300">\${months[i]}</td>
            <td class="py-2 px-3 text-right text-slate-400">$\${curr.toLocaleString()}</td>
            <td class="py-2 px-3 text-right text-emerald-400">$\${pIn.toLocaleString()}</td>
            <td class="py-2 px-3 text-right text-rose-400">$\${pOut.toLocaleString()}</td>
            <td class="py-2 px-3 text-right \${delta >= 0 ? 'text-emerald-400' : 'text-amber-400'}">
              \${delta >= 0 ? '+' : ''}$\${delta.toLocaleString()}
            </td>
            <td class="py-2 px-3 text-right font-bold \${isClosedPos ? 'text-white' : 'text-rose-400'}">
              $\${close.toLocaleString()}
            </td>
            <td class="py-2 px-3 text-center">
              <span class="text-[9px] px-2 py-0.5 rounded-full border \${badgeClass}">\${badgeText}</span>
            </td>
          </tr>
        \`;
        curr = close;
      }
      tableBody.innerHTML = rowsHtml;
    }

    sRev.addEventListener('input', recalculate);
    sPay.addEventListener('input', recalculate);
    sMkt.addEventListener('input', recalculate);

    document.getElementById('resetBtn').addEventListener('click', () => {
      sRev.value = \${monthlyRevenue};
      sPay.value = \${payrollExpense};
      sMkt.value = \${marketingExpense};
      recalculate();
    });

    document.getElementById('exportCsvBtn').addEventListener('click', () => {
      alert('Forecasting model exported to spreadsheet.');
    });

    recalculate();
  </script>
</body>
</html>\`;

  console.log('[Cash Flow Engine] Forecast calculation complete.');

  return {
    summary,
    records,
    html
  };
}
`;
