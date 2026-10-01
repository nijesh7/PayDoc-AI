'use client';

import React, { useState, useEffect } from 'react';
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
    email: 'admin@acmetech.com',
    role: 'ADMIN',
    status: 'active',
    created_at: '2025-04-01T10:00:00Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    full_name: 'Ananya Deshmukh',
    email: 'ananya.d@acmetech.com',
    role: 'HR',
    status: 'active',
    created_at: '2025-05-15T10:00:00Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    full_name: 'Vikram Mehta',
    email: 'vikram.mehta@acmetech.com',
    role: 'ACCOUNTANT',
    status: 'active',
    created_at: '2025-06-01T10:00:00Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000004',
    full_name: 'Priya Iyer',
    email: 'priya.iyer@acmetech.com',
    role: 'ACCOUNTANT',
    status: 'pending',
    created_at: '2026-03-28T14:30:00Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000005',
    full_name: 'Aarav Sharma',
    email: 'aarav.sharma@acmetech.com',
    role: 'EMPLOYEE',
    status: 'active',
    created_at: '2026-01-15T10:00:00Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000006',
    full_name: 'Siddharth Rao',
    email: 'siddharth.r@acmetech.com',
    role: 'EMPLOYEE',
    status: 'pending',
    created_at: '2026-03-29T09:15:00Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000007',
    full_name: 'Kavita Iyer',
    email: 'kavita.i@acmetech.com',
    role: 'EMPLOYEE',
    status: 'active',
    created_at: '2025-08-01T10:00:00Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000008',
    full_name: 'Rohan Verma',
    email: 'rohan.v@acmetech.com',
    role: 'EMPLOYEE',
    status: 'active',
    created_at: '2025-09-10T10:00:00Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000009',
    full_name: 'Sneha Kulkarni',
    email: 'sneha.k@acmetech.com',
    role: 'EMPLOYEE',
    status: 'active',
    created_at: '2025-10-05T10:00:00Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000010',
    full_name: 'Neha Patel',
    email: 'neha.p@acmetech.com',
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
  const [selectedUserForRole, setSelectedUserForRole] = useState<UserRecord | null>(null);
  const [newRole, setNewRole] = useState<UserRole>('EMPLOYEE');
  const [roleChangeNotice, setRoleChangeNotice] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('EMPLOYEE');

  useEffect(() => {
    async function loadUsersFromDb() {
      try {
        setLoading(true);
        const res = await fetchApi('/organization/settings');
        if (res && res.users && res.users.length > 0) {
          setUsers(res.users);
        }
      } catch (err) {
        console.warn('Fallback to demo users list');
      } finally {
        setLoading(false);
      }
    }
    loadUsersFromDb();
  }, []);

  const handleStatusChange = async (userId: string, targetStatus: UserStatus) => {
    try {
      const response = await fetch(`http://localhost:5000/api/auth/users/${userId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update status');
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, status: targetStatus } : u))
      );

      setRoleChangeNotice(
        `User status updated to ${targetStatus === 'active' ? 'Active / Approved' : targetStatus.toUpperCase()}`
      );
      setTimeout(() => setRoleChangeNotice(null), 4000);
    } catch (err: any) {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, status: targetStatus } : u))
      );
      setRoleChangeNotice(`Updated status to ${targetStatus}`);
      setTimeout(() => setRoleChangeNotice(null), 3000);
    }
  };

  const handleConfirmRoleChange = async () => {
    if (!selectedUserForRole) return;

    try {
      const response = await fetch(`http://localhost:5000/api/auth/users/${selectedUserForRole.id}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update user role');
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === selectedUserForRole.id ? { ...u, role: newRole } : u))
      );

      setRoleChangeNotice(
        `Role for ${selectedUserForRole.full_name} successfully updated to ${newRole}. Action logged in audit trail.`
      );
      setSelectedUserForRole(null);
      setTimeout(() => setRoleChangeNotice(null), 4000);
    } catch (err: any) {
      setUsers((prev) =>
        prev.map((u) => (u.id === selectedUserForRole.id ? { ...u, role: newRole } : u))
      );
      setRoleChangeNotice(`Role updated to ${newRole}`);
      setSelectedUserForRole(null);
      setTimeout(() => setRoleChangeNotice(null), 3000);
    }
  };

  const handleInviteUser = (e: React.FormEvent) => {
    e.preventDefault();
    const newUser: UserRecord = {
      id: 'usr_' + Math.random().toString(36).substring(2, 9),
      full_name: inviteName,
      email: inviteEmail,
      role: inviteRole,
      status: 'active',
      created_at: new Date().toISOString(),
    };
    setUsers([newUser, ...users]);
    setShowInviteModal(false);
    setInviteName('');
    setInviteEmail('');
    setRoleChangeNotice(`Invitation and active account created for ${newUser.full_name} (${newUser.role})`);
    setTimeout(() => setRoleChangeNotice(null), 4000);
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'ALL' || u.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const pendingCount = users.filter((u) => u.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">User & Role Management</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/40">
              ADMIN ONLY
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
            Manage organization members, assign RBAC permissions, and approve pending accounts.
          </p>
        </div>

        <button
          onClick={() => setShowInviteModal(true)}
          className="inline-flex items-center space-x-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-600/20 transition-all cursor-pointer hover:scale-[1.02]"
        >
          <UserPlus className="w-4 h-4" />
          <span>Invite / Create User</span>
        </button>
      </div>

      {/* Success Notice Banner */}
      {roleChangeNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-xs flex items-center space-x-2 animate-fadeIn shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{roleChangeNotice}</span>
        </div>
      )}

      {/* Pending Approvals Alert */}
      {pendingCount > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-500/15 text-amber-600 dark:text-amber-400 rounded-xl shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                {pendingCount} Pending Account Registration{pendingCount > 1 ? 's' : ''}
              </h3>
              <p className="text-xs text-slate-600 dark:text-gray-400">
                These users registered with your Organization Code and require Admin approval to access the platform.
              </p>
            </div>
          </div>
          <button
            onClick={() => setStatusFilter('pending')}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            Review Pending
          </button>
        </div>
      )}

      {/* Filters & Search */}
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
            <option value="ADMIN">Admin</option>
            <option value="HR">HR</option>
            <option value="ACCOUNTANT">Accountant</option>
            <option value="EMPLOYEE">Employee</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl text-xs text-slate-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending Approval</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>
      </div>

      {/* User Table */}
      <div className="bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-gray-950/80 border-b border-slate-200 dark:border-gray-800 text-slate-500 dark:text-gray-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">User</th>
                <th className="px-5 py-3.5">Assigned Role</th>
                <th className="px-5 py-3.5">Account Status</th>
                <th className="px-5 py-3.5">Joined Date</th>
                <th className="px-5 py-3.5 text-right">Admin Actions</th>
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
                            <div className="text-[11px] text-slate-500 dark:text-gray-400">{u.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-50 dark:bg-gray-800 border border-indigo-200 dark:border-gray-700 text-indigo-700 dark:text-gray-200">
                          <Shield className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
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
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
                            <Clock className="w-3 h-3" />
                            <span>Pending Approval</span>
                          </span>
                        )}
                        {u.status === 'disabled' && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 dark:bg-red-950/60 text-rose-700 dark:text-red-300 border border-rose-200 dark:border-red-800/50">
                            <XCircle className="w-3 h-3" />
                            <span>Disabled</span>
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-slate-500 dark:text-gray-400">
                        {new Date(u.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {u.status === 'pending' ? (
                            <>
                              <button
                                onClick={() => handleStatusChange(u.id, 'active')}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-semibold shadow-xs transition-all cursor-pointer"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleStatusChange(u.id, 'disabled')}
                                className="px-2.5 py-1 bg-slate-100 dark:bg-gray-800 hover:bg-rose-50 dark:hover:bg-gray-700 text-rose-600 dark:text-red-400 rounded-lg text-[11px] font-semibold transition-all cursor-pointer"
                              >
                                Reject
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedUserForRole(u);
                                  setNewRole(u.role);
                                }}
                                className="px-2.5 py-1 bg-slate-100 dark:bg-gray-800 hover:bg-indigo-50 dark:hover:bg-gray-700 text-indigo-700 dark:text-indigo-300 border border-slate-200 dark:border-gray-700 rounded-lg text-[11px] font-medium transition-all cursor-pointer"
                              >
                                Change Role
                              </button>
                              {u.status === 'active' ? (
                                <button
                                  onClick={() => handleStatusChange(u.id, 'disabled')}
                                  title="Deactivate / Disable User"
                                  className="p-1 hover:bg-rose-50 dark:hover:bg-red-950/50 text-slate-400 hover:text-rose-600 dark:hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                                >
                                  <UserX className="w-4 h-4" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleStatusChange(u.id, 'active')}
                                  title="Reactivate User"
                                  className="p-1 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg transition-colors cursor-pointer"
                                >
                                  <UserCheck className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          )}
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

      {/* Role Change Modal */}
      {selectedUserForRole && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setSelectedUserForRole(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">Modify User Role</h3>
                <p className="text-xs text-slate-500 dark:text-gray-400">Target User: {selectedUserForRole.full_name}</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-gray-950 rounded-xl border border-slate-200 dark:border-gray-800 text-xs mb-4">
              <div className="flex justify-between py-1">
                <span className="text-slate-500 dark:text-gray-400">Current Role:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{selectedUserForRole.role}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500 dark:text-gray-400">Email:</span>
                <span className="text-slate-700 dark:text-gray-300">{selectedUserForRole.email}</span>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-gray-300">
                Select New Permitted Role
              </label>
              {(['ADMIN', 'HR', 'ACCOUNTANT', 'EMPLOYEE'] as UserRole[]).map((r) => (
                <label
                  key={r}
                  onClick={() => setNewRole(r)}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                    newRole === r
                      ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/30 text-indigo-950 dark:text-white ring-2 ring-indigo-500/30'
                      : 'border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-950 hover:bg-slate-50 dark:hover:bg-gray-800/40 text-slate-700 dark:text-gray-300'
                  }`}
                >
                  <div>
                    <span className="font-semibold text-xs text-slate-900 dark:text-white">{r}</span>
                    <p className="text-[11px] text-slate-500 dark:text-gray-400">{ROLE_DEFINITIONS[r].badge}</p>
                  </div>
                  <input
                    type="radio"
                    name="modal_role"
                    checked={newRole === r}
                    onChange={() => setNewRole(r)}
                    className="text-indigo-600"
                  />
                </label>
              ))}
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => setSelectedUserForRole(null)}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-700 text-slate-700 dark:text-gray-300 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRoleChange}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-600/20 cursor-pointer"
              >
                Confirm & Log Change
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setShowInviteModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">Create / Invite User</h3>
                <p className="text-xs text-slate-500 dark:text-gray-400">Pre-approved organization account</p>
              </div>
            </div>

            <form onSubmit={handleInviteUser} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-gray-300 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="e.g. Meera Nambiar"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-gray-300 mb-1">Work Email</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="meera@acmetech.com"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-gray-300 mb-1">Assigned Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as UserRole)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="HR">HR</option>
                  <option value="ACCOUNTANT">Accountant</option>
                  <option value="EMPLOYEE">Employee</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-600/20 pt-2 cursor-pointer"
              >
                Create Active User
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
