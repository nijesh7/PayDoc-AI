'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CreditCard,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  Filter,
  ArrowUpRight,
  X,
  FileCheck2,
  Building2,
} from 'lucide-react';
import { fetchApi } from '../../../lib/apiClient';
import { formatCurrency, formatDate, getStatusBadge } from '../../../lib/utils';

export default function PaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({
    totalPaid: 0,
    totalPending: 0,
    totalOverdue: 0,
    totalDueSoon: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedPayment, setSelectedPayment] = useState<any>(null);

  // Record Payment Form
  const [payForm, setPayForm] = useState({
    payment_method: 'bank_transfer',
    reference_number: '',
    payment_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const loadPayments = async () => {
    try {
      setLoading(true);
      const [listRes, sumRes] = await Promise.all([
        fetchApi('/payments'),
        fetchApi('/payments/summary'),
      ]);
      setPayments(listRes.payments || []);
      setSummary(sumRes.summary || {});
    } catch (err) {
      console.error('Failed to load payments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchApi(`/payments/${selectedPayment.id}/pay`, {
        method: 'POST',
        body: JSON.stringify(payForm),
      });
      setSelectedPayment(null);
      loadPayments();
    } catch (err: any) {
      alert(`Payment recording failed: ${err.message}`);
    }
  };

  const filteredPayments = payments.filter((p) => {
    const matchesSearch = (p.vendor_name || p.reference_number || '')
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesType = typeFilter === 'all' || p.payment_type === typeFilter;
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Payment Ledger & Disbursements</h1>
          <p className="text-sm text-slate-500 mt-0.5">Track employee salary payouts, vendor liabilities, and settlement references.</p>
        </div>

        <Link
          href="/payments/payouts"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs hover:shadow transition-all shrink-0"
        >
          <Building2 className="w-4 h-4" />
          <span>Banking Payouts & UTR Hub</span>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Total Settled (Paid)</span>
          <p className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            {formatCurrency(summary.totalPaid)}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Pending Salary Payouts</span>
          <p className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">
            {formatCurrency(summary.totalPending)}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Overdue Liabilities</span>
          <p className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-1">
            {formatCurrency(summary.totalOverdue)}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Due Soon (7 Days)</span>
          <p className="text-xl font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-1">
            {formatCurrency(summary.totalDueSoon)}
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-[240px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search beneficiary, reference UTR..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-hidden text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 outline-hidden"
          >
            <option value="all">All Types</option>
            <option value="salary">Salary Disbursements</option>
            <option value="invoice">Invoice Payouts</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 outline-hidden"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="due_soon">Due Soon</option>
            <option value="overdue">Overdue</option>
            <option value="paid">Paid</option>
          </select>
        </div>
      </div>

      {/* Payments Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500">
            <tr>
              <th className="py-3 px-4 font-semibold">Beneficiary / Entity</th>
              <th className="py-3 px-4 font-semibold">Type</th>
              <th className="py-3 px-4 font-semibold">Amount</th>
              <th className="py-3 px-4 font-semibold">Due Date</th>
              <th className="py-3 px-4 font-semibold">Payment Details</th>
              <th className="py-3 px-4 font-semibold">Status</th>
              <th className="py-3 px-4 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400">Loading ledger...</td>
              </tr>
            ) : filteredPayments.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400">No payment records found.</td>
              </tr>
            ) : (
              filteredPayments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                    {p.vendor_name || (p.employees ? `${p.employees.first_name} ${p.employees.last_name}` : 'Beneficiary')}
                  </td>
                  <td className="py-3.5 px-4 capitalize text-slate-600 dark:text-slate-400">
                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold">
                      {p.payment_type}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                    {formatCurrency(p.amount)}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 font-mono">
                    {formatDate(p.due_date)}
                  </td>
                  <td className="py-3.5 px-4">
                    {p.status === 'paid' ? (
                      <div>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">{p.payment_method?.replace('_', ' ')}</span>
                        {p.reference_number && <p className="text-[10px] text-slate-400 font-mono">Ref: {p.reference_number}</p>}
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">Pending settlement</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border capitalize ${getStatusBadge(p.status)}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {p.status !== 'paid' ? (
                      <button
                        onClick={() => setSelectedPayment(p)}
                        className="px-3 py-1 rounded-md text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                      >
                        Record Paid
                      </button>
                    ) : (
                      <span className="text-xs text-emerald-600 font-semibold flex items-center justify-end gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Paid
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Record Payment Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Record Payment Settlement</h3>
                <p className="text-xs text-slate-500">Amount: <span className="font-bold text-indigo-600">{formatCurrency(selectedPayment.amount)}</span></p>
              </div>
              <button onClick={() => setSelectedPayment(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Payment Method</label>
                <select
                  value={payForm.payment_method}
                  onChange={(e) => setPayForm({ ...payForm, payment_method: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden"
                >
                  <option value="bank_transfer">Direct Bank Transfer / NEFT</option>
                  <option value="upi">UPI / Instant QR</option>
                  <option value="cheque">Cheque</option>
                  <option value="cash">Cash Voucher</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Reference / UTR / Cheque Number</label>
                <input
                  type="text"
                  placeholder="e.g. UTR1928374652"
                  value={payForm.reference_number}
                  onChange={(e) => setPayForm({ ...payForm, reference_number: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Payment Date</label>
                <input
                  type="date"
                  value={payForm.payment_date}
                  onChange={(e) => setPayForm({ ...payForm, payment_date: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedPayment(null)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
                >
                  Mark as Settled
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
