-- ============================================================================
-- PAYDOC AI — Migration 0007: Indian Statutory Tax Engine (TDS, PF, ESI, PT)
-- ============================================================================

-- 0. Add statutory deduction columns to payroll_items
ALTER TABLE payroll_items ADD COLUMN IF NOT EXISTS tds_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00;
ALTER TABLE payroll_items ADD COLUMN IF NOT EXISTS pf_employee NUMERIC(12,2) NOT NULL DEFAULT 0.00;
ALTER TABLE payroll_items ADD COLUMN IF NOT EXISTS pf_employer NUMERIC(12,2) NOT NULL DEFAULT 0.00;
ALTER TABLE payroll_items ADD COLUMN IF NOT EXISTS esi_employee NUMERIC(12,2) NOT NULL DEFAULT 0.00;
ALTER TABLE payroll_items ADD COLUMN IF NOT EXISTS esi_employer NUMERIC(12,2) NOT NULL DEFAULT 0.00;
ALTER TABLE payroll_items ADD COLUMN IF NOT EXISTS pt_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00;

-- ----------------------------------------------------------------------------
-- 1. EMPLOYEE STATUTORY DETAILS (UAN, PF, ESI, PT State)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS employee_statutory_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    uan TEXT, -- Universal Account Number
    pf_number TEXT,
    is_pf_eligible BOOLEAN NOT NULL DEFAULT true,
    pf_wage_ceiling_applicable BOOLEAN NOT NULL DEFAULT true, -- 12% of min(basic, 15000)
    vpf_percentage NUMERIC(5,2) NOT NULL DEFAULT 0.00, -- Voluntary PF
    esi_number TEXT,
    is_esi_eligible BOOLEAN NOT NULL DEFAULT false, -- True if Gross <= 21,000
    pt_state TEXT NOT NULL DEFAULT 'Karnataka',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(organization_id, employee_id)
);

-- ----------------------------------------------------------------------------
-- 2. EMPLOYEE TAX DECLARATIONS (Regime Selection & Exemptions)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS employee_tax_declarations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    financial_year TEXT NOT NULL, -- e.g. '2026-2027'
    regime TEXT NOT NULL CHECK (regime IN ('new', 'old')) DEFAULT 'new',
    standard_deduction NUMERIC(12,2) NOT NULL DEFAULT 75000.00,
    sec_80c NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (sec_80c >= 0),
    sec_80d_self NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (sec_80d_self >= 0),
    sec_80d_parents NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (sec_80d_parents >= 0),
    sec_80ccd_nps NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (sec_80ccd_nps >= 0),
    sec_24b_home_loan_interest NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (sec_24b_home_loan_interest >= 0),
    hra_annual_rent_paid NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (hra_annual_rent_paid >= 0),
    is_metro_city BOOLEAN NOT NULL DEFAULT true,
    other_exemptions NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (other_exemptions >= 0),
    status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'verified', 'rejected')),
    verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    verification_remarks TEXT,
    proofs_attached JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(organization_id, employee_id, financial_year)
);

-- ----------------------------------------------------------------------------
-- 3. PROFESSIONAL TAX (PT) STATE SLABS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pt_state_slabs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state TEXT NOT NULL,
    min_gross NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    max_gross NUMERIC(12,2), -- NULL means infinity
    monthly_tax NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    february_tax NUMERIC(12,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(state, min_gross)
);

-- ----------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS)
-- ----------------------------------------------------------------------------
ALTER TABLE employee_statutory_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_tax_declarations ENABLE ROW LEVEL SECURITY;
ALTER TABLE pt_state_slabs ENABLE ROW LEVEL SECURITY;

-- 4.1 Statutory Details RLS
DROP POLICY IF EXISTS "statutory_details_select" ON employee_statutory_details;
CREATE POLICY "statutory_details_select" ON employee_statutory_details
    FOR SELECT TO authenticated
    USING (
        organization_id = current_user_organization_id()
        AND (
            current_user_role() IN ('admin', 'hr', 'accountant')
            OR is_current_user_employee(employee_id)
        )
    );

DROP POLICY IF EXISTS "statutory_details_modify" ON employee_statutory_details;
CREATE POLICY "statutory_details_modify" ON employee_statutory_details
    FOR ALL TO authenticated
    USING (
        organization_id = current_user_organization_id()
        AND current_user_role() IN ('admin', 'hr')
    );

-- 4.2 Tax Declarations RLS
DROP POLICY IF EXISTS "tax_declarations_select" ON employee_tax_declarations;
CREATE POLICY "tax_declarations_select" ON employee_tax_declarations
    FOR SELECT TO authenticated
    USING (
        organization_id = current_user_organization_id()
        AND (
            current_user_role() IN ('admin', 'hr', 'accountant')
            OR is_current_user_employee(employee_id)
        )
    );

DROP POLICY IF EXISTS "tax_declarations_insert" ON employee_tax_declarations;
CREATE POLICY "tax_declarations_insert" ON employee_tax_declarations
    FOR INSERT TO authenticated
    WITH CHECK (
        organization_id = current_user_organization_id()
        AND (
            current_user_role() IN ('admin', 'hr')
            OR is_current_user_employee(employee_id)
        )
    );

DROP POLICY IF EXISTS "tax_declarations_update" ON employee_tax_declarations;
CREATE POLICY "tax_declarations_update" ON employee_tax_declarations
    FOR UPDATE TO authenticated
    USING (
        organization_id = current_user_organization_id()
        AND (
            current_user_role() IN ('admin', 'hr')
            OR (is_current_user_employee(employee_id) AND status IN ('draft', 'submitted'))
        )
    );

-- 4.3 PT State Slabs RLS (Read-only for all authenticated users)
DROP POLICY IF EXISTS "pt_slabs_select" ON pt_state_slabs;
CREATE POLICY "pt_slabs_select" ON pt_state_slabs
    FOR SELECT TO authenticated
    USING (true);

-- ----------------------------------------------------------------------------
-- 5. SEED DATA (Indian State PT Slabs)
-- ----------------------------------------------------------------------------
INSERT INTO pt_state_slabs (state, min_gross, max_gross, monthly_tax, february_tax)
VALUES
    -- Karnataka (Under ₹25,000: Nil, ₹25,000+: ₹200/mo)
    ('Karnataka', 0.00, 24999.99, 0.00, 0.00),
    ('Karnataka', 25000.00, NULL, 200.00, 200.00),

    -- Maharashtra (Men: <7,500: Nil; 7,500-10,000: 175; >10,000: 200, Feb: 300)
    ('Maharashtra', 0.00, 7499.99, 0.00, 0.00),
    ('Maharashtra', 7500.00, 9999.99, 175.00, 175.00),
    ('Maharashtra', 10000.00, NULL, 200.00, 300.00),

    -- Telangana & Andhra Pradesh (<15k: Nil, 15k-20k: 150, >20k: 200)
    ('Telangana', 0.00, 14999.99, 0.00, 0.00),
    ('Telangana', 15000.00, 19999.99, 150.00, 150.00),
    ('Telangana', 20000.00, NULL, 200.00, 200.00),

    -- Tamil Nadu (Semi-annual slab simplified to monthly equivalent ₹200)
    ('Tamil Nadu', 0.00, 20999.99, 0.00, 0.00),
    ('Tamil Nadu', 21000.00, NULL, 208.00, 208.00),

    -- Delhi & Haryana (No Professional Tax)
    ('Delhi', 0.00, NULL, 0.00, 0.00),
    ('Haryana', 0.00, NULL, 0.00, 0.00)
ON CONFLICT (state, min_gross) DO NOTHING;
