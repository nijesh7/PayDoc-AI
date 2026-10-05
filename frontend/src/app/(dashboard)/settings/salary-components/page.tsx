'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Sliders,
  Plus,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Layers,
  Calculator,
  Percent,
  TrendingUp,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import { fetchApi } from '@/lib/apiClient';
import { formatCurrency } from '@/lib/utils';

export default function SalaryComponentsPage() {
  const [activeTab, setActiveTab] = useState<'catalog' | 'templates' | 'simulator'>('catalog');
  const [definitions, setDefinitions] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Component Modal
  const [showDefModal, setShowDefModal] = useState(false);
  const [defForm, setDefForm] = useState({
    name: '',
    code: '',
    component_type: 'earning',
    calc_type: 'fixed',
    default_value: 0,
    formula: '',
    is_taxable: true,
    pf_applicable: false,
    esi_applicable: false,
  });
  const [savingDef, setSavingDef] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Live CTC Simulator State
  const [simMonthlyGross, setSimMonthlyGross] = useState<number>(60000);
  const [simResult, setSimResult] = useState<any>(null);
  const [simLoading, setSimLoading] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [defsRes, tplsRes] = await Promise.all([
        fetchApi('/salary-components/definitions'),
        fetchApi('/ctc-templates'),
      ]);
      setDefinitions(defsRes.definitions || []);
      setTemplates(tplsRes.templates || []);
    } catch (err: any) {
      console.error('Failed to load salary configuration:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Run live CTC simulation
  useEffect(() => {
    async function runSim() {
      if (!simMonthlyGross || simMonthlyGross <= 0) return;
      try {
        setSimLoading(true);
        const res = await fetchApi(`/salary-components/preview?monthly_gross=${simMonthlyGross}`);
        setSimResult(res.preview);
      } catch (err) {
        console.error('Simulation error:', err);
      } finally {
        setSimLoading(false);
      }
    }
    const timer = setTimeout(runSim, 300);
    return () => clearTimeout(timer);
  }, [simMonthlyGross]);

  const handleCreateDefinition = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingDef(true);
    setErrorMsg(null);
    try {
      await fetchApi('/salary-components/definitions', {
        method: 'POST',
        body: JSON.stringify({
          ...defForm,
          default_value: Number(defForm.default_value),
        }),
      });
      setShowDefModal(false);
      setDefForm({
        name: '',
        code: '',
        component_type: 'earning',
        calc_type: 'fixed',
        default_value: 0,
        formula: '',
        is_taxable: true,
        pf_applicable: false,
        esi_applicable: false,
      });
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create component definition');
    } finally {
      setSavingDef(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/settings"
            className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Configurable Salary Components & CTC Templates
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Indian statutory compliance catalog, percentage formulas, and automated CTC breakup templates.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowDefModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Component</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('catalog')}
          className={`px-4 py-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'catalog'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Master Catalog ({definitions.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`px-4 py-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'templates'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>CTC Breakup Templates ({templates.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('simulator')}
          className={`px-4 py-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'simulator'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Calculator className="w-4 h-4" />
          <span>Live CTC Simulator</span>
        </button>
      </div>

      {/* TAB 1: Master Catalog */}
      {activeTab === 'catalog' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Salary Components Directory
            </h3>
            <span className="text-[11px] text-slate-400">Deterministic statutory & company allowances</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-[11px] font-semibold text-slate-500">
                  <th className="py-3 px-4">Component Name & Code</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Calculation Rule</th>
                  <th className="py-3 px-4">Default Value / Formula</th>
                  <th className="py-3 px-4 text-center">Taxable</th>
                  <th className="py-3 px-4 text-center">PF Eligible</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {definitions.map((def) => (
                  <tr key={def.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white">{def.name}</div>
                      <div className="text-[11px] font-mono text-slate-400">{def.code}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                          def.component_type === 'earning'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                        }`}
                      >
                        {def.component_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 capitalize text-slate-600 dark:text-slate-300">
                      {def.calc_type.replace(/_/g, ' ')}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                      {def.formula || (def.calc_type === 'fixed' ? formatCurrency(def.default_value) : `${def.default_value}%`)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {def.is_taxable ? (
                        <span className="text-emerald-600 font-bold">Yes</span>
                      ) : (
                        <span className="text-slate-400">Exempt</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {def.pf_applicable ? (
                        <span className="text-indigo-600 font-bold">Yes</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: CTC Templates */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {templates.map((tpl) => (
            <div
              key={tpl.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">{tpl.name}</h3>
                  <p className="text-xs text-slate-500 mt-1">{tpl.description || 'Standard salary breakup structure'}</p>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400">
                  Standard
                </span>
              </div>

              <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Breakup Weights</p>
                <div className="space-y-1.5 text-xs">
                  {(tpl.components || []).map((c: any) => (
                    <div key={c.id} className="flex justify-between items-center text-slate-700 dark:text-slate-300">
                      <span>{c.definition?.name || 'Component'}</span>
                      <span className="font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                        {c.calc_type === 'percent_of_basic'
                          ? `${c.value}% of Basic`
                          : c.calc_type === 'percent_of_gross'
                          ? `${c.value}% of Gross`
                          : formatCurrency(c.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: Live CTC Simulator */}
      {activeTab === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Calculator className="w-4 h-4 text-indigo-600" />
              <span>CTC Breakup Simulator</span>
            </h3>
            <p className="text-xs text-slate-500">
              Enter target Monthly Gross or Annual CTC to preview the deterministic Indian compliance breakdown.
            </p>

            <div className="space-y-2 pt-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Monthly Gross Pay (₹)
              </label>
              <input
                type="number"
                value={simMonthlyGross}
                onChange={(e) => setSimMonthlyGross(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm font-semibold text-slate-900 dark:text-white outline-hidden focus:border-indigo-500"
              />
              <p className="text-[11px] text-slate-400">
                Annual CTC: <strong className="text-slate-700 dark:text-slate-300">{formatCurrency(simMonthlyGross * 12)}</strong>
              </p>
            </div>
          </div>

          <div className="lg:col-span-7 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center justify-between">
              <span>Deterministic Salary Breakup</span>
              {simLoading && <span className="text-xs text-indigo-600 animate-pulse">Calculating...</span>}
            </h3>

            {simResult && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase">Total Earnings</span>
                    <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                      {formatCurrency(simResult.totalEarnings)}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30">
                    <span className="text-[10px] text-rose-600 font-semibold uppercase">Deductions</span>
                    <p className="text-sm font-bold text-rose-700 dark:text-rose-400 mt-0.5">
                      {formatCurrency(simResult.totalDeductions)}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30">
                    <span className="text-[10px] text-emerald-600 font-semibold uppercase">Net Take-Home</span>
                    <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">
                      {formatCurrency(simResult.netTakeHome)}
                    </p>
                  </div>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800 border-t border-slate-100 dark:border-slate-800 pt-3 text-xs space-y-2">
                  <div className="flex justify-between py-1">
                    <span className="text-slate-600 dark:text-slate-400">Basic Salary (50%)</span>
                    <span className="font-mono font-semibold">{formatCurrency(simResult.basic)}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-600 dark:text-slate-400">House Rent Allowance (HRA 50% of Basic)</span>
                    <span className="font-mono font-semibold">{formatCurrency(simResult.hra)}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-600 dark:text-slate-400">Special Allowance (Balancing)</span>
                    <span className="font-mono font-semibold">{formatCurrency(simResult.specialAllowance)}</span>
                  </div>
                  <div className="flex justify-between py-1 text-rose-600">
                    <span>Provident Fund (Employee 12% capped)</span>
                    <span className="font-mono font-semibold">-{formatCurrency(simResult.pfEmployee)}</span>
                  </div>
                  <div className="flex justify-between py-1 text-rose-600">
                    <span>Professional Tax (PT)</span>
                    <span className="font-mono font-semibold">-{formatCurrency(simResult.pt)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Component Modal */}
      {showDefModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Add Master Salary Component</h3>
              <button onClick={() => setShowDefModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDefinition} className="p-6 space-y-4 text-xs">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Component Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Medical Allowance"
                    value={defForm.name}
                    onChange={(e) => setDefForm({ ...defForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Unique Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MEDICAL"
                    value={defForm.code}
                    onChange={(e) => setDefForm({ ...defForm, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Type</label>
                  <select
                    value={defForm.component_type}
                    onChange={(e) => setDefForm({ ...defForm, component_type: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
                  >
                    <option value="earning">Earning / Allowance</option>
                    <option value="deduction">Deduction</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Calculation Type</label>
                  <select
                    value={defForm.calc_type}
                    onChange={(e) => setDefForm({ ...defForm, calc_type: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
                  >
                    <option value="fixed">Fixed Amount (₹)</option>
                    <option value="percent_of_basic">Percentage of Basic (%)</option>
                    <option value="percent_of_gross">Percentage of Gross (%)</option>
                    <option value="formula">Custom Formula Expression</option>
                  </select>
                </div>
              </div>

              {defForm.calc_type === 'formula' ? (
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Formula Expression</label>
                  <input
                    type="text"
                    placeholder="e.g. LEAST(BASIC, 15000) * 0.12 or BASIC * 0.50"
                    value={defForm.formula}
                    onChange={(e) => setDefForm({ ...defForm, formula: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 font-mono"
                  />
                  <p className="text-[10px] text-slate-400">Allowed variables: BASIC, GROSS, LEAST(a, b), GREATEST(a, b)</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    {defForm.calc_type === 'fixed' ? 'Default Amount (₹)' : 'Default Percentage (%)'}
                  </label>
                  <input
                    type="number"
                    value={defForm.default_value}
                    onChange={(e) => setDefForm({ ...defForm, default_value: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
                  />
                </div>
              )}

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={defForm.is_taxable}
                    onChange={(e) => setDefForm({ ...defForm, is_taxable: e.target.checked })}
                    className="rounded border-slate-300 text-indigo-600"
                  />
                  <span>Taxable Component</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={defForm.pf_applicable}
                    onChange={(e) => setDefForm({ ...defForm, pf_applicable: e.target.checked })}
                    className="rounded border-slate-300 text-indigo-600"
                  />
                  <span>PF Applicable</span>
                </label>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowDefModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingDef}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold disabled:opacity-50"
                >
                  {savingDef ? 'Saving...' : 'Save Component'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
