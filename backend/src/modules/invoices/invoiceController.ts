import { Request, Response } from 'express';
import { supabaseAdmin } from '../../config/supabase';

export async function listInvoices(req: Request, res: Response) {
  try {
    const orgId = req.organizationId;
    const { status, search } = req.query;

    let query = supabaseAdmin
      .from('invoices')
      .select('*, invoice_items(*)')
      .eq('organization_id', orgId)
      .order('due_date', { ascending: true });

    if (status) query = query.eq('status', status);
    if (search) {
      query = query.or(`invoice_number.ilike.%${search}%,vendor_name.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json({ invoices: data || [] });
  } catch (err: any) {
    console.error('listInvoices error:', err);
    res.status(500).json({ error: err.message });
  }
}

export async function getInvoice(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const orgId = req.organizationId;

    const { data: invoice, error } = await supabaseAdmin
      .from('invoices')
      .select('*, invoice_items(*), documents(*)')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (error || !invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json({ invoice });
  } catch (err: any) {
    console.error('getInvoice error:', err);
    res.status(500).json({ error: err.message });
  }
}

export async function createInvoice(req: Request, res: Response) {
  try {
    const orgId = req.organizationId;
    const {
      invoice_number,
      vendor_name,
      customer_name,
      invoice_date,
      due_date,
      subtotal,
      tax_amount,
      discount_amount,
      total_amount,
      document_id,
      notes,
      items,
    } = req.body;

    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from('invoices')
      .insert({
        organization_id: orgId,
        document_id: document_id || null,
        invoice_number,
        vendor_name,
        customer_name: customer_name || null,
        invoice_date: invoice_date || new Date().toISOString().split('T')[0],
        due_date: due_date || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
        subtotal: subtotal || 0,
        tax_amount: tax_amount || 0,
        discount_amount: discount_amount || 0,
        total_amount: total_amount || (subtotal + tax_amount - (discount_amount || 0)),
        status: 'pending',
        notes: notes || null,
      })
      .select()
      .single();

    if (invoiceError || !invoice) throw invoiceError;

    // Insert line items
    if (items && Array.isArray(items) && items.length > 0) {
      const lineItemsToInsert = items.map((item: any) => ({
        invoice_id: invoice.id,
        organization_id: orgId,
        description: item.description,
        quantity: item.quantity || 1,
        unit_price: item.unit_price || item.unitPrice || 0,
        total_price: item.total_price || item.totalPrice || (item.quantity * item.unit_price),
      }));

      await supabaseAdmin.from('invoice_items').insert(lineItemsToInsert);
    }

    // Auto-create invoice payment reminder
    await supabaseAdmin.from('reminders').insert({
      organization_id: orgId,
      title: `Invoice ${invoice_number} from ${vendor_name} is Due on ${invoice.due_date}`,
      reminder_type: 'invoice_due',
      due_date: invoice.due_date,
      target_entity_type: 'invoices',
      target_entity_id: invoice.id,
      status: 'active',
    });

    res.status(201).json({ invoice });
  } catch (err: any) {
    console.error('createInvoice error:', err);
    res.status(500).json({ error: err.message });
  }
}

export async function updateInvoiceStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const orgId = req.organizationId;

    const { data: invoice, error } = await supabaseAdmin
      .from('invoices')
      .update({ status })
      .eq('id', id)
      .eq('organization_id', orgId)
      .select()
      .single();

    if (error) throw error;
    res.json({ invoice });
  } catch (err: any) {
    console.error('updateInvoiceStatus error:', err);
    res.status(500).json({ error: err.message });
  }
}
