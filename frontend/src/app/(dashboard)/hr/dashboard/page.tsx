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
} from 'lucide-react';
import { fetchApi } from '@/lib/apiClient';
import { formatCurrency } from '@/lib/utils';

export default function HRDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-950/60 via-slate-900 to-gray-900 p-5 rounded-2xl border border-blue-800/40">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 bg-blue-600/20 border border-blue-500/40 rounded-xl text-blue-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-white">HR & People Operations Dashboard</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                HR WORKSPACE
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Employee Directory, Document Verification & Payroll Preparation
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <Link
            href="/employees"
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-xs font-semibold border border-gray-700 transition-colors"
          >
            <Users className="w-4 h-4 text-blue-400" />
            <span>Staff Directory</span>
          </Link>
          <Link
            href="/payroll"
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Prepare Payroll</span>
          </Link>
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400">Total Headcount</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-white">{metrics.totalEmployees}</span>
            <span className="text-xs text-emerald-400 font-medium">All active</span>
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Full-time, contract & daily wage</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400">Payroll Cycle Prepped</span>
            <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-white">{formatCurrency(metrics.currentPayrollMonth)}</span>
          </div>
          <p className="text-[11px] text-gray-500 mt-1">March 2026 calculation ready</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400">Employee Documents</span>
            <FileText className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-white">{metrics.totalDocuments}</span>
            <span className="text-xs text-purple-400 font-medium">Verified</span>
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Offer letters, KYC & payslips</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400">Contract Renewals Due</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-white">{metrics.upcomingDeadlines}</span>
            <span className="text-xs text-amber-400 font-medium">Next 30 days</span>
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Automated reminders active</p>
        </div>
      </div>

      {/* HR Upcoming Action Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-1">Upcoming HR Actions & Milestones</h3>
          <p className="text-xs text-gray-400 mb-4">Contracts, probations and document renewal tracking</p>
          <div className="space-y-3">
            {upcomingReviews.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-950/60 border border-gray-800"
              >
                <div>
                  <h4 className="text-xs font-semibold text-white">{item.name}</h4>
                  <p className="text-[11px] text-gray-400">{item.department} • {item.event}</p>
                </div>
                <span className="text-[11px] font-medium text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/50">
                  {item.date}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-1">Quick HR Shortcuts</h3>
          <p className="text-xs text-gray-400 mb-4">Common workforce management workflows</p>
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/employees"
              className="p-3.5 rounded-xl bg-gray-950 border border-gray-800 hover:border-blue-500/50 text-left transition-all group"
            >
              <Users className="w-5 h-5 text-blue-400 mb-2 group-hover:scale-110 transition-transform" />
              <h4 className="text-xs font-semibold text-white">Add New Employee</h4>
              <p className="text-[10px] text-gray-400 mt-0.5">Configure salary & designation</p>
            </Link>

            <Link
              href="/payroll"
              className="p-3.5 rounded-xl bg-gray-950 border border-gray-800 hover:border-indigo-500/50 text-left transition-all group"
            >
              <FileSpreadsheet className="w-5 h-5 text-indigo-400 mb-2 group-hover:scale-110 transition-transform" />
              <h4 className="text-xs font-semibold text-white">Review Payroll</h4>
              <p className="text-[10px] text-gray-400 mt-0.5">Adjust overtime & bonus</p>
            </Link>

            <Link
              href="/documents"
              className="p-3.5 rounded-xl bg-gray-950 border border-gray-800 hover:border-purple-500/50 text-left transition-all group"
            >
              <FileText className="w-5 h-5 text-purple-400 mb-2 group-hover:scale-110 transition-transform" />
              <h4 className="text-xs font-semibold text-white">Upload Contracts</h4>
              <p className="text-[10px] text-gray-400 mt-0.5">AI metadata extraction</p>
            </Link>

            <Link
              href="/reports"
              className="p-3.5 rounded-xl bg-gray-950 border border-gray-800 hover:border-emerald-500/50 text-left transition-all group"
            >
              <Building2 className="w-5 h-5 text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
              <h4 className="text-xs font-semibold text-white">Department Headcount</h4>
              <p className="text-[10px] text-gray-400 mt-0.5">Generate staffing report</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
