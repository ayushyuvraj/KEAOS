// KEAOS Pure Evaluation Engine for Conditional Router Nodes
// Zero external dependencies, fast, deterministic evaluation

/**
 * Safely extracts a property from an object using dot notation (e.g., 'metrics.riskScore' or 'status')
 */
function getNestedValue(obj, path) {
  if (!obj || typeof obj !== 'object' || !path) return obj;
  const parts = String(path).trim().split('.');
  let curr = obj;
  for (const part of parts) {
    if (curr == null) return undefined;
    curr = curr[part];
  }
  return curr;
}

/**
 * Evaluates a condition rule against an incoming payload
 * @param {Object} rule - { targetField, operator, comparisonValue }
 * @param {any} payload - Incoming data payload (JSON object, string, number)
 * @returns {Object} - { branch: 'true-out' | 'false-out', matched: boolean, actualValue: any, reason: string }
 */
export function evaluateConditionRule(rule = {}, payload = {}) {
  const { targetField, operator = '==', comparisonValue = '' } = rule;

  let actualValue;
  if (payload && typeof payload === 'object') {
    actualValue = targetField ? getNestedValue(payload, targetField) : payload;
  } else {
    actualValue = payload;
  }

  // Handle case where actualValue was not found at targetField
  if (actualValue === undefined && payload && typeof payload === 'object' && targetField) {
    // If payload has a 'data' wrapper, check inside it
    if (payload.data && typeof payload.data === 'object') {
      actualValue = getNestedValue(payload.data, targetField);
    }
  }

  let matched = false;

  // Numeric comparison check
  const numActual = Number(actualValue);
  const numComp = Number(comparisonValue);
  const isNumeric = !isNaN(numActual) && !isNaN(numComp) && comparisonValue !== '' && comparisonValue !== null && actualValue !== '' && actualValue !== null;

  const strActual = String(actualValue ?? '').trim().toLowerCase();
  const strComp = String(comparisonValue ?? '').trim().toLowerCase();

  switch (operator) {
    case '>':
      matched = isNumeric ? numActual > numComp : strActual > strComp;
      break;
    case '>=':
      matched = isNumeric ? numActual >= numComp : strActual >= strComp;
      break;
    case '<':
      matched = isNumeric ? numActual < numComp : strActual < strComp;
      break;
    case '<=':
      matched = isNumeric ? numActual <= numComp : strActual <= strComp;
      break;
    case '==':
    case '=':
      matched = isNumeric ? numActual === numComp : strActual === strComp;
      break;
    case '!=':
      matched = isNumeric ? numActual !== numComp : strActual !== strComp;
      break;
    case 'contains':
      matched = strActual.includes(strComp);
      break;
    case 'not_contains':
      matched = !strActual.includes(strComp);
      break;
    case 'is_empty':
      matched = actualValue == null || actualValue === '' || (Array.isArray(actualValue) && actualValue.length === 0);
      break;
    case 'is_not_empty':
      matched = actualValue != null && actualValue !== '' && (!Array.isArray(actualValue) || actualValue.length > 0);
      break;
    default:
      matched = Boolean(actualValue);
  }

  const activeBranch = matched ? 'true-out' : 'false-out';
  const reason = matched 
    ? `Rule matched: "${targetField || 'value'}" (${actualValue}) ${operator} "${comparisonValue}"`
    : `Rule fell back: "${targetField || 'value'}" (${actualValue}) does not satisfy ${operator} "${comparisonValue}"`;

  return {
    branch: activeBranch,
    matched,
    actualValue,
    reason
  };
}

/**
 * Test helper for Inspector live simulator
 */
export function testRuleWithSample(rule, sampleJsonText) {
  try {
    let parsed;
    const trimmed = String(sampleJsonText || '').trim();
    if (!trimmed) {
      return { success: false, error: 'Empty test payload' };
    }
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      parsed = JSON.parse(trimmed);
    } else {
      parsed = trimmed;
    }
    const result = evaluateConditionRule(rule, parsed);
    return { success: true, ...result };
  } catch (err) {
    return { success: false, error: `Invalid JSON: ${err.message}` };
  }
}
