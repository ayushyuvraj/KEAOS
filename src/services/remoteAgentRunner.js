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
import { detectAndAttributeTelemetry } from './architectureDetector.js';
import { evaluateGuardrails, resolveActivePoliciesForNode } from './policyEngine.js';

// Global registry of in-flight AbortControllers for active remote agent dispatches
const activeAbortControllers = new Map();

/**
 * Abort active remote agent execution for a specific node
 */
export function abortRemoteAgentExecution(nodeId) {
  if (activeAbortControllers.has(nodeId)) {
    try {
      activeAbortControllers.get(nodeId).abort();
    } catch {
      // Ignored
    }
    activeAbortControllers.delete(nodeId);
  }
}

/**
 * Abort all active remote agent executions
 */
export function abortAllRemoteExecutions() {
  for (const [, controller] of activeAbortControllers.entries()) {
    try {
      controller.abort();
    } catch {
      // Ignored
    }
  }
  activeAbortControllers.clear();
}

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
  parentSpanId = null,
  policies = null,
  memoryContext = null,
  allNodes = [],
  allEdges = []
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

  const taskController = new AbortController();
  activeAbortControllers.set(nodeId, taskController);

  try {
    // 1b. Resolve Active Policies (Direct and/or Inherited from Connected Agent Core)
    const activePolicies = Array.isArray(policies) && policies.length > 0
      ? policies
      : resolveActivePoliciesForNode({
          node: { id: nodeId, data: nodeData },
          allNodes,
          allEdges
        });

    // 1c. Inbound Guardrail Boundary Gate (Pre-dispatch Inspection)
    let effectiveInput = inputData;
    let inboundEvaluation = { passed: true, sanitizedPayload: inputData, redactionsCount: 0, violations: [] };

    if (nodeData.enforceOnInput !== false && activePolicies.length > 0 && inputData) {
      inboundEvaluation = evaluateGuardrails({
        payload: inputData,
        policies: activePolicies,
        direction: 'inbound',
        nodeData
      });

      if (!inboundEvaluation.passed) {
        const violationMsg = inboundEvaluation.violations.map(v => v.message).join('; ');
        const blockError = `[INBOUND GUARDRAIL BLOCKED]: ${violationMsg}`;

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('keaos:remote-agent-executed', {
            detail: {
              nodeId,
              success: false,
              latencyMs: 10,
              error: blockError
            }
          }));
        }

        if (traceContext && span) {
          await endSpan(traceContext, span, {
            status: 'ERROR',
            errorMessage: blockError,
            inputData,
            outputData: null,
            customAttributes: {
              'guardrail.blocked': true,
              'guardrail.direction': 'inbound',
              'guardrail.violations': JSON.stringify(inboundEvaluation.violations)
            }
          });
        }

        return {
          success: false,
          error: blockError,
          latencyMs: 10,
          nodeId,
          blockedByGuardrail: true,
          direction: 'inbound',
          violations: inboundEvaluation.violations
        };
      }

      effectiveInput = inboundEvaluation.sanitizedPayload;
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

    const isFileInput = (typeof File !== 'undefined' && (effectiveInput instanceof File || effectiveInput?.rawFile instanceof File || effectiveInput instanceof Blob)) ||
                        (effectiveInput && typeof effectiveInput === 'object' && effectiveInput.name && (effectiveInput.size !== undefined || effectiveInput.rawFile)) ||
                        requestMode === 'multipart';

    if (httpMethod !== 'GET') {
      if (!isFileInput) headers['Content-Type'] = 'application/json';
      if (isFileInput) {
        let fileToUpload = null;
        if (typeof File !== 'undefined' && effectiveInput instanceof File) {
          fileToUpload = effectiveInput;
        } else if (effectiveInput?.rawFile && (typeof File !== 'undefined' && effectiveInput.rawFile instanceof File)) {
          fileToUpload = effectiveInput.rawFile;
        } else if (effectiveInput?.slotA?.rawFile && (typeof File !== 'undefined' && effectiveInput.slotA.rawFile instanceof File)) {
          fileToUpload = effectiveInput.slotA.rawFile;
        } else if (effectiveInput?.slotB?.rawFile && (typeof File !== 'undefined' && effectiveInput.slotB.rawFile instanceof File)) {
          fileToUpload = effectiveInput.slotB.rawFile;
        } else if (typeof Blob !== 'undefined' && effectiveInput instanceof Blob) {
          fileToUpload = effectiveInput;
        } else if (effectiveInput?.file && (typeof File !== 'undefined' && effectiveInput.file instanceof File)) {
          fileToUpload = effectiveInput.file;
        } else if (typeof window !== 'undefined' && window.__KEAOS_FILES__?.['latest'] instanceof File) {
          fileToUpload = window.__KEAOS_FILES__['latest'];
        }

        if (!fileToUpload) {
          return {
            success: false,
            error: 'No binary file found in memory. Please drag & drop your invoice PDF/image into the Ingestion node before executing.',
            latencyMs: 0,
            nodeId,
            spanId: span ? span.spanId : null
          };
        }

        const formData = new FormData();
        formData.append('file', fileToUpload, fileToUpload.name || 'invoice.pdf');
        formData.append('channel', 'upload');
        requestBody = formData;
      } else if (requestMode === 'json_envelope') {
        requestBody = JSON.stringify({
          input: effectiveInput,
          context: {
            nodeId,
            nodeName,
            framework,
            memoryContext: (nodeData.shareAgentMemory && memoryContext) ? memoryContext : undefined,
            dispatchedAt: new Date().toISOString()
          }
        });
      } else {
        requestBody = typeof effectiveInput === 'string' ? effectiveInput : JSON.stringify(effectiveInput);
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

    // 4. Execution Loop with Retries & Cancellation Support
    let lastError = null;
    let responseData = null;
    let finalStatus = 0;
    let capturedHeaders = {};
    let attempt = 0;

    while (attempt <= maxRetries) {
      if (taskController.signal.aborted) {
        lastError = new Error('Execution cancelled by user');
        break;
      }

      attempt++;
      const timeoutController = new AbortController();
      const timer = setTimeout(() => timeoutController.abort(), timeoutMs);

      const abortHandler = () => timeoutController.abort();
      taskController.signal.addEventListener('abort', abortHandler, { once: true });

      try {
        const response = await fetch(endpointUrl, {
          method: httpMethod,
          headers,
          body: httpMethod === 'GET' ? undefined : requestBody,
          signal: timeoutController.signal
        });
        clearTimeout(timer);
        taskController.signal.removeEventListener('abort', abortHandler);
        finalStatus = response.status;

        // Extract and normalize response headers for architecture detection
        capturedHeaders = {};
        try {
          if (response.headers && typeof response.headers.forEach === 'function') {
            response.headers.forEach((val, key) => {
              capturedHeaders[key.toLowerCase()] = val;
            });
          }
        } catch {
          // Headers parsing fallback
        }

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
        taskController.signal.removeEventListener('abort', abortHandler);
        lastError = err;
        if (taskController.signal.aborted) {
          lastError = new Error('Execution cancelled by user');
          break;
        }
        if (err.name === 'AbortError') {
          lastError = new Error(`Request timed out after ${timeoutMs / 1000}s cap`);
        }
        if (attempt <= maxRetries) {
          await new Promise(r => setTimeout(r, 600)); // Brief backoff before retry
        }
      }
    }

    // 4b. Adaptive Async Polling Engine for Asynchronous Endpoints (202 Accepted or Queued Pipelines)
    if (!lastError && responseData && typeof responseData === 'object' && responseData.id && !taskController.signal.aborted) {
      const isAsyncJob = finalStatus === 202 || 
        (responseData.pipeline?.state && responseData.pipeline.state !== 'done') ||
        responseData.status === 'Received' ||
        responseData.status === 'Queued';

      if (isAsyncJob && endpointUrl.startsWith('http')) {
        const basePollUrl = endpointUrl.replace(/\/+$/, '');
        const detailPollUrl = `${basePollUrl}/${responseData.id}`;
        const pollStart = Date.now();
        const maxPollDuration = Math.max(timeoutMs, 120000);

        while (Date.now() - pollStart < maxPollDuration) {
          if (taskController.signal.aborted) {
            lastError = new Error('Execution cancelled by user');
            break;
          }

          // Paced polling interval
          await new Promise((resolve) => {
            const pollTimer = setTimeout(resolve, 1500);
            taskController.signal.addEventListener('abort', () => {
              clearTimeout(pollTimer);
              resolve();
            }, { once: true });
          });

          if (taskController.signal.aborted) {
            lastError = new Error('Execution cancelled by user');
            break;
          }

          try {
            const pollRes = await fetch(detailPollUrl, {
              method: 'GET',
              headers: { 'Accept': 'application/json' },
              signal: taskController.signal
            });

            if (pollRes.ok) {
              const pollData = await pollRes.json();
              const pState = pollData.pipeline?.state || pollData.state;
              const pStep = pollData.pipeline?.step ?? pollData.step;
              const pSteps = pollData.pipeline?.steps || [];
              const stepDesc = pSteps[pStep] || `Processing pipeline (step ${pStep})...`;

              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('keaos:set-execution-state', {
                  detail: {
                    isExecuting: true,
                    nodeId,
                    pillarType: 'remote_agent',
                    step: `${nodeName}: ${stepDesc}`
                  }
                }));
              }

              // Check for pipeline completion or terminal status
              const isFinished = pState === 'done' || 
                ['Exception', 'Matched', 'Approved', 'Rejected', 'Paid', 'Posted', 'Completed'].includes(pollData.status);

              if (isFinished) {
                responseData = pollData;
                break;
              }
            }
          } catch {
            if (taskController.signal.aborted) {
              lastError = new Error('Execution cancelled by user');
              break;
            }
          }
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

    // 5b. Outbound Guardrail Boundary Gate (Post-dispatch Inspection)
    let outboundEvaluation = { passed: true, sanitizedPayload: finalOutput, redactionsCount: 0, violations: [] };
    if (nodeData.enforceOnOutput !== false && activePolicies.length > 0 && finalOutput !== undefined && finalOutput !== null) {
      outboundEvaluation = evaluateGuardrails({
        payload: finalOutput,
        policies: activePolicies,
        direction: 'outbound',
        nodeData
      });

      if (!outboundEvaluation.passed) {
        const violationMsg = outboundEvaluation.violations.map(v => v.message).join('; ');
        const blockError = `[OUTBOUND GUARDRAIL BLOCKED]: ${violationMsg}`;

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('keaos:remote-agent-executed', {
            detail: {
              nodeId,
              success: false,
              latencyMs: Math.round(performance.now() - startTime),
              error: blockError
            }
          }));
        }

        if (traceContext && span) {
          await endSpan(traceContext, span, {
            status: 'ERROR',
            errorMessage: blockError,
            inputData: effectiveInput,
            outputData: null,
            customAttributes: {
              'guardrail.blocked': true,
              'guardrail.direction': 'outbound',
              'guardrail.violations': JSON.stringify(outboundEvaluation.violations)
            }
          });
        }

        return {
          success: false,
          error: blockError,
          latencyMs: Math.round(performance.now() - startTime),
          nodeId,
          blockedByGuardrail: true,
          direction: 'outbound',
          violations: outboundEvaluation.violations
        };
      }

      finalOutput = outboundEvaluation.sanitizedPayload;
    }

    // 6. Multi-Tier Architecture & Multi-Stage Telemetry Engine
    const selectedModel = nodeData.underlyingModel || 'gemini-2.5-flash';
    const enterpriseDiscount = Number(nodeData.enterpriseDiscountPercent || 0);

    let telemetry = null;
    if (!lastError && responseData) {
      try {
        telemetry = detectAndAttributeTelemetry({
          endpointUrl,
          responseHeaders: capturedHeaders,
          responseBody: responseData,
          inputData,
          modelId: selectedModel,
          provider: 'google',
          discountPercent: enterpriseDiscount,
          latencyMs
        });
      } catch (e) {
        console.warn('[RemoteAgentRunner] Telemetry detection notice:', e);
      }
    }

    const effectiveTokens = telemetry?.totalTokens || 0;
    const effectiveCostUsd = telemetry?.totalCostUsd || 0;
    const effectiveModel = telemetry?.modelId || selectedModel;

    // 7. Complete OpenTelemetry Span
    if (traceContext && span) {
      await endSpan(traceContext, span, {
        status: lastError ? 'ERROR' : 'OK',
        errorMessage: lastError ? lastError.message : null,
        inputData: isFileInput ? { file: (inputData?.name || inputData?.rawFile?.name || 'document.pdf'), size: (inputData?.size || inputData?.rawFile?.size || 'binary') } : inputData,
        outputData: finalOutput,
        tokens: effectiveTokens,
        modelId: effectiveModel,
        provider: framework,
        customAttributes: {
          'http.status_code': finalStatus,
          'http.retries': attempt - 1,
          'telemetry.tier': telemetry?.tier || 'tier3_decomposed',
          'telemetry.stages': telemetry?.stages ? JSON.stringify(telemetry.stages) : null,
          'llm.cost.total_usd': effectiveCostUsd
        }
      });
    }

    // 8. Emit Real-time Execution Finished Event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('keaos:remote-agent-executed', {
        detail: {
          nodeId,
          success: !lastError,
          latencyMs,
          output: finalOutput,
          tokens: effectiveTokens,
          costUsd: effectiveCostUsd,
          modelId: effectiveModel,
          telemetry,
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
      tokens: effectiveTokens,
      costUsd: effectiveCostUsd,
      modelId: effectiveModel,
      telemetryBreakdown: telemetry,
      rawResponse: responseData,
      redactionsCount: (inboundEvaluation?.redactionsCount || 0) + (outboundEvaluation?.redactionsCount || 0),
      guardrailsApplied: activePolicies.length > 0
    };
  } finally {
    activeAbortControllers.delete(nodeId);
  }
}
