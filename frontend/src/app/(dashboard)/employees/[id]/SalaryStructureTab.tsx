'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  Plus,
  Trash2,
  Calendar,
  Layers,
  Sparkles,
  History,
  CheckCircle2,
  AlertCircle,
  X,
  FileSpreadsheet,
  Info,
} from 'lucide-react';
import { fetchApi } from '../../../../lib/apiClient';
import { formatCurrency, formatDate } from '../../../../lib/utils';

interface SalaryStructureTabProps {
  employeeId: string;
  currentBasic: number;
  salaryType: string;
  onSalaryUpdated: () => void;
}

interface ComponentRow {
  component_definition_id: string;
  calc_type: 'fixed' | 'percentage_basic' | 'percentage_gross' | 'formula';
  value: number;
}

export default function SalaryStructureTab({
  employeeId,
  currentBasic,
  salaryType,
  onSalaryUpdated,
}: SalaryStructureTabProps) {
  const [structure, setStructure] = useState<any>(null);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReviseModal, setShowReviseModal] = useState(false);

  // Revise Modal Form State
  const [reviseBasic, setReviseBasic] = useState<number>(Number(currentBasic) || 0);
  const [effectiveFrom, setEffectiveFrom] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [revisionReason, setRevisionReason] = useState<string>('Annual Salary Revision');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [components, setComponents] = useState<ComponentRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [structRes, catalogRes, tplRes] = await Promise.all([
        fetchApi(`/employees/${employeeId}/salary-structure`),
        fetchApi('/salary-components').catch(() => ({ components: [] })),
        fetchApi('/ctc-templates').catch(() => ({ templates: [] })),
      ]);

      setStructure(structRes);
      setCatalog(catalogRes.components || []);
      setTemplates(tplRes.templates || []);

      if (structRes?.employee?.basic_salary) {
        setReviseBasic(Number(structRes.employee.basic_salary));
      }

      // Prepopulate active components for revision modal
      if (structRes?.activeComponents && structRes.activeComponents.length > 0) {
        const rows: ComponentRow[] = structRes.activeComponents.map((c: any) => ({
          component_definition_id: c.component_definition_id,
          calc_type: c.calc_type,
          value: Number(c.value),
        }));
        setComponents(rows);
      }
    } catch (err) {
      console.error('Failed to load salary structure:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [employeeId]);

  // Handle template selection in revision modal
  const handleApplyTemplate = (tplId: string) => {
    setSelectedTemplateId(tplId);
    if (!tplId) return;

    const tpl = templates.find((t) => t.id === tplId);
    if (!tpl || !tpl.components) return;

    const newRows: ComponentRow[] = tpl.components
      .filter((tc: any) => tc.component_definition?.code !== 'BASIC')
      .map((tc: any) => ({
        component_definition_id: tc.component_definition_id,
        calc_type: tc.calc_type || 'percentage_basic',
        value: Number(tc.value) || 0,
      }));

    setComponents(newRows);
  };

  const handleAddComponent = () => {
    const available = catalog.filter(
      (c) =>
        c.code !== 'BASIC' &&
        !components.some((row) => row.component_definition_id === c.id)
    );
    if (available.length === 0) return;

    const first = available[0];
    setComponents((prev) => [
      ...prev,
      {
        component_definition_id: first.id,
        calc_type: first.default_calc_type || 'percentage_basic',
        value: Number(first.default_value) || 0,
      },
    ]);
  };

  const handleRemoveComponent = (index: number) => {
    setComponents((prev) => prev.filter((_, i) => i !== index));
  };

  const handleComponentChange = (index: number, field: keyof ComponentRow, val: any) => {
    setComponents((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  // Live simulation of modal inputs
  const simulatedBreakdown = useMemo(() => {
    const basic = Number(reviseBasic) || 0;
    let allowances = 0;
    let deductions = 0;

    components.forEach((c) => {
      const def = catalog.find((item) => item.id === c.component_definition_id);
      if (!def) return;

      let amt = 0;
      if (c.calc_type === 'fixed') {
        amt = Number(c.value) || 0;
      } else if (c.calc_type === 'percentage_basic') {
        amt = (basic * (Number(c.value) || 0)) / 100;
      } else if (c.calc_type === 'percentage_gross') {
        // Approximate on basic for real-time preview
        amt = (basic * (Number(c.value) || 0)) / 100;
      }

      if (def.component_type === 'deduction') {
        deductions += amt;
      } else {
        allowances += amt;
      }
    });

    const gross = basic + allowances;
    const net = gross - deductions;
    const annualCTC = gross * 12;

    return { basic, allowances, deductions, gross, net, annualCTC };
  }, [reviseBasic, components, catalog]);

  const handleSaveRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);

    try {
      const payload = {
        basic_salary: Number(reviseBasic),
        effective_from: effectiveFrom,
        revision_reason: revisionReason,
        components: components.map((c) => ({
          component_definition_id: c.component_definition_id,
          calc_type: c.calc_type,
          value: Number(c.value),
        })),
      };

      await fetchApi(`/employees/${employeeId}/salary-revision`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setShowReviseModal(false);
      await loadData();
      onSalaryUpdated();
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to save salary revision');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-xs text-slate-400">
        Loading salary components & revision structure...
      </div>
    );
  }

  const breakdown = structure?.breakdown;
  const activeComponents = structure?.activeComponents || [];
  const history = structure?.history || [];

  return (
    <div className="space-y-6">
      {/* Top Action & KPI Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-indigo-50/70 via-white to-slate-50 dark:from-indigo-950/20 dark:via-slate-900 dark:to-slate-900 border border-indigo-100 dark:border-indigo-900/30">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>Configured Compensation & CTC Breakdown</span>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              Active Structure
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Deterministic formula-backed components with taxability, PF, and statutory compliance.
          </p>
        </div>

        <button
          onClick={() => setShowReviseModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs hover:shadow transition-all cursor-pointer shrink-0"
        >
          <TrendingUp className="w-4 h-4" />
          <span>Revise Salary Structure</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Basic Pay</p>
          <p className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-1">
            {formatCurrency(breakdown?.basic || currentBasic)}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Base monthly</p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Allowances</p>
          <p className="text-lg font-bold font-mono text-emerald-600 mt-1">
            +{formatCurrency(breakdown?.totalAllowances || 0)}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">HRA, Special, etc.</p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Gross Pay</p>
          <p className="text-lg font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-1">
            {formatCurrency(breakdown?.gross || currentBasic)}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Monthly gross</p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Deductions</p>
          <p className="text-lg font-bold font-mono text-rose-600 mt-1">
            -{formatCurrency(breakdown?.totalDeductions || 0)}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">PF, PT, TDS</p>
        </div>

        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 shadow-xs col-span-2 md:col-span-1">
          <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
            Net Take-Home
          </p>
          <p className="text-lg font-bold font-mono text-emerald-700 dark:text-emerald-300 mt-1">
            {formatCurrency(breakdown?.netSalary || currentBasic)}
          </p>
          <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">
            CTC: {formatCurrency(breakdown?.ctcAnnual || (Number(currentBasic) * 12))}/yr
          </p>
        </div>
      </div>

      {/* Active Components Table */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Active Salary Components</h3>
            <p className="text-xs text-slate-500">Items included in the monthly payroll engine run.</p>
          </div>
          <span className="text-xs font-mono font-medium text-slate-500">
            {activeComponents.length} components assigned
          </span>
        </div>

        {activeComponents.length === 0 ? (
          <div className="py-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
            <FileSpreadsheet className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No custom components configured for this employee yet. Currently using simple base pay.
            </p>
            <button
              onClick={() => setShowReviseModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-xs font-semibold hover:bg-indigo-100"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Apply Standard CTC Template</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-y border-slate-200 dark:border-slate-800 text-slate-500">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Component</th>
                  <th className="py-2.5 px-3 font-semibold">Type</th>
                  <th className="py-2.5 px-3 font-semibold">Calculation Rule</th>
                  <th className="py-2.5 px-3 font-semibold">Configured Value</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Computed Monthly</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {/* Basic Row */}
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">
                    <div>Basic Salary</div>
                    <div className="text-[10px] text-slate-400 font-mono">BASIC</div>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400">
                      Base Earning
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">Direct Base Amount</td>
                  <td className="py-2.5 px-3 font-mono font-medium text-slate-700 dark:text-slate-300">
                    {formatCurrency(currentBasic)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                    {formatCurrency(currentBasic)}
                  </td>
                </tr>

                {/* Assigned Components */}
                {activeComponents.map((c: any) => {
                  const def = c.definition || {};
                  const isAllowance = def.component_type === 'earning';
                  // Match breakdown item
                  const computedItem = [
                    ...(breakdown?.earnings || []),
                    ...(breakdown?.deductions || []),
                  ].find((item: any) => item.component_code === def.code);

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">
                        <div className="flex items-center gap-1.5">
                          <span>{def.name || 'Component'}</span>
                          {def.is_taxable && (
                            <span className="text-[9px] px-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                              Taxable
                            </span>
                          )}
                          {def.is_pf_applicable && (
                            <span className="text-[9px] px-1 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600">
                              PF
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">{def.code}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            isAllowance
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                          }`}
                        >
                          {isAllowance ? 'Allowance' : 'Deduction'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                        {c.calc_type === 'percentage_basic'
                          ? '% of Basic'
                          : c.calc_type === 'percentage_gross'
                          ? '% of Gross'
                          : c.calc_type === 'formula'
                          ? def.formula || 'Custom Formula'
                          : 'Fixed Amount'}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-700 dark:text-slate-300">
                        {c.calc_type === 'fixed'
                          ? formatCurrency(c.value)
                          : `${Number(c.value).toFixed(2)}%`}
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right font-mono font-bold ${
                          isAllowance ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {isAllowance ? '+' : '-'}
                        {formatCurrency(computedItem?.amount || 0)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Revision History Timeline */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Revision History & Effective Dates</h3>
        </div>

        {history.length === 0 ? (
          <p className="text-xs text-slate-400 py-3">No past salary revision records on file.</p>
        ) : (
          <div className="space-y-3">
            {/* Group history by effective_from */}
            {Array.from(new Set(history.map((h: any) => h.effective_from))).map((effDate: any) => {
              const entries = history.filter((h: any) => h.effective_from === effDate);
              const firstEntry = entries[0];
              const isActive = !firstEntry.effective_to;

              return (
                <div
                  key={effDate}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {firstEntry.revision_reason || 'Salary Structure Revision'}
                      </span>
                      {isActive ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
                          Current / Active
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          Superseded
                        </span>
                      )}
                    </div>
                    <div className="text-slate-500 text-[11px] flex items-center gap-2">
                      <span>Effective: {formatDate(firstEntry.effective_from)}</span>
                      <span>•</span>
                      <span>Ended: {firstEntry.effective_to ? formatDate(firstEntry.effective_to) : 'Present'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <p className="text-[10px] text-slate-400">Components</p>
                      <p className="font-mono font-medium text-slate-700 dark:text-slate-300">{entries.length} items</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400">Logged At</p>
                      <p className="font-mono text-slate-500">{formatDate(firstEntry.created_at)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Revise Salary Modal */}
      {showReviseModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-8">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                  <span>Revise Employee Salary Structure</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Effective-dated adjustment with real-time statutory compensation simulation.
                </p>
              </div>
              <button
                onClick={() => setShowReviseModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRevision} className="p-6 space-y-5">
              {submitError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Basic Salary & Effective Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    New Monthly Basic (₹)*
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    required
                    value={reviseBasic}
                    onChange={(e) => setReviseBasic(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Effective From Date*
                  </label>
                  <input
                    type="date"
                    required
                    value={effectiveFrom}
                    onChange={(e) => setEffectiveFrom(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Revision Reason*
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Annual Appraisal, Promotion"
                    value={revisionReason}
                    onChange={(e) => setRevisionReason(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Quick Template Picker */}
              {templates.length > 0 && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <div>
                      <p className="text-xs font-semibold text-slate-900 dark:text-white">
                        Auto-fill with CTC Template
                      </p>
                      <p className="text-[10px] text-slate-500">Apply standard allowances and statutory weights.</p>
                    </div>
                  </div>

                  <select
                    value={selectedTemplateId}
                    onChange={(e) => handleApplyTemplate(e.target.value)}
                    className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-medium"
                  >
                    <option value="">Select a template...</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Component Rows */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Salary Components ({components.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleAddComponent}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-400 text-xs font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Component</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {components.map((row, idx) => {
                    const def = catalog.find((c) => c.id === row.component_definition_id);
                    return (
                      <div
                        key={idx}
                        className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
                      >
                        <select
                          value={row.component_definition_id}
                          onChange={(e) =>
                            handleComponentChange(idx, 'component_definition_id', e.target.value)
                          }
                          className="flex-1 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                        >
                          {catalog
                            .filter((c) => c.code !== 'BASIC')
                            .map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name} ({c.code} - {c.component_type})
                              </option>
                            ))}
                        </select>

                        <select
                          value={row.calc_type}
                          onChange={(e) =>
                            handleComponentChange(idx, 'calc_type', e.target.value)
                          }
                          className="w-32 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono"
                        >
                          <option value="percentage_basic">% of Basic</option>
                          <option value="percentage_gross">% of Gross</option>
                          <option value="fixed">Fixed (₹)</option>
                          <option value="formula">Formula</option>
                        </select>

                        <input
                          type="number"
                          step="0.01"
                          value={row.value}
                          onChange={(e) =>
                            handleComponentChange(idx, 'value', Number(e.target.value))
                          }
                          placeholder="Value"
                          className="w-24 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-semibold text-xs"
                        />

                        <button
                          type="button"
                          onClick={() => handleRemoveComponent(idx)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Real-time simulation bar */}
              <div className="p-4 rounded-xl bg-slate-950 text-white space-y-2">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
                  <span>PREVIEW MONTHLY BREAKDOWN</span>
                  <span className="font-mono text-emerald-400">
                    Est. Annual CTC: {formatCurrency(simulatedBreakdown.annualCTC)}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-800 text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] block">Basic</span>
                    <span className="font-mono font-bold">{formatCurrency(simulatedBreakdown.basic)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Gross</span>
                    <span className="font-mono font-bold text-indigo-300">
                      {formatCurrency(simulatedBreakdown.gross)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Deductions</span>
                    <span className="font-mono font-bold text-rose-300">
                      -{formatCurrency(simulatedBreakdown.deductions)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Net Take-Home</span>
                    <span className="font-mono font-bold text-emerald-300">
                      {formatCurrency(simulatedBreakdown.net)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowReviseModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Applying Revision...' : 'Confirm & Save Revision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
