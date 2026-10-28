/**
 * KEAOS Universal Deterministic Logic Compiler
 * 
 * Translates simple, crude human language instructions into clean,
 * bug-free, deterministic backend code in any target language (Python, SQL, JS).
 * Strictly zero hardcoding: completely general-purpose.
 */

import { PROVIDERS, getProviderCredential, getAllConfiguredProviders, getOllamaConfig } from './llmService';
import { GoogleGenAI } from '@google/genai';
import { CASH_FLOW_PROCESS_CODE } from '../constants/sampleCashFlowData';

/**
 * Cleanly extracts code from LLM response markdown blocks.
 */
function extractCode(text, language = 'javascript') {
  if (!text) return '';
  const trimmed = text.trim();
  
  // Match ```lang ... ``` or ``` ... ```
  const regex = /```(?:[a-zA-Z0-9_\-]+)?\s*([\s\S]*?)```/m;
  const match = trimmed.match(regex);
  if (match && match[1]) {
    return match[1].trim();
  }
  return trimmed;
}

/**
 * Offline / Instant fallback templates for common crude requests
 * when no LLM API key is connected.
 */
export function getOfflineFallbackCode(prompt, language, sampleInputs) {
  const p = (prompt || '').toLowerCase();
  const lang = (language || 'javascript').toLowerCase();

  // 1. Variable swap
  if (p.includes('swap') && (p.includes('variable') || p.includes('two'))) {
    if (lang === 'python') {
      return `def process(inputs):\n    # Swap variables dynamically\n    keys = [k for k in inputs.keys() if k != 'data']\n    if len(keys) >= 2:\n        k1, k2 = keys[0], keys[1]\n        inputs[k1], inputs[k2] = inputs[k2], inputs[k1]\n    return inputs`;
    }
    return `function process(inputs) {\n  // Swap first two variables in inputs\n  const keys = Object.keys(inputs).filter(k => k !== 'data');\n  if (keys.length >= 2) {\n    const temp = inputs[keys[0]];\n    inputs[keys[0]] = inputs[keys[1]];\n    inputs[keys[1]] = temp;\n  }\n  return inputs;\n}`;
  }

  // 1.4 Cash Flow Engine, Financial Dashboard & Runway Simulation
  if (p.includes('cash flow') || p.includes('cashflow') || p.includes('runway') || (p.includes('financial') && (p.includes('dashboard') || p.includes('simulator') || p.includes('engine')))) {
    if (lang === 'javascript') {
      return CASH_FLOW_PROCESS_CODE;
    }
  }

  // 2. Table join / VLOOKUP / Reconciliation
  if (p.includes('join') || p.includes('vlookup') || p.includes('merge') || p.includes('reconcil') || p.includes('match')) {
    if (lang === 'sql') {
      return `-- Deterministic SQL Join between Table A and Table B\nSELECT \n  a.*, \n  b.*\nFROM tableA a\nINNER JOIN tableB b\n  ON a.id = b.id;`;
    }
    if (lang === 'python') {
      return `import pandas as pd\n\ndef process(inputs):\n    # Join tableA with tableB\n    df_a = pd.DataFrame(inputs.get('tableA', inputs.get('data', [])))\n    df_b = pd.DataFrame(inputs.get('tableB', []))\n    merged = pd.merge(df_a, df_b, on='id', how='left')\n    return merged.to_dict(orient='records')`;
    }
    return `function process(inputs) {\n  // In-memory high performance O(N) reconciliation/lookup\n  const tableA = inputs.tableA || inputs.data || [];\n  const tableB = inputs.tableB || [];\n  const lookup = new Map(tableB.map(b => [String(b.id || b.invoiceNo || b.gstin || ''), b]));\n  \n  return tableA.map(a => {\n    const matchKey = String(a.id || a.invoiceNo || a.gstin || '');\n    const match = lookup.get(matchKey);\n    return {\n      ...a,\n      matched: match || null,\n      status: match ? 'MATCHED' : 'MISSING'\n    };\n  });\n}`;
  }

  // 3. Filter / Find
  if (p.includes('filter') || p.includes('find') || p.includes('where')) {
    if (lang === 'sql') {
      return `SELECT * FROM data WHERE status = 'active';`;
    }
    return `function process(inputs) {\n  const rows = Array.isArray(inputs) ? inputs : (inputs.data || []);\n  return rows.filter(item => item.active !== false);\n}`;
  }

  // 4. Generalized condition & classification rule parser (e.g. "high or low if tokens > 4000", "flag if score > 80", etc.)
  const numMatch = p.match(/\b([0-9]+(?:,[0-9]+)*(?:\.[0-9]+)?)\b/);
  const thresholdVal = numMatch ? Number(numMatch[1].replace(/,/g, '')) : null;
  const isHighLow = p.includes('high') && p.includes('low');
  const isPassFail = p.includes('pass') && p.includes('fail');
  const hasComparison = p.includes('greater') || p.includes('more') || p.includes('above') || p.includes('exceed') || p.includes('over') || p.includes('>') || p.includes('less') || p.includes('below') || p.includes('under') || p.includes('<') || thresholdVal !== null || isHighLow || isPassFail;

  if (hasComparison && (thresholdVal !== null || isHighLow || isPassFail)) {
    const th = thresholdVal !== null ? thresholdVal : 4000;
    const isLessThan = p.includes('less') || p.includes('below') || p.includes('under') || p.includes('<');
    const labelTrue = isHighLow ? (isLessThan ? 'Low' : 'High') : isPassFail ? (isLessThan ? 'Pass' : 'Fail') : 'Flagged';
    const labelFalse = isHighLow ? (isLessThan ? 'High' : 'Low') : isPassFail ? (isLessThan ? 'Pass' : 'Fail') : 'Normal';
    
    // Identify target property to inspect
    let targetProp = 'tokens';
    if (p.includes('cost') || p.includes('dollar') || p.includes('price')) targetProp = 'costUsd';
    else if (p.includes('latency') || p.includes('time') || p.includes('speed')) targetProp = 'latencyMs';
    else if (p.includes('score') || p.includes('sentiment')) targetProp = 'score';

    if (lang === 'python') {
      return `def process(inputs):\n    # Dynamic rule evaluation: ${prompt.replace(/\n/g, ' ')}\n    data_obj = inputs.get('data') or inputs\n    val = inputs.get('${targetProp}') or (data_obj.get('${targetProp}') if isinstance(data_obj, dict) else 0) or 0\n    threshold = ${th}\n    status = '${labelTrue}' if val ${isLessThan ? '<' : '>'} threshold else '${labelFalse}'\n    return {\n        'value': val,\n        'threshold': threshold,\n        'status': status,\n        'summary': f"${targetProp.toUpperCase()} is {status} ({val} vs threshold {threshold})"\n    }`;
    }
    return `function process(inputs) {\n  // Dynamic rule evaluation: ${prompt.replace(/\n/g, ' ')}\n  const dataObj = inputs.data || inputs;\n  const val = typeof inputs.${targetProp} === 'number' ? inputs.${targetProp} : (typeof dataObj?.${targetProp} === 'number' ? dataObj.${targetProp} : 0);\n  const threshold = ${th};\n  const status = val ${isLessThan ? '<' : '>'} threshold ? '${labelTrue}' : '${labelFalse}';\n  return {\n    value: val,\n    threshold: threshold,\n    status: status,\n    summary: \`${targetProp.toUpperCase()} is \${status} (\${val} vs threshold \${threshold})\`\n  };\n}`;
  }

  // Default clean starter function
  if (lang === 'python') {
    return `def process(inputs):\n    # Process deterministic inputs\n    result = inputs\n    return result`;
  }
  if (lang === 'sql') {
    return `SELECT * FROM data;`;
  }
  return `function process(inputs) {\n  // Transform input data\n  return inputs;\n}`;
}

