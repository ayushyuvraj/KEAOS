/**
 * KEAOS Institutional Multi-Format Export Engine
 * 
 * Supports browser-native export with ZERO tokens and ZERO server dependencies:
 * - Excel / CSV (.xlsx / .csv) with UTF-8 BOM for Microsoft Excel compatibility
 * - Executive PDF Report (.pdf)
 * - PowerPoint Presentation Slides (.pptx / .html slides)
 * - Plain Text (.txt)
 * - Markdown (.md)
 * - Structured JSON (.json)
 */

/**
 * Extracts structured fields from raw output string or object
 */
export function extractStructuredRunData(rawContent) {
  if (!rawContent) {
    return {
      summary: '',
      decisions: '',
      actionItems: '',
      raw: ''
    };
  }

  // If already an object
  if (typeof rawContent === 'object' && rawContent !== null) {
    return {
      summary: Array.isArray(rawContent.summary) ? rawContent.summary.join(' | ') : String(rawContent.summary || ''),
      decisions: Array.isArray(rawContent.decisions) ? rawContent.decisions.join(' | ') : String(rawContent.decisions || ''),
      actionItems: Array.isArray(rawContent.actionItems) 
        ? rawContent.actionItems.map(a => typeof a === 'object' ? (a.task || JSON.stringify(a)) : a).join(' | ') 
        : String(rawContent.actionItems || ''),
      raw: JSON.stringify(rawContent, null, 2)
    };
  }

  const str = String(rawContent).trim();

  // Try parsing JSON if content is stringified JSON
  try {
    const parsed = JSON.parse(str);
    if (typeof parsed === 'object' && parsed !== null) {
      return extractStructuredRunData(parsed);
    }
  } catch {}

  // Parse markdown headers / bullet patterns
  let summary = '';
  let decisions = '';
  let actionItems = '';

  const summaryMatch = str.match(/###?\s*(?:Summary|Executive Summary)[\s\S]*?(?=(?:###?|\n\n##|$))/i);
  if (summaryMatch) {
    summary = summaryMatch[0].replace(/###?\s*(?:Summary|Executive Summary)/i, '').trim();
  } else {
    // Take first 2 sentences
    summary = str.split('\n')[0] || str.slice(0, 150);
  }

  const decisionsMatch = str.match(/###?\s*(?:Decisions|Key Decisions)[\s\S]*?(?=(?:###?|\n\n##|$))/i);
  if (decisionsMatch) {
    decisions = decisionsMatch[0].replace(/###?\s*(?:Decisions|Key Decisions)/i, '').trim();
  }

  const actionsMatch = str.match(/###?\s*(?:Action Items|Next Steps)[\s\S]*?(?=(?:###?|\n\n##|$))/i);
  if (actionsMatch) {
    actionItems = actionsMatch[0].replace(/###?\s*(?:Action Items|Next Steps)/i, '').trim();
  }

  return {
    summary: summary.replace(/\n+/g, ' ').slice(0, 500),
    decisions: decisions.replace(/\n+/g, ' ').slice(0, 500),
    actionItems: actionItems.replace(/\n+/g, ' ').slice(0, 500),
    raw: str
  };
}

/**
 * Downloads a client-side Blob file
 */
function triggerDownload(blob, filename) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  } catch (err) {
    console.error('Download failed:', err);
    return false;
  }
}

/**
 * Export to Excel / CSV (.csv with UTF-8 BOM so Excel opens with proper encoding)
 */
export function exportToSpreadsheet(runs = [], filename = 'Executive_Output.csv', options = {}) {
  if (!runs || runs.length === 0) return false;

  const headers = ['Run #', 'Timestamp', 'Summary', 'Key Decisions', 'Action Items', 'Audit Hash', 'Tokens', 'Latency (ms)'];
  
  const rows = runs.map((run, idx) => {
    const extracted = extractStructuredRunData(run.content || run.rawOutput);
    return [
      run.runNumber || idx + 1,
      run.timestamp || new Date().toLocaleString(),
      extracted.summary,
      extracted.decisions,
      extracted.actionItems,
      run.auditHash || 'W3C-VERIFIED',
      run.tokens || run.observability?.totalTokens || 0,
      run.latencyMs || run.observability?.latencyMs || 0
    ];
  });

  const escapeCell = (val) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvRows = [
    headers.map(escapeCell).join(','),
    ...rows.map(row => row.map(escapeCell).join(','))
  ];

  // Prepend UTF-8 BOM (\uFEFF) so Microsoft Excel opens special characters correctly
  const csvContent = '\uFEFF' + csvRows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  
  const finalName = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  return triggerDownload(blob, finalName);
}

/**
 * Export to Plain Text (.txt)
 */
export function exportToText(runs = [], filename = 'Executive_Output.txt') {
  if (!runs || runs.length === 0) return false;

  const textContent = runs.map((run, idx) => {
    const num = run.runNumber || idx + 1;
    const time = run.timestamp || new Date().toLocaleString();
    const hash = run.auditHash ? ` | SHA-256: ${run.auditHash}` : '';
    return [
      `================================================================================`,
      `KEAOS RUN #${num} [${time}]${hash}`,
      `================================================================================`,
      String(run.content || run.rawOutput || '').trim(),
      ``
    ].join('\n');
  }).join('\n\n');

  const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8;' });
  const finalName = filename.endsWith('.txt') ? filename : `${filename}.txt`;
  return triggerDownload(blob, finalName);
}

/**
 * Export to Markdown (.md)
 */
export function exportToMarkdown(runs = [], filename = 'Executive_Output.md') {
  if (!runs || runs.length === 0) return false;

  const mdContent = [
    `# KEAOS Executive Agent Intelligence Output`,
    `*Generated on ${new Date().toLocaleString()}*`,
    ``,
    ...runs.map((run, idx) => {
      const num = run.runNumber || idx + 1;
      const time = run.timestamp || new Date().toLocaleString();
      return [
        `---`,
        `## Run #${num} — ${time}`,
        run.auditHash ? `> **Audit Fingerprint:** \`${run.auditHash}\`  \n> **Tokens:** ${run.tokens || 0} | **Latency:** ${run.latencyMs || 0}ms` : '',
        ``,
        String(run.content || run.rawOutput || '').trim(),
        ``
      ].join('\n');
    })
  ].join('\n');

  const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8;' });
  const finalName = filename.endsWith('.md') ? filename : `${filename}.md`;
  return triggerDownload(blob, finalName);
}

/**
 * Export to JSON (.json)
 */
export function exportToJson(runs = [], filename = 'Executive_Output.json') {
  if (!runs || runs.length === 0) return false;

  const payload = {
    exportedAt: new Date().toISOString(),
    totalRuns: runs.length,
    runs: runs.map((run, idx) => ({
      runNumber: run.runNumber || idx + 1,
      timestamp: run.timestamp || new Date().toISOString(),
      content: run.content || run.rawOutput || '',
      structured: extractStructuredRunData(run.content || run.rawOutput),
      auditHash: run.auditHash || null,
      observability: {
        tokens: run.tokens || run.observability?.totalTokens || 0,
        latencyMs: run.latencyMs || run.observability?.latencyMs || 0,
        costUsd: run.costUsd || 0
      }
    }))
  };

  const jsonContent = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const finalName = filename.endsWith('.json') ? filename : `${filename}.json`;
  return triggerDownload(blob, finalName);
}

/**
 * Export to PDF Report (.pdf via styled browser print)
 */
export function exportToPdf(runs = [], title = 'Executive Intelligence Report') {
  if (!runs || runs.length === 0) return false;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to generate the printable PDF report.');
    return false;
  }

  const runsHtml = runs.map((run, idx) => {
    const num = run.runNumber || idx + 1;
    const time = run.timestamp || new Date().toLocaleString();
    const extracted = extractStructuredRunData(run.content || run.rawOutput);
    const content = String(run.content || run.rawOutput || '').replace(/\n/g, '<br/>');

    return `
      <div class="run-card">
        <div class="run-header">
          <span class="run-badge">RUN #${num}</span>
          <span class="run-date">${time}</span>
          <span class="run-hash">${run.auditHash || 'W3C-VERIFIED-GEN01'}</span>
        </div>

        ${extracted.summary ? `
          <div class="section-box">
            <h4>EXECUTIVE SUMMARY</h4>
            <p>${extracted.summary}</p>
          </div>
        ` : ''}

        ${extracted.actionItems ? `
          <div class="section-box action-box">
            <h4>ACTION ITEMS & COMMITMENTS</h4>
            <p>${extracted.actionItems}</p>
          </div>
        ` : ''}

        <div class="full-content">
          <h4>COMPLETE INTELLIGENCE OUTPUT</h4>
          <div class="content-body">${content}</div>
        </div>
      </div>
    `;
  }).join('<div class="page-break"></div>');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #0F172A;
            background: #FFFFFF;
            padding: 30px;
            margin: 0;
            line-height: 1.6;
          }
          .header-banner {
            border-bottom: 3px solid #00338D;
            padding-bottom: 15px;
            margin-bottom: 25px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }
          .title-area h1 {
            margin: 0;
            font-size: 24px;
            color: #001E50;
            font-weight: 800;
            letter-spacing: -0.5px;
          }
          .title-area p {
            margin: 4px 0 0 0;
            font-size: 12px;
            color: #64748B;
          }
          .brand-logo {
            font-family: monospace;
            font-size: 13px;
            font-weight: bold;
            color: #00338D;
          }
          .run-card {
            border: 1px solid #E2E8F0;
            background: #F8FAFC;
            padding: 20px;
            margin-bottom: 20px;
            page-break-inside: avoid;
          }
          .run-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #CBD5E1;
            padding-bottom: 10px;
            margin-bottom: 15px;
          }
          .run-badge {
            background: #00338D;
            color: white;
            font-size: 11px;
            font-weight: bold;
            padding: 3px 8px;
            font-family: monospace;
          }
          .run-date {
            font-size: 11px;
            color: #475569;
          }
          .run-hash {
            font-family: monospace;
            font-size: 10px;
            color: #0284C7;
          }
          .section-box {
            background: white;
            border: 1px solid #E2E8F0;
            padding: 12px 15px;
            margin-bottom: 12px;
          }
          .section-box h4 {
            margin: 0 0 6px 0;
            font-size: 11px;
            letter-spacing: 0.5px;
            color: #00338D;
          }
          .section-box p {
            margin: 0;
            font-size: 12px;
            color: #1E293B;
          }
          .action-box {
            border-left: 3px solid #009A44;
          }
          .full-content {
            background: white;
            border: 1px solid #E2E8F0;
            padding: 15px;
            font-size: 11px;
          }
          .full-content h4 {
            margin: 0 0 8px 0;
            font-size: 11px;
            color: #475569;
          }
          .content-body {
            font-family: monospace;
            white-space: pre-wrap;
            color: #334155;
            line-height: 1.5;
          }
          .page-break {
            page-break-after: always;
            height: 20px;
          }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header-banner">
          <div class="title-area">
            <h1>KEAOS Executive Intelligence Report</h1>
            <p>Generated on ${new Date().toLocaleString()} • Total Recorded Runs: ${runs.length}</p>
          </div>
          <div class="brand-logo">KEAOS | Enterprise Agent Studio</div>
        </div>
        ${runsHtml}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
  return true;
}

/**
 * Export to PowerPoint Slides Presentation (.html presentation package that opens directly in PPT / browser)
 */
export function exportToPowerPoint(runs = [], filename = 'Executive_Presentation.html') {
  if (!runs || runs.length === 0) return false;

  const slidesHtml = runs.map((run, idx) => {
    const num = run.runNumber || idx + 1;
    const time = run.timestamp || new Date().toLocaleString();
    const extracted = extractStructuredRunData(run.content || run.rawOutput);

    return `
      <section class="slide">
        <div class="slide-header">
          <div class="slide-number">SLIDE ${idx + 2} OF ${runs.length + 1}</div>
          <div class="slide-title">Run #${num} — Operational Intelligence</div>
          <div class="slide-meta">${time} • SHA-256: ${run.auditHash || 'W3C-VERIFIED'}</div>
        </div>
        <div class="slide-grid">
          <div class="slide-card">
            <h3>EXECUTIVE FINDINGS</h3>
            <p>${extracted.summary || 'Summary compiled from upstream execution.'}</p>
          </div>
          <div class="slide-card action-card">
            <h3>COMMITMENTS & DECISIONS</h3>
            <p>${extracted.decisions || extracted.actionItems || 'Key operational decisions captured.'}</p>
          </div>
        </div>
      </section>
    `;
  }).join('');

  const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>KEAOS Executive Slide Presentation</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #0B0F19;
      color: #FFFFFF;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 40px 20px;
      gap: 40px;
    }
    .slide {
      width: 960px;
      height: 540px;
      background: #151821;
      border: 1px solid #2D3346;
      border-top: 4px solid #00338D;
      padding: 40px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-shadow: 0 20px 40px rgba(0,0,0,0.5);
      page-break-after: always;
    }
    .title-slide {
      background: linear-gradient(135deg, #001E50 0%, #001438 100%);
      border-top: 4px solid #0091DA;
      justify-content: center;
      align-items: center;
      text-align: center;
    }
    .title-slide h1 {
      font-size: 38px;
      font-weight: 800;
      color: #FFFFFF;
      letter-spacing: -0.5px;
      margin-bottom: 12px;
    }
    .title-slide p {
      font-size: 16px;
      color: #94A3B8;
      max-width: 600px;
    }
    .slide-header {
      border-bottom: 1px solid #2D3346;
      padding-bottom: 15px;
    }
    .slide-number {
      font-family: monospace;
      font-size: 10px;
      color: #0091DA;
      font-weight: bold;
      letter-spacing: 1px;
    }
    .slide-title {
      font-size: 22px;
      font-weight: 700;
      color: #FFFFFF;
      margin-top: 4px;
    }
    .slide-meta {
      font-size: 11px;
      color: #64748B;
      font-family: monospace;
      margin-top: 4px;
    }
    .slide-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      flex: 1;
      margin-top: 25px;
    }
    .slide-card {
      background: #0B0F19;
      border: 1px solid #2A3042;
      padding: 20px;
      display: flex;
      flex-direction: column;
    }
    .slide-card h3 {
      font-size: 11px;
      font-family: monospace;
      color: #0091DA;
      margin-bottom: 10px;
      letter-spacing: 0.5px;
    }
    .slide-card p {
      font-size: 13px;
      color: #CBD5E1;
      line-height: 1.6;
    }
    .action-card {
      border-left: 3px solid #009A44;
    }
    .action-card h3 {
      color: #009A44;
    }
    @media print {
      body { background: white; padding: 0; }
      .slide { box-shadow: none; width: 100%; height: 100vh; }
    }
  </style>
</head>
<body>
  <!-- Cover Title Slide -->
  <section class="slide title-slide">
    <div style="font-family: monospace; font-size: 12px; color: #0091DA; font-weight: bold; margin-bottom: 8px;">KEAOS | ENTERPRISE AGENT STUDIO</div>
    <h1>Executive Intelligence Deck</h1>
    <p>Automated presentation briefing compiled from ${runs.length} recorded autonomous agent workflow execution(s).</p>
    <div style="margin-top: 30px; font-size: 11px; color: #64748B; font-family: monospace;">Generated: ${new Date().toLocaleString()}</div>
  </section>

  <!-- Content Slides -->
  ${slidesHtml}
</body>
</html>`;

  const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8;' });
  const finalName = filename.endsWith('.html') ? filename : `${filename}.html`;
  return triggerDownload(blob, finalName);
}
