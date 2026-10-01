import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

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
  month: number;
  year: number;
  basicSalary: number;
  overtimeHours: number;
  overtimeAmount: number;
  bonusAmount: number;
  allowancesAmount: number;
  deductionsAmount: number;
  advancesAmount: number;
  leaveDeductionsAmount: number;
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
  doc.setFontSize(18);
  doc.setTextColor(30, 41, 59); // Slate-800
  doc.text(data.organizationName, 14, 20);

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  if (data.organizationAddress) {
    doc.text(data.organizationAddress, 14, 26);
  }
  if (data.organizationTaxId) {
    doc.text(`GSTIN / Tax ID: ${data.organizationTaxId}`, 14, 31);
  }

  // Payslip Title & Period Badge
  doc.setFontSize(14);
  doc.setTextColor(79, 70, 229); // Indigo-600
  doc.text(`PAYSLIP FOR ${monthName.toUpperCase()} ${data.year}`, 14, 42);

  // Divider
  doc.setDrawColor(226, 232, 240);
  doc.line(14, 46, 196, 46);

  // Employee Information Grid
  (doc as any).autoTable({
    startY: 50,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 2, textColor: [51, 65, 85] },
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
      ['Bank IFSC:', data.bankIfsc, 'PAN / Tax Number:', data.panNumber || 'N/A'],
      ['Payment Status:', data.paymentStatus.toUpperCase(), 'Pay Period:', `${monthName} ${data.year}`],
    ],
  });

  const employeeTableEnd = (doc as any).lastAutoTable.finalY || 80;

  // Earnings & Deductions Breakdown
  const earningsRows = [
    ['Basic Salary', `₹${data.basicSalary.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
    ['Overtime Pay', `₹${data.overtimeAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
    ['Performance Bonus', `₹${data.bonusAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
  ];

  if (data.allowancesBreakdown && data.allowancesBreakdown.length > 0) {
    data.allowancesBreakdown.forEach((item) => {
      earningsRows.push([item.name, `₹${item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`]);
    });
  } else if (data.allowancesAmount > 0) {
    earningsRows.push(['Special Allowances', `₹${data.allowancesAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`]);
  }

  const deductionsRows = [];
  if (data.deductionsBreakdown && data.deductionsBreakdown.length > 0) {
    data.deductionsBreakdown.forEach((item) => {
      deductionsRows.push([item.name, `₹${item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`]);
    });
  } else if (data.deductionsAmount > 0) {
    deductionsRows.push(['Standard Deductions', `₹${data.deductionsAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`]);
  }
  if (data.advancesAmount > 0) {
    deductionsRows.push(['Salary Advance Recovery', `₹${data.advancesAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`]);
  }
  if (data.leaveDeductionsAmount > 0) {
    deductionsRows.push(['Unpaid Leave Deductions', `₹${data.leaveDeductionsAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`]);
  }
  if (deductionsRows.length === 0) {
    deductionsRows.push(['No Deductions Applied', '₹0.00']);
  }

  // Earnings Table (Left)
  (doc as any).autoTable({
    startY: employeeTableEnd + 6,
    margin: { left: 14, right: 108 },
    head: [['Earnings Component', 'Amount']],
    body: earningsRows,
    headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 3 },
  });

  const earningsTableEnd = (doc as any).lastAutoTable.finalY || 130;

  // Deductions Table (Right)
  (doc as any).autoTable({
    startY: employeeTableEnd + 6,
    margin: { left: 110, right: 14 },
    head: [['Deductions Component', 'Amount']],
    body: deductionsRows,
    headStyles: { fillColor: [225, 29, 72], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 3 },
  });

  const deductionsTableEnd = (doc as any).lastAutoTable.finalY || 130;
  const tablesEnd = Math.max(earningsTableEnd, deductionsTableEnd);

  // Net Summary Block
  (doc as any).autoTable({
    startY: tablesEnd + 8,
    margin: { left: 14, right: 14 },
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 4, fontStyle: 'bold' },
    headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42] },
    body: [
      ['Gross Earnings', `₹${(data.basicSalary + data.overtimeAmount + data.bonusAmount + data.allowancesAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
      ['Total Deductions', `₹${(data.deductionsAmount + data.advancesAmount + data.leaveDeductionsAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
      ['NET TAKE HOME SALARY', `₹${data.netSalary.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
    ],
  });

  // Footer Note
  const finalY = (doc as any).lastAutoTable.finalY || 180;
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('This is a computer-generated digital payslip issued via PayDoc AI. No physical signature is required.', 14, finalY + 12);

  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}
