import assert from 'assert';
import {
  generateHDFCSalaryCSV,
  generateICICICorporateCSV,
  generateSBICMSCSV,
  generateStandardNEFTCSV,
  reconcileBatchItems,
} from '../services/banking/payoutFileGenerator';

console.log('\n============================================================');
console.log('       RUNNING PAYDOC AI PHASE 4 UNIT TESTS');
console.log('============================================================\n');

const testRecipients = [
  {
    paymentId: 'pay-001',
    beneficiaryName: 'Aarav Sharma',
    accountNumber: '50100234567890',
    ifscCode: 'HDFC0000001', // Internal HDFC
    amount: '45000.50',
    email: 'aarav@company.com',
    narration: 'Salary Oct 2026',
  },
  {
    paymentId: 'pay-002',
    beneficiaryName: 'Pooja Verma',
    accountNumber: '00000034567890',
    ifscCode: 'SBIN0001234', // External NEFT
    amount: '62500.00',
    email: 'pooja@company.com',
    narration: 'Salary Oct 2026',
  },
];

// 1. HDFC Salary CSV Tests
console.log('--- Test Suite 1: HDFC Bank Salary Payout CSV ---');
const hdfc = generateHDFCSalaryCSV({
  batchNumber: 'BATCH-202610-001',
  bankFormat: 'HDFC_SALARY_CSV',
  debitAccountNumber: '50200012345678',
  recipients: testRecipients,
  valueDate: '2026-10-05',
});

assert.strictEqual(hdfc.totalRecords, 2);
assert.strictEqual(hdfc.totalAmount, '107500.50');
assert.ok(hdfc.fileContent.includes('Transaction Type,Beneficiary Account No'));
assert.ok(hdfc.fileContent.includes('FT,50100234567890,45000.50'), 'Internal HDFC marked as FT');
assert.ok(hdfc.fileContent.includes('NEFT,00000034567890,62500.00'), 'Other bank marked as NEFT');
console.log('✓ HDFC Salary CSV format with FT/NEFT classification verified.');

// 2. ICICI Corporate CSV Tests
console.log('\n--- Test Suite 2: ICICI Corporate Payout Format ---');
const icici = generateICICICorporateCSV({
  batchNumber: 'BATCH-202610-002',
  bankFormat: 'ICICI_CORPORATE_EXCEL',
  debitAccountNumber: '001105001234',
  recipients: testRecipients,
  valueDate: '2026-10-05',
});

assert.strictEqual(icici.totalRecords, 2);
assert.strictEqual(icici.totalAmount, '107500.50');
assert.ok(icici.fileContent.includes('PYMT_PROD_TYPE_CODE,PYMT_MODE,DEBIT_ACC_NO'));
assert.ok(icici.fileContent.includes('CMS,NEFT,001105001234,Aarav Sharma'));
console.log('✓ ICICI Corporate Payout file structure verified.');

// 3. SBI CMS Tests
console.log('\n--- Test Suite 3: SBI CMS Payout Format ---');
const sbi = generateSBICMSCSV({
  batchNumber: 'BATCH-202610-003',
  bankFormat: 'SBI_CMS',
  clientCode: 'PAYDOCSBI',
  debitAccountNumber: '30001234567',
  recipients: testRecipients,
  valueDate: '2026-10-05',
});

assert.strictEqual(sbi.totalRecords, 2);
assert.strictEqual(sbi.totalAmount, '107500.50');
assert.ok(sbi.fileContent.includes('Client Code,Debit Account Number'));
assert.ok(sbi.fileContent.includes('PAYDOCSBI,30001234567'));
console.log('✓ SBI CMS Payout file structure verified.');

// 4. Standard NEFT CSV Tests
console.log('\n--- Test Suite 4: Standard RBI NEFT Format ---');
const neft = generateStandardNEFTCSV({
  batchNumber: 'BATCH-202610-004',
  bankFormat: 'STANDARD_NEFT_CSV',
  debitAccountNumber: '1234567890',
  recipients: testRecipients,
  valueDate: '2026-10-05',
});

assert.strictEqual(neft.totalRecords, 2);
assert.strictEqual(neft.totalAmount, '107500.50');
assert.ok(neft.fileContent.includes('Beneficiary Name,Account Number,IFSC Code,Amount'));
console.log('✓ Standard NEFT CSV format verified.');

// 5. UTR Reconciliation Engine Tests
console.log('\n--- Test Suite 5: Deterministic UTR Reconciliation Engine ---');
const batchItems = [
  { id: 'bi-001', payment_id: 'pay-001', account_number: '50100234567890', amount: '45000.50', status: 'pending' },
  { id: 'bi-002', payment_id: 'pay-002', account_number: '00000034567890', amount: '62500.00', status: 'pending' },
];

const reconData = [
  {
    accountNumber: '50100234567890',
    amount: '45000.50',
    utrNumber: 'HDFCN26100512345',
    status: 'SUCCESS' as const,
  },
  {
    accountNumber: '00000034567890',
    amount: '62500.00',
    utrNumber: 'SBIN26100567890',
    status: 'SUCCESS' as const,
  },
  {
    accountNumber: '99999999999999', // Unknown account
    amount: '10000.00',
    utrNumber: 'UNMATCHED001',
    status: 'SUCCESS' as const,
  },
];

const reconResult = reconcileBatchItems(batchItems, reconData);
assert.strictEqual(reconResult.matched.length, 2);
assert.strictEqual(reconResult.matched[0].utrNumber, 'HDFCN26100512345');
assert.strictEqual(reconResult.matched[0].status, 'paid');
assert.strictEqual(reconResult.unmatched.length, 1);
assert.strictEqual(reconResult.unmatched[0].utrNumber, 'UNMATCHED001');
console.log('✓ Reconciliation accurately matched records and identified unmatched items.');

console.log('\n============================================================');
console.log('   ALL PHASE 4 BANKING & RECONCILIATION TESTS PASSED!');
console.log('============================================================\n');
