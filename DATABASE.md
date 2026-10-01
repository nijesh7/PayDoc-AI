# Database Specification — PayDoc AI

This document defines the complete PostgreSQL database schema, data integrity contracts, constraints, relationships, indexes, Row Level Security (RLS) policies, and triggers for **PayDoc AI**.

---

## 1. Database Philosophy & Design Principles

1. **Multi-Tenant Isolation:** Every organization-owned table contains an `organization_id` foreign key referencing `organizations.id`. Data is partitioned logically and enforced at the database level via Supabase Row Level Security (RLS).
2. **Deterministic Financial Precision:** All monetary amounts are stored as `numeric(12,2)`. Quantities, overtime hours, and percentages use explicit sub-unit precision (e.g. `numeric(10,2)` or `numeric(5,2)`). Floating-point types (`float`, `real`) are strictly prohibited for financial data.
3. **UUID Primary Keys:** All tables use `uuid` primary keys with `gen_random_uuid()` default generation.
4. **Auditability & Traceability:** Every table includes `created_at timestamptz DEFAULT now()` and `updated_at timestamptz DEFAULT now()`. Raw AI extraction outputs are preserved in `document_extractions.raw_text` and `extracted_data` (`jsonb`) for verification.
5. **Enforced Referential Integrity:** Foreign keys use `ON DELETE RESTRICT` or `ON DELETE CASCADE` where appropriate, preventing orphan records and unintentional cascading deletion of financial ledgers.

---

## 2. Entity-Relationship Diagram

```text
organizations ──< users (organization_id)
organizations ──< departments (organization_id)
organizations ──< employees (organization_id)
organizations ──< salary_components (organization_id)
organizations ──< payroll_runs (organization_id)
organizations ──< payroll_items (organization_id)
organizations ──< payments (organization_id)
organizations ──< documents (organization_id)
organizations ──< document_extractions (organization_id)
organizations ──< invoices (organization_id)
organizations ──< invoice_items (organization_id)
organizations ──< notifications (organization_id)
organizations ──< reminders (organization_id)
organizations ──< audit_logs (organization_id)

departments ──< employees (department_id)
users ───────--< employees (user_id, nullable for self-service link)
employees ───--< salary_components (employee_id)
employees ───--< payroll_items (employee_id)
employees ───--< payments (employee_id)
employees ───--< documents (related_employee_id)

payroll_runs ──< payroll_items (payroll_run_id)
payroll_items ─< payments (payroll_item_id)

documents ───--< document_extractions (document_id)
documents ───--< invoices (document_id, nullable)
documents ───--< payments (receipt_document_id, nullable)

invoices ────--< invoice_items (invoice_id)
invoices ────--< payments (invoice_id, nullable)

users ─────────< notifications (user_id)
```

---

## 3. Detailed Table Schema

### 3.1. `organizations`
Represents the business tenant.
```sql
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    fiscal_year_start SMALLINT NOT NULL DEFAULT 4, -- 4 = April (Indian FY)
    logo_url TEXT,
    address TEXT,
    tax_id TEXT, -- e.g. GSTIN / PAN
    contact_email TEXT,
    contact_phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 3.2. `users`
Profiles for authenticated users within an organization.
```sql
CREATE TABLE users (
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
```

### 3.3. `departments`
Business units/departments within an organization.
```sql
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(organization_id, name)
);
```

### 3.4. `employees`
Employee master records.
```sql
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Linked Supabase Auth user for self-service
    employee_id TEXT NOT NULL, -- Human-readable ID (e.g. "EMP-001")
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
```

### 3.5. `salary_components`
Recurring allowances and deductions mapped to employees.
```sql
CREATE TABLE salary_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    component_type TEXT NOT NULL CHECK (component_type IN ('allowance', 'deduction')),
    name TEXT NOT NULL, -- e.g. 'HRA', 'Special Allowance', 'Provident Fund', 'Professional Tax'
    amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (amount >= 0),
    is_percentage BOOLEAN NOT NULL DEFAULT false,
    percentage_value NUMERIC(5,2) CHECK (percentage_value >= 0 AND percentage_value <= 100),
    is_taxable BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 3.6. `payroll_runs`
Monthly payroll execution headers.
```sql
CREATE TABLE payroll_runs (
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
```

### 3.7. `payroll_items`
Individual employee line items in a payroll run.
```sql
CREATE TABLE payroll_items (
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
    breakdown JSONB NOT NULL DEFAULT '{}'::jsonb, -- detailed allowance & deduction component snapshot
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(payroll_run_id, employee_id)
);
```

### 3.8. `payments`
Unified payment tracking ledger (employee salaries, invoice payouts, vendor disbursements).
```sql
CREATE TABLE payments (
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
    receipt_document_id UUID, -- References documents(id)
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 3.9. `documents`
Metadata and storage pointers for all uploaded business files.
```sql
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    file_name TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes > 0),
    mime_type TEXT NOT NULL,
    storage_path TEXT NOT NULL, -- Supabase Storage path
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
```

### 3.10. `document_extractions`
AI-extracted text, structured fields, confidence ratings, and provider audit info.
```sql
CREATE TABLE document_extractions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    raw_text TEXT,
    extracted_data JSONB NOT NULL DEFAULT '{}'::jsonb, -- structured output (vendor, amounts, parties, dates, etc.)
    confidence_score NUMERIC(4,3) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    ai_provider TEXT NOT NULL CHECK (ai_provider IN ('gemini', 'openai')),
    ai_model_used TEXT NOT NULL,
    extracted_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 3.11. `invoices`
