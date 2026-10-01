-- ============================================================================
-- PAYDOC AI — Migration 0002: Row Level Security (RLS) & Multi-Tenant Isolation
-- ============================================================================

-- Enable RLS on all organization tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- HELPER FUNCTIONS FOR RLS (Security Definer)
-- ----------------------------------------------------------------------------

-- Get current authenticated user's organization ID
CREATE OR REPLACE FUNCTION current_user_organization_id()
RETURNS UUID AS $$
    SELECT organization_id FROM users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Get current authenticated user's role
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT AS $$
    SELECT role FROM users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 1. ORGANIZATIONS POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can view their own organization"
ON organizations FOR SELECT
TO authenticated
USING (id = current_user_organization_id());

CREATE POLICY "Admin can update their organization"
ON organizations FOR UPDATE
TO authenticated
USING (id = current_user_organization_id() AND current_user_role() = 'admin')
WITH CHECK (id = current_user_organization_id() AND current_user_role() = 'admin');

-- ----------------------------------------------------------------------------
-- 2. USERS POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can view members in their organization"
ON users FOR SELECT
TO authenticated
USING (organization_id = current_user_organization_id());

CREATE POLICY "Admin can manage users in their organization"
ON users FOR ALL
TO authenticated
USING (organization_id = current_user_organization_id() AND current_user_role() = 'admin')
WITH CHECK (organization_id = current_user_organization_id() AND current_user_role() = 'admin');

-- ----------------------------------------------------------------------------
-- 3. DEPARTMENTS POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can view departments in their organization"
ON departments FOR SELECT
TO authenticated
USING (organization_id = current_user_organization_id());

CREATE POLICY "Admin and HR can manage departments"
ON departments FOR ALL
TO authenticated
USING (organization_id = current_user_organization_id() AND current_user_role() IN ('admin', 'hr'))
WITH CHECK (organization_id = current_user_organization_id() AND current_user_role() IN ('admin', 'hr'));

-- ----------------------------------------------------------------------------
-- 4. EMPLOYEES POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Authorized users can view employees"
ON employees FOR SELECT
TO authenticated
USING (
    organization_id = current_user_organization_id()
    AND (
        current_user_role() IN ('admin', 'hr', 'accountant')
        OR user_id = auth.uid() -- Employee viewing own profile
    )
);

CREATE POLICY "Admin and HR can manage employees"
ON employees FOR ALL
TO authenticated
USING (organization_id = current_user_organization_id() AND current_user_role() IN ('admin', 'hr'))
WITH CHECK (organization_id = current_user_organization_id() AND current_user_role() IN ('admin', 'hr'));

-- ----------------------------------------------------------------------------
-- 5. SALARY COMPONENTS POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Authorized users can view salary components"
ON salary_components FOR SELECT
TO authenticated
USING (
    organization_id = current_user_organization_id()
    AND (
        current_user_role() IN ('admin', 'hr', 'accountant')
        OR employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    )
);

CREATE POLICY "Admin and HR can manage salary components"
ON salary_components FOR ALL
TO authenticated
USING (organization_id = current_user_organization_id() AND current_user_role() IN ('admin', 'hr'))
WITH CHECK (organization_id = current_user_organization_id() AND current_user_role() IN ('admin', 'hr'));

-- ----------------------------------------------------------------------------
-- 6. PAYROLL RUNS POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Authorized users can view payroll runs"
ON payroll_runs FOR SELECT
TO authenticated
USING (
    organization_id = current_user_organization_id()
    AND current_user_role() IN ('admin', 'hr', 'accountant')
);

CREATE POLICY "Admin and HR can manage payroll runs"
ON payroll_runs FOR ALL
TO authenticated
USING (organization_id = current_user_organization_id() AND current_user_role() IN ('admin', 'hr'))
WITH CHECK (organization_id = current_user_organization_id() AND current_user_role() IN ('admin', 'hr'));

-- ----------------------------------------------------------------------------
-- 7. PAYROLL ITEMS POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Authorized users can view payroll items"
ON payroll_items FOR SELECT
TO authenticated
USING (
    organization_id = current_user_organization_id()
    AND (
        current_user_role() IN ('admin', 'hr', 'accountant')
        OR employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    )
);

CREATE POLICY "Admin and HR can manage payroll items"
ON payroll_items FOR ALL
TO authenticated
USING (organization_id = current_user_organization_id() AND current_user_role() IN ('admin', 'hr'))
WITH CHECK (organization_id = current_user_organization_id() AND current_user_role() IN ('admin', 'hr'));

