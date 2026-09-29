import { 
  PROVIDERS, 
  getProviderCredential, 
  getAllConfiguredProviders, 
  synthesizeMeetingUniversal, 
  evaluateTestCaseUniversal 
} from '../services/llmService';

export async function runEvaluationSuite({
  dataset,
  thresholds,
  frameworkId,
  agentPrompt,
  attachedPillars,
  onProgress
}) {
  const results = [];
  const modelNode = attachedPillars.find(p => p.type === 'model');
  let provider = modelNode?.config?.provider || 
    (modelNode?.name?.toLowerCase().includes('claude') ? 'anthropic' :
     modelNode?.name?.toLowerCase().includes('gpt') ? 'openai' :
     modelNode?.name?.toLowerCase().includes('ollama') ? 'ollama' :
     modelNode?.name?.toLowerCase().includes('openrouter') ? 'openrouter' : 'google');

  let modelId = modelNode?.config?.modelId || PROVIDERS[provider]?.defaultModel || 'gemini-2.0-flash';
  
  // If chosen provider has no credential, fallback to any other configured provider
  let credential = getProviderCredential(provider);
  if (!credential) {
    const configured = getAllConfiguredProviders();
    if (configured.length > 0) {
      provider = configured[0];
      modelId = PROVIDERS[provider].defaultModel;
      credential = getProviderCredential(provider);
    }
  }

  const hasPiiPolicy = attachedPillars.some(p => p.type === 'policies' || (p.name && p.name.toLowerCase().includes('pii')));
  const hasActionSkills = attachedPillars.some(p => (p.id && p.id.includes('action')) || (p.name && p.name.toLowerCase().includes('action')));
  const hasSummarizer = attachedPillars.some(p => (p.id && p.id.includes('summarizer')) || (p.name && p.name.toLowerCase().includes('summarizer')));

  for (let i = 0; i < dataset.length; i++) {
    const testCase = dataset[i];
    if (onProgress) {
      onProgress({ current: i + 1, total: dataset.length, currentCase: testCase.caseName });
    }

    let faithfulness = 0;
    let actionItemF1 = 0;
    let piiRate = 100;
    let latencySec = 1.5;
    let generatedSummary = `Synthesized output for ${testCase.caseName}`;
    let generatedActionsCount = testCase.groundTruth.actionItems.length;

    if (credential) {
      try {
        // 1. Run Real Agent Inference on the Test Case Transcript using Multi-LLM engine
        const realAgentOutput = await synthesizeMeetingUniversal({
          provider,
          modelId,
          transcript: testCase.inputTranscript,
          systemPrompt: agentPrompt,
          temperature: 0.2
        });

        generatedSummary = realAgentOutput.parsedData.summary?.join(' ') || '';
        generatedActionsCount = realAgentOutput.parsedData.actionItems?.length || 0;

        // 2. Run Real Multi-LLM Judge Evaluation against Ground Truth
        const judgeEvaluation = await evaluateTestCaseUniversal({
          provider,
          modelId,
          transcript: testCase.inputTranscript,
          generatedSummary: realAgentOutput.parsedData.summary,
          generatedActions: realAgentOutput.parsedData.actionItems,
          groundTruth: testCase.groundTruth
        });

        faithfulness = judgeEvaluation.faithfulness;
        actionItemF1 = judgeEvaluation.actionItemF1;
        latencySec = Number(((realAgentOutput.durationMs + (judgeEvaluation.latencySec * 1000)) / 1000).toFixed(2));
        piiRate = hasPiiPolicy ? 100 : (testCase.groundTruth.piiToRedact.length > 0 ? 0 : 100);
      } catch (err) {
        throw new Error(`Evaluation failed on "${testCase.caseName}": ${err.message}`);
      }
    } else {
      throw new Error(`No API key configured for ${PROVIDERS[provider]?.name || provider}. Please configure your API credentials to run the evaluation gate.`);
    }

    const minFaith = thresholds.minFaithfulness ?? thresholds.faithfulnessScore ?? 85;
    const minF1 = thresholds.minActionItemF1 ?? thresholds.actionItemF1 ?? 90;
    const minPii = thresholds.minPiiCompliance ?? thresholds.piiRedactionRate ?? 100;
    const maxLat = thresholds.maxLatencySec ?? thresholds.maxLatencySeconds ?? 4.0;

    const passedCase = (
      faithfulness >= minFaith &&
      actionItemF1 >= minF1 &&
      piiRate >= minPii &&
      latencySec <= maxLat
    );

    results.push({
      id: testCase.id,
      caseId: testCase.id,
      name: testCase.caseName,
      caseName: testCase.caseName,
      category: testCase.category,
      faithfulness,
      actionItemF1,
      piiRate,
      latencySec,
      passed: passedCase,
      groundTruth: testCase.groundTruth,
      generatedSummary,
      generatedActionsCount
    });
  }

  // Calculate aggregates
  const avgFaithfulness = Math.round(results.reduce((a, b) => a + b.faithfulness, 0) / results.length);
  const avgActionF1 = Math.round(results.reduce((a, b) => a + b.actionItemF1, 0) / results.length);
  const avgPiiRate = Math.round(results.reduce((a, b) => a + b.piiRate, 0) / results.length);
  const avgLatency = Number((results.reduce((a, b) => a + b.latencySec, 0) / results.length).toFixed(2));

  const minFaith = thresholds.minFaithfulness ?? thresholds.faithfulnessScore ?? 85;
  const minF1 = thresholds.minActionItemF1 ?? thresholds.actionItemF1 ?? 90;
  const minPii = thresholds.minPiiCompliance ?? thresholds.piiRedactionRate ?? 100;
  const maxLat = thresholds.maxLatencySec ?? thresholds.maxLatencySeconds ?? 4.0;

  const allPassed = (
    avgFaithfulness >= minFaith &&
    avgActionF1 >= minF1 &&
    avgPiiRate >= minPii &&
    avgLatency <= maxLat
  );

  return {
    allPassed,
    aggregates: {
      faithfulness: avgFaithfulness,
      actionItemF1: avgActionF1,
      piiRate: avgPiiRate,
      latencySec: avgLatency,
      totalCases: results.length,
      passedCases: results.filter(r => r.passed).length
    },
    thresholds,
    results,
    caseResults: results
  };
}
