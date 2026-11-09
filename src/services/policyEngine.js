/**
 * KEAOS GENERALIZED POLICY & GUARDRAIL EVALUATION ENGINE
 * 
 * Evaluates inbound and outbound data boundaries for Agents, External Services,
 * Tools, and Output nodes against institutional policies and guardrails.
 * 
 * STRICT INVARIANTS:
 * - Rule 10: Generalized evaluation across all user use cases (zero hardcoding).
 * - Bi-directional: Evaluates both Pre-dispatch Inbound and Post-dispatch Outbound.
 * - Non-destructive: Seamlessly sanitizes, transforms, or flags violations with full telemetry.
 */

/**
 * Universal PII & Credential Sanitizer
 */
export function sanitizeSensitiveText(text, options = {}) {
  if (typeof text !== 'string') return { sanitized: text, count: 0 };

  let sanitized = text;
  let count = 0;

  // 1. Currency & Financial figures
  if (options.redactSalaries !== false) {
    const salaryRegex = /\$[0-9,]+(\.[0-9]{2})?/g;
    const salaryMatches = sanitized.match(salaryRegex);
    if (salaryMatches) {
      count += salaryMatches.length;
      sanitized = sanitized.replace(salaryRegex, '[CONFIDENTIAL_FINANCIAL_REDACTED]');
    }
  }

  // 2. Social Security Numbers (SSN)
  if (options.maskSsn !== false) {
    const ssnRegex = /\b\d{3}-\d{2}-\d{4}\b/g;
    const ssnMatches = sanitized.match(ssnRegex);
    if (ssnMatches) {
      count += ssnMatches.length;
      sanitized = sanitized.replace(ssnRegex, '[CONFIDENTIAL_SSN_REDACTED]');
    }
  }

  // 3. Direct Phone Numbers
  if (options.maskPhones !== false) {
    const phoneRegex = /\b(?:\+?1[-.\s]?)?\(?[2-9]\d{2}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
    const phoneMatches = sanitized.match(phoneRegex);
    if (phoneMatches) {
      count += phoneMatches.length;
      sanitized = sanitized.replace(phoneRegex, '[CONFIDENTIAL_PHONE_REDACTED]');
    }
  }

  // 4. Email Addresses
  if (options.maskEmails) {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emailMatches = sanitized.match(emailRegex);
    if (emailMatches) {
      count += emailMatches.length;
      sanitized = sanitized.replace(emailRegex, '[CONFIDENTIAL_EMAIL_REDACTED]');
    }
  }

  // 5. Auth Tokens, Passwords & API Keys
  if (options.maskCredentials !== false) {
    const credRegex = /(?:api[_-]?key|bearer\s+[a-zA-Z0-9_\-\.]+|password|secret|auth_token)\s*[:=]\s*["']?([a-zA-Z0-9_\-\.]{8,})["']?/gi;
    const credMatches = sanitized.match(credRegex);
    if (credMatches) {
      count += credMatches.length;
      sanitized = sanitized.replace(credRegex, '$1: [CONFIDENTIAL_CREDENTIAL_REDACTED]');
    }
  }

  // 6. Enterprise NDA & Trade Secrets
  if (options.enforceStrictTerms) {
    const patentCodeRegex = /\b(Project\s+[A-Z][a-z0-9_-]+|Codename:\s*\S+|Patent\s*#?\s*[A-Z0-9-]+)\b/gi;
    const ndaMatches = sanitized.match(patentCodeRegex);
    if (ndaMatches) {
      count += ndaMatches.length;
      sanitized = sanitized.replace(patentCodeRegex, '[CONFIDENTIAL_TRADE_SECRET_REDACTED]');
    }
  }

  // 7. Custom Regex Patterns configured by operator
  if (options.customRegex && typeof options.customRegex === 'string') {
    try {
      const customRe = new RegExp(options.customRegex, 'gi');
      const customMatches = sanitized.match(customRe);
      if (customMatches) {
        count += customMatches.length;
        sanitized = sanitized.replace(customRe, '[CONFIDENTIAL_CUSTOM_REDACTED]');
      }
    } catch (e) {
      console.warn('Invalid custom policy regex:', options.customRegex, e);
    }
  }

  return { sanitized, count };
}

/**
 * Evaluates an arbitrary payload against a collection of active policies
 * 
 * @param {Object} params
 * @param {any} params.payload - Input or output payload (string, object, or text)
 * @param {Array} params.policies - Active policy pillar objects
 * @param {'inbound' | 'outbound'} params.direction - Execution direction
 * @param {Object} params.nodeData - Target node configuration
 * @returns {Object} { passed, sanitizedPayload, redactionsCount, violations, actionTaken }
 */
export function evaluateGuardrails({
  payload,
  policies = [],
  direction = 'inbound',
  nodeData = {}
}) {
  // Check if evaluation in this direction is enabled
  const isEnforced = direction === 'inbound'
    ? nodeData.enforceOnInput !== false
    : nodeData.enforceOnOutput !== false;

  if (!isEnforced || !policies || policies.length === 0) {
    return {
      passed: true,
      sanitizedPayload: payload,
      redactionsCount: 0,
      violations: [],
      actionTaken: 'passed'
    };
  }

  let isString = typeof payload === 'string';
  let stringContent = isString
    ? payload
    : (payload && typeof payload === 'object' ? JSON.stringify(payload) : String(payload || ''));

  let totalRedactions = 0;
  let violations = [];
  let currentText = stringContent;

  for (const policy of policies) {
    const pConfig = policy.config || {};
    const pName = policy.name || policy.displayName || 'Security Policy';
    const pId = policy.id || 'policy';

    // 1. PII & Confidentiality Redaction
    const isPiiPolicy = pId.includes('pii') || pName.toLowerCase().includes('pii') || pConfig.redactSalaries;
    const isNdaPolicy = pId.includes('nda') || pName.toLowerCase().includes('nda') || pConfig.enforceStrictTerms;

    if (isPiiPolicy || isNdaPolicy || pConfig.maskEmails || pConfig.customRegex) {
      const { sanitized, count } = sanitizeSensitiveText(currentText, {
        redactSalaries: pConfig.redactSalaries ?? true,
        maskSsn: pConfig.maskSsn ?? true,
        maskPhones: pConfig.maskPhones ?? true,
        maskEmails: pConfig.maskEmails ?? true,
        maskCredentials: true,
        enforceStrictTerms: isNdaPolicy || pConfig.enforceStrictTerms,
        customRegex: pConfig.customRegex || pConfig.regexRules
      });

      if (count > 0) {
        totalRedactions += count;
        currentText = sanitized;
      }
    }

    // 2. Denied Keywords / Forbidden Topic Verification
    const blockedKeywords = pConfig.blockedKeywords || pConfig.deniedTopics;
    if (Array.isArray(blockedKeywords) && blockedKeywords.length > 0) {
      for (const kw of blockedKeywords) {
        if (!kw || typeof kw !== 'string') continue;
        const re = new RegExp(`\\b${kw.trim()}\\b`, 'i');
        if (re.test(currentText)) {
          violations.push({
            policyId: pId,
            policyName: pName,
            rule: `Blocked keyword: "${kw}"`,
            message: `Payload contains prohibited keyword "${kw}" restricted by ${pName}.`,
            direction
          });
        }
      }
    }

    // 3. Schema & Structural Output Constraints (for Outbound)
    if (direction === 'outbound' && pConfig.requiredKeys && Array.isArray(pConfig.requiredKeys)) {
      try {
        const parsed = JSON.parse(currentText);
        for (const reqKey of pConfig.requiredKeys) {
          if (parsed[reqKey] === undefined) {
            violations.push({
              policyId: pId,
              policyName: pName,
              rule: `Required JSON key: "${reqKey}"`,
              message: `Output is missing mandatory field "${reqKey}" enforced by ${pName}.`,
              direction
            });
          }
        }
      } catch {
        violations.push({
          policyId: pId,
          policyName: pName,
          rule: 'Valid JSON Object',
          message: `Output was expected to be valid JSON with required keys, but could not be parsed.`,
          direction
        });
      }
    }
  }

  // Determine final sanitized payload
  let sanitizedPayload = currentText;
  if (!isString) {
    try {
      sanitizedPayload = JSON.parse(currentText);
    } catch {
      sanitizedPayload = currentText;
    }
  }

  const hasViolations = violations.length > 0;
  const actionTaken = hasViolations ? 'blocked' : (totalRedactions > 0 ? 'sanitized' : 'passed');

  return {
    passed: !hasViolations,
    sanitizedPayload,
    redactionsCount: totalRedactions,
    violations,
    actionTaken
  };
}

/**
 * Resolves the active set of direct and/or inherited policies for any canvas node
 * 
 * @param {Object} params
 * @param {Object} params.node - Target node (e.g., remoteAgentNode or agentCore)
 * @param {Array} params.allNodes - All nodes on canvas
 * @param {Array} params.allEdges - All edges on canvas
 * @returns {Array} Array of resolved policy pillar data objects
 */
export function resolveActivePoliciesForNode({
  node,
  allNodes = [],
  allEdges = []
}) {
  if (!node) return [];

  const nodeData = node.data || {};
  const applyDirect = nodeData.applyDirectPolicies !== false;
  const inheritFromAgent = nodeData.inheritAgentPolicies !== false;

  const nodeLookup = Object.fromEntries(allNodes.map(n => [n.id, n]));
  const resolvedPolicies = [];
  const seenIds = new Set();

  // 1. Direct Policies (Wired directly to this node's policy-in socket)
  if (applyDirect) {
    const incomingPolicyEdges = allEdges.filter(e => 
      e.target === node.id && (e.targetHandle === 'policy-in' || e.targetHandle === 'policies-in')
    );

    for (const edge of incomingPolicyEdges) {
      const srcNode = nodeLookup[edge.source];
      if (srcNode && srcNode.data?.pillarType === 'policies' && !srcNode.data?.isDeactivated) {
        if (!seenIds.has(srcNode.id)) {
          seenIds.add(srcNode.id);
          resolvedPolicies.push({
            id: srcNode.id,
            name: srcNode.data.name || 'Direct Policy',
            description: srcNode.data.description || '',
            config: srcNode.data.config || {},
            customDirective: srcNode.data.customDirective || '',
            referenceDoc: srcNode.data.referenceDoc || null,
            isDirect: true
          });
        }
      }
    }
  }

  // 2. Inherited Policies (From connected Autonomous Agent Core)
  if (inheritFromAgent) {
    // Find connected agentCore nodes (either upstream, downstream, or via tools-in)
    const connectedAgentEdges = allEdges.filter(e => {
      const isSourceAgent = nodeLookup[e.source]?.type === 'agentCore';
      const isTargetAgent = nodeLookup[e.target]?.type === 'agentCore';
      return (e.source === node.id && isTargetAgent) || (e.target === node.id && isSourceAgent);
    });

    for (const edge of connectedAgentEdges) {
      const agentNodeId = nodeLookup[e => e.source === node.id ? edge.target : edge.source]?.id;
      const agentNode = nodeLookup[agentNodeId] || (nodeLookup[edge.source]?.type === 'agentCore' ? nodeLookup[edge.source] : nodeLookup[edge.target]);

      if (agentNode && agentNode.type === 'agentCore' && !agentNode.data?.isDeactivated) {
        // Collect policies attached to this agent
        const agentPolicyEdges = allEdges.filter(pe => 
          pe.target === agentNode.id && (pe.targetHandle === 'policy-in' || pe.targetHandle === 'policies-in')
        );

        for (const pe of agentPolicyEdges) {
          const policyPillar = nodeLookup[pe.source];
          if (policyPillar && policyPillar.data?.pillarType === 'policies' && !policyPillar.data?.isDeactivated) {
            if (!seenIds.has(policyPillar.id)) {
              seenIds.add(policyPillar.id);
              resolvedPolicies.push({
                id: policyPillar.id,
                name: `${policyPillar.data.name || 'Enterprise Policy'} (Inherited from ${agentNode.data?.name || 'Agent Core'})`,
                description: policyPillar.data.description || '',
                config: policyPillar.data.config || {},
                customDirective: policyPillar.data.customDirective || '',
                referenceDoc: policyPillar.data.referenceDoc || null,
                isInherited: true,
                parentAgentName: agentNode.data?.name || 'Agent Core'
              });
            }
          }
        }
      }
    }
  }

  return resolvedPolicies;
}

