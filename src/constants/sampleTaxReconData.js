/**
 * Realistic Enterprise Indirect Tax Datasets: GSTR-2B & Purchase Register (PR)
 * Adheres strictly to Indian GST CBIC standards and corporate ERP accounting formats.
 * Contains realistic edge cases: exact matches, alphanumeric punctuation differences,
 * leading zeroes, date lags (GRN delays), discount/rounding deltas, 1:N & N:1 split invoices,
 * and missing records in both directions.
 */

// Official CBIC GSTR-2B format (Auto-drafted ITC statement from supplier GSTR-1 filings)
export const SAMPLE_GSTR_2B_DATA = [
  // 1. Exact match candidate 1
  {
    "GSTIN of Supplier": "27AAACR5055K1Z8",
    "Trade/Legal Name": "Reliance Industries Limited",
    "Invoice Number": "RIL-2024-0091",
    "Invoice Type": "Regular",
    "Invoice Date": "2024-10-04",
    "Invoice Value": 118000.00,
    "Taxable Value": 100000.00,
    "Integrated Tax": 0.00,
    "Central Tax": 9000.00,
    "State/UT Tax": 9000.00,
    "Cess": 0.00,
    "GSTR-1 Filing Date": "2024-11-10",
    "ITC Availability": "Yes"
  },
  // 2. Exact match candidate 2
  {
    "GSTIN of Supplier": "29AABCI2020L1ZP",
    "Trade/Legal Name": "Infosys BPM Limited",
    "Invoice Number": "INF-KA-88301",
    "Invoice Type": "Regular",
    "Invoice Date": "2024-10-12",
    "Invoice Value": 59000.00,
    "Taxable Value": 50000.00,
    "Integrated Tax": 9000.00,
    "Central Tax": 0.00,
    "State/UT Tax": 0.00,
    "Cess": 0.00,
    "GSTR-1 Filing Date": "2024-11-11",
    "ITC Availability": "Yes"
  },
  // 3. Near match candidate 1: Alphanumeric formatting / special characters (INV/2024-25/0042 vs 42)
  {
    "GSTIN of Supplier": "33AABCT1332F1ZX",
    "Trade/Legal Name": "Tata Consultancy Services Ltd",
    "Invoice Number": "TCS/24-25/00420",
    "Invoice Type": "Regular",
    "Invoice Date": "2024-10-15",
    "Invoice Value": 236000.00,
    "Taxable Value": 200000.00,
    "Integrated Tax": 36000.00,
    "Central Tax": 0.00,
    "State/UT Tax": 0.00,
    "Cess": 0.00,
    "GSTR-1 Filing Date": "2024-11-12",
    "ITC Availability": "Yes"
  },
  // 4. Near match candidate 2: Leading zeros and hyphens (000891 vs 891)
  {
    "GSTIN of Supplier": "06AABCL3928H1ZV",
    "Trade/Legal Name": "Larsen & Toubro Infotech",
    "Invoice Number": "LTI-000891",
    "Invoice Type": "Regular",
    "Invoice Date": "2024-10-18",
    "Invoice Value": 41300.00,
    "Taxable Value": 35000.00,
    "Integrated Tax": 6300.00,
    "Central Tax": 0.00,
    "State/UT Tax": 0.00,
    "Cess": 0.00,
    "GSTR-1 Filing Date": "2024-11-09",
    "ITC Availability": "Yes"
  },
  // 5. Tolerance match candidate 1: Date lag (Bill dated 10-Oct in GSTR, entered 28-Oct in PR; within 30 days)
  {
    "GSTIN of Supplier": "24AAACG0102D1ZW",
    "Trade/Legal Name": "Adani Power & Transmission Ltd",
    "Invoice Number": "APT/OCT/902",
    "Invoice Type": "Regular",
    "Invoice Date": "2024-10-08",
    "Invoice Value": 88500.00,
    "Taxable Value": 75000.00,
    "Integrated Tax": 13500.00,
    "Central Tax": 0.00,
    "State/UT Tax": 0.00,
    "Cess": 0.00,
    "GSTR-1 Filing Date": "2024-11-10",
    "ITC Availability": "Yes"
  },
  // 6. Tolerance match candidate 2: Amount variance (₹500 cash discount or rounding delta; within ₹1,000)
  {
    "GSTIN of Supplier": "27AAACW1234M1Z2",
    "Trade/Legal Name": "Wipro Enterprises Technologies",
    "Invoice Number": "WIP-10294",
    "Invoice Type": "Regular",
    "Invoice Date": "2024-10-20",
    "Invoice Value": 177000.00,
    "Taxable Value": 150000.00,
    "Integrated Tax": 0.00,
    "Central Tax": 13500.00,
    "State/UT Tax": 13500.00,
    "Cess": 0.00,
    "GSTR-1 Filing Date": "2024-11-11",
    "ITC Availability": "Yes"
  },
  // 7. Split match candidate: One GSTR-2B row corresponds to TWO PR rows (1:N)
  // Single vendor invoice of ₹1,50,000 gross split across two purchase orders in ERP
  {
    "GSTIN of Supplier": "07AAACD5566N1Z4",
    "Trade/Legal Name": "Dell Global Solutions India",
    "Invoice Number": "DEL-INV-7701",
    "Invoice Type": "Regular",
    "Invoice Date": "2024-10-22",
    "Invoice Value": 177000.00,
    "Taxable Value": 150000.00,
    "Integrated Tax": 27000.00,
    "Central Tax": 0.00,
    "State/UT Tax": 0.00,
    "Cess": 0.00,
    "GSTR-1 Filing Date": "2024-11-11",
    "ITC Availability": "Yes"
  },
  // 8. Split match candidate: TWO GSTR-2B rows correspond to ONE PR row (N:1)
  // Milestone part 1
  {
    "GSTIN of Supplier": "27AABCS3344R1ZM",
    "Trade/Legal Name": "Siemens India Infrastructure",
    "Invoice Number": "SIE-MS-101",
    "Invoice Type": "Regular",
    "Invoice Date": "2024-10-14",
    "Invoice Value": 59000.00,
    "Taxable Value": 50000.00,
    "Integrated Tax": 0.00,
    "Central Tax": 4500.00,
    "State/UT Tax": 4500.00,
    "Cess": 0.00,
    "GSTR-1 Filing Date": "2024-11-11",
    "ITC Availability": "Yes"
  },
  // Milestone part 2
  {
    "GSTIN of Supplier": "27AABCS3344R1ZM",
    "Trade/Legal Name": "Siemens India Infrastructure",
    "Invoice Number": "SIE-MS-102",
    "Invoice Type": "Regular",
    "Invoice Date": "2024-10-14",
    "Invoice Value": 59000.00,
    "Taxable Value": 50000.00,
    "Integrated Tax": 0.00,
    "Central Tax": 4500.00,
    "State/UT Tax": 4500.00,
    "Cess": 0.00,
    "GSTR-1 Filing Date": "2024-11-11",
    "ITC Availability": "Yes"
  },
  // 9. Missing in PR (Present in GSTR-2B only): Vendor filed on GST portal, but missing in buyer's ERP
  {
    "GSTIN of Supplier": "29AAACK9988P1ZZ",
    "Trade/Legal Name": "Kirloskar Brothers Industrial",
    "Invoice Number": "KBL-55201",
    "Invoice Type": "Regular",
    "Invoice Date": "2024-10-25",
    "Invoice Value": 70800.00,
    "Taxable Value": 60000.00,
    "Integrated Tax": 10800.00,
    "Central Tax": 0.00,
    "State/UT Tax": 0.00,
    "Cess": 0.00,
    "GSTR-1 Filing Date": "2024-11-13",
    "ITC Availability": "Yes"
  },
  // 10. Ineligible ITC in GSTR-2B: Section 16(4) time-barred
  {
    "GSTIN of Supplier": "27AABCH1122Q1ZT",
    "Trade/Legal Name": "Godrej & Boyce Manufacturing",
    "Invoice Number": "GB-AUG-04",
    "Invoice Type": "Regular",
    "Invoice Date": "2023-08-10",
    "Invoice Value": 35400.00,
    "Taxable Value": 30000.00,
    "Integrated Tax": 0.00,
    "Central Tax": 2700.00,
    "State/UT Tax": 2700.00,
    "Cess": 0.00,
    "GSTR-1 Filing Date": "2024-11-14",
    "ITC Availability": "No"
  }
];

