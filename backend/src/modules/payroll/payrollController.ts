import { Request, Response } from 'express';
import { supabaseAdmin } from '../../config/supabase';
import { calculateNetSalary } from '../../services/payroll/calculator';
import { generatePayslipPDF } from '../../services/pdf/payslipGenerator';
import { approvalService } from '../../services/approvals/approvalService';

export async function listPayrollRuns(req: Request, res: Response) {
  try {
    const orgId = req.organizationId;
    const { data, error } = await supabaseAdmin
      .from('payroll_runs')
      .select('*')
      .eq('organization_id', orgId)
      .order('year', { ascending: false })
      .order('month', { ascending: false });

    if (error) throw error;
    res.json({ payrollRuns: data || [] });
  } catch (err: any) {
    console.error('listPayrollRuns error:', err);
    res.status(500).json({ error: err.message });
  }
}

export async function getPayrollRun(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const orgId = req.organizationId;

    const { data: run, error: runError } = await supabaseAdmin
      .from('payroll_runs')
      .select('*')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (runError || !run) {
      return res.status(404).json({ error: 'Payroll run not found' });
    }

    const { data: items, error: itemsError } = await supabaseAdmin
      .from('payroll_items')
      .select('*, employees(id, employee_id, first_name, last_name, designation, department_id, departments(name))')
      .eq('payroll_run_id', id)
      .order('created_at', { ascending: true });

    if (itemsError) throw itemsError;

    res.json({ payrollRun: run, items: items || [] });
  } catch (err: any) {
    console.error('getPayrollRun error:', err);
    res.status(500).json({ error: err.message });
  }
}

