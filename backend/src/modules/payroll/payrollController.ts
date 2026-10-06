import { Request, Response } from 'express';
import { supabaseAdmin } from '../../config/supabase';
import { calculateNetSalary } from '../../services/payroll/calculator';
import { generatePayslipPDF } from '../../services/pdf/payslipGenerator';
import { generateEPFOECRText, ECRMemberInput } from '../../services/banking/epfoEcrGenerator';
import { approvalService } from '../../services/approvals/approvalService';
import {
  calculateEPF,
  calculateESI,
  calculateProfessionalTax,
  calculateNewRegimeTax,
  calculateOldRegimeTax,
} from '../../services/tax/indianTaxCalculator';

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

    // 2c. Fetch statutory details and tax declarations for statutory tax calculations
    const { data: statutoryList } = await supabaseAdmin
      .from('employee_statutory_details')
      .select('*')
      .eq('organization_id', orgId);

    const { data: declarationsList } = await supabaseAdmin
      .from('employee_tax_declarations')
      .select('*')
      .eq('organization_id', orgId);

    const statutoryByEmployee = new Map<string, any>();
    for (const s of statutoryList || []) {
      statutoryByEmployee.set(s.employee_id, s);
    }

    const declarationByEmployee = new Map<string, any>();
    for (const d of declarationsList || []) {
      declarationByEmployee.set(d.employee_id, d);
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

      // Statutory calculations (PF, ESI, PT, TDS)
      const statDetails = statutoryByEmployee.get(emp.id);
      const decl = declarationByEmployee.get(emp.id);

      // EPF
      let pfEmployee = 0;
      let pfEmployer = 0;
      if (statDetails?.is_pf_eligible !== false) {
        const epf = calculateEPF(
          emp.basic_salary,
          statDetails?.pf_wage_ceiling_applicable ?? true,
          statDetails?.vpf_percentage ?? 0
        );
        pfEmployee = Number(epf.employeePF);
        pfEmployer = Number(epf.totalEmployerPF);
      }

      // ESI
      let esiEmployee = 0;
      let esiEmployer = 0;
      if (statDetails?.is_esi_eligible) {
        const esi = calculateESI(calc.grossSalary);
        esiEmployee = Number(esi.employeeESI);
        esiEmployer = Number(esi.employerESI);
      }

      // Professional Tax (PT)
      const ptAmount = Number(
        calculateProfessionalTax(calc.grossSalary, statDetails?.pt_state || 'Karnataka', month)
      );

      // Monthly TDS based on elected tax regime
      let tdsAmount = 0;
      if (decl) {
        const grossAnnual = calc.grossSalary * 12;
        if (decl.regime === 'old') {
          const annualBasic = Number(emp.basic_salary) * 12;
          const annualHRA = calc.allowancesAmount * 0.4 * 12;
          const oldTax = calculateOldRegimeTax(grossAnnual, annualBasic, annualHRA, {
            sec80C: Number(decl.sec_80c) || 0,
            sec80D_self: Number(decl.sec_80d_self) || 0,
            sec80D_parents: Number(decl.sec_80d_parents) || 0,
            sec80CCD_nps: Number(decl.sec_80ccd_nps) || 0,
            sec24b_homeLoanInterest: Number(decl.sec_24b_home_loan_interest) || 0,
            annualRentPaid: Number(decl.hra_annual_rent_paid) || 0,
            isMetroCity: decl.is_metro_city,
            otherExemptions: Number(decl.other_exemptions) || 0,
          });
          tdsAmount = Number(oldTax.monthlyTDS);
        } else {
          const newTax = calculateNewRegimeTax(grossAnnual);
          tdsAmount = Number(newTax.monthlyTDS);
        }
      }

      // Net salary considering statutory deductions if not already included in custom deductions
      const netSalary = Math.max(0, calc.netSalary - tdsAmount);

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
        tds_amount: tdsAmount,
        pf_employee: pfEmployee,
        pf_employer: pfEmployer,
        esi_employee: esiEmployee,
        esi_employer: esiEmployer,
        pt_amount: ptAmount,
        net_salary: netSalary,
        status: 'draft',
        breakdown: {
          ...calc.breakdown,
          lopDays,
          attendanceRecordsCount: empRecords.length,
          statutory: {
            pfEmployee,
            pfEmployer,
            esiEmployee,
            esiEmployer,
            ptAmount,
            tdsAmount,
            regime: decl?.regime || 'new',
          },
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
      uan: item.employees.uan,
      pfNumber: item.employees.pf_number,
      month: item.payroll_runs.month,
      year: item.payroll_runs.year,
      totalWorkingDays: item.payroll_runs?.total_working_days || 30,
      daysWorked: (item.payroll_runs?.total_working_days || 30) - Number(item.lop_days || 0),
      lopDays: Number(item.lop_days || 0),
      basicSalary: Number(item.basic_salary),
      overtimeHours: Number(item.overtime_hours),
      overtimeAmount: Number(item.overtime_amount),
      bonusAmount: Number(item.bonus_amount),
      allowancesAmount: Number(item.allowances_amount),
      deductionsAmount: Number(item.deductions_amount),
      advancesAmount: Number(item.advances_amount),
      leaveDeductionsAmount: Number(item.leave_deductions_amount),
      pfEmployee: Number(item.pf_employee || 0),
      esiEmployee: Number(item.esi_employee || 0),
      ptAmount: Number(item.pt_amount || 0),
      tdsAmount: Number(item.tds_amount || 0),
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

export async function downloadEPFOECRFile(req: Request, res: Response) {
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
      .select('*, employees(*)')
      .eq('payroll_run_id', id)
      .eq('organization_id', orgId);

    if (itemsError || !items || items.length === 0) {
      return res.status(400).json({ error: 'No payroll items found for this run' });
    }

    // Fetch statutory details to check wage ceiling
    const empIds = items.map((i: any) => i.employee_id);
    const { data: statList } = await supabaseAdmin
      .from('employee_statutory_details')
      .select('*')
      .eq('organization_id', orgId)
      .in('employee_id', empIds);

    const statMap = new Map((statList || []).map((s: any) => [s.employee_id, s]));

    const members: ECRMemberInput[] = items.map((i: any) => {
      const stat = statMap.get(i.employee_id);
      const gross = Number(i.basic_salary) + Number(i.allowances_amount || 0) + Number(i.overtime_amount || 0) + Number(i.bonus_amount || 0);
      return {
        uan: stat?.uan || i.employees?.uan || i.employees?.employee_id || '100000000000',
        memberName: `${i.employees?.first_name || ''} ${i.employees?.last_name || ''}`.trim() || 'Employee',
        grossWages: gross,
        basicSalary: Number(i.basic_salary),
        pfWageCeilingApplicable: stat?.pf_wage_ceiling_applicable ?? true,
        ncpDays: Math.round(Number(i.lop_days || 0)),
      };
    });

    const ecrResult = generateEPFOECRText(members, run.month, run.year);

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${ecrResult.fileName}"`);
    res.send(ecrResult.content);
  } catch (err: any) {
    console.error('downloadEPFOECRFile error:', err);
    res.status(500).json({ error: err.message });
  }
}

export async function generateEmployeePayslip(req: Request, res: Response) {
  try {
    const orgId = req.organizationId;
    const { employeeId, month, year, overtimeHours = 0, bonusAmount = 0, advancesAmount = 0, lopDays = 0 } = req.body;

    if (!employeeId || !month || !year) {
      return res.status(400).json({ error: 'employeeId, month, and year are required.' });
    }

    // 1. Fetch employee details
    const { data: emp, error: empErr } = await supabaseAdmin
      .from('employees')
      .select('*, departments(name)')
      .eq('id', employeeId)
      .eq('organization_id', orgId)
      .single();

    if (empErr || !emp) {
      return res.status(404).json({ error: 'Employee not found in organization.' });
    }

    // 2. Fetch or create a payroll run for this month/year
    let { data: run } = await supabaseAdmin
      .from('payroll_runs')
      .select('*')
      .eq('organization_id', orgId)
      .eq('month', Number(month))
      .eq('year', Number(year))
      .single();

    if (!run) {
      const { data: newRun, error: newRunErr } = await supabaseAdmin
        .from('payroll_runs')
        .insert({
          organization_id: orgId,
          month: Number(month),
          year: Number(year),
          status: 'draft',
          total_employees: 1,
        })
        .select()
        .single();
      if (newRunErr) throw newRunErr;
      run = newRun;
    }

    // 3. Compute deterministic salary
    const baseSalary = Number(emp.base_salary) || 0;
    const calc = calculateNetSalary({
      basicSalary: baseSalary,
      salaryType: 'monthly',
      daysWorked: Math.max(0, 30 - Number(lopDays)),
      totalWorkingDays: 30,
      overtimeHours: Number(overtimeHours),
      overtimeHourlyRate: baseSalary / (30 * 8),
      bonus: Number(bonusAmount),
      advances: Number(advancesAmount),
      unpaidLeaveDays: Number(lopDays),
    });

    // Statutory deductions
    const epfResult = calculateEPF(calc.basicSalary);
    const pfEmployee = Number(epfResult.employeePF) || 0;
    const ptAmount = Number(calculateProfessionalTax(calc.grossSalary)) || 0;
    const netSalary = Math.max(0, calc.netSalary - pfEmployee - ptAmount);

    // 4. Upsert payroll item
    const { data: existingItem } = await supabaseAdmin
      .from('payroll_items')
      .select('id')
      .eq('payroll_run_id', run.id)
      .eq('employee_id', emp.id)
      .single();

    let savedItem;
    if (existingItem) {
      const { data: updated, error: updErr } = await supabaseAdmin
        .from('payroll_items')
        .update({
          basic_salary: calc.basicSalary,
          overtime_hours: calc.overtimeHours,
          overtime_amount: calc.overtimeAmount,
          bonus_amount: calc.bonusAmount,
          allowances_amount: calc.allowancesAmount,
          deductions_amount: calc.deductionsAmount,
          advances_amount: calc.advancesAmount,
          lop_days: Number(lopDays),
          leave_deductions_amount: calc.leaveDeductionsAmount,
          pf_employee: pfEmployee,
          pt_amount: ptAmount,
          net_salary: netSalary,
          status: 'approved',
          breakdown: {
            ...calc.breakdown,
            statutory: { pfEmployee, ptAmount },
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingItem.id)
        .select()
        .single();
      if (updErr) throw updErr;
      savedItem = updated;
    } else {
      const { data: inserted, error: insErr } = await supabaseAdmin
        .from('payroll_items')
        .insert({
          payroll_run_id: run.id,
          organization_id: orgId,
          employee_id: emp.id,
          basic_salary: calc.basicSalary,
          overtime_hours: calc.overtimeHours,
          overtime_amount: calc.overtimeAmount,
          bonus_amount: calc.bonusAmount,
          allowances_amount: calc.allowancesAmount,
          deductions_amount: calc.deductionsAmount,
          advances_amount: calc.advancesAmount,
          lop_days: Number(lopDays),
          leave_deductions_amount: calc.leaveDeductionsAmount,
          pf_employee: pfEmployee,
          pt_amount: ptAmount,
          net_salary: netSalary,
          status: 'approved',
          breakdown: {
            ...calc.breakdown,
            statutory: { pfEmployee, ptAmount },
          },
        })
        .select()
        .single();
      if (insErr) throw insErr;
      savedItem = inserted;
    }

    res.json({
      success: true,
      payrollItemId: savedItem.id,
      payrollItem: savedItem,
      employee: emp,
      month: Number(month),
      year: Number(year),
      netSalary,
      message: `Payslip generated for ${emp.first_name} ${emp.last_name}`,
    });
  } catch (err: any) {
    console.error('generateEmployeePayslip error:', err);
    res.status(500).json({ error: err.message });
  }
}

