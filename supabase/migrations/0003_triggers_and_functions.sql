-- ============================================================================
-- PAYDOC AI — Migration 0003: Database Triggers & Stored Functions
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. UPDATED_AT TRIGGER FUNCTION
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger across all dynamic tables
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name IN (
            'organizations', 'users', 'departments', 'employees',
            'salary_components', 'payroll_runs', 'payroll_items',
            'documents', 'document_extractions', 'invoices',
            'invoice_items', 'payments', 'notifications', 'reminders'
          )
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON %I;', t);
        EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();', t);
    END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 2. AUTOMATIC PAYROLL RUN TOTALS RECALCULATION TRIGGER
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION recalculate_payroll_run_totals()
RETURNS TRIGGER AS $$
DECLARE
    target_run_id UUID;
BEGIN
    target_run_id := COALESCE(NEW.payroll_run_id, OLD.payroll_run_id);
    
    IF target_run_id IS NOT NULL THEN
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
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_recalculate_payroll_totals ON payroll_items;
CREATE TRIGGER trigger_recalculate_payroll_totals
AFTER INSERT OR UPDATE OR DELETE ON payroll_items
FOR EACH ROW EXECUTE FUNCTION recalculate_payroll_run_totals();

-- ----------------------------------------------------------------------------
-- 3. AUTOMATIC INVOICE TOTALS RECALCULATION TRIGGER
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION recalculate_invoice_totals()
RETURNS TRIGGER AS $$
DECLARE
    target_inv_id UUID;
    computed_subtotal NUMERIC(12,2);
BEGIN
    target_inv_id := COALESCE(NEW.invoice_id, OLD.invoice_id);
    
    IF target_inv_id IS NOT NULL THEN
        SELECT COALESCE(sum(total_price), 0.00)
        INTO computed_subtotal
        FROM invoice_items
        WHERE invoice_id = target_inv_id;

        UPDATE invoices
        SET 
            subtotal = computed_subtotal,
            total_amount = GREATEST(0.00, computed_subtotal + tax_amount - discount_amount),
            updated_at = now()
        WHERE id = target_inv_id;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_recalculate_invoice_totals ON invoice_items;
CREATE TRIGGER trigger_recalculate_invoice_totals
AFTER INSERT OR UPDATE OR DELETE ON invoice_items
FOR EACH ROW EXECUTE FUNCTION recalculate_invoice_totals();
