/**
 * KEAOS Universal Webview Compiler
 * 
 * Transforms ANY deterministic execution output (raw HTML, multi-bucket datasets, 
 * single tables, nested comparison trees, or scalar metrics) into a self-contained, 
 * interactive, responsive HTML5 web application.
 * 
 * Runs seamlessly in Google Chrome, Microsoft Edge, and modern browsers inside
 * sandboxed iframes and standalone popup tabs.
 * 
 * 100% Deterministic • Zero LLM Tokens • Institutional UI
 */

/**
 * Escapes unsafe characters for safe inline script embedding.
 */
function safeJsonEmbed(data) {
  return JSON.stringify(data || {})
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/\//g, '\\u002f');
}

/**
 * Normalizes any output structure into a standardized multi-bucket dataset dictionary.
 * E.g., { matched: [...], missingInGst: [...] } -> { 'Matched': [...], 'Missing in GST': [...] }
 */
export function normalizeOutputDatasets(rawOut) {
  if (!rawOut) return { datasets: {}, summary: {}, primaryKey: 'All' };

  // If already an array, treat as single dataset
  if (Array.isArray(rawOut)) {
    return {
      datasets: { 'All Records': rawOut },
      summary: { total_records: rawOut.length },
      primaryKey: 'All Records'
    };
  }

  if (typeof rawOut !== 'object') {
    return {
      datasets: { 'Output': [{ value: String(rawOut) }] },
      summary: {},
      primaryKey: 'Output'
    };
  }

  const datasets = {};
  const summary = { ...(rawOut.summary || rawOut.kpis || rawOut.metrics || rawOut.stats || {}) };
  let primaryKey = null;

  // 1. Scan for array properties (buckets)
  for (const [key, val] of Object.entries(rawOut)) {
    if (key === 'summary' || key === 'kpis' || key === 'metrics' || key === 'stats' || key === 'html') continue;

    if (Array.isArray(val)) {
      const humanLabel = key
        .replace(/([A-Z])/g, ' $1')
        .replace(/[_\-]+/g, ' ')
        .trim()
        .replace(/\b\w/g, c => c.toUpperCase());
      
      datasets[humanLabel] = val;
      if (!primaryKey) primaryKey = humanLabel;
    } else if (val && typeof val === 'object' && !Array.isArray(val)) {
      // Check if nested object has arrays
      const subArrays = Object.entries(val).filter(([_, v]) => Array.isArray(v));
      if (subArrays.length > 0) {
        subArrays.forEach(([subK, subV]) => {
          const humanLabel = `${key}: ${subK}`
            .replace(/([A-Z])/g, ' $1')
            .replace(/[_\-]+/g, ' ')
            .trim();
          datasets[humanLabel] = subV;
          if (!primaryKey) primaryKey = humanLabel;
        });
      } else {
        // Scalar stats or metadata
        summary[key] = typeof val === 'object' ? JSON.stringify(val) : val;
      }
    } else {
      // Scalar metric
      if (summary[key] === undefined) {
        summary[key] = val;
      }
    }
  }

  // 2. If no array buckets were found, but we have scalar output or records inside items/data
  if (Object.keys(datasets).length === 0) {
    if (Array.isArray(rawOut.records)) {
      datasets['Records'] = rawOut.records;
      primaryKey = 'Records';
    } else if (Array.isArray(rawOut.items)) {
      datasets['Items'] = rawOut.items;
      primaryKey = 'Items';
    } else if (Array.isArray(rawOut.data)) {
      datasets['Data'] = rawOut.data;
      primaryKey = 'Data';
    } else {
      // Wrap the single object as a 1-row table
      const filteredObj = { ...rawOut };
      delete filteredObj.summary;
      delete filteredObj.html;
      datasets['Summary'] = [filteredObj];
      primaryKey = 'Summary';
    }
  }

  return { datasets, summary, primaryKey: primaryKey || Object.keys(datasets)[0] };
}

/**
 * Universal Compiler: Generates full HTML5/Tailwind interactive web app from output.
 */
