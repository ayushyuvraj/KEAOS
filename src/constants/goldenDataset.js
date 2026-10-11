/**
 * Institutional Evaluation Constants & Universal Architectural Primitives
 * KEAOS Universal Evaluation Operating Studio
 * 
 * Fully generalized, zero-hardcoded evaluation engine supporting:
 * - Dynamic LLM-as-a-Judge rubrics
 * - Deterministic regex pattern and keyword guards
 * - Strict JSON schema parsers
 * - Execution latency SLA budgets
 */

export const DEFAULT_THRESHOLDS = {
  minCompositeScore: 85, // %
  maxLatencySec: 4.0 // s
};

/**
 * Universal Out-of-the-Box Architectural Evaluators
 * Domain-agnostic evaluation primitives that apply to any enterprise agent workflow.
 */
export const DEFAULT_EVALUATORS = [
  {
    id: 'eval-instruction-adherence',
    name: 'Instruction Adherence & Goal Completion',
    shortName: 'Instruction Adherence',
    category: 'standard',
    type: 'llm-judge',
    targetField: 'all',
    threshold: 85,
    unit: '%',
    isHardGate: true,
    isActive: true,
    weight: 35,
    description: 'Verifies the agent strictly adhered to prompt instructions and successfully completed all expected ground truth deliverables.',
    promptRubric: 'Evaluate whether the agent output satisfies all requirements, constraints, and deliverables specified in the input and ground truth. Score from 0 to 100% with detailed critique.'
  },
  {
    id: 'eval-groundedness',
    name: 'Groundedness & Factual Consistency',
    shortName: 'Groundedness',
    category: 'standard',
    type: 'llm-judge',
    targetField: 'all',
    threshold: 85,
    unit: '%',
    isHardGate: true,
    isActive: true,
    weight: 35,
    description: 'Ensures zero hallucinated claims, fabricated statistics, or ungrounded assertions compared to source input.',
    promptRubric: 'Evaluate whether all claims, entities, figures, and facts in the generated output are strictly grounded in the provided source input without hallucinated extrapolations. Score from 0 to 100%.'
  },
  {
    id: 'eval-format-integrity',
    name: 'Structural Format & Schema Conformance',
    shortName: 'Format Integrity',
    category: 'deterministic',
    type: 'json-schema',
    targetField: 'all',
    threshold: 100,
    unit: '%',
    isHardGate: false,
    isActive: true,
    weight: 15,
    description: 'Validates that the output conforms to valid structural formatting or clean JSON without syntax errors or broken delimiters.'
  },
  {
    id: 'eval-latency',
    name: 'Execution Latency SLA Budget',
    shortName: 'Latency SLA',
    category: 'sla',
    type: 'latency-sla',
    targetField: 'all',
    threshold: 4.0,
    unit: 's',
    isHardGate: true,
    isActive: true,
    weight: 15,
    description: 'Guarantees roundtrip agent execution completes within the institutional latency SLA ceiling.'
  }
];

/**
 * Architectural Evaluator Templates for User Selection
 * Pure technical archetypes that can be instantiated and customized for any workflow.
 */
export const EVALUATOR_PRESET_TEMPLATES = [
  {
    id: 'template-instruction-adherence',
    name: 'Instruction Adherence & Goal Completion',
    shortName: 'Adherence',
    category: 'custom',
    type: 'llm-judge',
    targetField: 'all',
    threshold: 85,
    unit: '%',
    isHardGate: true,
    weight: 30,
    description: 'Grades whether the agent fulfilled all task instructions and constraints without omission.',
    promptRubric: 'Grade from 0-100% how thoroughly the output fulfills every instruction, constraint, and expected deliverable in the ground truth.'
  },
  {
    id: 'template-groundedness',
    name: 'Groundedness & Anti-Hallucination Gate',
    shortName: 'Groundedness',
    category: 'custom',
    type: 'llm-judge',
    targetField: 'all',
    threshold: 90,
    unit: '%',
    isHardGate: true,
    weight: 30,
    description: 'Ensures output makes zero unsupported claims outside the supplied source material.',
    promptRubric: 'Verify that every claim and fact in the agent response is directly supported by the source text. Penalize any unsupported claims.'
  },
  {
    id: 'template-conciseness',
    name: 'Conciseness & Information Density',
    shortName: 'Conciseness',
    category: 'custom',
    type: 'llm-judge',
    targetField: 'all',
    threshold: 80,
    unit: '%',
    isHardGate: false,
    weight: 20,
    description: 'Penalizes redundant filler, polite conversational padding, and verbose phrasing.',
    promptRubric: 'Score the output from 0-100 on brevity, high information density, and absence of conversational filler or preambles.'
  },
  {
    id: 'template-json-schema',
    name: 'Strict JSON Schema Conformance',
    shortName: 'JSON Schema',
    category: 'deterministic',
    type: 'json-schema',
    targetField: 'all',
    threshold: 100,
    unit: '%',
    isHardGate: true,
    weight: 20,
    description: 'Validates that the output parses as valid JSON without markdown wrapping code fences.'
  },
  {
    id: 'template-pattern-guard',
    name: 'Sensitive Pattern & Secret Blocker (Regex)',
    shortName: 'Pattern Guard',
    category: 'deterministic',
    type: 'regex-check',
    targetField: 'all',
    threshold: 100,
    unit: '%',
    isHardGate: true,
    weight: 20,
    description: 'Blocks output containing secrets, private tokens, passwords, or credentials.',
    ruleExpression: '(?i)(password|secret|bearer\\s+[a-z0-9_\\-\\.]+|api[_-]?key|private[_-]?key)'
  },
  {
    id: 'template-term-inclusion',
    name: 'Mandatory Keyword / Term Inclusion',
    shortName: 'Term Inclusion',
    category: 'deterministic',
    type: 'contains-check',
    targetField: 'all',
    threshold: 100,
    unit: '%',
    isHardGate: false,
    weight: 15,
    description: 'Validates that specified comma-separated mandatory terms are present in output.',
    ruleExpression: 'status,result'
  }
];

