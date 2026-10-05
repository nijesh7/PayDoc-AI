'use client';

import React, { useState, useEffect } from 'react';
import {
  CalendarDays,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  Filter,
  Download,
  Upload,
  Calendar,
  UserCheck,
  UserX,
  Sparkles,
  Search,
  Building,
  DollarSign,
  ChevronRight,
  TrendingDown,
  Info,
  X,
} from 'lucide-react';
import { fetchApi } from '../../../lib/apiClient';
import { formatCurrency, formatDate } from '../../../lib/utils';

interface LeaveType {
  id: string;
  name: string;
  code: string;
  days_allowed_per_year: number;
  is_paid: boolean;
  carry_forward_limit: number;
  is_encashable: boolean;
}

interface LeaveBalance {
  id: string;
  employee_id: string;
  leave_type_id: string;
  allocated_days: number;
  used_days: number;
  pending_days: number;
  carried_forward_days: number;
  leave_type: LeaveType;
}

interface LeaveRequest {
  id: string;
  employee_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  days_count: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  review_comment?: string;
  created_at: string;
  employee?: {
    id: string;
    first_name: string;
    last_name: string;
    employee_id: string;
    designation: string;
  };
  leave_type?: {
    name: string;
    code: string;
    is_paid: boolean;
  };
  reviewer?: {
    full_name: string;
  };
}

interface AttendanceRecord {
  id: string;
  employee_id: string;
  date: string;
  status: 'present' | 'absent' | 'half_day' | 'holiday' | 'on_leave' | 'weekend';
  check_in?: string;
  check_out?: string;
  work_hours?: number;
  overtime_hours?: number;
  source: string;
  remarks?: string;
  employee?: {
    first_name: string;
    last_name: string;
    employee_id: string;
  };
}

interface Holiday {
  id: string;
  name: string;
  date: string;
  is_optional: boolean;
}

