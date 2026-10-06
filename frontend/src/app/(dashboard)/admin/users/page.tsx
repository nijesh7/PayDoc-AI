'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  ShieldCheck,
  UserCheck,
  UserX,
  UserPlus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  MoreVertical,
  Shield,
  Building2,
  Mail,
  X,
  KeyRound,
  ExternalLink,
  Layers,
  ChevronRight,
  UserCog,
} from 'lucide-react';
import { fetchApi } from '@/lib/apiClient';
import { UserRole, UserStatus, ROLE_DEFINITIONS } from '@/types/auth';

interface UserRecord {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  status: UserStatus;
  created_at: string;
}

const INITIAL_USERS: UserRecord[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    full_name: 'Rajesh Sharma',
    email: 'admin@cognivex.com',
    role: 'ADMIN',
    status: 'active',
    created_at: '2025-04-01T10:00:00Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    full_name: 'Ananya Deshmukh',
    email: 'ananya.d@cognivex.com',
    role: 'HR',
    status: 'active',
    created_at: '2025-05-15T10:00:00Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    full_name: 'Vikram Mehta',
    email: 'vikram.mehta@cognivex.com',
    role: 'ACCOUNTANT',
    status: 'active',
    created_at: '2025-06-01T10:00:00Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000004',
    full_name: 'Priya Iyer',
    email: 'priya.iyer@cognivex.com',
    role: 'ACCOUNTANT',
    status: 'active',
    created_at: '2026-03-28T14:30:00Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000005',
    full_name: 'Aarav Sharma',
    email: 'aarav.sharma@cognivex.com',
    role: 'EMPLOYEE',
    status: 'active',
    created_at: '2026-01-15T10:00:00Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000006',
    full_name: 'Siddharth Rao',
    email: 'siddharth.r@cognivex.com',
    role: 'EMPLOYEE',
    status: 'active',
    created_at: '2026-03-29T09:15:00Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000007',
    full_name: 'Kavita Iyer',
    email: 'kavita.i@cognivex.com',
    role: 'EMPLOYEE',
    status: 'active',
    created_at: '2025-08-01T10:00:00Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000008',
    full_name: 'Rohan Verma',
    email: 'rohan.v@cognivex.com',
    role: 'EMPLOYEE',
    status: 'active',
    created_at: '2025-09-10T10:00:00Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000009',
    full_name: 'Sneha Kulkarni',
    email: 'sneha.k@cognivex.com',
    role: 'EMPLOYEE',
    status: 'active',
    created_at: '2025-10-05T10:00:00Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000010',
    full_name: 'Neha Patel',
    email: 'neha.p@cognivex.com',
    role: 'EMPLOYEE',
    status: 'disabled',
    created_at: '2025-07-20T10:00:00Z',
  },
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRecord[]>(INITIAL_USERS);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Role Assignment Dialog
  const [selectedUserForRole, setSelectedUserForRole] = useState<UserRecord | null>(null);
  const [newRole, setNewRole] = useState<UserRole>('EMPLOYEE');
  const [roleChangeNotice, setRoleChangeNotice] = useState<string | null>(null);

  // Invite Modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('EMPLOYEE');

  const loadUsersFromDb = async () => {
    try {
      setLoading(true);
      const res = await fetchApi('/users').catch(() => null);
      if (res && res.users && res.users.length > 0) {
        setUsers(res.users);
      }
    } catch (err) {
      console.warn('Fallback to demo users list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsersFromDb();
  }, []);

  const handleStatusToggle = async (userId: string, currentStatus: UserStatus) => {
    const targetStatus: UserStatus = currentStatus === 'active' ? 'disabled' : 'active';
    try {
      await fetchApi(`/users/${userId}/status`, {
        method: 'POST',
        body: JSON.stringify({ status: targetStatus }),
      });

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, status: targetStatus } : u))
      );

      setRoleChangeNotice(
        `User status updated to ${targetStatus === 'active' ? 'Active' : 'Deactivated'}`
      );
      setTimeout(() => setRoleChangeNotice(null), 3500);
      loadUsersFromDb();
    } catch (err: any) {
      alert(`Failed to update status: ${err.message}`);
    }
  };

  const handleConfirmRoleChange = async () => {
    if (!selectedUserForRole) return;

    try {
      await fetchApi(`/users/${selectedUserForRole.id}/role`, {
        method: 'POST',
        body: JSON.stringify({ role: newRole, newRole }),
      });

      setUsers((prev) =>
        prev.map((u) => (u.id === selectedUserForRole.id ? { ...u, role: newRole } : u))
      );

      setRoleChangeNotice(
        `Role for ${selectedUserForRole.full_name} updated to ${newRole}. Permissions updated in real time.`
      );
      setSelectedUserForRole(null);
      setTimeout(() => setRoleChangeNotice(null), 4000);
      loadUsersFromDb();
    } catch (err: any) {
      alert(`Failed to update role: ${err.message}`);
    }
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetchApi('/users/invite', {
        method: 'POST',
        body: JSON.stringify({
          fullName: inviteName,
          email: inviteEmail,
          role: inviteRole,
        }),
      }).catch(() => null);

      setShowInviteModal(false);
      setInviteName('');
      setInviteEmail('');
      setRoleChangeNotice(`Invitation registered for ${inviteName} (${inviteRole})`);
      setTimeout(() => setRoleChangeNotice(null), 4000);
      loadUsersFromDb();
    } catch (err: any) {
      alert(`Failed to invite user: ${err.message}`);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'ALL' || u.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const adminCount = users.filter((u) => u.role === 'ADMIN').length;
  const hrCount = users.filter((u) => u.role === 'HR').length;
  const accountantCount = users.filter((u) => u.role === 'ACCOUNTANT').length;
  const employeeCount = users.filter((u) => u.role === 'EMPLOYEE').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-50 via-white to-indigo-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/30 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <UserCog className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              <span>Team Directory & Role Assignment (RBAC)</span>
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              COGNIVEX RBAC
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
            Configure member permissions, assign organizational roles, and invite new staff to your Cognivex workspace.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/approvals"
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-gray-300 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 transition-colors shadow-2xs"
          >
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span>Go to Approvals Hub</span>
          </Link>

          <button
            onClick={() => setShowInviteModal(true)}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Invite Team Member</span>
          </button>
        </div>
      </div>

      {/* Role Counts Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div
          onClick={() => setRoleFilter(roleFilter === 'ADMIN' ? 'ALL' : 'ADMIN')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            roleFilter === 'ADMIN'
              ? 'bg-indigo-50/80 dark:bg-indigo-950/60 border-indigo-500'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Administrators</span>
            <Shield className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <p className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1">{adminCount}</p>
        </div>

        <div
          onClick={() => setRoleFilter(roleFilter === 'HR' ? 'ALL' : 'HR')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            roleFilter === 'HR'
              ? 'bg-blue-50/80 dark:bg-blue-950/60 border-blue-500'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>HR Managers</span>
            <Users className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1">{hrCount}</p>
        </div>

        <div
          onClick={() => setRoleFilter(roleFilter === 'ACCOUNTANT' ? 'ALL' : 'ACCOUNTANT')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            roleFilter === 'ACCOUNTANT'
              ? 'bg-emerald-50/80 dark:bg-emerald-950/60 border-emerald-500'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Finance / Accountants</span>
            <Building2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1">{accountantCount}</p>
        </div>

        <div
          onClick={() => setRoleFilter(roleFilter === 'EMPLOYEE' ? 'ALL' : 'EMPLOYEE')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            roleFilter === 'EMPLOYEE'
              ? 'bg-purple-50/80 dark:bg-purple-950/60 border-purple-500'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-purple-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Employees</span>
            <UserCheck className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <p className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1">{employeeCount}</p>
        </div>
      </div>

      {/* Success Notice Banner */}
      {roleChangeNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-xs flex items-center space-x-2 animate-fadeIn shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{roleChangeNotice}</span>
        </div>
      )}

      {/* Filters & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-3 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 dark:text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl text-xs text-slate-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="ALL">All Roles</option>
            <option value="ADMIN">Admin Only</option>
            <option value="HR">HR Only</option>
            <option value="ACCOUNTANT">Accountant Only</option>
            <option value="EMPLOYEE">Employee Only</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl text-xs text-slate-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="active">Active Members</option>
            <option value="disabled">Disabled / Inactive</option>
            <option value="pending">Pending Onboarding</option>
          </select>
        </div>
      </div>

      {/* Team Directory Table */}
      <div className="bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-gray-950/80 border-b border-slate-200 dark:border-gray-800 text-slate-500 dark:text-gray-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Team Member</th>
                <th className="px-5 py-3.5">Configured Role</th>
                <th className="px-5 py-3.5">Account State</th>
                <th className="px-5 py-3.5">Member Since</th>
                <th className="px-5 py-3.5 text-right">Role & Access Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-gray-800/60">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-400 dark:text-gray-500">
                    No users found matching current filters.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-xs">
                            {u.full_name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white">{u.full_name}</div>
                            <div className="text-[11px] text-slate-500 dark:text-gray-400 font-mono">{u.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                          u.role === 'ADMIN'
                            ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                            : u.role === 'HR'
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                            : u.role === 'ACCOUNTANT'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                            : 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                        }`}>
                          <Shield className="w-3 h-3" />
                          <span>{u.role}</span>
                        </span>
                      </td>

                      <td className="px-5 py-3.5">
                        {u.status === 'active' && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Active</span>
                          </span>
                        )}
                        {u.status === 'pending' && (
                          <Link
                            href="/approvals"
                            className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 hover:underline"
                          >
                            <Clock className="w-3 h-3" />
                            <span>Pending (Approvals Hub)</span>
                          </Link>
                        )}
                        {u.status === 'disabled' && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 dark:bg-red-950/60 text-rose-700 dark:text-red-300 border border-rose-200 dark:border-red-800/50">
                            <XCircle className="w-3 h-3" />
                            <span>Deactivated</span>
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-slate-500 dark:text-gray-400 font-mono text-[11px]">
                        {new Date(u.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => {
                              setSelectedUserForRole(u);
                              setNewRole(u.role);
                            }}
                            className="px-2.5 py-1 bg-slate-100 dark:bg-gray-800 hover:bg-indigo-50 dark:hover:bg-gray-700 text-indigo-700 dark:text-indigo-300 border border-slate-200 dark:border-gray-700 rounded-lg text-[11px] font-semibold transition-all cursor-pointer"
                          >
                            Assign Role
                          </button>

                          <button
                            onClick={() => handleStatusToggle(u.id, u.status)}
                            title={u.status === 'active' ? 'Deactivate account' : 'Reactivate account'}
                            className={`px-2 py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
                              u.status === 'active'
                                ? 'border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50'
                                : 'border-emerald-200 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50'
                            }`}
                          >
                            {u.status === 'active' ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role-Based Access Control (RBAC) Entitlements Reference Card */}
      <div className="bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Role Entitlements & Security Architecture</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Overview of tenant data boundaries enforced by Row Level Security (RLS) and Express middleware.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div className="p-3.5 rounded-xl border border-indigo-200/80 dark:border-indigo-800 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-2">
            <span className="font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider text-[11px]">
              ADMIN / OWNER
            </span>
            <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
              Full control across Organization settings, user role promotions, payroll approvals, banking disbursements, and natural language AI business queries.
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-blue-200/80 dark:border-blue-800 bg-blue-50/40 dark:bg-blue-950/20 space-y-2">
            <span className="font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider text-[11px]">
              HR MANAGER
            </span>
            <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
              Full staff directory administration, leave balance approvals, attendance logging, salary structure revision, and monthly payroll calculation drafts.
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-emerald-200/80 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-2">
            <span className="font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider text-[11px]">
              ACCOUNTANT
            </span>
            <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
              Payment ledger settlement, vendor invoice management, Indian tax calculation (TDS, PF, ESI, PT), and banking disbursement export.
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-purple-200/80 dark:border-purple-800 bg-purple-50/40 dark:bg-purple-950/20 space-y-2">
            <span className="font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider text-[11px]">
              EMPLOYEE
            </span>
            <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
              Zero visibility into organization settings or other employees' records. Self-service portal to view personal payslips, submit leaves, and declare tax deductions.
            </p>
          </div>
        </div>
      </div>

      {/* Role Assignment Modal */}
      {selectedUserForRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Assign Operational Role</h3>
                <p className="text-xs text-slate-500">{selectedUserForRole.full_name} ({selectedUserForRole.email})</p>
              </div>
              <button onClick={() => setSelectedUserForRole(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Select New Role
                </label>
                <div className="space-y-2">
                  {(['ADMIN', 'HR', 'ACCOUNTANT', 'EMPLOYEE'] as UserRole[]).map((r) => (
                    <label
                      key={r}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                        newRole === r
                          ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <input
                          type="radio"
                          name="role"
                          value={r}
                          checked={newRole === r}
                          onChange={() => setNewRole(r)}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="font-bold">{r}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">
                        {ROLE_DEFINITIONS[r].badge}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setSelectedUserForRole(null)}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRoleChange}
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs cursor-pointer"
                >
                  Apply Role Update
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Invite Team Member</h3>
                <p className="text-xs text-slate-500">Send an invitation to join your Cognivex workspace.</p>
              </div>
              <button onClick={() => setShowInviteModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleInviteUser} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Full Legal Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Meera Raman"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Work Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. meera@cognivex.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-mono"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Assigned Role *</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                >
                  <option value="EMPLOYEE">Employee (Self-Service)</option>
                  <option value="ACCOUNTANT">Accountant (Finance & Tax)</option>
                  <option value="HR">HR Manager (Staff & Payroll Ops)</option>
                  <option value="ADMIN">Administrator (Full Control)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs cursor-pointer"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