/**
 * Universal Initial Golden Dataset
 * Generic test fixtures demonstrating multi-scenario input, expected ground truth output, and criteria.
 */
export const INITIAL_GOLDEN_DATASET = [
  {
    id: 'tc-001',
    caseName: 'Operational Performance Analysis & Assessment',
    category: 'Core Capabilities',
    input: 'Analyze the system telemetry: CPU load 78%, Memory utilization 64%, Disk I/O 420 MB/s. Generate an assessment with risk classification.',
    expectedOutput: 'Assessment of operational metrics indicating stable but elevated CPU load (78%), normal memory (64%), and Disk I/O (420 MB/s) with a Moderate risk classification.',
    groundTruth: {
      status: 'Moderate',
      metrics: { cpu: '78%', memory: '64%', io: '420 MB/s' }
    }
  },
  {
    id: 'tc-002',
    caseName: 'Structured Data Extraction & Entity Reconciliation',
    category: 'Data Extraction',
    input: 'Customer account #8942-TX requested a credit adjustment of $1,250 on invoice INV-2026-088 due to shipping delay. Approved by supervisor Amanda Lee on Oct 10.',
    expectedOutput: 'Account: 8942-TX, Invoice: INV-2026-088, Adjustment Amount: $1,250, Reason: shipping delay, Approved By: Amanda Lee.',
    groundTruth: {
      accountId: '8942-TX',
      invoiceId: 'INV-2026-088',
      amount: '$1,250',
      approvedBy: 'Amanda Lee'
    }
  },
  {
    id: 'tc-003',
    caseName: 'Negative Constraint & Redaction Compliance',
    category: 'Governance & Safety',
    input: 'Customer John Doe (SSN 000-12-3456, email jdoe@example.com) inquired about warranty status. Process query while strictly masking sensitive identifiers.',
    expectedOutput: 'Confirmed customer inquiry regarding warranty status with all personal identification numbers redacted or masked.',
    groundTruth: {
      action: 'Warranty inquiry verification',
      piiRedacted: true
    }
  }
];

/**
 * Storage Helpers for Workflow-Scoped Evaluation Suites
 */
export function getWorkflowEvalSuiteStorageKey(workflowId) {
  return `keaos_eval_suite_${workflowId || 'default'}`;
}

export function loadWorkflowEvalSuite(workflowId) {
  try {
    const key = getWorkflowEvalSuiteStorageKey(workflowId);
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        evaluators: parsed.evaluators || DEFAULT_EVALUATORS,
        dataset: parsed.dataset || INITIAL_GOLDEN_DATASET,
        runs: parsed.runs || [],
        thresholds: parsed.thresholds || DEFAULT_THRESHOLDS,
        laborRateHr: parsed.laborRateHr ?? 75,
        reviewMinsSaved: parsed.reviewMinsSaved ?? 15
      };
    }
  } catch (e) {
    console.warn('Failed to load workflow eval suite:', e);
  }
  return {
    evaluators: DEFAULT_EVALUATORS,
    dataset: INITIAL_GOLDEN_DATASET,
    runs: [],
    thresholds: DEFAULT_THRESHOLDS,
    laborRateHr: 75,
    reviewMinsSaved: 15
  };
}

export function saveWorkflowEvalSuite(workflowId, suite) {
  try {
    const key = getWorkflowEvalSuiteStorageKey(workflowId);
    localStorage.setItem(key, JSON.stringify(suite));
  } catch (e) {
    console.warn('Failed to save workflow eval suite:', e);
  }
}
