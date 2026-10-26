/**
 * Cascading Multi-Tier Indirect Tax Reconciliation Engine
 * 
 * Implements:
 * 1. Exact Match Engine (Exact GSTIN, Clean Invoice No, Date, Amount)
 * 2. Near Match Engine (Normalization: stripping punctuation, leading zeroes, spaces)
 * 3. Tolerance Match Engine (Date window e.g. ±30 days, Amount tolerance e.g. ±₹1,000)
 * 4. Split Match Engine (Combinatorial 1:N and N:1 reconciliation for milestone & line-item billing)
 * 5. Ambiguity & Mismatch Classifier (Missing in PR vs Missing in GSTR-2B)
 */

/**
 * Robust invoice number normalization:
 * - Strips leading zeroes: "000420" -> "420"
 * - Removes punctuation & delimiters: "/", "-", "_", ".", spaces
 * - Lowercases for case-insensitive matching
 */
export function normalizeInvoiceNumber(invNo = '') {
  if (!invNo) return '';
  return String(invNo)
    .toLowerCase()
    .replace(/^0+/, '')                         // Strip global leading zeroes
    .replace(/([^0-9a-z]|\D)0+([0-9]+)/gi, '$1$2') // Strip leading zeroes after separators or letters: LTI-000891 -> LTI-891
    .replace(/[^a-z0-9]/g, '')                 // Remove all punctuation & delimiters
    .replace(/^0+/, '')                         // Strip any remaining leading zeroes
    .trim();
}

/**
 * Calculates absolute date difference in days between two ISO date strings (YYYY-MM-DD)
 */
