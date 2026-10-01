'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Download,
  FileSpreadsheet,
  TrendingUp,
  CreditCard,
  Receipt,
  FileText,
  Calendar,
} from 'lucide-react';
import {
  BarChart,
  Bar,
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
import { useTheme } from '@/lib/themeProvider';

const COLORS = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6'];

export default function ReportsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  useEffect(() => {
    async function loadReports() {
      try {
        const res = await fetchApi('/analytics/overview');
        setData(res);
      } catch (err) {
        console.error('Failed to load reports:', err);
      } finally {
        setLoading(false);
      }
    }
    loadReports();
  }, []);

  const downloadCSV = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'Month,Basic Salary,Allowances,Overtime,Net Payroll\n' +
      (data?.monthlyTrends || [])
        .map((r: any) => `${r.month},${r.basic || 0},${r.allowances || 0},${r.overtime || 0},${r.payroll || 0}`)
        .join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'PayDoc_Monthly_Payroll_Report.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const monthlyTrends = data?.monthlyTrends || [
    { month: '5/2026', basic: 320000, allowances: 80000, overtime: 10000, payroll: 410000 },
    { month: '6/2026', basic: 340000, allowances: 80000, overtime: 10000, payroll: 430000 },
    { month: '7/2026', basic: 360000, allowances: 85000, overtime: 15000, payroll: 460000 },
    { month: '8/2026', basic: 370000, allowances: 90000, overtime: 15000, payroll: 475000 },
    { month: '9/2026', basic: 380000, allowances: 90000, overtime: 15000, payroll: 485000 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Reports & Business Intelligence</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Historical payroll analysis, departmental expenditure allocations, and CSV export feeds.
          </p>
        </div>

        <button
          onClick={downloadCSV}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all self-start sm:self-auto cursor-pointer hover:scale-[1.02]"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV Report</span>
        </button>
      </div>

      {/* Monthly Expense Breakdown Chart */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Monthly Payroll Expense Breakdown</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Categorized by Basic Salary, Allowances & Overtime</p>
          </div>
          <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-lg border border-indigo-100 dark:border-indigo-800/60">
            Current Cycle: {formatCurrency(data?.metrics?.currentPayrollMonth || 485000)}
          </span>
        </div>

        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#f1f5f9'} />
              <XAxis dataKey="month" stroke={isDark ? '#64748b' : '#94a3b8'} fontSize={12} />
              <YAxis stroke={isDark ? '#64748b' : '#94a3b8'} fontSize={12} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(val: any) => formatCurrency(val)}
                contentStyle={{
                  backgroundColor: isDark ? '#0f172a' : '#ffffff',
                  borderColor: isDark ? '#334155' : '#e2e8f0',
                  color: isDark ? '#ffffff' : '#0f172a',
                  borderRadius: '12px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                }}
              />
              <Bar dataKey="basic" name="Basic Salary" stackId="a" fill="#4f46e5" radius={[0, 0, 0, 0]} />
              <Bar dataKey="allowances" name="Allowances" stackId="a" fill="#06b6d4" />
              <Bar dataKey="overtime" name="Overtime" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary Tables Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Department Headcount & Cost Share</h3>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {(data?.departmentDistribution || [
              { name: 'Engineering', employees: 5, salaryTotal: 285000 },
              { name: 'Human Resources', employees: 2, salaryTotal: 90000 },
              { name: 'Finance & Operations', employees: 3, salaryTotal: 110000 },
            ]).map((d: any) => (
              <div key={d.name} className="py-2.5 flex justify-between items-center">
                <span className="font-medium text-slate-800 dark:text-slate-200">{d.name} ({d.employees} staff)</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-white">{formatCurrency(d.salaryTotal)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Financial Position Summary</h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">Monthly Net Payroll:</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">{formatCurrency(data?.metrics?.currentPayrollMonth || 485000)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">Pending Salary Disbursements:</span>
              <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{formatCurrency(data?.metrics?.pendingSalaryPayments || 85000)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">Overdue Vendor Invoices:</span>
              <span className="font-mono font-bold text-rose-600 dark:text-rose-400">{formatCurrency(data?.metrics?.overdueInvoices || 49560)}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-500 dark:text-slate-400">Total Business Documents:</span>
              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{data?.metrics?.totalDocuments || 12} documents</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
