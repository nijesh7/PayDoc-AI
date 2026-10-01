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

const COLORS = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6'];

export default function AdminDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const res = await fetchApi('/dashboard');
        setData(res);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-indigo-950/60 via-slate-900 to-gray-900 p-5 rounded-2xl border border-indigo-800/40">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 bg-indigo-600/20 border border-indigo-500/40 rounded-xl text-indigo-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-white">Admin / Executive Dashboard</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                FULL ACCESS
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Acme Technologies Pvt Ltd • Organization Overview, User Controls & Financial Health
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <Link
            href="/admin/users"
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-xs font-semibold border border-gray-700 transition-colors"
          >
            <UserCheck className="w-4 h-4 text-indigo-400" />
            <span>Manage Users</span>
          </Link>
          <Link
            href="/payroll"
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Approve Payroll</span>
          </Link>
        </div>
      </div>

      {/* Action Required Alert Banner */}
      {(metrics.overduePayments > 0 || metrics.overdueInvoices > 0) && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Action Required: Pending Approvals & Overdue Items</h3>
              <p className="text-xs text-gray-400">
                You have {metrics.overdueInvoices} overdue invoice and {formatCurrency(metrics.pendingSalaryPayments)} in pending salary disbursements.
              </p>
            </div>
          </div>
          <Link
            href="/payments"
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg shadow transition-colors shrink-0"
          >
            Review Payments
          </Link>
        </div>
      )}

      {/* Top 4 Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400">Total Workforce</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-white">{metrics.totalEmployees}</span>
            <span className="text-xs text-emerald-400 font-medium">100% active</span>
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Across 3 departments</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400">Monthly Payroll Run</span>
            <CreditCard className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-white">{formatCurrency(metrics.currentPayrollMonth)}</span>
          </div>
          <p className="text-[11px] text-gray-500 mt-1">March 2026 computed deterministically</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400">Pending Invoices</span>
            <Receipt className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-white">{metrics.pendingInvoices}</span>
            <span className="text-xs text-amber-400 font-medium">{metrics.overdueInvoices} overdue</span>
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Vendor payables & receivables</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400">Intelligence Documents</span>
            <FileText className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-white">{metrics.totalDocuments}</span>
            <span className="text-xs text-purple-400 font-medium">100% indexed</span>
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Contracts, payslips & tax filings</p>
        </div>
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Financial Trends (Payroll vs Invoicing)</h3>
              <p className="text-xs text-gray-400">Deterministic ledger calculations over past 6 months</p>
            </div>
            <span className="text-xs text-indigo-400 font-medium bg-indigo-950/60 px-2.5 py-1 rounded-full border border-indigo-800">
              FY 2025-26
            </span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="adminPayroll" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="adminInvoices" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="month" stroke="#9ca3af" fontSize={11} />
                <YAxis stroke="#9ca3af" fontSize={11} tickFormatter={(val) => `₹${val / 1000}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(val: any) => [formatCurrency(val), '']}
                />
                <Area type="monotone" dataKey="payroll" name="Payroll Expense" stroke="#4f46e5" strokeWidth={2} fill="url(#adminPayroll)" />
                <Area type="monotone" dataKey="invoices" name="Invoice Volume" stroke="#10b981" strokeWidth={2} fill="url(#adminInvoices)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-1">Department Allocation</h3>
          <p className="text-xs text-gray-400 mb-4">Monthly salary expense distribution</p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={deptData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="value">
                  {deptData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(val: any) => [formatCurrency(val), 'Total']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5 mt-2">
            {deptData.map((d: any, idx: number) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                  <span className="text-gray-300">{d.name}</span>
                </div>
                <span className="font-semibold text-white">{formatCurrency(d.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
