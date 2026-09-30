/**
 * Live Model Pricing & Intelligence Service
 * 
 * Dynamically fetches, indexes, and calculates real-time token pricing, context limits,
 * and capability profiles for all AI models across OpenAI, Google, Anthropic, Ollama, and OpenRouter.
 * 
 * Fetches live metadata from the public OpenRouter model registry without requiring credentials,
 * with resilient localStorage caching and built-in fallback profiles.
 */

import { isFixedTemperatureModel } from './llmService';

const LIVE_CATALOG_STORAGE_KEY = 'keaos_live_pricing_catalog';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

// In-memory runtime cache
let memoryCatalog = null;
let isFetchingCatalog = false;

// Fallback baseline profiles (used while initial network request resolves or if offline)
const BASELINE_RATES = {
  // OpenAI
  'gpt-4o': { promptPerM: 2.50, completionPerM: 10.00, contextLength: 128000, description: 'OpenAI flagship multimodal intelligence with high speed and broad reasoning capabilities.' },
  'gpt-4o-mini': { promptPerM: 0.15, completionPerM: 0.60, contextLength: 128000, description: 'OpenAI cost-efficient small model for high-throughput enterprise tasks.' },
  'o1': { promptPerM: 15.00, completionPerM: 60.00, contextLength: 200000, description: 'OpenAI frontier reasoning model designed for complex logic, math, and code generation.' },
  'o1-mini': { promptPerM: 1.10, completionPerM: 4.40, contextLength: 128000, description: 'Faster, cost-efficient reasoning model optimized for STEM and structured analytical workflows.' },
  'o3-mini': { promptPerM: 1.10, completionPerM: 4.40, contextLength: 200000, description: 'High-intelligence, low-latency reasoning model with customizable reasoning effort.' },
  'gpt-4-turbo': { promptPerM: 10.00, completionPerM: 30.00, contextLength: 128000, description: 'OpenAI previous-generation flagship with 128k context and vision capabilities.' },
  'gpt-3.5-turbo': { promptPerM: 0.50, completionPerM: 1.50, contextLength: 16385, description: 'Legacy fast model for basic translation and simple text transformations.' },
  
  // Google
  'gemini-2.0-flash': { promptPerM: 0.10, completionPerM: 0.40, contextLength: 1048576, description: 'Google next-generation high-speed multimodal model with native audio ingestion and 1M context.' },
  'gemini-1.5-pro': { promptPerM: 1.25, completionPerM: 5.00, contextLength: 2097152, description: 'Google flagship model for complex reasoning across ultra-long documents with 2M token context.' },
  'gemini-1.5-flash': { promptPerM: 0.075, completionPerM: 0.30, contextLength: 1048576, description: 'Fast and lightweight model optimized for frequency and scale.' },
  
  // Anthropic
  'claude-3-5-sonnet-20241022': { promptPerM: 3.00, completionPerM: 15.00, contextLength: 200000, description: 'Anthropic state-of-the-art analytical model combining top-tier reasoning and coding.' },
  'claude-3-5-sonnet': { promptPerM: 3.00, completionPerM: 15.00, contextLength: 200000, description: 'Anthropic state-of-the-art analytical model combining top-tier reasoning and coding.' },
  'claude-3-5-haiku-20241022': { promptPerM: 0.80, completionPerM: 4.00, contextLength: 200000, description: 'Fast, lightweight model with near-instantaneous latency and high coding precision.' },
  'claude-3-5-haiku': { promptPerM: 0.80, completionPerM: 4.00, contextLength: 200000, description: 'Fast, lightweight model with near-instantaneous latency and high coding precision.' },
  'claude-3-opus-20240229': { promptPerM: 15.00, completionPerM: 75.00, contextLength: 200000, description: 'Deep reasoning model for high-complexity intellectual analysis.' }
};

/**
 * Load cached pricing catalog from localStorage
 */
