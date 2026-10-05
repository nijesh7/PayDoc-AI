-- ============================================================================
-- PAYDOC AI — Migration 0005: Configurable Salary Components & Approvals Engine
-- ============================================================================

-- Ensure RLS helper functions exist
CREATE OR REPLACE FUNCTION current_user_organization_id()
RETURNS UUID AS $$
    SELECT organization_id FROM users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT AS $$
    SELECT lower(role) FROM users WHERE id = auth.uid() AND (status IS NULL OR status = 'active');
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 1. SALARY COMPONENT DEFINITIONS (Master Catalog per Organization)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS salary_component_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL, -- e.g. 'BASIC', 'HRA', 'SPECIAL', 'CONVEYANCE', 'PF_EMP', 'PT', 'TDS'
    component_type TEXT NOT NULL CHECK (component_type IN ('earning', 'deduction')),
    calc_type TEXT NOT NULL CHECK (calc_type IN ('fixed', 'percent_of_basic', 'percent_of_gross', 'formula')),
    default_value NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    formula TEXT, -- e.g. 'BASIC * 0.50'
    is_taxable BOOLEAN NOT NULL DEFAULT true,
    pf_applicable BOOLEAN NOT NULL DEFAULT false,
    esi_applicable BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(organization_id, code)
);

-- ----------------------------------------------------------------------------
-- 2. CTC BREAKUP TEMPLATES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ctc_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(organization_id, name)
);

CREATE TABLE IF NOT EXISTS ctc_template_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES ctc_templates(id) ON DELETE CASCADE,
    component_definition_id UUID NOT NULL REFERENCES salary_component_definitions(id) ON DELETE CASCADE,
    calc_type TEXT NOT NULL CHECK (calc_type IN ('fixed', 'percent_of_basic', 'percent_of_gross', 'formula')),
    value NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(template_id, component_definition_id)
);

-- ----------------------------------------------------------------------------
-- 3. EMPLOYEE SALARY COMPONENTS (Effective-Dated Revision History)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS employee_salary_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    component_definition_id UUID NOT NULL REFERENCES salary_component_definitions(id) ON DELETE CASCADE,
    calc_type TEXT NOT NULL CHECK (calc_type IN ('fixed', 'percent_of_basic', 'percent_of_gross', 'formula')),
    value NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (value >= 0),
    effective_from DATE NOT NULL,
    effective_to DATE, -- NULL indicates current active revision
    revision_reason TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 4. APPROVAL WORKFLOWS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS approval_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('payroll_run', 'invoice', 'leave_request', 'reimbursement')),
    name TEXT NOT NULL,
    min_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (min_amount >= 0),
    max_amount NUMERIC(12,2),
    steps JSONB NOT NULL DEFAULT '[]'::jsonb,
    maker_checker_enforced BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 5. APPROVALS & APPROVAL STEPS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    workflow_id UUID REFERENCES approval_workflows(id) ON DELETE SET NULL,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('payroll_run', 'invoice', 'leave_request', 'reimbursement')),
    entity_id UUID NOT NULL,
    current_step INTEGER NOT NULL DEFAULT 1,
    total_steps INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(organization_id, entity_type, entity_id)
);