// Purchase Register (PR) format from Internal ERP (SAP / Oracle / Tally)
// Column headers represent common ERP conventions (Vch No, Bill Date, Assessable Val, etc.)
export const SAMPLE_PURCHASE_REGISTER_DATA = [
  // 1. Exact match candidate 1 (mirrors GSTR row 1)
  {
    "Vendor GSTIN": "27AAACR5055K1Z8",
    "Vendor Name": "Reliance Industries Limited",
    "Voucher Number": "RIL-2024-0091",
    "Posting Date": "2024-10-04",
    "Doc Date": "2024-10-04",
    "Base Amount": 100000.00,
    "CGST Amount": 9000.00,
    "SGST Amount": 9000.00,
    "IGST Amount": 0.00,
    "Total Invoice Amount": 118000.00,
    "PO Reference": "PO-4400192"
  },
  // 2. Exact match candidate 2 (mirrors GSTR row 2)
  {
    "Vendor GSTIN": "29AABCI2020L1ZP",
    "Vendor Name": "Infosys BPM Limited",
    "Voucher Number": "INF-KA-88301",
    "Posting Date": "2024-10-12",
    "Doc Date": "2024-10-12",
    "Base Amount": 50000.00,
    "CGST Amount": 0.00,
    "SGST Amount": 0.00,
    "IGST Amount": 9000.00,
    "Total Invoice Amount": 59000.00,
    "PO Reference": "PO-4400193"
  },
  // 3. Near match candidate 1: Alphanumeric normalization test
  // In GSTR: "TCS/24-25/00420" -> in PR ERP: "TCS 24 25 420"
  {
    "Vendor GSTIN": "33AABCT1332F1ZX",
    "Vendor Name": "Tata Consultancy Services Ltd",
    "Voucher Number": "TCS 24 25 420",
    "Posting Date": "2024-10-16",
    "Doc Date": "2024-10-15",
    "Base Amount": 200000.00,
    "CGST Amount": 0.00,
    "SGST Amount": 0.00,
    "IGST Amount": 36000.00,
    "Total Invoice Amount": 236000.00,
    "PO Reference": "PO-4400194"
  },
  // 4. Near match candidate 2: Stripping leading zeroes
  // In GSTR: "LTI-000891" -> in PR ERP: "LTI-891"
  {
    "Vendor GSTIN": "06AABCL3928H1ZV",
    "Vendor Name": "Larsen & Toubro Infotech",
    "Voucher Number": "LTI-891",
    "Posting Date": "2024-10-18",
    "Doc Date": "2024-10-18",
    "Base Amount": 35000.00,
    "CGST Amount": 0.00,
    "SGST Amount": 0.00,
    "IGST Amount": 6300.00,
    "Total Invoice Amount": 41300.00,
    "PO Reference": "PO-4400195"
  },
  // 5. Tolerance match candidate 1: Date difference (Bill Date 08-Oct in GSTR, entered 26-Oct in PR: 18 days delta <= 30 days)
  {
    "Vendor GSTIN": "24AAACG0102D1ZW",
    "Vendor Name": "Adani Power & Transmission Ltd",
    "Voucher Number": "APT/OCT/902",
    "Posting Date": "2024-10-26",
    "Doc Date": "2024-10-26",
    "Base Amount": 75000.00,
    "CGST Amount": 0.00,
    "SGST Amount": 0.00,
    "IGST Amount": 13500.00,
    "Total Invoice Amount": 88500.00,
    "PO Reference": "PO-4400196"
  },
  // 6. Tolerance match candidate 2: Amount variance (₹1,76,500 in PR vs ₹1,77,000 in GSTR: ₹500 delta <= ₹1,000)
  {
    "Vendor GSTIN": "27AAACW1234M1Z2",
    "Vendor Name": "Wipro Enterprises Technologies",
    "Voucher Number": "WIP-10294",
    "Posting Date": "2024-10-20",
    "Doc Date": "2024-10-20",
    "Base Amount": 149576.00,
    "CGST Amount": 13462.00,
    "SGST Amount": 13462.00,
    "IGST Amount": 0.00,
    "Total Invoice Amount": 176500.00,
    "PO Reference": "PO-4400197"
  },
  // 7. Split match 1:N: PR Line item 1 for Dell (₹88,500)
  {
    "Vendor GSTIN": "07AAACD5566N1Z4",
    "Vendor Name": "Dell Global Solutions India",
    "Voucher Number": "DEL-INV-7701-A",
    "Posting Date": "2024-10-22",
    "Doc Date": "2024-10-22",
    "Base Amount": 75000.00,
    "CGST Amount": 0.00,
    "SGST Amount": 0.00,
    "IGST Amount": 13500.00,
    "Total Invoice Amount": 88500.00,
    "PO Reference": "PO-4400198-Line1"
  },
  // 7. Split match 1:N: PR Line item 2 for Dell (₹88,500) -> Sum = ₹1,77,000 = GSTR invoice
  {
    "Vendor GSTIN": "07AAACD5566N1Z4",
    "Vendor Name": "Dell Global Solutions India",
    "Voucher Number": "DEL-INV-7701-B",
    "Posting Date": "2024-10-22",
    "Doc Date": "2024-10-22",
    "Base Amount": 75000.00,
    "CGST Amount": 0.00,
    "SGST Amount": 0.00,
    "IGST Amount": 13500.00,
    "Total Invoice Amount": 88500.00,
    "PO Reference": "PO-4400198-Line2"
  },
  // 8. Split match N:1: Single PR entry in ERP for Siemens (₹1,18,000) = Sum of GSTR SIE-MS-101 (₹59k) + SIE-MS-102 (₹59k)
  {
    "Vendor GSTIN": "27AABCS3344R1ZM",
    "Vendor Name": "Siemens India Infrastructure",
    "Voucher Number": "SIE-CONSOL-101-102",
    "Posting Date": "2024-10-15",
    "Doc Date": "2024-10-14",
    "Base Amount": 100000.00,
    "CGST Amount": 9000.00,
    "SGST Amount": 9000.00,
    "IGST Amount": 0.00,
    "Total Invoice Amount": 118000.00,
    "PO Reference": "PO-4400199"
  },
  // 9. Missing in GSTR-2B (Present in PR only): Buyer booked in ERP, but vendor has NOT filed GSTR-1!
  // CRITICAL COMPLIANCE NOTICE (DRC-01C trigger; ITC blocked)
  {
    "Vendor GSTIN": "27AABCV8877B1ZK",
    "Vendor Name": "Vedanta Resources Logistics",
    "Voucher Number": "VED-TR-9941",
    "Posting Date": "2024-10-29",
    "Doc Date": "2024-10-28",
    "Base Amount": 120000.00,
    "CGST Amount": 10800.00,
    "SGST Amount": 10800.00,
    "IGST Amount": 0.00,
    "Total Invoice Amount": 141600.00,
    "PO Reference": "PO-4400200"
  },
  // 10. Additional missing in GSTR-2B entry
  {
    "Vendor GSTIN": "19AAACU5544J1Z9",
    "Vendor Name": "UltraTech Cement East Ltd",
    "Voucher Number": "UTC-WB-410",
    "Posting Date": "2024-10-30",
    "Doc Date": "2024-10-30",
    "Base Amount": 80000.00,
    "CGST Amount": 7200.00,
    "SGST Amount": 7200.00,
    "IGST Amount": 0.00,
    "Total Invoice Amount": 94400.00,
    "PO Reference": "PO-4400201"
  }
];


