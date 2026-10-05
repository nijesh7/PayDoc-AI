-- ============================================================================
-- PAYDOC AI — Migration 0006: Leave & Attendance Management Engine
-- ============================================================================

-- 0. Ensure payroll_items has lop_days column for deterministic payroll deduction
ALTER TABLE payroll_items ADD COLUMN IF NOT EXISTS lop_days NUMERIC(5,2) NOT NULL DEFAULT 0.00;

-- ----------------------------------------------------------------------------
-- 1. LEAVE TYPES (Catalog per Organization)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leave_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL, -- 'CL', 'SL', 'PL', 'LOP', 'COMP', 'ML', 'PATL'
    days_allowed_per_year NUMERIC(5,2) NOT NULL DEFAULT 12.00,
    is_paid BOOLEAN NOT NULL DEFAULT true,
    carry_forward_limit NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    is_encashable BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(organization_id, code)
);

-- ----------------------------------------------------------------------------
-- 2. EMPLOYEE LEAVE BALANCES (Annual Entitlement & Usage)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS employee_leave_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_type_id UUID NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
    year INT NOT NULL,
    allocated_days NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    used_days NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    pending_days NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    carried_forward_days NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(organization_id, employee_id, leave_type_id, year)
);

-- ----------------------------------------------------------------------------
-- 3. LEAVE REQUESTS (Applications & Approvals)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_type_id UUID NOT NULL REFERENCES leave_types(id) ON DELETE RESTRICT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_count NUMERIC(5,2) NOT NULL CHECK (days_count > 0),
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    review_comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 4. ATTENDANCE RECORDS (Daily Clock-ins & Status)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'half_day', 'holiday', 'on_leave', 'weekend')),
    check_in TIMESTAMPTZ,
    check_out TIMESTAMPTZ,
    work_hours NUMERIC(4,2),
    overtime_hours NUMERIC(4,2) NOT NULL DEFAULT 0.00,
    source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'biometric', 'csv_import', 'system')),
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(organization_id, employee_id, date)
);

-- ----------------------------------------------------------------------------
-- 5. HOLIDAYS (Public & Company Holiday Calendar)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS holidays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    date DATE NOT NULL,
    is_optional BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(organization_id, date)
);

