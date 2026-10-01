import { Request, Response } from 'express';
import { supabaseAdmin } from '../../config/supabase';
import { aiProvider } from '../../services/ai';

export async function askBusinessAssistant(req: Request, res: Response) {
  try {
    const orgId = req.organizationId;
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    // 1. Gather factual live database context for this organization
    const [
      { data: org },
      { data: employees },
      { data: latestPayroll },
      { data: pendingPayments },
      { data: overdueInvoices },
      { data: activeReminders },
    ] = await Promise.all([
      supabaseAdmin.from('organizations').select('name, currency').eq('id', orgId).single(),
      supabaseAdmin.from('employees').select('id, employee_id, first_name, last_name, designation, basic_salary, status').eq('organization_id', orgId),
      supabaseAdmin.from('payroll_runs').select('*').eq('organization_id', orgId).order('year', { ascending: false }).order('month', { ascending: false }).limit(1),
      supabaseAdmin.from('payments').select('id, payment_type, vendor_name, amount, due_date, status').eq('organization_id', orgId).eq('status', 'pending'),
      supabaseAdmin.from('invoices').select('id, invoice_number, vendor_name, total_amount, due_date, status').eq('organization_id', orgId).eq('status', 'overdue'),
      supabaseAdmin.from('reminders').select('id, title, reminder_type, due_date, status').eq('organization_id', orgId).eq('status', 'active'),
    ]);

    const activeEmployeesCount = (employees || []).filter(e => e.status === 'active').length;
    const totalPendingPaymentsAmount = (pendingPayments || []).reduce((acc, p) => acc + Number(p.amount), 0);
    const totalOverdueInvoicesAmount = (overdueInvoices || []).reduce((acc, i) => acc + Number(i.total_amount), 0);

    const factualContext = `
Organization: ${org?.name || 'Acme Technologies Pvt Ltd'} (Currency: ${org?.currency || 'INR'})
Total Employees: ${(employees || []).length} (${activeEmployeesCount} Active)

Latest Payroll Run:
- Status: ${latestPayroll?.[0]?.status || 'No runs yet'}
- Pay Period: ${latestPayroll?.[0] ? `${latestPayroll[0].month}/${latestPayroll[0].year}` : 'N/A'}
- Total Net Salary: ₹${Number(latestPayroll?.[0]?.total_net_salary || 0).toLocaleString('en-IN')}
- Total Employees in Run: ${latestPayroll?.[0]?.total_employees || 0}

Pending Payments (${(pendingPayments || []).length} items, Total: ₹${totalPendingPaymentsAmount.toLocaleString('en-IN')}):
${(pendingPayments || []).slice(0, 10).map(p => `- ${p.vendor_name || 'Payment'}: ₹${Number(p.amount).toLocaleString('en-IN')} (Due: ${p.due_date}, Type: ${p.payment_type})`).join('\n') || 'None'}

Overdue Invoices (${(overdueInvoices || []).length} items, Total: ₹${totalOverdueInvoicesAmount.toLocaleString('en-IN')}):
${(overdueInvoices || []).slice(0, 10).map(i => `- ${i.invoice_number} from ${i.vendor_name}: ₹${Number(i.total_amount).toLocaleString('en-IN')} (Was due on ${i.due_date})`).join('\n') || 'None'}

Active Deadlines & Reminders:
${(activeReminders || []).slice(0, 10).map(r => `- ${r.title} (Due: ${r.due_date})`).join('\n') || 'None'}
`;

    // 2. Query AI Provider with verified facts
    const answer = await aiProvider.askBusinessAssistant(factualContext, question);

    res.json({
      answer,
      contextSummary: {
        activeEmployeesCount,
        totalPendingPaymentsAmount,
        totalOverdueInvoicesAmount,
      },
    });
  } catch (err: any) {
    console.error('askBusinessAssistant error:', err);
    res.status(500).json({ error: err.message });
  }
}
