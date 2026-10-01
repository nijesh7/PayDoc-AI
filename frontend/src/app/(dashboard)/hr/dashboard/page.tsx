'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  FileSpreadsheet,
  FileText,
  Clock,
  UserPlus,
  AlertTriangle,
  Calendar,
  Sparkles,
  CheckCircle2,
  Building2,
  ArrowRight,
} from 'lucide-react';
import { fetchApi } from '@/lib/apiClient';
import { formatCurrency } from '@/lib/utils';
import { useTheme } from '@/lib/themeProvider';

export default function HRDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    async function loadHRData() {
      try {
        const res = await fetchApi('/dashboard');
        setData(res);
      } catch (err) {
        console.error('Failed to load HR dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    loadHRData();
  }, []);

  const metrics = data?.metrics || {
    totalEmployees: 10,
    activeEmployees: 10,
    currentPayrollMonth: 485000,
    totalDocuments: 24,
    upcomingDeadlines: 3,
  };

  const upcomingReviews = [
    { name: 'Kavita Iyer', department: 'Engineering', event: 'Contract Renewal Due', date: 'In 14 days' },
    { name: 'Aarav Sharma', department: 'Engineering', event: 'Probation Review', date: 'In 21 days' },
    { name: 'Rohan Verma', department: 'Operations & HR', event: 'Annual Appraisal', date: 'In 30 days' },
  ];

  return (
    <div className="space-y-6">
      {/* HR Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-50 via-slate-50 to-white dark:from-blue-950/60 dark:via-slate-900 dark:to-gray-900 p-5 rounded-2xl border border-blue-200/80 dark:border-blue-800/40 shadow-xs">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 bg-blue-600/10 dark:bg-blue-600/20 border border-blue-200 dark:border-blue-500/40 rounded-xl text-blue-600 dark:text-blue-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">HR & People Operations Dashboard</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/40">
                HR WORKSPACE
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Employee Directory, Document Verification & Payroll Preparation
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <Link
            href="/employees"
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-white text-xs font-semibold border border-slate-200 dark:border-slate-700 shadow-2xs transition-colors"
          >
            <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Staff Directory</span>
          </Link>
          <Link
            href="/payroll"
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/20 transition-all hover:scale-[1.02]"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Prepare Payroll</span>
          </Link>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Staff</span>
            <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">{metrics.totalEmployees}</span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">10 Active</span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">100% on active roster</p>
        </div>

        <div className="bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Payroll Requirement</span>
            <FileSpreadsheet className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {formatCurrency(metrics.currentPayrollMonth)}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Pre-calculated net salary</p>
        </div>

        <div className="bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">HR Documents</span>
            <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">{metrics.totalDocuments}</span>
            <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">Verified</span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Contracts & IDs indexed</p>
        </div>

        <div className="bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Pending Reviews</span>
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">3</span>
            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">Deadlines</span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Renewals in next 30 days</p>
        </div>
      </div>

      {/* Two Column Layout: Upcoming HR Actions & Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Reviews */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Upcoming Employee Deadlines & Actions</h2>
          <div className="space-y-2.5">
            {upcomingReviews.map((review, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-xl"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
                    {review.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-slate-900 dark:text-white">{review.name}</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{review.department}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                    {review.event}
                  </span>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{review.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* HR Operations Shortcuts */}
        <div className="bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Quick HR Workflows</h2>
          <div className="space-y-2">
            <Link
              href="/employees"
              className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-indigo-50/70 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 transition-colors text-xs text-slate-700 dark:text-slate-300 group"
            >
              <span className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Add New Employee</span>
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-colors" />
            </Link>

            <Link
              href="/documents"
              className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-indigo-50/70 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 transition-colors text-xs text-slate-700 dark:text-slate-300 group"
            >
              <span className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>Upload HR Documents</span>
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-600 transition-colors" />
            </Link>

            <Link
              href="/payroll"
              className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-indigo-50/70 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 transition-colors text-xs text-slate-700 dark:text-slate-300 group"
            >
              <span className="flex items-center space-x-2">
                <FileSpreadsheet className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Prepare Monthly Payroll</span>
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