-- ----------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------
ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is an employee matching given employee_id
CREATE OR REPLACE FUNCTION is_current_user_employee(emp_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM employees
        WHERE id = emp_id
          AND user_id = auth.uid()
          AND status = 'active'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 6.1 Leave Types RLS
DROP POLICY IF EXISTS "leave_types_select" ON leave_types;
CREATE POLICY "leave_types_select" ON leave_types
    FOR SELECT TO authenticated
    USING (organization_id = current_user_organization_id());

DROP POLICY IF EXISTS "leave_types_modify" ON leave_types;
CREATE POLICY "leave_types_modify" ON leave_types
    FOR ALL TO authenticated
    USING (
        organization_id = current_user_organization_id()
        AND current_user_role() IN ('admin', 'hr')
    );

-- 6.2 Employee Leave Balances RLS
DROP POLICY IF EXISTS "leave_balances_select" ON employee_leave_balances;
CREATE POLICY "leave_balances_select" ON employee_leave_balances
    FOR SELECT TO authenticated
    USING (
        organization_id = current_user_organization_id()
        AND (
            current_user_role() IN ('admin', 'hr', 'accountant')
            OR is_current_user_employee(employee_id)
        )
    );

DROP POLICY IF EXISTS "leave_balances_modify" ON employee_leave_balances;
CREATE POLICY "leave_balances_modify" ON employee_leave_balances
    FOR ALL TO authenticated
    USING (
        organization_id = current_user_organization_id()
        AND current_user_role() IN ('admin', 'hr')
    );

-- 6.3 Leave Requests RLS
DROP POLICY IF EXISTS "leave_requests_select" ON leave_requests;
CREATE POLICY "leave_requests_select" ON leave_requests
    FOR SELECT TO authenticated
    USING (
        organization_id = current_user_organization_id()
        AND (
            current_user_role() IN ('admin', 'hr', 'accountant')
            OR is_current_user_employee(employee_id)
        )
    );

DROP POLICY IF EXISTS "leave_requests_insert" ON leave_requests;
CREATE POLICY "leave_requests_insert" ON leave_requests
    FOR INSERT TO authenticated
    WITH CHECK (
        organization_id = current_user_organization_id()
        AND (
            current_user_role() IN ('admin', 'hr')
            OR is_current_user_employee(employee_id)
        )
    );

DROP POLICY IF EXISTS "leave_requests_update" ON leave_requests;
CREATE POLICY "leave_requests_update" ON leave_requests
    FOR UPDATE TO authenticated
    USING (
        organization_id = current_user_organization_id()
        AND (
            current_user_role() IN ('admin', 'hr')
            OR (is_current_user_employee(employee_id) AND status = 'pending')
        )
    );

-- 6.4 Attendance Records RLS
DROP POLICY IF EXISTS "attendance_select" ON attendance_records;
CREATE POLICY "attendance_select" ON attendance_records
    FOR SELECT TO authenticated
    USING (
        organization_id = current_user_organization_id()
        AND (
            current_user_role() IN ('admin', 'hr', 'accountant')
            OR is_current_user_employee(employee_id)
        )
    );

DROP POLICY IF EXISTS "attendance_modify" ON attendance_records;
CREATE POLICY "attendance_modify" ON attendance_records
    FOR ALL TO authenticated
    USING (
        organization_id = current_user_organization_id()
        AND current_user_role() IN ('admin', 'hr')
    );

-- 6.5 Holidays RLS
DROP POLICY IF EXISTS "holidays_select" ON holidays;
CREATE POLICY "holidays_select" ON holidays
    FOR SELECT TO authenticated
    USING (organization_id = current_user_organization_id());

DROP POLICY IF EXISTS "holidays_modify" ON holidays;
CREATE POLICY "holidays_modify" ON holidays
    FOR ALL TO authenticated
    USING (
        organization_id = current_user_organization_id()
        AND current_user_role() IN ('admin', 'hr')
    );

-- ----------------------------------------------------------------------------
-- 7. SEED DATA (Default Indian Leave Types & 2026 National Holidays)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    org_record RECORD;
BEGIN
    FOR org_record IN SELECT id FROM organizations LOOP
        -- Seed Default Leave Types
        INSERT INTO leave_types (organization_id, name, code, days_allowed_per_year, is_paid, carry_forward_limit, is_encashable)
        VALUES
            (org_record.id, 'Casual Leave', 'CL', 12.00, true, 0.00, false),
            (org_record.id, 'Sick Leave', 'SL', 12.00, true, 0.00, false),
            (org_record.id, 'Privilege / Earned Leave', 'PL', 15.00, true, 30.00, true),
            (org_record.id, 'Loss of Pay (Unpaid Leave)', 'LOP', 0.00, false, 0.00, false),
            (org_record.id, 'Compensatory Off', 'COMP', 0.00, true, 5.00, false)
        ON CONFLICT (organization_id, code) DO NOTHING;

        -- Seed 2026 Indian Statutory Holidays
        INSERT INTO holidays (organization_id, name, date, is_optional)
        VALUES
            (org_record.id, 'Republic Day', '2026-01-26', false),
            (org_record.id, 'Holi', '2026-03-04', false),
            (org_record.id, 'Good Friday', '2026-04-03', true),
            (org_record.id, 'May Day / Labour Day', '2026-05-01', false),
            (org_record.id, 'Independence Day', '2026-08-15', false),
            (org_record.id, 'Mahatma Gandhi Jayanti', '2026-10-02', false),
            (org_record.id, 'Dussehra / Vijayadashami', '2026-10-20', false),
            (org_record.id, 'Diwali / Deepavali', '2026-11-08', false),
            (org_record.id, 'Christmas', '2026-12-25', false)
        ON CONFLICT (organization_id, date) DO NOTHING;
    END LOOP;
END $$;
