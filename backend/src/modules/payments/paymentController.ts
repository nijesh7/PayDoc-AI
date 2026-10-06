import { Request, Response } from 'express';
import { supabaseAdmin } from '../../config/supabase';

export async function listPayments(req: Request, res: Response) {
  try {
    const orgId = req.organizationId;
    const { payment_type, status, search } = req.query;

    let query = supabaseAdmin
      .from('payments')
      .select('*, employees(first_name, last_name, employee_id), invoices(invoice_number, vendor_name)')
      .eq('organization_id', orgId)
      .order('due_date', { ascending: true });

    if (payment_type) query = query.eq('payment_type', payment_type);
    if (status) query = query.eq('status', status);
    if (search) {
      query = query.or(`vendor_name.ilike.%${search}%,reference_number.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json({ payments: data || [] });
  } catch (err: any) {
    console.error('listPayments error:', err);
    res.status(500).json({ error: err.message });
  }
}

export async function recordPayment(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const orgId = req.organizationId;
    const { payment_method, reference_number, payment_date, notes, receipt_document_id } = req.body;

    const { data: payment, error } = await supabaseAdmin
      .from('payments')
      .update({
        status: 'paid',
        payment_method: payment_method || 'bank_transfer',
        reference_number: reference_number || null,
        payment_date: payment_date || new Date().toISOString().split('T')[0],
        notes: notes || null,
        receipt_document_id: receipt_document_id || null,
      })
      .eq('id', id)
      .eq('organization_id', orgId)
      .select()
      .single();

    if (error) throw error;

    // If linked to a payroll_item, update item status
    if (payment.payroll_item_id) {
      await supabaseAdmin
        .from('payroll_items')
        .update({ status: 'paid' })
        .eq('id', payment.payroll_item_id);
    }

    // If linked to an invoice, update invoice status
    if (payment.invoice_id) {
      await supabaseAdmin
        .from('invoices')
        .update({ status: 'paid' })
        .eq('id', payment.invoice_id);
    }

    res.json({ payment, message: 'Payment recorded as paid successfully' });
  } catch (err: any) {
    console.error('recordPayment error:', err);
    res.status(500).json({ error: err.message });
  }
}

export async function getPaymentSummary(req: Request, res: Response) {
  try {
    const orgId = req.organizationId;

    const { data: payments, error } = await supabaseAdmin
      .from('payments')
      .select('amount, status, payment_type')
      .eq('organization_id', orgId);

    if (error) throw error;

    const summary = {
      totalPaid: 0,
      totalPending: 0,
      totalOverdue: 0,
      totalDueSoon: 0,
      salaryPending: 0,
      invoicePending: 0,
    };

    for (const p of payments || []) {
      const amt = Number(p.amount) || 0;
      if (p.status === 'paid') summary.totalPaid += amt;
      if (p.status === 'pending') {
        summary.totalPending += amt;
        if (p.payment_type === 'salary') summary.salaryPending += amt;
        if (p.payment_type === 'invoice') summary.invoicePending += amt;
      }
      if (p.status === 'overdue') summary.totalOverdue += amt;
      if (p.status === 'due_soon') summary.totalDueSoon += amt;
    }

    res.json({ summary });
  } catch (err: any) {
    console.error('getPaymentSummary error:', err);
    res.status(500).json({ error: err.message });
  }
}

export async function createPayment(req: Request, res: Response) {
  try {
    const orgId = req.organizationId;
    const {
      payment_type = 'other',
      vendor_name,
      employee_id,
      amount,
      due_date = new Date().toISOString().split('T')[0],
      payment_date,
      status = 'pending',
      payment_method = 'bank_transfer',
      reference_number,
      notes,
    } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Valid amount is required.' });
    }

    const { data: newPayment, error } = await supabaseAdmin
      .from('payments')
      .insert({
        organization_id: orgId,
        payment_type,
        vendor_name: vendor_name || null,
        employee_id: employee_id || null,
        amount: Number(amount),
        due_date,
        payment_date: status === 'paid' ? (payment_date || due_date) : null,
        status,
        payment_method: status === 'paid' ? payment_method : null,
        reference_number: reference_number || null,
        notes: notes || null,
      })
      .select('*, employees(first_name, last_name, employee_id)')
      .single();

    if (error) throw error;

    res.status(201).json({ payment: newPayment, message: 'Payment created successfully.' });
  } catch (err: any) {
    console.error('createPayment error:', err);
    res.status(500).json({ error: err.message });
  }
}