function loadCachedCatalog() {
  if (memoryCatalog) return memoryCatalog;
  try {
    const raw = localStorage.getItem(LIVE_CATALOG_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.timestamp && (Date.now() - parsed.timestamp < CACHE_TTL_MS) && parsed.data) {
        memoryCatalog = parsed.data;
        return memoryCatalog;
      }
    }
  } catch (err) {
    console.warn('[ModelPricing] Failed to load cached catalog:', err);
  }
  return null;
}

/**
 * Save pricing catalog to localStorage
 */
function saveCachedCatalog(data) {
  memoryCatalog = data;
  try {
    localStorage.setItem(LIVE_CATALOG_STORAGE_KEY, JSON.stringify({
      timestamp: Date.now(),
      data
    }));
  } catch (err) {
    console.warn('[ModelPricing] Failed to save catalog cache:', err);
  }
}

/**
 * Fetch fresh real-time model catalog from the public OpenRouter endpoint
 * (No authentication required)
 */
export async function fetchLivePricingCatalog(forceRefresh = false) {
  if (!forceRefresh) {
    const cached = loadCachedCatalog();
    if (cached) return cached;
  }

  if (isFetchingCatalog) {
    return loadCachedCatalog() || {};
  }

  isFetchingCatalog = true;
  try {
    const res = await fetch('https://openrouter.ai/api/v1/models', {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const json = await res.json();
    const rawModels = json.data || [];
    const index = {};

    for (const m of rawModels) {
      const promptPerToken = parseFloat(m.pricing?.prompt || 0);
      const completionPerToken = parseFloat(m.pricing?.completion || 0);
      const promptPerM = Number((promptPerToken * 1_000_000).toFixed(4));
      const completionPerM = Number((completionPerToken * 1_000_000).toFixed(4));

      const entry = {
        id: m.id,
        name: m.name || m.id,
        description: m.description || '',
        contextLength: m.context_length || 128000,
        promptPerM,
        completionPerM,
        promptPerToken,
        completionPerToken,
        architecture: m.architecture || {},
        updatedAt: Date.now()
      };

      // Store by full ID (e.g. "openai/gpt-4o")
      index[m.id.toLowerCase()] = entry;

      // Also store by short name (e.g. "gpt-4o", "o3-mini") if not collision
      const parts = m.id.split('/');
      const shortId = (parts.length > 1 ? parts[1] : parts[0]).toLowerCase();
      if (!index[shortId]) {
        index[shortId] = entry;
      }
    }

    saveCachedCatalog(index);
    return index;
  } catch (err) {
    console.warn('[ModelPricing] Live registry query failed, using baseline profiles:', err.message);
    return loadCachedCatalog() || {};
  } finally {
    isFetchingCatalog = false;
  }
}

// Background prefetch on module load
if (typeof window !== 'undefined') {
  setTimeout(() => {
    fetchLivePricingCatalog().catch(() => {});
  }, 1000);
}

/**
 * Get Dynamic Live Model Profile & Rates for any model
 * 
 * @param {string} provider 'google' | 'openai' | 'anthropic' | 'ollama' | 'openrouter'
 * @param {string} modelId e.g. 'gpt-4o', 'o3-mini', 'claude-3-5-sonnet', 'deepseek-r1'
 * @returns {object} Live profile with real-time costs and architecture limits
 */
export function getLiveModelProfile(provider = 'openai', modelId = 'gpt-4o') {
  const normProvider = (provider || 'openai').toLowerCase();
  const rawModelId = String(modelId || '').trim();
  const normModelId = rawModelId.toLowerCase();

  // 1. OLLAMA: Always free, local private hardware compute
  if (normProvider === 'ollama') {
    return {
      modelId: rawModelId || 'llama3:latest',
      provider: 'ollama',
      displayName: rawModelId || 'Local Ollama Model',
      description: 'Private on-device execution on local GPU/CPU hardware. Zero cloud egress costs with air-gapped compliance.',
      promptPricePerMillion: 0.00,
      completionPricePerMillion: 0.00,
      promptPricePerToken: 0.00,
      completionPricePerToken: 0.00,
      contextLength: 131072,
      isFree: true,
      isReasoning: isFixedTemperatureModel(normModelId),
      tier: 'Private / On-Prem',
      capabilities: ['Air-Gapped Privacy', 'Zero Compute Cost', 'Local Hardware Acceleration', 'Custom Prompt Engineering']
    };
  }

  // 2. Query live memory / cached catalog
  const catalog = loadCachedCatalog() || {};
  let matched = catalog[normModelId] || 
    catalog[`${normProvider}/${normModelId}`] ||
    Object.values(catalog).find(m => m.id.toLowerCase().endsWith(`/${normModelId}`)) ||
    Object.values(catalog).find(m => m.name.toLowerCase() === normModelId);

  // If not matched directly, check baseline table
  const baseline = BASELINE_RATES[normModelId] || 
    Object.entries(BASELINE_RATES).find(([k]) => normModelId.includes(k))?.[1];

  const promptPerM = matched ? matched.promptPerM : (baseline?.promptPerM ?? 1.50);
  const completionPerM = matched ? matched.completionPerM : (baseline?.completionPerM ?? 5.00);
  const contextLength = matched?.contextLength || baseline?.contextLength || 128000;
  const description = (matched?.description && matched.description.length > 10) 
    ? matched.description 
    : (baseline?.description || `${rawModelId} model deployed on live ${provider.toUpperCase()} infrastructure.`);

  const isReasoning = isFixedTemperatureModel(normModelId);

  // Derive dynamic capabilities list based on model architecture
  const capabilities = [];
  if (isReasoning) {
    capabilities.push('Deep Reasoning Chain');
    capabilities.push('Fixed Determinism (1.0)');
  } else {
    capabilities.push('Dynamic Temperature');
    capabilities.push('Nucleus Sampling (Top-P)');
  }

  if (normModelId.includes('gemini') || normModelId.includes('4o')) {
    capabilities.push('Native Multimodal (Vision/Audio)');
  }
  if (!isReasoning) {
    capabilities.push('Strict JSON Schema Mode');
  }
  capabilities.push(`${Math.round(contextLength / 1000)}K Context Window`);

  const tier = isReasoning
    ? 'Reasoning & Deep Logic'
    : (promptPerM <= 0.20 ? 'High-Throughput Lightweight' : 'Frontier Intelligence');

  return {
    modelId: rawModelId,
    provider: normProvider,
    displayName: matched?.name || rawModelId,
    description,
    promptPricePerMillion: promptPerM,
    completionPricePerMillion: completionPerM,
    promptPricePerToken: promptPerM / 1_000_000,
    completionPricePerToken: completionPerM / 1_000_000,
    contextLength,
    isFree: promptPerM === 0 && completionPerM === 0,
    isReasoning,
    tier,
    capabilities
  };
}

/**
 * Calculate the exact real-time cost in USD for an inference execution
 * 
 * @param {string} provider AI provider ID
 * @param {string} modelId Target model ID
 * @param {number} totalTokens Total tokens consumed (or split prompt/completion)
 * @param {number} promptTokens Optional specific prompt token count
 * @param {number} completionTokens Optional specific completion token count
 * @returns {number} Cost in USD rounded to 5 decimal places
 */
export function calculateInferenceCost({
  provider = 'openai',
  modelId = 'gpt-4o',
  totalTokens = 0,
  promptTokens = null,
  completionTokens = null
}) {
  const profile = getLiveModelProfile(provider, modelId);
  if (profile.isFree) return 0.00000;

  // If explicit prompt & completion token breakdown is provided:
  if (promptTokens !== null && completionTokens !== null) {
    const cost = (promptTokens * profile.promptPricePerToken) + (completionTokens * profile.completionPricePerToken);
    return Number(cost.toFixed(5));
  }

  // Standard ratio heuristic: ~30% prompt, ~70% completion for generative tasks
  const pTokens = Math.round(totalTokens * 0.35);
  const cTokens = totalTokens - pTokens;
  const cost = (pTokens * profile.promptPricePerToken) + (cTokens * profile.completionPricePerToken);
  return Number(cost.toFixed(5));
}
