/**
 * Ingestion Schema Mapping Engine for Enterprise Tax Reconciliation
 * 
 * Implements the 2-Stage Schema Mapping Architecture:
 * 1. Deterministic Token, Alias, and Content Regex Matcher (Accuracy >= 90% -> Auto-mapped with 0 tokens)
 * 2. LLM Semantic Inference Fallback for obscure / unmapped columns (< 90%)
 */

import { executeUniversalChat } from './llmService.js';

// Canonical schema definition for Indirect Tax Reconciliation
export const CANONICAL_TAX_FIELDS = [
  {
    key: 'gstin',
    label: 'Supplier / Vendor GSTIN',
    description: '15-digit alphanumeric Goods & Services Tax Identification Number',
    aliases: [
      'gstin of supplier', 'vendor gstin', 'supplier gstin', 'gstin', 'gst no', 
      'gstin_no', 'tin', 'supplier_tax_id', 'ctin', 'c_tin', 'party gstin'
    ],
    pattern: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i
  },
  {
    key: 'supplier_name',
    label: 'Trade / Legal Name',
    description: 'Supplier or Vendor legal/trade name',
    aliases: [
      'trade/legal name', 'vendor name', 'supplier name', 'party name', 
      'trade name', 'legal name', 'account name', 'name', 'cname'
    ]
  },
  {
    key: 'invoice_number',
    label: 'Invoice / Voucher Number',
    description: 'Alphanumeric bill or voucher reference',
    aliases: [
      'invoice number', 'voucher number', 'bill no', 'inv no', 'bill number', 
      'doc no', 'document number', 'reference no', 'vch no', 'inum', 'belnr'
    ]
  },
  {
    key: 'invoice_date',
    label: 'Invoice / Doc Date',
    description: 'Date of invoice issue or ERP booking',
    aliases: [
      'invoice date', 'doc date', 'posting date', 'bill date', 'document date', 
      'voucher date', 'idt', 'bldat', 'budat'
    ],
    isDate: true
  },
  {
    key: 'taxable_value',
    label: 'Taxable / Base Value',
    description: 'Base assessable value subject to GST',
    aliases: [
      'taxable value', 'base amount', 'assessable value', 'taxable amount', 
      'net amount', 'base val', 'txval', 'net_val'
    ],
    isNumeric: true
  },
  {
    key: 'igst',
    label: 'Integrated Tax (IGST)',
    description: 'Interstate Integrated GST amount',
    aliases: [
      'integrated tax', 'igst amount', 'igst', 'integrated tax (igst)', 
      'iamt', 'i_tax'
    ],
    isNumeric: true
  },
  {
    key: 'cgst',
    label: 'Central Tax (CGST)',
    description: 'Intrastate Central GST amount',
    aliases: [
      'central tax', 'cgst amount', 'cgst', 'central tax (cgst)', 
      'camt', 'c_tax'
    ],
    isNumeric: true
  },
  {
    key: 'sgst',
    label: 'State / UT Tax (SGST)',
    description: 'Intrastate State / Union Territory GST amount',
    aliases: [
      'state/ut tax', 'sgst amount', 'sgst', 'state/ut tax (sgst)', 
      'utgst', 'samt', 's_tax'
    ],
    isNumeric: true
  },
  {
    key: 'cess',
    label: 'Compensation Cess',
    description: 'Additional GST compensation cess amount',
    aliases: ['cess', 'cess amount', 'compensation cess', 'csamt'],
    isNumeric: true
  },
  {
    key: 'total_value',
    label: 'Gross / Invoice Total Value',
    description: 'Total invoice gross value including all tax heads',
    aliases: [
      'invoice value', 'total invoice amount', 'total value', 'gross amount', 
      'total amount', 'bill value', 'val', 'wrbtr'
    ],
    isNumeric: true
  },
  {
    key: 'itc_availability',
    label: 'ITC Eligibility',
    description: 'Input Tax Credit eligibility flag or reason (Yes / No)',
    aliases: [
      'itc availability', 'itc eligible', 'itc eligibility', 'eligible itc', 
      'itc status', 'itc'
    ]
  }
];

/**
 * Standard Levenshtein distance algorithm for fuzzy string matching
 */