export function compileOutputToHtml({
  rawOutput,
  title = 'KEAOS Universal Live Applet',
  nodeName = 'Deterministic Box',
  latencyMs = 0,
  language = 'javascript'
}) {
  if (!rawOutput) {
    return generateEmptyStateHtml(title, nodeName);
  }

  // 1. Direct HTML Bypass: If user code returned explicit HTML, return it wrapped safely
  const explicitHtml = rawOutput?.html 
    || (typeof rawOutput === 'string' && (rawOutput.trim().startsWith('<') || rawOutput.trim().startsWith('<!DOCTYPE')) ? rawOutput : null);

  if (explicitHtml) {
    // Inject viewport and base styles if missing
    if (!explicitHtml.includes('<meta name="viewport"')) {
      return explicitHtml.replace('<head>', '<head><meta name="viewport" content="width=device-width, initial-scale=1.0">');
    }
    return explicitHtml;
  }

  // 2. Multi-Bucket Dataset Normalization
  const { datasets, summary, primaryKey } = normalizeOutputDatasets(rawOutput);
  const datasetKeys = Object.keys(datasets);

  // Compute high-level KPI cards
  const kpis = [];
  datasetKeys.forEach(k => {
    kpis.push({
      label: k.toUpperCase(),
      count: datasets[k].length,
      isBucket: true,
      bucketKey: k
    });
  });

  // Extract explicit scalar summary items
  Object.entries(summary).slice(0, 6).forEach(([k, v]) => {
    if (typeof v !== 'object' && v !== null) {
      const cleanLabel = k.replace(/([A-Z])/g, ' $1').replace(/[_\-]+/g, ' ').toUpperCase();
      let displayVal = String(v);
      if (typeof v === 'number') {
        if (k.toLowerCase().includes('rate') || k.toLowerCase().includes('percent') || k.toLowerCase().includes('pct')) {
          displayVal = `${v.toFixed(1)}%`;
        } else if (k.toLowerCase().includes('amount') || k.toLowerCase().includes('cost') || k.toLowerCase().includes('price') || k.toLowerCase().includes('total')) {
          displayVal = `₹${v.toLocaleString('en-IN')}`;
        } else {
          displayVal = v.toLocaleString();
        }
      }
      kpis.push({
        label: cleanLabel,
        count: displayVal,
        isBucket: false
      });
    }
  });

  const serializedDatasets = safeJsonEmbed(datasets);
  const safeTitle = (title || 'Universal Live Applet').replace(/"/g, '&quot;');
  const safeNodeName = (nodeName || 'Deterministic Engine').replace(/"/g, '&quot;');

  return `<!DOCTYPE html>
<html lang="en" class="h-full">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle} — KEAOS Live Browser</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background-color: #0B0F19;
      color: #F1F5F9;
      margin: 0;
      padding: 0;
      height: 100%;
      overflow: hidden;
    }
    ::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    ::-webkit-scrollbar-track {
      background: #0B0F19;
    }
    ::-webkit-scrollbar-thumb {
      background: #232936;
      border-radius: 0px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: #3B4254;
    }
    .badge-matched { background-color: rgba(0, 154, 68, 0.15); color: #009A44; border: 1px solid rgba(0, 154, 68, 0.35); }
    .badge-missing { background-color: rgba(224, 36, 36, 0.15); color: #F87171; border: 1px solid rgba(224, 36, 36, 0.35); }
    .badge-amber { background-color: rgba(234, 170, 0, 0.15); color: #EAAA00; border: 1px solid rgba(234, 170, 0, 0.35); }
    .badge-blue { background-color: rgba(0, 145, 218, 0.15); color: #0091DA; border: 1px solid rgba(0, 145, 218, 0.35); }
  </style>
</head>
<body class="flex flex-col h-full bg-[#0B0F19] text-slate-100 font-sans select-text">

  <!-- TOP APPLET HEADER -->
  <header class="bg-[#0E131F] border-b border-[#1E2638] px-4 py-3 shrink-0 flex items-center justify-between gap-3">
    <div class="flex items-center gap-3 min-w-0">
      <div class="w-8 h-8 rounded-none bg-[#00338D] text-white flex items-center justify-center shrink-0 shadow-md">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="square" stroke-linejoin="miter" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </div>
      <div class="min-w-0">
        <div class="flex items-center gap-2">
          <h1 class="text-xs font-mono font-bold uppercase tracking-wider text-white truncate">${safeTitle}</h1>
          <span class="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-[#009A44]/20 text-[#009A44] border border-[#009A44]/40 shrink-0">
            ✓ 100% Deterministic
          </span>
        </div>
        <p class="text-[10px] text-slate-400 font-mono truncate mt-0.5">
          ${safeNodeName} • ${language.toUpperCase()} Isolate • ${latencyMs}ms execution latency • 0 Tokens
        </p>
      </div>
    </div>

    <!-- ACTION BUTTONS -->
    <div class="flex items-center gap-2 shrink-0">
      <button 
        type="button"
        onclick="exportActiveCsv()"
        class="px-2.5 py-1 text-[10px] font-mono font-bold bg-[#141A29] hover:bg-[#1E2638] text-slate-200 border border-[#2B354D] rounded-none flex items-center gap-1.5 transition-all cursor-pointer"
        title="Download currently selected tab as CSV"
      >
        <svg class="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        <span>Export CSV</span>
      </button>

      <button 
        type="button"
        onclick="exportAllJson()"
        class="px-2.5 py-1 text-[10px] font-mono font-bold bg-[#141A29] hover:bg-[#1E2638] text-slate-200 border border-[#2B354D] rounded-none flex items-center gap-1.5 transition-all cursor-pointer"
        title="Download complete output as JSON"
      >
        <svg class="w-3 h-3 text-[#0091DA]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
        <span>JSON</span>
      </button>
    </div>
  </header>

  <!-- KPI SUMMARY CARDS -->
  <section class="bg-[#0B0F19] px-4 pt-3 pb-2 shrink-0 border-b border-[#1E2638]">
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-${Math.min(kpis.length, 6)} gap-2">
      ${kpis.map((kpi, idx) => `
        <div 
          ${kpi.isBucket ? `onclick="switchTab('${kpi.bucketKey.replace(/'/g, "\\'")}')"` : ''}
          class="p-2.5 bg-[#101522] border border-[#1E2638] rounded-none ${kpi.isBucket ? 'hover:border-[#0091DA] cursor-pointer transition-colors' : ''}"
        >
          <span class="text-[9px] font-mono text-slate-400 uppercase tracking-wider block truncate">${kpi.label}</span>
          <span class="text-base font-mono font-bold text-white block mt-0.5 truncate">${kpi.count}</span>
          <span class="text-[8px] font-mono ${kpi.isBucket ? 'text-[#0091DA]' : 'text-emerald-400'} block mt-0.5">
            ${kpi.isBucket ? 'Click to inspect bucket' : 'Executive Metric'}
          </span>
        </div>
      `).join('')}
    </div>
  </section>

  <!-- CONTROLS & TAB STRIP -->
  <nav class="bg-[#0E131F] px-4 py-2 border-b border-[#1E2638] shrink-0 flex flex-wrap items-center justify-between gap-2">
    <!-- Category Filter Tabs -->
    <div class="flex items-center gap-1 overflow-x-auto py-0.5" id="tab-strip">
      ${datasetKeys.map(k => `
        <button
          type="button"
          onclick="switchTab('${k.replace(/'/g, "\\'")}')"
          id="tab-btn-${encodeURIComponent(k)}"
          class="tab-btn px-3 py-1 text-[11px] font-mono rounded-none uppercase transition-all whitespace-nowrap cursor-pointer border ${
            k === primaryKey 
              ? 'bg-[#00338D] text-white font-bold border-[#005EB8]' 
              : 'bg-[#141A29] text-slate-400 border-[#2B354D] hover:text-white'
          }"
        >
          ${k} (${datasets[k].length})
        </button>
      `).join('')}
    </div>

    <!-- Instant Search Input -->
    <div class="relative w-full sm:w-64">
      <div class="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-500">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <input 
        type="text" 
        id="search-input" 
        oninput="handleSearch(this.value)"
        placeholder="Filter records..."
        class="w-full pl-8 pr-3 py-1 bg-[#141A29] border border-[#2B354D] rounded-none text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#0091DA]"
      />
    </div>
  </nav>

  <!-- MAIN SCROLLABLE TABLE AREA -->
  <main class="flex-1 overflow-auto bg-[#0B0F19] relative">
    <table class="w-full text-left border-collapse" id="data-table">
      <thead class="sticky top-0 bg-[#101522] z-10 border-b border-[#1E2638] text-[10px] font-mono text-slate-400 uppercase tracking-wider select-none" id="table-head">
        <!-- Rendered by JS -->
      </thead>
      <tbody class="divide-y divide-[#182030] text-[11px] font-mono" id="table-body">
        <!-- Rendered by JS -->
      </tbody>
    </table>
    <div id="empty-notice" class="hidden flex-col items-center justify-center p-12 text-center">
      <p class="text-xs font-mono text-slate-400">No matching records found.</p>
    </div>
  </main>

  <!-- FOOTER / PAGINATION -->
  <footer class="bg-[#0E131F] border-t border-[#1E2638] px-4 py-2 shrink-0 flex items-center justify-between text-[10px] font-mono text-slate-400">
    <div id="footer-count">Showing 0 of 0 records</div>
    <div class="flex items-center gap-1" id="pagination-controls">
      <button 
        type="button" 
        onclick="prevPage()"
        class="px-2 py-0.5 bg-[#141A29] hover:bg-[#1E2638] text-slate-300 border border-[#2B354D] rounded-none cursor-pointer"
      >
        Previous
      </button>
      <span id="page-display" class="px-2 text-slate-200 font-bold">Page 1</span>
      <button 
        type="button" 
        onclick="nextPage()"
        class="px-2 py-0.5 bg-[#141A29] hover:bg-[#1E2638] text-slate-300 border border-[#2B354D] rounded-none cursor-pointer"
      >
        Next
      </button>
    </div>
  </footer>

  <!-- EMBEDDED ENGINE JAVASCRIPT (Zero Dependencies) -->
  <script>
    const allDatasets = ${serializedDatasets};
    let currentTab = "${primaryKey.replace(/"/g, '\\"')}";
    let searchQuery = '';
    let currentPage = 1;
    const pageSize = 50;

    function getActiveRows() {
      const rows = allDatasets[currentTab] || [];
      if (!Array.isArray(rows)) return [];
      if (!searchQuery.trim()) return rows;

      const q = searchQuery.toLowerCase();
      return rows.filter(r => {
        if (!r) return false;
        if (typeof r !== 'object') return String(r).toLowerCase().includes(q);
        return Object.values(r).some(v => String(v ?? '').toLowerCase().includes(q));
      });
    }

    function switchTab(tabKey) {
      currentTab = tabKey;
      currentPage = 1;
      
      // Update Tab Button Styles
      document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.className = 'tab-btn px-3 py-1 text-[11px] font-mono rounded-none uppercase transition-all whitespace-nowrap cursor-pointer border bg-[#141A29] text-slate-400 border-[#2B354D] hover:text-white';
      });
      const activeBtn = document.getElementById('tab-btn-' + encodeURIComponent(tabKey));
      if (activeBtn) {
        activeBtn.className = 'tab-btn px-3 py-1 text-[11px] font-mono rounded-none uppercase transition-all whitespace-nowrap cursor-pointer border bg-[#00338D] text-white font-bold border-[#005EB8]';
      }

      renderTable();
    }

    function handleSearch(val) {
      searchQuery = val || '';
      currentPage = 1;
      renderTable();
    }

    function renderTable() {
      const filtered = getActiveRows();
      const headEl = document.getElementById('table-head');
      const bodyEl = document.getElementById('table-body');
      const emptyEl = document.getElementById('empty-notice');
      const countEl = document.getElementById('footer-count');
      const pageEl = document.getElementById('page-display');

      if (!filtered.length) {
        headEl.innerHTML = '';
        bodyEl.innerHTML = '';
        emptyEl.classList.remove('hidden');
        emptyEl.classList.add('flex');
        countEl.textContent = 'Showing 0 records in ' + currentTab;
        pageEl.textContent = 'Page 1';
        return;
      }

      emptyEl.classList.add('hidden');
      emptyEl.classList.remove('flex');

      // Determine Columns
      let columns = [];
      const sample = filtered[0];
      if (typeof sample === 'object' && sample !== null && !Array.isArray(sample)) {
        columns = Object.keys(sample).filter(k => typeof sample[k] !== 'object' || sample[k] === null);
      } else {
        columns = ['Value'];
      }

      // Render Head
      headEl.innerHTML = '<tr><th class="py-2 px-3 border-r border-[#1E2638] w-12 text-center">#</th>' + 
        columns.map(c => '<th class="py-2 px-3 border-r border-[#1E2638] truncate">' + 
          c.replace(/([A-Z])/g, ' $1').replace(/[_\-]+/g, ' ') + 
        '</th>').join('') + '</tr>';

      // Paginate
      const totalPages = Math.ceil(filtered.length / pageSize) || 1;
      if (currentPage > totalPages) currentPage = totalPages;
      if (currentPage < 1) currentPage = 1;

      const startIdx = (currentPage - 1) * pageSize;
      const endIdx = startIdx + pageSize;
      const pageRows = filtered.slice(startIdx, endIdx);

      // Render Body
      bodyEl.innerHTML = pageRows.map((row, idx) => {
        const rowNum = startIdx + idx + 1;
        const cells = columns.map(c => {
          const val = (typeof row === 'object' && row !== null) ? row[c] : row;
          return formatCell(c, val);
        }).join('');

        return '<tr class="hover:bg-white/[0.04] transition-colors">' +
          '<td class="py-1.5 px-3 border-r border-[#1E2638] text-center text-slate-500 text-[10px]">' + rowNum + '</td>' +
          cells +
        '</tr>';
      }).join('');

      // Update Footer
      countEl.textContent = 'Showing ' + (startIdx + 1) + ' to ' + Math.min(endIdx, filtered.length) + ' of ' + filtered.length + ' records (' + currentTab + ')';
      pageEl.textContent = 'Page ' + currentPage + ' of ' + totalPages;
    }

    function formatCell(columnName, val) {
      if (val === null || val === undefined) {
        return '<td class="py-1.5 px-3 border-r border-[#1E2638] text-slate-600">-</td>';
      }

      const colLower = String(columnName).toLowerCase();
      const strVal = String(val);

      // Status badges
      if (colLower.includes('status') || colLower.includes('match') || colLower.includes('state') || colLower.includes('type')) {
        let badgeClass = 'badge-blue';
        if (/match|valid|success|active|pass|approved/i.test(strVal)) badgeClass = 'badge-matched';
        else if (/missing|fail|error|reject|flag/i.test(strVal)) badgeClass = 'badge-missing';
        else if (/pending|warn|review|partial/i.test(strVal)) badgeClass = 'badge-amber';

        return '<td class="py-1.5 px-3 border-r border-[#1E2638] truncate">' +
          '<span class="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase ' + badgeClass + '">' +
            strVal +
          '</span></td>';
      }

      // Currency / Numbers
      if (typeof val === 'number') {
        if (colLower.includes('amount') || colLower.includes('tax') || colLower.includes('val') || colLower.includes('cost') || colLower.includes('price')) {
          return '<td class="py-1.5 px-3 border-r border-[#1E2638] font-bold text-emerald-400 font-mono truncate">₹' + 
            val.toLocaleString('en-IN') + '</td>';
        }
        return '<td class="py-1.5 px-3 border-r border-[#1E2638] text-slate-300 font-mono truncate">' + 
          val.toLocaleString() + '</td>';
      }

      return '<td class="py-1.5 px-3 border-r border-[#1E2638] text-slate-300 truncate max-w-xs">' + 
        escapeHtml(strVal) + '</td>';
    }

    function escapeHtml(str) {
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    function prevPage() {
      if (currentPage > 1) {
        currentPage--;
        renderTable();
      }
    }

    function nextPage() {
      const filtered = getActiveRows();
      const totalPages = Math.ceil(filtered.length / pageSize) || 1;
      if (currentPage < totalPages) {
        currentPage++;
        renderTable();
      }
    }

    function exportActiveCsv() {
      const rows = getActiveRows();
      if (!rows.length) return alert('No records to export in this tab.');

      const headers = Object.keys(rows[0]).filter(k => typeof rows[0][k] !== 'object' || rows[0][k] === null);
      const csvLines = [headers.join(',')];

      rows.forEach(r => {
        const line = headers.map(h => {
          let val = r[h] ?? '';
          val = String(val).replace(/"/g, '""');
          return '"' + val + '"';
        }).join(',');
        csvLines.push(line);
      });

      const blob = new Blob(["\\ufeff" + csvLines.join('\\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', (currentTab.toLowerCase().replace(/[^a-z0-9_]/g, '_') || 'dataset') + '_export.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    function exportAllJson() {
      const blob = new Blob([JSON.stringify(allDatasets, null, 2)], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', 'keaos_applet_output.json');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    // Initialize on load
    window.addEventListener('DOMContentLoaded', () => {
      renderTable();
    });
    // In case DOMContentLoaded already fired in iframe
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      renderTable();
    }
  </script>
</body>
</html>`;
}

function generateEmptyStateHtml(title, nodeName) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-[#0B0F19] text-slate-300 p-8 flex flex-col items-center justify-center h-screen font-mono">
  <div class="text-center space-y-3">
    <div class="w-10 h-10 mx-auto rounded-none bg-[#00338D] text-white flex items-center justify-center font-bold">
      ⚡
    </div>
    <h2 class="text-sm font-bold text-white uppercase">${title}</h2>
    <p class="text-xs text-slate-500 max-w-sm">
      Ready to execute. Click RUN in the toolbar to compile and mount the live deterministic application.
    </p>
  </div>
</body>
</html>`;
}

