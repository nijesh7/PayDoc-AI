import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { numberToIndianWords } from './numberToWords';

export interface PayslipPDFData {
  organizationName: string;
  organizationAddress?: string;
  organizationTaxId?: string;
  employeeName: string;
  employeeId: string;
  department: string;
  designation: string;
  joiningDate: string;
  bankAccount: string;
  bankIfsc: string;
  panNumber?: string;
  uan?: string;
  pfNumber?: string;
  month: number;
  year: number;
  // Attendance & Days
  totalWorkingDays?: number;
  daysWorked?: number;
  lopDays?: number;
  // Earnings
  basicSalary: number;
  overtimeHours: number;
  overtimeAmount: number;
  bonusAmount: number;
  allowancesAmount: number;
  // Deductions
  deductionsAmount: number;
  advancesAmount: number;
  leaveDeductionsAmount: number;
  // Statutory
  tdsAmount?: number;
  pfEmployee?: number;
  esiEmployee?: number;
  ptAmount?: number;
  netSalary: number;
  paymentStatus: string;
  allowancesBreakdown?: Array<{ name: string; amount: number }>;
  deductionsBreakdown?: Array<{ name: string; amount: number }>;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function generatePayslipPDF(data: PayslipPDFData): Buffer {
  const doc = new jsPDF();
  const monthName = MONTH_NAMES[data.month - 1] || `Month ${data.month}`;

  // Organization Header
  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59); // Slate-800
  doc.text(data.organizationName, 14, 18);

  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  if (data.organizationAddress) {
    doc.text(data.organizationAddress, 14, 24);
  }
  if (data.organizationTaxId) {
    doc.text(`GSTIN / Tax ID: ${data.organizationTaxId}`, 14, 29);
  }

  // Payslip Title & Period Badge
  doc.setFontSize(13);
  doc.setTextColor(79, 70, 229); // Indigo-600
  doc.text(`PAYSLIP FOR ${monthName.toUpperCase()} ${data.year}`, 14, 38);

  // Divider
  doc.setDrawColor(226, 232, 240);
  doc.line(14, 42, 196, 42);

  // Employee Information Grid (4-column)
  (doc as any).autoTable({
    startY: 46,
    theme: 'plain',
    styles: { fontSize: 8.5, cellPadding: 1.8, textColor: [51, 65, 85] },
    columnStyles: {
      0: { fontStyle: 'bold', width: 35 },
      1: { width: 55 },
      2: { fontStyle: 'bold', width: 35 },
      3: { width: 55 },
    },
    body: [
      ['Employee Name:', data.employeeName, 'Employee ID:', data.employeeId],
      ['Department:', data.department, 'Designation:', data.designation],
      ['Date of Joining:', data.joiningDate, 'Bank Account:', data.bankAccount],
      ['Bank IFSC:', data.bankIfsc, 'PAN Number:', data.panNumber || 'N/A'],
      ['UAN (EPFO):', data.uan || 'N/A', 'PF Member ID:', data.pfNumber || 'N/A'],
      ['Calendar / Worked:', `${data.totalWorkingDays || 30} / ${data.daysWorked || 30} days`, 'LOP Days:', `${data.lopDays || 0} days`],
      ['Payment Status:', data.paymentStatus.toUpperCase(), 'Pay Period:', `${monthName} ${data.year}`],
    ],
  });

  const employeeTableEnd = (doc as any).lastAutoTable.finalY || 82;

