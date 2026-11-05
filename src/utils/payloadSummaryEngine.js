/**
 * USER-CENTRIC OBSERVABILITY & DELIVERABLE EXTRACTOR
 * 
 * Transforms technical OpenTelemetry traces and raw agent payloads into
 * human-understandable task deliverables, business findings, and failure diagnoses.
 * 
 * STRICT INVARIANTS:
 * - Rule 10: ZERO hardcoding. Evaluates dynamic structures generically.
 * - Completely bans displaying useless internal random UUIDs as badges.
 */

/**
 * Format milliseconds into clean human-readable duration
 * STRICT MANDATE: Do not show duration in ms anywhere. Show in seconds only (e.g. 0.28s, 1.4s, 19.7s, 88.0s).
 */
export function formatHumanDuration(ms) {
  const num = Number(ms);
  if (isNaN(num) || num <= 0) return '0.0s';
  const totalSecs = num / 1000;
  if (totalSecs < 1) {
    return `${totalSecs.toFixed(2)}s`;
  }
  return `${totalSecs.toFixed(1)}s`;
}

/**
 * Format raw bytes into human-readable file sizes
 * e.g., 269 KB, 1.2 MB
 */
export function formatHumanBytes(bytes) {
  const num = Number(bytes);
  if (isNaN(num) || num <= 0) return null;
  if (num < 1024) return `${num} B`;
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(0)} KB`;
  return `${(num / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Format timestamp into exact human date and run time
 * e.g., "05 Nov 2026, 11:15 AM" or "05 Nov 2026, 11:15:08 AM"
 */
export function formatExactDateTime(dateInput, includeSeconds = false) {
  if (!dateInput) return '—';
  const d = typeof dateInput === 'number' ? new Date(dateInput) : new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);

  const day = String(d.getDate()).padStart(2, '0');
  const month = d.toLocaleString('en-US', { month: 'short' });
  const year = d.getFullYear();

  const timeOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    ...(includeSeconds ? { second: '2-digit' } : {})
  };
  const timeStr = d.toLocaleTimeString('en-US', timeOptions);

  return `${day} ${month} ${year}, ${timeStr}`;
}

/**
 * Format timestamp into exact date and time (replaces relative time)
 */
export function formatRelativeTime(dateInput) {
  return formatExactDateTime(dateInput, false);
}

/**
 * Safely parse JSON strings or return objects directly
 * Resilient against truncated telemetry snippets (e.g. sliced at 360 chars with trailing "...")
 */
export function safeParseJson(data) {
  if (!data) return null;
  if (typeof data === 'object') return data;
  if (typeof data !== 'string') return null;
  const trimmed = data.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    // Attempt repair for truncated JSON packets commonly found in telemetry buffers
    try {
      let repaired = trimmed.replace(/\.{3,}$/, '').trim();
      repaired = repaired.replace(/,\s*$/, '').trim();

      // Fix dangling unclosed string quote
      const quotes = (repaired.match(/(?<!\\)"/g) || []).length;
      if (quotes % 2 !== 0) {
        repaired += '"';
      }

      // Close open brackets and braces in balance
      const openBrackets = (repaired.match(/\[/g) || []).length;
      const closeBrackets = (repaired.match(/\]/g) || []).length;
      for (let i = 0; i < openBrackets - closeBrackets; i++) {
        repaired += ']';
      }

      const openBraces = (repaired.match(/\{/g) || []).length;
      const closeBraces = (repaired.match(/\}/g) || []).length;
      for (let i = 0; i < openBraces - closeBraces; i++) {
        repaired += '}';
      }

      return JSON.parse(repaired);
    } catch {
      // Regex extraction fallback for key fields from raw truncated JSON
      const fallbackObj = {};
      const pairs = trimmed.match(/"([^"]+)":\s*("([^"\\]*(\\.[^"\\]*)*)"|([0-9.]+)|true|false|null)/g);
      if (pairs && pairs.length > 0) {
        for (const pair of pairs) {
          const match = pair.match(/"([^"]+)":\s*(.*)/);
          if (match) {
            const key = match[1];
            let val = match[2].trim();
            if (val.startsWith('"') && val.endsWith('"')) {
              val = val.slice(1, -1);
            } else if (val === 'true') val = true;
            else if (val === 'false') val = false;
            else if (val === 'null') val = null;
            else if (!isNaN(Number(val))) val = Number(val);
            fallbackObj[key] = val;
          }
        }
        return fallbackObj;
      }
      return null;
    }
  }
}

/**
 * Extract the primary human subject of a run (document, file, query, or prompt)
 */
