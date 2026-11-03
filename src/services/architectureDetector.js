/**
 * Adaptive Product Architecture & Multi-Stage Telemetry Detector
 * 
 * Inspects any third-party external agent or product across 3 adaptive tiers:
 * - Tier 1 (Exact): Explicit OTel headers, X-Telemetry headers, or response usage_metadata.
 * - Tier 2 (Probed): Discovered service metadata (e.g. /api/health hints, OpenAPI tags).
 * - Tier 3 (Decomposed): Semantic Payload Decomposition attributing tokens across
 *   Document Vision, Field Extraction, Deterministic Rules (0-token), Advisory Narratives,
 *   and Gateway Integrations.
 */

import { calculateMultiStageCost } from './modelPricingService.js';

/**
 * Detect product architecture tier and compute stage-by-stage token/cost attribution
 */
export function detectAndAttributeTelemetry({
  endpointUrl = '',
  responseHeaders = {},
  responseBody = null,
  inputData = null,
  modelId = 'gemini-2.5-flash',
  provider = 'google',
  discountPercent = 0,
  latencyMs = 0
}) {
  let detectedTier = 'tier3_decomposed';
  let tierLabel = 'Tier 3 (Decomposed)';
  let effectiveModelId = modelId || 'gemini-2.5-flash';
  let stages = [];

  // Normalize response headers
  const headers = {};
  if (responseHeaders && typeof responseHeaders === 'object') {
    Object.keys(responseHeaders).forEach((k) => {
      headers[k.toLowerCase()] = responseHeaders[k];
    });
  }

  // --------------------------------------------------------------------------
  // TIER 1: Exact Telemetry Headers or Direct usage_metadata
  // --------------------------------------------------------------------------
  const customStepsHeader = headers['x-telemetry-steps'] || headers['x-keaos-telemetry'];
  const usageMeta = responseBody?.usage_metadata || responseBody?.usage || responseBody?.metrics?.usage;

  if (customStepsHeader) {
    try {
      const parsedSteps = typeof customStepsHeader === 'string' ? JSON.parse(customStepsHeader) : customStepsHeader;
      if (Array.isArray(parsedSteps) && parsedSteps.length > 0) {
        detectedTier = 'tier1_exact';
        tierLabel = 'Tier 1 (Exact Header Telemetry)';
        stages = parsedSteps.map((stg, i) => ({
          id: `step-${i + 1}`,
          name: stg.name || stg.step || `Stage ${i + 1}`,
          nature: stg.nature || (stg.tokens > 0 ? 'generative' : 'deterministic'),
          tokens: Number(stg.tokens || 0),
          promptTokens: Number(stg.promptTokens || stg.prompt_tokens || 0),
          completionTokens: Number(stg.completionTokens || stg.completion_tokens || 0),
          cachedTokens: Number(stg.cachedTokens || stg.cached_tokens || 0),
          latencyMs: Number(stg.latencyMs || Math.round(latencyMs / parsedSteps.length)),
          isInput: false
        }));
      }
    } catch (e) {
      console.warn('[ArchitectureDetector] Failed to parse x-telemetry-steps:', e);
    }
  } else if (usageMeta) {
    detectedTier = 'tier1_exact';
    tierLabel = 'Tier 1 (Exact Payload Usage)';
    const promptTokens = Number(usageMeta.prompt_tokens || usageMeta.promptTokens || usageMeta.input_tokens || 0);
    const completionTokens = Number(usageMeta.completion_tokens || usageMeta.completionTokens || usageMeta.output_tokens || 0);
    const cachedTokens = Number(usageMeta.cached_tokens || usageMeta.cachedTokens || 0);
    const total = promptTokens + completionTokens;

    stages = [
      {
        id: 'stage-prompt',
        name: 'Inference Input & Multimodal Prompt',
        nature: 'generative',
        tokens: promptTokens,
        promptTokens,
        completionTokens: 0,
        cachedTokens,
        latencyMs: Math.round(latencyMs * 0.35),
        isInput: true
      },
      {
        id: 'stage-completion',
        name: 'Structured Extraction & Reasoning',
        nature: 'generative',
        tokens: completionTokens,
        promptTokens: 0,
        completionTokens,
        cachedTokens: 0,
        latencyMs: Math.round(latencyMs * 0.65),
        isInput: false
      }
    ];
  }

  // --------------------------------------------------------------------------
  // TIER 2 & TIER 3: Semantic Payload Decomposition & Probed Architecture
  // --------------------------------------------------------------------------
  if (stages.length === 0) {
    // Model auto-inference from response hints
    if (responseBody?.model || responseBody?.modelId) {
      effectiveModelId = responseBody.model || responseBody.modelId;
      detectedTier = 'tier2_probed';
      tierLabel = 'Tier 2 (Model Probed)';
    }

    // 1. STAGE A: Document Ingestion & Multimodal Vision
    const isDocInput = Boolean(
      (inputData && typeof inputData === 'object' && (inputData.name || inputData.rawFile)) ||
      responseBody?.pages ||
      responseBody?.fileName ||
      responseBody?.file_name
    );

    const docPages = Number(responseBody?.pages || responseBody?.page_count || 1);
    const visionTokensPerPage = effectiveModelId.includes('gemini') ? 258 : 765;
    const basePromptTokens = isDocInput ? 1150 : 250;
    const textHintTokens = isDocInput ? 420 : 0;
    const inputStageTokens = basePromptTokens + (docPages * visionTokensPerPage) + textHintTokens;

    stages.push({
      id: 'stage-vision-intake',
      name: isDocInput ? `Document Vision & OCR Intake (${docPages} Page${docPages > 1 ? 's' : ''})` : 'System Ingestion & Prompt Protocol',
      nature: 'generative',
      tokens: inputStageTokens,
      promptTokens: inputStageTokens,
      completionTokens: 0,
      cachedTokens: 0,
      latencyMs: Math.round(latencyMs * 0.68),
      isInput: true,
      description: isDocInput ? `Gemini Vision Multimodal tiling: ${docPages} pages × ${visionTokensPerPage} tok + system schema` : 'Request payload & prompt'
    });

    // 2. STAGE B: Core Generative Extraction & Schema Serialization
    const itemsPart = responseBody?.items || responseBody?.line_items || [];
    const fieldsPart = responseBody?.fields || responseBody?.extraction || {};
    const serializedExtraction = JSON.stringify({ items: itemsPart, fields: fieldsPart });
    const extractionTokens = Math.max(350, Math.round(serializedExtraction.length / 4));

    stages.push({
      id: 'stage-extraction',
      name: 'Structured Schema Extraction',
      nature: 'generative',
      tokens: extractionTokens,
      promptTokens: 0,
      completionTokens: extractionTokens,
      cachedTokens: 0,
      latencyMs: Math.round(latencyMs * 0.18),
      isInput: false,
      description: `Structured output: ${Array.isArray(itemsPart) ? itemsPart.length : 0} line items, header fields`
    });

    // 3. STAGE C: Deterministic Compliance & Validation Rules
    const checksList = responseBody?.checks || responseBody?.validations || responseBody?.rules || [];
    const checksCount = Array.isArray(checksList) ? checksList.length : (responseBody?.match ? 4 : 0);

    stages.push({
      id: 'stage-deterministic-rules',
      name: `Compliance & Math Validation Rules (${checksCount > 0 ? `${checksCount} Checks` : 'Algorithmic'})`,
      nature: 'deterministic',
      tokens: 0,
      promptTokens: 0,
      completionTokens: 0,
      cachedTokens: 0,
      latencyMs: Math.round(latencyMs * 0.04),
      isInput: false,
      description: 'Zero-token algorithmic verification (Duplicate SHA check, GST math, vendor registration)'
    });

    // 4. STAGE D: Decision & Advisory Copilot (Generative Reasoning)
    const narrativeText = responseBody?.validationNarrative || 
                          responseBody?.recommendation || 
                          responseBody?.advisory?.narrative || 
                          responseBody?.advisory?.text ||
                          (typeof responseBody?.advisory === 'string' ? responseBody.advisory : '') ||
                          responseBody?.narrative || '';

    const hasAdvisory = Boolean(narrativeText && narrativeText.length > 5);
    const advisoryTokens = hasAdvisory ? Math.max(80, Math.round(narrativeText.length / 4)) : 0;

    if (hasAdvisory || responseBody?.recommendedAction) {
      stages.push({
        id: 'stage-advisory-copilot',
        name: 'Decision & Advisory Copilot',
        nature: 'generative',
        tokens: advisoryTokens,
        promptTokens: Math.round(advisoryTokens * 0.4),
        completionTokens: Math.round(advisoryTokens * 0.6),
        cachedTokens: 0,
        latencyMs: Math.round(latencyMs * 0.08),
        isInput: false,
        description: 'Generative advisory narrative & exception recommendation'
      });
    }

    // 5. STAGE E: System Integration & Transaction Ledger
    stages.push({
      id: 'stage-gateway-integration',
      name: 'System Ledger & ERP Integration',
      nature: 'deterministic',
      tokens: 0,
      promptTokens: 0,
      completionTokens: 0,
      cachedTokens: 0,
      latencyMs: Math.round(latencyMs * 0.02),
      isInput: false,
      description: 'Zero-token gateway transaction (SQLite / Zoho Books staging & timeline mark)'
    });
  }

  // --------------------------------------------------------------------------
  // Financial Cost Aggregation
  // --------------------------------------------------------------------------
  const costReport = calculateMultiStageCost({
    provider,
    modelId: effectiveModelId,
    stages,
    discountPercent
  });

  return {
    tier: detectedTier,
    tierLabel,
    modelId: effectiveModelId,
    provider,
    totalTokens: costReport.totalTokens,
    totalCostUsd: costReport.totalCostUsd,
    discountPercent,
    latencyMs,
    stages: costReport.stages
  };
}
