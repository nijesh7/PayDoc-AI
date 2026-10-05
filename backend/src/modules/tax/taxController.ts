import { Request, Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../../config/supabase';
import { logAuditTrail } from '../../services/audit/auditService';
import { generateForm16PDF } from '../../services/pdf/form16Generator';
import {
  compareTaxRegimes,
  calculateNewRegimeTax,
  calculateOldRegimeTax,
  calculateEPF,
  calculateESI,
  calculateProfessionalTax,
} from '../../services/tax/indianTaxCalculator';

const taxDeclarationSchema = z.object({
  employee_id: z.string().uuid(),
  financial_year: z.string().default('2026-2027'),
  regime: z.enum(['new', 'old']).default('new'),
  standard_deduction: z.number().default(75000),
  sec_80c: z.number().min(0).max(150000).default(0),
  sec_80d_self: z.number().min(0).max(25000).default(0),
  sec_80d_parents: z.number().min(0).max(50000).default(0),
  sec_80ccd_nps: z.number().min(0).max(50000).default(0),
  sec_24b_home_loan_interest: z.number().min(0).max(200000).default(0),
  hra_annual_rent_paid: z.number().min(0).default(0),
  is_metro_city: z.boolean().default(true),
  other_exemptions: z.number().min(0).default(0),
  proofs_attached: z.array(z.any()).default([]),
});

const statutoryDetailsSchema = z.object({
  employee_id: z.string().uuid(),
  uan: z.string().optional().nullable(),
  pf_number: z.string().optional().nullable(),
  is_pf_eligible: z.boolean().default(true),
  pf_wage_ceiling_applicable: z.boolean().default(true),
  vpf_percentage: z.number().min(0).max(100).default(0),
  esi_number: z.string().optional().nullable(),
  is_esi_eligible: z.boolean().default(false),
  pt_state: z.string().default('Karnataka'),
});

/**
 * 1. Simulate & Compare Tax Regimes (Interactive Simulator)
 */
export async function simulateTaxRegimes(req: Request, res: Response) {
  try {
    const {
      grossAnnualSalary,
      annualBasic,
      annualHRA,
      sec80C,
      sec80D_self,
      sec80D_parents,
      sec80CCD_nps,
      sec24b_homeLoanInterest,
      annualRentPaid,
      isMetroCity,
      otherExemptions,
    } = req.query;

    const gross = Number(grossAnnualSalary) || 0;
    const basic = Number(annualBasic) || gross * 0.5; // fallback to 50% basic
    const hra = Number(annualHRA) || basic * 0.4; // fallback to 40% of basic

    const comparison = compareTaxRegimes(gross, basic, hra, {
      sec80C: Number(sec80C) || 0,
      sec80D_self: Number(sec80D_self) || 0,
      sec80D_parents: Number(sec80D_parents) || 0,
      sec80CCD_nps: Number(sec80CCD_nps) || 0,
      sec24b_homeLoanInterest: Number(sec24b_homeLoanInterest) || 0,
      annualRentPaid: Number(annualRentPaid) || 0,
      isMetroCity: isMetroCity !== 'false',
      otherExemptions: Number(otherExemptions) || 0,
    });

    res.json({ comparison });
  } catch (err: any) {
    console.error('simulateTaxRegimes error:', err);
    res.status(400).json({ error: err.message });
  }
}

/**
 * 2. Get Employee Tax Declaration
 */
export async function getEmployeeTaxDeclaration(req: Request, res: Response) {
  try {
    const orgId = req.organizationId;
    const { employeeId } = req.params;
    const financialYear = (req.query.financialYear as string) || '2026-2027';

    const { data, error } = await supabaseAdmin
      .from('employee_tax_declarations')
      .select('*, employee:employees(id, first_name, last_name, employee_id, basic_salary)')
      .eq('organization_id', orgId)
      .eq('employee_id', employeeId)
      .eq('financial_year', financialYear)
      .maybeSingle();

    if (error) throw error;

    res.json({ declaration: data || null, financialYear });
  } catch (err: any) {
    console.error('getEmployeeTaxDeclaration error:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * 3. Save or Update Employee Tax Declaration
 */
export async function saveEmployeeTaxDeclaration(req: Request, res: Response) {
  try {
    const orgId = req.organizationId;
    const parsed = taxDeclarationSchema.parse(req.body);

    const payload = {
      organization_id: orgId,
      employee_id: parsed.employee_id,
      financial_year: parsed.financial_year,
      regime: parsed.regime,
      standard_deduction: parsed.regime === 'new' ? 75000 : 50000,
      sec_80c: parsed.sec_80c,
      sec_80d_self: parsed.sec_80d_self,
      sec_80d_parents: parsed.sec_80d_parents,
      sec_80ccd_nps: parsed.sec_80ccd_nps,
      sec_24b_home_loan_interest: parsed.sec_24b_home_loan_interest,
      hra_annual_rent_paid: parsed.hra_annual_rent_paid,
      is_metro_city: parsed.is_metro_city,
      other_exemptions: parsed.other_exemptions,
      proofs_attached: parsed.proofs_attached,
      status: 'submitted',
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from('employee_tax_declarations')
      .upsert(payload, { onConflict: 'organization_id,employee_id,financial_year' })
      .select()
      .single();

    if (error) throw error;

    await logAuditTrail(req, {
      action: 'TAX_DECLARATION_SAVED',
      entity_type: 'employee_tax_declarations',
      entity_id: data.id,
      new_values: payload,
    });

    res.json({ declaration: data });
  } catch (err: any) {
    console.error('saveEmployeeTaxDeclaration error:', err);
    res.status(400).json({ error: err.message });
  }
}

/**
 * 4. Verify Tax Declaration (HR/Admin action)
 */
export async function verifyTaxDeclaration(req: Request, res: Response) {
  try {
    const orgId = req.organizationId;
    const { id } = req.params;
    const actorId = req.user?.id;
    const { status, remarks } = req.body;

    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({ error: "Status must be 'verified' or 'rejected'" });
    }

    const { data, error } = await supabaseAdmin
      .from('employee_tax_declarations')
      .update({
        status,
        verified_by: actorId,
        verified_at: new Date().toISOString(),
        verification_remarks: remarks || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('organization_id', orgId)
      .select()
      .single();

    if (error) throw error;

    await logAuditTrail(req, {
      action: status === 'verified' ? 'TAX_DECLARATION_VERIFIED' : 'TAX_DECLARATION_REJECTED',
      entity_type: 'employee_tax_declarations',
      entity_id: id,
      new_values: { status, remarks },
    });

    res.json({ declaration: data });
  } catch (err: any) {
    console.error('verifyTaxDeclaration error:', err);
    res.status(400).json({ error: err.message });
  }
}

/**
 * 5. Get Employee Statutory Details (UAN, PF, ESI, PT)
 */
export async function getEmployeeStatutoryDetails(req: Request, res: Response) {
  try {
    const orgId = req.organizationId;
    const { employeeId } = req.params;

    const { data, error } = await supabaseAdmin
      .from('employee_statutory_details')
      .select('*, employee:employees(id, first_name, last_name, employee_id, basic_salary)')
      .eq('organization_id', orgId)
      .eq('employee_id', employeeId)
      .maybeSingle();

    if (error) throw error;

    res.json({ statutoryDetails: data || null });
  } catch (err: any) {
    console.error('getEmployeeStatutoryDetails error:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * 6. Save or Update Employee Statutory Details
 */
export async function saveEmployeeStatutoryDetails(req: Request, res: Response) {
  try {
    const orgId = req.organizationId;
    const parsed = statutoryDetailsSchema.parse(req.body);

    const payload = {
      organization_id: orgId,
      employee_id: parsed.employee_id,
      uan: parsed.uan || null,
      pf_number: parsed.pf_number || null,
      is_pf_eligible: parsed.is_pf_eligible,
      pf_wage_ceiling_applicable: parsed.pf_wage_ceiling_applicable,
      vpf_percentage: parsed.vpf_percentage,
      esi_number: parsed.esi_number || null,
      is_esi_eligible: parsed.is_esi_eligible,
      pt_state: parsed.pt_state,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from('employee_statutory_details')
      .upsert(payload, { onConflict: 'organization_id,employee_id' })
      .select()
      .single();

    if (error) throw error;

    await logAuditTrail(req, {
      action: 'STATUTORY_DETAILS_SAVED',
      entity_type: 'employee_statutory_details',
      entity_id: data.id,
      new_values: payload,
    });

    res.json({ statutoryDetails: data });
  } catch (err: any) {
    console.error('saveEmployeeStatutoryDetails error:', err);
    res.status(400).json({ error: err.message });
  }
}

/**
 * 7. Get PT State Slabs
 */
export async function getPtStateSlabs(req: Request, res: Response) {
  try {
    const { data, error } = await supabaseAdmin
      .from('pt_state_slabs')
      .select('*')
      .order('state', { ascending: true })
      .order('min_gross', { ascending: true });

    if (error) throw error;
    res.json({ slabs: data || [] });
  } catch (err: any) {
    console.error('getPtStateSlabs error:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * 8. Download Form 16 Part B Certificate PDF
 */
export async function downloadForm16PDF(req: Request, res: Response) {
  try {
    const { employeeId } = req.params;
    const orgId = req.organizationId;
    const financialYear = (req.query.fy as string) || '2026-2027';

    // Parse start and end years
    const [startYearStr, endYearStr] = financialYear.split('-');
    const startYear = parseInt(startYearStr, 10) || 2026;
    const endYear = parseInt(endYearStr, 10) || 2027;
    const assessmentYear = `${endYear}-${endYear + 1}`;

    // Fetch employee
    const { data: employee, error: empError } = await supabaseAdmin
      .from('employees')
      .select('*, departments(name)')
      .eq('id', employeeId)
      .eq('organization_id', orgId)
      .single();

    if (empError || !employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Fetch organization details
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .single();

    // Fetch tax declaration
    const { data: declaration } = await supabaseAdmin
      .from('employee_tax_declarations')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('organization_id', orgId)
      .eq('financial_year', financialYear)
      .maybeSingle();

    // Fetch payroll items for this employee in the FY (April of startYear to March of endYear)
    const { data: payrollItems } = await supabaseAdmin
      .from('payroll_items')
      .select('*, payroll_runs!inner(*)')
      .eq('employee_id', employeeId)
      .eq('organization_id', orgId);

    // Filter items matching the FY
    const fyItems = (payrollItems || []).filter((item: any) => {
      const run = item.payroll_runs;
      if (!run) return false;
      const isStartYear = run.year === startYear && run.month >= 4;
      const isEndYear = run.year === endYear && run.month <= 3;
      return isStartYear || isEndYear;
    });

    let grossSalary = 0;
    let professionalTax = 0;
    let tdsDeducted = 0;

    if (fyItems.length > 0) {
      for (const item of fyItems) {
        grossSalary += Number(item.basic_salary) + Number(item.allowances_amount || 0) + Number(item.overtime_amount || 0) + Number(item.bonus_amount || 0);
        professionalTax += Number(item.pt_amount || 0);
        tdsDeducted += Number(item.tds_amount || 0);
      }
    } else {
      // Annual estimate from current base salary
      grossSalary = Number(employee.basic_salary) * 12;
      professionalTax = 2400; // standard default
    }

    const regime = (declaration?.regime as 'new' | 'old') || 'new';
    let taxResult;
    let hraExemption = 0;
    let sec80C = 0;
    let sec80D = 0;
    let sec80CCD = 0;
    let sec24b = 0;
    let totalDeductionsChapterVIA = 0;

    if (regime === 'old' && declaration) {
      const annualBasic = Number(employee.basic_salary) * 12;
      const annualHRA = (grossSalary - annualBasic) * 0.5;
      sec80C = Number(declaration.sec_80c || 0);
      sec80D = Number(declaration.sec_80d_self || 0) + Number(declaration.sec_80d_parents || 0);
      sec80CCD = Number(declaration.sec_80ccd_nps || 0);
      sec24b = Number(declaration.sec_24b_home_loan_interest || 0);

      const oldTax = calculateOldRegimeTax(grossSalary, annualBasic, annualHRA, {
        sec80C,
        sec80D_self: Number(declaration.sec_80d_self || 0),
        sec80D_parents: Number(declaration.sec_80d_parents || 0),
        sec80CCD_nps: sec80CCD,
        sec24b_homeLoanInterest: sec24b,
        annualRentPaid: Number(declaration.hra_annual_rent_paid || 0),
        isMetroCity: declaration.is_metro_city,
        otherExemptions: Number(declaration.other_exemptions || 0),
      });

      taxResult = oldTax;
      hraExemption = Number(oldTax.deductionsBreakdown?.['Section 10(13A) HRA Exemption'] || 0);
      totalDeductionsChapterVIA = Number(oldTax.totalExemptionsAndDeductions || 0);
    } else {
      taxResult = calculateNewRegimeTax(grossSalary);
    }

    const totalIncomeSalaries = Math.max(0, grossSalary - Number(taxResult.standardDeduction) - professionalTax);

    const pdfBuffer = generateForm16PDF({
      employerName: org?.name || 'PayDoc AI Technologies',
      employerAddress: org?.address || 'Bangalore, Karnataka, India',
      employerPAN: org?.tax_id || 'AABCP1234D',
      employerTAN: 'BLRP12345E',
      employeeName: `${employee.first_name} ${employee.last_name}`,
      employeeId: employee.employee_id,
      employeePAN: employee.pan_number || 'PANNOTFOUND',
      financialYear,
      assessmentYear,
      regime,
      grossSalary,
      hraExemption,
      standardDeduction: Number(taxResult.standardDeduction),
      professionalTax,
      totalIncomeSalaries,
      sec80C,
      sec80D,
      sec80CCD,
      sec24b,
      totalDeductionsChapterVIA,
      taxableIncome: Number(taxResult.taxableIncome),
      taxOnTotalIncome: Number(taxResult.taxBeforeCess),
      rebate87A: Number(taxResult.rebate87A),
      cess: Number(taxResult.healthAndEduCess),
      totalTaxPayable: Number(taxResult.totalAnnualTax),
      tdsDeducted: tdsDeducted || Number(taxResult.totalAnnualTax),
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Form16_${employee.employee_id}_${financialYear}.pdf`);
    res.send(pdfBuffer);
  } catch (err: any) {
    console.error('downloadForm16PDF error:', err);
    res.status(500).json({ error: err.message });
  }
}
