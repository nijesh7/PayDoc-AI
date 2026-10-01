'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileSpreadsheet,
  Plus,
  ArrowRight,
  CheckCircle,
  Clock,
  ShieldCheck,
  X,
  AlertCircle,
} from 'lucide-react';
import { fetchApi } from '../../../lib/apiClient';
import { formatCurrency, formatDate, getStatusBadge } from '../../../lib/utils';

export default function PayrollPage() {
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewRunModal, setShowNewRunModal] = useState(false);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [creating, setCreating] = useState(false);

  const loadRuns = async () => {
    try {
      setLoading(true);
      const res = await fetchApi('/payroll/runs');
      setRuns(res.payrollRuns || []);
    } catch (err) {
      console.error('Failed to load payroll runs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRuns();
  }, []);

  const handleCreateRun = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetchApi('/payroll/runs', {
        method: 'POST',
        body: JSON.stringify({ month: Number(month), year: Number(year) }),
      });
      setShowNewRunModal(false);
      window.location.href = `/payroll/${res.payrollRun.id}`;
    } catch (err: any) {
      alert(err.message || 'Failed to create payroll run');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Payroll Runs</h1>
          <p className="text-sm text-slate-500 mt-0.5">Deterministic salary computation, review workflows, approval locks, and payslip generation.</p>
        </div>
        <button
          onClick={() => setShowNewRunModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Payroll Run</span>
        </button>
      </div>

      {/* Runs Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500">
            <tr>
              <th className="py-3 px-4 font-semibold">Pay Period</th>
              <th className="py-3 px-4 font-semibold">Employees Included</th>
              <th className="py-3 px-4 font-semibold">Total Basic</th>
              <th className="py-3 px-4 font-semibold">Total Allowances</th>
              <th className="py-3 px-4 font-semibold">Total Deductions</th>
              <th className="py-3 px-4 font-semibold">Net Payout</th>
              <th className="py-3 px-4 font-semibold">Status</th>
              <th className="py-3 px-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400">Loading payroll history...</td>
              </tr>
            ) : runs.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400">
                  No payroll runs created yet. Click "New Payroll Run" to start.
                </td>
              </tr>
            ) : (
              runs.map((run) => (
                <tr key={run.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                    {run.month}/{run.year}
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-600 dark:text-slate-300">
                    {run.total_employees} Employees
                  </td>
                  <td className="py-3.5 px-4 font-mono">{formatCurrency(run.total_basic)}</td>
                  <td className="py-3.5 px-4 font-mono text-emerald-600">+{formatCurrency(run.total_allowances)}</td>
                  <td className="py-3.5 px-4 font-mono text-rose-600">-{formatCurrency(run.total_deductions)}</td>
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                    {formatCurrency(run.total_net_salary)}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border capitalize ${getStatusBadge(run.status)}`}>
                      {run.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <Link
                      href={`/payroll/${run.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/50"
                    >
                      <span>Review & Adjust</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* New Payroll Run Modal */}
      {showNewRunModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Start New Payroll Run</h3>
              <button onClick={() => setShowNewRunModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRun} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Select Month</label>
                <select
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden"
                >
                  {[
                    'January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'
                  ].map((m, i) => (
                    <option key={m} value={i + 1}>{m} ({i + 1})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Select Year</label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden font-mono"
                />
              </div>

              <div className="p-3 rounded-lg bg-indigo-50/50 dark:bg-slate-800 border border-indigo-100 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                <p className="font-semibold text-indigo-700 dark:text-indigo-400">Deterministic Calculation Engine</p>
                <p className="text-[11px]">All active employees will be loaded, and salaries will be computed deterministically using standard formulas.</p>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewRunModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50"
                >
                  {creating ? 'Calculating...' : 'Launch Payroll Run'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
