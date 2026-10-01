-- ============================================================================
-- PAYDOC AI — Migration 0004: Role-Based Authentication & User Status Enhancements
-- ============================================================================

-- 1. Add invitation code and org code to organizations if not present
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS invitation_code TEXT DEFAULT 'PAYDOC-2026';

UPDATE organizations 
SET invitation_code = 'ACME-2026' 
WHERE slug = 'acme-technologies' OR id = '00000000-0000-0000-0000-000000000001';

-- 2. Add status column to users table (active, pending, disabled)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

-- Drop old role check constraint and re-add to support both uppercase and lowercase values
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
CHECK (lower(role) IN ('admin', 'hr', 'accountant', 'employee'));

-- Add check constraint for status
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check;
ALTER TABLE users ADD CONSTRAINT users_status_check 
CHECK (status IN ('active', 'pending', 'disabled'));

-- 3. Update RLS policies for user status checks
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT AS $$
    SELECT lower(role) FROM users WHERE id = auth.uid() AND status = 'active';
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 4. Audit log indexing for role changes
CREATE INDEX IF NOT EXISTS idx_users_org_role_status ON users(organization_id, role, status);
