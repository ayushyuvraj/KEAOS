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
