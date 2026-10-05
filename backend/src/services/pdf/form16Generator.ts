import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { numberToIndianWords } from './numberToWords';

export interface Form16Data {
  employerName: string;
  employerAddress?: string;
  employerPAN?: string;
  employerTAN?: string;
  employeeName: string;
  employeeId: string;
  employeePAN: string;
  financialYear: string; // '2026-2027'
  assessmentYear: string; // '2027-2028'
  regime: 'new' | 'old';
  grossSalary: number;
  hraExemption?: number;
  standardDeduction: number;
  professionalTax: number;
  totalIncomeSalaries: number;
  // Chapter VI-A
  sec80C?: number;
  sec80D?: number;
  sec80CCD?: number;
  sec24b?: number;
  totalDeductionsChapterVIA: number;
  taxableIncome: number;
  taxOnTotalIncome: number;
  rebate87A: number;
  cess: number;
  totalTaxPayable: number;
  tdsDeducted: number;
}

export function generateForm16PDF(data: Form16Data): Buffer {
  const doc = new jsPDF();

  // Header Title
  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.text('FORM NO. 16', 105, 16, { align: 'center' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('[See rule 31(1)(a)]', 105, 21, { align: 'center' });
  doc.text(
    'PART B: Certificate under Section 203 of the Income-tax Act, 1961 for tax deducted at source on salary',
    105,
    26,
    { align: 'center' }
  );

  // Divider
  doc.setDrawColor(203, 213, 225);
  doc.line(14, 29, 196, 29);

  // Employer & Employee Details Table
  (doc as any).autoTable({
    startY: 32,
    theme: 'plain',
    styles: { fontSize: 8.5, cellPadding: 2, textColor: [51, 65, 85] },
    columnStyles: {
      0: { fontStyle: 'bold', width: 45 },
      1: { width: 50 },
      2: { fontStyle: 'bold', width: 45 },
      3: { width: 50 },
    },
    body: [
      ['Name and Address of Employer:', data.employerName, 'Name of Employee:', data.employeeName],
      ['PAN of Deductor / Employer:', data.employerPAN || 'N/A', 'PAN of Employee:', data.employeePAN || 'N/A'],
      ['TAN of Deductor:', data.employerTAN || 'BLRP12345A', 'Employee ID:', data.employeeId],
      ['Financial Year:', data.financialYear, 'Assessment Year:', data.assessmentYear],
      [
        'Tax Regime Elected:',
        data.regime === 'new' ? 'NEW REGIME (Sec 115BAC)' : 'OLD TAX REGIME',
        'Verification Date:',
        new Date().toISOString().split('T')[0],
      ],
    ],
  });

  const topTableEnd = (doc as any).lastAutoTable.finalY || 65;

  // Part B Detailed Computation Table
  const rows = [
    ['1. Gross Salary under section 17(1)', `₹${data.grossSalary.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
    ['2. Less: Allowances exempt under section 10 (HRA)', `₹${(data.hraExemption || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
    ['3. Balance (1 - 2)', `₹${(data.grossSalary - (data.hraExemption || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
    ['4. Deductions under section 16:', ''],
    ['   (a) Standard deduction under section 16(ia)', `₹${data.standardDeduction.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
    ['   (b) Tax on employment under section 16(iii) (PT)', `₹${data.professionalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
    ['5. Total deductions under section 16', `₹${(data.standardDeduction + data.professionalTax).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
    ['6. Income chargeable under head "Salaries" (3 - 5)', `₹${data.totalIncomeSalaries.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
    ['7. Deductions under Chapter VI-A:', ''],
  ];

  if (data.regime === 'old') {
    rows.push(['   (a) Section 80C (PPF, ELSS, PF, Life Insurance)', `₹${(data.sec80C || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`]);
    rows.push(['   (b) Section 80D (Health Insurance)', `₹${(data.sec80D || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`]);
    rows.push(['   (c) Section 80CCD(1B) (NPS Additional)', `₹${(data.sec80CCD || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`]);
    rows.push(['   (d) Section 24(b) (Interest on Home Loan)', `₹${(data.sec24b || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`]);
  } else {
    rows.push(['   (Chapter VI-A deductions not applicable under New Regime)', '₹0.00']);
  }

  rows.push(['8. Aggregate of deductible amount under Chapter VI-A', `₹${data.totalDeductionsChapterVIA.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`]);
  rows.push(['9. Total Taxable Income (6 - 8)', `₹${data.taxableIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`]);
  rows.push(['10. Tax on Total Income', `₹${data.taxOnTotalIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`]);
  rows.push(['11. Rebate under section 87A', `₹${data.rebate87A.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`]);
  rows.push(['12. Health and Education Cess @ 4%', `₹${data.cess.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`]);
  rows.push(['13. Total Tax Payable', `₹${data.totalTaxPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`]);
  rows.push(['14. Total Tax Deducted at Source (TDS)', `₹${data.tdsDeducted.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`]);

  (doc as any).autoTable({
    startY: topTableEnd + 4,
    margin: { left: 14, right: 14 },
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2.2 },
    columnStyles: {
      0: { width: 130 },
      1: { width: 52, halign: 'right', fontStyle: 'bold' },
    },
    head: [['Details of Salary & Tax Computation', 'Amount (INR)']],
    headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
    body: rows,
  });

  const finalTableEnd = (doc as any).lastAutoTable.finalY || 240;

  // Verification Statement
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `I, on behalf of ${data.employerName}, certify that the tax sum of ${formatCurrency(
      data.tdsDeducted
    )} (${numberToIndianWords(
      data.tdsDeducted
    )}) has been deducted and credited to the Central Government account.`,
    14,
    finalTableEnd + 8,
    { maxWidth: 182 }
  );

  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Generated via PayDoc AI Tax Compliance Engine. Certified digital copy.', 14, finalTableEnd + 22);

  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}

function formatCurrency(amt: number): string {
  return `₹${amt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}
