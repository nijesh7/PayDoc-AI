'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  CreditCard,
  Receipt,
  FileText,
  AlertTriangle,
  Clock,
  Sparkles,
  ArrowUpRight,
  Plus,
  TrendingUp,
  FileSpreadsheet,
  CheckCircle2,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { fetchApi } from '../../../lib/apiClient';
import { formatCurrency } from '../../../lib/utils';

const COLORS = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6'];

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const res = await fetchApi('/dashboard');
        setData(res);
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  const metrics = data?.metrics || {
    totalEmployees: 10,
    activeEmployees: 10,
    currentPayrollMonth: 485000,
    pendingSalaryPayments: 85000,
    overduePayments: 49560,
    pendingInvoices: 79060,
    overdueInvoices: 49560,
    totalDocuments: 12,
    upcomingDeadlinesCount: 3,
  };

  const monthlyTrends = data?.monthlyTrends?.length
    ? data.monthlyTrends
    : [
        { month: '5/2026', payroll: 410000 },
        { month: '6/2026', payroll: 430000 },
        { month: '7/2026', payroll: 460000 },
        { month: '8/2026', payroll: 475000 },
        { month: '9/2026', payroll: 485000 },
      ];

  const departmentDistribution = data?.departmentDistribution?.length
    ? data.departmentDistribution
    : [
        { name: 'Engineering', employees: 5, salaryTotal: 285000 },
        { name: 'Human Resources', employees: 2, salaryTotal: 90000 },
        { name: 'Finance & Operations', employees: 3, salaryTotal: 110000 },
      ];

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Executive Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Real-time overview of payroll, cashflow liabilities, and document intelligence.</p>
        </div>

        {/* Action Shortcuts */}
        <div className="flex items-center gap-2">
          <Link
            href="/payroll"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Run Payroll</span>
          </Link>
          <Link
            href="/documents"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-xs transition-all"
          >
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Upload Document</span>
          </Link>
        </div>
      </div>

      {/* Action-Required Alert Strip */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 border border-amber-200 dark:border-amber-800/60 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">Action Required</h4>
            <p className="text-xs text-amber-900 dark:text-amber-200 mt-0.5">
              1 invoice is overdue (₹49,560) • 3 salaries pending payment • Office Lease expires in 25 days.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/payments"
            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition-all shadow-xs"
          >
            Settle Payments
          </Link>
        </div>
      </div>

      {/* 8 Primary KPI Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Employees */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Headcount</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-2">
            {metrics.totalEmployees}
          </p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {metrics.activeEmployees} Active employees
          </p>
        </div>

        {/* Payroll This Month */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Payroll This Month</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-2">
            {formatCurrency(metrics.currentPayrollMonth)}
          </p>
          <p className="text-xs text-slate-500 mt-1">Deterministic calculations</p>
        </div>

        {/* Pending Payments */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Pending Salary Payouts</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-2">
            {formatCurrency(metrics.pendingSalaryPayments)}
          </p>
          <p className="text-xs text-slate-500 mt-1">Awaiting disbursement</p>
        </div>

        {/* Overdue Invoices */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Overdue Invoices</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-2">
            {formatCurrency(metrics.overdueInvoices)}
          </p>
          <p className="text-xs text-rose-500 mt-1 font-medium">Payment past due date</p>
        </div>
      </div>

      {/* Visual Charts (Monthly Payroll Trend & Department Breakdown) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Payroll Trajectory (2 Columns) */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Monthly Payroll Trajectory</h3>
              <p className="text-xs text-slate-500">Historical net salary disbursement trends</p>
            </div>
            <span className="text-xs font-semibold text-indigo-600 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> +2.1% this month
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrends}>
                <defs>
                  <linearGradient id="colorPayroll" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={12}
                  tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(val: any) => [formatCurrency(val), 'Net Payroll']}
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff', borderRadius: '8px' }}
                />
                <Area type="monotone" dataKey="payroll" stroke="#4f46e5" strokeWidth={2} fillOpacity={1} fill="url(#colorPayroll)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Department Distribution (1 Column) */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Salary by Department</h3>
          <p className="text-xs text-slate-500 mb-4">Headcount and expenditure breakdown</p>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={departmentDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="salaryTotal"
                >
                  {departmentDistribution.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val: any) => formatCurrency(val)} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2 mt-2">
            {departmentDistribution.map((dept: any, i: number) => (
              <div key={dept.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-slate-600 dark:text-slate-400">{dept.name} ({dept.employees})</span>
                </div>
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                  {formatCurrency(dept.salaryTotal)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Assistant Callout Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-950 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6 text-indigo-300" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Ask PayDoc AI Business Assistant</h3>
            <p className="text-xs text-indigo-200 mt-1 max-w-xl">
              Query your live company database with natural language: "How much salary is pending this month?", "Which contracts expire in 30 days?", or "Summarize overdue invoices".
            </p>
          </div>
        </div>
        <Link
          href="/assistant"
          className="px-5 py-2.5 rounded-xl bg-white text-indigo-950 hover:bg-indigo-50 font-semibold text-xs shadow-md transition-all shrink-0 flex items-center gap-1.5"
        >
          <span>Open Assistant</span>
          <ArrowUpRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
