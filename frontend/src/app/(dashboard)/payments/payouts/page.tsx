'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Building,
  CreditCard,
  Download,
  Plus,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Check,
  RefreshCw,
  Search,
  Building2,
  ShieldCheck,
  Clock,
  Sparkles,
  X,
  FileText,
} from 'lucide-react';
import { fetchApi } from '../../../../lib/apiClient';
import { formatCurrency, formatDate } from '../../../../lib/utils';

interface BankAccount {
  id: string;
  bank_name: string;
  account_number: string;
  ifsc_code: string;
  branch_name?: string;
  account_type: string;
  client_code?: string;
  is_primary: boolean;
}

interface PayoutBatch {
  id: string;
  batch_number: string;
  bank_format: string;
  payment_type: string;
  total_records: number;
  total_amount: number;
  status: 'generated' | 'submitted_to_bank' | 'reconciled' | 'partially_reconciled';
  file_name: string;
  file_content?: string;
  generated_at: string;
  reconciled_at?: string;
  organization_bank_account?: {
    bank_name: string;
    account_number: string;
  };
  generator?: {
    full_name: string;
  };
}

interface BatchItem {
  id: string;
  beneficiary_name: string;
  account_number: string;
  ifsc_code: string;
  amount: number;
  status: string;
  utr_number?: string;
  error_message?: string;
  employee?: {
    employee_id: string;
    first_name: string;
    last_name: string;
  };
}

