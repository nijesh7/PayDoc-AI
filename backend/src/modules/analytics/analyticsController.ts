import { Request, Response } from 'express';
import { supabaseAdmin } from '../../config/supabase';

export async function getDashboardOverview(req: Request, res: Response) {
  try {
    const orgId = req.organizationId;

    const [
      { data: employees },
      { data: latestPayroll },
      { data: payments },
      { data: invoices },
      { data: documents },
      { data: reminders },
    ] = await Promise.all([
      supabaseAdmin.from('employees').select('id, status, basic_salary, department_id, departments(name)').eq('organization_id', orgId),
      supabaseAdmin.from('payroll_runs').select('*').eq('organization_id', orgId).order('year', { ascending: false }).order('month', { ascending: false }).limit(6),
      supabaseAdmin.from('payments').select('id, amount, status, payment_type, due_date').eq('organization_id', orgId),
      supabaseAdmin.from('invoices').select('id, total_amount, status, due_date').eq('organization_id', orgId),
      supabaseAdmin.from('documents').select('id, document_type, processing_status').eq('organization_id', orgId),
      supabaseAdmin.from('reminders').select('*').eq('organization_id', orgId).eq('status', 'active'),
    ]);

    const totalEmployees = (employees || []).length;
    const activeEmployees = (employees || []).filter(e => e.status === 'active').length;
    const currentPayrollMonth = Number(latestPayroll?.[0]?.total_net_salary || 0);

    const pendingSalaryPayments = (payments || [])
      .filter(p => p.status === 'pending' && p.payment_type === 'salary')
      .reduce((acc, p) => acc + Number(p.amount), 0);

    const overduePayments = (payments || [])
      .filter(p => p.status === 'overdue')
      .reduce((acc, p) => acc + Number(p.amount), 0);

    const pendingInvoices = (invoices || [])
      .filter(i => i.status === 'pending' || i.status === 'due_soon')
      .reduce((acc, i) => acc + Number(i.total_amount), 0);

    const overdueInvoices = (invoices || [])
      .filter(i => i.status === 'overdue')
      .reduce((acc, i) => acc + Number(i.total_amount), 0);

    const totalDocuments = (documents || []).length;
    const upcomingDeadlinesCount = (reminders || []).length;

    // Department Distribution
    const deptMap: { [key: string]: { count: number; salaryTotal: number } } = {};
    for (const emp of employees || []) {
      const deptName = (emp as any).departments?.name || 'General';
      if (!deptMap[deptName]) deptMap[deptName] = { count: 0, salaryTotal: 0 };
      deptMap[deptName].count += 1;
      deptMap[deptName].salaryTotal += Number(emp.basic_salary) || 0;
    }

    const departmentDistribution = Object.keys(deptMap).map(name => ({
      name,
      employees: deptMap[name].count,
      salaryTotal: deptMap[name].salaryTotal,
    }));

    // Monthly Expense Trend (Payroll Runs)
    const monthlyTrends = (latestPayroll || [])
      .slice()
      .reverse()
      .map(run => ({
        month: `${run.month}/${run.year}`,
        payroll: Number(run.total_net_salary),
        basic: Number(run.total_basic),
        overtime: Number(run.total_overtime),
        allowances: Number(run.total_allowances),
      }));

    res.json({
      metrics: {
        totalEmployees,
        activeEmployees,
        currentPayrollMonth,
        pendingSalaryPayments,
        overduePayments,
        pendingInvoices,
        overdueInvoices,
        totalDocuments,
        upcomingDeadlinesCount,
      },
      departmentDistribution,
      monthlyTrends,
      activeReminders: (reminders || []).slice(0, 5),
    });
  } catch (err: any) {
    console.error('getDashboardOverview error:', err);
    res.status(500).json({ error: err.message });
  }
}
