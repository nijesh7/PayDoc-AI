// ============================================================================
// PAYDOC AI — Centralized Role & Authentication Types
// ============================================================================

export type UserRole = 'ADMIN' | 'HR' | 'ACCOUNTANT' | 'EMPLOYEE';
export type UserStatus = 'active' | 'pending' | 'disabled';

export interface RoleDefinition {
  id: UserRole;
  title: string;
  badge: string;
  description: string;
  iconName: 'ShieldCheck' | 'Users' | 'BadgeDollarSign' | 'User';
  defaultRoute: string;
  allowedPrefixes: string[];
}

export const ROLE_DEFINITIONS: Record<UserRole, RoleDefinition> = {
  ADMIN: {
    id: 'ADMIN',
    title: 'ADMIN',
    badge: 'Owner / Executive',
    description: 'Manage the organization, users, payroll approvals, invoices, and full business operations.',
    iconName: 'ShieldCheck',
    defaultRoute: '/admin/dashboard',
    allowedPrefixes: ['/admin', '/dashboard', '/employees', '/payroll', '/payments', '/documents', '/invoices', '/assistant', '/reports', '/settings', '/profile'],
  },
  HR: {
    id: 'HR',
    title: 'HR',
    badge: 'People & Operations',
    description: 'Manage employees, onboarding documents, attendance, and payroll preparation.',
    iconName: 'Users',
    defaultRoute: '/hr/dashboard',
    allowedPrefixes: ['/hr', '/dashboard', '/employees', '/payroll', '/payments', '/documents', '/assistant', '/reports', '/profile'],
  },
  ACCOUNTANT: {
    id: 'ACCOUNTANT',
    title: 'ACCOUNTANT',
    badge: 'Finance & Accounts',
    description: 'Manage invoices, payments, tax filings, and financial records reconciliation.',
    iconName: 'BadgeDollarSign',
    defaultRoute: '/accountant/dashboard',
    allowedPrefixes: ['/accountant', '/dashboard', '/payments', '/invoices', '/documents', '/reports', '/assistant', '/profile'],
  },
  EMPLOYEE: {
    id: 'EMPLOYEE',
    title: 'EMPLOYEE',
    badge: 'Team Member',
    description: 'View personal salary, download payslips, track payments, and access personal documents.',
    iconName: 'User',
    defaultRoute: '/employee/dashboard',
    allowedPrefixes: ['/employee', '/dashboard', '/profile'],
  },
};

export interface UserProfile {
  id: string;
  organization_id: string;
  email: string;
  full_name: string;
  role: UserRole;
  status: UserStatus;
  phone?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  organization?: {
    id: string;
    name: string;
    slug: string;
    currency: string;
    invitation_code?: string;
  };
}

export function normalizeRole(roleString?: string | null): UserRole {
  if (!roleString) return 'EMPLOYEE';
  const clean = roleString.trim().toUpperCase();
  if (clean === 'ADMIN') return 'ADMIN';
  if (clean === 'HR') return 'HR';
  if (clean === 'ACCOUNTANT') return 'ACCOUNTANT';
  if (clean === 'EMPLOYEE') return 'EMPLOYEE';
  return 'EMPLOYEE';
}