export function calculateDateDifferenceInDays(d1Str, d2Str) {
  if (!d1Str || !d2Str) return 99999;
  const d1 = new Date(d1Str);
  const d2 = new Date(d2Str);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 99999;
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Rounds a number to standard 2 decimal places to prevent floating-point inaccuracies
 */
function round2(num) {
  return Math.round((Number(num) || 0) * 100) / 100;
}

/**
 * Primary Cascading Reconciliation Engine
 * 
 * @param {Array} gstrRows - Canonical GSTR-2B rows
 * @param {Array} prRows - Canonical Purchase Register rows
 * @param {Object} options - Tolerances and thresholds
 * @returns {Object} Full reconciliation results with segregated match buckets and summary metrics
 */
export function runCascadingReconciliation(gstrRows = [], prRows = [], options = {}) {
  const {
    dateToleranceDays = 30,
    amountTolerance = 1000.0,
    allowSplitMatching = true
  } = options;

  // Track matched indices to prevent duplicate matching
  const matchedGstrIndices = new Set();
  const matchedPrIndices = new Set();

  // Buckets
  const exactMatches = [];
  const nearMatches = [];
  const toleranceMatches = [];
  const splitMatches = []; // 1:N and N:1 candidates
  const ambiguousMatches = [];

  // =========================================================================
  // TIER 1: EXACT MATCH ENGINE
  // Exact GSTIN, exact invoice number, exact date, exact total value (within ₹0.05 rounding)
  // =========================================================================
  for (let gIdx = 0; gIdx < gstrRows.length; gIdx++) {
    const gRow = gstrRows[gIdx];
    const gGstin = (gRow.gstin || '').toUpperCase().trim();
    const gInv = (gRow.invoice_number || '').trim();
    const gDate = gRow.invoice_date;
    const gTotal = round2(gRow.total_value);

    for (let pIdx = 0; pIdx < prRows.length; pIdx++) {
      if (matchedPrIndices.has(pIdx)) continue;
      const pRow = prRows[pIdx];
      const pGstin = (pRow.gstin || '').toUpperCase().trim();
      const pInv = (pRow.invoice_number || '').trim();
      const pDate = pRow.invoice_date;
      const pTotal = round2(pRow.total_value);

      if (
        gGstin === pGstin &&
        gInv.toLowerCase() === pInv.toLowerCase() &&
        gDate === pDate &&
        Math.abs(gTotal - pTotal) <= 0.05
      ) {
        matchedGstrIndices.add(gIdx);
        matchedPrIndices.add(pIdx);

        exactMatches.push({
          matchType: 'EXACT_MATCH',
          confidence: 1.0,
          tier: 1,
          gstrRecord: gRow,
          prRecord: pRow,
          variance: {
            dateDiffDays: 0,
            amountDelta: 0.0,
            taxDelta: 0.0
          },
          reconciledItc: round2(gRow.igst + gRow.cgst + gRow.sgst + gRow.cess),
          notes: 'Exact match on GSTIN, Invoice Number, Date, and Amount.'
        });
        break;
      }
    }
  }

  // =========================================================================
  // TIER 2: NEAR MATCH ENGINE (COLUMN NORMALIZATION)
  // Exact GSTIN, normalized invoice number (stripping symbols & leading zeros),
  // exact total value, and date difference <= 3 days.
  // =========================================================================
  for (let gIdx = 0; gIdx < gstrRows.length; gIdx++) {
    if (matchedGstrIndices.has(gIdx)) continue;
    const gRow = gstrRows[gIdx];
    const gGstin = (gRow.gstin || '').toUpperCase().trim();
    const gNormInv = normalizeInvoiceNumber(gRow.invoice_number);
    const gTotal = round2(gRow.total_value);

    for (let pIdx = 0; pIdx < prRows.length; pIdx++) {
      if (matchedPrIndices.has(pIdx)) continue;
      const pRow = prRows[pIdx];
      const pGstin = (pRow.gstin || '').toUpperCase().trim();
      const pNormInv = normalizeInvoiceNumber(pRow.invoice_number);
      const pTotal = round2(pRow.total_value);
      const dateDiff = calculateDateDifferenceInDays(gRow.invoice_date, pRow.invoice_date);

      if (
        gGstin === pGstin &&
        gNormInv === pNormInv &&
        gNormInv.length > 0 &&
        Math.abs(gTotal - pTotal) <= 0.05 &&
        dateDiff <= 3
      ) {
        matchedGstrIndices.add(gIdx);
        matchedPrIndices.add(pIdx);

        nearMatches.push({
          matchType: 'NEAR_MATCH',
          confidence: 0.95,
          tier: 2,
          gstrRecord: gRow,
          prRecord: pRow,
          variance: {
            dateDiffDays: dateDiff,
            amountDelta: 0.0,
            originalGstrInv: gRow.invoice_number,
            originalPrInv: pRow.invoice_number,
            normalizedInv: gNormInv
          },
          reconciledItc: round2(gRow.igst + gRow.cgst + gRow.sgst + gRow.cess),
          notes: `Normalized invoice match ("${gRow.invoice_number}" ↔ "${pRow.invoice_number}"). Date diff: ${dateDiff}d.`
        });
        break;
      }
    }
  }

  // =========================================================================
  // TIER 3: TOLERANCE MATCH ENGINE
  // Exact GSTIN, (exact or normalized invoice),
  // Date tolerance within options.dateToleranceDays (e.g. 30 days),
  // Amount tolerance within options.amountTolerance (e.g. ₹1,000).
  // =========================================================================
  for (let gIdx = 0; gIdx < gstrRows.length; gIdx++) {
    if (matchedGstrIndices.has(gIdx)) continue;
    const gRow = gstrRows[gIdx];
    const gGstin = (gRow.gstin || '').toUpperCase().trim();
    const gNormInv = normalizeInvoiceNumber(gRow.invoice_number);
    const gTotal = round2(gRow.total_value);

    let bestMatch = null;
    let lowestPenalty = Infinity;

    for (let pIdx = 0; pIdx < prRows.length; pIdx++) {
      if (matchedPrIndices.has(pIdx)) continue;
      const pRow = prRows[pIdx];
      const pGstin = (pRow.gstin || '').toUpperCase().trim();
      const pNormInv = normalizeInvoiceNumber(pRow.invoice_number);
      const pTotal = round2(pRow.total_value);

      if (gGstin !== pGstin) continue;

      const dateDiff = calculateDateDifferenceInDays(gRow.invoice_date, pRow.invoice_date);
      const amountDiff = round2(Math.abs(gTotal - pTotal));

      const isInvMatch = (gNormInv === pNormInv && gNormInv.length > 0);

      // Check if within configured tolerances
      if (isInvMatch && dateDiff <= dateToleranceDays && amountDiff <= amountTolerance) {
        // Combined penalty score
        const penalty = (dateDiff / dateToleranceDays) * 50 + (amountDiff / amountTolerance) * 50;
        if (penalty < lowestPenalty) {
          lowestPenalty = penalty;
          bestMatch = { pIdx, pRow, dateDiff, amountDiff };
        }
      }
    }

    if (bestMatch) {
      matchedGstrIndices.add(gIdx);
      matchedPrIndices.add(bestMatch.pIdx);

      const amountDeltaSigned = round2(bestMatch.pRow.total_value - gRow.total_value);

      toleranceMatches.push({
        matchType: 'TOLERANCE_MATCH',
        confidence: 0.88,
        tier: 3,
        gstrRecord: gRow,
        prRecord: bestMatch.pRow,
        variance: {
          dateDiffDays: bestMatch.dateDiff,
          amountDelta: amountDeltaSigned,
          absoluteAmountDelta: bestMatch.amountDiff,
          withinDaysLimit: dateToleranceDays,
          withinAmountLimit: amountTolerance
        },
        reconciledItc: round2(gRow.igst + gRow.cgst + gRow.sgst + gRow.cess),
        notes: `Tolerance match. Date lag: ${bestMatch.dateDiff}d (max ${dateToleranceDays}d). Amount delta: ₹${amountDeltaSigned} (max ₹${amountTolerance}).`
      });
    }
  }

  // =========================================================================
  // TIER 4: SPLIT / MULTI-ROW MATCH ENGINE (1:N and N:1)
  // Detects when:
  // - 1 GSTR-2B invoice corresponds to N PR rows (e.g. line-item split bills)
  // - N GSTR-2B invoices correspond to 1 PR row (e.g. multiple milestone bills)
  // =========================================================================
  if (allowSplitMatching) {
    // 4A: One GSTR-2B row ↔ Multiple PR rows (1:N)
    for (let gIdx = 0; gIdx < gstrRows.length; gIdx++) {
      if (matchedGstrIndices.has(gIdx)) continue;
      const gRow = gstrRows[gIdx];
      const gGstin = (gRow.gstin || '').toUpperCase().trim();
      const gTotal = round2(gRow.total_value);

      // Find all unmatched PR rows with the same GSTIN
      const candidatePrIndices = [];
      for (let pIdx = 0; pIdx < prRows.length; pIdx++) {
        if (matchedPrIndices.has(pIdx)) continue;
        const pRow = prRows[pIdx];
        if ((pRow.gstin || '').toUpperCase().trim() === gGstin) {
          const dateDiff = calculateDateDifferenceInDays(gRow.invoice_date, pRow.invoice_date);
          if (dateDiff <= dateToleranceDays + 15) {
            candidatePrIndices.push(pIdx);
          }
        }
      }

      // Check pairs of PR rows (2-item split)
      let foundSplit = false;
      for (let i = 0; i < candidatePrIndices.length; i++) {
        for (let j = i + 1; j < candidatePrIndices.length; j++) {
          const p1Idx = candidatePrIndices[i];
          const p2Idx = candidatePrIndices[j];
          const sumPr = round2(prRows[p1Idx].total_value + prRows[p2Idx].total_value);

          if (Math.abs(sumPr - gTotal) <= amountTolerance) {
            matchedGstrIndices.add(gIdx);
            matchedPrIndices.add(p1Idx);
            matchedPrIndices.add(p2Idx);

            splitMatches.push({
              matchType: 'SPLIT_1_TO_N',
              subType: 'One GSTR-2B row matches 2 PR line items',
              tier: 4,
              confidence: 0.85,
              requiresUserConfirmation: true,
              gstrRecord: gRow,
              prRecords: [prRows[p1Idx], prRows[p2Idx]],
              variance: {
                gstrTotal: gTotal,
                prSum: sumPr,
                amountDelta: round2(sumPr - gTotal)
              },
              reconciledItc: round2(gRow.igst + gRow.cgst + gRow.sgst + gRow.cess),
              notes: `1:N Split Match: GSTR invoice ₹${gTotal} matches PR items (${prRows[p1Idx].invoice_number || 'Line 1'} ₹${prRows[p1Idx].total_value} + ${prRows[p2Idx].invoice_number || 'Line 2'} ₹${prRows[p2Idx].total_value} = ₹${sumPr}).`
            });
            foundSplit = true;
            break;
          }
        }
        if (foundSplit) break;
      }
    }

    // 4B: Multiple GSTR-2B rows ↔ One PR row (N:1)
    for (let pIdx = 0; pIdx < prRows.length; pIdx++) {
      if (matchedPrIndices.has(pIdx)) continue;
      const pRow = prRows[pIdx];
      const pGstin = (pRow.gstin || '').toUpperCase().trim();
      const pTotal = round2(pRow.total_value);

      // Find all unmatched GSTR rows with the same GSTIN
      const candidateGstrIndices = [];
      for (let gIdx = 0; gIdx < gstrRows.length; gIdx++) {
        if (matchedGstrIndices.has(gIdx)) continue;
        const gRow = gstrRows[gIdx];
        if ((gRow.gstin || '').toUpperCase().trim() === pGstin) {
          const dateDiff = calculateDateDifferenceInDays(gRow.invoice_date, pRow.invoice_date);
          if (dateDiff <= dateToleranceDays + 15) {
            candidateGstrIndices.push(gIdx);
          }
        }
      }

      let foundSplit = false;
      for (let i = 0; i < candidateGstrIndices.length; i++) {
        for (let j = i + 1; j < candidateGstrIndices.length; j++) {
          const g1Idx = candidateGstrIndices[i];
          const g2Idx = candidateGstrIndices[j];
          const sumGstr = round2(gstrRows[g1Idx].total_value + gstrRows[g2Idx].total_value);

          if (Math.abs(sumGstr - pTotal) <= amountTolerance) {
            matchedPrIndices.add(pIdx);
            matchedGstrIndices.add(g1Idx);
            matchedGstrIndices.add(g2Idx);

            const combinedItc = round2(
              gstrRows[g1Idx].igst + gstrRows[g1Idx].cgst + gstrRows[g1Idx].sgst + gstrRows[g1Idx].cess +
              gstrRows[g2Idx].igst + gstrRows[g2Idx].cgst + gstrRows[g2Idx].sgst + gstrRows[g2Idx].cess
            );

            splitMatches.push({
              matchType: 'SPLIT_N_TO_1',
              subType: '2 GSTR-2B milestone rows match one consolidated PR entry',
              tier: 4,
              confidence: 0.85,
              requiresUserConfirmation: true,
              gstrRecords: [gstrRows[g1Idx], gstrRows[g2Idx]],
              prRecord: pRow,
              variance: {
                gstrSum: sumGstr,
                prTotal: pTotal,
                amountDelta: round2(pTotal - sumGstr)
              },
              reconciledItc: combinedItc,
              notes: `N:1 Split Match: PR voucher ₹${pTotal} matches GSTR invoices (${gstrRows[g1Idx].invoice_number} ₹${gstrRows[g1Idx].total_value} + ${gstrRows[g2Idx].invoice_number} ₹${gstrRows[g2Idx].total_value} = ₹${sumGstr}).`
            });
            foundSplit = true;
            break;
          }
        }
        if (foundSplit) break;
      }
    }
  }

  // =========================================================================
  // TIER 5: AMBIGUITY & MISMATCH CLASSIFIER
  // =========================================================================
  const mismatchesGstrOnly = []; // Present in GSTR-2B only (Missing in PR ERP)
  const mismatchesPrOnly = [];   // Present in PR only (Missing in GSTR-2B -> DRC-01C risk!)

  // Unmatched GSTR-2B rows
  for (let gIdx = 0; gIdx < gstrRows.length; gIdx++) {
    if (!matchedGstrIndices.has(gIdx)) {
      const gRow = gstrRows[gIdx];
      const itcVal = round2(gRow.igst + gRow.cgst + gRow.sgst + gRow.cess);
      mismatchesGstrOnly.push({
        matchType: 'MISMATCH_GSTR_ONLY',
        gstrRecord: gRow,
        itcAmount: itcVal,
        isEligible: gRow.itc_availability !== 'No',
        riskCategory: 'Unrecorded in ERP / Potential Supplier Over-Reporting',
        notes: 'Document reported by supplier on GST portal, but no corresponding voucher exists in internal books.'
      });
    }
  }

  // Unmatched PR rows
  for (let pIdx = 0; pIdx < prRows.length; pIdx++) {
    if (!matchedPrIndices.has(pIdx)) {
      const pRow = prRows[pIdx];
      const itcVal = round2(pRow.igst + pRow.cgst + pRow.sgst + pRow.cess);
      mismatchesPrOnly.push({
        matchType: 'MISMATCH_PR_ONLY',
        prRecord: pRow,
        itcAmount: itcVal,
        riskCategory: 'Supplier GSTR-1 Non-Filing / DRC-01C Risk',
        notes: 'Booked in ERP purchase register, but supplier has NOT filed GSTR-1. ITC cannot be claimed under Sec 16(2)(aa).'
      });
    }
  }

  // =========================================================================
  // SUMMARY METRICS COMPUTATION (Strictly per user's 7 required items)
  // =========================================================================
  const totalGstrRows = gstrRows.length;
  const totalPrRows = prRows.length;
  const exactMatchCount = exactMatches.length;
  const nearMatchCount = nearMatches.length;
  const toleranceMatchCount = toleranceMatches.length;
  const splitMatchCount = splitMatches.length;
  const mismatchCount = mismatchesGstrOnly.length + mismatchesPrOnly.length;
  const ambiguousMatchCount = ambiguousMatches.length + splitMatches.filter(s => s.requiresUserConfirmation).length;

  const totalReconciledItc = round2(
    exactMatches.reduce((acc, m) => acc + (m.reconciledItc || 0), 0) +
    nearMatches.reduce((acc, m) => acc + (m.reconciledItc || 0), 0) +
    toleranceMatches.reduce((acc, m) => acc + (m.reconciledItc || 0), 0) +
    splitMatches.reduce((acc, m) => acc + (m.reconciledItc || 0), 0)
  );

  const totalAtRiskItc = round2(
    mismatchesPrOnly.reduce((acc, m) => acc + (m.itcAmount || 0), 0)
  );

  const totalGstrValue = round2(gstrRows.reduce((acc, r) => acc + (r.total_value || 0), 0));
  const totalPrValue = round2(prRows.reduce((acc, r) => acc + (r.total_value || 0), 0));

  return {
    summary: {
      totalGstrRows,
      totalPrRows,
      exactMatchCount,
      nearMatchCount,
      toleranceMatchCount,
      splitMatchCount,
      mismatchCount,
      mismatchesGstrOnlyCount: mismatchesGstrOnly.length,
      mismatchesPrOnlyCount: mismatchesPrOnly.length,
      ambiguousMatchCount,
      totalGstrValue,
      totalPrValue,
      totalReconciledItc,
      totalAtRiskItc,
      reconciliationRate: totalPrRows > 0 ? Math.round(((exactMatchCount + nearMatchCount + toleranceMatchCount) / totalPrRows) * 100) : 0
    },
    exactMatches,
    nearMatches,
    toleranceMatches,
    splitMatches,
    ambiguousMatches,
    mismatchesGstrOnly,
    mismatchesPrOnly,
    tolerancesApplied: {
      dateToleranceDays,
      amountTolerance
    }
  };
}
