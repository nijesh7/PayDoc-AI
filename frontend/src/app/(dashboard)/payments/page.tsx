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
  Plus,
  Download,
  Receipt,
  User,
  ArrowRight,
  Check,
  Calendar,
  DollarSign,
  FileSpreadsheet,
} from 'lucide-react';
import { fetchApi } from '../../../lib/apiClient';
import { formatCurrency, formatDate, getStatusBadge } from '../../../lib/utils';

export default function PaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({
    totalPaid: 0,
    totalPending: 0,
    totalOverdue: 0,
    totalDueSoon: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilterTab, setActiveFilterTab] = useState<'all' | 'salary' | 'invoice' | 'pending' | 'paid'>('all');

  // Modal 1: Quick Settle Existing Payment
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [settleForm, setSettleForm] = useState({
    payment_method: 'bank_transfer',
    reference_number: '',
    payment_date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [settling, setSettling] = useState(false);

  // Modal 2: Record New Payment
  const [showNewPaymentModal, setShowNewPaymentModal] = useState(false);
  const [newPaymentForm, setNewPaymentForm] = useState({
    payment_type: 'salary',
    beneficiary_name: '',
    employee_id: '',
    amount: '',
    due_date: new Date().toISOString().split('T')[0],
    is_already_paid: true,
    payment_method: 'bank_transfer',
    reference_number: '',
    notes: '',
  });
  const [creatingPayment, setCreatingPayment] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [listRes, sumRes, empRes] = await Promise.all([
        fetchApi('/payments'),
        fetchApi('/payments/summary'),
        fetchApi('/employees').catch(() => ({ employees: [] })),
      ]);
      setPayments(listRes.payments || []);
      setSummary(sumRes.summary || {});
      setEmployees(empRes.employees || []);
    } catch (err) {
      console.error('Failed to load payments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter Payments
  const filteredPayments = payments.filter((p) => {
    const beneficiary = (
      p.vendor_name ||
      (p.employees ? `${p.employees.first_name} ${p.employees.last_name}` : '') ||
      ''
    ).toLowerCase();

    const ref = (p.reference_number || '').toLowerCase();
    const notes = (p.notes || '').toLowerCase();
    const query = search.toLowerCase();

    const matchesSearch = beneficiary.includes(query) || ref.includes(query) || notes.includes(query);

    if (!matchesSearch) return false;

    if (activeFilterTab === 'salary') return p.payment_type === 'salary';
    if (activeFilterTab === 'invoice') return p.payment_type === 'invoice' || p.payment_type === 'vendor';
    if (activeFilterTab === 'pending') return p.status === 'pending' || p.status === 'due_soon' || p.status === 'overdue';
    if (activeFilterTab === 'paid') return p.status === 'paid';

    return true;
  });

  // Handle Mark Paid / Settle
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayment) return;
    setSettling(true);
    try {
      await fetchApi(`/payments/${selectedPayment.id}/pay`, {
        method: 'POST',
        body: JSON.stringify(settleForm),
      });
      setSelectedPayment(null);
      await loadData();
    } catch (err: any) {
      alert(`Payment recording failed: ${err.message}`);
    } finally {
      setSettling(false);
    }
  };

  // Handle Create New Payment
  const handleCreateNewPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPaymentForm.amount || Number(newPaymentForm.amount) <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }

    let finalBeneficiary = newPaymentForm.beneficiary_name.trim();
    let empId = newPaymentForm.employee_id || null;

    if (newPaymentForm.payment_type === 'salary' && newPaymentForm.employee_id) {
      const emp = employees.find((e) => e.id === newPaymentForm.employee_id);
      if (emp) {
        finalBeneficiary = `${emp.first_name} ${emp.last_name}`;
      }
    }

    if (!finalBeneficiary) {
      alert('Please enter or select a beneficiary name.');
      return;
    }

    setCreatingPayment(true);
    try {
      await fetchApi('/payments', {
        method: 'POST',
        body: JSON.stringify({
          payment_type: newPaymentForm.payment_type,
          vendor_name: finalBeneficiary,
          employee_id: empId,
          amount: Number(newPaymentForm.amount),
          due_date: newPaymentForm.due_date,
          status: newPaymentForm.is_already_paid ? 'paid' : 'pending',
          payment_method: newPaymentForm.is_already_paid ? newPaymentForm.payment_method : null,
          reference_number: newPaymentForm.reference_number || (newPaymentForm.is_already_paid ? `UTR${Date.now().toString().slice(-8)}` : null),
          notes: newPaymentForm.notes || null,
        }),
      });

      setShowNewPaymentModal(false);
      setNewPaymentForm({
        payment_type: 'salary',
        beneficiary_name: '',
        employee_id: '',
        amount: '',
        due_date: new Date().toISOString().split('T')[0],
        is_already_paid: true,
        payment_method: 'bank_transfer',
        reference_number: '',
        notes: '',
      });
      await loadData();
    } catch (err: any) {
      alert(`Failed to create payment: ${err.message}`);
    } finally {
      setCreatingPayment(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (filteredPayments.length === 0) {
      alert('No payment records to export.');
      return;
    }

    const headers = ['Beneficiary', 'Type', 'Amount (INR)', 'Due Date', 'Status', 'Payment Method', 'Reference UTR', 'Notes'];
    const rows = filteredPayments.map((p) => {
      const name = p.vendor_name || (p.employees ? `${p.employees.first_name} ${p.employees.last_name}` : 'N/A');
      return [
        `"${name}"`,
        p.payment_type,
        Number(p.amount).toFixed(2),
        p.due_date,
        p.status,
        p.payment_method || 'N/A',
        `"${p.reference_number || 'N/A'}"`,
        `"${p.notes || ''}"`,
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `PayDoc_Payment_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <span>Payments Ledger & Disbursements</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Track employee salaries, vendor liabilities, UTR references, and settlement receipts.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 shadow-2xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <Link
            href="/payments/payouts"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 shadow-2xs transition-colors cursor-pointer"
          >
            <Building2 className="w-3.5 h-3.5 text-indigo-600" />
            <span>Banking & UTR Hub</span>
          </Link>

          <button
            onClick={() => setShowNewPaymentModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs hover:shadow transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Record Payment</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => setActiveFilterTab('paid')}
          className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs cursor-pointer hover:border-emerald-300 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Settled (Paid)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            {formatCurrency(summary.totalPaid)}
          </p>
        </div>

        <div
          onClick={() => setActiveFilterTab('salary')}
          className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs cursor-pointer hover:border-amber-300 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Pending Salaries</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">
            {formatCurrency(summary.totalPending)}
          </p>
        </div>

        <div
          onClick={() => setActiveFilterTab('pending')}
          className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs cursor-pointer hover:border-rose-300 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Overdue Liabilities</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-1">
            {formatCurrency(summary.totalOverdue)}
          </p>
        </div>

        <div
          onClick={() => setActiveFilterTab('invoice')}
          className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs cursor-pointer hover:border-indigo-300 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Due Soon (7 Days)</span>
            <Calendar className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-xl font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-1">
            {formatCurrency(summary.totalDueSoon)}
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'all', label: 'All Transactions' },
              { id: 'salary', label: 'Salary Only' },
              { id: 'invoice', label: 'Vendor / Invoices' },
              { id: 'pending', label: 'Pending / Due' },
              { id: 'paid', label: 'Paid / Settled' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveFilterTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  activeFilterTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[240px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search beneficiary, UTR, notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500">
            <tr>
              <th className="py-3 px-4 font-semibold">Beneficiary / Recipient</th>
              <th className="py-3 px-4 font-semibold">Category</th>
              <th className="py-3 px-4 font-semibold">Amount</th>
              <th className="py-3 px-4 font-semibold">Due Date</th>
              <th className="py-3 px-4 font-semibold">Settlement Details</th>
              <th className="py-3 px-4 font-semibold">Status</th>
              <th className="py-3 px-4 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400">Loading payment ledger...</td>
              </tr>
            ) : filteredPayments.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400">
                  No payment records found matching criteria. Click "Record Payment" to add one.
                </td>
              </tr>
            ) : (
              filteredPayments.map((p) => {
                const benName =
                  p.vendor_name ||
                  (p.employees ? `${p.employees.first_name} ${p.employees.last_name}` : 'Beneficiary');

                return (
                  <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    {/* Beneficiary */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center shrink-0 border border-indigo-200 dark:border-indigo-800">
                          {benName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{benName}</p>
                          {p.employees?.employee_id && (
                            <p className="text-[10px] text-slate-400 font-mono">ID: {p.employees.employee_id}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-4 capitalize">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        p.payment_type === 'salary'
                          ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300'
                          : 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                      }`}>
                        {p.payment_type}
                      </span>
                    </td>

                    {/* Amount */}
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                      {formatCurrency(p.amount)}
                    </td>

                    {/* Due Date */}
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 font-mono">
                      {formatDate(p.due_date)}
                    </td>

                    {/* Settlement Details */}
                    <td className="py-3.5 px-4">
                      {p.status === 'paid' ? (
                        <div>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize text-xs">
                            {p.payment_method?.replace('_', ' ') || 'Bank Transfer'}
                          </span>
                          {p.reference_number && (
                            <p className="text-[10px] text-slate-400 font-mono">UTR: {p.reference_number}</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Awaiting settlement</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border capitalize ${getStatusBadge(p.status)}`}>
                        {p.status}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 text-right">
                      {p.status !== 'paid' ? (
                        <button
                          onClick={() => {
                            setSelectedPayment(p);
                            setSettleForm({
                              payment_method: 'bank_transfer',
                              reference_number: `UTR${Date.now().toString().slice(-8)}`,
                              payment_date: new Date().toISOString().split('T')[0],
                              notes: '',
                            });
                          }}
                          className="px-3 py-1 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer"
                        >
                          Mark Paid
                        </button>
                      ) : (
                        <span className="text-xs text-emerald-600 font-semibold flex items-center justify-end gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Settled</span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL 1: Quick Settle Existing Payment */}
      {selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Record Settlement</h3>
                <p className="text-xs text-slate-500">
                  Amount:{' '}
                  <span className="font-bold text-emerald-600 font-mono">
                    {formatCurrency(selectedPayment.amount)}
                  </span>
                </p>
              </div>
              <button
                onClick={() => setSelectedPayment(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Payment Method
                </label>
                <select
                  value={settleForm.payment_method}
                  onChange={(e) => setSettleForm({ ...settleForm, payment_method: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                >
                  <option value="bank_transfer">Bank Transfer (NEFT / RTGS / IMPS)</option>
                  <option value="upi">UPI (GPay / PhonePe / BHIM)</option>
                  <option value="cheque">Cheque</option>
                  <option value="cash">Cash</option>
                  <option value="card">Corporate Card</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Reference Number / UTR
                </label>
                <input
                  type="text"
                  required
                  value={settleForm.reference_number}
                  onChange={(e) => setSettleForm({ ...settleForm, reference_number: e.target.value })}
                  placeholder="e.g. UTR9876543210"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-mono"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Settlement Date
                </label>
                <input
                  type="date"
                  required
                  value={settleForm.payment_date}
                  onChange={(e) => setSettleForm({ ...settleForm, payment_date: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  value={settleForm.notes}
                  onChange={(e) => setSettleForm({ ...settleForm, notes: e.target.value })}
                  placeholder="e.g. Cleared via HDFC Bank"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedPayment(null)}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={settling}
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {settling ? 'Recording...' : 'Confirm Settlement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Record New Payment */}
      {showNewPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Record New Payment</h3>
                <p className="text-xs text-slate-500">Log a salary payout or vendor liability directly into the ledger.</p>
              </div>
              <button
                onClick={() => setShowNewPaymentModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewPayment} className="p-5 space-y-4 text-xs">
              {/* Payment Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Payment Category
                  </label>
                  <select
                    value={newPaymentForm.payment_type}
                    onChange={(e) => setNewPaymentForm({ ...newPaymentForm, payment_type: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  >
                    <option value="salary">Salary Disbursement</option>
                    <option value="invoice">Invoice Payout</option>
                    <option value="vendor">Vendor Expense</option>
                    <option value="other">Other Liability</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Amount (₹) <span className="text-indigo-600">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 50000"
                    value={newPaymentForm.amount}
                    onChange={(e) => setNewPaymentForm({ ...newPaymentForm, amount: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-mono"
                  />
                </div>
              </div>

              {/* Beneficiary Name / Employee Selector */}
              {newPaymentForm.payment_type === 'salary' ? (
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Choose Employee
                  </label>
                  <select
                    value={newPaymentForm.employee_id}
                    onChange={(e) => setNewPaymentForm({ ...newPaymentForm, employee_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  >
                    <option value="">-- Select Employee --</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name} ({emp.employee_id}) — {emp.designation || 'Staff'}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Beneficiary / Vendor Name <span className="text-indigo-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. AWS Cloud Services, ABC Printers"
                    value={newPaymentForm.beneficiary_name}
                    onChange={(e) => setNewPaymentForm({ ...newPaymentForm, beneficiary_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  />
                </div>
              )}

              {/* Due Date & Settlement Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    required
                    value={newPaymentForm.due_date}
                    onChange={(e) => setNewPaymentForm({ ...newPaymentForm, due_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    value={newPaymentForm.is_already_paid ? 'paid' : 'pending'}
                    onChange={(e) => setNewPaymentForm({ ...newPaymentForm, is_already_paid: e.target.value === 'paid' })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  >
                    <option value="paid">Settled / Already Paid</option>
                    <option value="pending">Pending Settlement</option>
                  </select>
                </div>
              </div>

              {/* If Paid: Payment Method & Reference */}
              {newPaymentForm.is_already_paid && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Payment Method
                      </label>
                      <select
                        value={newPaymentForm.payment_method}
                        onChange={(e) => setNewPaymentForm({ ...newPaymentForm, payment_method: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
                      >
                        <option value="bank_transfer">Bank Transfer (NEFT/RTGS)</option>
                        <option value="upi">UPI</option>
                        <option value="cheque">Cheque</option>
                        <option value="cash">Cash</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Reference Number / UTR
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. UTR456789123"
                        value={newPaymentForm.reference_number}
                        onChange={(e) => setNewPaymentForm({ ...newPaymentForm, reference_number: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Monthly stipend or office expense"
                  value={newPaymentForm.notes}
                  onChange={(e) => setNewPaymentForm({ ...newPaymentForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewPaymentModal(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingPayment}
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {creatingPayment ? 'Recording...' : 'Add to Ledger'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