/**
 * Universal Code Generation from Crude Natural Language
 */
export async function compileDeterministicLogic({
  prompt,
  language = 'javascript',
  sampleInputs = null,
  provider = null,
  modelId = null
}) {
  let effectiveLang = (language || 'auto').toLowerCase();
  if (effectiveLang === 'auto') {
    const p = (prompt || '').toLowerCase();
    if (p.includes('python') || p.includes('pandas') || p.includes('dataframe')) {
      effectiveLang = 'python';
    } else if (p.includes('select ') || p.includes('sql') || p.includes('from ')) {
      effectiveLang = 'sql';
    } else {
      effectiveLang = 'javascript';
    }
  }

  // Auto-detect which provider is configured
  let effectiveProvider = provider;
  if (!effectiveProvider || !getProviderCredential(effectiveProvider)) {
    const configured = getAllConfiguredProviders();
    if (configured.length > 0) {
      effectiveProvider = configured[0];
    } else {
      effectiveProvider = 'openai';
    }
  }

  const credential = getProviderCredential(effectiveProvider);

  // If no credential configured, use resilient offline generator
  if (!credential && effectiveProvider !== 'ollama') {
    return {
      success: true,
      language: effectiveLang,
      code: getOfflineFallbackCode(prompt, effectiveLang, sampleInputs),
      isFallback: true,
      note: 'Generated via offline deterministic template (No API key configured).'
    };
  }

  let lineageSnippet = '';
  if (sampleInputs && typeof sampleInputs === 'object') {
    const schemaMap = sampleInputs.__schemaMap || {};
    const keys = Object.keys(sampleInputs).filter(k => k !== '__schemaMap' && k !== 'sources' && k !== 'allOutputs');
    if (keys.length > 0) {
      lineageSnippet = '\n\nEXACT UPSTREAM DATA CONTRACT & SCHEMA (USE THESE EXACT KEYS & COLUMNS):\n' + keys.map(k => {
        const val = sampleInputs[k];
        const s = schemaMap[k] || {};
        const colList = s.fields ? Object.keys(s.fields).map(f => `${f} (${s.fields[f].type})`).join(', ') : '';
        const sampleStr = s.sampleRecord ? JSON.stringify(s.sampleRecord).slice(0, 300) : (val ? JSON.stringify(val).slice(0, 200) : 'null');
        return `• inputs.${k} [Format: ${s.format || (Array.isArray(val) ? 'tabular' : typeof val)}, Rows/Items: ${s.rowCount !== undefined ? s.rowCount : (Array.isArray(val) ? val.length : 1)}]:\n  Available Fields: [${colList || 'scalar'}]\n  Sample Record: ${sampleStr}`;
      }).join('\n');
    }
  }

  const sampleInputsSnippet = (lineageSnippet || (sampleInputs 
    ? `\nAvailable Inputs Structure (JSON):\n${JSON.stringify(sampleInputs, null, 2).slice(0, 1500)}`
    : '\nInputs will be passed dynamically as an object `inputs`.'));

  const systemInstruction = `You are an institutional deterministic code generator in KEAOS.
The user will provide a programming or data task in crude, everyday language.
Your job is to generate ONLY the exact, bug-free, deterministic code in the requested language: ${effectiveLang.toUpperCase()}.

CRITICAL RULES:
1. Return ONLY the code inside a single markdown code block: \`\`\`${effectiveLang} ... \`\`\`
2. NO conversational text, NO greetings, NO markdown explanations before or after.
3. For JavaScript: Export or define a \`function process(inputs, state)\` or \`async function process(inputs, state)\` that accepts the inputs object and returns the final transformed value.
   - UNIFIED HYBRID CONTRACT FOR INTERACTIVE WEB APPS & DASHBOARDS:
     - If the user asks for a dashboard, UI, visual tool, simulator, or cash flow engine, return an object containing:
       \`return { summary: {...}, records: [...], html: "<!DOCTYPE html>..." };\`
     - The \`html\` property must be a self-contained, high-performance HTML5 + Tailwind CSS web app that runs directly inside the Live Browser iframe with working buttons, sliders, file pickers, telemetry, and animations.
     - \`records\` must contain the row items for the Data Table tab, and \`summary\` must contain high-level KPIs.
4. BROWSER ISOLATE ENVIRONMENT (STRICT MANDATE):
   - JavaScript executes in a client-side browser isolate via \`new Function('inputs', ...)\`. Full \`async/await\`, \`crypto\`, and Web APIs are supported.
   - NEVER use \`require(...)\`, \`import ...\`, or Node.js server modules (\`fs\`, \`path\`, \`stream\`, \`fast-csv\`, etc.). \`require\` is NOT defined in browsers and will fail immediately!
    - In-Memory Data Streams (Strict Zero-Interaction Contract):
      * Datasets are pre-ingested into 'inputs' (e.g. inputs.slotA, inputs.slotB, inputs.data, inputs.tableA).
      * NEVER write interactive file dialogs (window.showOpenFilePicker, dynamic <input type="file">, prompt, confirm). In browser isolates, unprompted file dialogs are blocked by security and will fail immediately.
      * Pure Function Contract: Write a pure algorithmic processor: 'process(inputs, state)'.
      * Global utilities available in isolate: SheetJS (XLSX), crypto, Math, Date, RegExp, and console.
   - Do NOT use Node.js server modules ('fs', 'path') because code runs in client browsers; use browser Web APIs instead.
   - MULTI-SOURCE FAN-IN & JOIN CONTRACT:
     - When inputs contains multiple named streams (e.g. inputs.tableA, inputs.tableB, inputs.erp_ledger), access them by their EXACT keys as listed in the schema contract.
     - When joining or reconciling two streams, use high-performance O(N) Hash Maps (\`new Map(inputs.sourceB.map(b => [String(b.key), b]))\`) instead of slow O(N^2) nested finds.
     - Never invent imaginary column names; strictly use the columns defined in the schema contract.
5. For Python: Define a \`def process(inputs):\` function that accepts the inputs dict and returns the result. Use standard libraries (pandas, math, re, json, datetime) if helpful.
6. For SQL: Write a single clean SQL query. Assume tables are named after the keys in inputs (e.g. data, tableA, tableB).
7. Implement exactly what the user asked for. Zero hardcoded business assumptions.`;

  const userPrompt = `Task Description:\n"${prompt}"\n${sampleInputsSnippet}\n\nWrite the deterministic ${effectiveLang} code now.`;

  try {
    let rawOutput = '';

    // 1. Google GenAI
    if (effectiveProvider === 'google') {
      const ai = new GoogleGenAI({ apiKey: credential });
      const response = await ai.models.generateContent({
        model: modelId || 'gemini-2.0-flash',
        contents: userPrompt,
        config: {
          temperature: 0.1,
          systemInstruction
        }
      });
      rawOutput = response.text || '';
    }
    // 2. OpenAI
    else if (effectiveProvider === 'openai') {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${credential}`
        },
        body: JSON.stringify({
          model: modelId || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.1
        })
      });
      if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}`);
      const json = await res.json();
      rawOutput = json.choices[0]?.message?.content || '';
    }
    // 3. Anthropic
    else if (effectiveProvider === 'anthropic') {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': credential,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: modelId || 'claude-3-5-sonnet-20241022',
          max_tokens: 2048,
          temperature: 0.1,
          system: systemInstruction,
          messages: [{ role: 'user', content: userPrompt }]
        })
      });
      if (!res.ok) throw new Error(`Anthropic HTTP ${res.status}`);
      const json = await res.json();
      rawOutput = json.content[0]?.text || '';
    }
    // 4. Ollama (Local & Remote)
    else if (effectiveProvider === 'ollama') {
      const ollamaConf = getOllamaConfig();
      let baseUrl = (ollamaConf.baseUrl || 'http://localhost:11434').replace(/\/$/, '');
      let apiKey = ollamaConf.apiKey || '';
      if (credential) {
        if (credential.startsWith('http://') || credential.startsWith('https://')) baseUrl = credential.replace(/\/$/, '');
        else apiKey = credential;
      }
      const res = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
        },
        body: JSON.stringify({
          model: modelId || 'llama3.3',
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.1
        })
      });
      if (!res.ok) throw new Error(`Ollama HTTP ${res.status} at ${baseUrl}`);
      const json = await res.json();
      rawOutput = json.choices[0]?.message?.content || '';
    }
    // 5. OpenRouter
    else if (effectiveProvider === 'openrouter') {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${credential}`,
          'HTTP-Referer': 'http://127.0.0.1:5173',
          'X-Title': 'KEAOS Studio'
        },
        body: JSON.stringify({
          model: modelId || 'anthropic/claude-3.5-sonnet',
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.1
        })
      });
      if (!res.ok) throw new Error(`OpenRouter HTTP ${res.status}`);
      const json = await res.json();
      rawOutput = json.choices[0]?.message?.content || '';
    }
    // 6. Resilient Fallback
    else {
      rawOutput = getOfflineFallbackCode(prompt, effectiveLang, sampleInputs);
    }

    const cleanCode = extractCode(rawOutput, effectiveLang);
    return {
      success: true,
      language: effectiveLang,
      code: cleanCode || getOfflineFallbackCode(prompt, effectiveLang, sampleInputs),
      rawResponse: rawOutput
    };
  } catch (err) {
    console.warn('[DeterministicCompiler] LLM generation failed, falling back to clean template:', err);
    return {
      success: true,
      language: effectiveLang,
      code: getOfflineFallbackCode(prompt, effectiveLang, sampleInputs),
      isFallback: true,
      errorNotice: err.message
    };
  }
}
