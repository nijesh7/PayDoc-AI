-- ============================================================================
-- PAYDOC AI — Migration 0001: Initial Relational Schema
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. ORGANIZATIONS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    fiscal_year_start SMALLINT NOT NULL DEFAULT 4, -- 4 = April (standard Indian FY)
    logo_url TEXT,
    address TEXT,
    tax_id TEXT, -- GSTIN / PAN / Tax Registration
    contact_email TEXT,
    contact_phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 2. USERS (Profiles linked to auth.users)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'hr', 'accountant', 'employee')),
    phone TEXT,
    avatar_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 3. DEPARTMENTS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(organization_id, name)
);

-- ----------------------------------------------------------------------------
-- 4. EMPLOYEES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Nullable self-service portal link
    employee_id TEXT NOT NULL, -- e.g. "EMP-001"
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    designation TEXT NOT NULL,
    joining_date DATE NOT NULL,
    employment_type TEXT NOT NULL CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'daily_wage')),
    salary_type TEXT NOT NULL CHECK (salary_type IN ('monthly', 'hourly', 'daily')),
    basic_salary NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (basic_salary >= 0),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'on_leave', 'inactive', 'resigned')),
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    bank_account_number TEXT,
    bank_ifsc TEXT,
    bank_name TEXT,
    pan_number TEXT,
    profile_image_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(organization_id, employee_id),
    UNIQUE(organization_id, email)
);

-- ----------------------------------------------------------------------------
-- 5. SALARY COMPONENTS (Recurring Allowances & Deductions)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS salary_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    component_type TEXT NOT NULL CHECK (component_type IN ('allowance', 'deduction')),
    name TEXT NOT NULL, -- e.g. 'HRA', 'PF', 'Special Allowance', 'Professional Tax'
    amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (amount >= 0),
    is_percentage BOOLEAN NOT NULL DEFAULT false,
    percentage_value NUMERIC(5,2) CHECK (percentage_value >= 0 AND percentage_value <= 100),
    is_taxable BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 6. PAYROLL RUNS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payroll_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    month SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
    year SMALLINT NOT NULL CHECK (year >= 2000),
    total_employees INTEGER NOT NULL DEFAULT 0 CHECK (total_employees >= 0),
    total_basic NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (total_basic >= 0),
    total_overtime NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (total_overtime >= 0),
    total_allowances NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (total_allowances >= 0),
    total_deductions NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (total_deductions >= 0),
    total_net_salary NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (total_net_salary >= 0),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'reviewed', 'approved', 'paid')),
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(organization_id, month, year)
);

-- ----------------------------------------------------------------------------
-- 7. PAYROLL ITEMS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payroll_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payroll_run_id UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
    basic_salary NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (basic_salary >= 0),
    overtime_hours NUMERIC(6,2) NOT NULL DEFAULT 0.00 CHECK (overtime_hours >= 0),
    overtime_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (overtime_amount >= 0),
    bonus_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (bonus_amount >= 0),
    allowances_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (allowances_amount >= 0),
    deductions_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (deductions_amount >= 0),
    advances_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (advances_amount >= 0),
    leave_deductions_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (leave_deductions_amount >= 0),
    net_salary NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (net_salary >= 0),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'reviewed', 'approved', 'paid')),
    breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(payroll_run_id, employee_id)
);

