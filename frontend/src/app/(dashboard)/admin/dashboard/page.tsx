'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Users,
  CreditCard,
  Receipt,
  FileText,
  AlertTriangle,
  Clock,
  Sparkles,
  ArrowUpRight,
  Plus,
  UserCheck,
  TrendingUp,
  FileSpreadsheet,
  CheckCircle2,
  ExternalLink,
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
import { fetchApi } from '@/lib/apiClient';
import { formatCurrency } from '@/lib/utils';
import { useTheme } from '@/lib/themeProvider';

const COLORS = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6'];

export default function AdminDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [dashRes, usersRes] = await Promise.all([
          fetchApi('/dashboard'),
          fetchApi('/users').catch(() => ({ users: [] })),
        ]);
        setData(dashRes);
        const pend = (usersRes?.users || []).filter((u: any) => u.status === 'pending' || u.is_active === false);
        setPendingUsers(pend);
      } catch (err) {
        console.error('Failed to load admin dashboard:', err);
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
    pendingInvoices: 2,
    overdueInvoices: 1,
    totalDocuments: 24,
    upcomingDeadlines: 3,
  };

  const trendData = data?.payrollTrend || [
    { month: 'Oct 25', payroll: 410000, invoices: 220000 },
    { month: 'Nov 25', payroll: 425000, invoices: 310000 },
    { month: 'Dec 25', payroll: 440000, invoices: 290000 },
    { month: 'Jan 26', payroll: 460000, invoices: 380000 },
    { month: 'Feb 26', payroll: 475000, invoices: 420000 },
    { month: 'Mar 26', payroll: 485000, invoices: 495000 },
  ];

  const deptData = data?.departmentBreakdown || [
    { name: 'Engineering', value: 260000 },
    { name: 'Sales & Marketing', value: 135000 },
    { name: 'Operations & HR', value: 90000 },
  ];

  return (
    <div className="space-y-6">
      {/* Role Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-indigo-50 via-slate-50 to-white dark:from-indigo-950/60 dark:via-slate-900 dark:to-gray-900 p-5 rounded-2xl border border-indigo-200/80 dark:border-indigo-800/40 shadow-xs">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 bg-indigo-600/10 dark:bg-indigo-600/20 border border-indigo-200 dark:border-indigo-500/40 rounded-xl text-indigo-600 dark:text-indigo-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Admin / Executive Dashboard</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/40">
                FULL ACCESS
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Cognivex Technologies Pvt Ltd • Organization Overview, User Controls & Financial Health
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <Link
            href="/admin/users"
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-white text-xs font-semibold border border-slate-200 dark:border-slate-700 shadow-2xs transition-colors cursor-pointer"
          >
            <UserCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Manage Users</span>
          </Link>
          <Link
            href="/payroll"
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all cursor-pointer hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            <span>Approve Payroll</span>
          </Link>
        </div>
      </div>

      {/* Pending User Access Requests Alert Banner */}
      {pendingUsers.length > 0 && (
        <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-amber-50/50 dark:from-indigo-950/60 dark:via-purple-950/40 dark:to-slate-900 border border-indigo-300 dark:border-indigo-700/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md animate-fadeIn">
          <div className="flex items-center space-x-3.5">
            <div className="p-2.5 bg-indigo-600/15 dark:bg-indigo-600/30 rounded-xl text-indigo-700 dark:text-indigo-300 shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {pendingUsers.length} Pending User Access Request{pendingUsers.length > 1 ? 's' : ''}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  APPROVAL NEEDED
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                {pendingUsers.map((u: any) => `${u.full_name} (${u.role})`).join(', ')} registered with your organization code and are awaiting Admin approval.
              </p>
            </div>
          </div>
          <Link
            href="/admin/users"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 transition-all shrink-0 text-center hover:scale-105"
          >
            Review & Approve Users
          </Link>
        </div>
      )}

      {/* Action Required Alert Banner */}
      {(metrics.overduePayments > 0 || metrics.overdueInvoices > 0) && (
        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-500/15 rounded-xl text-amber-600 dark:text-amber-400 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Action Required: Pending Approvals & Overdue Items</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                You have {metrics.overdueInvoices} overdue invoice and {formatCurrency(metrics.pendingSalaryPayments)} in pending salary disbursements.
              </p>
            </div>
          </div>
          <Link
            href="/payments"
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors shrink-0"
          >
            Review Payments
          </Link>
        </div>
      )}

      {/* Top 4 Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Workforce</span>
            <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">{metrics.totalEmployees}</span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">100% active</span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Across 3 departments</p>
        </div>

        <div className="bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Monthly Payroll Run</span>
            <CreditCard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">{formatCurrency(metrics.currentPayrollMonth)}</span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Computed deterministically</p>
        </div>

        <div className="bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Overdue Payments</span>
            <Receipt className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400">
              {formatCurrency(metrics.overduePayments)}
            </span>
          </div>
          <p className="text-[11px] text-rose-500 dark:text-rose-400/80 mt-1">{metrics.overdueInvoices} overdue invoice</p>
        </div>

        <div className="bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">AI Document Vault</span>
            <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">{metrics.totalDocuments}</span>
            <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">Indexed</span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Contracts, Invoices, Payslips</p>
        </div>
      </div>

      {/* Analytics & Department Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Area Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Payroll & Expense Trajectory</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Last 6 months comparison</p>
            </div>
            <div className="flex items-center space-x-4 text-xs">
              <div className="flex items-center space-x-1.5">
                <div className="w-3 h-3 bg-indigo-500 rounded-sm" />
                <span className="text-slate-600 dark:text-slate-400">Payroll</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <div className="w-3 h-3 bg-cyan-400 rounded-sm" />
                <span className="text-slate-600 dark:text-slate-400">Invoices</span>
              </div>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="payrollGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="invoicesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#f1f5f9'} />
                <XAxis dataKey="month" stroke={isDark ? '#64748b' : '#94a3b8'} fontSize={11} />
                <YAxis
                  stroke={isDark ? '#64748b' : '#94a3b8'}
                  fontSize={11}
                  tickFormatter={(val) => `₹${val / 1000}k`}
                />
                <Tooltip
                  formatter={(value: any) => formatCurrency(Number(value))}
                  contentStyle={{
                    backgroundColor: isDark ? '#0f172a' : '#ffffff',
                    borderColor: isDark ? '#334155' : '#e2e8f0',
                    color: isDark ? '#ffffff' : '#0f172a',
                    borderRadius: '12px',
                  }}
                />
                <Area type="monotone" dataKey="payroll" stroke="#4f46e5" strokeWidth={2} fill="url(#payrollGrad)" />
                <Area type="monotone" dataKey="invoices" stroke="#06b6d4" strokeWidth={2} fill="url(#invoicesGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Department Pie Chart */}
        <div className="bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Department Spend</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Monthly allocation by department</p>

            <div className="h-48 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={deptData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {deptData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => formatCurrency(Number(value))}
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

          <div className="space-y-1.5 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            {deptData.map((dept: any, index: number) => (
              <div key={dept.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-slate-600 dark:text-slate-400">{dept.name}</span>
                </div>
                <span className="font-mono font-medium text-slate-900 dark:text-white">{formatCurrency(dept.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