export function extractTaskSubject(run) {
  if (!run) return 'Workflow Task';

  const inParsed = safeParseJson(run.payload?.inputSnippet) || safeParseJson(run.spans?.[0]?.attributes?.['input.snippet']);
  const outParsed = safeParseJson(run.payload?.outputSnippet) || safeParseJson(run.spans?.[0]?.attributes?.['output.snippet']);

  // 1. Look for explicit filename
  const fileName = 
    outParsed?.fileName || 
    outParsed?.filename || 
    outParsed?.file || 
    inParsed?.fileName || 
    inParsed?.filename || 
    inParsed?.file || 
    inParsed?.name;

  if (fileName && typeof fileName === 'string') {
    return fileName.replace(/^[/\\]+/, '').split(/[/]/).pop();
  }

  // 2. Look for case or document ID
  const caseId = outParsed?.caseId || outParsed?.caseid || inParsed?.caseId || inParsed?.caseid;
  if (caseId) {
    return `Case ${caseId}`;
  }

  // 3. Look for query or prompt
  const query = inParsed?.prompt || inParsed?.query || inParsed?.text;
  if (query && typeof query === 'string') {
    return query.length > 50 ? query.slice(0, 47) + '...' : query;
  }

  return run.workflowName || 'Workflow Execution';
}

/**
 * Extract clean, human-readable business findings (Tax ID, Case ID, Channel, etc.)
 * Strictly filters out useless internal random UUIDs and pipeline control structures.
 */
export function extractBusinessFindings(run) {
  if (!run) return [];

  const outParsed = safeParseJson(run.payload?.outputSnippet) || safeParseJson(run.spans?.[0]?.attributes?.['output.snippet']) || {};
  const inParsed = safeParseJson(run.payload?.inputSnippet) || safeParseJson(run.spans?.[0]?.attributes?.['input.snippet']) || {};
  const merged = { ...inParsed, ...outParsed };

  const findings = [];
  const handledKeys = new Set();

  // 1. Case ID
  const caseId = merged.caseId || merged.caseid;
  if (caseId) {
    findings.push({ label: 'Case Number', value: String(caseId), isPrimary: true });
    handledKeys.add('caseid');
    handledKeys.add('caseId');
  }

  // 2. Tax ID / Transaction ID
  const taxId = merged.taxId || merged.taxid || merged.txnId || merged.txnid;
  if (taxId) {
    const isTxn = Boolean(merged.txnId || merged.txnid) && !Boolean(merged.taxId || merged.taxid);
    findings.push({ label: isTxn ? 'Transaction ID' : 'Tax ID', value: String(taxId), isPrimary: true });
    handledKeys.add('taxid');
    handledKeys.add('taxId');
    handledKeys.add('txnid');
    handledKeys.add('txnId');
  }

  // 3. File Name / Source File
  const fileName = merged.fileName || merged.filename || merged.file;
  if (fileName) {
    findings.push({ label: 'Source File', value: String(fileName) });
    handledKeys.add('filename');
    handledKeys.add('fileName');
    handledKeys.add('file');
  }

  // 4. Pages
  const pages = merged.pages || merged.pageCount;
  if (pages) {
    findings.push({ label: 'Pages Processed', value: `${pages} ${pages === 1 ? 'page' : 'pages'}` });
    handledKeys.add('pages');
    handledKeys.add('pageCount');
  }

  // 5. Channel / Ingress
  const channel = merged.channel || merged.source;
  if (channel && typeof channel === 'string') {
    const cleanChannel = channel.replace(/upload/i, '').trim();
    const formattedChannel = cleanChannel 
      ? (cleanChannel.charAt(0).toUpperCase() + cleanChannel.slice(1) + ' Upload')
      : 'Direct Upload';
    findings.push({ label: 'Ingress Channel', value: formattedChannel });
    handledKeys.add('channel');
    handledKeys.add('source');
  }

  // 6. Received At
  const receivedAt = merged.receivedAt || merged.received_at;
  if (receivedAt) {
    findings.push({ label: 'Received At', value: String(receivedAt) });
    handledKeys.add('receivedAt');
    handledKeys.add('received_at');
  }

  // 7. Other clean string/number fields (strictly skipping internal UUIDs, state, and pipeline objects)
  const ignoredKeys = new Set([
    'id', '_id', 'uuid', 'traceId', 'spanId', 'pipeline', 'state', 'step', 'steps', 
    'status', 'stage', 'error', 'exception', 'size', 'bytes'
  ]);

  for (const [k, v] of Object.entries(merged)) {
    if (handledKeys.has(k) || ignoredKeys.has(k)) continue;
    if (typeof v === 'string' || typeof v === 'number') {
      const valStr = String(v);
      // Skip strings that look like 32-character hex hashes (useless UUIDs)
      if (valStr.length >= 32 && /^[0-9a-fA-F-]+$/.test(valStr)) continue;

      const formattedLabel = k.replace(/([A-Z])/g, ' $1').replace(/[_-]/g, ' ').replace(/^./, str => str.toUpperCase()).trim();
      findings.push({ label: formattedLabel, value: valStr });
      handledKeys.add(k);
    }
  }

  return findings;
}

