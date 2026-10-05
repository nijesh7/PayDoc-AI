import { Decimal } from '../payroll/decimal';

export interface PayoutRecipient {
  paymentId: string;
  employeeId?: string;
  beneficiaryName: string;
  accountNumber: string;
  ifscCode: string;
  amount: number | string;
  email?: string;
  narration?: string;
  paymentType?: 'salary' | 'vendor' | 'invoice';
}

export interface PayoutBatchGenerationInput {
  batchNumber: string;
  bankFormat: 'HDFC_SALARY_CSV' | 'ICICI_CORPORATE_EXCEL' | 'SBI_CMS' | 'STANDARD_NEFT_CSV';
  debitAccountNumber: string;
  clientCode?: string;
  recipients: PayoutRecipient[];
  valueDate?: string; // YYYY-MM-DD
}

export interface PayoutBatchResult {
  fileName: string;
  fileContent: string;
  mimeType: string;
  totalRecords: number;
  totalAmount: string;
  batchNumber: string;
}

export interface ReconciliationRow {
  accountNumber: string;
  amount: number | string;
  utrNumber: string;
  status: 'SUCCESS' | 'FAILED' | 'RETURNED';
  failureReason?: string;
}

/**
 * Format date to DD/MM/YYYY or YYYY-MM-DD
 */