export default function AttendanceAndLeavesPage() {
  const [activeTab, setActiveTab] = useState<'leaves' | 'attendance' | 'holidays'>('leaves');
  const [currentRole, setCurrentRole] = useState<string>('ADMIN');

  // Common data
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');

  // Leaves tab data
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leaveStatusFilter, setLeaveStatusFilter] = useState<string>('all');
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [actioningRequest, setActioningRequest] = useState<LeaveRequest | null>(null);
  const [actionComment, setActionComment] = useState('');

  // Attendance tab data
  const [attendanceMonth, setAttendanceMonth] = useState<number>(new Date().getMonth() + 1);
  const [attendanceYear, setAttendanceYear] = useState<number>(new Date().getFullYear());
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [attendanceSummary, setAttendanceSummary] = useState<any>(null);
  const [showPunchModal, setShowPunchModal] = useState(false);

  // Holidays data
  const [holidays, setHolidays] = useState<Holiday[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Apply Leave Form
  const [applyForm, setApplyForm] = useState({
    employee_id: '',
    leave_type_id: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    days_count: 1,
    reason: '',
  });

  // Punch Attendance Form
  const [punchForm, setPunchForm] = useState({
    employee_id: '',
    date: new Date().toISOString().split('T')[0],
    status: 'present' as 'present' | 'absent' | 'half_day' | 'holiday' | 'on_leave' | 'weekend',
    check_in: '09:30',
    check_out: '18:30',
    work_hours: 8,
    overtime_hours: 0,
    remarks: 'Regular Workday',
  });

  useEffect(() => {
    const role = localStorage.getItem('paydoc_active_role') || 'ADMIN';
    setCurrentRole(role);
  }, []);

  // 1. Initial Load: Employees, Leave Types, Holidays
  useEffect(() => {
    async function loadMasterData() {
      try {
        setLoading(true);
        const [empRes, typesRes, holRes] = await Promise.all([
          fetchApi('/employees?limit=100').catch(() => ({ employees: [] })),
          fetchApi('/leave-types').catch(() => ({ leaveTypes: [] })),
          fetchApi(`/holidays?year=${attendanceYear}`).catch(() => ({ holidays: [] })),
        ]);

        const emps = empRes.employees || [];
        setEmployees(emps);
        setLeaveTypes(typesRes.leaveTypes || []);
        setHolidays(holRes.holidays || []);

        if (emps.length > 0) {
          setSelectedEmployeeId(emps[0].id);
          setApplyForm((prev) => ({ ...prev, employee_id: emps[0].id }));
          setPunchForm((prev) => ({ ...prev, employee_id: emps[0].id }));
        }

        if (typesRes.leaveTypes?.length > 0) {
          setApplyForm((prev) => ({ ...prev, leave_type_id: typesRes.leaveTypes[0].id }));
        }
      } catch (err) {
        console.error('Failed to load leave & attendance initial data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadMasterData();
  }, [attendanceYear]);

  // 2. Load Leave Data (Requests & Balances)
  const loadLeaveData = async () => {
    try {
      const query = leaveStatusFilter !== 'all' ? `?status=${leaveStatusFilter}` : '';
      const reqRes = await fetchApi(`/leave-requests${query}`);
      setLeaveRequests(reqRes.leaveRequests || []);

      if (selectedEmployeeId) {
        const balRes = await fetchApi(`/leave-balances/${selectedEmployeeId}?year=${attendanceYear}`);
        setLeaveBalances(balRes.balances || []);
      }
    } catch (err) {
      console.error('Failed to load leave data:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'leaves') {
      loadLeaveData();
    }
  }, [activeTab, leaveStatusFilter, selectedEmployeeId, attendanceYear]);

  // 3. Load Attendance Data & Monthly Summary
  const loadAttendanceData = async () => {
    try {
      let url = `/attendance?month=${attendanceMonth}&year=${attendanceYear}`;
      if (selectedEmployeeId) {
        url += `&employeeId=${selectedEmployeeId}`;
      }
      const [attRes, sumRes] = await Promise.all([
        fetchApi(url),
        selectedEmployeeId
          ? fetchApi(`/attendance/summary/${selectedEmployeeId}?month=${attendanceMonth}&year=${attendanceYear}`).catch(() => null)
          : Promise.resolve(null),
      ]);

      setAttendanceRecords(attRes.records || []);
      setAttendanceSummary(sumRes);
    } catch (err) {
      console.error('Failed to load attendance records:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'attendance') {
      loadAttendanceData();
    }
  }, [activeTab, attendanceMonth, attendanceYear, selectedEmployeeId]);

  // Handle Apply Leave
  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      await fetchApi('/leave-requests', {
        method: 'POST',
        body: JSON.stringify(applyForm),
      });

      setShowApplyModal(false);
      await loadLeaveData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to submit leave request');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Approve / Reject Leave
  const handleActionRequest = async (action: 'approve' | 'reject') => {
    if (!actioningRequest) return;
    setSubmitting(true);
    try {
      await fetchApi(`/leave-requests/${actioningRequest.id}/action`, {
        method: 'PATCH',
        body: JSON.stringify({
          action,
          review_comment: actionComment || undefined,
        }),
      });

      setActioningRequest(null);
      setActionComment('');
      await loadLeaveData();
    } catch (err: any) {
      alert(`Action failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Log Attendance Punch
  const handlePunchAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      await fetchApi('/attendance', {
        method: 'POST',
        body: JSON.stringify(punchForm),
      });

      setShowPunchModal(false);
      await loadAttendanceData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to log attendance');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
      case 'absent':
        return 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border-rose-200 dark:border-rose-800';
      case 'half_day':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border-amber-200 dark:border-amber-800';
      case 'on_leave':
        return 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border-blue-200 dark:border-blue-800';
      case 'holiday':
        return 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400 border-purple-200 dark:border-purple-800';
      case 'weekend':
        return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700';
      case 'approved':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
      case 'pending':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border-amber-200 dark:border-amber-800';
      case 'rejected':
        return 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border-rose-200 dark:border-rose-800';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-indigo-600" />
            <span>Leave & Attendance Hub</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Indian statutory leave rules, daily clock-in/out tracking, holiday calendar, and automated LOP payroll deduction.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowPunchModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold shadow-xs"
          >
            <Clock className="w-4 h-4 text-indigo-600" />
            <span>Punch Daily Status</span>
          </button>

          <button
            onClick={() => setShowApplyModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs hover:shadow transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Apply for Leave</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 text-xs font-semibold">
        {[
          { key: 'leaves', label: 'Leave Applications & Balances' },
          { key: 'attendance', label: 'Attendance Tracker & Monthly Matrix' },
          { key: 'holidays', label: `Public Holidays (${attendanceYear})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`pb-3 transition-colors ${
              activeTab === tab.key
                ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: LEAVE MANAGEMENT */}
      {activeTab === 'leaves' && (
        <div className="space-y-6">
          {/* Employee Filter & Balances Strip */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Annual Leave Entitlements</h3>
                <p className="text-xs text-slate-500">Live balance and accruals for Indian statutory leave types.</p>
              </div>

              {/* Employee selector (for HR / Admin) */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Viewing Employee:</span>
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => {
                    setSelectedEmployeeId(e.target.value);
                    setApplyForm((prev) => ({ ...prev, employee_id: e.target.value }));
                    setPunchForm((prev) => ({ ...prev, employee_id: e.target.value }));
                  }}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name} ({emp.employee_id})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Leave Balance Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {leaveBalances.map((bal) => {
                const available =
                  Number(bal.allocated_days) +
                  Number(bal.carried_forward_days) -
                  Number(bal.used_days) -
                  Number(bal.pending_days);

                return (
                  <div
                    key={bal.id}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {bal.leave_type?.name}
                      </span>
                      <span className="font-mono text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        {bal.leave_type?.code}
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between pt-1">
                      <div>
                        <span className="text-xl font-bold font-mono text-indigo-600 dark:text-indigo-400">
                          {available}
                        </span>
                        <span className="text-xs text-slate-400 ml-1">/ {bal.allocated_days} days</span>
                      </div>
                      <span className="text-[10px] text-slate-500">
                        Used: {bal.used_days} {Number(bal.pending_days) > 0 && `(${bal.pending_days} pend)`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Leave Requests Table */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Leave Requests & Approvals</h3>
                <p className="text-xs text-slate-500">Applications submitted across the organization.</p>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-medium">
                {['all', 'pending', 'approved', 'rejected'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setLeaveStatusFilter(st)}
                    className={`px-3 py-1 rounded-lg capitalize transition-colors ${
                      leaveStatusFilter === st
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {leaveRequests.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl">
                No leave requests found for this filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-y border-slate-200 dark:border-slate-800 text-slate-500">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">Employee</th>
                      <th className="py-2.5 px-3 font-semibold">Leave Type</th>
                      <th className="py-2.5 px-3 font-semibold">Dates</th>
                      <th className="py-2.5 px-3 font-semibold">Duration</th>
                      <th className="py-2.5 px-3 font-semibold">Reason</th>
                      <th className="py-2.5 px-3 font-semibold">Status</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {leaveRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-3 px-3 font-medium text-slate-900 dark:text-white">
                          <div>
                            {req.employee?.first_name} {req.employee?.last_name}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {req.employee?.employee_id} • {req.employee?.designation}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {req.leave_type?.name}
                          </span>
                          <span className="ml-1 text-[10px] text-slate-400 font-mono">
                            ({req.leave_type?.code})
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                          {formatDate(req.start_date)} - {formatDate(req.end_date)}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white">
                          {req.days_count} {req.days_count === 1 ? 'day' : 'days'}
                        </td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                          {req.reason || '—'}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getStatusBadge(
                              req.status
                            )}`}
                          >
                            {req.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          {req.status === 'pending' && (currentRole === 'ADMIN' || currentRole === 'HR') ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setActioningRequest(req)}
                                className="px-2.5 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-semibold"
                              >
                                Review
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400">
                              {req.reviewer?.full_name ? `By ${req.reviewer.full_name}` : 'Completed'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ATTENDANCE TRACKER */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase">Month</label>
                <select
                  value={attendanceMonth}
                  onChange={(e) => setAttendanceMonth(Number(e.target.value))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {new Date(2026, m - 1).toLocaleString('default', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase">Year</label>
                <select
                  value={attendanceYear}
                  onChange={(e) => setAttendanceYear(Number(e.target.value))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200"
                >
                  <option value={2026}>2026</option>
                  <option value={2025}>2025</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase">Filter Employee</label>
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200"
                >
                  <option value="">All Employees</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name} ({emp.employee_id})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={() => setShowPunchModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-xs font-semibold hover:bg-indigo-100"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Log Single Record</span>
            </button>
          </div>

          {/* Monthly LOP & OT Summary Strip (When employee is selected) */}
          {attendanceSummary && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                <p className="text-[11px] font-semibold text-slate-500 uppercase">Present Days</p>
                <p className="text-xl font-bold font-mono text-emerald-600 mt-1">
                  {attendanceSummary.summary?.presentDays || 0}
                </p>
                <p className="text-[10px] text-slate-400">Total days worked</p>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                <p className="text-[11px] font-semibold text-slate-500 uppercase">Loss of Pay (LOP)</p>
                <p className="text-xl font-bold font-mono text-rose-600 mt-1">
                  {attendanceSummary.summary?.lopDays || 0} days
                </p>
                <p className="text-[10px] text-slate-400">Absence & unpaid leave</p>
              </div>

              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 shadow-xs">
                <p className="text-[11px] font-semibold text-rose-700 dark:text-rose-400 uppercase">
                  LOP Salary Deduction
                </p>
                <p className="text-xl font-bold font-mono text-rose-700 dark:text-rose-300 mt-1">
                  -{formatCurrency(attendanceSummary.calculations?.leaveDeductionsAmount || 0)}
                </p>
                <p className="text-[10px] text-rose-600/80">Rate: ₹{attendanceSummary.calculations?.dailyRate}/day</p>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                <p className="text-[11px] font-semibold text-slate-500 uppercase">Overtime Hours</p>
                <p className="text-xl font-bold font-mono text-indigo-600 mt-1">
                  {attendanceSummary.summary?.overtimeHours || 0} hrs
                </p>
                <p className="text-[10px] text-slate-400">Approved extra hours</p>
              </div>

              <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 shadow-xs">
                <p className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-400 uppercase">
                  Overtime Pay
                </p>
                <p className="text-xl font-bold font-mono text-indigo-700 dark:text-indigo-300 mt-1">
                  +{formatCurrency(attendanceSummary.calculations?.overtimeAmount || 0)}
                </p>
                <p className="text-[10px] text-indigo-600/80">At 1.5x hourly rate</p>
              </div>
            </div>
          )}

          {/* Daily Attendance Records Table */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Daily Attendance Log</h3>
                <p className="text-xs text-slate-500">
                  Detailed punch records for {attendanceMonth}/{attendanceYear}.
                </p>
              </div>
              <span className="text-xs font-mono text-slate-400">
                {attendanceRecords.length} records logged
              </span>
            </div>

            {attendanceRecords.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl">
                No attendance records found for this period. Click "Log Single Record" to punch attendance.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-y border-slate-200 dark:border-slate-800 text-slate-500">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">Date</th>
                      <th className="py-2.5 px-3 font-semibold">Employee</th>
                      <th className="py-2.5 px-3 font-semibold">Status</th>
                      <th className="py-2.5 px-3 font-semibold">Check In</th>
                      <th className="py-2.5 px-3 font-semibold">Check Out</th>
                      <th className="py-2.5 px-3 font-semibold">Work Hours</th>
                      <th className="py-2.5 px-3 font-semibold">Overtime</th>
                      <th className="py-2.5 px-3 font-semibold">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {attendanceRecords.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-2.5 px-3 font-mono font-medium text-slate-900 dark:text-white">
                          {formatDate(r.date)}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                          {r.employee ? `${r.employee.first_name} ${r.employee.last_name}` : 'Employee'}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getStatusBadge(
                              r.status
                            )}`}
                          >
                            {r.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">
                          {r.check_in ? r.check_in.slice(11, 16) || r.check_in : '—'}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">
                          {r.check_out ? r.check_out.slice(11, 16) || r.check_out : '—'}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-800 dark:text-slate-200">
                          {r.work_hours ? `${r.work_hours} hrs` : '—'}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                          {r.overtime_hours && r.overtime_hours > 0 ? `+${r.overtime_hours} hrs` : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 max-w-xs truncate">
                          {r.remarks || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: HOLIDAYS */}
      {activeTab === 'holidays' && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Indian Statutory & National Holidays ({attendanceYear})
            </h3>
            <p className="text-xs text-slate-500">
              Paid company holidays factored into payroll working days and attendance schedules.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {holidays.map((h) => {
              const dateObj = new Date(h.date);
              const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'long' });

              return (
                <div
                  key={h.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-900 dark:text-white">{h.name}</p>
                    <p className="text-[11px] font-mono text-slate-500">
                      {formatDate(h.date)} • {dayOfWeek}
                    </p>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      h.is_optional
                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                        : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                    }`}
                  >
                    {h.is_optional ? 'Optional' : 'Statutory'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* APPLY FOR LEAVE MODAL */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  <span>Submit Leave Application</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Request time off with real-time balance validation.
                </p>
              </div>
              <button
                onClick={() => setShowApplyModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApplyLeave} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Employee */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Employee*
                </label>
                <select
                  required
                  value={applyForm.employee_id}
                  onChange={(e) => setApplyForm({ ...applyForm, employee_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name} ({emp.employee_id})
                    </option>
                  ))}
                </select>
              </div>

              {/* Leave Type */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Leave Type*
                </label>
                <select
                  required
                  value={applyForm.leave_type_id}
                  onChange={(e) => setApplyForm({ ...applyForm, leave_type_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                >
                  {leaveTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.code}) — {t.is_paid ? 'Paid' : 'Unpaid (LOP)'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Start Date*
                  </label>
                  <input
                    type="date"
                    required
                    value={applyForm.start_date}
                    onChange={(e) => setApplyForm({ ...applyForm, start_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    End Date*
                  </label>
                  <input
                    type="date"
                    required
                    value={applyForm.end_date}
                    onChange={(e) => setApplyForm({ ...applyForm, end_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Days Count */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Number of Days* (0.5 for Half-Day)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  required
                  value={applyForm.days_count}
                  onChange={(e) => setApplyForm({ ...applyForm, days_count: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
                />
              </div>

              {/* Reason */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Reason for Leave
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Family function, personal unwell, doctor appointment"
                  value={applyForm.reason}
                  onChange={(e) => setApplyForm({ ...applyForm, reason: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="px-4 py-2 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Leave Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ACTION LEAVE REQUEST MODAL */}
      {actioningRequest && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Review Leave Application
            </h3>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-1.5 text-xs">
              <p>
                <span className="text-slate-500">Employee:</span>{' '}
                <span className="font-semibold text-slate-900 dark:text-white">
                  {actioningRequest.employee?.first_name} {actioningRequest.employee?.last_name}
                </span>
              </p>
              <p>
                <span className="text-slate-500">Leave Type:</span>{' '}
                <span className="font-semibold">{actioningRequest.leave_type?.name}</span>
              </p>
              <p>
                <span className="text-slate-500">Duration:</span>{' '}
                <span className="font-mono font-bold text-indigo-600">
                  {actioningRequest.days_count} days
                </span>{' '}
                ({formatDate(actioningRequest.start_date)} to {formatDate(actioningRequest.end_date)})
              </p>
              <p>
                <span className="text-slate-500">Reason:</span>{' '}
                <span>{actioningRequest.reason || 'None provided'}</span>
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Reviewer Comment (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Approved as per project schedule"
                value={actionComment}
                onChange={(e) => setActionComment(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setActioningRequest(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleActionRequest('reject')}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
              >
                Reject Request
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleActionRequest('approve')}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
              >
                Approve Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOG ATTENDANCE PUNCH MODAL */}
      {showPunchModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                <span>Punch Attendance Record</span>
              </h3>
              <button
                onClick={() => setShowPunchModal(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePunchAttendance} className="space-y-3 text-xs">
              {formError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Employee*</label>
                  <select
                    required
                    value={punchForm.employee_id}
                    onChange={(e) => setPunchForm({ ...punchForm, employee_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Date*</label>
                  <input
                    type="date"
                    required
                    value={punchForm.date}
                    onChange={(e) => setPunchForm({ ...punchForm, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Status*</label>
                <select
                  required
                  value={punchForm.status}
                  onChange={(e) => setPunchForm({ ...punchForm, status: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                >
                  <option value="present">Present</option>
                  <option value="absent">Absent (Loss of Pay)</option>
                  <option value="half_day">Half Day (0.5 LOP)</option>
                  <option value="on_leave">On Approved Leave</option>
                  <option value="holiday">Holiday</option>
                  <option value="weekend">Weekend</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Work Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="24"
                    value={punchForm.work_hours}
                    onChange={(e) => setPunchForm({ ...punchForm, work_hours: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Overtime Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="24"
                    value={punchForm.overtime_hours}
                    onChange={(e) => setPunchForm({ ...punchForm, overtime_hours: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-semibold text-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. Regular workday punch"
                  value={punchForm.remarks}
                  onChange={(e) => setPunchForm({ ...punchForm, remarks: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPunchModal(false)}
                  className="px-4 py-2 rounded-xl font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Attendance Punch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
