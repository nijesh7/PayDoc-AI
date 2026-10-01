import { Request, Response } from 'express';
import { supabaseAdmin } from '../../config/supabase';
import { z } from 'zod';

const createEmployeeSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
  address: z.string().optional(),
  employee_id: z.string().min(1, 'Employee ID is required'),
  department_id: z.string().uuid().optional().nullable(),
  designation: z.string().min(1, 'Designation is required'),
  joining_date: z.string().min(1, 'Joining date is required'),
  employment_type: z.enum(['full_time', 'part_time', 'contract', 'daily_wage']),
  salary_type: z.enum(['monthly', 'hourly', 'daily']),
  basic_salary: z.number().min(0, 'Basic salary cannot be negative'),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  bank_account_number: z.string().optional(),
  bank_name: z.string().optional(),
  bank_ifsc: z.string().optional(),
  pan_number: z.string().optional(),
});

export async function listEmployees(req: Request, res: Response) {
  try {
    const orgId = req.organizationId;
    const { department_id, status, employment_type, search } = req.query;

    let query = supabaseAdmin
      .from('employees')
      .select('*, departments(id, name)')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (department_id) query = query.eq('department_id', department_id);
    if (status) query = query.eq('status', status);
    if (employment_type) query = query.eq('employment_type', employment_type);
    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,employee_id.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json({ employees: data || [] });
  } catch (err: any) {
    console.error('listEmployees error:', err);
    res.status(500).json({ error: err.message });
  }
}

export async function getEmployee(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const orgId = req.organizationId;

    const { data: employee, error } = await supabaseAdmin
      .from('employees')
      .select('*, departments(id, name)')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (error || !employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Fetch salary components
    const { data: salaryComponents } = await supabaseAdmin
      .from('salary_components')
      .select('*')
      .eq('employee_id', id);

    // Fetch payroll history
    const { data: payrollHistory } = await supabaseAdmin
      .from('payroll_items')
      .select('*, payroll_runs(month, year, status)')
      .eq('employee_id', id)
      .order('created_at', { ascending: false });

    // Fetch documents
    const { data: documents } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('related_employee_id', id)
      .order('created_at', { ascending: false });

    res.json({
      employee,
      salaryComponents: salaryComponents || [],
      payrollHistory: payrollHistory || [],
      documents: documents || [],
    });
  } catch (err: any) {
    console.error('getEmployee error:', err);
    res.status(500).json({ error: err.message });
  }
}

export async function createEmployee(req: Request, res: Response) {
  try {
    const orgId = req.organizationId;
    const parsed = createEmployeeSchema.parse(req.body);

    const { data, error } = await supabaseAdmin
      .from('employees')
      .insert({
        ...parsed,
        organization_id: orgId,
      })
      .select()
      .single();

    if (error) throw error;

    // Log audit
    await supabaseAdmin.from('audit_logs').insert({
      organization_id: orgId,
      user_id: req.user?.id,
      action: 'EMPLOYEE_CREATED',
      entity_type: 'employees',
      entity_id: data.id,
      new_values: data,
    });

    res.status(201).json({ employee: data });
  } catch (err: any) {
    console.error('createEmployee error:', err);
    res.status(400).json({ error: err.message });
  }
}

export async function updateEmployee(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const orgId = req.organizationId;

    const { data, error } = await supabaseAdmin
      .from('employees')
      .update(req.body)
      .eq('id', id)
      .eq('organization_id', orgId)
      .select()
      .single();

    if (error) throw error;

    res.json({ employee: data });
  } catch (err: any) {
    console.error('updateEmployee error:', err);
    res.status(400).json({ error: err.message });
  }
}

export async function deleteEmployee(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const orgId = req.organizationId;

    const { error } = await supabaseAdmin
      .from('employees')
      .update({ status: 'inactive' })
      .eq('id', id)
      .eq('organization_id', orgId);

    if (error) throw error;
    res.json({ message: 'Employee marked as inactive' });
  } catch (err: any) {
    console.error('deleteEmployee error:', err);
    res.status(500).json({ error: err.message });
  }
}
