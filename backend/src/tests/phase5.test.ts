import assert from 'assert';
import { numberToIndianWords } from '../services/pdf/numberToWords';
import { generatePayslipPDF } from '../services/pdf/payslipGenerator';
import { generateForm16PDF } from '../services/pdf/form16Generator';
import { generateEPFOECRText } from '../services/banking/epfoEcrGenerator';

console.log('\n============================================================');
console.log('       RUNNING PAYDOC AI PHASE 5 UNIT TESTS');
console.log('============================================================\n');

// 1. Number to Words Tests
console.log('--- Test Suite 1: Indian Currency Number to Words ---');
assert.strictEqual(numberToIndianWords(0), 'Zero Rupees Only');
assert.strictEqual(numberToIndianWords(54200), 'Fifty Four Thousand Two Hundred Rupees Only');
assert.strictEqual(numberToIndianWords(1250000), 'Twelve Lakh Fifty Thousand Rupees Only');
assert.strictEqual(numberToIndianWords(15000000.50), 'One Crore Fifty Lakh Rupees and Fifty Paise Only');
console.log('✓ Number to words converter handles Rupees, Lakhs, Crores, and Paise accurately.');

// 2. Payslip PDF Buffer Tests
console.log('\n--- Test Suite 2: Digital Payslip PDF Generation ---');
const payslipBuf = generatePayslipPDF({
  organizationName: 'PayDoc Tech Solutions Pvt Ltd',
  organizationAddress: 'Indiranagar, Bengaluru, Karnataka 560038',
  organizationTaxId: '29ABCDE1234F1Z5',
  employeeName: 'Aarav Sharma',
  employeeId: 'EMP-001',
  department: 'Engineering',
  designation: 'Senior Full Stack Engineer',
  joiningDate: '2023-04-15',
  bankAccount: '50100234567890',
  bankIfsc: 'HDFC0000001',
  panNumber: 'ABCPS1234A',
  uan: '100904561234',
  pfNumber: 'KN/BNG/0012345/000/01',
  month: 10,
  year: 2026,
  totalWorkingDays: 31,
  daysWorked: 29.5,
  lopDays: 1.5,
  basicSalary: 60000,
  overtimeHours: 4,
  overtimeAmount: 1800,
  bonusAmount: 5000,
  allowancesAmount: 24000,
  deductionsAmount: 0,
  advancesAmount: 0,
  leaveDeductionsAmount: 2903.23,
  tdsAmount: 5500,
  pfEmployee: 1800,
  esiEmployee: 0,
  ptAmount: 200,
  netSalary: 80396.77,
  paymentStatus: 'paid',
});

assert.ok(Buffer.isBuffer(payslipBuf), 'Payslip returns a valid Buffer');
assert.ok(payslipBuf.length > 1000, 'Payslip PDF is not empty');
assert.strictEqual(payslipBuf.slice(0, 4).toString(), '%PDF', 'PDF header matches %PDF signature');
console.log(`✓ Digital payslip PDF generated successfully (${payslipBuf.length} bytes).`);

// 3. Form 16 Part B PDF Tests
console.log('\n--- Test Suite 3: Form 16 Part B Tax Certificate PDF ---');
const form16Buf = generateForm16PDF({
  employerName: 'PayDoc Tech Solutions Pvt Ltd',
  employerPAN: 'ABCDE1234F',
  employerTAN: 'BLRP12345A',
  employeeName: 'Aarav Sharma',
  employeeId: 'EMP-001',
  employeePAN: 'ABCPS1234A',
  financialYear: '2026-2027',
  assessmentYear: '2027-2028',
  regime: 'new',
  grossSalary: 1200000,
  hraExemption: 0,
  standardDeduction: 75000,
  professionalTax: 2400,
  totalIncomeSalaries: 1122600,
  totalDeductionsChapterVIA: 0,
  taxableIncome: 1122600,
  taxOnTotalIncome: 68390,
  rebate87A: 0,
  cess: 2735.60,
  totalTaxPayable: 71125.60,
  tdsDeducted: 71125.60,
});

assert.ok(Buffer.isBuffer(form16Buf), 'Form 16 returns a valid Buffer');
assert.ok(form16Buf.length > 1000, 'Form 16 PDF is not empty');
assert.strictEqual(form16Buf.slice(0, 4).toString(), '%PDF', 'PDF header matches %PDF');
console.log(`✓ Form 16 Part B PDF generated successfully (${form16Buf.length} bytes).`);

// 4. EPFO ECR Text File Generator Tests
console.log('\n--- Test Suite 4: EPFO ECR File Generation ---');
const ecrResult = generateEPFOECRText(
  [
    {
      uan: '100904561234',
      memberName: 'AARAV SHARMA',
      grossWages: 90000,
      basicSalary: 60000,
      pfWageCeilingApplicable: true,
      ncpDays: 2, // 2 days LOP
    },
    {
      uan: '100907894561',
      memberName: 'POOJA VERMA',
      grossWages: 14000,
      basicSalary: 12000,
      pfWageCeilingApplicable: true,
      ncpDays: 0,
    },
  ],
  10,
  2026
);

assert.strictEqual(ecrResult.totalMembers, 2);
const lines = ecrResult.content.split('\r\n');
assert.strictEqual(lines.length, 2);

// Check Member 1 (Capped to 15,000 wages)
const parts1 = lines[0].split('#~#');
assert.strictEqual(parts1[0], '100904561234');
assert.strictEqual(parts1[1], 'AARAV SHARMA');
assert.strictEqual(parts1[3], '15000', 'EPF Wages capped at 15000');
assert.strictEqual(parts1[6], '1800', 'EE Share is 1800');
assert.strictEqual(parts1[7], '1250', 'EPS Share is capped at 1250');
assert.strictEqual(parts1[9], '2', 'NCP Days recorded as 2');

console.log('✓ EPFO ECR text generated matching official EPFO #~# specifications.');

console.log('\n============================================================');
console.log('   ALL PHASE 5 PAYSLIP, FORM 16 & ECR TESTS PASSED!');
console.log('============================================================\n');
