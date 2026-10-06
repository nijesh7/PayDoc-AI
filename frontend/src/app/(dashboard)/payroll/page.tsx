'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileSpreadsheet,
  Plus,
  ArrowRight,
  CheckCircle,
  Clock,
  ShieldCheck,
  X,
  AlertCircle,
  FileDown,
  User,
  Calculator,
  Download,
  Search,
  CheckCircle2,
  Calendar,
  DollarSign,
  Layers,
} from 'lucide-react';
import { fetchApi } from '../../../lib/apiClient';
import { formatCurrency, formatDate, getStatusBadge } from '../../../lib/utils';

export default function PayrollPage() {
  const [activeTab, setActiveTab] = useState<'individual' | 'runs'>('individual');
  const [runs, setRuns] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Batch Run Modal State
  const [showNewRunModal, setShowNewRunModal] = useState(false);
  const [batchMonth, setBatchMonth] = useState(new Date().getMonth() + 1);
  const [batchYear, setBatchYear] = useState(new Date().getFullYear());
  const [creatingBatch, setCreatingBatch] = useState(false);

  // Individual Payslip Generator State
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [genMonth, setGenMonth] = useState<number>(new Date().getMonth() + 1);
  const [genYear, setGenYear] = useState<number>(new Date().getFullYear());
  const [overtimeHours, setOvertimeHours] = useState<number>(0);
  const [bonusAmount, setBonusAmount] = useState<number>(0);
  const [lopDays, setLopDays] = useState<number>(0);
  const [advancesAmount, setAdvancesAmount] = useState<number>(0);
  const [generating, setGenerating] = useState<boolean>(false);
  const [generatedSuccess, setGeneratedSuccess] = useState<any | null>(null);
  const [recentPayslips, setRecentPayslips] = useState<any[]>([]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [runsRes, empRes] = await Promise.all([
        fetchApi('/payroll/runs').catch(() => ({ payrollRuns: [] })),
        fetchApi('/employees').catch(() => ({ employees: [] })),
      ]);
      setRuns(runsRes.payrollRuns || []);
      const emps = empRes.employees || [];
      setEmployees(emps);
      if (emps.length > 0 && !selectedEmployeeId) {
        setSelectedEmployeeId(emps[0].id);
      }
    } catch (err) {
      console.error('Failed to load payroll data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId);

  // Calculate live preview math
  const baseSalary = Number(selectedEmployee?.base_salary) || 0;
  const hourlyRate = baseSalary / (30 * 8);
  const calcOvertime = Number(overtimeHours) * hourlyRate * 1.5;
  const calcBonus = Number(bonusAmount) || 0;
  const calcLop = (baseSalary / 30) * Number(lopDays);
  const basicEarned = Math.max(0, baseSalary - calcLop);
  const grossEarnings = basicEarned + calcOvertime + calcBonus;
  // Statutory calculations
  const calcPF = Math.min(basicEarned * 0.12, 1800); // 12% EPF
  const calcPT = grossEarnings >= 25000 ? 200 : 0; // ₹200 Professional Tax
  const totalDeductions = calcPF + calcPT + Number(advancesAmount);
  const estimatedNetSalary = Math.max(0, grossEarnings - totalDeductions);

  // Handle Generate Individual Payslip
  const handleGeneratePayslip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId) {
      alert('Please select an employee.');
      return;
    }

    setGenerating(true);
    setGeneratedSuccess(null);

    try {
      const res = await fetchApi('/payroll/generate-employee-payslip', {
        method: 'POST',
        body: JSON.stringify({
          employeeId: selectedEmployeeId,
          month: Number(genMonth),
          year: Number(genYear),
          overtimeHours: Number(overtimeHours),
          bonusAmount: Number(bonusAmount),
          advancesAmount: Number(advancesAmount),
          lopDays: Number(lopDays),
        }),
      });

      setGeneratedSuccess(res);

      // Add to recent payslips
      const newRecent = {
        id: res.payrollItemId,
        employeeName: `${selectedEmployee?.first_name} ${selectedEmployee?.last_name}`,
        employeeId: selectedEmployee?.employee_id,
        month: genMonth,
        year: genYear,
        netSalary: res.netSalary,
        createdAt: new Date().toISOString(),
      };
      setRecentPayslips((prev) => [newRecent, ...prev.filter((p) => p.id !== res.payrollItemId)]);

      // Auto-trigger PDF download
      downloadPayslipPDF(res.payrollItemId, selectedEmployee?.employee_id || 'EMP');
    } catch (err: any) {
      alert(err.message || 'Failed to generate payslip.');
    } finally {
      setGenerating(false);
    }
  };

  const downloadPayslipPDF = async (itemId: string, empCode: string) => {
    try {
      const blob = await fetchApi(`/payslips/${itemId}/pdf`);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Payslip_${empCode}_${genMonth}_${genYear}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err: any) {
      alert(`Error downloading payslip PDF: ${err.message}`);
    }
  };

  const handleCreateBatchRun = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingBatch(true);
    try {
      const res = await fetchApi('/payroll/runs', {
        method: 'POST',
        body: JSON.stringify({ month: Number(batchMonth), year: Number(batchYear) }),
      });
      setShowNewRunModal(false);
      window.location.href = `/payroll/${res.payrollRun.id}`;
    } catch (err: any) {
      alert(err.message || 'Failed to create payroll run');
    } finally {
      setCreatingBatch(false);
    }
  };

  const handleDownloadECR = async (e: React.MouseEvent, runId: string, runMonth: number, runYear: number) => {
    e.stopPropagation();
    try {
      const blob = await fetchApi(`/payroll/runs/${runId}/ecr`);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `EPFO_ECR_${runMonth}_${runYear}.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err: any) {
      alert(`Error downloading EPFO ECR: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Payroll & Payslips Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Generate individual employee payslips or execute organization-wide monthly batch runs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNewRunModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Monthly Batch</span>
          </button>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('individual')}
          className={`px-5 py-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'individual'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Individual Employee Payslip Generator</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
            Choose & Generate
          </span>
        </button>

        <button
          onClick={() => setActiveTab('runs')}
          className={`px-5 py-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'runs'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Company Batch Payroll Runs ({runs.length})</span>
        </button>
      </div>

      {/* TAB 1: Individual Employee Payslip Generator */}
      {activeTab === 'individual' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Form: Select Employee & Config */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Calculator className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span>Generate Employee Payslip</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Select an employee from your staff directory, choose the pay period, and generate an authentic PDF payslip with deterministic tax math.
              </p>
            </div>

            <form onSubmit={handleGeneratePayslip} className="space-y-4 text-xs">
              {/* Employee Selector */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-gray-300 mb-1.5">
                  Select Employee <span className="text-indigo-600">*</span>
                </label>
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name} ({emp.employee_id}) — {emp.designation || 'Staff'} [₹{Number(emp.base_salary).toLocaleString('en-IN')}/mo]
                    </option>
                  ))}
                </select>
              </div>

              {/* Pay Period: Month & Year */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-gray-300 mb-1.5">
                    Pay Month
                  </label>
                  <select
                    value={genMonth}
                    onChange={(e) => setGenMonth(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs outline-none"
                  >
                    {[
                      'January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'
                    ].map((m, idx) => (
                      <option key={idx} value={idx + 1}>
                        {m} ({idx + 1})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-gray-300 mb-1.5">
                    Pay Year
                  </label>
                  <select
                    value={genYear}
                    onChange={(e) => setGenYear(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs outline-none"
                  >
                    {[2024, 2025, 2026, 2027].map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Adjustments Section */}
              <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3">
                <h3 className="font-bold text-[11px] uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Optional Line-Item Adjustments
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Overtime (Hrs)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={overtimeHours}
                      onChange={(e) => setOvertimeHours(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Bonus (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={bonusAmount}
                      onChange={(e) => setBonusAmount(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Loss of Pay (Days)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="31"
                      value={lopDays}
                      onChange={(e) => setLopDays(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Advances (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={advancesAmount}
                      onChange={(e) => setAdvancesAmount(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={generating || !selectedEmployeeId}
                className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {generating ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Generate & Download Official PDF Payslip</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Right Box: Live Salary Calculation Breakdown Preview */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Live Salary Computation
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Period: {genMonth}/{genYear} • Standard 30-Day Base
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                  DETERMINISTIC
                </span>
              </div>

              {selectedEmployee ? (
                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-1">
                    <p className="font-bold text-slate-900 dark:text-white">
                      {selectedEmployee.first_name} {selectedEmployee.last_name}
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono">
                      ID: {selectedEmployee.employee_id} • {selectedEmployee.designation || 'Staff'}
                    </p>
                  </div>

                  {/* Earnings Table */}
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Earnings</div>
                    <div className="flex justify-between text-slate-600 dark:text-slate-300">
                      <span>Base Salary:</span>
                      <span className="font-mono font-semibold">{formatCurrency(baseSalary)}</span>
                    </div>
                    {calcLop > 0 && (
                      <div className="flex justify-between text-rose-600 dark:text-rose-400">
                        <span>Loss of Pay ({lopDays} days):</span>
                        <span className="font-mono font-semibold">-{formatCurrency(calcLop)}</span>
                      </div>
                    )}
                    {calcOvertime > 0 && (
                      <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                        <span>Overtime ({overtimeHours} hrs):</span>
                        <span className="font-mono font-semibold">+{formatCurrency(calcOvertime)}</span>
                      </div>
                    )}
                    {calcBonus > 0 && (
                      <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                        <span>Bonus:</span>
                        <span className="font-mono font-semibold">+{formatCurrency(calcBonus)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold text-slate-900 dark:text-white pt-1 border-t border-slate-100 dark:border-slate-800">
                      <span>Gross Earnings:</span>
                      <span className="font-mono">{formatCurrency(grossEarnings)}</span>
                    </div>
                  </div>

                  {/* Deductions Table */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Statutory Deductions</div>
                    <div className="flex justify-between text-slate-600 dark:text-slate-300">
                      <span>EPF (12% of basic):</span>
                      <span className="font-mono font-semibold text-rose-600 dark:text-rose-400">
                        -{formatCurrency(calcPF)}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600 dark:text-slate-300">
                      <span>Professional Tax (PT):</span>
                      <span className="font-mono font-semibold text-rose-600 dark:text-rose-400">
                        -{formatCurrency(calcPT)}
                      </span>
                    </div>
                    {advancesAmount > 0 && (
                      <div className="flex justify-between text-slate-600 dark:text-slate-300">
                        <span>Advance Recovery:</span>
                        <span className="font-mono font-semibold text-rose-600 dark:text-rose-400">
                          -{formatCurrency(advancesAmount)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Highlighted Net Take-Home Salary */}
                  <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 flex items-center justify-between mt-2">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 dark:text-emerald-400 block">
                        Net Take-Home Salary
                      </span>
                      <span className="text-xl font-extrabold font-mono text-emerald-700 dark:text-emerald-300">
                        {formatCurrency(estimatedNetSalary)}
                      </span>
                    </div>
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">
                  Select an employee to view calculation breakdown.
                </div>
              )}
            </div>

            {/* Recently Generated Payslips in this session */}
            {recentPayslips.length > 0 && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-2">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Recently Generated Payslips
                </h4>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {recentPayslips.map((p) => (
                    <div key={p.id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{p.employeeName}</p>
                        <p className="text-[11px] text-slate-500 font-mono">
                          Period: {p.month}/{p.year} • Net: {formatCurrency(p.netSalary)}
                        </p>
                      </div>
                      <button
                        onClick={() => downloadPayslipPDF(p.id, p.employeeId)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-semibold hover:bg-indigo-100 cursor-pointer"
                      >
                        <Download className="w-3 h-3" />
                        <span>PDF</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Company Batch Payroll Runs Table */}
      {activeTab === 'runs' && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500">
                <tr>
                  <th className="py-3 px-4 font-semibold">Pay Period</th>
                  <th className="py-3 px-4 font-semibold">Employees Included</th>
                  <th className="py-3 px-4 font-semibold">Total Basic</th>
                  <th className="py-3 px-4 font-semibold">Total Net Payout</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">Loading payroll runs...</td>
                  </tr>
                ) : runs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No payroll runs created yet. Use the "New Monthly Batch" button to begin.
                    </td>
                  </tr>
                ) : (
                  runs.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => (window.location.href = `/payroll/${r.id}`)}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                        {r.month}/{r.year}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-300">
                        {r.total_employees} staff
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-300">
                        {formatCurrency(r.total_basic_salary)}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                        {formatCurrency(r.total_net_salary)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border capitalize ${getStatusBadge(r.status)}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => handleDownloadECR(e, r.id, r.month, r.year)}
                            title="Download EPFO ECR Electronic Return File"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[11px] font-medium text-slate-700 dark:text-slate-300 transition-colors"
                          >
                            <FileDown className="w-3.5 h-3.5 text-indigo-600" />
                            <span>ECR</span>
                          </button>
                          <Link
                            href={`/payroll/${r.id}`}
                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1"
                          >
                            <span>Details</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New Batch Run Modal */}
      {showNewRunModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Create Monthly Payroll Batch</h3>
              <button onClick={() => setShowNewRunModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateBatchRun} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Pay Period Month</label>
                <select
                  value={batchMonth}
                  onChange={(e) => setBatchMonth(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-hidden text-slate-900 dark:text-slate-100"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                    <option key={m} value={m}>
                      Month {m}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Pay Period Year</label>
                <input
                  type="number"
                  value={batchYear}
                  onChange={(e) => setBatchYear(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-hidden text-slate-900 dark:text-slate-100 font-mono"
                />
              </div>
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewRunModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingBatch}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50"
                >
                  {creatingBatch ? 'Computing...' : 'Generate Batch Run'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
