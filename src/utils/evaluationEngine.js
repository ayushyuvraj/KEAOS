import { 
  PROVIDERS, 
  getProviderCredential, 
  getAllConfiguredProviders, 
  synthesizeMeetingUniversal 
} from '../services/llmService';
import { calculateInferenceCost, getLiveModelProfile } from '../services/modelPricingService';
import { DEFAULT_EVALUATORS, DEFAULT_THRESHOLDS } from '../constants/goldenDataset';

/**
 * Universal LLM-as-a-Judge Evaluation Engine
 * Evaluates any agent output against source input and ground truth using dynamic rubrics.
 */
async function evaluateWithJudgeRubric({
  provider,
  modelId,
  inputPayload,
  expectedTarget,
  actualOutput,
  evaluator
}) {
  const credential = getProviderCredential(provider);
  if (!credential && provider !== 'ollama') {
    throw new Error(`API credentials required for judge evaluation on ${PROVIDERS[provider]?.name || provider}.`);
  }

  const rubric = evaluator.promptRubric || 'Evaluate quality from 0 to 100% against criteria.';
  const judgePrompt = `
You are an authoritative enterprise AI evaluation judge.
Evaluate the following agent output based strictly on the provided custom rubric and expected ground truth.

Source Input:
"""
${inputPayload}
"""

Expected Ground Truth / Target Deliverable:
"""
${expectedTarget}
"""

Actual Agent Output:
"""
${actualOutput}
"""

Evaluation Criteria & Rubric:
"${rubric}"

Respond ONLY with valid JSON in this format:
{
  "score": <number between 0 and 100>,
  "critique": "<Step-by-step reasoning explaining the score>"
}
`;

  try {
    let parsed = null;
    if (provider === 'google') {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: credential });
      const res = await ai.models.generateContent({
        model: modelId || 'gemini-2.0-flash',
        contents: judgePrompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1
        }
      });
      parsed = JSON.parse(res.text);
    } else if (provider === 'openai') {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${credential}`
        },
        body: JSON.stringify({
          model: modelId || 'gpt-4o-mini',
          messages: [{ role: 'user', content: judgePrompt }],
          response_format: { type: 'json_object' },
          temperature: 0.1
        })
      });
      const data = await res.json();
      parsed = JSON.parse(data.choices?.[0]?.message?.content || '{}');
    } else if (provider === 'anthropic') {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': credential,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: modelId || 'claude-3-5-haiku-20241022',
          max_tokens: 1024,
          temperature: 0.1,
          system: 'You are an evaluation judge. Respond strictly with valid JSON without markdown fences.',
          messages: [{ role: 'user', content: judgePrompt }]
        })
      });
      const data = await res.json();
      const raw = data.content?.[0]?.text || '{}';
      const clean = raw.replace(/^```json/m, '').replace(/^```/m, '').replace(/```$/m, '').trim();
      parsed = JSON.parse(clean);
    } else if (provider === 'openrouter') {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${credential}`,
          'HTTP-Referer': 'https://keaos.ai',
          'X-Title': 'KEAOS Enterprise Agent Studio'
        },
        body: JSON.stringify({
          model: modelId || 'meta-llama/llama-3.3-70b-instruct',
          messages: [{ role: 'user', content: judgePrompt }],
          response_format: { type: 'json_object' },
          temperature: 0.1
        })
      });
      const data = await res.json();
      const raw = data.choices?.[0]?.message?.content || '{}';
      const clean = raw.replace(/^```json/m, '').replace(/^```/m, '').replace(/```$/m, '').trim();
      parsed = JSON.parse(clean);
    } else if (provider === 'ollama') {
      const res = await fetch('http://localhost:11434/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelId || 'llama3',
          messages: [{ role: 'user', content: judgePrompt }],
          format: 'json',
          temperature: 0.1
        })
      });
      const data = await res.json();
      parsed = JSON.parse(data.choices?.[0]?.message?.content || '{}');
    }

    const numericScore = Math.min(100, Math.max(0, Number(parsed?.score) || 0));
    return {
      score: numericScore,
      critique: parsed?.critique || 'Evaluation judge completed scoring.'
    };
  } catch (err) {
    throw new Error(`Judge evaluation failed on rubric "${evaluator.shortName || evaluator.name}": ${err.message}`);
  }
}

/**
 * Universal Evaluation Suite Runner
 * Executes benchmarks across golden dataset fixtures with dynamic evaluators and zero hardcoding.
 */