  // Earnings Rows
  const earningsRows: Array<[string, string]> = [
    ['Basic Salary', `₹${data.basicSalary.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
  ];

  if (data.allowancesBreakdown && data.allowancesBreakdown.length > 0) {
    data.allowancesBreakdown.forEach((item) => {
      earningsRows.push([item.name, `₹${item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`]);
    });
  } else if (data.allowancesAmount > 0) {
    earningsRows.push(['Special Allowances', `₹${data.allowancesAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`]);
  }

  if (data.overtimeAmount > 0) {
    earningsRows.push(['Overtime Pay', `₹${data.overtimeAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`]);
  }
  if (data.bonusAmount > 0) {
    earningsRows.push(['Performance Bonus', `₹${data.bonusAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`]);
  }

  // Deductions Rows
  const deductionsRows: Array<[string, string]> = [];

  // Statutory Deductions
  if (data.pfEmployee && data.pfEmployee > 0) {
    deductionsRows.push(['Provident Fund (EPF)', `₹${data.pfEmployee.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`]);
  }
  if (data.esiEmployee && data.esiEmployee > 0) {
    deductionsRows.push(['ESI (Employee Contribution)', `₹${data.esiEmployee.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`]);
  }
  if (data.ptAmount && data.ptAmount > 0) {
    deductionsRows.push(['Professional Tax (PT)', `₹${data.ptAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`]);
  }
  if (data.tdsAmount && data.tdsAmount > 0) {
    deductionsRows.push(['Tax Deducted at Source (TDS)', `₹${data.tdsAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`]);
  }

  // Custom / LOP / Advance Deductions
  if (data.leaveDeductionsAmount > 0) {
    deductionsRows.push(['Loss of Pay (LOP) Deduction', `₹${data.leaveDeductionsAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`]);
  }
  if (data.advancesAmount > 0) {
    deductionsRows.push(['Salary Advance Recovery', `₹${data.advancesAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`]);
  }
  if (data.deductionsBreakdown && data.deductionsBreakdown.length > 0) {
    data.deductionsBreakdown.forEach((item) => {
      deductionsRows.push([item.name, `₹${item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`]);
    });
  } else if (data.deductionsAmount > 0 && deductionsRows.length === 0) {
    deductionsRows.push(['Other Deductions', `₹${data.deductionsAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`]);
  }

  if (deductionsRows.length === 0) {
    deductionsRows.push(['No Deductions Applied', '₹0.00']);
  }

  // Earnings Table (Left)
  (doc as any).autoTable({
    startY: employeeTableEnd + 4,
    margin: { left: 14, right: 108 },
    head: [['Earnings Component', 'Amount']],
    body: earningsRows,
    headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
    styles: { fontSize: 8.5, cellPadding: 2.5 },
  });

  const earningsTableEnd = (doc as any).lastAutoTable.finalY || 130;

  // Deductions Table (Right)
  (doc as any).autoTable({
    startY: employeeTableEnd + 4,
    margin: { left: 110, right: 14 },
    head: [['Deductions Component', 'Amount']],
    body: deductionsRows,
    headStyles: { fillColor: [225, 29, 72], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
    styles: { fontSize: 8.5, cellPadding: 2.5 },
  });

  const deductionsTableEnd = (doc as any).lastAutoTable.finalY || 130;
  const tablesEnd = Math.max(earningsTableEnd, deductionsTableEnd);

  const grossEarnings = data.basicSalary + data.overtimeAmount + data.bonusAmount + data.allowancesAmount;
  const totalDeductions =
    data.deductionsAmount +
    data.advancesAmount +
    data.leaveDeductionsAmount +
    (data.tdsAmount || 0) +
    (data.pfEmployee || 0) +
    (data.esiEmployee || 0) +
    (data.ptAmount || 0);

  // Net Summary Block
  (doc as any).autoTable({
    startY: tablesEnd + 6,
    margin: { left: 14, right: 14 },
    theme: 'grid',
    styles: { fontSize: 9.5, cellPadding: 3.5, fontStyle: 'bold' },
    headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42] },
    body: [
      ['Gross Earnings', `₹${grossEarnings.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
      ['Total Deductions', `₹${totalDeductions.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
      ['NET TAKE HOME SALARY', `₹${data.netSalary.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
    ],
  });

  const summaryEnd = (doc as any).lastAutoTable.finalY || 170;

  // Net in Words Box
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'bold');
  doc.text('Net Pay in Words:', 14, summaryEnd + 8);
  doc.setFont('helvetica', 'normal');
  doc.text(numberToIndianWords(data.netSalary), 45, summaryEnd + 8);

  // Verification & Sign-off Footer
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('This is a computer-generated digital payslip issued via PayDoc AI. No physical signature is required.', 14, summaryEnd + 22);

  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}
