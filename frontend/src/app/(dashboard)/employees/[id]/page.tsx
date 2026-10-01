'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Mail,
  Phone,
  Building2,
  Calendar,
  CreditCard,
  FileSpreadsheet,
  Download,
  FileText,
  ShieldCheck,
} from 'lucide-react';
import { fetchApi } from '../../../../lib/apiClient';
import { formatCurrency, formatDate, getStatusBadge } from '../../../../lib/utils';

export default function EmployeeDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'salary' | 'payroll' | 'documents'>('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadEmployee() {
      try {
        const res = await fetchApi(`/employees/${id}`);
        setData(res);
      } catch (err) {
        console.error('Failed to load employee:', err);
      } finally {
        setLoading(false);
      }
    }
    if (id) loadEmployee();
  }, [id]);

  if (loading) {
    return <div className="py-16 text-center text-xs text-slate-400">Loading employee profile...</div>;
  }

  const { employee, salaryComponents, payrollHistory, documents } = data || {};

  if (!employee) {
    return <div className="py-16 text-center text-xs text-slate-400">Employee not found.</div>;
  }

  const downloadPayslip = async (payrollItemId: string) => {
    try {
      const blob = await fetchApi(`/payslips/${payrollItemId}/pdf`);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Payslip_${employee.employee_id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err: any) {
      alert(`Error downloading payslip: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Back Button & Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/employees"
          className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            {employee.first_name} {employee.last_name}
          </h1>
          <p className="text-xs text-slate-500 font-mono">{employee.employee_id} • {employee.designation}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 text-xs font-semibold">
        {[
          { key: 'overview', label: 'Overview Profile' },
          { key: 'salary', label: 'Salary Structure' },
          { key: 'payroll', label: 'Payroll & Payslips' },
          { key: 'documents', label: 'Employee Documents' },
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

      {/* Tab Contents */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Personal & Contact Info</h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Email:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{employee.email}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Phone:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{employee.phone || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Emergency Contact:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{employee.emergency_contact_name || 'N/A'} ({employee.emergency_contact_phone || 'N/A'})</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Status:</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadge(employee.status)}`}>
                  {employee.status}
                </span>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Banking & Compliance</h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Bank Name:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{employee.bank_name || 'HDFC Bank'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Account Number:</span>
                <span className="font-mono font-medium text-slate-800 dark:text-slate-200">{employee.bank_account_number || '•••• •••• 5012'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">IFSC Code:</span>
                <span className="font-mono font-medium text-slate-800 dark:text-slate-200">{employee.bank_ifsc || 'HDFC0001234'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">PAN / Tax ID:</span>
                <span className="font-mono font-medium text-slate-800 dark:text-slate-200">{employee.pan_number || 'ABCPS1234A'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'salary' && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Compensation Components</h3>
            <span className="font-mono text-sm font-bold text-indigo-600">
              Base: {formatCurrency(employee.basic_salary)} / {employee.salary_type}
            </span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            <div className="py-2.5 flex justify-between font-semibold">
              <span>Component Name</span>
              <span>Type</span>
              <span>Amount</span>
            </div>
            {(salaryComponents || []).map((c: any) => (
              <div key={c.id} className="py-2.5 flex justify-between items-center">
                <span className="font-medium text-slate-800 dark:text-slate-200">{c.name}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${c.component_type === 'allowance' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                  {c.component_type}
                </span>
                <span className="font-mono font-semibold text-slate-900 dark:text-white">
                  {formatCurrency(c.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'payroll' && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500">
              <tr>
                <th className="py-3 px-4 font-semibold">Pay Period</th>
                <th className="py-3 px-4 font-semibold">Basic</th>
                <th className="py-3 px-4 font-semibold">Allowances</th>
                <th className="py-3 px-4 font-semibold">Deductions</th>
                <th className="py-3 px-4 font-semibold">Net Salary</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Payslip</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {(payrollHistory || []).length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">No payroll history for this employee.</td>
                </tr>
              ) : (
                payrollHistory.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-medium">{item.payroll_runs?.month}/{item.payroll_runs?.year}</td>
                    <td className="py-3 px-4 font-mono">{formatCurrency(item.basic_salary)}</td>
                    <td className="py-3 px-4 font-mono text-emerald-600">+{formatCurrency(item.allowances_amount)}</td>
                    <td className="py-3 px-4 font-mono text-rose-600">-{formatCurrency(item.deductions_amount)}</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">{formatCurrency(item.net_salary)}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadge(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => downloadPayslip(item.id)}
                        className="flex items-center gap-1 ml-auto px-2.5 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-semibold"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>PDF</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Attached Documents & Certificates</h3>
          {(documents || []).length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No documents uploaded for this employee yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {documents.map((doc: any) => (
                <div key={doc.id} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    <div>
                      <p className="text-xs font-semibold text-slate-900 dark:text-white">{doc.file_name}</p>
                      <p className="text-[10px] text-slate-500 uppercase">{doc.document_type}</p>
                    </div>
                  </div>
                  <Link href={`/documents/${doc.id}`} className="text-xs font-semibold text-indigo-600 hover:underline">
                    View
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
