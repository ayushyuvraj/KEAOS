/**
 * Institutional Evaluation Constants & Multi-Domain Datasets
 * KEAOS Universal Evaluation Operating Studio
 */

export const DEFAULT_THRESHOLDS = {
  faithfulnessScore: 85, // %
  actionItemF1: 90, // %
  piiRedactionRate: 100, // %
  maxLatencySeconds: 4.0, // s
  minFaithfulness: 85,
  minActionItemF1: 90,
  minPiiCompliance: 100,
  maxLatencySec: 4.0
};

/**
 * Standard Out-of-the-Box Evaluator Registry
 */
export const DEFAULT_EVALUATORS = [
  {
    id: 'eval-faithfulness',
    name: 'Summary Faithfulness & Hallucination Gate',
    shortName: 'Faithfulness',
    category: 'standard',
    type: 'llm-judge',
    targetField: 'summary',
    threshold: 85,
    unit: '%',
    isHardGate: true,
    isActive: true,
    weight: 35,
    description: 'Enforces strict adherence to source transcript with zero fabricated or unsupported claims.',
    promptRubric: 'Evaluate whether the generated summary contains any claims, figures, or decisions not grounded in the source text. Output 0-100% score.'
  },
  {
    id: 'eval-action-f1',
    name: 'Action Item & Entity F1 Score',
    shortName: 'Action F1',
    category: 'standard',
    type: 'f1-extraction',
    targetField: 'actionItems',
    threshold: 90,
    unit: '%',
    isHardGate: false,
    isActive: true,
    weight: 30,
    description: 'Calculates precision and recall on assignees, tasks, and deadline extraction.',
    promptRubric: 'Compare generated action items against ground truth assignees, tasks, and deadlines. Calculate F1 harmonic mean.'
  },
  {
    id: 'eval-pii',
    name: 'PII & Confidential Data Redactor Gate',
    shortName: 'PII Compliance',
    category: 'standard',
    type: 'pii-compliance',
    targetField: 'all',
    threshold: 100,
    unit: '%',
    isHardGate: true,
    isActive: true,
    weight: 25,
    description: 'Enforces zero leakage of personal salaries, employee phone numbers, API keys, or credentials.',
    promptRubric: 'Verify that all sensitive strings and salary amounts specified in ground truth PII are completely redacted.'
  },
  {
    id: 'eval-latency',
    name: 'Latency SLA Performance Budget',
    shortName: 'Max Latency',
    category: 'sla',
    type: 'latency-sla',
    targetField: 'all',
    threshold: 4.0,
    unit: 's',
    isHardGate: true,
    isActive: true,
    weight: 10,
    description: 'Ensures roundtrip agent synthesis and evaluation completes within target SLA budget.'
  }
];

/**
 * Evaluator Preset Templates for User Selection
 */
export const EVALUATOR_PRESET_TEMPLATES = [
  {
    id: 'preset-executive-tone',
    name: 'Executive Tone & Neutrality',
    shortName: 'Executive Tone',
    category: 'custom',
    type: 'llm-judge',
    targetField: 'summary',
    threshold: 85,
    unit: '%',
    isHardGate: false,
    weight: 20,
    description: 'Audits output for concise, unbiased, board-level communication standards.',
    promptRubric: 'Grade the output from 0-100 on professional brevity, lack of conversational filler, and executive clarity.'
  },
  {
    id: 'preset-numeric-accuracy',
    name: 'Quantitative & Financial Numeric Rigor',
    shortName: 'Numeric Rigor',
    category: 'custom',
    type: 'llm-judge',
    targetField: 'all',
    threshold: 95,
    unit: '%',
    isHardGate: true,
    weight: 25,
    description: 'Verifies exact numerical reconciliation of currency, percentages, and dates.',
    promptRubric: 'Verify that all financial figures, budget totals, and dates in the output match the source text with zero rounding errors.'
  },
  {
    id: 'preset-json-schema',
    name: 'Structured JSON Schema Conformance',
    shortName: 'JSON Schema',
    category: 'deterministic',
    type: 'json-schema',
    targetField: 'all',
    threshold: 100,
    unit: '%',
    isHardGate: true,
    weight: 20,
    description: 'Ensures strict adherence to expected JSON schema format without markdown wrapper fences.'
  },
  {
    id: 'preset-regex-blocker',
    name: 'Prohibited Term Blocker (Regex)',
    shortName: 'Regex Guard',
    category: 'deterministic',
    type: 'regex-check',
    targetField: 'all',
    threshold: 100,
    unit: '%',
    isHardGate: true,
    weight: 15,
    description: 'Blocks forbidden phrases, unverified disclaimers, or raw stack traces.',
    ruleExpression: '(?i)(confidential|proprietary|password|apiKey|stack trace)'
  }
];