export default function PayoutsHubPage() {
  const [activeTab, setActiveTab] = useState<'batches' | 'accounts'>('batches');
  const [batches, setBatches] = useState<PayoutBatch[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [payrollRuns, setPayrollRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [viewingBatch, setViewingBatch] = useState<PayoutBatch | null>(null);
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [reconcilingBatch, setReconcilingBatch] = useState<PayoutBatch | null>(null);

  // Generate Form State
  const [generateForm, setGenerateForm] = useState({
    bank_format: 'HDFC_SALARY_CSV',
    organization_bank_account_id: '',
    payroll_run_id: '',
    value_date: new Date().toISOString().split('T')[0],
  });
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Add Account Form State
  const [accountForm, setAccountForm] = useState({
    bank_name: 'HDFC Bank',
    account_number: '',
    ifsc_code: '',
    branch_name: '',
    account_type: 'current',
    client_code: '',
    is_primary: true,
  });
  const [savingAccount, setSavingAccount] = useState(false);

  // Reconcile Form State
  const [reconcileCsvText, setReconcileCsvText] = useState('');
  const [reconciling, setReconciling] = useState(false);
  const [reconcileResult, setReconcileResult] = useState<any>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [bRes, aRes, prRes] = await Promise.all([
        fetchApi('/banking/batches').catch(() => ({ batches: [] })),
        fetchApi('/banking/accounts').catch(() => ({ bankAccounts: [] })),
        fetchApi('/payroll/runs').catch(() => ({ payrollRuns: [] })),
      ]);

      setBatches(bRes.batches || []);
      setBankAccounts(aRes.bankAccounts || []);
      setPayrollRuns(prRes.payrollRuns || []);

      if (aRes.bankAccounts?.length > 0) {
        setGenerateForm((prev) => ({
          ...prev,
          organization_bank_account_id: aRes.bankAccounts[0].id,
        }));
      }
      if (prRes.payrollRuns?.length > 0) {
        setGenerateForm((prev) => ({
          ...prev,
          payroll_run_id: prRes.payrollRuns[0].id,
        }));
      }
    } catch (err) {
      console.error('Failed to load banking data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Download Bank File from batch
  const handleDownloadFile = (batch: PayoutBatch) => {
    if (!batch.file_content) {
      alert('File content not available for download');
      return;
    }
    const blob = new Blob([batch.file_content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', batch.file_name || `${batch.batch_number}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // View Batch Items
  const handleViewItems = async (batch: PayoutBatch) => {
    setViewingBatch(batch);
    setLoadingItems(true);
    try {
      const res = await fetchApi(`/banking/batches/${batch.id}`);
      setBatchItems(res.items || []);
    } catch (err) {
      console.error('Failed to load batch items:', err);
    } finally {
      setLoadingItems(false);
    }
  };

  // Generate Payout Batch
  const handleGenerateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setGenerateError(null);

    try {
      const res = await fetchApi('/banking/batches', {
        method: 'POST',
        body: JSON.stringify(generateForm),
      });

      setShowGenerateModal(false);
      await loadData();

      // Trigger automatic download of generated file
      if (res.fileResult) {
        const blob = new Blob([res.fileResult.fileContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', res.fileResult.fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err: any) {
      setGenerateError(err.message || 'Failed to generate payout file');
    } finally {
      setGenerating(false);
    }
  };

  // Save Corporate Bank Account
  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAccount(true);
    try {
      await fetchApi('/banking/accounts', {
        method: 'POST',
        body: JSON.stringify(accountForm),
      });

      setShowAddAccountModal(false);
      await loadData();
    } catch (err: any) {
      alert(`Failed to save account: ${err.message}`);
    } finally {
      setSavingAccount(false);
    }
  };

  // Execute UTR Reconciliation
  const handleReconcile = async () => {
    if (!reconcilingBatch) return;
    setReconciling(true);
    setReconcileResult(null);

    try {
      // Parse CSV or lines: format: AccountNumber,Amount,UTRNumber,[Status]
      const lines = reconcileCsvText.split('\n').filter((l) => l.trim().length > 0);
      const rows = lines.map((line) => {
        const parts = line.split(',').map((p) => p.trim());
        return {
          account_number: parts[0] || '',
          amount: Number(parts[1]) || 0,
          utr_number: parts[2] || '',
          status: (parts[3]?.toUpperCase() === 'FAILED' ? 'FAILED' : 'SUCCESS') as 'SUCCESS' | 'FAILED',
        };
      });

      const res = await fetchApi(`/banking/batches/${reconcilingBatch.id}/reconcile`, {
        method: 'POST',
        body: JSON.stringify({ reconciliation_rows: rows }),
      });

      setReconcileResult(res);
      await loadData();
    } catch (err: any) {
      alert(`Reconciliation error: ${err.message}`);
    } finally {
      setReconciling(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'reconciled':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200';
      case 'partially_reconciled':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border-amber-200';
      case 'submitted_to_bank':
        return 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border-blue-200';
      case 'generated':
      default:
        return 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400 border-purple-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/payments"
            className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-600" />
              <span>Banking & Payouts Hub</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Indian corporate bank payout files (HDFC, ICICI, SBI CMS, NEFT) and automated UTR reconciliation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowAddAccountModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold shadow-xs"
          >
            <Plus className="w-4 h-4 text-indigo-600" />
            <span>Add Bank Account</span>
          </button>

          <button
            onClick={() => setShowGenerateModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs hover:shadow transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Generate Payout File</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 text-xs font-semibold">
        {[
          { key: 'batches', label: 'Payout Batches & Files' },
          { key: 'accounts', label: 'Corporate Bank Accounts' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`pb-3 transition-colors ${
              activeTab === tab.key
                ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: BATCHES */}
      {activeTab === 'batches' && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Generated Bank Payout Batches</h3>
              <p className="text-xs text-slate-500">Corporate disbursement files formatted for bank upload.</p>
            </div>
            <span className="text-xs font-mono text-slate-400">{batches.length} batches generated</span>
          </div>

          {batches.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl space-y-2">
              <FileSpreadsheet className="w-8 h-8 text-slate-400 mx-auto" />
              <p>No payout batches generated yet.</p>
              <button
                onClick={() => setShowGenerateModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Generate First Salary Batch</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-y border-slate-200 dark:border-slate-800 text-slate-500">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">Batch Number</th>
                    <th className="py-2.5 px-3 font-semibold">Format</th>
                    <th className="py-2.5 px-3 font-semibold">Bank Account</th>
                    <th className="py-2.5 px-3 font-semibold">Recipients</th>
                    <th className="py-2.5 px-3 font-semibold">Total Amount</th>
                    <th className="py-2.5 px-3 font-semibold">Status</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {batches.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-3 px-3 font-mono font-medium text-slate-900 dark:text-white">
                        <div>{b.batch_number}</div>
                        <div className="text-[10px] text-slate-400">{formatDate(b.generated_at)}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {b.bank_format.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-400">
                        {b.organization_bank_account?.bank_name} (••••{' '}
                        {b.organization_bank_account?.account_number.slice(-4)})
                      </td>
                      <td className="py-3 px-3 font-mono font-medium text-slate-800 dark:text-slate-200">
                        {b.total_records} items
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white">
                        {formatCurrency(b.total_amount)}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getStatusBadge(
                            b.status
                          )}`}
                        >
                          {b.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleDownloadFile(b)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-semibold"
                            title="Download CSV"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download</span>
                          </button>

                          <button
                            onClick={() => handleViewItems(b)}
                            className="px-2.5 py-1 rounded border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold"
                          >
                            Items
                          </button>

                          {b.status !== 'reconciled' && (
                            <button
                              onClick={() => {
                                setReconcilingBatch(b);
                                setReconcileResult(null);
                                setReconcileCsvText('');
                              }}
                              className="px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold border border-emerald-200"
                            >
                              Reconcile
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CORPORATE BANK ACCOUNTS */}
      {activeTab === 'accounts' && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Disbursement Bank Accounts</h3>
              <p className="text-xs text-slate-500">Corporate debit accounts used to fund salary disbursements.</p>
            </div>
            <button
              onClick={() => setShowAddAccountModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-semibold hover:bg-indigo-100"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Account</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bankAccounts.map((acc) => (
              <div
                key={acc.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 space-y-2 relative"
              >
                {acc.is_primary && (
                  <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Primary Account
                  </span>
                )}

                <div className="flex items-center gap-2">
                  <Building className="w-5 h-5 text-indigo-600" />
                  <span className="font-bold text-sm text-slate-900 dark:text-white">{acc.bank_name}</span>
                </div>

                <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400 font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Account Number:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{acc.account_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">IFSC Code:</span>
                    <span>{acc.ifsc_code}</span>
                  </div>
                  {acc.client_code && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Client Code:</span>
                      <span>{acc.client_code}</span>
                    </div>
                  )}
                  {acc.branch_name && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Branch:</span>
                      <span>{acc.branch_name}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* GENERATE PAYOUT BATCH MODAL */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                  <span>Generate Bank Payout File</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Export formatted bulk salary upload CSV with beneficiary IFSC and account numbers.
                </p>
              </div>
              <button
                onClick={() => setShowGenerateModal(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGenerateBatch} className="space-y-4">
              {generateError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700">
                  {generateError}
                </div>
              )}

              {/* Payroll Run Selector */}
              <div>
                <label className="block font-semibold mb-1">Select Payroll Run*</label>
                <select
                  required
                  value={generateForm.payroll_run_id}
                  onChange={(e) => setGenerateForm({ ...generateForm, payroll_run_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                >
                  <option value="">Select a payroll run...</option>
                  {payrollRuns.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.month}/{r.year} — {r.total_employees} employees ({formatCurrency(r.total_net_salary)}) [
                      {r.status}]
                    </option>
                  ))}
                </select>
              </div>

              {/* Debit Bank Account */}
              <div>
                <label className="block font-semibold mb-1">Corporate Debit Account*</label>
                <select
                  required
                  value={generateForm.organization_bank_account_id}
                  onChange={(e) =>
                    setGenerateForm({ ...generateForm, organization_bank_account_id: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                >
                  {bankAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.bank_name} — {a.account_number} ({a.ifsc_code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Bank Format */}
              <div>
                <label className="block font-semibold mb-1">Bank Payout File Format*</label>
                <select
                  required
                  value={generateForm.bank_format}
                  onChange={(e) => setGenerateForm({ ...generateForm, bank_format: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                >
                  <option value="HDFC_SALARY_CSV">HDFC Bank Salary Upload CSV (FT / NEFT)</option>
                  <option value="ICICI_CORPORATE_EXCEL">ICICI Corporate Payout Format (CMS)</option>
                  <option value="SBI_CMS">State Bank of India (SBI CMS Bulk Payout)</option>
                  <option value="STANDARD_NEFT_CSV">Standard RBI NEFT / IMPS CSV</option>
                </select>
              </div>

              {/* Value Date */}
              <div>
                <label className="block font-semibold mb-1">Disbursement Value Date*</label>
                <input
                  type="date"
                  required
                  value={generateForm.value_date}
                  onChange={(e) => setGenerateForm({ ...generateForm, value_date: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  className="px-4 py-2 rounded-xl font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generating}
                  className="px-5 py-2 rounded-xl font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs disabled:opacity-50"
                >
                  {generating ? 'Generating File...' : 'Generate & Download'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW BATCH ITEMS MODAL */}
      {viewingBatch && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Batch Line Items: {viewingBatch.batch_number}</span>
                  <span className="font-mono text-indigo-600">({formatCurrency(viewingBatch.total_amount)})</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Beneficiaries, bank accounts, and payment reconciliation status.
                </p>
              </div>
              <button
                onClick={() => setViewingBatch(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingItems ? (
              <div className="py-8 text-center text-slate-400">Loading batch recipients...</div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-y border-slate-200 dark:border-slate-800 text-slate-500">
                    <tr>
                      <th className="py-2 px-3 font-semibold">Beneficiary</th>
                      <th className="py-2 px-3 font-semibold">Account Number</th>
                      <th className="py-2 px-3 font-semibold">IFSC</th>
                      <th className="py-2 px-3 font-semibold">Amount</th>
                      <th className="py-2 px-3 font-semibold">Status</th>
                      <th className="py-2 px-3 font-semibold">UTR Number</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {batchItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">
                          {item.beneficiary_name}
                        </td>
                        <td className="py-2.5 px-3 font-mono">{item.account_number}</td>
                        <td className="py-2.5 px-3 font-mono">{item.ifsc_code}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white">
                          {formatCurrency(item.amount)}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                              item.status === 'processed'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-indigo-600">
                          {item.utr_number || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* RECONCILE UTR MODAL */}
      {reconcilingBatch && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Reconcile UTR Numbers: {reconcilingBatch.batch_number}</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Paste bank statement or UTR lines: AccountNumber, Amount, UTRNumber
                </p>
              </div>
              <button
                onClick={() => setReconcilingBatch(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {reconcileResult && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 space-y-1">
                <p className="font-bold">Reconciliation Complete:</p>
                <p>• {reconcileResult.matchedCount} transactions matched and marked as PAID.</p>
                {reconcileResult.unmatchedCount > 0 && (
                  <p className="text-amber-700">• {reconcileResult.unmatchedCount} unmatched records.</p>
                )}
              </div>
            )}

            <div>
              <label className="block font-semibold mb-1">
                Paste Bank Statement / UTR CSV Rows:
              </label>
              <textarea
                rows={6}
                placeholder="50100234567890, 45000.50, HDFCN26100512345&#10;00000034567890, 62500.00, SBIN26100567890"
                value={reconcileCsvText}
                onChange={(e) => setReconcileCsvText(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-[11px]"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Format: <code>AccountNumber, Amount, UTRNumber</code> (one per line)
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setReconcilingBatch(null)}
                className="px-4 py-2 rounded-xl font-semibold text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>
              <button
                type="button"
                disabled={reconciling || !reconcileCsvText.trim()}
                onClick={handleReconcile}
                className="px-5 py-2 rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs disabled:opacity-50"
              >
                {reconciling ? 'Reconciling...' : 'Match & Mark Paid'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD ACCOUNT MODAL */}
      {showAddAccountModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Building className="w-4 h-4 text-indigo-600" />
                <span>Add Corporate Bank Account</span>
              </h3>
              <button
                onClick={() => setShowAddAccountModal(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAccount} className="space-y-3">
              <div>
                <label className="block font-semibold mb-1">Bank Name*</label>
                <select
                  required
                  value={accountForm.bank_name}
                  onChange={(e) => setAccountForm({ ...accountForm, bank_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                >
                  <option value="HDFC Bank">HDFC Bank</option>
                  <option value="ICICI Bank">ICICI Bank</option>
                  <option value="State Bank of India">State Bank of India</option>
                  <option value="Axis Bank">Axis Bank</option>
                  <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Account Number*</label>
                <input
                  type="text"
                  required
                  value={accountForm.account_number}
                  onChange={(e) => setAccountForm({ ...accountForm, account_number: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">IFSC Code*</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HDFC0000001"
                  value={accountForm.ifsc_code}
                  onChange={(e) => setAccountForm({ ...accountForm, ifsc_code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono uppercase"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Client Code / Corporate ID</label>
                <input
                  type="text"
                  placeholder="Optional bank CMS code"
                  value={accountForm.client_code}
                  onChange={(e) => setAccountForm({ ...accountForm, client_code: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="is_primary"
                  checked={accountForm.is_primary}
                  onChange={(e) => setAccountForm({ ...accountForm, is_primary: e.target.checked })}
                />
                <label htmlFor="is_primary" className="font-semibold text-slate-700 dark:text-slate-300">
                  Set as primary disbursement account
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddAccountModal(false)}
                  className="px-4 py-2 rounded-xl font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAccount}
                  className="px-5 py-2 rounded-xl font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs disabled:opacity-50"
                >
                  {savingAccount ? 'Saving...' : 'Add Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