function formatDateDDMMYYYY(dateStr?: string): string {
  const d = dateStr ? new Date(dateStr) : new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Clean strings for bank CSV / flat files (remove commas, newlines)
 */
function sanitizeBankField(val?: string): string {
  if (!val) return '';
  return val.replace(/[\r\n,"]/g, ' ').trim();
}

/**
 * 1. HDFC Bank Salary Upload CSV Format.
 *
 * Header:
 * Transaction Type,Beneficiary Account No,Amount,Narration,Beneficiary Name,IFSC,Email,Transaction Date
 *
 * Rules:
 * - Transaction Type: 'FT' for HDFC accounts (IFSC starts with HDFC), 'NEFT' for other banks.
 * - Amount: exact 2 decimals.
 */
export function generateHDFCSalaryCSV(input: PayoutBatchGenerationInput): PayoutBatchResult {
  const rows: string[] = [];
  rows.push('Transaction Type,Beneficiary Account No,Amount,Narration,Beneficiary Name,IFSC,Email,Transaction Date');

  let totalAmountDec = new Decimal(0);
  const txnDate = formatDateDDMMYYYY(input.valueDate);

  for (const r of input.recipients) {
    const amtDec = new Decimal(r.amount);
    totalAmountDec = totalAmountDec.plus(amtDec);

    const ifsc = (r.ifscCode || '').trim().toUpperCase();
    const isInternalHDFC = ifsc.startsWith('HDFC');
    const txnType = isInternalHDFC ? 'FT' : 'NEFT';

    const line = [
      txnType,
      sanitizeBankField(r.accountNumber),
      amtDec.toFixed(2),
      sanitizeBankField(r.narration || 'Salary Payout'),
      sanitizeBankField(r.beneficiaryName),
      ifsc,
      sanitizeBankField(r.email || ''),
      txnDate,
    ].join(',');

    rows.push(line);
  }

  const fileName = `${input.batchNumber}_HDFC_Payout.csv`;
  return {
    fileName,
    fileContent: rows.join('\r\n'),
    mimeType: 'text/csv',
    totalRecords: input.recipients.length,
    totalAmount: totalAmountDec.toFixed(2),
    batchNumber: input.batchNumber,
  };
}

/**
 * 2. ICICI Bank Corporate Payout Format (Corporate CMS CSV).
 *
 * Header:
 * PYMT_PROD_TYPE_CODE,PYMT_MODE,DEBIT_ACC_NO,BNFCY_NAME,BNFCY_ACC_NO,BNFCY_IFSC,AMOUNT,TXN_DATE,TXN_PAYABLE_AT,REMARKS
 */
export function generateICICICorporateCSV(input: PayoutBatchGenerationInput): PayoutBatchResult {
  const rows: string[] = [];
  rows.push('PYMT_PROD_TYPE_CODE,PYMT_MODE,DEBIT_ACC_NO,BNFCY_NAME,BNFCY_ACC_NO,BNFCY_IFSC,AMOUNT,TXN_DATE,TXN_PAYABLE_AT,REMARKS');

  let totalAmountDec = new Decimal(0);
  const txnDate = formatDateDDMMYYYY(input.valueDate);

  for (const r of input.recipients) {
    const amtDec = new Decimal(r.amount);
    totalAmountDec = totalAmountDec.plus(amtDec);

    const ifsc = (r.ifscCode || '').trim().toUpperCase();
    const isInternalICICI = ifsc.startsWith('ICIC');
    const pymtMode = isInternalICICI ? 'FT' : 'NEFT';

    const line = [
      'CMS',
      pymtMode,
      sanitizeBankField(input.debitAccountNumber),
      sanitizeBankField(r.beneficiaryName),
      sanitizeBankField(r.accountNumber),
      ifsc,
      amtDec.toFixed(2),
      txnDate,
      'MUMBAI',
      sanitizeBankField(r.narration || 'Salary Payout'),
    ].join(',');

    rows.push(line);
  }

  const fileName = `${input.batchNumber}_ICICI_Payout.csv`;
  return {
    fileName,
    fileContent: rows.join('\r\n'),
    mimeType: 'text/csv',
    totalRecords: input.recipients.length,
    totalAmount: totalAmountDec.toFixed(2),
    batchNumber: input.batchNumber,
  };
}

/**
 * 3. State Bank of India (SBI) CMS Bulk Upload Format.
 *
 * Header:
 * Client Code,Debit Account Number,Value Date,Txn Currency,Txn Amount,Beneficiary Name,Beneficiary Account,Beneficiary IFSC,Payment Details,Email ID
 */
export function generateSBICMSCSV(input: PayoutBatchGenerationInput): PayoutBatchResult {
  const rows: string[] = [];
  rows.push('Client Code,Debit Account Number,Value Date,Txn Currency,Txn Amount,Beneficiary Name,Beneficiary Account,Beneficiary IFSC,Payment Details,Email ID');

  let totalAmountDec = new Decimal(0);
  const txnDate = formatDateDDMMYYYY(input.valueDate);
  const clientCode = input.clientCode || 'SBIPAYDOC';

  for (const r of input.recipients) {
    const amtDec = new Decimal(r.amount);
    totalAmountDec = totalAmountDec.plus(amtDec);

    const line = [
      clientCode,
      sanitizeBankField(input.debitAccountNumber),
      txnDate,
      'INR',
      amtDec.toFixed(2),
      sanitizeBankField(r.beneficiaryName),
      sanitizeBankField(r.accountNumber),
      (r.ifscCode || '').trim().toUpperCase(),
      sanitizeBankField(r.narration || 'Salary Disbursement'),
      sanitizeBankField(r.email || ''),
    ].join(',');

    rows.push(line);
  }

  const fileName = `${input.batchNumber}_SBI_CMS_Payout.csv`;
  return {
    fileName,
    fileContent: rows.join('\r\n'),
    mimeType: 'text/csv',
    totalRecords: input.recipients.length,
    totalAmount: totalAmountDec.toFixed(2),
    batchNumber: input.batchNumber,
  };
}

/**
 * 4. Standard RBI NEFT / IMPS CSV Format.
 *
 * Header:
 * Beneficiary Name,Account Number,IFSC Code,Amount,Payment Mode,Narration,Date
 */
export function generateStandardNEFTCSV(input: PayoutBatchGenerationInput): PayoutBatchResult {
  const rows: string[] = [];
  rows.push('Beneficiary Name,Account Number,IFSC Code,Amount,Payment Mode,Narration,Date');

  let totalAmountDec = new Decimal(0);
  const txnDate = formatDateDDMMYYYY(input.valueDate);

  for (const r of input.recipients) {
    const amtDec = new Decimal(r.amount);
    totalAmountDec = totalAmountDec.plus(amtDec);

    const line = [
      sanitizeBankField(r.beneficiaryName),
      sanitizeBankField(r.accountNumber),
      (r.ifscCode || '').trim().toUpperCase(),
      amtDec.toFixed(2),
      'NEFT',
      sanitizeBankField(r.narration || 'Monthly Payout'),
      txnDate,
    ].join(',');

    rows.push(line);
  }

  const fileName = `${input.batchNumber}_Standard_NEFT.csv`;
  return {
    fileName,
    fileContent: rows.join('\r\n'),
    mimeType: 'text/csv',
    totalRecords: input.recipients.length,
    totalAmount: totalAmountDec.toFixed(2),
    batchNumber: input.batchNumber,
  };
}

/**
 * Universal Payout Batch Dispatcher
 */
export function generatePayoutBatchFile(input: PayoutBatchGenerationInput): PayoutBatchResult {
  switch (input.bankFormat) {
    case 'HDFC_SALARY_CSV':
      return generateHDFCSalaryCSV(input);
    case 'ICICI_CORPORATE_EXCEL':
      return generateICICICorporateCSV(input);
    case 'SBI_CMS':
      return generateSBICMSCSV(input);
    case 'STANDARD_NEFT_CSV':
    default:
      return generateStandardNEFTCSV(input);
  }
}

/**
 * Deterministic UTR Reconciliation Engine.
 *
 * Matches incoming bank statement/UTR rows with pending batch items by account number and exact amount.
 */
export function reconcileBatchItems(
  batchItems: Array<{
    id: string;
    payment_id: string;
    account_number: string;
    amount: number | string;
    status: string;
  }>,
  reconciliationData: ReconciliationRow[]
): {
  matched: Array<{
    batchItemId: string;
    paymentId: string;
    utrNumber: string;
    status: 'paid' | 'failed';
    failureReason?: string;
  }>;
  unmatched: ReconciliationRow[];
} {
  const matched = [];
  const unmatched = [];

  // Create lookup map keyed by normalized `accountNumber_amount`
  const itemMap = new Map<string, typeof batchItems[0]>();
  for (const item of batchItems) {
    const key = `${item.account_number.trim()}_${new Decimal(item.amount).toFixed(2)}`;
    itemMap.set(key, item);
  }

  for (const row of reconciliationData) {
    const key = `${row.accountNumber.trim()}_${new Decimal(row.amount).toFixed(2)}`;
    const foundItem = itemMap.get(key);

    if (foundItem) {
      matched.push({
        batchItemId: foundItem.id,
        paymentId: foundItem.payment_id,
        utrNumber: row.utrNumber,
        status: (row.status === 'SUCCESS' ? 'paid' : 'failed') as 'paid' | 'failed',
        failureReason: row.failureReason,
      });
      itemMap.delete(key); // consume
    } else {
      unmatched.push(row);
    }
  }

  return { matched, unmatched };
}
