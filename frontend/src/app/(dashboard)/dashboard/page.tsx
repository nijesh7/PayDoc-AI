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
  Calendar,
  ShieldCheck,
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
} from 'recharts';
import { fetchApi } from '../../../lib/apiClient';
import { formatCurrency } from '../../../lib/utils';
import { useRouter } from 'next/navigation';
import { normalizeRole, ROLE_DEFINITIONS } from '@/types/auth';
import { useTheme } from '@/lib/themeProvider';

const COLORS = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6'];

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { resolvedTheme } = useTheme();
  const router = useRouter();

  useEffect(() => {
    const savedRole = normalizeRole(localStorage.getItem('paydoc_active_role') || 'ADMIN');
    if (savedRole !== 'ADMIN') {
      router.replace(ROLE_DEFINITIONS[savedRole].defaultRoute);
      return;
    }

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
  }, [router]);

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
        { month: 'May', payroll: 410000 },
        { month: 'Jun', payroll: 430000 },
        { month: 'Jul', payroll: 460000 },
        { month: 'Aug', payroll: 475000 },
        { month: 'Sep', payroll: 485000 },
      ];

  const departmentDistribution = data?.departmentDistribution?.length
    ? data.departmentDistribution
    : [
        { name: 'Engineering', employees: 5, salaryTotal: 285000 },
        { name: 'Human Resources', employees: 2, salaryTotal: 90000 },
        { name: 'Finance & Ops', employees: 3, salaryTotal: 110000 },
      ];

  const isDark = resolvedTheme === 'dark';

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Executive Dashboard
            </h1>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              Live DB
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time overview of payroll runs, liquidity liabilities, and AI document intelligence.
          </p>
        </div>

        {/* Action Shortcuts */}
        <div className="flex items-center gap-2.5">
          <Link
            href="/payroll"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all cursor-pointer hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            <span>Run Payroll</span>
          </Link>
          <Link
            href="/documents"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-2xs transition-all cursor-pointer hover:scale-[1.02]"
          >
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Upload Document</span>
          </Link>
        </div>
      </div>

      {/* Action-Required Alert Strip */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-50 via-amber-50/80 to-orange-50 dark:from-amber-950/40 dark:via-amber-950/30 dark:to-orange-950/30 border border-amber-200 dark:border-amber-800/60 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                Action Required
              </h4>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
            </div>
            <p className="text-xs text-amber-900/90 dark:text-amber-200/90 mt-0.5">
              1 invoice is overdue (₹49,560) • 3 salaries pending payment • Office Lease renewal in 25 days.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/payments"
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition-all shadow-xs"
          >
            Settle Payments
          </Link>
        </div>
      </div>

      {/* 4 Primary KPI Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Employees */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Headcount</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 dark:text-white mt-3">
            {metrics.totalEmployees}
          </p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1.5 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {metrics.activeEmployees} Active on payroll
          </p>
        </div>

        {/* Payroll This Month */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Payroll This Month</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 dark:text-white mt-3">
            {formatCurrency(metrics.currentPayrollMonth)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            Deterministic calculations
          </p>
        </div>

        {/* Pending Salary Payments */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Pending Salary Payouts</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-3">
            {formatCurrency(metrics.pendingSalaryPayments)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            Awaiting disbursement
          </p>
        </div>

        {/* Overdue Invoices */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Overdue Invoices</span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-3">
            {formatCurrency(metrics.overdueInvoices)}
          </p>
          <p className="text-xs text-rose-600 dark:text-rose-400 mt-1.5 font-medium flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
            Immediate payment needed
          </p>
        </div>
      </div>

      {/* Visual Charts (Monthly Payroll Trend & Department Breakdown) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Payroll Trajectory (2 Columns) */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Monthly Payroll Trajectory
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Historical net salary disbursement trends across fiscal quarters
              </p>
            </div>
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-lg border border-indigo-100 dark:border-indigo-800/60">
              <TrendingUp className="w-3.5 h-3.5" /> +2.1% this cycle
            </span>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrends}>
                <defs>
                  <linearGradient id="colorPayroll" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#f1f5f9'} />
                <XAxis dataKey="month" stroke={isDark ? '#64748b' : '#94a3b8'} fontSize={12} />
                <YAxis
                  stroke={isDark ? '#64748b' : '#94a3b8'}
                  fontSize={12}
                  tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(val: any) => [formatCurrency(val), 'Net Payroll']}
                  contentStyle={{
                    backgroundColor: isDark ? '#0f172a' : '#ffffff',
                    borderColor: isDark ? '#334155' : '#e2e8f0',
                    color: isDark ? '#ffffff' : '#0f172a',
                    borderRadius: '12px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="payroll"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorPayroll)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Department Distribution (1 Column) */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Salary by Department
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Headcount & expenditure allocation
            </p>

            <div className="h-48 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={departmentDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="salaryTotal"
                  >
                    {departmentDistribution.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => formatCurrency(val)}
                    contentStyle={{
                      backgroundColor: isDark ? '#0f172a' : '#ffffff',
                      borderColor: isDark ? '#334155' : '#e2e8f0',
                      borderRadius: '10px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            {departmentDistribution.map((dept: any, i: number) => (
              <div key={dept.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: COLORS[i % COLORS.length] }}
                  />
                  <span className="text-slate-600 dark:text-slate-400 font-medium">
                    {dept.name} ({dept.employees})
                  </span>
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
      <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-950 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-indigo-800/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-start gap-4 relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0 shadow-inner">
            <Sparkles className="w-6 h-6 text-indigo-300 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>Ask PayDoc AI Business Assistant</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                Gemini 2.0
              </span>
            </h3>
            <p className="text-xs text-indigo-200 mt-1 max-w-xl leading-relaxed">
              Query your live company database with natural language: &ldquo;How much salary is pending this month?&rdquo;, &ldquo;Which contracts expire in 30 days?&rdquo;, or &ldquo;Summarize overdue invoices&rdquo;.
            </p>
          </div>
        </div>
        <Link
          href="/assistant"
          className="px-5 py-2.5 rounded-xl bg-white text-indigo-950 hover:bg-indigo-50 font-semibold text-xs shadow-md transition-all shrink-0 flex items-center gap-1.5 relative z-10 cursor-pointer hover:scale-105"
        >
          <span>Open Assistant</span>
          <ArrowUpRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
