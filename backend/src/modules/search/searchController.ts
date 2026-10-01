import { Request, Response } from 'express';
import { supabaseAdmin } from '../../config/supabase';

export async function globalSearch(req: Request, res: Response) {
  try {
    const orgId = req.organizationId;
    const { q } = req.query;

    if (!q || typeof q !== 'string' || q.trim().length === 0) {
      return res.json({ results: [] });
    }

    const term = q.trim();

    const [
      { data: employees },
      { data: invoices },
      { data: payments },
      { data: documents },
    ] = await Promise.all([
      supabaseAdmin
        .from('employees')
        .select('id, employee_id, first_name, last_name, designation')
        .eq('organization_id', orgId)
        .or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,employee_id.ilike.%${term}%`)
        .limit(5),
      supabaseAdmin
        .from('invoices')
        .select('id, invoice_number, vendor_name, total_amount, status')
        .eq('organization_id', orgId)
        .or(`invoice_number.ilike.%${term}%,vendor_name.ilike.%${term}%`)
        .limit(5),
      supabaseAdmin
        .from('payments')
        .select('id, vendor_name, amount, payment_type, status')
        .eq('organization_id', orgId)
        .or(`vendor_name.ilike.%${term}%,reference_number.ilike.%${term}%`)
        .limit(5),
      supabaseAdmin
        .from('documents')
        .select('id, file_name, document_type')
        .eq('organization_id', orgId)
        .ilike('file_name', `%${term}%`)
        .limit(5),
    ]);

    const results = [
      ...(employees || []).map(e => ({
        type: 'employee',
        id: e.id,
        title: `${e.first_name} ${e.last_name}`,
        subtitle: `${e.employee_id} • ${e.designation}`,
        link: `/employees/${e.id}`,
      })),
      ...(invoices || []).map(i => ({
        type: 'invoice',
        id: i.id,
        title: `${i.invoice_number} — ${i.vendor_name}`,
        subtitle: `₹${Number(i.total_amount).toLocaleString('en-IN')} • Status: ${i.status}`,
        link: `/invoices/${i.id}`,
      })),
      ...(payments || []).map(p => ({
        type: 'payment',
        id: p.id,
        title: `Payment: ${p.vendor_name || 'Beneficiary'}`,
        subtitle: `₹${Number(p.amount).toLocaleString('en-IN')} (${p.payment_type})`,
        link: `/payments`,
      })),
      ...(documents || []).map(d => ({
        type: 'document',
        id: d.id,
        title: d.file_name,
        subtitle: `Category: ${d.document_type}`,
        link: `/documents/${d.id}`,
      })),
    ];

    res.json({ results });
  } catch (err: any) {
    console.error('globalSearch error:', err);
    res.status(500).json({ error: err.message });
  }
}