-- ----------------------------------------------------------------------------
-- 8. DOCUMENTS & EXTRACTIONS POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Authorized users can view documents"
ON documents FOR SELECT
TO authenticated
USING (
    organization_id = current_user_organization_id()
    AND (
        current_user_role() IN ('admin', 'hr', 'accountant')
        OR related_employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    )
);

CREATE POLICY "Authorized users can upload and manage documents"
ON documents FOR ALL
TO authenticated
USING (
    organization_id = current_user_organization_id()
    AND current_user_role() IN ('admin', 'hr', 'accountant')
)
WITH CHECK (
    organization_id = current_user_organization_id()
    AND current_user_role() IN ('admin', 'hr', 'accountant')
);

CREATE POLICY "Authorized users can view document extractions"
ON document_extractions FOR SELECT
TO authenticated
USING (
    organization_id = current_user_organization_id()
    AND current_user_role() IN ('admin', 'hr', 'accountant')
);

CREATE POLICY "Admin, HR and Accountant can manage extractions"
ON document_extractions FOR ALL
TO authenticated
USING (
    organization_id = current_user_organization_id()
    AND current_user_role() IN ('admin', 'hr', 'accountant')
)
WITH CHECK (
    organization_id = current_user_organization_id()
    AND current_user_role() IN ('admin', 'hr', 'accountant')
);

-- ----------------------------------------------------------------------------
-- 9. INVOICES & INVOICE ITEMS POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Authorized users can view invoices"
ON invoices FOR SELECT
TO authenticated
USING (
    organization_id = current_user_organization_id()
    AND current_user_role() IN ('admin', 'hr', 'accountant')
);

CREATE POLICY "Admin and Accountant can manage invoices"
ON invoices FOR ALL
TO authenticated
USING (
    organization_id = current_user_organization_id()
    AND current_user_role() IN ('admin', 'accountant')
)
WITH CHECK (
    organization_id = current_user_organization_id()
    AND current_user_role() IN ('admin', 'accountant')
);

CREATE POLICY "Authorized users can view invoice items"
ON invoice_items FOR SELECT
TO authenticated
USING (
    organization_id = current_user_organization_id()
    AND current_user_role() IN ('admin', 'hr', 'accountant')
);

CREATE POLICY "Admin and Accountant can manage invoice items"
ON invoice_items FOR ALL
TO authenticated
USING (
    organization_id = current_user_organization_id()
    AND current_user_role() IN ('admin', 'accountant')
)
WITH CHECK (
    organization_id = current_user_organization_id()
    AND current_user_role() IN ('admin', 'accountant')
);

-- ----------------------------------------------------------------------------
-- 10. PAYMENTS POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Authorized users can view payments"
ON payments FOR SELECT
TO authenticated
USING (
    organization_id = current_user_organization_id()
    AND (
        current_user_role() IN ('admin', 'hr', 'accountant')
        OR employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    )
);

CREATE POLICY "Admin and Accountant can manage payments"
ON payments FOR ALL
TO authenticated
USING (
    organization_id = current_user_organization_id()
    AND current_user_role() IN ('admin', 'accountant')
)
WITH CHECK (
    organization_id = current_user_organization_id()
    AND current_user_role() IN ('admin', 'accountant')
);

-- ----------------------------------------------------------------------------
-- 11. NOTIFICATIONS & REMINDERS POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can manage their own notifications"
ON notifications FOR ALL
TO authenticated
USING (user_id = auth.uid() AND organization_id = current_user_organization_id())
WITH CHECK (user_id = auth.uid() AND organization_id = current_user_organization_id());

CREATE POLICY "Authorized users can view reminders"
ON reminders FOR SELECT
TO authenticated
USING (
    organization_id = current_user_organization_id()
    AND current_user_role() IN ('admin', 'hr', 'accountant')
);

CREATE POLICY "Admin and HR can manage reminders"
ON reminders FOR ALL
TO authenticated
USING (
    organization_id = current_user_organization_id()
    AND current_user_role() IN ('admin', 'hr')
)
WITH CHECK (
    organization_id = current_user_organization_id()
    AND current_user_role() IN ('admin', 'hr')
);

-- ----------------------------------------------------------------------------
-- 12. AUDIT LOGS POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Admin can view audit logs"
ON audit_logs FOR SELECT
TO authenticated
USING (
    organization_id = current_user_organization_id()
    AND current_user_role() = 'admin'
);

CREATE POLICY "System and authorized users can insert audit logs"
ON audit_logs FOR INSERT
TO authenticated
WITH CHECK (organization_id = current_user_organization_id());
