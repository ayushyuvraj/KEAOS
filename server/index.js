/**
 * KEAOS Backend Server Entry Point
 * 
 * Launches the High-Throughput Orchestration Gateway on Port 4000.
 */

import { KeaosApiGateway } from './api/gateway.js';

const PORT = process.env.PORT || 4000;
const gateway = new KeaosApiGateway(PORT);
gateway.start();

console.log(`===================================================`);
console.log(` KEAOS Distributed Orchestration Engine`);
console.log(` Control Plane & Execution Gateway Active on Port ${PORT}`);
console.log(` Endpoints:`);
console.log(` • GET  http://localhost:${PORT}/api/health`);
console.log(` • GET  http://localhost:${PORT}/api/cluster/metrics`);
console.log(` • POST http://localhost:${PORT}/api/workflows/start`);
console.log(` • GET  http://localhost:${PORT}/api/workflows/:id/stream`);
console.log(` • POST http://localhost:${PORT}/api/sandbox/execute`);
console.log(` • GET  http://localhost:${PORT}/api/memory/query`);
console.log(`===================================================`);
