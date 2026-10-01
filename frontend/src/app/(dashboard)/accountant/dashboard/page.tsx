'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BadgeDollarSign,
  Receipt,
  CreditCard,
  FileText,
  AlertTriangle,
  Plus,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { fetchApi } from '@/lib/apiClient';
import { formatCurrency } from '@/lib/utils';
import { useTheme } from '@/lib/themeProvider';

export default function AccountantDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    async function loadFinanceData() {
      try {
        const res = await fetchApi('/dashboard');
        setData(res);
      } catch (err) {
        console.error('Failed to load Accountant dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    loadFinanceData();
  }, []);

  const metrics = data?.metrics || {
    pendingSalaryPayments: 85000,
    overduePayments: 49560,
    pendingInvoices: 2,
    overdueInvoices: 1,
    currentPayrollMonth: 485000,
  };

  return (
    <div className="space-y-6">
      {/* Accountant Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-emerald-50 via-slate-50 to-white dark:from-emerald-950/60 dark:via-slate-900 dark:to-gray-900 p-5 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/40 shadow-xs">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 bg-emerald-600/10 dark:bg-emerald-600/20 border border-emerald-200 dark:border-emerald-500/40 rounded-xl text-emerald-600 dark:text-emerald-400">
            <BadgeDollarSign className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Finance & Accounting Dashboard</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/40">
                ACCOUNTANT WORKSPACE
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Invoice Ledger, Vendor Settlement, Salary Disbursements & Tax Compliance
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <Link
            href="/invoices"
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-white text-xs font-semibold border border-slate-200 dark:border-slate-700 shadow-2xs transition-colors"
          >
            <Receipt className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Invoices</span>
          </Link>
          <Link
            href="/payments"
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            <span>Record Payment</span>
          </Link>
        </div>
      </div>

      {/* Critical Overdue Warning */}
      {metrics.overduePayments > 0 && (
        <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-rose-500/15 rounded-xl text-rose-600 dark:text-rose-400 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Attention: Overdue Vendor Liabilities</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Total overdue balance: {formatCurrency(metrics.overduePayments)} across 1 vendor invoice past settlement date.
              </p>
            </div>
          </div>
          <Link
            href="/payments"
            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors shrink-0"
          >
            Settle Overdue
          </Link>
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Pending Salary Outflow</span>
            <CreditCard className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
              {formatCurrency(metrics.pendingSalaryPayments)}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">3 employee salaries pending</p>
        </div>

        <div className="bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Overdue Vendor Invoices</span>
            <Receipt className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400">
              {formatCurrency(metrics.overduePayments)}
            </span>
          </div>
          <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium mt-1">AWS Cloud Bill Overdue</p>
        </div>

        <div className="bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Monthly Payroll Run</span>
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {formatCurrency(metrics.currentPayrollMonth)}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">10 payroll vouchers</p>
        </div>

        <div className="bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Unsettled Invoices</span>
            <Receipt className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">{metrics.pendingInvoices}</span>
            <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">Invoices</span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Total liability: ₹79,060</p>
        </div>
      </div>
    </div>
  );
}