export async function createPayrollRun(req: Request, res: Response) {
  try {
    const orgId = req.organizationId;
    const { month, year } = req.body;

    if (!month || !year) {
      return res.status(400).json({ error: 'Month and year are required' });
    }

    // Check if payroll run already exists for this month/year
    const { data: existing } = await supabaseAdmin
      .from('payroll_runs')
      .select('id')
      .eq('organization_id', orgId)
      .eq('month', month)
      .eq('year', year)
      .single();

    if (existing) {
      return res.status(400).json({ error: `Payroll run already exists for ${month}/${year}` });
    }

    // 1. Create draft payroll_run record
    const { data: run, error: runError } = await supabaseAdmin
      .from('payroll_runs')
      .insert({
        organization_id: orgId,
        month,
        year,
        status: 'draft',
      })
      .select()
      .single();

    if (runError || !run) throw runError;

    // 2. Fetch all active employees
    const { data: employees, error: empError } = await supabaseAdmin
      .from('employees')
      .select('*, salary_components(*)')
      .eq('organization_id', orgId)
      .eq('status', 'active');

    if (empError) throw empError;

    // 2b. Fetch attendance records for the payroll month to auto-calculate LOP and overtime
    const totalMonthDays = new Date(year, month, 0).getDate();
    const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(totalMonthDays).padStart(2, '0')}`;

    const { data: monthAttendance } = await supabaseAdmin
      .from('attendance_records')
      .select('*')
      .eq('organization_id', orgId)
      .gte('date', startDateStr)
      .lte('date', endDateStr);

    const attendanceByEmployee = new Map<string, any[]>();
    for (const rec of monthAttendance || []) {
      const list = attendanceByEmployee.get(rec.employee_id) || [];
      list.push(rec);
      attendanceByEmployee.set(rec.employee_id, list);
    }

    const payrollItemsToInsert = [];

    // 3. Deterministic calculation for each employee
    for (const emp of employees || []) {
      const allowances = (emp.salary_components || [])
        .filter((c: any) => c.component_type === 'allowance')
        .map((c: any) => ({
          name: c.name,
          amount: Number(c.amount),
          isPercentage: c.is_percentage,
          percentageValue: c.percentage_value,
        }));

      const deductions = (emp.salary_components || [])
        .filter((c: any) => c.component_type === 'deduction')
        .map((c: any) => ({
          name: c.name,
          amount: Number(c.amount),
          isPercentage: c.is_percentage,
          percentageValue: c.percentage_value,
        }));

      // Calculate attendance, LOP days and overtime hours
      const empRecords = attendanceByEmployee.get(emp.id) || [];
      let lopDays = 0;
      let otHours = 0;

      for (const r of empRecords) {
        otHours += Number(r.overtime_hours || 0);
        if (r.status === 'absent') {
          lopDays += 1;
        } else if (r.status === 'half_day') {
          lopDays += 0.5;
        }
      }

      const calc = calculateNetSalary({
        basicSalary: Number(emp.basic_salary),
        salaryType: emp.salary_type,
        totalWorkingDays: totalMonthDays,
        daysWorked: totalMonthDays - lopDays,
        unpaidLeaveDays: lopDays,
        overtimeHours: otHours,
        allowances,
        deductions,
      });

      payrollItemsToInsert.push({
        payroll_run_id: run.id,
        organization_id: orgId,
        employee_id: emp.id,
        basic_salary: calc.basicSalary,
        overtime_hours: calc.overtimeHours,
        overtime_amount: calc.overtimeAmount,
        bonus_amount: 0,
        allowances_amount: calc.allowancesAmount,
        deductions_amount: calc.deductionsAmount,
        advances_amount: 0,
        lop_days: lopDays,
        leave_deductions_amount: calc.leaveDeductionsAmount,
        net_salary: calc.netSalary,
        status: 'draft',
        breakdown: {
          ...calc.breakdown,
          lopDays,
          attendanceRecordsCount: empRecords.length,
        },
      });
    }

    if (payrollItemsToInsert.length > 0) {
      const { error: itemsInsertError } = await supabaseAdmin
        .from('payroll_items')
        .insert(payrollItemsToInsert);

      if (itemsInsertError) throw itemsInsertError;
    }

    // Trigger in DB will automatically compute run totals
    const { data: updatedRun } = await supabaseAdmin
      .from('payroll_runs')
      .select('*')
      .eq('id', run.id)
      .single();

    // Initiate multi-level approval workflow
    try {
      await approvalService.initiateApproval(req, {
        entityType: 'payroll_run',
        entityId: run.id,
        amount: Number(updatedRun?.total_net_salary || 0),
        creatorId: req.user?.id,
      });
    } catch (appErr: any) {
      console.warn('[createPayrollRun] Approval initiation notice:', appErr.message);
    }

    res.status(201).json({ payrollRun: updatedRun });
  } catch (err: any) {
    console.error('createPayrollRun error:', err);
    res.status(500).json({ error: err.message });
  }
}

export async function updatePayrollItem(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const orgId = req.organizationId;
    const { overtime_hours, bonus_amount, advances_amount, unpaid_leave_days } = req.body;

    const { data: item, error: itemError } = await supabaseAdmin
      .from('payroll_items')
      .select('*, employees(*)')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (itemError || !item) {
      return res.status(404).json({ error: 'Payroll item not found' });
    }

    const { data: components } = await supabaseAdmin
      .from('salary_components')
      .select('*')
      .eq('employee_id', item.employee_id);

    const allowances = (components || [])
      .filter((c: any) => c.component_type === 'allowance')
      .map((c: any) => ({ name: c.name, amount: Number(c.amount) }));

    const deductions = (components || [])
      .filter((c: any) => c.component_type === 'deduction')
      .map((c: any) => ({ name: c.name, amount: Number(c.amount) }));

    // Deterministic recalculation with updated line-item parameters
    const calc = calculateNetSalary({
      basicSalary: Number(item.employees.basic_salary),
      salaryType: item.employees.salary_type,
      overtimeHours: overtime_hours !== undefined ? Number(overtime_hours) : Number(item.overtime_hours),
      bonus: bonus_amount !== undefined ? Number(bonus_amount) : Number(item.bonus_amount),
      advances: advances_amount !== undefined ? Number(advances_amount) : Number(item.advances_amount),
      unpaidLeaveDays: unpaid_leave_days !== undefined ? Number(unpaid_leave_days) : 0,
      allowances,
      deductions,
    });

    const { data: updatedItem, error: updateError } = await supabaseAdmin
      .from('payroll_items')
      .update({
        overtime_hours: calc.overtimeHours,
        overtime_amount: calc.overtimeAmount,
        bonus_amount: calc.bonusAmount,
        allowances_amount: calc.allowancesAmount,
        deductions_amount: calc.deductionsAmount,
        advances_amount: calc.advancesAmount,
        leave_deductions_amount: calc.leaveDeductionsAmount,
        net_salary: calc.netSalary,
        breakdown: calc.breakdown,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    res.json({ payrollItem: updatedItem });
  } catch (err: any) {
    console.error('updatePayrollItem error:', err);
    res.status(500).json({ error: err.message });
  }
}

export async function approvePayrollRun(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const orgId = req.organizationId;

    // 1. Lock and approve payroll run
    const { data: run, error: runError } = await supabaseAdmin
      .from('payroll_runs')
      .update({
        status: 'approved',
        approved_by: req.user?.id,
        approved_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('organization_id', orgId)
      .select()
      .single();

    if (runError || !run) throw runError;

    // 2. Mark all items as approved
    await supabaseAdmin
      .from('payroll_items')
      .update({ status: 'approved' })
      .eq('payroll_run_id', id);

    // 3. Create corresponding pending payments
    const { data: items } = await supabaseAdmin
      .from('payroll_items')
      .select('*, employees(first_name, last_name)')
      .eq('payroll_run_id', id);

    const paymentRecords = (items || []).map((item) => ({
      organization_id: orgId,
      payment_type: 'salary',
      payroll_item_id: item.id,
      employee_id: item.employee_id,
      vendor_name: `${item.employees.first_name} ${item.employees.last_name}`,
      amount: item.net_salary,
      due_date: new Date(run.year, run.month, 0).toISOString().split('T')[0], // Month end
      status: 'pending',
      payment_method: 'bank_transfer',
      notes: `Salary payout for ${run.month}/${run.year}`,
    }));

    if (paymentRecords.length > 0) {
      await supabaseAdmin.from('payments').insert(paymentRecords);
    }

    // 4. Create in-app notification
    await supabaseAdmin.from('notifications').insert({
      organization_id: orgId,
      user_id: req.user?.id,
      title: `Payroll Approved for ${run.month}/${run.year}`,
      message: `Total Net Salary of ₹${Number(run.total_net_salary).toLocaleString('en-IN')} approved for ${run.total_employees} employees.`,
      notification_type: 'payroll_approved',
      entity_type: 'payroll_runs',
      entity_id: run.id,
    });

    res.json({ payrollRun: run, message: 'Payroll run approved successfully' });
  } catch (err: any) {
    console.error('approvePayrollRun error:', err);
    res.status(500).json({ error: err.message });
  }
}

export async function downloadPayslipPDF(req: Request, res: Response) {
  try {
    const { itemId } = req.params;
    const orgId = req.organizationId;

    const { data: item, error: itemError } = await supabaseAdmin
      .from('payroll_items')
      .select('*, payroll_runs(*), employees(*, departments(name))')
      .eq('id', itemId)
      .eq('organization_id', orgId)
      .single();

    if (itemError || !item) {
      return res.status(404).json({ error: 'Payslip item not found' });
    }

    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .single();

    const pdfBuffer = generatePayslipPDF({
      organizationName: org?.name || 'PayDoc AI Organization',
      organizationAddress: org?.address,
      organizationTaxId: org?.tax_id,
      employeeName: `${item.employees.first_name} ${item.employees.last_name}`,
      employeeId: item.employees.employee_id,
      department: item.employees.departments?.name || 'General',
      designation: item.employees.designation,
      joiningDate: item.employees.joining_date,
      bankAccount: item.employees.bank_account_number || 'N/A',
      bankIfsc: item.employees.bank_ifsc || 'N/A',
      panNumber: item.employees.pan_number,
      month: item.payroll_runs.month,
      year: item.payroll_runs.year,
      basicSalary: Number(item.basic_salary),
      overtimeHours: Number(item.overtime_hours),
      overtimeAmount: Number(item.overtime_amount),
      bonusAmount: Number(item.bonus_amount),
      allowancesAmount: Number(item.allowances_amount),
      deductionsAmount: Number(item.deductions_amount),
      advancesAmount: Number(item.advances_amount),
      leaveDeductionsAmount: Number(item.leave_deductions_amount),
      netSalary: Number(item.net_salary),
      paymentStatus: item.status,
      allowancesBreakdown: item.breakdown?.allowances,
      deductionsBreakdown: item.breakdown?.deductions,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Payslip_${item.employees.employee_id}_${item.payroll_runs.month}_${item.payroll_runs.year}.pdf`);
    res.send(pdfBuffer);
  } catch (err: any) {
    console.error('downloadPayslipPDF error:', err);
    res.status(500).json({ error: err.message });
  }
}