function levenshteinDistance(s1 = '', s2 = '') {
  const a = s1.toLowerCase().trim();
  const b = s2.toLowerCase().trim();
  const matrix = [];

  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculate normalized string similarity score between 0.0 and 1.0
 */
function stringSimilarity(s1 = '', s2 = '') {
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1.0;
  const dist = levenshteinDistance(s1, s2);
  return Math.max(0, 1.0 - dist / maxLen);
}

/**
 * Normalize raw header string by removing symbols, punctuation, and multiple spaces
 */
function cleanHeaderString(str = '') {
  return String(str)
    .toLowerCase()
    .replace(/[_\-\/\.\(\)\[\]:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Stage 1: Deterministic Schema Matching (>90% threshold)
 * Evaluates column names and sample row contents against canonical schema definitions.
 */
export function mapSchemaDeterministically(rawHeaders = [], sampleRows = [], threshold = 0.90) {
  const mapped = {};      // rawHeader -> { canonicalKey, confidence, method, score }
  const unmapped = [];    // rawHeaders that scored < threshold
  const assignedCanonical = new Set();

  rawHeaders.forEach((rawCol) => {
    const cleanRaw = cleanHeaderString(rawCol);
    let bestCanonical = null;
    let highestScore = 0;

    // Check sample values for regex heuristics
    const sampleVals = sampleRows.slice(0, 10).map(r => r[rawCol]).filter(v => v !== null && v !== undefined && v !== '');

    for (const field of CANONICAL_TAX_FIELDS) {
      if (assignedCanonical.has(field.key)) continue;

      let score = 0;

      // 1. Exact string match
      if (cleanRaw === field.key || cleanRaw === cleanHeaderString(field.label)) {
        score = 1.0;
      } else {
        // 2. Alias dictionary lookup
        for (const alias of field.aliases) {
          const cleanAlias = cleanHeaderString(alias);
          if (cleanRaw === cleanAlias) {
            score = 0.98;
            break;
          }
          if (cleanRaw.includes(cleanAlias) || cleanAlias.includes(cleanRaw)) {
            const ratio = Math.min(cleanRaw.length, cleanAlias.length) / Math.max(cleanRaw.length, cleanAlias.length);
            const subScore = 0.90 + ratio * 0.07;
            if (subScore > score) score = subScore;
          }
        }

        // 3. Fuzzy string similarity
        if (score < 0.90) {
          const sim = stringSimilarity(cleanRaw, cleanHeaderString(field.label));
          if (sim > score) score = sim;
        }
      }

      // 4. Content Pattern Heuristics
      if (sampleVals.length > 0) {
        if (field.pattern) {
          const matchesPattern = sampleVals.filter(v => field.pattern.test(String(v).trim())).length;
          const matchRatio = matchesPattern / sampleVals.length;
          if (matchRatio >= 0.70) {
            score = Math.max(score, 0.96); // Strong GSTIN pattern match
          }
        }

        if (field.isDate) {
          const matchesDate = sampleVals.filter(v => {
            const d = new Date(v);
            return !isNaN(d.getTime()) || /^\d{1,4}[-\/\.]\d{1,2}[-\/\.]\d{1,4}/.test(String(v));
          }).length;
          if (matchesDate / sampleVals.length >= 0.70 && (cleanRaw.includes('date') || cleanRaw.includes('dt'))) {
            score = Math.max(score, 0.95);
          }
        }

        if (field.isNumeric) {
          const matchesNum = sampleVals.filter(v => !isNaN(parseFloat(String(v).replace(/,/g, '')))).length;
          if (matchesNum / sampleVals.length >= 0.80 && score >= 0.75) {
            score = Math.min(1.0, score + 0.15);
          }
        }
      }

      if (score > highestScore) {
        highestScore = score;
        bestCanonical = field;
      }
    }

    if (bestCanonical && highestScore >= threshold) {
      mapped[rawCol] = {
        canonicalKey: bestCanonical.key,
        canonicalLabel: bestCanonical.label,
        confidence: Math.round(highestScore * 100) / 100,
        method: 'deterministic',
        score: highestScore
      };
      assignedCanonical.add(bestCanonical.key);
    } else {
      unmapped.push({
        rawCol,
        highestScore: Math.round(highestScore * 100) / 100,
        candidateKey: bestCanonical?.key || null
      });
    }
  });

  return {
    mapped,
    unmapped,
    assignedCanonical: Array.from(assignedCanonical)
  };
}

/**
 * Stage 2: AI Schema Mapper Fallback (<90% threshold)
 * Calls LLM to semantically infer remaining obscure or custom ERP headers.
 */
export async function mapSchemaWithAI({
  unmappedCols = [],
  sampleRows = [],
  alreadyMapped = {},
  provider = 'google',
  modelId = 'gemini-2.0-flash'
}) {
  if (unmappedCols.length === 0) return { aiMapped: {}, finalMapping: alreadyMapped };

  const availableCanonical = CANONICAL_TAX_FIELDS.filter(f => {
    return !Object.values(alreadyMapped).some(m => m.canonicalKey === f.key);
  });

  if (availableCanonical.length === 0) {
    return { aiMapped: {}, finalMapping: alreadyMapped };
  }

  const promptColumns = unmappedCols.map(colObj => {
    const colName = typeof colObj === 'string' ? colObj : colObj.rawCol;
    const samples = sampleRows.slice(0, 3).map(r => r[colName]);
    return `Column: "${colName}", Sample Values: ${JSON.stringify(samples)}`;
  }).join('\n');

  const promptCanonical = availableCanonical.map(f => `- ${f.key} (${f.label}): ${f.description}`).join('\n');

  const systemPrompt = `You are an expert enterprise indirect tax ERP schema mapper.
Map the provided unmapped source columns to the most appropriate canonical tax field from the allowed list.
If a column does not correspond to any tax field, map it to null.

ALLOWED CANONICAL FIELDS:
${promptCanonical}

Respond ONLY with a valid JSON object in this exact format:
{
  "mappings": [
    {
      "sourceColumn": "column_name",
      "canonicalKey": "key_or_null",
      "confidence": 0.85,
      "reasoning": "brief explanation"
    }
  ]
}`;

  try {
    const response = await executeUniversalChat({
      provider,
      modelId,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Please map these unmapped columns:\n${promptColumns}` }
      ],
      temperature: 0.1
    });

    const text = response.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const resultJson = jsonMatch ? JSON.parse(jsonMatch[0]) : { mappings: [] };

    const aiMapped = {};
    const finalMapping = { ...alreadyMapped };

    (resultJson.mappings || []).forEach(m => {
      if (m.canonicalKey && m.canonicalKey !== 'null' && availableCanonical.some(f => f.key === m.canonicalKey)) {
        const canonicalField = availableCanonical.find(f => f.key === m.canonicalKey);
        const record = {
          canonicalKey: m.canonicalKey,
          canonicalLabel: canonicalField?.label || m.canonicalKey,
          confidence: m.confidence || 0.88,
          method: 'ai_llm',
          reasoning: m.reasoning || 'Inferred semantically via LLM'
        };
        aiMapped[m.sourceColumn] = record;
        finalMapping[m.sourceColumn] = record;
      }
    });

    return { aiMapped, finalMapping };
  } catch (err) {
    console.warn('AI Schema Mapping failed, falling back to deterministic mappings only:', err);
    return { aiMapped: {}, finalMapping: alreadyMapped, error: err.message };
  }
}

/**
 * End-to-end 2-Stage Schema Ingestion Pipeline
 */
export async function executeTwoStageSchemaMapping({
  rawHeaders = [],
  sampleRows = [],
  threshold = 0.90,
  provider = 'google',
  modelId = 'gemini-2.0-flash'
}) {
  // Stage 1: Deterministic matching
  const detResult = mapSchemaDeterministically(rawHeaders, sampleRows, threshold);

  // If all mapped or no unmapped columns, return immediately
  if (detResult.unmapped.length === 0) {
    return {
      mapping: detResult.mapped,
      deterministicCount: Object.keys(detResult.mapped).length,
      aiCount: 0,
      totalHeaders: rawHeaders.length
    };
  }

  // Stage 2: AI inference for remaining unmapped columns
  const aiResult = await mapSchemaWithAI({
    unmappedCols: detResult.unmapped,
    sampleRows,
    alreadyMapped: detResult.mapped,
    provider,
    modelId
  });

  return {
    mapping: aiResult.finalMapping,
    deterministicCount: Object.keys(detResult.mapped).length,
    aiCount: Object.keys(aiResult.aiMapped).length,
    totalHeaders: rawHeaders.length,
    detDetails: detResult,
    aiDetails: aiResult.aiMapped
  };
}

/**
 * Normalize raw rows using the established column mapping into standard canonical records
 */
export function normalizeRowsToCanonical(rawRows = [], columnMapping = {}) {
  const reverseMap = {}; // canonicalKey -> rawColumnName
  Object.entries(columnMapping).forEach(([rawCol, meta]) => {
    if (meta?.canonicalKey) {
      reverseMap[meta.canonicalKey] = rawCol;
    }
  });

  return rawRows.map((rawRow, index) => {
    const getVal = (key) => {
      const rawCol = reverseMap[key];
      return rawCol !== undefined ? rawRow[rawCol] : undefined;
    };

    const parseNum = (val) => {
      if (val === undefined || val === null || val === '') return 0;
      const clean = String(val).replace(/,/g, '').trim();
      const num = parseFloat(clean);
      return isNaN(num) ? 0 : num;
    };

    const parseDateStr = (val) => {
      if (!val) return '';
      const s = String(val).trim();
      // Handle standard ISO or YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
      // Handle DD-MM-YYYY or DD/MM/YYYY
      const parts = s.split(/[-\/\.]/);
      if (parts.length === 3) {
        if (parts[0].length === 4) { // YYYY-MM-DD
          return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        }
        if (parts[2].length === 4) { // DD-MM-YYYY
          return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }
      const d = new Date(s);
      if (!isNaN(d.getTime())) {
        return d.toISOString().split('T')[0];
      }
      return s;
    };

    return {
      _sourceIndex: index,
      _raw: rawRow,
      gstin: String(getVal('gstin') || '').toUpperCase().trim(),
      supplier_name: String(getVal('supplier_name') || '').trim(),
      invoice_number: String(getVal('invoice_number') || '').trim(),
      invoice_date: parseDateStr(getVal('invoice_date')),
      taxable_value: parseNum(getVal('taxable_value')),
      igst: parseNum(getVal('igst')),
      cgst: parseNum(getVal('cgst')),
      sgst: parseNum(getVal('sgst')),
      cess: parseNum(getVal('cess')),
      total_value: parseNum(getVal('total_value')),
      itc_availability: String(getVal('itc_availability') || 'Yes').trim()
    };
  });
}