export const INITIAL_GOLDEN_DATASET = [
  {
    id: 'gd-001',
    caseName: 'Q3 Enterprise Launch & Budget Sync',
    category: 'Executive Strategy',
    inputTranscript: `[00:01] Sarah Chen: Morning team. Today's agenda is finalizing the Q3 Enterprise Launch roadmap and signing off on the GPU cluster expansion.
[00:15] David Miller: On the engineering side, the streaming gateway is 95% complete. However, we anticipate a bottleneck if we scale past 10,000 concurrent sessions without additional H100 instances.
[01:05] Alex Wong: What is the cost impact, David?
[01:12] David Miller: We need approximately $45,000 extra per month for the dedicated multi-region tier. My base salary is $210,000 and covers maintenance, so no additional headcount is needed.
[02:00] Sarah Chen: Can we reallocate the unspent marketing reserve from Q2?
[02:14] Alex Wong: Yes, we have $60,000 buffer there. I can approve the $45,000 spend provided Priya delivers the latency benchmark report by next Tuesday.
[02:45] Priya Patel: Deal. I will run the stress tests against the Singapore and Frankfurt clusters and publish the final latency matrix by Tuesday, 5 PM EST.
[03:20] Sarah Chen: Excellent. Let's record that decision: $45K approved for GPU expansion, contingent on Priya's latency sign-off.
[03:45] David Miller: Also, Marcus needs to review the OAuth2 token revocation policy with Legal by Friday before we open external developer access.
[04:10] Sarah Chen: Agreed. David, please ensure Marcus gets that done before end of week. Let's wrap up.`,
    groundTruth: {
      keyDecision: '$45,000/month GPU expansion approved from Q2 marketing reserve, contingent on Priya latency benchmark report.',
      actionItems: [
        { assignee: 'Priya Patel', task: 'Run stress tests against Singapore & Frankfurt clusters and deliver latency matrix', deadline: 'Next Tuesday, 5 PM EST' },
        { assignee: 'Marcus', task: 'Review OAuth2 token revocation policy with Legal', deadline: 'This Friday' },
        { assignee: 'David Miller', task: 'Ensure Marcus completes legal review before external dev access is opened', deadline: 'End of week' }
      ],
      piiToRedact: ['$210,000']
    }
  },
  {
    id: 'gd-002',
    caseName: 'P0 Incident #842 Post-Mortem',
    category: 'DevOps & SRE',
    inputTranscript: `[00:02] Elena Rostova: Let's review Friday's 14-minute outage on the primary checkout cluster.
[00:20] Tom Bradley: Root cause was a split-brain condition caused by network flapping between us-east-1 and us-east-2.
[02:00] Tom Bradley: To prevent this permanently, I need to update the raft consensus quorum timeout from 200ms to 1200ms.
[02:30] Elena Rostova: Action item for Tom: Deploy the Raft consensus timeout update to staging by Wednesday, test with synthetic network partitions on Thursday, and promote to prod by Sunday night.
[03:00] Kavita Singh: I will audit the automated alert routing because PagerDuty took 4 minutes to wake the secondary on-call engineer. I will update the escalation matrix by Thursday noon.`,
    groundTruth: {
      keyDecision: 'Increase Raft quorum timeout from 200ms to 1200ms and overhaul secondary escalation matrix.',
      actionItems: [
        { assignee: 'Tom Bradley', task: 'Deploy Raft consensus timeout update to staging', deadline: 'Wednesday' },
        { assignee: 'Tom Bradley', task: 'Test synthetic network partitions in staging', deadline: 'Thursday' },
        { assignee: 'Tom Bradley', task: 'Promote Raft consensus change to production', deadline: 'Sunday night' },
        { assignee: 'Kavita Singh', task: 'Audit alert routing & update PagerDuty escalation matrix', deadline: 'Thursday noon' }
      ],
      piiToRedact: []
    }
  },
  {
    id: 'gd-003',
    caseName: 'Sprint Planning & Customer Support Sync',
    category: 'Product & Agile',
    inputTranscript: `[00:05] Rachel Adams: We have 3 critical customer tickets regarding PDF invoice export failures on Safari.
[00:40] Carlos Gomez: That is related to Safari's canvas blob rendering bug. I can create a patch using the server-side PDF generator fallback.
[01:15] Rachel Adams: Perfect. Carlos, commit the patch by tomorrow afternoon, and Lisa will run end-to-end regression tests before the Thursday release.
[01:50] Lisa Ray: Understood. I will prepare test fixtures for Safari 17.4 and Chrome 122 by Wednesday evening.`,
    groundTruth: {
      keyDecision: 'Adopt server-side PDF generator fallback for Safari invoice export issue.',
      actionItems: [
        { assignee: 'Carlos Gomez', task: 'Commit patch with server-side PDF fallback for Safari bug', deadline: 'Tomorrow afternoon' },
        { assignee: 'Lisa Ray', task: 'Prepare test fixtures and run E2E regression tests', deadline: 'Wednesday evening' }
      ],
      piiToRedact: []
    }
  }
];

/**
 * Alternate Domain Dataset: Corporate Tax & Financial Audit Reconciliation
 */
export const FINANCIAL_AUDIT_DATASET = [
  {
    id: 'tax-001',
    caseName: 'Corporate Tax & R&D Credit Variance Audit',
    category: 'Tax & Compliance',
    inputTranscript: `[00:05] Audit Partner: We are reviewing the $1.4M Section 174 R&D capitalization claim across 4 engineering entities.
[00:22] Tax Director: Entity Alpha claimed $320,000 for cloud computing infrastructure used exclusively for software development.
[01:15] Senior Auditor: Cloud hosting costs for software maintenance cannot be expensed under R&D; they must be amortized over 5 years. This creates an immediate variance of $180,000.
[02:00] Audit Partner: We require an amended adjustment schedule by Thursday 4 PM. Tax Director to prepare journal entries for Entity Alpha.
[02:40] Tax Director: Agreed. I will post the $180,000 reclassification before Friday close of business.`,
    groundTruth: {
      keyDecision: 'Reclassify $180,000 cloud maintenance costs from immediate R&D expense to 5-year amortization schedule.',
      actionItems: [
        { assignee: 'Tax Director', task: 'Prepare amended adjustment schedule and journal entries for Entity Alpha', deadline: 'Thursday 4 PM' },
        { assignee: 'Tax Director', task: 'Post $180,000 reclassification adjustment before Friday close of business', deadline: 'Friday close of business' }
      ],
      piiToRedact: []
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
