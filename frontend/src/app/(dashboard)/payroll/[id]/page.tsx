'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  Lock,
  Download,
  Edit2,
  X,
  FileSpreadsheet,
  AlertCircle,
  Plus,
  FileDown,
} from 'lucide-react';
import { fetchApi } from '../../../../lib/apiClient';
import { formatCurrency, getStatusBadge } from '../../../../lib/utils';

export default function PayrollRunDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  // Adjustment Modal Form
  const [adjForm, setAdjForm] = useState({
    overtime_hours: 0,
    bonus_amount: 0,
    advances_amount: 0,
    unpaid_leave_days: 0,
  });

  const loadRun = async () => {
    try {
      setLoading(true);
      const res = await fetchApi(`/payroll/runs/${id}`);
      setData(res);
    } catch (err) {
      console.error('Failed to load run details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) loadRun();
  }, [id]);

  const handleApprove = async () => {
    if (!confirm('Are you sure you want to approve this payroll run? This will lock calculations and generate payment records.')) return;
    setApproving(true);
    try {
      await fetchApi(`/payroll/runs/${id}/approve`, { method: 'POST' });
      loadRun();
    } catch (err: any) {
      alert(err.message || 'Approval failed');
    } finally {
      setApproving(false);
    }
  };

  const handleOpenAdjust = (item: any) => {
    setSelectedItem(item);
    setAdjForm({
      overtime_hours: Number(item.overtime_hours) || 0,
      bonus_amount: Number(item.bonus_amount) || 0,
      advances_amount: Number(item.advances_amount) || 0,
      unpaid_leave_days: 0,
    });
  };

  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchApi(`/payroll/items/${selectedItem.id}`, {
        method: 'PUT',
        body: JSON.stringify(adjForm),
      });
      setSelectedItem(null);
      loadRun();
    } catch (err: any) {
      alert(err.message || 'Failed to update adjustments');
    }
  };

  const downloadPayslip = async (payrollItemId: string, empId: string) => {
    try {
      const blob = await fetchApi(`/payslips/${payrollItemId}/pdf`);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Payslip_${empId}_${data.payrollRun.month}_${data.payrollRun.year}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err: any) {
      alert(`Error downloading payslip: ${err.message}`);
    }
  };

  const [downloadingECR, setDownloadingECR] = useState(false);

  const downloadECR = async () => {
    try {
      setDownloadingECR(true);
      const blob = await fetchApi(`/payroll/runs/${id}/ecr`);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `EPFO_ECR_${data.payrollRun.month}_${data.payrollRun.year}.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err: any) {
      alert(`Error downloading EPFO ECR file: ${err.message}`);
    } finally {
      setDownloadingECR(false);
    }
  };

  if (loading) {
    return <div className="py-16 text-center text-xs text-slate-400">Loading payroll calculations...</div>;
  }

  const { payrollRun, items } = data || {};
  const isApproved = payrollRun?.status === 'approved' || payrollRun?.status === 'paid';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/payroll"
            className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                Payroll Run: {payrollRun?.month}/{payrollRun?.year}
              </h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${getStatusBadge(payrollRun?.status)}`}>
                {payrollRun?.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {payrollRun?.total_employees} Employees • Net Payout: <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(payrollRun?.total_net_salary)}</span>
            </p>
          </div>
        </div>

        {!isApproved && (
          <button
            onClick={handleApprove}
            disabled={approving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-all self-start sm:self-auto"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{approving ? 'Approving...' : 'Approve & Lock Payroll'}</span>
          </button>
        )}

        {isApproved && (
          <div className="flex items-center gap-2">
            <button
              onClick={downloadECR}
              disabled={downloadingECR}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-xs font-semibold transition disabled:opacity-50"
              title="Download official Electronic Challan cum Return file for EPFO portal upload"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>{downloadingECR ? 'Downloading ECR...' : 'Download EPFO ECR'}</span>
            </button>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>Run Approved & Locked</span>
            </div>
          </div>
        )}
      </div>

      {/* Employee Items Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500">
              <tr>
                <th className="py-3 px-4 font-semibold">Employee</th>
                <th className="py-3 px-4 font-semibold">Base Salary</th>
                <th className="py-3 px-4 font-semibold">Overtime</th>
                <th className="py-3 px-4 font-semibold">Bonus</th>
                <th className="py-3 px-4 font-semibold">Allowances</th>
                <th className="py-3 px-4 font-semibold">Deductions</th>
                <th className="py-3 px-4 font-semibold">Net Payout</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {(items || []).map((item: any) => (
                <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4">
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {item.employees?.first_name} {item.employees?.last_name}
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono">
                      {item.employees?.employee_id} • {item.employees?.designation}
                    </p>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-medium">{formatCurrency(item.basic_salary)}</td>
                  <td className="py-3.5 px-4 font-mono">
                    {item.overtime_hours > 0 ? (
                      <div>
                        <span className="text-emerald-600 font-semibold">+{formatCurrency(item.overtime_amount)}</span>
                        <p className="text-[10px] text-slate-400">{item.overtime_hours} hrs</p>
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="py-3.5 px-4 font-mono">
                    {item.bonus_amount > 0 ? (
                      <span className="text-emerald-600 font-semibold">+{formatCurrency(item.bonus_amount)}</span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-emerald-600">
                    +{formatCurrency(item.allowances_amount)}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-rose-600">
                    -{formatCurrency(Number(item.deductions_amount) + Number(item.advances_amount) + Number(item.leave_deductions_amount))}
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                    {formatCurrency(item.net_salary)}
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-2">
                    {!isApproved && (
                      <button
                        onClick={() => handleOpenAdjust(item)}
                        className="p-1.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                        title="Adjust Overtime / Bonus / Deductions"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => downloadPayslip(item.id, item.employees?.employee_id)}
                      className="p-1.5 rounded bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-400 transition-colors"
                      title="Download PDF Payslip"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjust Line Item Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Adjust Line Item: {selectedItem.employees?.first_name} {selectedItem.employees?.last_name}
                </h3>
                <p className="text-[11px] text-slate-500 font-mono">{selectedItem.employees?.employee_id}</p>
              </div>
              <button onClick={() => setSelectedItem(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdjustment} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Overtime Hours</label>
                <input
                  type="number"
                  step="0.5"
                  value={adjForm.overtime_hours}
                  onChange={(e) => setAdjForm({ ...adjForm, overtime_hours: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Performance Bonus (₹)</label>
                <input
                  type="number"
                  value={adjForm.bonus_amount}
                  onChange={(e) => setAdjForm({ ...adjForm, bonus_amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Salary Advance Recovery (₹)</label>
                <input
                  type="number"
                  value={adjForm.advances_amount}
                  onChange={(e) => setAdjForm({ ...adjForm, advances_amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Unpaid Leave Days</label>
                <input
                  type="number"
                  value={adjForm.unpaid_leave_days}
                  onChange={(e) => setAdjForm({ ...adjForm, unpaid_leave_days: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden font-mono"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs"
                >
                  Recalculate & Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
