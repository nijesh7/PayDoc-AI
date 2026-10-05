import { Request, Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../../config/supabase';
import { logAuditTrail } from '../../services/audit/auditService';

// Validation Schemas
const createLeaveRequestSchema = z.object({
  employee_id: z.string().uuid(),
  leave_type_id: z.string().uuid(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  days_count: z.number().positive(),
  reason: z.string().optional(),
});

const actionLeaveRequestSchema = z.object({
  action: z.enum(['approve', 'reject']),
  review_comment: z.string().optional(),
});

/**
 * 1. Get Leave Types Catalog for Organization
 */
export async function getLeaveTypes(req: Request, res: Response) {
  try {
    const orgId = req.organizationId;
    const { data, error } = await supabaseAdmin
      .from('leave_types')
      .select('*')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .order('code', { ascending: true });

    if (error) throw error;
    res.json({ leaveTypes: data || [] });
  } catch (err: any) {
    console.error('getLeaveTypes error:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * 2. Get Employee Leave Balances (auto-initializes annual allocation if not present)
 */
export async function getEmployeeLeaveBalances(req: Request, res: Response) {
  try {
    const orgId = req.organizationId;
    const employeeId = req.params.employeeId || req.query.employeeId as string;
    const currentYear = Number(req.query.year) || new Date().getFullYear();

    if (!employeeId) {
      return res.status(400).json({ error: 'Employee ID is required' });
    }

    // Check existing balances
    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('employee_leave_balances')
      .select('*, leave_type:leave_types(*)')
      .eq('organization_id', orgId)
      .eq('employee_id', employeeId)
      .eq('year', currentYear);

    if (fetchErr) throw fetchErr;

    if (existing && existing.length > 0) {
      return res.json({ balances: existing, year: currentYear });
    }

    // Auto-initialize from leave_types catalog if no rows exist for this year
    const { data: types, error: typesErr } = await supabaseAdmin
      .from('leave_types')
      .select('*')
      .eq('organization_id', orgId)
      .eq('is_active', true);

    if (typesErr) throw typesErr;

    if (types && types.length > 0) {
      const initRows = types.map((t: any) => ({
        organization_id: orgId,
        employee_id: employeeId,
        leave_type_id: t.id,
        year: currentYear,
        allocated_days: t.days_allowed_per_year,
        used_days: 0,
        pending_days: 0,
        carried_forward_days: 0,
      }));

      const { data: created, error: createErr } = await supabaseAdmin
        .from('employee_leave_balances')
        .insert(initRows)
        .select('*, leave_type:leave_types(*)');

      if (createErr) throw createErr;
      return res.json({ balances: created || [], year: currentYear });
    }

    res.json({ balances: [], year: currentYear });
  } catch (err: any) {
    console.error('getEmployeeLeaveBalances error:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * 3. List Leave Requests (with filters)
 */
export async function getLeaveRequests(req: Request, res: Response) {
  try {
    const orgId = req.organizationId;
    const { status, employeeId, startDate, endDate } = req.query;

    let query = supabaseAdmin
      .from('leave_requests')
      .select('*, employee:employees(id, first_name, last_name, employee_id, designation), leave_type:leave_types(name, code, is_paid), reviewer:users(id, full_name, email)')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }
    if (startDate) {
      query = query.gte('start_date', startDate as string);
    }
    if (endDate) {
      query = query.lte('end_date', endDate as string);
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json({ leaveRequests: data || [] });
  } catch (err: any) {
    console.error('getLeaveRequests error:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * 4. Submit Leave Request
 */
export async function createLeaveRequest(req: Request, res: Response) {
  try {
    const orgId = req.organizationId;
    const parsed = createLeaveRequestSchema.parse(req.body);

    const start = new Date(parsed.start_date);
    const end = new Date(parsed.end_date);
    if (end < start) {
      return res.status(400).json({ error: 'End date cannot be prior to start date' });
    }

    const reqYear = start.getFullYear();

    // Check balance for this leave type
    const { data: balance } = await supabaseAdmin
      .from('employee_leave_balances')
      .select('*, leave_type:leave_types(*)')
      .eq('organization_id', orgId)
      .eq('employee_id', parsed.employee_id)
      .eq('leave_type_id', parsed.leave_type_id)
      .eq('year', reqYear)
      .single();

    // If paid leave type and balance is tracked, ensure sufficient balance
    if (balance && balance.leave_type?.is_paid) {
      const remaining =
        Number(balance.allocated_days) +
        Number(balance.carried_forward_days) -
        Number(balance.used_days) -
        Number(balance.pending_days);

      if (remaining < parsed.days_count) {
        return res.status(400).json({
          error: `Insufficient leave balance. Available: ${remaining} days, requested: ${parsed.days_count} days.`,
        });
      }

      // Increment pending days
      await supabaseAdmin
        .from('employee_leave_balances')
        .update({ pending_days: Number(balance.pending_days) + parsed.days_count })
        .eq('id', balance.id);
    }

    // Insert leave request
    const { data: leaveReq, error: insErr } = await supabaseAdmin
      .from('leave_requests')
      .insert({
        organization_id: orgId,
        employee_id: parsed.employee_id,
        leave_type_id: parsed.leave_type_id,
        start_date: parsed.start_date,
        end_date: parsed.end_date,
        days_count: parsed.days_count,
        reason: parsed.reason || null,
        status: 'pending',
      })
      .select('*, employee:employees(first_name, last_name, employee_id), leave_type:leave_types(name, code, is_paid)')
      .single();

    if (insErr) throw insErr;

    await logAuditTrail(req, {
      action: 'LEAVE_REQUESTED',
      entity_type: 'leave_requests',
      entity_id: leaveReq.id,
      new_values: leaveReq,
    });

    res.status(201).json({ leaveRequest: leaveReq });
  } catch (err: any) {
    console.error('createLeaveRequest error:', err);
    res.status(400).json({ error: err.message });
  }
}

/**
 * 5. Approve or Reject Leave Request
 */
export async function actionLeaveRequest(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const orgId = req.organizationId;
    const actorId = req.user?.id;
    const parsed = actionLeaveRequestSchema.parse(req.body);

    const { data: leaveReq, error: reqErr } = await supabaseAdmin
      .from('leave_requests')
      .select('*, leave_type:leave_types(*)')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (reqErr || !leaveReq) {
      return res.status(404).json({ error: 'Leave request not found' });
    }

    if (leaveReq.status !== 'pending') {
      return res.status(400).json({ error: `Cannot action request already in '${leaveReq.status}' status` });
    }

    const newStatus = parsed.action === 'approve' ? 'approved' : 'rejected';
    const now = new Date().toISOString();

    // Update request
    const { data: updatedReq, error: upErr } = await supabaseAdmin
      .from('leave_requests')
      .update({
        status: newStatus,
        reviewed_by: actorId,
        reviewed_at: now,
        review_comment: parsed.review_comment || null,
        updated_at: now,
      })
      .eq('id', id)
      .select('*, employee:employees(first_name, last_name, employee_id), leave_type:leave_types(name, code)')
      .single();

    if (upErr) throw upErr;

    // Adjust employee leave balance
    const reqYear = new Date(leaveReq.start_date).getFullYear();
    const { data: balance } = await supabaseAdmin
      .from('employee_leave_balances')
      .select('*')
      .eq('organization_id', orgId)
      .eq('employee_id', leaveReq.employee_id)
      .eq('leave_type_id', leaveReq.leave_type_id)
      .eq('year', reqYear)
      .single();

    if (balance) {
      const days = Number(leaveReq.days_count);
      const newPending = Math.max(0, Number(balance.pending_days) - days);

      if (parsed.action === 'approve') {
        const newUsed = Number(balance.used_days) + days;
        await supabaseAdmin
          .from('employee_leave_balances')
          .update({ used_days: newUsed, pending_days: newPending })
          .eq('id', balance.id);

        // Also create / update daily attendance records as 'on_leave' for the date span
        const cur = new Date(leaveReq.start_date);
        const end = new Date(leaveReq.end_date);
        while (cur <= end) {
          const dateStr = cur.toISOString().split('T')[0];
          await supabaseAdmin
            .from('attendance_records')
            .upsert(
              {
                organization_id: orgId,
                employee_id: leaveReq.employee_id,
                date: dateStr,
                status: 'on_leave',
                source: 'system',
                remarks: `Approved leave: ${leaveReq.leave_type?.name || 'Leave'}`,
              },
              { onConflict: 'organization_id,employee_id,date' }
            );
          cur.setDate(cur.getDate() + 1);
        }
      } else {
        // Rejected -> release pending
        await supabaseAdmin
          .from('employee_leave_balances')
          .update({ pending_days: newPending })
          .eq('id', balance.id);
      }
    }

    await logAuditTrail(req, {
      action: parsed.action === 'approve' ? 'LEAVE_APPROVED' : 'LEAVE_REJECTED',
      entity_type: 'leave_requests',
      entity_id: id,
      old_values: { status: 'pending' },
      new_values: { status: newStatus, reviewed_by: actorId, comment: parsed.review_comment },
    });

    res.json({ leaveRequest: updatedReq });
  } catch (err: any) {
    console.error('actionLeaveRequest error:', err);
    res.status(400).json({ error: err.message });
  }
}

/**
 * 6. Get Holidays Calendar
 */
export async function getHolidays(req: Request, res: Response) {
  try {
    const orgId = req.organizationId;
    const year = Number(req.query.year) || new Date().getFullYear();

    const startOfYear = `${year}-01-01`;
    const endOfYear = `${year}-12-31`;

    const { data, error } = await supabaseAdmin
      .from('holidays')
      .select('*')
      .eq('organization_id', orgId)
      .gte('date', startOfYear)
      .lte('date', endOfYear)
      .order('date', { ascending: true });

    if (error) throw error;
    res.json({ holidays: data || [], year });
  } catch (err: any) {
    console.error('getHolidays error:', err);
    res.status(500).json({ error: err.message });
  }
}
