// ============================================================================
// PAYDOC AI — Backend Role & Auth Definitions
// ============================================================================

export type UserRole = 'ADMIN' | 'HR' | 'ACCOUNTANT' | 'EMPLOYEE';
export type UserStatus = 'active' | 'pending' | 'disabled';

export function normalizeRole(roleString?: string | null): UserRole {
  if (!roleString) return 'EMPLOYEE';
  const clean = roleString.trim().toUpperCase();
  if (clean === 'ADMIN') return 'ADMIN';
  if (clean === 'HR') return 'HR';
  if (clean === 'ACCOUNTANT') return 'ACCOUNTANT';
  if (clean === 'EMPLOYEE') return 'EMPLOYEE';
  return 'EMPLOYEE';
}
