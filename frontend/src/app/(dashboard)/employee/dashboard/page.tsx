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

export default function EmployeeDashboardPage() {
  const [downloading, setDownloading] = useState(false);

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-purple-950/60 via-slate-900 to-gray-900 p-5 rounded-2xl border border-purple-800/40">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 bg-purple-600/20 border border-purple-500/40 rounded-xl text-purple-400">
            <User className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-white">Welcome back, {employeeInfo.name}</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                EMPLOYEE PORTAL
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {employeeInfo.empCode} • {employeeInfo.designation} • {employeeInfo.department}
            </p>
          </div>
        </div>

        <div>
          <button
            onClick={handleDownloadPayslip}
            disabled={downloading}
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400">Net Take-Home Pay</span>
            <CreditCard className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-emerald-400">{formatCurrency(employeeInfo.netSalary)}</span>
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Direct NEFT to HDFC Bank ****4821</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400">Next Salary Pay Date</span>
            <Calendar className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-white">{employeeInfo.nextPayDate}</span>
          </div>
          <p className="text-[11px] text-indigo-400 mt-1">In 6 days</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400">Annual CTC Package</span>
            <TrendingUp className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-white">₹8,40,000</span>
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Full-Time Regular Employment</p>
        </div>
      </div>

      {/* Salary Breakdown & Documents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Earnings Structure */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-1">Monthly Salary Breakdown</h3>
          <p className="text-xs text-gray-400 mb-4">Deterministic computed salary components</p>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-950/60 border border-gray-800 text-xs">
              <span className="text-gray-300">Basic Salary</span>
              <span className="font-semibold text-white">{formatCurrency(employeeInfo.basicSalary)}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-950/60 border border-gray-800 text-xs">
              <span className="text-gray-300">House Rent Allowance (HRA)</span>
              <span className="font-semibold text-white">{formatCurrency(employeeInfo.hra)}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-950/60 border border-gray-800 text-xs">
              <span className="text-gray-300">Special & Medical Allowances</span>
              <span className="font-semibold text-white">{formatCurrency(employeeInfo.allowances)}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-950/60 border border-gray-800 text-xs text-red-300">
              <span className="text-gray-400">Statutory Deductions (Provident Fund & TDS)</span>
              <span className="font-semibold text-red-400">-{formatCurrency(employeeInfo.deductions)}</span>
            </div>

            <div className="pt-2 border-t border-gray-800 flex items-center justify-between text-sm font-bold">
              <span className="text-white">Total Net Take Home:</span>
              <span className="text-emerald-400">{formatCurrency(employeeInfo.netSalary)}</span>
            </div>
          </div>
        </div>

        {/* My Personal Documents */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-1">My Personal Documents</h3>
          <p className="text-xs text-gray-400 mb-4">Secure documents stored in Supabase private bucket</p>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-950/60 border border-gray-800">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded bg-purple-500/10 text-purple-400">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white">Employment Agreement & NDA</h4>
                  <p className="text-[11px] text-gray-400">Signed 15 Jan 2024 • PDF</p>
                </div>
              </div>
              <span className="text-[11px] font-medium text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/50">
                Verified
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-950/60 border border-gray-800">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded bg-indigo-500/10 text-indigo-400">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white">February 2026 Payslip</h4>
                  <p className="text-[11px] text-gray-400">Disbursed on 28 Feb 2026</p>
                </div>
              </div>
              <button
                onClick={handleDownloadPayslip}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
              >
                View
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-950/60 border border-gray-800">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded bg-blue-500/10 text-blue-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white">Form 16 Tax Certificate (FY 24-25)</h4>
                  <p className="text-[11px] text-gray-400">Annual Tax Statement</p>
                </div>
              </div>
              <span className="text-[11px] text-gray-400">Download</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
