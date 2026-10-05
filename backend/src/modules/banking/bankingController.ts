import { Request, Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../../config/supabase';
import { logAuditTrail } from '../../services/audit/auditService';
import {
  generatePayoutBatchFile,
  reconcileBatchItems,
  PayoutRecipient,
  ReconciliationRow,
} from '../../services/banking/payoutFileGenerator';

const createBankAccountSchema = z.object({
  bank_name: z.string().min(2),
  account_number: z.string().min(5),
  ifsc_code: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid Indian IFSC code format'),
  branch_name: z.string().optional(),
  account_type: z.enum(['current', 'salary_disbursement', 'escrow']).default('current'),
  client_code: z.string().optional(),
  is_primary: z.boolean().default(true),
});

const generateBatchSchema = z.object({
  bank_format: z.enum(['HDFC_SALARY_CSV', 'ICICI_CORPORATE_EXCEL', 'SBI_CMS', 'STANDARD_NEFT_CSV']),
  organization_bank_account_id: z.string().uuid().optional(),
  payroll_run_id: z.string().uuid().optional(),
  payment_ids: z.array(z.string().uuid()).optional(),
  value_date: z.string().optional(),
});

const reconcileBatchSchema = z.object({
  reconciliation_rows: z.array(
    z.object({
      account_number: z.string(),
      amount: z.union([z.number(), z.string()]),
      utr_number: z.string().min(3),
      status: z.enum(['SUCCESS', 'FAILED', 'RETURNED']).default('SUCCESS'),
      failure_reason: z.string().optional(),
    })
  ),
});

/**
 * 1. List Organization Corporate Bank Accounts
 */
export async function listBankAccounts(req: Request, res: Response) {
  try {
    const orgId = req.organizationId;
    const { data, error } = await supabaseAdmin
      .from('organization_bank_accounts')
      .select('*')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .order('is_primary', { ascending: false });

    if (error) throw error;
    res.json({ bankAccounts: data || [] });
  } catch (err: any) {
    console.error('listBankAccounts error:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * 2. Create Corporate Bank Account
 */
export async function createBankAccount(req: Request, res: Response) {
  try {
    const orgId = req.organizationId;
    const parsed = createBankAccountSchema.parse(req.body);

    if (parsed.is_primary) {
      // Unset previous primary accounts
      await supabaseAdmin
        .from('organization_bank_accounts')
        .update({ is_primary: false })
        .eq('organization_id', orgId);
    }

    const { data, error } = await supabaseAdmin
      .from('organization_bank_accounts')
      .insert({
        organization_id: orgId,
        bank_name: parsed.bank_name,
        account_number: parsed.account_number,
        ifsc_code: parsed.ifsc_code.toUpperCase(),
        branch_name: parsed.branch_name || null,
        account_type: parsed.account_type,
        client_code: parsed.client_code || null,
        is_primary: parsed.is_primary,
      })
      .select()
      .single();

    if (error) throw error;

    await logAuditTrail(req, {
      action: 'ORGANIZATION_BANK_ACCOUNT_CREATED',
      entity_type: 'organization_bank_accounts',
      entity_id: data.id,
      new_values: data,
    });

    res.status(201).json({ bankAccount: data });
  } catch (err: any) {
    console.error('createBankAccount error:', err);
    res.status(400).json({ error: err.message });
  }
}

/**
 * 3. Generate Bank Payout Batch & Download File
 */
export async function generatePayoutBatch(req: Request, res: Response) {
  try {
    const orgId = req.organizationId;
    const actorId = req.user?.id;
    const parsed = generateBatchSchema.parse(req.body);

    // 1. Resolve corporate debit bank account
    let bankAccount;
    if (parsed.organization_bank_account_id) {
      const { data } = await supabaseAdmin
        .from('organization_bank_accounts')
        .select('*')
        .eq('id', parsed.organization_bank_account_id)
        .eq('organization_id', orgId)
        .single();
      bankAccount = data;
    } else {
      const { data } = await supabaseAdmin
        .from('organization_bank_accounts')
        .select('*')
        .eq('organization_id', orgId)
        .eq('is_primary', true)
        .single();
      bankAccount = data;
    }

    if (!bankAccount) {
      return res.status(400).json({
        error: 'No corporate disbursement bank account found. Please register an organization bank account first.',
      });
    }

    // 2. Fetch pending payments / payroll items
    let recipients: PayoutRecipient[] = [];
    let paymentsToUpdate: any[] = [];

    if (parsed.payroll_run_id) {
      // Fetch approved payroll items for run
      const { data: runItems, error: piErr } = await supabaseAdmin
        .from('payroll_items')
        .select('*, employee:employees(*)')
        .eq('payroll_run_id', parsed.payroll_run_id)
        .eq('organization_id', orgId);

      if (piErr) throw piErr;

      // Find or create associated payments in payments table
      for (const item of runItems || []) {
        const emp = item.employee;
        if (!emp?.bank_account_number || !emp?.bank_ifsc) continue;

        // Check if payment row already exists
        const { data: existingPayment } = await supabaseAdmin
          .from('payments')
          .select('*')
          .eq('payroll_item_id', item.id)
          .eq('organization_id', orgId)
          .maybeSingle();

        let paymentId: string;
        if (existingPayment) {
          paymentId = existingPayment.id;
          paymentsToUpdate.push(existingPayment);
        } else {
          // Insert payment record
          const { data: newPay, error: payErr } = await supabaseAdmin
            .from('payments')
            .insert({
              organization_id: orgId,
              payment_type: 'salary',
              payroll_item_id: item.id,
              employee_id: emp.id,
              amount: item.net_salary,
              due_date: new Date().toISOString().split('T')[0],
              status: 'pending',
              beneficiary_name: `${emp.first_name} ${emp.last_name}`,
              beneficiary_account: emp.bank_account_number,
              beneficiary_ifsc: emp.bank_ifsc,
            })
            .select()
            .single();

          if (payErr || !newPay) continue;
          paymentId = newPay.id;
          paymentsToUpdate.push(newPay);
        }

        recipients.push({
          paymentId,
          employeeId: emp.id,
          beneficiaryName: `${emp.first_name} ${emp.last_name}`,
          accountNumber: emp.bank_account_number,
          ifscCode: emp.bank_ifsc,
          amount: item.net_salary,
          email: emp.email,
          narration: `Salary for ${item.payroll_runs?.month || 'Period'}`,
          paymentType: 'salary',
        });
      }
    } else if (parsed.payment_ids && parsed.payment_ids.length > 0) {
      const { data: payments, error: pErr } = await supabaseAdmin
        .from('payments')
        .select('*, employee:employees(*)')
        .in('id', parsed.payment_ids)
        .eq('organization_id', orgId);

      if (pErr) throw pErr;

      for (const p of payments || []) {
        const emp = p.employee;
        const acct = p.beneficiary_account || emp?.bank_account_number;
        const ifsc = p.beneficiary_ifsc || emp?.bank_ifsc;
        const name = p.beneficiary_name || (emp ? `${emp.first_name} ${emp.last_name}` : p.vendor_name);

        if (!acct || !ifsc) continue;

        recipients.push({
          paymentId: p.id,
          employeeId: p.employee_id,
          beneficiaryName: name,
          accountNumber: acct,
          ifscCode: ifsc,
          amount: p.amount,
          email: emp?.email,
          narration: p.notes || 'Payment Disbursement',
          paymentType: p.payment_type,
        });
        paymentsToUpdate.push(p);
      }
    }

    if (recipients.length === 0) {
      return res.status(400).json({
        error: 'No valid recipient records with complete bank account number and IFSC code found.',
      });
    }

    // 3. Generate batch number & payout file content
    const batchNumber = `BATCH-${new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14)}`;

    const fileResult = generatePayoutBatchFile({
      batchNumber,
      bankFormat: parsed.bank_format,
      debitAccountNumber: bankAccount.account_number,
      clientCode: bankAccount.client_code || undefined,
      recipients,
      valueDate: parsed.value_date,
    });

    // 4. Save bank_payout_batches record
    const { data: batch, error: bErr } = await supabaseAdmin
      .from('bank_payout_batches')
      .insert({
        organization_id: orgId,
        batch_number: batchNumber,
        bank_format: parsed.bank_format,
        payment_type: parsed.payroll_run_id ? 'salary' : 'mixed',
        payroll_run_id: parsed.payroll_run_id || null,
        organization_bank_account_id: bankAccount.id,
        total_records: fileResult.totalRecords,
        total_amount: fileResult.totalAmount,
        status: 'generated',
        file_content: fileResult.fileContent,
        file_name: fileResult.fileName,
        generated_by: actorId,
      })
      .select()
      .single();

    if (bErr || !batch) throw bErr;

    // 5. Insert batch items
    const batchItemRows = recipients.map((r) => ({
      organization_id: orgId,
      batch_id: batch.id,
      payment_id: r.paymentId,
      employee_id: r.employeeId || null,
      beneficiary_name: r.beneficiaryName,
      account_number: r.accountNumber,
      ifsc_code: r.ifscCode,
      amount: r.amount,
      status: 'pending',
    }));

    const { error: biErr } = await supabaseAdmin
      .from('bank_payout_batch_items')
      .insert(batchItemRows);

    if (biErr) throw biErr;

    // 6. Update payment records status to 'processing'
    const paymentIds = recipients.map((r) => r.paymentId);
    await supabaseAdmin
      .from('payments')
      .update({
        status: 'processing',
        payment_method: 'bank_transfer',
        updated_at: new Date().toISOString(),
      })
      .in('id', paymentIds)
      .eq('organization_id', orgId);

    await logAuditTrail(req, {
      action: 'BANK_PAYOUT_BATCH_GENERATED',
      entity_type: 'bank_payout_batches',
      entity_id: batch.id,
      new_values: {
        batchNumber,
        format: parsed.bank_format,
        totalRecords: fileResult.totalRecords,
        totalAmount: fileResult.totalAmount,
      },
    });

    res.status(201).json({
      batch,
      fileResult,
    });
  } catch (err: any) {
    console.error('generatePayoutBatch error:', err);
    res.status(400).json({ error: err.message });
  }
}

/**
 * 4. List Bank Payout Batches
 */
export async function listPayoutBatches(req: Request, res: Response) {
  try {
    const orgId = req.organizationId;
    const { data, error } = await supabaseAdmin
      .from('bank_payout_batches')
      .select('*, organization_bank_account:organization_bank_accounts(bank_name, account_number), generator:users(full_name)')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ batches: data || [] });
  } catch (err: any) {
    console.error('listPayoutBatches error:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * 5. Get Payout Batch Detail & Line Items
 */
export async function getPayoutBatch(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const orgId = req.organizationId;

    const { data: batch, error: bErr } = await supabaseAdmin
      .from('bank_payout_batches')
      .select('*, organization_bank_account:organization_bank_accounts(*), generator:users(full_name)')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (bErr || !batch) {
      return res.status(404).json({ error: 'Payout batch not found' });
    }

    const { data: items, error: iErr } = await supabaseAdmin
      .from('bank_payout_batch_items')
      .select('*, employee:employees(id, first_name, last_name, employee_id)')
      .eq('batch_id', id)
      .eq('organization_id', orgId);

    if (iErr) throw iErr;

    res.json({ batch, items: items || [] });
  } catch (err: any) {
    console.error('getPayoutBatch error:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * 6. Reconcile Payout Batch with Bank Statement / UTR Records
 */
export async function reconcilePayoutBatch(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const orgId = req.organizationId;
    const actorId = req.user?.id;
    const parsed = reconcileBatchSchema.parse(req.body);

    // Fetch batch & pending items
    const { data: batch, error: bErr } = await supabaseAdmin
      .from('bank_payout_batches')
      .select('*')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (bErr || !batch) {
      return res.status(404).json({ error: 'Payout batch not found' });
    }

    const { data: items, error: iErr } = await supabaseAdmin
      .from('bank_payout_batch_items')
      .select('*')
      .eq('batch_id', id)
      .eq('organization_id', orgId);

    if (iErr) throw iErr;

    const reconRows: ReconciliationRow[] = parsed.reconciliation_rows.map((r) => ({
      accountNumber: r.account_number,
      amount: r.amount,
      utrNumber: r.utr_number,
      status: r.status,
      failureReason: r.failure_reason,
    }));

    // Reconcile items
    const { matched, unmatched } = reconcileBatchItems(items || [], reconRows);

    const now = new Date().toISOString();
    const today = now.split('T')[0];

    // Update matched batch items and payments
    for (const m of matched) {
      await supabaseAdmin
        .from('bank_payout_batch_items')
        .update({
          status: m.status === 'paid' ? 'processed' : 'failed',
          utr_number: m.utrNumber,
          error_message: m.failureReason || null,
          updated_at: now,
        })
        .eq('id', m.batchItemId);

      await supabaseAdmin
        .from('payments')
        .update({
          status: m.status,
          utr_number: m.utrNumber,
          reference_number: m.utrNumber,
          payment_date: m.status === 'paid' ? today : null,
          failure_reason: m.failureReason || null,
          updated_at: now,
        })
        .eq('id', m.paymentId);
    }

    // Check if entire batch is reconciled
    const { data: updatedItems } = await supabaseAdmin
      .from('bank_payout_batch_items')
      .select('status')
      .eq('batch_id', id);

    const totalCount = updatedItems?.length || 0;
    const processedCount = updatedItems?.filter((i) => i.status === 'processed').length || 0;
    const isFull = totalCount > 0 && processedCount === totalCount;

    const newBatchStatus = isFull ? 'reconciled' : 'partially_reconciled';

    await supabaseAdmin
      .from('bank_payout_batches')
      .update({
        status: newBatchStatus,
        reconciled_at: now,
        reconciled_by: actorId,
        updated_at: now,
      })
      .eq('id', id);

    await logAuditTrail(req, {
      action: 'BANK_PAYOUT_BATCH_RECONCILED',
      entity_type: 'bank_payout_batches',
      entity_id: id,
      new_values: {
        matchedCount: matched.length,
        unmatchedCount: unmatched.length,
        batchStatus: newBatchStatus,
      },
    });

    res.json({
      success: true,
      matchedCount: matched.length,
      unmatchedCount: unmatched.length,
      batchStatus: newBatchStatus,
      unmatched,
    });
  } catch (err: any) {
    console.error('reconcilePayoutBatch error:', err);
    res.status(400).json({ error: err.message });
  }
}
