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
} from 'lucide-react';
import { fetchApi } from '@/lib/apiClient';
import { formatCurrency } from '@/lib/utils';

export default function AccountantDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-emerald-950/60 via-slate-900 to-gray-900 p-5 rounded-2xl border border-emerald-800/40">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 bg-emerald-600/20 border border-emerald-500/40 rounded-xl text-emerald-400">
            <BadgeDollarSign className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-white">Finance & Accounting Dashboard</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                ACCOUNTANT WORKSPACE
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Invoice Ledger, Vendor Settlement, Salary Disbursements & Tax Compliance
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <Link
            href="/invoices"
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-xs font-semibold border border-gray-700 transition-colors"
          >
            <Receipt className="w-4 h-4 text-emerald-400" />
            <span>Invoices</span>
          </Link>
          <Link
            href="/payments"
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Record Payment</span>
          </Link>
        </div>
      </div>

      {/* Financial Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400">Pending Salary Outflow</span>
            <CreditCard className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-white">{formatCurrency(metrics.pendingSalaryPayments)}</span>
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Disbursements awaiting release</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400">Overdue Vendor Bills</span>
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-red-400">{formatCurrency(metrics.overduePayments)}</span>
          </div>
          <p className="text-[11px] text-gray-500 mt-1">1 overdue vendor invoice</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400">Pending Customer Invoices</span>
            <Receipt className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-white">{metrics.pendingInvoices}</span>
            <span className="text-xs text-emerald-400 font-medium">₹1,18,000</span>
          </div>
          <p className="text-[11px] text-gray-500 mt-1">GST compliant tax invoices</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400">Total Payroll Month</span>
            <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-white">{formatCurrency(metrics.currentPayrollMonth)}</span>
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Approved for disbursement</p>
        </div>
      </div>

      {/* Accountant Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-1">Financial Reconciliation Ledger</h3>
          <p className="text-xs text-gray-400 mb-4">Latest recorded salary and vendor transactions</p>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-gray-950/60 border border-gray-800">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white">Invoice #INV-2026-001 (Zenith Infotech)</h4>
                  <p className="text-[11px] text-gray-400">Software Consulting Services • Paid via NEFT</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-emerald-400">+₹1,18,000</span>
                <p className="text-[10px] text-gray-500">UTR: AXIS99281726</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-gray-950/60 border border-gray-800">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                  <TrendingDown className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white">Salary Batch (Engineering Dept - 5 Staff)</h4>
                  <p className="text-[11px] text-gray-400">Monthly Net Salary • Pending Bank Release</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-amber-400">-₹2,60,000</span>
                <p className="text-[10px] text-amber-500">Due March 31</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-gray-950/60 border border-gray-800">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-red-500/10 text-red-400">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white">AWS Cloud Services (Overdue Vendor Bill)</h4>
                  <p className="text-[11px] text-gray-400">Infrastructure Hosting • Due March 15</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-red-400">-₹49,560</span>
                <p className="text-[10px] text-red-400 font-medium">Overdue 16 days</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-1">Accounting Shortcuts</h3>
          <p className="text-xs text-gray-400 mb-4">Fast entry & document processing</p>

          <div className="space-y-3">
            <Link
              href="/invoices"
              className="flex items-center space-x-3 p-3 rounded-xl bg-gray-950 border border-gray-800 hover:border-emerald-500/50 transition-all group"
            >
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg group-hover:scale-110 transition-transform">
                <Plus className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-white">Create GST Invoice</h4>
                <p className="text-[10px] text-gray-400">With dynamic line items & tax</p>
              </div>
            </Link>

            <Link
              href="/payments"
              className="flex items-center space-x-3 p-3 rounded-xl bg-gray-950 border border-gray-800 hover:border-blue-500/50 transition-all group"
            >
              <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg group-hover:scale-110 transition-transform">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-white">Settle Payments / UTR</h4>
                <p className="text-[10px] text-gray-400">Record bank transfer references</p>
              </div>
            </Link>

            <Link
              href="/documents"
              className="flex items-center space-x-3 p-3 rounded-xl bg-gray-950 border border-gray-800 hover:border-purple-500/50 transition-all group"
            >
              <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg group-hover:scale-110 transition-transform">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-white">Upload Vendor Bills</h4>
                <p className="text-[10px] text-gray-400">OCR & AI key-value extraction</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
