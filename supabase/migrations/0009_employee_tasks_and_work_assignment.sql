-- ============================================================================
-- PAYDOC AI — Migration 0009: Employee Tasks & Work Assignment Engine
-- ============================================================================

-- 1. Create employee_tasks table
CREATE TABLE IF NOT EXISTS employee_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    target_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'compliance', 'documentation', 'payroll', 'review', 'technical')),
    completed_at TIMESTAMPTZ,
    completion_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Indexes for high-performance lookup
CREATE INDEX IF NOT EXISTS idx_employee_tasks_org_target_date ON employee_tasks(organization_id, target_date);
CREATE INDEX IF NOT EXISTS idx_employee_tasks_emp_status ON employee_tasks(employee_id, status);
CREATE INDEX IF NOT EXISTS idx_employee_tasks_assigned_by ON employee_tasks(assigned_by);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE employee_tasks ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Users can view tasks in their organization (HR/Admin view all; Employees view assigned)
DROP POLICY IF EXISTS "Users can view tasks in their organization" ON employee_tasks;
CREATE POLICY "Users can view tasks in their organization"
ON employee_tasks FOR SELECT TO authenticated
USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
);

-- HR & Admin can insert tasks
DROP POLICY IF EXISTS "HR and Admin can create tasks" ON employee_tasks;
CREATE POLICY "HR and Admin can create tasks"
ON employee_tasks FOR INSERT TO authenticated
WITH CHECK (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
);

-- HR, Admin, and assigned employees can update tasks
DROP POLICY IF EXISTS "Users can update relevant tasks" ON employee_tasks;
CREATE POLICY "Users can update relevant tasks"
ON employee_tasks FOR UPDATE TO authenticated
USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
)
WITH CHECK (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
);

-- HR and Admin can delete tasks
DROP POLICY IF EXISTS "HR and Admin can delete tasks" ON employee_tasks;
CREATE POLICY "HR and Admin can delete tasks"
ON employee_tasks FOR DELETE TO authenticated
USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
);
