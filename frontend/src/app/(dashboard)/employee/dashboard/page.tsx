'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  User,
  CreditCard,
  FileSpreadsheet,
  Download,
  Calendar,
  ShieldCheck,
  FileText,
  Clock,
  ArrowDownRight,
  TrendingUp,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useTheme } from '@/lib/themeProvider';

export default function EmployeeDashboardPage() {
  const [downloading, setDownloading] = useState(false);
  const { resolvedTheme } = useTheme();

  // Sample employee data (Aarav Sharma - Senior Software Engineer)
  const employeeInfo = {
    name: 'Aarav Sharma',
    empCode: 'EMP-001',
    designation: 'Senior Software Engineer',
    department: 'Engineering',
    joinedDate: '15 Jan 2024',
    netSalary: 64500,
    basicSalary: 45000,
    hra: 18000,
    allowances: 7500,
    deductions: 6000,
    status: 'Active',
    nextPayDate: '31 March 2026',
  };

  const handleDownloadPayslip = () => {
    setDownloading(true);
    setTimeout(() => {
      setDownloading(false);
      window.open('http://localhost:5000/api/payslips/00000000-0000-0000-0000-000000000001/pdf', '_blank');
    }, 800);
  };

  return (
    <div className="space-y-6">
      {/* Employee Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-purple-50 via-slate-50 to-white dark:from-purple-950/60 dark:via-slate-900 dark:to-gray-900 p-5 rounded-2xl border border-purple-200/80 dark:border-purple-800/40 shadow-xs">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 bg-purple-600/10 dark:bg-purple-600/20 border border-purple-200 dark:border-purple-500/40 rounded-xl text-purple-600 dark:text-purple-400">
            <User className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Welcome back, {employeeInfo.name}</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/40">
                EMPLOYEE PORTAL
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {employeeInfo.empCode} • {employeeInfo.designation} • {employeeInfo.department}
            </p>
          </div>
        </div>

        <div>
          <button
            onClick={handleDownloadPayslip}
            disabled={downloading}
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-600/20 transition-all cursor-pointer hover:scale-[1.02]"
          >
            {downloading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Download March 2026 Payslip (PDF)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Salary Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Net Take-Home Salary</span>
            <CreditCard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {formatCurrency(employeeInfo.netSalary)}
            </span>
          </div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">Direct Bank Transfer</p>
        </div>

        <div className="bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Basic & HRA Component</span>
            <FileSpreadsheet className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {formatCurrency(employeeInfo.basicSalary + employeeInfo.hra)}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">₹45k Basic + ₹18k HRA</p>
        </div>

        <div className="bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Statutory Deductions (PF/Tax)</span>
            <ArrowDownRight className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400">
              {formatCurrency(employeeInfo.deductions)}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">EPF + Professional Tax</p>
        </div>

        <div className="bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Next Disbursement Date</span>
            <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-xl font-bold font-mono text-slate-900 dark:text-white">{employeeInfo.nextPayDate}</span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Scheduled by Payroll Desk</p>
        </div>
      </div>
    </div>
  );
}
