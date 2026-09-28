/**
 * KEAOS Backend Execution Plane Connector
 * 
 * Provides transparent communication between the React Studio frontend
 * and the distributed Execution Plane Gateway (Port 4000).
 */

const GATEWAY_BASE_URL = 'http://localhost:4000';

/**
 * Pings the distributed execution cluster gateway
 */
export async function checkGatewayHealth() {
  try {
    const res = await fetch(`${GATEWAY_BASE_URL}/api/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(1500)
    });
    if (!res.ok) return { online: false, error: `HTTP ${res.status}` };
    const data = await res.json();
    return { online: true, data };
  } catch (err) {
    return { online: false, error: err.message };
  }
}

/**
 * Retrieves high-concurrency cluster metrics and rate limit bucket levels
 */
export async function fetchClusterMetrics() {
  try {
    const res = await fetch(`${GATEWAY_BASE_URL}/api/cluster/metrics`, {
      method: 'GET',
      signal: AbortSignal.timeout(2000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    return null;
  }
}

/**
 * Dispatches isolated code execution to Tier 1 (V8/WASI) or Tier 2 (Sandboxed Python)
 */
export async function executeSandboxedCodeRemote({
  language = 'javascript',
  code,
  input = {},
  timeoutMs = 10000
}) {
  const res = await fetch(`${GATEWAY_BASE_URL}/api/sandbox/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ language, code, input, timeoutMs })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  return await res.json();
}

/**
 * Submits a full multi-agent workflow to the distributed Temporal-style state machine
 */
export async function dispatchDistributedWorkflow({
  transcript,
  agentConfig,
  attachedPillars = [],
  codeSnippet = null,
  tenantId = 'default_tenant',
  projectId = 'keaos_core'
}) {
  const workflowId = `wf-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const res = await fetch(`${GATEWAY_BASE_URL}/api/workflows/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-Id': tenantId
    },
    body: JSON.stringify({
      workflowId,
      projectId,
      transcript,
      agentConfig,
      attachedPillars,
      codeSnippet
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  return await res.json();
}

/**
 * Connects to live Server-Sent Events (SSE) telemetry stream for real-time waterfall tracking
 */
export function streamWorkflowTelemetry(workflowId, { onCheckpoint, onDone, onError }) {
  const url = `${GATEWAY_BASE_URL}/api/workflows/${workflowId}/stream`;
  const eventSource = new EventSource(url);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'CHECKPOINT' && onCheckpoint) {
        onCheckpoint(data.checkpoint);
      } else if (data.type === 'DONE' && onDone) {
        onDone(data);
        eventSource.close();
      }
    } catch (e) {
      console.warn('Failed to parse SSE event', e);
    }
  };

  eventSource.onerror = (err) => {
    if (onError) onError(err);
    eventSource.close();
  };

  return () => eventSource.close();
}
