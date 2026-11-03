/**
 * KEAOS REMOTE AGENT RUNNER & EXECUTION ENGINE
 * 
 * Executes external products and services (LangGraph, CrewAI, Google ADK, FastAPI)
 * hosted across AWS, Azure, GCP, or private servers via high-throughput HTTP/REST.
 * 
 * STRICT INVARIANTS:
 * - Rule 10: Zero Hardcoded mocks or canned responses. Real network dispatch.
 * - Rule 14: Universal Sequential Visual Lighting Parity (Glows visibly during execution).
 * - Ingrained OpenTelemetry: Emits W3C trace spans into Audit 2.0.
 */

import { startSpan, endSpan } from './audit2Service.js';

/**
 * Resolves dot-delimited path or array index (e.g. "data.summary" or "choices[0].message.content")
 */
function getNestedValue(obj, path) {
  if (!obj || !path || path === 'auto') return undefined;
  if (obj[path] !== undefined) return obj[path];
  try {
    const parts = path.replace(/\[(\w+)\]/g, '.$1').replace(/^\./, '').split('.');
    let curr = obj;
    for (const part of parts) {
      if (curr === null || curr === undefined) return undefined;
      curr = curr[part];
    }
    return curr;
  } catch {
    return undefined;
  }
}

/**
 * Strips sensitive API keys or tokens from URL query parameters before logging into spans.
 */
function sanitizeEndpointUrl(urlStr) {
  try {
    const url = new URL(urlStr);
    const sensitiveKeys = ['token', 'apikey', 'key', 'secret', 'auth', 'password', 'access_token'];
    for (const key of Array.from(url.searchParams.keys())) {
      if (sensitiveKeys.some(s => key.toLowerCase().includes(s))) {
        url.searchParams.set(key, '[REDACTED]');
      }
    }
    return url.toString();
  } catch {
    return urlStr;
  }
}

/**
 * Execute a Remote Agent Node as part of a canvas workflow chain
 */