CREATE TABLE IF NOT EXISTS approval_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    approval_id UUID NOT NULL REFERENCES approvals(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    required_role TEXT NOT NULL CHECK (lower(required_role) IN ('admin', 'hr', 'accountant', 'manager')),
    approver_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'skipped')),
    comments TEXT,
    acted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 6. INDEXES
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_sc_defs_org ON salary_component_definitions(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_ctc_templates_org ON ctc_templates(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_emp_sc_emp_active ON employee_salary_components(employee_id, effective_to);
CREATE INDEX IF NOT EXISTS idx_emp_sc_org ON employee_salary_components(organization_id);
CREATE INDEX IF NOT EXISTS idx_approval_workflows_org_entity ON approval_workflows(organization_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_approvals_org_status ON approvals(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_approvals_entity ON approvals(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_approval_steps_approval ON approval_steps(approval_id, step_number);

-- ----------------------------------------------------------------------------
-- 7. ENABLE ROW LEVEL SECURITY (RLS)
-- ----------------------------------------------------------------------------
ALTER TABLE salary_component_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ctc_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE ctc_template_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_salary_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_steps ENABLE ROW LEVEL SECURITY;

-- Salary Component Definitions Policies
CREATE POLICY "Users can view salary component definitions in their organization"
ON salary_component_definitions FOR SELECT TO authenticated
USING (organization_id = current_user_organization_id());

CREATE POLICY "Admin and HR can manage salary component definitions"
ON salary_component_definitions FOR ALL TO authenticated
USING (organization_id = current_user_organization_id() AND current_user_role() IN ('admin', 'hr'))
WITH CHECK (organization_id = current_user_organization_id() AND current_user_role() IN ('admin', 'hr'));

-- CTC Templates Policies
CREATE POLICY "Users can view ctc templates in their organization"
ON ctc_templates FOR SELECT TO authenticated
USING (organization_id = current_user_organization_id());

CREATE POLICY "Admin and HR can manage ctc templates"
ON ctc_templates FOR ALL TO authenticated
USING (organization_id = current_user_organization_id() AND current_user_role() IN ('admin', 'hr'))
WITH CHECK (organization_id = current_user_organization_id() AND current_user_role() IN ('admin', 'hr'));

-- CTC Template Components Policies
CREATE POLICY "Users can view ctc template components in their organization"
ON ctc_template_components FOR SELECT TO authenticated
USING (organization_id = current_user_organization_id());

CREATE POLICY "Admin and HR can manage ctc template components"
ON ctc_template_components FOR ALL TO authenticated
USING (organization_id = current_user_organization_id() AND current_user_role() IN ('admin', 'hr'))
WITH CHECK (organization_id = current_user_organization_id() AND current_user_role() IN ('admin', 'hr'));

-- Employee Salary Components Policies
CREATE POLICY "Authorized users can view employee salary components"
ON employee_salary_components FOR SELECT TO authenticated
USING (
    organization_id = current_user_organization_id()
    AND (
        current_user_role() IN ('admin', 'hr', 'accountant')
        OR employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    )
);

CREATE POLICY "Admin and HR can manage employee salary components"
ON employee_salary_components FOR ALL TO authenticated
USING (organization_id = current_user_organization_id() AND current_user_role() IN ('admin', 'hr'))
WITH CHECK (organization_id = current_user_organization_id() AND current_user_role() IN ('admin', 'hr'));

-- Approvals Policies
CREATE POLICY "Authorized users can view workflows"
ON approval_workflows FOR SELECT TO authenticated
USING (organization_id = current_user_organization_id());

CREATE POLICY "Admin can manage workflows"
ON approval_workflows FOR ALL TO authenticated
USING (organization_id = current_user_organization_id() AND current_user_role() = 'admin')
WITH CHECK (organization_id = current_user_organization_id() AND current_user_role() = 'admin');

CREATE POLICY "Users can view approvals in their organization"
ON approvals FOR SELECT TO authenticated
USING (organization_id = current_user_organization_id());

CREATE POLICY "Users can manage approvals in their organization"
ON approvals FOR ALL TO authenticated
USING (organization_id = current_user_organization_id())
WITH CHECK (organization_id = current_user_organization_id());

CREATE POLICY "Users can view approval steps in their organization"
ON approval_steps FOR SELECT TO authenticated
USING (organization_id = current_user_organization_id());

CREATE POLICY "Users can update approval steps in their organization"
ON approval_steps FOR ALL TO authenticated
USING (organization_id = current_user_organization_id())
WITH CHECK (organization_id = current_user_organization_id());

-- ----------------------------------------------------------------------------
-- 8. TRIGGERS FOR UPDATED_AT
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name IN (
            'salary_component_definitions', 'ctc_templates',
            'ctc_template_components', 'employee_salary_components',
            'approval_workflows', 'approvals', 'approval_steps'
          )
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON %I;', t);
        EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();', t);
    END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 9. DEFAULT SEED DATA (For each existing organization)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    org RECORD;
    def_basic_id UUID;
    def_hra_id UUID;
    def_spec_id UUID;
    def_pf_id UUID;
    def_pt_id UUID;
    def_tds_id UUID;
    tpl_std_id UUID;
BEGIN
    FOR org IN SELECT id FROM organizations LOOP
        -- Seed Standard Indian Salary Components Catalog
        INSERT INTO salary_component_definitions (organization_id, name, code, component_type, calc_type, default_value, formula, is_taxable, pf_applicable, esi_applicable, display_order)
        VALUES 
            (org.id, 'Basic Salary', 'BASIC', 'earning', 'fixed', 25000.00, NULL, true, true, true, 1),
            (org.id, 'House Rent Allowance (HRA)', 'HRA', 'earning', 'percent_of_basic', 50.00, 'BASIC * 0.50', true, false, false, 2),
            (org.id, 'Special Allowance', 'SPECIAL', 'earning', 'fixed', 10000.00, NULL, true, false, false, 3),
            (org.id, 'Conveyance Allowance', 'CONVEYANCE', 'earning', 'fixed', 1600.00, NULL, true, false, false, 4),
            (org.id, 'Provident Fund (Employee)', 'PF_EMP', 'deduction', 'percent_of_basic', 12.00, 'LEAST(BASIC, 15000) * 0.12', false, true, false, 5),
            (org.id, 'Professional Tax (PT)', 'PT', 'deduction', 'fixed', 200.00, NULL, false, false, false, 6),
            (org.id, 'Tax Deducted at Source (TDS)', 'TDS', 'deduction', 'fixed', 0.00, NULL, false, false, false, 7)
        ON CONFLICT (organization_id, code) DO NOTHING;

        -- Fetch IDs for template mapping
        SELECT id INTO def_basic_id FROM salary_component_definitions WHERE organization_id = org.id AND code = 'BASIC';
        SELECT id INTO def_hra_id FROM salary_component_definitions WHERE organization_id = org.id AND code = 'HRA';
        SELECT id INTO def_spec_id FROM salary_component_definitions WHERE organization_id = org.id AND code = 'SPECIAL';
        SELECT id INTO def_pf_id FROM salary_component_definitions WHERE organization_id = org.id AND code = 'PF_EMP';
        SELECT id INTO def_pt_id FROM salary_component_definitions WHERE organization_id = org.id AND code = 'PT';

        -- Create Standard Full-Time CTC Template
        INSERT INTO ctc_templates (id, organization_id, name, description, is_active)
        VALUES (gen_random_uuid(), org.id, 'Standard Full-Time (Indian IT/Services)', 'Standard 50% Basic, 25% HRA, Special Allowance, and PF/PT statutory deductions', true)
        ON CONFLICT (organization_id, name) DO NOTHING
        RETURNING id INTO tpl_std_id;

        IF tpl_std_id IS NOT NULL AND def_basic_id IS NOT NULL THEN
            INSERT INTO ctc_template_components (organization_id, template_id, component_definition_id, calc_type, value)
            VALUES
                (org.id, tpl_std_id, def_basic_id, 'percent_of_gross', 50.00),
                (org.id, tpl_std_id, def_hra_id, 'percent_of_basic', 50.00),
                (org.id, tpl_std_id, def_spec_id, 'fixed', 10000.00),
                (org.id, tpl_std_id, def_pf_id, 'percent_of_basic', 12.00),
                (org.id, tpl_std_id, def_pt_id, 'fixed', 200.00)
            ON CONFLICT DO NOTHING;
        END IF;

        -- Seed Default Payroll Run Approval Workflow (Step 1: HR, Step 2: ADMIN)
        INSERT INTO approval_workflows (organization_id, entity_type, name, min_amount, steps, maker_checker_enforced, is_active)
        VALUES (
            org.id,
            'payroll_run',
            'Two-Level Payroll Approval (HR Review -> Admin Signoff)',
            0.00,
            '[{"step": 1, "role": "HR", "title": "HR Payroll Verification"}, {"step": 2, "role": "ADMIN", "title": "Executive Approval & Disbursement"}]'::jsonb,
            true,
            true
        ) ON CONFLICT DO NOTHING;

        -- Seed High-Value Invoice Approval Workflow (> ₹50,000 Step 1: ACCOUNTANT, Step 2: ADMIN)
        INSERT INTO approval_workflows (organization_id, entity_type, name, min_amount, steps, maker_checker_enforced, is_active)
        VALUES (
            org.id,
            'invoice',
            'High-Value Invoice Signoff (> ₹50,000)',
            50000.00,
            '[{"step": 1, "role": "ACCOUNTANT", "title": "Accounts Verification"}, {"step": 2, "role": "ADMIN", "title": "Director Signoff"}]'::jsonb,
            true,
            true
        ) ON CONFLICT DO NOTHING;

    END LOOP;
END $$;