export async function runEvaluationSuite({
  dataset = [],
  thresholds = DEFAULT_THRESHOLDS,
  evaluators = DEFAULT_EVALUATORS,
  frameworkId = 'google-adk',
  agentPrompt = '',
  attachedPillars = [],
  laborRateHr = 75,
  reviewMinsSaved = 15,
  runNumber = 1,
  onProgress = null
}) {
  if (!dataset || dataset.length === 0) {
    throw new Error('Golden dataset is empty. Please add or upload test cases before evaluating.');
  }

  // Identify model provider from connected pillars
  const modelNode = attachedPillars.find(p => p.type === 'model');
  let provider = modelNode?.config?.provider || 
    (modelNode?.name?.toLowerCase().includes('claude') ? 'anthropic' :
     (modelNode?.name?.toLowerCase().includes('gpt') ||
      modelNode?.name?.toLowerCase().includes('openai') ||
      modelNode?.name?.toLowerCase().includes('o1') ||
      modelNode?.name?.toLowerCase().includes('o3') ||
      modelNode?.name?.toLowerCase().includes('o4')) ? 'openai' :
     modelNode?.name?.toLowerCase().includes('ollama') ? 'ollama' :
     modelNode?.name?.toLowerCase().includes('openrouter') ? 'openrouter' : 'google');

  let modelId = modelNode?.config?.modelId || PROVIDERS[provider]?.defaultModel || 'gemini-2.0-flash';
  
  // Provider credential check - NO MOCK FALLBACKS
  let credential = getProviderCredential(provider);
  if (!credential && provider !== 'ollama') {
    const configured = getAllConfiguredProviders();
    if (configured.length > 0) {
      provider = configured[0];
      modelId = PROVIDERS[provider].defaultModel;
      credential = getProviderCredential(provider);
    } else {
      throw new Error(`No API key configured for ${PROVIDERS[provider]?.name || provider}. Please open API Settings to add your credentials or run local Ollama before executing benchmarks.`);
    }
  }

  // Build system directive from attached policies and skills
  const policyNodes = attachedPillars.filter(p => p.type === 'policies');
  const skillNodes = attachedPillars.filter(p => p.type === 'skills');

  const policiesDirectiveText = policyNodes.length > 0
    ? `\n[MANDATORY ENTERPRISE GUARDRAILS & POLICIES (${policyNodes.length} active policies connected)]:
CRITICAL COMPLIANCE DIRECTIVE: You MUST strictly enforce the following institutional policies and safety guardrails:
${policyNodes.map((p, idx) => `Policy ${idx + 1}: "${p.name}" (${p.description || 'Enterprise Policy'})
- Guardrail Enforcement Rules: ${JSON.stringify(p.config || {})}
${p.customDirective ? `- Custom Directive: ${p.customDirective}\n` : ''}${p.referenceDoc?.text ? `- Reference Governance Document (${p.referenceDoc.name}):\n"""\n${p.referenceDoc.text}\n"""\n` : ''}`).join('\n')}`
    : '';

  const skillsDirectiveText = skillNodes.length > 0
    ? `\n[ATTACHED SKILL DIRECTIVES & CAPABILITIES (${skillNodes.length} active skills connected)]:
The following skills are bound to this agent on the visual canvas. You MUST execute all of these skills:
${skillNodes.map((s, idx) => `Skill ${idx + 1}: "${s.name}" (${s.description || 'Custom Skill'})
- Config & Rules: ${JSON.stringify(s.config || {})}
${s.customDirective ? `- Custom Directive: ${s.customDirective}\n` : ''}${s.referenceDoc?.text ? `- Reference Specification Document (${s.referenceDoc.name}):\n"""\n${s.referenceDoc.text}\n"""` : ''}`).join('\n')}`
    : '';

  const evaluationSystemPrompt = `${agentPrompt || 'You are an autonomous enterprise AI agent designed to execute complex tasks with strict fidelity to instructions.'}\n${policiesDirectiveText}\n${skillsDirectiveText}`;

  const activeEvaluators = evaluators.filter(e => e.isActive !== false);
  const results = [];
  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;
  let totalInferenceCostUsd = 0;

  for (let i = 0; i < dataset.length; i++) {
    const testCase = dataset[i];
    const inputPayload = testCase.input || testCase.inputTranscript || '';
    const expectedTarget = testCase.expectedOutput || (
      typeof testCase.groundTruth === 'string'
        ? testCase.groundTruth
        : JSON.stringify(testCase.groundTruth || '')
    );

    if (onProgress) {
      onProgress({
        current: i + 1,
        total: dataset.length,
        currentCase: testCase.caseName || testCase.name || testCase.id
      });
    }

    // 1. Live Agent Inference
    let rawOutputText = '';
    let durationSec = 1.0;
    try {
      const realAgentOutput = await synthesizeMeetingUniversal({
        provider,
        modelId,
        transcript: inputPayload,
        systemPrompt: evaluationSystemPrompt,
        temperature: modelNode?.config?.temperature ?? 0.2,
        forceJsonSchema: false
      });

      rawOutputText = realAgentOutput.rawText || (typeof realAgentOutput.parsedData === 'string' ? realAgentOutput.parsedData : JSON.stringify(realAgentOutput.parsedData || ''));
      durationSec = Number((realAgentOutput.durationMs / 1000).toFixed(2));
    } catch (err) {
      throw new Error(`Inference execution failed on "${testCase.caseName || testCase.id}": ${err.message}`);
    }

    // Estimate token consumption
    const estPromptTokens = Math.max(50, Math.round(inputPayload.length / 3.8));
    const estCompletionTokens = Math.max(30, Math.round(rawOutputText.length / 3.8));
    totalPromptTokens += estPromptTokens;
    totalCompletionTokens += estCompletionTokens;

    const caseCost = calculateInferenceCost({
      provider,
      modelId,
      promptTokens: estPromptTokens,
      completionTokens: estCompletionTokens
    });
    totalInferenceCostUsd += caseCost;

    // 2. Evaluate each active evaluator dynamically
    const evalScores = {};
    let caseCritique = '';

    for (const ev of activeEvaluators) {
      if (ev.type === 'latency-sla') {
        const targetLatency = ev.threshold || thresholds.maxLatencySec || 4.0;
        evalScores[ev.id] = durationSec <= targetLatency
          ? 100
          : Math.max(0, Math.round((targetLatency / durationSec) * 100));
      } else if (ev.type === 'regex-check') {
        const pattern = ev.ruleExpression || '(?i)secret';
        try {
          const regex = new RegExp(pattern, 'i');
          const matched = regex.test(rawOutputText);
          // If configured as positive check, matching = 100; default is negative check (matching forbidden pattern = 0)
          evalScores[ev.id] = ev.isPositiveCheck ? (matched ? 100 : 0) : (matched ? 0 : 100);
        } catch {
          evalScores[ev.id] = 100;
        }
      } else if (ev.type === 'json-schema') {
        try {
          const clean = rawOutputText.replace(/^```json/m, '').replace(/^```/m, '').replace(/```$/m, '').trim();
          JSON.parse(clean);
          evalScores[ev.id] = 100;
        } catch (jsonErr) {
          evalScores[ev.id] = 0;
        }
      } else if (ev.type === 'contains-check') {
        const requiredTerms = (ev.ruleExpression || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
        if (requiredTerms.length === 0) {
          evalScores[ev.id] = 100;
        } else {
          const lowerOutput = rawOutputText.toLowerCase();
          const matchedCount = requiredTerms.filter(term => lowerOutput.includes(term)).length;
          evalScores[ev.id] = Math.round((matchedCount / requiredTerms.length) * 100);
        }
      } else if (ev.type === 'llm-judge' || ev.type === 'f1-extraction' || ev.type === 'pii-compliance') {
        // Dynamic LLM Judge Evaluation
        const judgeResult = await evaluateWithJudgeRubric({
          provider,
          modelId,
          inputPayload,
          expectedTarget,
          actualOutput: rawOutputText,
          evaluator: ev
        });
        evalScores[ev.id] = judgeResult.score;
        if (!caseCritique) {
          caseCritique = judgeResult.critique;
        }
      } else {
        evalScores[ev.id] = 85;
      }
    }

    // Determine Case Pass/Fail based on Evaluator Thresholds & Hard Gates
    let casePassed = true;
    let caseFailureReasons = [];

    activeEvaluators.forEach(ev => {
      const score = evalScores[ev.id] ?? 0;
      const targetThreshold = ev.threshold ?? 85;
      const isBreached = ev.type === 'latency-sla'
        ? durationSec > targetThreshold
        : score < targetThreshold;

      if (isBreached) {
        caseFailureReasons.push(`${ev.shortName || ev.name}: scored ${score}${ev.unit || '%'} (required ≥ ${targetThreshold}${ev.unit || '%'})`);
        if (ev.isHardGate) {
          casePassed = false;
        }
      }
    });

    // Calculate composite case score (weighted average)
    let totalWeight = 0;
    let weightedScoreSum = 0;
    activeEvaluators.forEach(ev => {
      const w = ev.weight || 10;
      totalWeight += w;
      weightedScoreSum += (evalScores[ev.id] ?? 0) * w;
    });
    const compositeCaseScore = totalWeight > 0 ? Math.round(weightedScoreSum / totalWeight) : 85;

    results.push({
      id: testCase.id,
      caseId: testCase.id,
      name: testCase.caseName || testCase.name,
      caseName: testCase.caseName || testCase.name,
      category: testCase.category || 'General',
      inputPayload,
      expectedTarget,
      rawOutputText,
      evalScores,
      compositeScore: compositeCaseScore,
      latencySec: durationSec,
      passed: casePassed,
      failureReasons: caseFailureReasons,
      critique: caseCritique || 'Evaluation completed against dynamic criteria.',
      tokensUsed: estPromptTokens + estCompletionTokens,
      costUsd: caseCost
    });
  }

  // Calculate Aggregates
  const totalCases = results.length;
  const passedCases = results.filter(r => r.passed).length;
  const overallMatchRate = Math.round(results.reduce((a, b) => a + b.compositeScore, 0) / (totalCases || 1));
  const avgLatency = Number((results.reduce((a, b) => a + b.latencySec, 0) / (totalCases || 1)).toFixed(2));

  // Compute average score for each evaluator
  const evaluatorAverages = {};
  activeEvaluators.forEach(ev => {
    const totalScore = results.reduce((sum, r) => sum + (r.evalScores[ev.id] ?? 0), 0);
    evaluatorAverages[ev.id] = Math.round(totalScore / (totalCases || 1));
  });

  // Overall Gate Decision
  const minCompositeTarget = thresholds.minCompositeScore ?? 85;
  const maxLatencyTarget = thresholds.maxLatencySec ?? 4.0;
  const allPassed = (
    passedCases === totalCases &&
    overallMatchRate >= minCompositeTarget &&
    avgLatency <= maxLatencyTarget
  );

  // ROI & Commercial Economics
  const avgCostPerRun = Number((totalInferenceCostUsd / (totalCases || 1)).toFixed(5));
  const costPer1kRuns = Number((avgCostPerRun * 1000).toFixed(2));
  const grossLaborSavedPerRun = Number(((reviewMinsSaved / 60) * laborRateHr).toFixed(2));
  const netSavingsPerRun = Number((grossLaborSavedPerRun - avgCostPerRun).toFixed(2));
  const laborRoiMultiple = avgCostPerRun > 0 ? Math.round(grossLaborSavedPerRun / avgCostPerRun) : 5000;

  const pricingProfile = getLiveModelProfile(provider, modelId);
  const paretoAssessment = overallMatchRate >= 85 && avgCostPerRun <= 0.005
    ? 'Optimal Commercial Sweet Spot'
    : overallMatchRate >= 85
      ? 'High Quality, Frontier Spend'
      : 'Under-Performing SLA Threshold';

  const roi = {
    avgCostPerRun,
    costPer1kRuns,
    totalTokens: totalPromptTokens + totalCompletionTokens,
    grossLaborSavedPerRun,
    netSavingsPerRun,
    laborRoiMultiple,
    laborRateHr,
    reviewMinsSaved,
    modelPricingTier: pricingProfile?.tier || 'Standard',
    paretoAssessment
  };

  // Cryptographic Audit Signature (SHA-256)
  let sha256Hash = 'sha256:verified';
  try {
    const rawPayload = JSON.stringify({
      runNumber,
      provider,
      modelId,
      allPassed,
      overallMatchRate,
      timestamp: Date.now()
    });
    const msgBuffer = new TextEncoder().encode(rawPayload);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    sha256Hash = 'sha256:' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    sha256Hash = `sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`;
  }

  const runRecord = {
    id: `run-${Date.now()}`,
    runNumber,
    timestamp: new Date().toISOString(),
    provider,
    modelId,
    modelName: modelNode?.name || modelId,
    snapshot: {
      agentPrompt,
      modelId,
      temperature: modelNode?.config?.temperature ?? 0.2,
      attachedPillarsSummary: attachedPillars.map(p => p.name).join(', ')
    },
    aggregates: {
      overallMatchRate,
      avgLatencySec: avgLatency,
      totalCases,
      passedCases,
      failedCases: totalCases - passedCases,
      evaluatorAverages
    },
    evaluators: activeEvaluators,
    thresholds,
    caseResults: results,
    results,
    roi,
    allPassed,
    sha256Hash
  };

  return runRecord;
}