export const TAX_RECON_PROCESS_CODE = "/**\n * Self-contained GSTR-2B & Purchase Register (PR) Ingestion, Schema Mapping,\n * and 5-Tier Cascading Reconciliation Engine for the KEAOS Deterministic Box.\n * \n * Execution Contract: Zero Tokens • Sub-millisecond Browser Native • 100% Deterministic\n */\n\nasync function process(inputs = {}, state = {}) {\n  console.log('[Tax Recon Engine] Starting 2-Stage Ingestion & Cascading Reconciliation...');\n\n  // =========================================================================\n  // 1. DATA INGESTION: Read uploaded files or fallback to canonical samples\n  // =========================================================================\n  let gstrRaw = inputs.gstr2b || inputs.gstr_2b || inputs.fileA || null;\n  let prRaw = inputs.pr || inputs.purchase_register || inputs.fileB || null;\n\n  // If inputs contains raw files or text, parse with parseCsv or XLSX\n  if (typeof gstrRaw === 'string' && gstrRaw.trim().length > 0) {\n    gstrRaw = typeof parseCsv === 'function' ? parseCsv(gstrRaw) : [];\n  }\n  if (typeof prRaw === 'string' && prRaw.trim().length > 0) {\n    prRaw = typeof parseCsv === 'function' ? parseCsv(prRaw) : [];\n  }\n\n  // Fallback to institutional enterprise sample datasets if inputs are empty\n  if (!Array.isArray(gstrRaw) || gstrRaw.length === 0) {\n    gstrRaw = [\n      { \"GSTIN of Supplier\": \"27AAACR5055K1Z8\", \"Trade/Legal Name\": \"Reliance Industries Limited\", \"Invoice Number\": \"RIL-2024-0091\", \"Invoice Date\": \"2024-10-04\", \"Invoice Value\": 118000.00, \"Taxable Value\": 100000.00, \"Central Tax\": 9000.00, \"State/UT Tax\": 9000.00, \"Integrated Tax\": 0.00, \"Cess\": 0.00, \"ITC Availability\": \"Yes\" },\n      { \"GSTIN of Supplier\": \"29AABCI2020L1ZP\", \"Trade/Legal Name\": \"Infosys BPM Limited\", \"Invoice Number\": \"INF-KA-88301\", \"Invoice Date\": \"2024-10-12\", \"Invoice Value\": 59000.00, \"Taxable Value\": 50000.00, \"Central Tax\": 0.00, \"State/UT Tax\": 0.00, \"Integrated Tax\": 9000.00, \"Cess\": 0.00, \"ITC Availability\": \"Yes\" },\n      { \"GSTIN of Supplier\": \"33AABCT1332F1ZX\", \"Trade/Legal Name\": \"Tata Consultancy Services Ltd\", \"Invoice Number\": \"TCS/24-25/00420\", \"Invoice Date\": \"2024-10-15\", \"Invoice Value\": 236000.00, \"Taxable Value\": 200000.00, \"Central Tax\": 0.00, \"State/UT Tax\": 0.00, \"Integrated Tax\": 36000.00, \"Cess\": 0.00, \"ITC Availability\": \"Yes\" },\n      { \"GSTIN of Supplier\": \"06AABCL3928H1ZV\", \"Trade/Legal Name\": \"Larsen & Toubro Infotech\", \"Invoice Number\": \"LTI-000891\", \"Invoice Date\": \"2024-10-18\", \"Invoice Value\": 41300.00, \"Taxable Value\": 35000.00, \"Central Tax\": 0.00, \"State/UT Tax\": 0.00, \"Integrated Tax\": 6300.00, \"Cess\": 0.00, \"ITC Availability\": \"Yes\" },\n      { \"GSTIN of Supplier\": \"24AAACG0102D1ZW\", \"Trade/Legal Name\": \"Adani Power & Transmission Ltd\", \"Invoice Number\": \"APT/OCT/902\", \"Invoice Date\": \"2024-10-08\", \"Invoice Value\": 88500.00, \"Taxable Value\": 75000.00, \"Central Tax\": 0.00, \"State/UT Tax\": 0.00, \"Integrated Tax\": 13500.00, \"Cess\": 0.00, \"ITC Availability\": \"Yes\" },\n      { \"GSTIN of Supplier\": \"27AAACW1234M1Z2\", \"Trade/Legal Name\": \"Wipro Enterprises Technologies\", \"Invoice Number\": \"WIP-10294\", \"Invoice Date\": \"2024-10-20\", \"Invoice Value\": 177000.00, \"Taxable Value\": 150000.00, \"Central Tax\": 13500.00, \"State/UT Tax\": 13500.00, \"Integrated Tax\": 0.00, \"Cess\": 0.00, \"ITC Availability\": \"Yes\" },\n      { \"GSTIN of Supplier\": \"07AAACD5566N1Z4\", \"Trade/Legal Name\": \"Dell Global Solutions India\", \"Invoice Number\": \"DEL-INV-7701\", \"Invoice Date\": \"2024-10-22\", \"Invoice Value\": 177000.00, \"Taxable Value\": 150000.00, \"Central Tax\": 0.00, \"State/UT Tax\": 0.00, \"Integrated Tax\": 27000.00, \"Cess\": 0.00, \"ITC Availability\": \"Yes\" },\n      { \"GSTIN of Supplier\": \"27AABCS3344R1ZM\", \"Trade/Legal Name\": \"Siemens India Infrastructure\", \"Invoice Number\": \"SIE-MS-101\", \"Invoice Date\": \"2024-10-14\", \"Invoice Value\": 59000.00, \"Taxable Value\": 50000.00, \"Central Tax\": 4500.00, \"State/UT Tax\": 4500.00, \"Integrated Tax\": 0.00, \"Cess\": 0.00, \"ITC Availability\": \"Yes\" },\n      { \"GSTIN of Supplier\": \"27AABCS3344R1ZM\", \"Trade/Legal Name\": \"Siemens India Infrastructure\", \"Invoice Number\": \"SIE-MS-102\", \"Invoice Date\": \"2024-10-14\", \"Invoice Value\": 59000.00, \"Taxable Value\": 50000.00, \"Central Tax\": 4500.00, \"State/UT Tax\": 4500.00, \"Integrated Tax\": 0.00, \"Cess\": 0.00, \"ITC Availability\": \"Yes\" },\n      { \"GSTIN of Supplier\": \"29AAACK9988P1ZZ\", \"Trade/Legal Name\": \"Kirloskar Brothers Industrial\", \"Invoice Number\": \"KBL-55201\", \"Invoice Date\": \"2024-10-25\", \"Invoice Value\": 70800.00, \"Taxable Value\": 60000.00, \"Central Tax\": 0.00, \"State/UT Tax\": 0.00, \"Integrated Tax\": 10800.00, \"Cess\": 0.00, \"ITC Availability\": \"Yes\" },\n      { \"GSTIN of Supplier\": \"27AABCH1122Q1ZT\", \"Trade/Legal Name\": \"Godrej & Boyce Manufacturing\", \"Invoice Number\": \"GB-AUG-04\", \"Invoice Date\": \"2023-08-10\", \"Invoice Value\": 35400.00, \"Taxable Value\": 30000.00, \"Central Tax\": 2700.00, \"State/UT Tax\": 2700.00, \"Integrated Tax\": 0.00, \"Cess\": 0.00, \"ITC Availability\": \"No\" }\n    ];\n  }\n\n  if (!Array.isArray(prRaw) || prRaw.length === 0) {\n    prRaw = [\n      { \"Vendor GSTIN\": \"27AAACR5055K1Z8\", \"Vendor Name\": \"Reliance Industries Limited\", \"Voucher Number\": \"RIL-2024-0091\", \"Doc Date\": \"2024-10-04\", \"Total Invoice Amount\": 118000.00, \"Base Amount\": 100000.00, \"CGST Amount\": 9000.00, \"SGST Amount\": 9000.00, \"IGST Amount\": 0.00, \"PO Reference\": \"PO-4400192\" },\n      { \"Vendor GSTIN\": \"29AABCI2020L1ZP\", \"Vendor Name\": \"Infosys BPM Limited\", \"Voucher Number\": \"INF-KA-88301\", \"Doc Date\": \"2024-10-12\", \"Total Invoice Amount\": 59000.00, \"Base Amount\": 50000.00, \"CGST Amount\": 0.00, \"SGST Amount\": 0.00, \"IGST Amount\": 9000.00, \"PO Reference\": \"PO-4400193\" },\n      { \"Vendor GSTIN\": \"33AABCT1332F1ZX\", \"Vendor Name\": \"Tata Consultancy Services Ltd\", \"Voucher Number\": \"TCS 24 25 420\", \"Doc Date\": \"2024-10-15\", \"Total Invoice Amount\": 236000.00, \"Base Amount\": 200000.00, \"CGST Amount\": 0.00, \"SGST Amount\": 0.00, \"IGST Amount\": 36000.00, \"PO Reference\": \"PO-4400194\" },\n      { \"Vendor GSTIN\": \"06AABCL3928H1ZV\", \"Vendor Name\": \"Larsen & Toubro Infotech\", \"Voucher Number\": \"LTI-891\", \"Doc Date\": \"2024-10-18\", \"Total Invoice Amount\": 41300.00, \"Base Amount\": 35000.00, \"CGST Amount\": 0.00, \"SGST Amount\": 0.00, \"IGST Amount\": 6300.00, \"PO Reference\": \"PO-4400195\" },\n      { \"Vendor GSTIN\": \"24AAACG0102D1ZW\", \"Vendor Name\": \"Adani Power & Transmission Ltd\", \"Voucher Number\": \"APT/OCT/902\", \"Doc Date\": \"2024-10-26\", \"Total Invoice Amount\": 88500.00, \"Base Amount\": 75000.00, \"CGST Amount\": 0.00, \"SGST Amount\": 0.00, \"IGST Amount\": 13500.00, \"PO Reference\": \"PO-4400196\" },\n      { \"Vendor GSTIN\": \"27AAACW1234M1Z2\", \"Vendor Name\": \"Wipro Enterprises Technologies\", \"Voucher Number\": \"WIP-10294\", \"Doc Date\": \"2024-10-20\", \"Total Invoice Amount\": 176500.00, \"Base Amount\": 149576.00, \"CGST Amount\": 13462.00, \"SGST Amount\": 13462.00, \"IGST Amount\": 0.00, \"PO Reference\": \"PO-4400197\" },\n      { \"Vendor GSTIN\": \"07AAACD5566N1Z4\", \"Vendor Name\": \"Dell Global Solutions India\", \"Voucher Number\": \"DEL-INV-7701-A\", \"Doc Date\": \"2024-10-22\", \"Total Invoice Amount\": 88500.00, \"Base Amount\": 75000.00, \"CGST Amount\": 0.00, \"SGST Amount\": 0.00, \"IGST Amount\": 13500.00, \"PO Reference\": \"PO-4400198-Line1\" },\n      { \"Vendor GSTIN\": \"07AAACD5566N1Z4\", \"Vendor Name\": \"Dell Global Solutions India\", \"Voucher Number\": \"DEL-INV-7701-B\", \"Doc Date\": \"2024-10-22\", \"Total Invoice Amount\": 88500.00, \"Base Amount\": 75000.00, \"CGST Amount\": 0.00, \"SGST Amount\": 0.00, \"IGST Amount\": 13500.00, \"PO Reference\": \"PO-4400198-Line2\" },\n      { \"Vendor GSTIN\": \"27AABCS3344R1ZM\", \"Vendor Name\": \"Siemens India Infrastructure\", \"Voucher Number\": \"SIE-CONSOL-101-102\", \"Doc Date\": \"2024-10-14\", \"Total Invoice Amount\": 118000.00, \"Base Amount\": 100000.00, \"CGST Amount\": 9000.00, \"SGST Amount\": 9000.00, \"IGST Amount\": 0.00, \"PO Reference\": \"PO-4400199\" },\n      { \"Vendor GSTIN\": \"27AABCV8877B1ZK\", \"Vendor Name\": \"Vedanta Resources Logistics\", \"Voucher Number\": \"VED-TR-9941\", \"Doc Date\": \"2024-10-28\", \"Total Invoice Amount\": 141600.00, \"Base Amount\": 120000.00, \"CGST Amount\": 10800.00, \"SGST Amount\": 10800.00, \"IGST Amount\": 0.00, \"PO Reference\": \"PO-4400200\" },\n      { \"Vendor GSTIN\": \"19AAACU5544J1Z9\", \"Vendor Name\": \"UltraTech Cement East Ltd\", \"Voucher Number\": \"UTC-WB-410\", \"Doc Date\": \"2024-10-30\", \"Total Invoice Amount\": 94400.00, \"Base Amount\": 80000.00, \"CGST Amount\": 7200.00, \"SGST Amount\": 7200.00, \"IGST Amount\": 0.00, \"PO Reference\": \"PO-4400201\" }\n    ];\n  }\n\n  // =========================================================================\n  // 2. STAGE 1 & 2: SCHEMA NORMALIZATION (DETERMINISTIC TOKEN & ALIAS MAP)\n  // =========================================================================\n  const ALIAS_LOOKUP = {\n    gstin: ['supplier gstin', 'vendor gstin', 'gstin of supplier', 'gstin', 'gst no', 'tin', 'ctin', 'party gstin'],\n    supplier_name: ['trade/legal name', 'vendor name', 'supplier name', 'party name', 'trade name', 'legal name', 'name'],\n    invoice_number: ['invoice number', 'voucher number', 'bill no', 'inv no', 'bill number', 'doc no', 'document number', 'reference no', 'vch no', 'inum'],\n    invoice_date: ['invoice date', 'doc date', 'posting date', 'bill date', 'document date', 'voucher date', 'idt'],\n    taxable_value: ['taxable value', 'base amount', 'assessable value', 'taxable amount', 'net amount', 'txval'],\n    igst: ['integrated tax', 'igst amount', 'igst', 'integrated tax (igst)', 'iamt'],\n    cgst: ['central tax', 'cgst amount', 'cgst', 'central tax (cgst)', 'camt'],\n    sgst: ['state/ut tax', 'sgst amount', 'sgst', 'state/ut tax (sgst)', 'utgst', 'samt'],\n    cess: ['cess', 'cess amount', 'compensation cess', 'csamt'],\n    total_value: ['invoice value', 'total invoice amount', 'total value', 'gross amount', 'total amount', 'bill value', 'val']\n  };\n\n  const mapRecordColumns = (row) => {\n    const rawKeys = Object.keys(row);\n    const mapped = {};\n\n    for (const [canonicalKey, aliases] of Object.entries(ALIAS_LOOKUP)) {\n      for (const rawKey of rawKeys) {\n        const cleanRaw = rawKey.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\\s+/g, ' ').trim();\n        if (cleanRaw === canonicalKey || aliases.some(a => cleanRaw === a || cleanRaw.includes(a))) {\n          mapped[canonicalKey] = row[rawKey];\n          break;\n        }\n      }\n    }\n\n    const parseNum = (v) => {\n      if (v === null || v === undefined || v === '') return 0;\n      const num = parseFloat(String(v).replace(/,/g, '').trim());\n      return isNaN(num) ? 0 : num;\n    };\n\n    return {\n      _raw: row,\n      gstin: String(mapped.gstin || row['GSTIN'] || '').toUpperCase().trim(),\n      supplier_name: String(mapped.supplier_name || row['Name'] || '').trim(),\n      invoice_number: String(mapped.invoice_number || row['InvNo'] || '').trim(),\n      invoice_date: String(mapped.invoice_date || '').trim(),\n      taxable_value: parseNum(mapped.taxable_value),\n      igst: parseNum(mapped.igst),\n      cgst: parseNum(mapped.cgst),\n      sgst: parseNum(mapped.sgst),\n      cess: parseNum(mapped.cess),\n      total_value: parseNum(mapped.total_value),\n      itc_availability: String(row['ITC Availability'] || row['itc'] || 'Yes').trim()\n    };\n  };\n\n  const gstr = gstrRaw.map(mapRecordColumns);\n  const pr = prRaw.map(mapRecordColumns);\n\n  // Normalization helper: strips leading zeroes from numeric segments and non-alphanumerics\n  const normInv = (str = '') => {\n    return String(str)\n      .toLowerCase()\n      .replace(/^0+/, '')\n      .replace(/([^0-9a-z]|\\D)0+([0-9]+)/gi, '$1$2')\n      .replace(/[^a-z0-9]/g, '')\n      .replace(/^0+/, '')\n      .trim();\n  };\n\n  const round2 = (num) => Math.round((Number(num) || 0) * 100) / 100;\n\n  const dateDiffDays = (d1, d2) => {\n    if (!d1 || !d2) return 99999;\n    const t1 = new Date(d1).getTime();\n    const t2 = new Date(d2).getTime();\n    if (isNaN(t1) || isNaN(t2)) return 99999;\n    return Math.round(Math.abs(t2 - t1) / (1000 * 60 * 60 * 24));\n  };\n\n  // Configurable tolerances\n  const DATE_TOLERANCE_DAYS = Number(inputs.dateToleranceDays || 30);\n  const AMOUNT_TOLERANCE = Number(inputs.amountTolerance || 1000.0);\n\n  const matchedGstr = new Set();\n  const matchedPr = new Set();\n\n  const exactMatches = [];\n  const nearMatches = [];\n  const toleranceMatches = [];\n  const splitMatches = [];\n\n  // =========================================================================\n  // 3. TIER 1: EXACT MATCH (GSTIN + Inv No + Date + Total Amount)\n  // =========================================================================\n  for (let g = 0; g < gstr.length; g++) {\n    const gr = gstr[g];\n    for (let p = 0; p < pr.length; p++) {\n      if (matchedPr.has(p)) continue;\n      const prItem = pr[p];\n      if (\n        gr.gstin === prItem.gstin &&\n        gr.invoice_number.toLowerCase() === prItem.invoice_number.toLowerCase() &&\n        gr.invoice_date === prItem.invoice_date &&\n        Math.abs(round2(gr.total_value) - round2(prItem.total_value)) <= 0.05\n      ) {\n        matchedGstr.add(g);\n        matchedPr.add(p);\n        exactMatches.push({\n          matchType: 'EXACT_MATCH',\n          confidence: '100%',\n          tier: 1,\n          gstin: gr.gstin,\n          vendor: gr.supplier_name || prItem.supplier_name,\n          invoiceNumber: gr.invoice_number,\n          invoiceDate: gr.invoice_date,\n          gstrValue: gr.total_value,\n          prValue: prItem.total_value,\n          deltaAmount: 0,\n          dateDiff: '0d',\n          reconciledItc: round2(gr.igst + gr.cgst + gr.sgst + gr.cess),\n          action: 'Reconciled (Automatic)',\n          status: 'Exact Match'\n        });\n        break;\n      }\n    }\n  }\n\n  // =========================================================================\n  // 4. TIER 2: NEAR MATCH (Invoice Normalization, Date diff <= 3d)\n  // =========================================================================\n  for (let g = 0; g < gstr.length; g++) {\n    if (matchedGstr.has(g)) continue;\n    const gr = gstr[g];\n    const gNorm = normInv(gr.invoice_number);\n\n    for (let p = 0; p < pr.length; p++) {\n      if (matchedPr.has(p)) continue;\n      const prItem = pr[p];\n      const pNorm = normInv(prItem.invoice_number);\n      const dDiff = dateDiffDays(gr.invoice_date, prItem.invoice_date);\n\n      if (\n        gr.gstin === prItem.gstin &&\n        gNorm === pNorm &&\n        gNorm.length > 0 &&\n        Math.abs(round2(gr.total_value) - round2(prItem.total_value)) <= 0.05 &&\n        dDiff <= 3\n      ) {\n        matchedGstr.add(g);\n        matchedPr.add(p);\n        nearMatches.push({\n          matchType: 'NEAR_MATCH',\n          confidence: '95%',\n          tier: 2,\n          gstin: gr.gstin,\n          vendor: gr.supplier_name || prItem.supplier_name,\n          invoiceNumber: `${gr.invoice_number} ↔ ${prItem.invoice_number}`,\n          invoiceDate: gr.invoice_date,\n          gstrValue: gr.total_value,\n          prValue: prItem.total_value,\n          deltaAmount: 0,\n          dateDiff: `${dDiff}d`,\n          reconciledItc: round2(gr.igst + gr.cgst + gr.sgst + gr.cess),\n          action: `Normalized Invoice Match (${gNorm})`,\n          status: 'Near Match'\n        });\n        break;\n      }\n    }\n  }\n\n  // =========================================================================\n  // 5. TIER 3: TOLERANCE MATCH (Date window <= 30d, Amount delta <= ₹1,000)\n  // =========================================================================\n  for (let g = 0; g < gstr.length; g++) {\n    if (matchedGstr.has(g)) continue;\n    const gr = gstr[g];\n    const gNorm = normInv(gr.invoice_number);\n\n    for (let p = 0; p < pr.length; p++) {\n      if (matchedPr.has(p)) continue;\n      const prItem = pr[p];\n      const pNorm = normInv(prItem.invoice_number);\n\n      if (gr.gstin !== prItem.gstin) continue;\n\n      const dDiff = dateDiffDays(gr.invoice_date, prItem.invoice_date);\n      const amtDiff = round2(Math.abs(gr.total_value - prItem.total_value));\n      const isInvMatch = (gNorm === pNorm && gNorm.length > 0);\n\n      if (isInvMatch && dDiff <= DATE_TOLERANCE_DAYS && amtDiff <= AMOUNT_TOLERANCE) {\n        matchedGstr.add(g);\n        matchedPr.add(p);\n        const deltaSigned = round2(prItem.total_value - gr.total_value);\n        toleranceMatches.push({\n          matchType: 'TOLERANCE_MATCH',\n          confidence: '88%',\n          tier: 3,\n          gstin: gr.gstin,\n          vendor: gr.supplier_name || prItem.supplier_name,\n          invoiceNumber: gr.invoice_number,\n          invoiceDate: `${gr.invoice_date} (PR: ${prItem.invoice_date})`,\n          gstrValue: gr.total_value,\n          prValue: prItem.total_value,\n          deltaAmount: deltaSigned,\n          dateDiff: `${dDiff}d lag`,\n          reconciledItc: round2(gr.igst + gr.cgst + gr.sgst + gr.cess),\n          action: `Accepted within Tolerance (Lag: ${dDiff}d, Delta: ₹${deltaSigned})`,\n          status: 'Tolerance Match'\n        });\n        break;\n      }\n    }\n  }\n\n  // =========================================================================\n  // 6. TIER 4: SPLIT MATCHES (1:N and N:1)\n  // =========================================================================\n  // 1:N Split: 1 GSTR-2B row matches sum of 2 PR rows\n  for (let g = 0; g < gstr.length; g++) {\n    if (matchedGstr.has(g)) continue;\n    const gr = gstr[g];\n    const candidatePr = [];\n    for (let p = 0; p < pr.length; p++) {\n      if (!matchedPr.has(p) && pr[p].gstin === gr.gstin) {\n        candidatePr.push(p);\n      }\n    }\n    let found = false;\n    for (let i = 0; i < candidatePr.length; i++) {\n      for (let j = i + 1; j < candidatePr.length; j++) {\n        const p1 = candidatePr[i];\n        const p2 = candidatePr[j];\n        const sumPr = round2(pr[p1].total_value + pr[p2].total_value);\n        if (Math.abs(sumPr - round2(gr.total_value)) <= AMOUNT_TOLERANCE) {\n          matchedGstr.add(g);\n          matchedPr.add(p1);\n          matchedPr.add(p2);\n          splitMatches.push({\n            matchType: 'SPLIT_1_TO_N',\n            confidence: '85%',\n            tier: 4,\n            gstin: gr.gstin,\n            vendor: gr.supplier_name,\n            invoiceNumber: `${gr.invoice_number} ↔ [${pr[p1].invoice_number}, ${pr[p2].invoice_number}]`,\n            invoiceDate: gr.invoice_date,\n            gstrValue: gr.total_value,\n            prValue: sumPr,\n            deltaAmount: round2(sumPr - gr.total_value),\n            dateDiff: 'Same Month',\n            reconciledItc: round2(gr.igst + gr.cgst + gr.sgst + gr.cess),\n            action: `1:N Split Match (${pr[p1].invoice_number} ₹${pr[p1].total_value} + ${pr[p2].invoice_number} ₹${pr[p2].total_value})`,\n            status: 'Split Match (1:N)'\n          });\n          found = true;\n          break;\n        }\n      }\n      if (found) break;\n    }\n  }\n\n  // N:1 Split: 2 GSTR-2B rows match 1 consolidated PR row\n  for (let p = 0; p < pr.length; p++) {\n    if (matchedPr.has(p)) continue;\n    const prItem = pr[p];\n    const candidateGstr = [];\n    for (let g = 0; g < gstr.length; g++) {\n      if (!matchedGstr.has(g) && gstr[g].gstin === prItem.gstin) {\n        candidateGstr.push(g);\n      }\n    }\n    let found = false;\n    for (let i = 0; i < candidateGstr.length; i++) {\n      for (let j = i + 1; j < candidateGstr.length; j++) {\n        const g1 = candidateGstr[i];\n        const g2 = candidateGstr[j];\n        const sumGstr = round2(gstr[g1].total_value + gstr[g2].total_value);\n        if (Math.abs(sumGstr - round2(prItem.total_value)) <= AMOUNT_TOLERANCE) {\n          matchedPr.add(p);\n          matchedGstr.add(g1);\n          matchedGstr.add(g2);\n          const combinedItc = round2(\n            gstr[g1].igst + gstr[g1].cgst + gstr[g1].sgst + gstr[g1].cess +\n            gstr[g2].igst + gstr[g2].cgst + gstr[g2].sgst + gstr[g2].cess\n          );\n          splitMatches.push({\n            matchType: 'SPLIT_N_TO_1',\n            confidence: '85%',\n            tier: 4,\n            gstin: prItem.gstin,\n            vendor: prItem.supplier_name,\n            invoiceNumber: `[${gstr[g1].invoice_number}, ${gstr[g2].invoice_number}] ↔ ${prItem.invoice_number}`,\n            invoiceDate: prItem.invoice_date,\n            gstrValue: sumGstr,\n            prValue: prItem.total_value,\n            deltaAmount: round2(prItem.total_value - sumGstr),\n            dateDiff: 'Same Month',\n            reconciledItc: combinedItc,\n            action: `N:1 Split Match (${gstr[g1].invoice_number} ₹${gstr[g1].total_value} + ${gstr[g2].invoice_number} ₹${gstr[g2].total_value})`,\n            status: 'Split Match (N:1)'\n          });\n          found = true;\n          break;\n        }\n      }\n      if (found) break;\n    }\n  }\n\n  // =========================================================================\n  // 7. TIER 5: MISMATCHES & UNMATCHED RECORDS\n  // =========================================================================\n  const mismatchesGstrOnly = [];\n  for (let g = 0; g < gstr.length; g++) {\n    if (!matchedGstr.has(g)) {\n      const gr = gstr[g];\n      const itc = round2(gr.igst + gr.cgst + gr.sgst + gr.cess);\n      mismatchesGstrOnly.push({\n        matchType: 'MISMATCH_GSTR_ONLY',\n        confidence: '0%',\n        tier: 5,\n        gstin: gr.gstin,\n        vendor: gr.supplier_name,\n        invoiceNumber: gr.invoice_number,\n        invoiceDate: gr.invoice_date,\n        gstrValue: gr.total_value,\n        prValue: 0,\n        deltaAmount: -gr.total_value,\n        dateDiff: 'N/A',\n        reconciledItc: 0,\n        itcAmount: itc,\n        action: gr.itc_availability === 'No' ? 'Ineligible ITC (Sec 16(4) Time-Barred)' : 'Missing in ERP Purchase Register',\n        status: 'Missing in PR'\n      });\n    }\n  }\n\n  const mismatchesPrOnly = [];\n  for (let p = 0; p < pr.length; p++) {\n    if (!matchedPr.has(p)) {\n      const prItem = pr[p];\n      const itc = round2(prItem.igst + prItem.cgst + prItem.sgst + prItem.cess);\n      mismatchesPrOnly.push({\n        matchType: 'MISMATCH_PR_ONLY',\n        confidence: '0%',\n        tier: 5,\n        gstin: prItem.gstin,\n        vendor: prItem.supplier_name,\n        invoiceNumber: prItem.invoice_number,\n        invoiceDate: prItem.invoice_date,\n        gstrValue: 0,\n        prValue: prItem.total_value,\n        deltaAmount: prItem.total_value,\n        dateDiff: 'N/A',\n        reconciledItc: 0,\n        itcAmount: itc,\n        action: 'DRC-01C Risk: Supplier has NOT filed GSTR-1 (ITC Blocked)',\n        status: 'Missing in GSTR-2B'\n      });\n    }\n  }\n\n  // Consolidated table records for interactive Grid view\n  const allRecords = [\n    ...exactMatches,\n    ...nearMatches,\n    ...toleranceMatches,\n    ...splitMatches,\n    ...mismatchesGstrOnly,\n    ...mismatchesPrOnly\n  ];\n\n  // =========================================================================\n  // 8. EXECUTIVE SUMMARY METRICS (Strictly 7 items requested by user)\n  // =========================================================================\n  const summary = {\n    totalGstrRows: gstr.length,\n    totalPrRows: pr.length,\n    exactMatchCount: exactMatches.length,\n    nearMatchCount: nearMatches.length,\n    toleranceMatchCount: toleranceMatches.length,\n    mismatchCount: mismatchesGstrOnly.length + mismatchesPrOnly.length,\n    mismatchesGstrOnlyCount: mismatchesGstrOnly.length,\n    mismatchesPrOnlyCount: mismatchesPrOnly.length,\n    ambiguousMatchCount: splitMatches.length, // Split & ambiguous matches awaiting review\n    totalReconciledItc: round2(\n      exactMatches.reduce((a, m) => a + m.reconciledItc, 0) +\n      nearMatches.reduce((a, m) => a + m.reconciledItc, 0) +\n      toleranceMatches.reduce((a, m) => a + m.reconciledItc, 0) +\n      splitMatches.reduce((a, m) => a + m.reconciledItc, 0)\n    ),\n    totalAtRiskItc: round2(mismatchesPrOnly.reduce((a, m) => a + m.itcAmount, 0)),\n    reconciliationRate: Math.round(((exactMatches.length + nearMatches.length + toleranceMatches.length + splitMatches.length) / pr.length) * 100) + '%'\n  };\n\n  console.log('[Tax Recon Engine] Reconciliation complete.');\n  console.log('[Tax Recon Engine] Summary:', JSON.stringify(summary));\n\n  return {\n    summary,\n    records: allRecords,\n    exactMatches,\n    nearMatches,\n    toleranceMatches,\n    splitMatches,\n    mismatchesGstrOnly,\n    mismatchesPrOnly\n  };\n}\n";
