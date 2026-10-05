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
  ChevronRight,
  Filter,
  Check,
  X,
  FileSpreadsheet,
  Receipt,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { fetchApi } from '@/lib/apiClient';
import { formatDate, formatCurrency, getStatusBadge } from '@/lib/utils';

export default function ApprovalsPage() {
  const [activeTab, setActiveTab] = useState<'pending' | 'history' | 'workflows'>('pending');
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [historyApprovals, setHistoryApprovals] = useState<any[]>([]);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Action Dialog State
  const [selectedApproval, setSelectedApproval] = useState<any | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [comments, setComments] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [pendingRes, histRes, wfRes] = await Promise.all([
        fetchApi('/approvals/pending'),
        fetchApi('/approvals/history'),
        fetchApi('/approval-workflows').catch(() => ({ workflows: [] })),
      ]);
      setPendingApprovals(pendingRes.pending || []);
      setHistoryApprovals(histRes.approvals || []);
      setWorkflows(wfRes.workflows || []);
    } catch (err: any) {
      console.error('Failed to load approvals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApproval) return;
    setActionLoading(true);
    setActionError(null);

    try {
      await fetchApi(`/approvals/${selectedApproval.id}/action`, {
        method: 'POST',
        body: JSON.stringify({
          action: actionType,
          comments: comments.trim() || undefined,
        }),
      });
      setSelectedApproval(null);
      setComments('');
      await loadData();
    } catch (err: any) {
      setActionError(err.message || 'Action failed.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>Approvals & Governance Hub</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Multi-level signoff engine, Maker-Checker segregation, and organizational approval audit trails.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
            {pendingApprovals.length} Pending Actions
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'pending'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Pending My Action ({pendingApprovals.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'history'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>All Approvals Audit ({historyApprovals.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('workflows')}
          className={`px-4 py-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'workflows'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Configured Workflows ({workflows.length})</span>
        </button>
      </div>

      {/* TAB 1: Pending Approvals */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          {loading ? (
            <div className="py-16 text-center text-xs text-slate-400">Loading pending requests...</div>
          ) : pendingApprovals.length === 0 ? (
            <div className="p-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">All caught up!</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No items are currently awaiting your role signoff. New payroll batches and high-value invoices will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {pendingApprovals.map((item) => {
                const currentStepObj = (item.steps || []).find((s: any) => s.step_number === item.current_step);
                return (
                  <div
                    key={item.id}
                    className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400">
                          {item.entity_type.replace('_', ' ')}
                        </span>
                        <span className="text-xs font-semibold text-slate-500">
                          Step {item.current_step} of {item.total_steps}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          Requires: {currentStepObj?.required_role?.toUpperCase()}
                        </span>
                      </div>

                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                        {item.entity_type === 'payroll_run'
                          ? `Payroll Run Batch — Step ${item.current_step} Verification`
                          : `High-Value Invoice Signoff — ${item.entity_id}`}
                      </h3>

                      <p className="text-xs text-slate-400">
                        Initiated {formatDate(item.created_at)} • Maker-Checker Enforced
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-auto">
                      <button
                        onClick={() => {
                          setSelectedApproval(item);
                          setActionType('reject');
                        }}
                        className="px-3.5 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => {
                          setSelectedApproval(item);
                          setActionType('approve');
                        }}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Sign & Approve</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: All Approvals History */}
      {activeTab === 'history' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Governance & Audit Log of Approvals
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-[11px] font-semibold text-slate-500">
                  <th className="py-3 px-4">Entity Type</th>
                  <th className="py-3 px-4">Submitted By</th>
                  <th className="py-3 px-4">Progression</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Last Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {historyApprovals.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 capitalize font-semibold text-slate-900 dark:text-white">
                      {item.entity_type.replace('_', ' ')}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                      {item.creator?.full_name || 'System Maker'}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">
                      Step {item.current_step} of {item.total_steps}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold capitalize border ${getStatusBadge(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {formatDate(item.updated_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Configured Workflows */}
      {activeTab === 'workflows' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {workflows.map((wf) => (
            <div
              key={wf.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {wf.entity_type}
                  </span>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-1.5">{wf.name}</h3>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                  Active
                </span>
              </div>

              <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3 text-xs">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Maker-Checker Enforced:</span>
                  <strong className="text-slate-800 dark:text-slate-200">
                    {wf.maker_checker_enforced ? 'Yes (Creator cannot approve)' : 'No'}
                  </strong>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Threshold:</span>
                  <strong className="text-slate-800 dark:text-slate-200">
                    &gt;= {formatCurrency(wf.min_amount)}
                  </strong>
                </div>
                
                <div className="pt-2">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Steps Sequence</p>
                  <div className="space-y-1 font-mono text-[11px] bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    {(wf.steps || []).map((s: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                        <span className="w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center text-[10px] font-bold">
                          {s.step}
                        </span>
                        <span>{s.title || `Step ${s.step}`} ({s.role})</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action Modal (Approve or Reject) */}
      {selectedApproval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white capitalize">
                {actionType} {selectedApproval.entity_type.replace('_', ' ')}
              </h3>
              <button onClick={() => setSelectedApproval(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAction} className="p-6 space-y-4 text-xs">
              {actionError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  {actionError}
                </div>
              )}

              <p className="text-slate-600 dark:text-slate-400">
                You are about to <strong className="uppercase font-mono text-slate-900 dark:text-white">{actionType}</strong> step {selectedApproval.current_step} of {selectedApproval.total_steps}.
              </p>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Comments / Signoff Note {actionType === 'reject' && <span className="text-rose-500">*</span>}
                </label>
                <textarea
                  rows={3}
                  required={actionType === 'reject'}
                  placeholder={actionType === 'approve' ? 'Optional verification comment...' : 'Reason for rejection...'}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 outline-hidden"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedApproval(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className={`px-5 py-2 rounded-xl text-white text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer ${
                    actionType === 'approve' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {actionLoading ? 'Processing...' : actionType === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
