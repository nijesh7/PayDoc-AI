-- ============================================================================
-- PAYDOC AI — Migration 0008: Banking, Payments Ledger & Payout Engine
-- ============================================================================

-- 0. Enhance payments table with UTR, bank details, and status options
ALTER TABLE payments ADD COLUMN IF NOT EXISTS utr_number TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS beneficiary_name TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS beneficiary_account TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS beneficiary_ifsc TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS failure_reason TEXT;

-- Update status check constraint on payments to include 'processing' and 'failed'
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE payments ADD CONSTRAINT payments_status_check
    CHECK (status IN ('pending', 'due_soon', 'processing', 'paid', 'overdue', 'failed'));

-- ----------------------------------------------------------------------------
-- 1. ORGANIZATION BANK ACCOUNTS (Corporate Disbursement Accounts)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS organization_bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    bank_name TEXT NOT NULL, -- 'HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank'
    account_number TEXT NOT NULL,
    ifsc_code TEXT NOT NULL,
    branch_name TEXT,
    account_type TEXT NOT NULL DEFAULT 'current' CHECK (account_type IN ('current', 'salary_disbursement', 'escrow')),
    client_code TEXT, -- Client / corporate code for bank CMS
    is_primary BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(organization_id, account_number)
);

-- ----------------------------------------------------------------------------
-- 2. BANK PAYOUT BATCHES (Salary & Vendor Bulk Disbursement Files)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bank_payout_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    batch_number TEXT NOT NULL, -- e.g. 'BATCH-202610-001'
    bank_format TEXT NOT NULL CHECK (bank_format IN ('HDFC_SALARY_CSV', 'ICICI_CORPORATE_EXCEL', 'SBI_CMS', 'STANDARD_NEFT_CSV')),
    payment_type TEXT NOT NULL DEFAULT 'salary' CHECK (payment_type IN ('salary', 'invoice', 'vendor', 'mixed')),
    payroll_run_id UUID REFERENCES payroll_runs(id) ON DELETE SET NULL,
    organization_bank_account_id UUID REFERENCES organization_bank_accounts(id) ON DELETE SET NULL,
    total_records INTEGER NOT NULL DEFAULT 0,
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0),
    status TEXT NOT NULL DEFAULT 'generated' CHECK (status IN ('generated', 'submitted_to_bank', 'reconciled', 'partially_reconciled')),
    file_content TEXT, -- Stored formatted CSV / text for audit & instant download
    file_name TEXT,
    generated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reconciled_at TIMESTAMPTZ,
    reconciled_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(organization_id, batch_number)
);

-- ----------------------------------------------------------------------------
-- 3. BANK PAYOUT BATCH ITEMS (Line Items in Bulk Batch)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bank_payout_batch_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    batch_id UUID NOT NULL REFERENCES bank_payout_batches(id) ON DELETE CASCADE,
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    beneficiary_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    ifsc_code TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed', 'returned')),
    utr_number TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(batch_id, payment_id)
);

-- ----------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS)
-- ----------------------------------------------------------------------------
ALTER TABLE organization_bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_payout_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_payout_batch_items ENABLE ROW LEVEL SECURITY;

-- 4.1 Organization Bank Accounts RLS
DROP POLICY IF EXISTS "bank_accounts_select" ON organization_bank_accounts;
CREATE POLICY "bank_accounts_select" ON organization_bank_accounts
    FOR SELECT TO authenticated
    USING (
        organization_id = current_user_organization_id()
        AND current_user_role() IN ('admin', 'hr', 'accountant')
    );

DROP POLICY IF EXISTS "bank_accounts_modify" ON organization_bank_accounts;
CREATE POLICY "bank_accounts_modify" ON organization_bank_accounts
    FOR ALL TO authenticated
    USING (
        organization_id = current_user_organization_id()
        AND current_user_role() IN ('admin', 'accountant')
    );

-- 4.2 Bank Payout Batches RLS
DROP POLICY IF EXISTS "payout_batches_select" ON bank_payout_batches;
CREATE POLICY "payout_batches_select" ON bank_payout_batches
    FOR SELECT TO authenticated
    USING (
        organization_id = current_user_organization_id()
        AND current_user_role() IN ('admin', 'hr', 'accountant')
    );

DROP POLICY IF EXISTS "payout_batches_modify" ON bank_payout_batches;
CREATE POLICY "payout_batches_modify" ON bank_payout_batches
    FOR ALL TO authenticated
    USING (
        organization_id = current_user_organization_id()
        AND current_user_role() IN ('admin', 'accountant', 'hr')
    );

-- 4.3 Bank Payout Batch Items RLS
DROP POLICY IF EXISTS "batch_items_select" ON bank_payout_batch_items;
CREATE POLICY "batch_items_select" ON bank_payout_batch_items
    FOR SELECT TO authenticated
    USING (
        organization_id = current_user_organization_id()
        AND (
            current_user_role() IN ('admin', 'hr', 'accountant')
            OR is_current_user_employee(employee_id)
        )
    );

DROP POLICY IF EXISTS "batch_items_modify" ON bank_payout_batch_items;
CREATE POLICY "batch_items_modify" ON bank_payout_batch_items
    FOR ALL TO authenticated
    USING (
        organization_id = current_user_organization_id()
        AND current_user_role() IN ('admin', 'accountant', 'hr')
    );

-- ----------------------------------------------------------------------------
-- 5. SEED DATA (Default Primary Organization Bank Account for Demo)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    org_record RECORD;
BEGIN
    FOR org_record IN SELECT id FROM organizations LOOP
        INSERT INTO organization_bank_accounts (
            organization_id,
            bank_name,
            account_number,
            ifsc_code,
            branch_name,
            account_type,
            client_code,
            is_primary
        ) VALUES (
            org_record.id,
            'HDFC Bank',
            '50200012345678',
            'HDFC0000001',
            'MG Road, Bengaluru',
            'current',
            'PAYDOC01',
            true
        ) ON CONFLICT (organization_id, account_number) DO NOTHING;
    END LOOP;
END $$;