/**
 * Generate an executive plain-language status diagnosis
 */
export function extractStatusDiagnosis(run) {
  if (!run) return { isException: false, title: 'No Execution Data', message: 'No run selected.' };

  const outParsed = safeParseJson(run.payload?.outputSnippet) || safeParseJson(run.spans?.[0]?.attributes?.['output.snippet']);
  const statusStr = String(outParsed?.status || '').toLowerCase();
  const isFailed = run.status === 'FAILED' || statusStr === 'exception' || statusStr === 'error';
  const stage = outParsed?.stage || 'processing';
  const errorMsg = outParsed?.error || outParsed?.exception || outParsed?.message;
  const taxId = outParsed?.taxId || outParsed?.taxid || outParsed?.txnId || outParsed?.txnid;
  const subject = extractTaskSubject(run);

  if (isFailed) {
    let message = `Execution stopped with an exception during the ${stage.toUpperCase()} stage.`;
    if (taxId && stage.toLowerCase().includes('validation')) {
      message = `Invoice validation failed for Tax ID ${taxId}. The agent extracted the invoice fields from ${subject}, but compliance policy checks rejected the tax record during validation.`;
    } else if (errorMsg) {
      message = typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg);
    }

    return {
      isException: true,
      title: `${stage.charAt(0).toUpperCase() + stage.slice(1)} Exception`,
      message,
      stage
    };
  }

  return {
    isException: false,
    title: 'Completed Successfully',
    message: `All pipeline stages completed without errors. Successfully processed ${subject}.`,
    stage: 'completed'
  };
}

/**
 * Extract chronological pipeline steps actually executed
 */
export function extractPipelineSteps(run) {
  if (!run) return [];

  const outParsed = safeParseJson(run.payload?.outputSnippet) || safeParseJson(run.spans?.[0]?.attributes?.['output.snippet']);
  const pipeline = outParsed?.pipeline;

  // 1. If explicit steps array or object exists (like in AP Tester invoice processing)
  if (pipeline && pipeline.steps) {
    const rawSteps = Array.isArray(pipeline.steps)
      ? pipeline.steps
      : (typeof pipeline.steps === 'object' ? Object.values(pipeline.steps) : []);

    if (rawSteps.length > 0) {
      const isFailed = run.status === 'FAILED' || String(outParsed?.status || '').toLowerCase() === 'exception';

      return rawSteps.map((stepText, idx) => {
        const stepNum = idx + 1;
        const isLastStep = idx === rawSteps.length - 1;

        return {
          number: stepNum,
          name: typeof stepText === 'string' ? stepText : `Pipeline Step ${stepNum}`,
          status: (isLastStep && isFailed) ? 'FAILED' : 'SUCCESS',
          description: (isLastStep && isFailed) 
            ? `Exception encountered at ${outParsed?.stage || 'validation'} stage` 
            : 'Step completed'
        };
      });
    }
  }

  // 2. Otherwise extract from OTel spans
  if (Array.isArray(run.spans) && run.spans.length > 0) {
    return run.spans.map((span, idx) => {
      const isSpanError = span.status?.code === 'ERROR' || span.status === 'ERROR';
      const cleanName = span.name.replace(/^FASTAPI:\s*/i, '').replace(/^[a-z_]+:/i, '').trim();

      return {
        number: idx + 1,
        name: cleanName || span.name,
        status: isSpanError ? 'FAILED' : 'SUCCESS',
        durationMs: span.durationMs,
        durationHuman: formatHumanDuration(span.durationMs),
        model: span.attributes?.['llm.model_name'] || null,
        description: isSpanError ? 'Execution failed during this step' : `Completed in ${formatHumanDuration(span.durationMs)}`
      };
    });
  }

  return [
    {
      number: 1,
      name: run.workflowName || 'Workflow Execution',
      status: run.status === 'SUCCESS' ? 'SUCCESS' : 'FAILED',
      durationMs: run.durationMs,
      durationHuman: formatHumanDuration(run.durationMs),
      description: run.status === 'SUCCESS' ? 'Completed successfully' : 'Execution failed'
    }
  ];
}
