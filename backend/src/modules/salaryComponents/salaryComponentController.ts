import { Request, Response } from 'express';
import { supabaseAdmin } from '../../config/supabase';
import { z } from 'zod';
import { logAuditTrail } from '../../services/audit/auditService';
import {
  calculateStandardCTCBreakup,
  computeEmployeeSalaryBreakdown,
  EmployeeComponentAssignment,
} from '../../services/payroll/componentCalculator';

const createDefinitionSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required').toUpperCase(),
  component_type: z.enum(['earning', 'deduction']),
  calc_type: z.enum(['fixed', 'percent_of_basic', 'percent_of_gross', 'formula']),
  default_value: z.number().min(0, 'Default value cannot be negative').default(0),
  formula: z.string().optional().nullable(),
  is_taxable: z.boolean().default(true),
  pf_applicable: z.boolean().default(false),
  esi_applicable: z.boolean().default(false),
  display_order: z.number().default(0),
});

const createTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  description: z.string().optional(),
  components: z.array(
    z.object({
      component_definition_id: z.string().uuid(),
      calc_type: z.enum(['fixed', 'percent_of_basic', 'percent_of_gross', 'formula']),
      value: z.number().min(0),
    })
  ).min(1, 'At least one component required in template'),
});

const reviseSalarySchema = z.object({
  effective_from: z.string().min(1, 'Effective date is required'),
  revision_reason: z.string().optional(),
  basic_salary: z.number().min(0),
  components: z.array(
    z.object({
      component_definition_id: z.string().uuid(),
      calc_type: z.enum(['fixed', 'percent_of_basic', 'percent_of_gross', 'formula']),
      value: z.number().min(0),
    })
  ),
});

/**
 * 1. List catalog definitions
 */