-- ----------------------------------------------------------------------------
-- 8. DOCUMENTS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    file_name TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes > 0),
    mime_type TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    document_type TEXT NOT NULL CHECK (document_type IN (
        'invoice', 'contract', 'payslip', 'certificate', 'receipt',
        'employee_document', 'company_document', 'tax_document', 'other'
    )),
    related_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    processing_status TEXT NOT NULL DEFAULT 'uploaded' CHECK (processing_status IN ('uploaded', 'processing', 'completed', 'failed')),
    verification_status TEXT NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'verified', 'rejected')),
    expiry_date DATE,
    tags TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 9. DOCUMENT EXTRACTIONS (AI Output & Metadata)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS document_extractions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    raw_text TEXT,
    extracted_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    confidence_score NUMERIC(4,3) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    ai_provider TEXT NOT NULL CHECK (ai_provider IN ('gemini', 'openai')),
    ai_model_used TEXT NOT NULL,
    extracted_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 10. INVOICES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    invoice_number TEXT NOT NULL,
    vendor_name TEXT NOT NULL,
    customer_name TEXT,
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (subtotal >= 0),
    tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (tax_amount >= 0),
    discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0),
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0),
    currency TEXT NOT NULL DEFAULT 'INR',
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'due_soon', 'overdue', 'paid')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(organization_id, invoice_number, vendor_name)
);

-- ----------------------------------------------------------------------------
-- 11. INVOICE ITEMS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    description TEXT NOT NULL,
    quantity NUMERIC(10,2) NOT NULL DEFAULT 1.00 CHECK (quantity > 0),
    unit_price NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (unit_price >= 0),
    total_price NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (total_price >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 12. PAYMENTS (Unified Financial Ledger)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    payment_type TEXT NOT NULL CHECK (payment_type IN ('salary', 'invoice', 'vendor', 'other')),
    payroll_item_id UUID REFERENCES payroll_items(id) ON DELETE SET NULL,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    vendor_name TEXT,
    amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
    due_date DATE NOT NULL,
    payment_date DATE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'due_soon', 'paid', 'overdue')),
    payment_method TEXT CHECK (payment_method IN ('bank_transfer', 'upi', 'cash', 'cheque', 'neft_rtgs', 'card')),
    reference_number TEXT,
    notes TEXT,
    receipt_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 13. NOTIFICATIONS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    notification_type TEXT NOT NULL CHECK (notification_type IN (
        'salary_due', 'salary_overdue', 'invoice_due', 'invoice_overdue',
        'contract_expiring', 'document_expiring', 'payroll_approved', 'document_processed', 'system'
    )),
    entity_type TEXT,
    entity_id UUID,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 14. REMINDERS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    reminder_type TEXT NOT NULL CHECK (reminder_type IN (
        'salary_deadline', 'invoice_due', 'contract_expiry', 'document_expiry'
    )),
    due_date DATE NOT NULL,
    target_entity_type TEXT NOT NULL,
    target_entity_id UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'dismissed', 'resolved')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 15. AUDIT LOGS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- INDEXES FOR HIGH-PERFORMANCE QUERYING
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_users_org ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_departments_org ON departments(organization_id);
CREATE INDEX IF NOT EXISTS idx_employees_org ON employees(organization_id);
CREATE INDEX IF NOT EXISTS idx_employees_dept ON employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_user ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_salary_components_emp ON salary_components(employee_id);

CREATE INDEX IF NOT EXISTS idx_payroll_runs_org_date ON payroll_runs(organization_id, year, month);
CREATE INDEX IF NOT EXISTS idx_payroll_items_run ON payroll_items(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_payroll_items_emp ON payroll_items(employee_id);

CREATE INDEX IF NOT EXISTS idx_payments_org_status ON payments(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_due_date ON payments(due_date);
CREATE INDEX IF NOT EXISTS idx_payments_employee ON payments(employee_id);

CREATE INDEX IF NOT EXISTS idx_documents_org_type ON documents(organization_id, document_type);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(processing_status);
CREATE INDEX IF NOT EXISTS idx_documents_expiry ON documents(expiry_date);
CREATE INDEX IF NOT EXISTS idx_extractions_doc ON document_extractions(document_id);

CREATE INDEX IF NOT EXISTS idx_invoices_org_status ON invoices(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoice_items_inv ON invoice_items(invoice_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_reminders_org_status ON reminders(organization_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_created ON audit_logs(organization_id, created_at DESC);