export async function executeRemoteAgentTask({
  nodeId,
  nodeData = {},
  inputData = null,
  traceContext = null,
  parentSpanId = null
}) {
  const startTime = performance.now();
  const endpointUrl = nodeData.endpointUrl || 'http://127.0.0.1:8000/run';
  const httpMethod = nodeData.httpMethod || 'POST';
  const authType = nodeData.authType || 'none';
  const authToken = nodeData.authToken || '';
  const timeoutMs = (Number(nodeData.timeoutSeconds) || 30) * 1000;
  const maxRetries = Number(nodeData.retries) || 0;
  const requestMode = nodeData.requestMode || 'json_envelope';
  const responsePath = nodeData.responsePath || 'auto';
  const nodeName = nodeData.name || 'Universal External Agent';
  const framework = nodeData.framework || 'fastapi';

  // 1. Start OpenTelemetry Child Span
  let span = null;
  if (traceContext) {
    span = startSpan(traceContext, {
      name: `${framework.toUpperCase()}: ${nodeName}`,
      kind: 'CLIENT',
      parentSpanId: parentSpanId || traceContext.rootSpanId,
      componentType: 'remote_agent',
      componentId: nodeId,
      componentName: nodeName,
      attributes: {
        'remote.endpoint': sanitizeEndpointUrl(endpointUrl),
        'remote.framework': framework,
        'remote.method': httpMethod,
        'remote.host': nodeData.hostingProvider || 'AWS'
      }
    });
  }

  // 2. Emit Real-time Canvas Lighting Parity Event (Rule 14)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('keaos:set-execution-state', {
      detail: {
        isExecuting: true,
        nodeId,
        pillarType: 'remote_agent',
        step: `Dispatching to Remote Service: "${nodeName}" (${framework})`
      }
    }));

    window.dispatchEvent(new CustomEvent('keaos:remote-agent-executing', {
      detail: { nodeId, isRunning: true }
    }));
  }

  // Visual pacing window so human operator sees sequential illumination
  await new Promise(r => setTimeout(r, 260));

  // 3. Prepare Payload
  let requestBody = null;
  const headers = {
    'Accept': 'application/json, text/plain, */*'
  };

  const isFileInput = (typeof File !== 'undefined' && (inputData instanceof File || inputData?.rawFile instanceof File || inputData instanceof Blob)) ||
                      (inputData && typeof inputData === 'object' && inputData.name && (inputData.size !== undefined || inputData.rawFile)) ||
                      requestMode === 'multipart';

  if (httpMethod !== 'GET') {
    if (!isFileInput) headers['Content-Type'] = 'application/json';
    if (isFileInput) {
      let fileToUpload = null;
      if (typeof File !== 'undefined' && inputData instanceof File) {
        fileToUpload = inputData;
      } else if (inputData?.rawFile && (typeof File !== 'undefined' && inputData.rawFile instanceof File)) {
        fileToUpload = inputData.rawFile;
      } else if (inputData?.slotA?.rawFile && (typeof File !== 'undefined' && inputData.slotA.rawFile instanceof File)) {
        fileToUpload = inputData.slotA.rawFile;
      } else if (inputData?.slotB?.rawFile && (typeof File !== 'undefined' && inputData.slotB.rawFile instanceof File)) {
        fileToUpload = inputData.slotB.rawFile;
      } else if (typeof Blob !== 'undefined' && inputData instanceof Blob) {
        fileToUpload = inputData;
      } else if (inputData?.file && (typeof File !== 'undefined' && inputData.file instanceof File)) {
        fileToUpload = inputData.file;
      } else if (typeof window !== 'undefined' && window.__KEAOS_FILES__?.['latest'] instanceof File) {
        fileToUpload = window.__KEAOS_FILES__['latest'];
      }

      if (!fileToUpload) {
        throw new Error(
          'No invoice file loaded in the Ingestion Node. Please expand the Ingestion Node or drop an invoice PDF/image into it before executing.'
        );
      }

      const formData = new FormData();
      formData.append('file', fileToUpload, fileToUpload.name || 'invoice.pdf');
      formData.append('channel', 'upload');
      requestBody = formData;
    } else if (requestMode === 'json_envelope') {
      requestBody = JSON.stringify({
        input: inputData,
        context: {
          nodeId,
          nodeName,
          framework,
          dispatchedAt: new Date().toISOString()
        }
      });
    } else {
      requestBody = typeof inputData === 'string' ? inputData : JSON.stringify(inputData);
    }
  }

  if (authType === 'bearer' && authToken) {
    headers['Authorization'] = `Bearer ${authToken.trim()}`;
  } else if (authType === 'api_key' && authToken) {
    headers['X-API-Key'] = authToken.trim();
  } else if (authType === 'basic' && authToken) {
    const encoded = typeof btoa !== 'undefined' 
      ? btoa(authToken.trim()) 
      : Buffer.from(authToken.trim()).toString('base64');
    headers['Authorization'] = `Basic ${encoded}`;
  }

  // 4. Execution Loop with Retries
  let lastError = null;
  let responseData = null;
  let finalStatus = 0;
  let attempt = 0;

  while (attempt <= maxRetries) {
    attempt++;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(endpointUrl, {
        method: httpMethod,
        headers,
        body: httpMethod === 'GET' ? undefined : requestBody,
        signal: controller.signal
      });
      clearTimeout(timer);
      finalStatus = response.status;

      const rawText = await response.text();
      let parsed = null;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        parsed = rawText;
      }

      if (!response.ok) {
        const errorMsg = `Remote HTTP ${response.status} ${response.statusText}: ${typeof parsed === 'string' ? parsed.slice(0, 160) : JSON.stringify(parsed).slice(0, 160)}`;
        const httpError = new Error(errorMsg);
        
        // Fast-fail: 4xx Client Errors (except 429 Too Many Requests) will never succeed on retry
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          lastError = httpError;
          break;
        }
        throw httpError;
      }

      responseData = parsed;
      lastError = null;
      break; // Success!
    } catch (err) {
      clearTimeout(timer);
      lastError = err;
      if (err.name === 'AbortError') {
        lastError = new Error(`Request timed out after ${timeoutMs / 1000}s cap`);
      }
      if (attempt <= maxRetries) {
        await new Promise(r => setTimeout(r, 600)); // Brief backoff before retry
      }
    }
  }

  const latencyMs = Math.round(performance.now() - startTime);

  // 5. Extract output field according to responsePath mapping
  let finalOutput = responseData;
  if (responseData && typeof responseData === 'object' && !Array.isArray(responseData)) {
    const nested = getNestedValue(responseData, responsePath);
    if (nested !== undefined) {
      finalOutput = nested;
    } else if (responseData.result !== undefined) {
      finalOutput = responseData.result;
    } else if (responseData.output !== undefined) {
      finalOutput = responseData.output;
    } else if (responseData.data !== undefined) {
      finalOutput = responseData.data;
    } else if (responseData.response !== undefined) {
      finalOutput = responseData.response;
    } else if (responseData.content !== undefined) {
      finalOutput = responseData.content;
    }
  }

  // Extract optional token accounting returned from remote service
  const extractedTokens = (responseData && typeof responseData === 'object')
    ? (responseData.tokens?.total || responseData.totalTokens || responseData.metrics?.totalTokens || 0)
    : 0;
  const extractedModel = (responseData && typeof responseData === 'object')
    ? (responseData.model || responseData.modelId || `${framework}-remote`)
    : `${framework}-remote`;

  // 6. Complete OpenTelemetry Span
  if (traceContext && span) {
    await endSpan(traceContext, span, {
      status: lastError ? 'ERROR' : 'OK',
      errorMessage: lastError ? lastError.message : null,
      inputData: isFileInput ? { file: (inputData?.name || inputData?.rawFile?.name || 'document.pdf'), size: (inputData?.size || inputData?.rawFile?.size || 'binary') } : inputData,
      outputData: finalOutput,
      tokens: extractedTokens,
      modelId: extractedModel,
      provider: framework,
      customAttributes: {
        'http.status_code': finalStatus,
        'http.retries': attempt - 1
      }
    });
  }

  // 7. Emit Real-time Execution Finished Event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('keaos:remote-agent-executed', {
      detail: {
        nodeId,
        success: !lastError,
        latencyMs,
        output: finalOutput,
        error: lastError ? lastError.message : null
      }
    }));
  }

  if (lastError) {
    return {
      success: false,
      error: lastError.message,
      latencyMs,
      nodeId,
      spanId: span ? span.spanId : null
    };
  }

  return {
    success: true,
    output: finalOutput,
    latencyMs,
    nodeId,
    spanId: span ? span.spanId : null,
    rawResponse: responseData
  };
}
