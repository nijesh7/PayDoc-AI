'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  UserCheck,
  ShieldCheck,
  Filter,
  Check,
  X,
  FileSpreadsheet,
  Receipt,
  CalendarDays,
  UserX,
  CreditCard,
  Building2,
  RefreshCw,
  Search,
  ExternalLink,
} from 'lucide-react';
import { fetchApi } from '@/lib/apiClient';
import { formatDate, formatCurrency } from '@/lib/utils';

export default function ApprovalsHubPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'users' | 'payroll' | 'leaves' | 'invoices' | 'history'>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  // Approval categories data
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [pendingPayroll, setPendingPayroll] = useState<any[]>([]);
  const [pendingLeaves, setPendingLeaves] = useState<any[]>([]);
  const [pendingInvoices, setPendingInvoices] = useState<any[]>([]);
  const [historyItems, setHistoryItems] = useState<any[]>([]);

  // Action status state
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadAllApprovals = async () => {
    try {
      setLoading(true);
      const [usersRes, payrollRes, leaveRes, invRes, histRes] = await Promise.all([
        fetchApi('/users').catch(() => ({ users: [] })),
        fetchApi('/payroll/runs').catch(() => ({ payrollRuns: [] })),
        fetchApi('/leave-requests').catch(() => ({ leaveRequests: [] })),
        fetchApi('/invoices').catch(() => ({ invoices: [] })),
        fetchApi('/approvals/history').catch(() => ({ approvals: [] })),
      ]);

      // Filter pending user access requests
      const allUsers = usersRes.users || [];
      const pendUsers = allUsers.filter((u: any) => u.status === 'pending' || u.is_active === false);
      setPendingUsers(pendUsers);

      // Filter draft / unapproved payroll runs
      const allRuns = payrollRes.payrollRuns || [];
      const pendRuns = allRuns.filter((r: any) => r.status === 'draft' || r.status === 'reviewed');
      setPendingPayroll(pendRuns);

      // Filter pending leave requests
      const allLeaves = leaveRes.leaveRequests || [];
      const pendLeaves = allLeaves.filter((l: any) => l.status === 'pending');
      setPendingLeaves(pendLeaves);

      // Filter pending invoices
      const allInvoices = invRes.invoices || [];
      const pendInvoices = allInvoices.filter((i: any) => i.status === 'pending' || i.status === 'draft');
      setPendingInvoices(pendInvoices);

      setHistoryItems(histRes.approvals || []);
    } catch (err: any) {
      console.error('Failed to load approvals:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAllApprovals();
  }, []);

  const totalPendingCount =
    pendingUsers.length + pendingPayroll.length + pendingLeaves.length + pendingInvoices.length;

  // Handle User Approve / Reject
  const handleUserAction = async (userId: string, action: 'approve' | 'reject') => {
    setActionInProgress(userId);
    try {
      const newStatus = action === 'approve' ? 'active' : 'disabled';
      await fetchApi(`/users/${userId}/status`, {
        method: 'POST',
        body: JSON.stringify({ status: newStatus }),
      });
      setFeedbackMessage({
        type: 'success',
        text: `User request successfully ${action === 'approve' ? 'approved and activated' : 'rejected'}.`,
      });
      // Remove from list immediately
      setPendingUsers((prev) => prev.filter((u) => u.id !== userId));
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message || `Failed to ${action} user.` });
    } finally {
      setActionInProgress(null);
    }
  };

  // Handle Payroll Run Approve
  const handlePayrollApprove = async (runId: string) => {
    setActionInProgress(runId);
    try {
      await fetchApi(`/payroll/runs/${runId}/approve`, { method: 'POST' });
      setFeedbackMessage({
        type: 'success',
        text: 'Payroll batch approved and locked for disbursement.',
      });
      setPendingPayroll((prev) => prev.filter((r) => r.id !== runId));
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message || 'Failed to approve payroll run.' });
    } finally {
      setActionInProgress(null);
    }
  };

  // Handle Leave Request Action
  const handleLeaveAction = async (leaveId: string, action: 'approved' | 'rejected') => {
    setActionInProgress(leaveId);
    try {
      await fetchApi(`/leave-requests/${leaveId}/action`, {
        method: 'PATCH',
        body: JSON.stringify({ status: action }),
      });
      setFeedbackMessage({
        type: 'success',
        text: `Leave request ${action === 'approved' ? 'approved' : 'rejected'}.`,
      });
      setPendingLeaves((prev) => prev.filter((l) => l.id !== leaveId));
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message || `Failed to update leave request.` });
    } finally {
      setActionInProgress(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-indigo-50 via-white to-purple-50/40 dark:from-indigo-950/40 dark:via-slate-900 dark:to-purple-950/20 p-5 rounded-2xl border border-indigo-200/80 dark:border-indigo-800/40 shadow-xs">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 bg-indigo-600/10 dark:bg-indigo-600/20 border border-indigo-200 dark:border-indigo-500/40 rounded-xl text-indigo-600 dark:text-indigo-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Approvals Hub</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                {totalPendingCount} PENDING ACTION{totalPendingCount === 1 ? '' : 'S'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Unified command center for User Access Requests, Payroll Runs, Leave Applications, and Invoices.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setRefreshing(true);
            loadAllApprovals();
          }}
          disabled={refreshing || loading}
          className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-white text-xs font-semibold border border-slate-200 dark:border-slate-700 shadow-2xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh All</span>
        </button>
      </div>

      {/* Feedback Banner */}
      {feedbackMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center space-x-2 animate-fadeIn ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-red-950/40 border-rose-200 dark:border-red-800 text-rose-800 dark:text-red-300'
          }`}
        >
          {feedbackMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-red-400 shrink-0" />
          )}
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* User Requests Card */}
        <div
          onClick={() => setActiveTab('users')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            activeTab === 'users'
              ? 'bg-indigo-50/70 dark:bg-indigo-950/50 border-indigo-400 dark:border-indigo-600 shadow-sm'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">User Access Requests</span>
            <UserCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {pendingUsers.length}
            </span>
            <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
              {pendingUsers.length > 0 ? 'Requires Signoff' : 'Zero Pending'}
            </span>
          </div>
        </div>

        {/* Payroll Batches Card */}
        <div
          onClick={() => setActiveTab('payroll')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            activeTab === 'payroll'
              ? 'bg-indigo-50/70 dark:bg-indigo-950/50 border-indigo-400 dark:border-indigo-600 shadow-sm'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Payroll Runs</span>
            <FileSpreadsheet className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {pendingPayroll.length}
            </span>
            <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
              {pendingPayroll.length > 0 ? 'Awaiting Approval' : 'All Approved'}
            </span>
          </div>
        </div>

        {/* Leave Requests Card */}
        <div
          onClick={() => setActiveTab('leaves')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            activeTab === 'leaves'
              ? 'bg-indigo-50/70 dark:bg-indigo-950/50 border-indigo-400 dark:border-indigo-600 shadow-sm'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Staff Leave Requests</span>
            <CalendarDays className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {pendingLeaves.length}
            </span>
            <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400">
              {pendingLeaves.length > 0 ? 'Review Needed' : 'No Backlog'}
            </span>
          </div>
        </div>

        {/* Invoices Card */}
        <div
          onClick={() => setActiveTab('invoices')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            activeTab === 'invoices'
              ? 'bg-indigo-50/70 dark:bg-indigo-950/50 border-indigo-400 dark:border-indigo-600 shadow-sm'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Pending Invoices</span>
            <Receipt className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {pendingInvoices.length}
            </span>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              {pendingInvoices.length > 0 ? 'Pending Settlement' : 'Settled'}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'all'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <span>All Pending</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            {totalPendingCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'users'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>User Access Requests</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 font-bold">
            {pendingUsers.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('payroll')}
          className={`px-4 py-2.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'payroll'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Payroll Runs</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            {pendingPayroll.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('leaves')}
          className={`px-4 py-2.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'leaves'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <CalendarDays className="w-3.5 h-3.5" />
          <span>Leave Applications</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            {pendingLeaves.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('invoices')}
          className={`px-4 py-2.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'invoices'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>Invoices</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            {pendingInvoices.length}
          </span>
        </button>
      </div>

      {/* TAB CONTENT */}
      {loading ? (
        <div className="py-20 text-center text-xs text-slate-400">Loading approval items...</div>
      ) : totalPendingCount === 0 && activeTab === 'all' ? (
        <div className="p-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">All Caught Up!</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            There are zero pending approvals at this time. When employees, accountants, or HR register or submit requests, they will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Section 1: User Access Requests */}
          {(activeTab === 'all' || activeTab === 'users') && pendingUsers.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Pending User Access Requests ({pendingUsers.length})</span>
                </h3>
                <Link href="/admin/users" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                  <span>Manage Users Directory</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {pendingUsers.map((user) => (
                  <div
                    key={user.id}
                    className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/60 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-600 text-white font-bold text-sm flex items-center justify-center shrink-0">
                        {user.full_name?.charAt(0) || 'U'}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white">{user.full_name}</h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            Requested Role: {user.role}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300">
                            Pending Admin Signoff
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-mono">{user.email}</p>
                        <p className="text-[11px] text-slate-400">
                          Registered {formatDate(user.created_at)} • Organization: Cognivex Technologies Pvt Ltd
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                      <button
                        onClick={() => handleUserAction(user.id, 'reject')}
                        disabled={actionInProgress === user.id}
                        className="px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleUserAction(user.id, 'approve')}
                        disabled={actionInProgress === user.id}
                        className="flex items-center gap-1 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve Access</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 2: Payroll Runs */}
          {(activeTab === 'all' || activeTab === 'payroll') && pendingPayroll.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Pending Payroll Batches ({pendingPayroll.length})</span>
                </h3>
                <Link href="/payroll" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                  <span>Go to Payroll Center</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {pendingPayroll.map((run) => (
                  <div
                    key={run.id}
                    className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                          Payroll Period: {run.month}/{run.year}
                        </h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                          {run.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        {run.total_employees || 0} Employees included • Total Net Payout:{' '}
                        <span className="font-bold font-mono text-slate-900 dark:text-white">
                          {formatCurrency(run.total_net_salary || 0)}
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                      <Link
                        href={`/payroll/${run.id}`}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold"
                      >
                        Review Breakdown
                      </Link>
                      <button
                        onClick={() => handlePayrollApprove(run.id)}
                        disabled={actionInProgress === run.id}
                        className="flex items-center gap-1 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Sign & Approve Batch</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 3: Staff Leave Requests */}
          {(activeTab === 'all' || activeTab === 'leaves') && pendingLeaves.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Pending Leave Applications ({pendingLeaves.length})</span>
                </h3>
                <Link href="/attendance" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                  <span>Leave & Attendance Hub</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {pendingLeaves.map((leave) => (
                  <div
                    key={leave.id}
                    className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                          {leave.employee?.first_name} {leave.employee?.last_name || 'Staff Member'}
                        </h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                          {leave.leave_type?.replace('_', ' ') || 'Leave'}
                        </span>
                        <span className="text-xs font-mono text-slate-500">
                          {leave.total_days} Day{leave.total_days > 1 ? 's' : ''} ({formatDate(leave.start_date)} - {formatDate(leave.end_date)})
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 italic">
                        Reason: {leave.reason || 'Personal reasons'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                      <button
                        onClick={() => handleLeaveAction(leave.id, 'rejected')}
                        disabled={actionInProgress === leave.id}
                        className="px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleLeaveAction(leave.id, 'approved')}
                        disabled={actionInProgress === leave.id}
                        className="flex items-center gap-1 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve Leave</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 4: Invoices */}
          {(activeTab === 'all' || activeTab === 'invoices') && pendingInvoices.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Pending Invoices ({pendingInvoices.length})</span>
                </h3>
                <Link href="/invoices" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                  <span>View All Invoices</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {pendingInvoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                          Invoice #{inv.invoice_number} — {inv.vendor_name || 'Vendor'}
                        </h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                          {inv.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Total Amount:{' '}
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {formatCurrency(inv.total_amount)}
                        </span>{' '}
                        • Due Date: {formatDate(inv.due_date)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                      <Link
                        href={`/invoices`}
                        className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs"
                      >
                        Review Invoice
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