export async function listComponentDefinitions(req: Request, res: Response) {
  try {
    const orgId = req.organizationId;
    const { data, error } = await supabaseAdmin
      .from('salary_component_definitions')
      .select('*')
      .eq('organization_id', orgId)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) throw error;
    res.json({ definitions: data || [] });
  } catch (err: any) {
    console.error('listComponentDefinitions error:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * 2. Create master component definition
 */
export async function createComponentDefinition(req: Request, res: Response) {
  try {
    const orgId = req.organizationId;
    const parsed = createDefinitionSchema.parse(req.body);

    const { data, error } = await supabaseAdmin
      .from('salary_component_definitions')
      .insert({
        ...parsed,
        organization_id: orgId,
      })
      .select()
      .single();

    if (error) throw error;

    await logAuditTrail(req, {
      action: 'SALARY_COMPONENT_DEF_CREATED',
      entity_type: 'salary_component_definitions',
      entity_id: data.id,
      new_values: data,
    });

    res.status(201).json({ definition: data });
  } catch (err: any) {
    console.error('createComponentDefinition error:', err);
    res.status(400).json({ error: err.message });
  }
}

/**
 * 3. Update master component definition
 */
export async function updateComponentDefinition(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const orgId = req.organizationId;

    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('salary_component_definitions')
      .select('*')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (fetchErr || !existing) {
      return res.status(404).json({ error: 'Component definition not found' });
    }

    const { data, error } = await supabaseAdmin
      .from('salary_component_definitions')
      .update(req.body)
      .eq('id', id)
      .eq('organization_id', orgId)
      .select()
      .single();

    if (error) throw error;

    await logAuditTrail(req, {
      action: 'SALARY_COMPONENT_DEF_UPDATED',
      entity_type: 'salary_component_definitions',
      entity_id: id,
      old_values: existing,
      new_values: data,
    });

    res.json({ definition: data });
  } catch (err: any) {
    console.error('updateComponentDefinition error:', err);
    res.status(400).json({ error: err.message });
  }
}

/**
 * 4. List CTC Templates
 */
export async function listCTCTemplates(req: Request, res: Response) {
  try {
    const orgId = req.organizationId;
    const { data, error } = await supabaseAdmin
      .from('ctc_templates')
      .select('*, components:ctc_template_components(*, definition:salary_component_definitions(*))')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ templates: data || [] });
  } catch (err: any) {
    console.error('listCTCTemplates error:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * 5. Create CTC Template
 */
export async function createCTCTemplate(req: Request, res: Response) {
  try {
    const orgId = req.organizationId;
    const parsed = createTemplateSchema.parse(req.body);

    const { data: template, error: tplErr } = await supabaseAdmin
      .from('ctc_templates')
      .insert({
        organization_id: orgId,
        name: parsed.name,
        description: parsed.description || null,
      })
      .select()
      .single();

    if (tplErr || !template) throw tplErr;

    const componentRows = parsed.components.map((c) => ({
      organization_id: orgId,
      template_id: template.id,
      component_definition_id: c.component_definition_id,
      calc_type: c.calc_type,
      value: c.value,
    }));

    const { error: compErr } = await supabaseAdmin
      .from('ctc_template_components')
      .insert(componentRows);

    if (compErr) throw compErr;

    await logAuditTrail(req, {
      action: 'CTC_TEMPLATE_CREATED',
      entity_type: 'ctc_templates',
      entity_id: template.id,
      new_values: { ...template, components: componentRows },
    });

    res.status(201).json({ template });
  } catch (err: any) {
    console.error('createCTCTemplate error:', err);
    res.status(400).json({ error: err.message });
  }
}

/**
 * 6. Get Employee Salary Structure & History
 */
export async function getEmployeeSalaryStructure(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const orgId = req.organizationId;

    // Check employee
    const { data: employee, error: empErr } = await supabaseAdmin
      .from('employees')
      .select('id, first_name, last_name, employee_id, basic_salary, salary_type')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (empErr || !employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Active components (effective_to is null)
    const { data: activeComponents, error: compErr } = await supabaseAdmin
      .from('employee_salary_components')
      .select('*, definition:salary_component_definitions(*)')
      .eq('employee_id', id)
      .eq('organization_id', orgId)
      .is('effective_to', null);

    if (compErr) throw compErr;

    // Revision history
    const { data: history, error: histErr } = await supabaseAdmin
      .from('employee_salary_components')
      .select('*, definition:salary_component_definitions(name, code, component_type)')
      .eq('employee_id', id)
      .eq('organization_id', orgId)
      .order('effective_from', { ascending: false });

    if (histErr) throw histErr;

    // Compute live breakdown
    const componentAssignments: EmployeeComponentAssignment[] = (activeComponents || []).map((c: any) => ({
      component_code: c.definition?.code || 'UNKNOWN',
      component_name: c.definition?.name || 'Component',
      component_type: c.definition?.component_type || 'earning',
      calc_type: c.calc_type,
      value: Number(c.value),
      formula: c.definition?.formula,
    }));

    const breakdown = computeEmployeeSalaryBreakdown(
      Number(employee.basic_salary),
      componentAssignments
    );

    res.json({
      employee,
      activeComponents: activeComponents || [],
      history: history || [],
      breakdown,
    });
  } catch (err: any) {
    console.error('getEmployeeSalaryStructure error:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * 7. Revise Employee Salary Structure (Effective-Dated)
 */
export async function reviseEmployeeSalary(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const orgId = req.organizationId;
    const parsed = reviseSalarySchema.parse(req.body);

    // 1. Fetch current employee
    const { data: employee, error: empErr } = await supabaseAdmin
      .from('employees')
      .select('*')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (empErr || !employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const effectiveDate = new Date(parsed.effective_from);
    const dayBefore = new Date(effectiveDate);
    dayBefore.setDate(dayBefore.getDate() - 1);
    const dayBeforeStr = dayBefore.toISOString().split('T')[0];

    // 2. Close out current active component assignments
    await supabaseAdmin
      .from('employee_salary_components')
      .update({ effective_to: dayBeforeStr })
      .eq('employee_id', id)
      .eq('organization_id', orgId)
      .is('effective_to', null);

    // 3. Insert new effective-dated assignments
    const newComponentRows = parsed.components.map((c) => ({
      organization_id: orgId,
      employee_id: id,
      component_definition_id: c.component_definition_id,
      calc_type: c.calc_type,
      value: c.value,
      effective_from: parsed.effective_from,
      effective_to: null,
      revision_reason: parsed.revision_reason || 'Salary Revision',
      created_by: req.user?.id,
    }));

    if (newComponentRows.length > 0) {
      const { error: insErr } = await supabaseAdmin
        .from('employee_salary_components')
        .insert(newComponentRows);

      if (insErr) throw insErr;
    }

    // 4. Update basic salary on employee master
    const { data: updatedEmp, error: upErr } = await supabaseAdmin
      .from('employees')
      .update({ basic_salary: parsed.basic_salary })
      .eq('id', id)
      .eq('organization_id', orgId)
      .select()
      .single();

    if (upErr) throw upErr;

    // 5. Audit Log
    await logAuditTrail(req, {
      action: 'SALARY_REVISION_CREATED',
      entity_type: 'employees',
      entity_id: id,
      old_values: { basic_salary: employee.basic_salary },
      new_values: {
        basic_salary: parsed.basic_salary,
        effective_from: parsed.effective_from,
        revision_reason: parsed.revision_reason,
        components_count: parsed.components.length,
      },
    });

    res.status(201).json({
      employee: updatedEmp,
      message: `Salary revision effective from ${parsed.effective_from} recorded successfully.`,
    });
  } catch (err: any) {
    console.error('reviseEmployeeSalary error:', err);
    res.status(400).json({ error: err.message });
  }
}

/**
 * 8. Live CTC Preview Breakdown
 */
export async function calculateCTCPreview(req: Request, res: Response) {
  try {
    const { monthly_gross } = req.query;
    const grossNum = Number(monthly_gross);

    if (isNaN(grossNum) || grossNum <= 0) {
      return res.status(400).json({ error: 'Valid positive monthly_gross required' });
    }

    const preview = calculateStandardCTCBreakup(grossNum);
    res.json({ preview });
  } catch (err: any) {
    console.error('calculateCTCPreview error:', err);
    res.status(500).json({ error: err.message });
  }
}
