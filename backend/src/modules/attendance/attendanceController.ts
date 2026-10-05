import { Request, Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../../config/supabase';
import { logAuditTrail } from '../../services/audit/auditService';
import {
  aggregateMonthlyAttendance,
  calculateLOPAndOvertime,
  getDaysInMonth,
} from '../../services/attendance/lopCalculator';

const attendanceRecordSchema = z.object({
  employee_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(['present', 'absent', 'half_day', 'holiday', 'on_leave', 'weekend']),
  check_in: z.string().optional().nullable(),
  check_out: z.string().optional().nullable(),
  work_hours: z.number().min(0).max(24).optional().nullable(),
  overtime_hours: z.number().min(0).max(24).optional().default(0),
  source: z.enum(['manual', 'biometric', 'csv_import', 'system']).default('manual'),
  remarks: z.string().optional().nullable(),
});

const bulkAttendanceSchema = z.object({
  records: z.array(attendanceRecordSchema),
});

/**
 * 1. Get Attendance Records (Filter by month, year, or employee)
 */
export async function getAttendance(req: Request, res: Response) {
  try {
    const orgId = req.organizationId;
    const { employeeId, month, year, date } = req.query;

    let query = supabaseAdmin
      .from('attendance_records')
      .select('*, employee:employees(id, first_name, last_name, employee_id, designation)')
      .eq('organization_id', orgId)
      .order('date', { ascending: false });

    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }

    if (date) {
      query = query.eq('date', date as string);
    } else if (month && year) {
      const m = Number(month);
      const y = Number(year);
      const start = `${y}-${String(m).padStart(2, '0')}-01`;
      const lastDay = getDaysInMonth(m, y);
      const end = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      query = query.gte('date', start).lte('date', end);
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json({ records: data || [] });
  } catch (err: any) {
    console.error('getAttendance error:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * 2. Record or Upsert Daily Attendance Record
 */
export async function recordAttendance(req: Request, res: Response) {
  try {
    const orgId = req.organizationId;
    const parsed = attendanceRecordSchema.parse(req.body);

    const payload = {
      organization_id: orgId,
      employee_id: parsed.employee_id,
      date: parsed.date,
      status: parsed.status,
      check_in: parsed.check_in || null,
      check_out: parsed.check_out || null,
      work_hours: parsed.work_hours ?? null,
      overtime_hours: parsed.overtime_hours || 0,
      source: parsed.source,
      remarks: parsed.remarks || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from('attendance_records')
      .upsert(payload, { onConflict: 'organization_id,employee_id,date' })
      .select('*, employee:employees(first_name, last_name, employee_id)')
      .single();

    if (error) throw error;

    await logAuditTrail(req, {
      action: 'ATTENDANCE_RECORDED',
      entity_type: 'attendance_records',
      entity_id: data.id,
      new_values: payload,
    });

    res.json({ record: data });
  } catch (err: any) {
    console.error('recordAttendance error:', err);
    res.status(400).json({ error: err.message });
  }
}

/**
 * 3. Bulk Record Attendance (CSV Import / Biometric Sync)
 */
export async function bulkRecordAttendance(req: Request, res: Response) {
  try {
    const orgId = req.organizationId;
    const parsed = bulkAttendanceSchema.parse(req.body);

    const rows = parsed.records.map((r) => ({
      organization_id: orgId,
      employee_id: r.employee_id,
      date: r.date,
      status: r.status,
      check_in: r.check_in || null,
      check_out: r.check_out || null,
      work_hours: r.work_hours ?? null,
      overtime_hours: r.overtime_hours || 0,
      source: r.source,
      remarks: r.remarks || null,
      updated_at: new Date().toISOString(),
    }));

    const { data, error } = await supabaseAdmin
      .from('attendance_records')
      .upsert(rows, { onConflict: 'organization_id,employee_id,date' })
      .select('id, employee_id, date, status');

    if (error) throw error;

    await logAuditTrail(req, {
      action: 'ATTENDANCE_BULK_IMPORTED',
      entity_type: 'attendance_records',
      entity_id: orgId || '',
      new_values: { count: rows.length },
    });

    res.json({ success: true, count: data?.length || 0 });
  } catch (err: any) {
    console.error('bulkRecordAttendance error:', err);
    res.status(400).json({ error: err.message });
  }
}

/**
 * 4. Get Employee Monthly Attendance Summary & LOP Calculations
 */
export async function getEmployeeAttendanceSummary(req: Request, res: Response) {
  try {
    const orgId = req.organizationId;
    const { employeeId } = req.params;
    const month = Number(req.query.month) || new Date().getMonth() + 1;
    const year = Number(req.query.year) || new Date().getFullYear();

    // Fetch employee details
    const { data: employee, error: empErr } = await supabaseAdmin
      .from('employees')
      .select('id, first_name, last_name, employee_id, basic_salary')
      .eq('id', employeeId)
      .eq('organization_id', orgId)
      .single();

    if (empErr || !employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = getDaysInMonth(month, year);
    const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const { data: records, error: recErr } = await supabaseAdmin
      .from('attendance_records')
      .select('*')
      .eq('organization_id', orgId)
      .eq('employee_id', employeeId)
      .gte('date', start)
      .lte('date', end);

    if (recErr) throw recErr;

    // Aggregate monthly attendance
    const summary = aggregateMonthlyAttendance(employeeId, month, year, records || []);

    // Deterministic calculation of LOP deduction and OT earnings
    const lopCalc = calculateLOPAndOvertime(
      employee.basic_salary,
      summary.lopDays,
      summary.overtimeHours,
      { month, year, divisorMode: 'calendar_days' }
    );

    res.json({
      employee,
      month,
      year,
      summary,
      calculations: lopCalc,
      recordsCount: records?.length || 0,
    });
  } catch (err: any) {
    console.error('getEmployeeAttendanceSummary error:', err);
    res.status(500).json({ error: err.message });
  }
}
