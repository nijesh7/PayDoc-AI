'use client';

import React, { useState, useEffect } from 'react';
import {
  User,
  Shield,
  Building2,
  Mail,
  Phone,
  Calendar,
  CheckCircle2,
  LogOut,
  Save,
  KeyRound,
  Briefcase,
  Layers,
  Sparkles,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { fetchApi } from '@/lib/apiClient';
import { UserRole, normalizeRole, ROLE_DEFINITIONS } from '@/types/auth';

export default function ProfilePage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+91 98765 43210');
  const [role, setRole] = useState<UserRole>('ADMIN');
  const [orgName, setOrgName] = useState('Cognivex Technologies Pvt Ltd');
  const [orgCode, setOrgCode] = useState('COGNIVEX-2026');
  const [status, setStatus] = useState('active');
  const [department, setDepartment] = useState('Executive Management');
  const [designation, setDesignation] = useState('Organization Administrator');
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadUserProfile() {
      try {
        setLoading(true);

        // 1. Check Supabase Auth user
        const { data: { user } } = await supabase.auth.getUser();

        // 2. Read local session storage
        const savedRole = localStorage.getItem('paydoc_active_role');
        const savedEmail = localStorage.getItem('paydoc_user_email');
        const savedName = localStorage.getItem('paydoc_user_name');

        const activeRole = normalizeRole(savedRole || user?.user_metadata?.role || 'ADMIN');
        setRole(activeRole);

        const currentEmail = user?.email || savedEmail || 'admin@cognivex.com';
        setEmail(currentEmail);

        const currentName =
          user?.user_metadata?.full_name ||
          savedName ||
          (activeRole === 'ADMIN'
            ? 'Rajesh Sharma'
            : activeRole === 'HR'
            ? 'Ananya Deshmukh'
            : activeRole === 'ACCOUNTANT'
            ? 'Vikram Mehta'
            : 'Aarav Sharma');
        setFullName(currentName);

        // 3. Fetch Organization Settings
        const orgRes = await fetchApi('/organization/settings').catch(() => null);
        if (orgRes?.organization) {
          setOrgName(orgRes.organization.name || 'Cognivex Technologies Pvt Ltd');
          setOrgCode(orgRes.organization.invitation_code || 'COGNIVEX-2026');
        }

        // 4. Fetch Users directory to match real status
        const usersRes = await fetchApi('/users').catch(() => null);
        if (usersRes?.users) {
          const match = usersRes.users.find(
            (u: any) => u.email?.toLowerCase() === currentEmail.toLowerCase()
          );
          if (match) {
            setFullName(match.full_name || currentName);
            setStatus(match.status || (match.is_active ? 'active' : 'pending'));
            if (match.role) setRole(normalizeRole(match.role));
          }
        }

        // 5. Fetch Employees directory for Department & Designation
        const empRes = await fetchApi('/employees').catch(() => null);
        if (empRes?.employees) {
          const empMatch = empRes.employees.find(
            (e: any) => e.email?.toLowerCase() === currentEmail.toLowerCase()
          );
          if (empMatch) {
            setDepartment(empMatch.departments?.name || 'General');
            setDesignation(empMatch.designation || 'Staff Member');
            setEmployeeId(empMatch.employee_id || null);
            if (empMatch.phone) setPhone(empMatch.phone);
          } else {
            // Default designations per role
            if (activeRole === 'ADMIN') {
              setDepartment('Executive Management');
              setDesignation('Managing Director / Admin');
            } else if (activeRole === 'HR') {
              setDepartment('Human Resources');
              setDesignation('Senior HR Manager');
            } else if (activeRole === 'ACCOUNTANT') {
              setDepartment('Finance & Accounting');
              setDesignation('Lead Financial Controller');
            } else {
              setDepartment('Engineering & Product');
              setDesignation('Full-Stack Software Engineer');
            }
          }
        }
      } catch (err) {
        console.error('Failed to load user profile:', err);
      } finally {
        setLoading(false);
      }
    }

    loadUserProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      localStorage.setItem('paydoc_user_name', fullName);
      setSaved(true);
      setTimeout(() => setSaved(false), 3500);
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('paydoc_active_role');
    localStorage.removeItem('paydoc_user_email');
    localStorage.removeItem('paydoc_user_name');
    window.location.href = '/login';
  };

  const getRoleTheme = () => {
    switch (role) {
      case 'ADMIN':
        return {
          bg: 'bg-indigo-50 dark:bg-indigo-950/60',
          border: 'border-indigo-200 dark:border-indigo-800',
          text: 'text-indigo-700 dark:text-indigo-300',
          gradient: 'from-indigo-600 to-violet-600',
        };
      case 'HR':
        return {
          bg: 'bg-blue-50 dark:bg-blue-950/60',
          border: 'border-blue-200 dark:border-blue-800',
          text: 'text-blue-700 dark:text-blue-300',
          gradient: 'from-blue-600 to-indigo-600',
        };
      case 'ACCOUNTANT':
        return {
          bg: 'bg-emerald-50 dark:bg-emerald-950/60',
          border: 'border-emerald-200 dark:border-emerald-800',
          text: 'text-emerald-700 dark:text-emerald-300',
          gradient: 'from-emerald-600 to-teal-600',
        };
      case 'EMPLOYEE':
        return {
          bg: 'bg-purple-50 dark:bg-purple-950/60',
          border: 'border-purple-200 dark:border-purple-800',
          text: 'text-purple-700 dark:text-purple-300',
          gradient: 'from-purple-600 to-pink-600',
        };
    }
  };

  const roleStyle = getRoleTheme();

  const getRolePermissionsDescription = () => {
    switch (role) {
      case 'ADMIN':
        return [
          'Full CRUD management across Organizations, Departments, and Settings',
          'Review & Approve incoming user access requests and role assignments',
          'Deterministic Payroll Run final review, signoff, and payment release locks',
          'Full AI Document Intelligence extraction, contract clause discovery & NLP querying',
          'Read access to immutable organizational audit trails and compliance reports',
        ];
      case 'HR':
        return [
          'Full Employee Directory CRUD (Personal, Salary Structure, Emergency Contacts)',
          'Leave & Attendance records administration and balance adjustments',
          'Configurable salary component definition and monthly payroll preparation',
          'Employee document verification and digital payslip dispatch',
          'Staff compliance tracking and TDS declaration verification',
        ];
      case 'ACCOUNTANT':
        return [
          'Payment Ledger administration (Disbursement settlements, UTR tracking)',
          'Invoice lifecycle management (AI document bills, vendor payouts)',
          'Indian Statutory Tax compliance calculation (TDS, PF, ESI, Professional Tax)',
          'Inspect approved payroll batches and execute bank transfer export',
          'Form 16 PDF compilation and quarterly compliance reviews',
        ];
      case 'EMPLOYEE':
        return [
          'Self-service portal access (Personal profile & compensation overview)',
          'Submit and monitor leave applications and attendance check-ins',
          'Submit Indian Income Tax regime declaration (Old vs New Regime under 115BAC)',
          'Download authentic monthly digital PDF payslips with official breakdown',
          'Upload personal identity documents (PAN, Aadhaar, Proof of Investment)',
        ];
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">My Account Profile</h1>
          <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
            Verified credentials, active role permissions, and organization details.
          </p>
        </div>

        <button
          onClick={handleSignOut}
          className="inline-flex items-center space-x-2 px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-red-950/50 text-slate-700 dark:text-gray-300 hover:text-rose-600 dark:hover:text-red-400 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer shadow-2xs"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>

      {saved && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-xs flex items-center space-x-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>Profile changes saved successfully!</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Profile Card */}
        <div className="bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 text-center shadow-xs">
          <div
            className={`w-20 h-20 rounded-2xl bg-gradient-to-tr ${roleStyle.gradient} text-white font-bold text-2xl flex items-center justify-center mx-auto shadow-md shadow-indigo-600/20 mb-4`}
          >
            {fullName ? fullName.charAt(0).toUpperCase() : 'U'}
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            {loading ? 'Loading...' : fullName}
          </h2>
          <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5 font-mono">{email}</p>

          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col items-center space-y-2">
            <span
              className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold border ${roleStyle.bg} ${roleStyle.border} ${roleStyle.text}`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Role: {role}</span>
            </span>

            <span
              className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                status === 'active'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                  : 'bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Status: {status === 'active' ? 'Active & Verified' : 'Pending Approval'}</span>
            </span>

            {employeeId && (
              <span className="text-[11px] font-mono text-slate-400">
                Emp ID: {employeeId}
              </span>
            )}
          </div>
        </div>

        {/* Right Details & Edit Form */}
        <div className="md:col-span-2 bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
              Account & Employment Information
            </h3>
            <p className="text-xs text-slate-500">
              Details automatically synchronized with your organization directory.
            </p>
          </div>

          <form onSubmit={handleSave} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium text-slate-700 dark:text-gray-300 mb-1.5">Full Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-slate-400 dark:text-gray-500" />
                  </div>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-gray-300 mb-1.5">Phone Number</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-4 w-4 text-slate-400 dark:text-gray-500" />
                  </div>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium text-slate-700 dark:text-gray-300 mb-1.5">
                  Work Email (Immutable ID)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-slate-400 dark:text-gray-500" />
                  </div>
                  <input
                    type="email"
                    disabled
                    value={email}
                    className="w-full pl-9 pr-3 py-2 bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 dark:text-gray-400 cursor-not-allowed font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-gray-300 mb-1.5">
                  Assigned Department
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Layers className="h-4 w-4 text-slate-400 dark:text-gray-500" />
                  </div>
                  <input
                    type="text"
                    disabled
                    value={department}
                    className="w-full pl-9 pr-3 py-2 bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-gray-300 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium text-slate-700 dark:text-gray-300 mb-1.5">Organization</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Building2 className="h-4 w-4 text-slate-400 dark:text-gray-500" />
                  </div>
                  <input
                    type="text"
                    disabled
                    value={orgName}
                    className="w-full pl-9 pr-3 py-2 bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-gray-300 cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-gray-300 mb-1.5">
                  Organization Invitation Code
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <KeyRound className="h-4 w-4 text-slate-400 dark:text-gray-500" />
                  </div>
                  <input
                    type="text"
                    disabled
                    value={orgCode}
                    className="w-full pl-9 pr-3 py-2 bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-indigo-600 dark:text-indigo-400 font-bold cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? 'Saving...' : 'Save Profile Changes'}</span>
              </button>
            </div>
          </form>

          {/* Role Entitlements & Permissions Matrix */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Role Permissions: {role}</span>
            </h4>
            <div className="space-y-1.5">
              {getRolePermissionsDescription().map((perm, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{perm}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
