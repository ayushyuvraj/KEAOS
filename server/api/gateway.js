/**
 * KEAOS Institutional API Gateway & Rate Governor
 * 
 * Provides high-throughput workflow ingress, global token-bucket rate limiting,
 * and isolated sandbox dispatching for hundreds of concurrent agents.
 */

import http from 'node:http';
import { AgentOrchestratorWorkflow } from '../workflows/agentOrchestratorWorkflow.js';
import { codeExecutor } from '../sandbox/tieredCodeExecutor.js';
import { memoryFabric } from '../services/distributedMemoryFabric.js';

export class TokenBucketRateLimiter {
  constructor(capacity = 60, refillPerSecond = 1) {
    this.capacity = capacity;
    this.tokens = capacity;
    this.refillPerSecond = refillPerSecond;
    this.lastRefill = Date.now();
  }

  tryConsume(tokensRequired = 1) {
    const now = Date.now();
    const elapsedSeconds = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.capacity, this.tokens + elapsedSeconds * this.refillPerSecond);
    this.lastRefill = now;

    if (this.tokens >= tokensRequired) {
      this.tokens -= tokensRequired;
      return true;
    }
    return false;
  }
}

export class KeaosApiGateway {
  constructor(port = 4000) {
    this.port = port;
    this.activeWorkflows = new Map();
    this.limiters = {
      google: new TokenBucketRateLimiter(120, 2),
      openai: new TokenBucketRateLimiter(100, 1.5),
      anthropic: new TokenBucketRateLimiter(80, 1.2),
      ollama: new TokenBucketRateLimiter(1000, 50),
      openrouter: new TokenBucketRateLimiter(200, 3)
    };
  }

  start() {
    const server = http.createServer(async (req, res) => {
      // CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Tenant-Id');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

      // 1. Health check
      if (url.pathname === '/api/health' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'HEALTHY', timestamp: new Date().toISOString(), platform: 'KEAOS Gateway' }));
        return;
      }

      // 2. Cluster Health & Concurrency Metrics
      if (url.pathname === '/api/cluster/metrics' && req.method === 'GET') {
        const rateLimits = {};
        for (const [provider, limiter] of Object.entries(this.limiters)) {
          rateLimits[provider] = {
            capacity: limiter.capacity,
            availableTokens: Math.round(limiter.tokens),
            refillRatePerSec: limiter.refillPerSecond
          };
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          clusterStatus: 'ONLINE',
          port: this.port,
          activeWorkflowsCount: this.activeWorkflows.size,
          tieredSandboxes: {
            tier1: 'V8/WASI Isolate (<5ms)',
            tier2: 'Sandboxed Python Process Pool',
            status: 'PRIMED'
          },
          memoryFabric: {
            tier1Scratchpads: memoryFabric.tier1Scratchpads.size,
            tier2Blackboards: memoryFabric.tier2Blackboards.size,
            tier3Namespaces: memoryFabric.tier3EpisodicStore.size,
            tier4Entities: memoryFabric.tier4EntityGraph.size
          },
          rateLimits
        }));
        return;
      }

      // 3. Start Workflow
      if (url.pathname === '/api/workflows/start' && req.method === 'POST') {
        const body = await this.readJsonBody(req);
        const workflow = new AgentOrchestratorWorkflow(
          body.workflowId,
          req.headers['x-tenant-id'] || 'default_tenant',
          body.projectId || 'keaos_core'
        );

        this.activeWorkflows.set(workflow.workflowId, workflow);

        // Async execution in background worker pool
        workflow.execute({
          transcript: body.transcript || '',
          agentConfig: body.agentConfig || {},
          attachedPillars: body.attachedPillars || [],
          codeSnippet: body.codeSnippet || null
        }).catch(err => {
          console.error(`Workflow ${workflow.workflowId} failed:`, err);
        });

        res.writeHead(202, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          workflowId: workflow.workflowId,
          status: workflow.state,
          message: 'Workflow accepted and queued in distributed execution plane.'
        }));
        return;
      }

      // 4. Server-Sent Events (SSE) Live Telemetry Stream
      if (url.pathname.startsWith('/api/workflows/') && url.pathname.endsWith('/stream') && req.method === 'GET') {
        const id = url.pathname.split('/')[3];
        const workflow = this.activeWorkflows.get(id);
        if (!workflow) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `Workflow ${id} not found.` }));
          return;
        }

        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        });
        res.write(`data: ${JSON.stringify({ type: 'STATUS', status: workflow.state })}\n\n`);

        for (const cp of workflow.checkpoints) {
          res.write(`data: ${JSON.stringify({ type: 'CHECKPOINT', checkpoint: cp })}\n\n`);
        }

        const listener = (cp) => {
          res.write(`data: ${JSON.stringify({ type: 'CHECKPOINT', checkpoint: cp })}\n\n`);
          if (workflow.state === 'COMPLETED' || workflow.state === 'FAILED') {
            res.write(`data: ${JSON.stringify({ type: 'DONE', status: workflow.state })}\n\n`);
            res.end();
          }
        };

        workflow.onCheckpoint(listener);
        req.on('close', () => {
          const idx = workflow.listeners.indexOf(listener);
          if (idx >= 0) workflow.listeners.splice(idx, 1);
        });
        return;
      }

      // 5. Query Workflow Status & Checkpoints
      if (url.pathname.startsWith('/api/workflows/') && req.method === 'GET') {
        const id = url.pathname.split('/')[3];
        const workflow = this.activeWorkflows.get(id);
        if (!workflow) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `Workflow ${id} not found.` }));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          workflowId: workflow.workflowId,
          status: workflow.state,
          checkpoints: workflow.checkpoints
        }));
        return;
      }

      // 4. Isolated Code Execution
      if (url.pathname === '/api/sandbox/execute' && req.method === 'POST') {
        const body = await this.readJsonBody(req);
        let result;
        if (body.language === 'python') {
          result = await codeExecutor.executeTier2Python(body.code, body.input || {}, body.timeoutMs || 15000);
        } else {
          result = await codeExecutor.executeTier1Script(body.code, body.input || {}, body.timeoutMs || 3000);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
        return;
      }

      // 5. Memory Query & Compaction
      if (url.pathname === '/api/memory/query' && req.method === 'GET') {
        const tenant = req.headers['x-tenant-id'] || 'default_tenant';
        const project = url.searchParams.get('project') || 'keaos_core';
        const query = url.searchParams.get('q') || '';
        const nsKey = memoryFabric.getNamespaceKey(tenant, 'agents', project);

        const items = memoryFabric.queryEpisodicMemory(nsKey, query, 10);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ namespace: nsKey, count: items.length, items }));
        return;
      }

      // Default 404
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Endpoint not found.' }));
    });

    server.listen(this.port, () => {
      console.log(`[KEAOS Gateway] High-Throughput Orchestration API listening on port ${this.port}`);
    });

    return server;
  }

  readJsonBody(req) {
    return new Promise((resolve, reject) => {
      let data = '';
      req.on('data', chunk => { data += chunk; });
      req.on('end', () => {
        try {
          resolve(data ? JSON.parse(data) : {});
        } catch (e) {
          reject(new Error('Invalid JSON payload'));
        }
      });
      req.on('error', reject);
    });
  }
}