Invoices (manual or AI-extracted from document uploads).
```sql
CREATE TABLE invoices (
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
```

### 3.12. `invoice_items`
Individual line items on an invoice.
```sql
CREATE TABLE invoice_items (
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
```

### 3.13. `notifications`
In-app notification events.
```sql
CREATE TABLE notifications (
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
```

### 3.14. `reminders`
Automated scheduled smart reminders.
```sql
CREATE TABLE reminders (
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
```

### 3.15. `audit_logs`
Immutable compliance and activity trail.
```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL, -- e.g. 'EMPLOYEE_CREATED', 'PAYROLL_APPROVED', 'INVOICE_PAID'
    entity_type TEXT NOT NULL, -- e.g. 'employees', 'payroll_runs', 'invoices'
    entity_id UUID NOT NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 4. Performance Indexes

```sql
-- Organization Scoping
CREATE INDEX idx_users_org ON users(organization_id);
CREATE INDEX idx_departments_org ON departments(organization_id);
CREATE INDEX idx_employees_org ON employees(organization_id);
CREATE INDEX idx_employees_dept ON employees(department_id);
CREATE INDEX idx_salary_components_emp ON salary_components(employee_id);

-- Payroll & Payments
CREATE INDEX idx_payroll_runs_org_date ON payroll_runs(organization_id, year, month);
CREATE INDEX idx_payroll_items_run ON payroll_items(payroll_run_id);
CREATE INDEX idx_payroll_items_emp ON payroll_items(employee_id);
CREATE INDEX idx_payments_org_status ON payments(organization_id, status);
CREATE INDEX idx_payments_due_date ON payments(due_date);

-- Documents & Invoices
CREATE INDEX idx_documents_org_type ON documents(organization_id, document_type);
CREATE INDEX idx_documents_status ON documents(processing_status);
CREATE INDEX idx_documents_expiry ON documents(expiry_date);
CREATE INDEX idx_extractions_doc ON document_extractions(document_id);
CREATE INDEX idx_invoices_org_status ON invoices(organization_id, status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_invoice_items_inv ON invoice_items(invoice_id);

-- Notifications & Reminders & Audits
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read);
CREATE INDEX idx_reminders_org_status ON reminders(organization_id, status, due_date);
CREATE INDEX idx_audit_logs_org_created ON audit_logs(organization_id, created_at DESC);
```

---

## 5. Row Level Security (RLS) Policies

Every table has RLS enabled:
```sql
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
```

### 5.1. Tenant Isolation Helper
```sql
CREATE OR REPLACE FUNCTION current_user_organization_id()
RETURNS UUID AS $$
    SELECT organization_id FROM users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT AS $$
    SELECT role FROM users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

### 5.2. Role-Based RLS Policies (Examples)
```sql
-- Employees Table
CREATE POLICY "Users can view employees in their organization"
ON employees FOR SELECT
TO authenticated
USING (
    organization_id = current_user_organization_id()
    AND (
        current_user_role() IN ('admin', 'hr', 'accountant')
        OR user_id = auth.uid() -- Employee self-view
    )
);

CREATE POLICY "Admin and HR can manage employees"
ON employees FOR ALL
TO authenticated
USING (
    organization_id = current_user_organization_id()
    AND current_user_role() IN ('admin', 'hr')
);

-- Payroll Items Table
CREATE POLICY "Users view permitted payroll items"
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
USING (
    organization_id = current_user_organization_id()
    AND current_user_role() IN ('admin', 'hr')
);
```

---

## 6. Triggers & Stored Functions

### 6.1. Updated At Timestamp Trigger
```sql
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables
CREATE TRIGGER set_updated_at_organizations BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at_users BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at_employees BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at_payroll_runs BEFORE UPDATE ON payroll_runs FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at_payroll_items BEFORE UPDATE ON payroll_items FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at_payments BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at_documents BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at_invoices BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
```

### 6.2. Recalculate Payroll Run Totals Trigger
```sql
CREATE OR REPLACE FUNCTION recalculate_payroll_run_totals()
RETURNS TRIGGER AS $$
DECLARE
    target_run_id UUID;
BEGIN
    target_run_id := COALESCE(NEW.payroll_run_id, OLD.payroll_run_id);
    
    UPDATE payroll_runs
    SET 
        total_employees = (SELECT count(*) FROM payroll_items WHERE payroll_run_id = target_run_id),
        total_basic = (SELECT COALESCE(sum(basic_salary), 0) FROM payroll_items WHERE payroll_run_id = target_run_id),
        total_overtime = (SELECT COALESCE(sum(overtime_amount), 0) FROM payroll_items WHERE payroll_run_id = target_run_id),
        total_allowances = (SELECT COALESCE(sum(allowances_amount + bonus_amount), 0) FROM payroll_items WHERE payroll_run_id = target_run_id),
        total_deductions = (SELECT COALESCE(sum(deductions_amount + advances_amount + leave_deductions_amount), 0) FROM payroll_items WHERE payroll_run_id = target_run_id),
        total_net_salary = (SELECT COALESCE(sum(net_salary), 0) FROM payroll_items WHERE payroll_run_id = target_run_id),
        updated_at = now()
    WHERE id = target_run_id;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_payroll_run_totals_after_item_change
AFTER INSERT OR UPDATE OR DELETE ON payroll_items
FOR EACH ROW EXECUTE FUNCTION recalculate_payroll_run_totals();
```
