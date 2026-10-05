'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Percent,
  Calculator,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  TrendingDown,
  Sparkles,
  ArrowRight,
  Building2,
  FileCheck,
  HelpCircle,
  Save,
  Check,
  X,
  Info,
  FileText,
  Download,
} from 'lucide-react';
import { fetchApi } from '../../../lib/apiClient';
import { formatCurrency } from '../../../lib/utils';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  employee_id: string;
  basic_salary: number;
}

export default function TaxAndCompliancePage() {
  const [activeTab, setActiveTab] = useState<'simulator' | 'declarations' | 'statutory'>('simulator');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // --------------------------------------------------------------------------
  // TAB 1: SIMULATOR STATE
  // --------------------------------------------------------------------------
  const [simGross, setSimGross] = useState<number>(1200000); // 12 LPA default
  const [sim80C, setSim80C] = useState<number>(150000);
  const [sim80DSelf, setSim80DSelf] = useState<number>(25000);
  const [sim80DParents, setSim80DParents] = useState<number>(25000);
  const [simNPS, setSimNPS] = useState<number>(50000);
  const [simHomeLoan, setSimHomeLoan] = useState<number>(150000);
  const [simRentPaid, setSimRentPaid] = useState<number>(240000);
  const [simIsMetro, setSimIsMetro] = useState<boolean>(true);
  const [comparison, setComparison] = useState<any>(null);
  const [simulating, setSimulating] = useState(false);

  // --------------------------------------------------------------------------
  // TAB 2: DECLARATION STATE
  // --------------------------------------------------------------------------
  const [financialYear, setFinancialYear] = useState<string>('2026-2027');
  const [declaration, setDeclaration] = useState<any>(null);
  const [declRegime, setDeclRegime] = useState<'new' | 'old'>('new');
  const [decl80C, setDecl80C] = useState<number>(0);
  const [decl80DSelf, setDecl80DSelf] = useState<number>(0);
  const [decl80DParents, setDecl80DParents] = useState<number>(0);
  const [declNPS, setDeclNPS] = useState<number>(0);
  const [declHomeLoan, setDeclHomeLoan] = useState<number>(0);
  const [declRentPaid, setDeclRentPaid] = useState<number>(0);
  const [declIsMetro, setDeclIsMetro] = useState<boolean>(true);
  const [savingDecl, setSavingDecl] = useState(false);
  const [declSavedMsg, setDeclSavedMsg] = useState(false);

  // --------------------------------------------------------------------------
  // TAB 3: STATUTORY STATE
  // --------------------------------------------------------------------------
  const [statutoryDetails, setStatutoryDetails] = useState<any>(null);
  const [uan, setUan] = useState<string>('');
  const [pfNumber, setPfNumber] = useState<string>('');
  const [isPfEligible, setIsPfEligible] = useState<boolean>(true);
  const [pfCeiling, setPfCeiling] = useState<boolean>(true);
  const [vpfPercent, setVpfPercent] = useState<number>(0);
  const [esiNumber, setEsiNumber] = useState<string>('');
  const [isEsiEligible, setIsEsiEligible] = useState<boolean>(false);
  const [ptState, setPtState] = useState<string>('Karnataka');
  const [savingStat, setSavingStat] = useState(false);
  const [statSavedMsg, setStatSavedMsg] = useState(false);
  const [downloadingForm16, setDownloadingForm16] = useState(false);

  const handleDownloadForm16 = async () => {
    if (!selectedEmployeeId) return;
    setDownloadingForm16(true);
    try {
      const selectedEmp = employees.find((e) => e.id === selectedEmployeeId);
      const blob = await fetchApi(`/tax/form16/${selectedEmployeeId}/pdf?fy=${financialYear}`);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Form16_${selectedEmp?.employee_id || selectedEmployeeId}_${financialYear}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err: any) {
      alert(`Error downloading Form 16: ${err.message}`);
    } finally {
      setDownloadingForm16(false);
    }
  };

  // Load Employees on Mount
  useEffect(() => {
    async function loadInitial() {
      try {
        setLoading(true);
        const res = await fetchApi('/employees?limit=100').catch(() => ({ employees: [] }));
        const list = res.employees || [];
        setEmployees(list);
        if (list.length > 0) {
          setSelectedEmployeeId(list[0].id);
          // Set initial simulator gross based on first employee
          if (list[0].basic_salary) {
            setSimGross(Number(list[0].basic_salary) * 2 * 12);
          }
        }
      } catch (err) {
        console.error('Failed to load initial data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadInitial();
  }, []);

  // Trigger Simulator Comparison
  const runSimulation = async () => {
    try {
      setSimulating(true);
      const params = new URLSearchParams({
        grossAnnualSalary: String(simGross),
        sec80C: String(sim80C),
        sec80D_self: String(sim80DSelf),
        sec80D_parents: String(sim80DParents),
        sec80CCD_nps: String(simNPS),
        sec24b_homeLoanInterest: String(simHomeLoan),
        annualRentPaid: String(simRentPaid),
        isMetroCity: String(simIsMetro),
      });

      const res = await fetchApi(`/tax/regime-comparison?${params.toString()}`);
      setComparison(res.comparison);
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setSimulating(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'simulator') {
      runSimulation();
    }
  }, [
    activeTab,
    simGross,
    sim80C,
    sim80DSelf,
    sim80DParents,
    simNPS,
    simHomeLoan,
    simRentPaid,
    simIsMetro,
  ]);

  // Load Employee Declaration
  const loadEmployeeDeclaration = async () => {
    if (!selectedEmployeeId) return;
    try {
      const res = await fetchApi(
        `/tax/declarations/${selectedEmployeeId}?financialYear=${financialYear}`
      );
      const d = res.declaration;
      setDeclaration(d);
      if (d) {
        setDeclRegime(d.regime || 'new');
        setDecl80C(Number(d.sec_80c) || 0);
        setDecl80DSelf(Number(d.sec_80d_self) || 0);
        setDecl80DParents(Number(d.sec_80d_parents) || 0);
        setDeclNPS(Number(d.sec_80ccd_nps) || 0);
        setDeclHomeLoan(Number(d.sec_24b_home_loan_interest) || 0);
        setDeclRentPaid(Number(d.hra_annual_rent_paid) || 0);
        setDeclIsMetro(d.is_metro_city ?? true);
      } else {
        // Reset defaults
        setDeclRegime('new');
        setDecl80C(0);
        setDecl80DSelf(0);
        setDecl80DParents(0);
        setDeclNPS(0);
        setDeclHomeLoan(0);
        setDeclRentPaid(0);
        setDeclIsMetro(true);
      }
    } catch (err) {
      console.error('Failed to load declaration:', err);
    }
  };

  // Load Statutory Details
  const loadStatutoryDetails = async () => {
    if (!selectedEmployeeId) return;
    try {
      const res = await fetchApi(`/tax/statutory-details/${selectedEmployeeId}`);
      const s = res.statutoryDetails;
      setStatutoryDetails(s);
      if (s) {
        setUan(s.uan || '');
        setPfNumber(s.pf_number || '');
        setIsPfEligible(s.is_pf_eligible ?? true);
        setPfCeiling(s.pf_wage_ceiling_applicable ?? true);
        setVpfPercent(Number(s.vpf_percentage) || 0);
        setEsiNumber(s.esi_number || '');
        setIsEsiEligible(s.is_esi_eligible ?? false);
        setPtState(s.pt_state || 'Karnataka');
      } else {
        setUan('');
        setPfNumber('');
        setIsPfEligible(true);
        setPfCeiling(true);
        setVpfPercent(0);
        setEsiNumber('');
        setIsEsiEligible(false);
        setPtState('Karnataka');
      }
    } catch (err) {
      console.error('Failed to load statutory details:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'declarations') {
      loadEmployeeDeclaration();
    } else if (activeTab === 'statutory') {
      loadStatutoryDetails();
    }
  }, [activeTab, selectedEmployeeId, financialYear]);

  // Save Declaration
  const handleSaveDeclaration = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingDecl(true);
    try {
      await fetchApi('/tax/declarations', {
        method: 'POST',
        body: JSON.stringify({
          employee_id: selectedEmployeeId,
          financial_year: financialYear,
          regime: declRegime,
          sec_80c: decl80C,
          sec_80d_self: decl80DSelf,
          sec_80d_parents: decl80DParents,
          sec_80ccd_nps: declNPS,
          sec_24b_home_loan_interest: declHomeLoan,
          hra_annual_rent_paid: declRentPaid,
          is_metro_city: declIsMetro,
        }),
      });

      setDeclSavedMsg(true);
      setTimeout(() => setDeclSavedMsg(false), 3000);
      await loadEmployeeDeclaration();
    } catch (err: any) {
      alert(`Failed to save declaration: ${err.message}`);
    } finally {
      setSavingDecl(false);
    }
  };

  // Save Statutory Details
  const handleSaveStatutory = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingStat(true);
    try {
      await fetchApi('/tax/statutory-details', {
        method: 'POST',
        body: JSON.stringify({
          employee_id: selectedEmployeeId,
          uan: uan || null,
          pf_number: pfNumber || null,
          is_pf_eligible: isPfEligible,
          pf_wage_ceiling_applicable: pfCeiling,
          vpf_percentage: vpfPercent,
          esi_number: esiNumber || null,
          is_esi_eligible: isEsiEligible,
          pt_state: ptState,
        }),
      });

      setStatSavedMsg(true);
      setTimeout(() => setStatSavedMsg(false), 3000);
      await loadStatutoryDetails();
    } catch (err: any) {
      alert(`Failed to save statutory details: ${err.message}`);
    } finally {
      setSavingStat(false);
    }
  };

  const selectedEmp = employees.find((e) => e.id === selectedEmployeeId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Percent className="w-5 h-5 text-indigo-600" />
            <span>Indian Statutory Tax & Compliance Center</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Section 115BAC New vs Old Regime comparison, Section 80C/80D/HRA declarations, EPF wage ceiling, ESI, and Professional Tax.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 text-xs font-semibold">
        {[
          { key: 'simulator', label: 'Regime Comparison & Tax Simulator' },
          { key: 'declarations', label: 'Employee Tax Declarations (80C / HRA)' },
          { key: 'statutory', label: 'Statutory Compliance (EPF / ESI / PT)' },
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

      {/* TAB 1: REGIME COMPARISON & SIMULATOR */}
      {activeTab === 'simulator' && (
        <div className="space-y-6">
          {/* Top Recommendation Banner */}
          {comparison && (
            <div
              className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                comparison.recommendedRegime === 'new'
                  ? 'bg-emerald-50/80 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300'
                  : 'bg-indigo-50/80 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 shrink-0" />
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider">
                    Recommended Election: {comparison.recommendedRegime.toUpperCase()} TAX REGIME
                  </h3>
                  <p className="text-xs mt-0.5 opacity-90">{comparison.recommendationReason}</p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-75 block">
                  Annual Tax Savings
                </span>
                <span className="text-lg font-bold font-mono">
                  {formatCurrency(comparison.annualTaxDifference)}
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Interactive Inputs (4 cols) */}
            <div className="lg:col-span-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Calculator className="w-4 h-4 text-indigo-600" />
                <span>Simulation Parameters</span>
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Gross Annual Income (₹)
                  </label>
                  <input
                    type="number"
                    step="10000"
                    value={simGross}
                    onChange={(e) => setSimGross(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <p className="font-bold text-slate-500 text-[10px] uppercase tracking-wider mb-2">
                    Chapter VI-A Deductions (Old Regime Only)
                  </p>

                  <div className="space-y-2.5">
                    <div>
                      <div className="flex justify-between text-[11px] mb-0.5">
                        <span className="text-slate-600 dark:text-slate-400">Section 80C (PPF, ELSS, PF)</span>
                        <span className="text-slate-400 font-mono">Max ₹1.5L</span>
                      </div>
                      <input
                        type="number"
                        step="5000"
                        max="150000"
                        value={sim80C}
                        onChange={(e) => setSim80C(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] mb-0.5">
                        <span className="text-slate-600 dark:text-slate-400">80D Health Insurance (Self)</span>
                        <span className="text-slate-400 font-mono">Max ₹25k</span>
                      </div>
                      <input
                        type="number"
                        step="2500"
                        max="25000"
                        value={sim80DSelf}
                        onChange={(e) => setSim80DSelf(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] mb-0.5">
                        <span className="text-slate-600 dark:text-slate-400">80CCD(1B) NPS Additional</span>
                        <span className="text-slate-400 font-mono">Max ₹50k</span>
                      </div>
                      <input
                        type="number"
                        step="5000"
                        max="50000"
                        value={simNPS}
                        onChange={(e) => setSimNPS(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] mb-0.5">
                        <span className="text-slate-600 dark:text-slate-400">Section 24(b) Home Loan Interest</span>
                        <span className="text-slate-400 font-mono">Max ₹2L</span>
                      </div>
                      <input
                        type="number"
                        step="10000"
                        max="200000"
                        value={simHomeLoan}
                        onChange={(e) => setSimHomeLoan(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] mb-0.5">
                        <span className="text-slate-600 dark:text-slate-400">HRA Annual Rent Paid</span>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={simIsMetro}
                            onChange={(e) => setSimIsMetro(e.target.checked)}
                          />
                          <span className="text-[10px] text-slate-500">Metro City (50%)</span>
                        </label>
                      </div>
                      <input
                        type="number"
                        step="10000"
                        value={simRentPaid}
                        onChange={(e) => setSimRentPaid(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Side-by-Side Comparison Cards (8 cols) */}
            <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* New Tax Regime Card */}
              {comparison && (
                <div
                  className={`p-5 rounded-2xl bg-white dark:bg-slate-900 border shadow-xs flex flex-col justify-between ${
                    comparison.recommendedRegime === 'new'
                      ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>New Tax Regime</span>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600">
                            Sec 115BAC
                          </span>
                        </h4>
                        <p className="text-[11px] text-slate-400">Default statutory regime</p>
                      </div>

                      {comparison.recommendedRegime === 'new' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
                          Recommended
                        </span>
                      )}
                    </div>

                    <div className="space-y-2 text-xs border-y border-slate-100 dark:border-slate-800 py-3">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Gross Income:</span>
                        <span className="font-mono font-medium">{formatCurrency(comparison.newRegime.grossAnnualSalary)}</span>
                      </div>
                      <div className="flex justify-between text-emerald-600">
                        <span>Standard Deduction:</span>
                        <span className="font-mono">-{formatCurrency(comparison.newRegime.standardDeduction)}</span>
                      </div>
                      <div className="flex justify-between font-bold pt-1 border-t border-slate-100 dark:border-slate-800">
                        <span>Taxable Income:</span>
                        <span className="font-mono">{formatCurrency(comparison.newRegime.taxableIncome)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Tax Before Cess:</span>
                        <span className="font-mono">{formatCurrency(comparison.newRegime.taxBeforeCess)}</span>
                      </div>
                      {Number(comparison.newRegime.rebate87A) > 0 && (
                        <div className="flex justify-between text-emerald-600 font-medium">
                          <span>Sec 87A Rebate:</span>
                          <span className="font-mono">-{formatCurrency(comparison.newRegime.rebate87A)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-slate-500">
                        <span>Health & Edu Cess (4%):</span>
                        <span className="font-mono">+{formatCurrency(comparison.newRegime.healthAndEduCess)}</span>
                      </div>
                    </div>

                    {/* Slab breakdown */}
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Slab Calculation</p>
                      <div className="space-y-0.5 text-[11px] font-mono text-slate-500">
                        {comparison.newRegime.slabBreakdown.map((s: any, idx: number) => (
                          <div key={idx} className="flex justify-between">
                            <span>{s.slab} ({s.rate})</span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {formatCurrency(s.tax)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Annual Tax</span>
                      <span className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                        {formatCurrency(comparison.newRegime.totalAnnualTax)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Monthly TDS</span>
                      <span className="text-sm font-bold font-mono text-indigo-600">
                        {formatCurrency(comparison.newRegime.monthlyTDS)}/mo
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Old Tax Regime Card */}
              {comparison && (
                <div
                  className={`p-5 rounded-2xl bg-white dark:bg-slate-900 border shadow-xs flex flex-col justify-between ${
                    comparison.recommendedRegime === 'old'
                      ? 'border-indigo-500 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>Old Tax Regime</span>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600">
                            Itemized
                          </span>
                        </h4>
                        <p className="text-[11px] text-slate-400">With 80C, 80D, 24(b) & HRA</p>
                      </div>

                      {comparison.recommendedRegime === 'old' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-400">
                          Recommended
                        </span>
                      )}
                    </div>

                    <div className="space-y-2 text-xs border-y border-slate-100 dark:border-slate-800 py-3">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Gross Income:</span>
                        <span className="font-mono font-medium">{formatCurrency(comparison.oldRegime.grossAnnualSalary)}</span>
                      </div>
                      <div className="flex justify-between text-emerald-600">
                        <span>Total Deductions:</span>
                        <span className="font-mono">-{formatCurrency(comparison.oldRegime.totalExemptionsAndDeductions)}</span>
                      </div>
                      <div className="flex justify-between font-bold pt-1 border-t border-slate-100 dark:border-slate-800">
                        <span>Taxable Income:</span>
                        <span className="font-mono">{formatCurrency(comparison.oldRegime.taxableIncome)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Tax Before Cess:</span>
                        <span className="font-mono">{formatCurrency(comparison.oldRegime.taxBeforeCess)}</span>
                      </div>
                      {Number(comparison.oldRegime.rebate87A) > 0 && (
                        <div className="flex justify-between text-emerald-600 font-medium">
                          <span>Sec 87A Rebate:</span>
                          <span className="font-mono">-{formatCurrency(comparison.oldRegime.rebate87A)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-slate-500">
                        <span>Health & Edu Cess (4%):</span>
                        <span className="font-mono">+{formatCurrency(comparison.oldRegime.healthAndEduCess)}</span>
                      </div>
                    </div>

                    {/* Deductions applied list */}
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Deductions Breakdown</p>
                      <div className="space-y-0.5 text-[11px] font-mono text-slate-500">
                        <div className="flex justify-between">
                          <span>Std Deduction</span>
                          <span>{formatCurrency(comparison.oldRegime.deductionsBreakdown.standardDeduction)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>80C (PPF, PF)</span>
                          <span>{formatCurrency(comparison.oldRegime.deductionsBreakdown.sec80C)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>HRA Exemption</span>
                          <span>{formatCurrency(comparison.oldRegime.deductionsBreakdown.hraExemption)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Home Loan / 80D</span>
                          <span>
                            {formatCurrency(
                              Number(comparison.oldRegime.deductionsBreakdown.sec24b_homeLoanInterest) +
                                Number(comparison.oldRegime.deductionsBreakdown.sec80D_self)
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Annual Tax</span>
                      <span className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                        {formatCurrency(comparison.oldRegime.totalAnnualTax)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Monthly TDS</span>
                      <span className="text-sm font-bold font-mono text-indigo-600">
                        {formatCurrency(comparison.oldRegime.monthlyTDS)}/mo
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: EMPLOYEE DECLARATIONS */}
      {activeTab === 'declarations' && (
        <div className="space-y-6">
          {/* Employee & FY Selector */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-xs">
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase">Select Employee</label>
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name} ({emp.employee_id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase">Financial Year</label>
                <select
                  value={financialYear}
                  onChange={(e) => setFinancialYear(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200"
                >
                  <option value="2026-2027">FY 2026-2027 (AY 2027-28)</option>
                  <option value="2025-2026">FY 2025-2026 (AY 2026-27)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {declaration && (
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${
                    declaration.status === 'verified'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  Status: {declaration.status}
                </span>
              )}
              <button
                type="button"
                onClick={handleDownloadForm16}
                disabled={!selectedEmployeeId || downloadingForm16}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 font-semibold text-xs transition disabled:opacity-50"
                title="Download Form 16 Part B Certificate PDF"
              >
                <FileText className="w-3.5 h-3.5" />
                {downloadingForm16 ? 'Generating...' : 'Download Form 16 (Part B)'}
              </button>
            </div>
          </div>

          <form
            onSubmit={handleSaveDeclaration}
            className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6 text-xs"
          >
            {declSavedMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Tax declaration saved successfully. Monthly TDS will be recalculated.</span>
              </div>
            )}

            {/* Regime Election */}
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2">
                1. Tax Regime Election
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  className={`p-4 rounded-xl border cursor-pointer flex items-start gap-3 ${
                    declRegime === 'new'
                      ? 'border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <input
                    type="radio"
                    name="regime"
                    checked={declRegime === 'new'}
                    onChange={() => setDeclRegime('new')}
                    className="mt-0.5 text-emerald-600"
                  />
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block">
                      New Tax Regime (Section 115BAC)
                    </span>
                    <span className="text-[11px] text-slate-500 mt-0.5 block">
                      Lower tax slab rates, ₹75,000 standard deduction, rebate up to ₹7.75L gross. Zero proof submission required.
                    </span>
                  </div>
                </label>

                <label
                  className={`p-4 rounded-xl border cursor-pointer flex items-start gap-3 ${
                    declRegime === 'old'
                      ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <input
                    type="radio"
                    name="regime"
                    checked={declRegime === 'old'}
                    onChange={() => setDeclRegime('old')}
                    className="mt-0.5 text-indigo-600"
                  />
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block">
                      Old Tax Regime
                    </span>
                    <span className="text-[11px] text-slate-500 mt-0.5 block">
                      Claim Section 80C, 80D, home loan interest, and HRA rent exemption. Proofs and receipts required for verification.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Chapter VI-A Fields (Enabled if Old Regime selected) */}
            <div className={`space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800 ${declRegime === 'new' ? 'opacity-40 pointer-events-none' : ''}`}>
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  2. Itemized Statutory Declarations (Old Regime)
                </h3>
                {declRegime === 'new' && (
                  <span className="text-[10px] text-amber-600 font-semibold">
                    (Disabled: Switch to Old Regime to claim these exemptions)
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold mb-1">Section 80C (PPF, ELSS, EPF, LIC)</label>
                  <input
                    type="number"
                    max="150000"
                    step="1000"
                    value={decl80C}
                    onChange={(e) => setDecl80C(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                  />
                  <span className="text-[10px] text-slate-400">Max limit: ₹1,50,000</span>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Section 80D Health Insurance (Self)</label>
                  <input
                    type="number"
                    max="25000"
                    step="1000"
                    value={decl80DSelf}
                    onChange={(e) => setDecl80DSelf(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                  />
                  <span className="text-[10px] text-slate-400">Max limit: ₹25,000</span>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Section 80D Health Insurance (Parents)</label>
                  <input
                    type="number"
                    max="50000"
                    step="1000"
                    value={decl80DParents}
                    onChange={(e) => setDecl80DParents(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                  />
                  <span className="text-[10px] text-slate-400">Max limit: ₹50,000</span>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Section 80CCD(1B) NPS Additional</label>
                  <input
                    type="number"
                    max="50000"
                    step="1000"
                    value={declNPS}
                    onChange={(e) => setDeclNPS(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                  />
                  <span className="text-[10px] text-slate-400">Max limit: ₹50,000</span>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Section 24(b) Home Loan Interest</label>
                  <input
                    type="number"
                    max="200000"
                    step="5000"
                    value={declHomeLoan}
                    onChange={(e) => setDeclHomeLoan(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                  />
                  <span className="text-[10px] text-slate-400">Max limit: ₹2,00,000</span>
                </div>

                <div>
                  <label className="block font-semibold mb-1">HRA Annual Rent Paid</label>
                  <input
                    type="number"
                    step="5000"
                    value={declRentPaid}
                    onChange={(e) => setDeclRentPaid(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                  />
                  <label className="flex items-center gap-1.5 mt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={declIsMetro}
                      onChange={(e) => setDeclIsMetro(e.target.checked)}
                    />
                    <span className="text-[10px] text-slate-500">Accommodation in Metro City (50% HRA)</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="submit"
                disabled={savingDecl}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{savingDecl ? 'Saving...' : 'Save Tax Declaration'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: STATUTORY COMPLIANCE (EPF, ESI, PT) */}
      {activeTab === 'statutory' && (
        <div className="space-y-6">
          {/* Employee Selector */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs">
              <span className="text-slate-500 font-medium">Configuring Employee:</span>
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name} ({emp.employee_id})
                  </option>
                ))}
              </select>
            </div>

            {selectedEmp && (
              <span className="text-xs font-mono text-slate-500">
                Monthly Base: {formatCurrency(selectedEmp.basic_salary)}
              </span>
            )}
          </div>

          <form
            onSubmit={handleSaveStatutory}
            className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6 text-xs"
          >
            {statSavedMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Statutory compliance settings updated successfully.</span>
              </div>
            )}

            {/* 1. EPF Card */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  <span>Employees' Provident Fund (EPF / EPFO)</span>
                </h3>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPfEligible}
                    onChange={(e) => setIsPfEligible(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">PF Eligible</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <div>
                  <label className="block font-semibold mb-1">Universal Account Number (UAN)</label>
                  <input
                    type="text"
                    placeholder="12-digit UAN"
                    value={uan}
                    onChange={(e) => setUan(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">PF Member ID / Number</label>
                  <input
                    type="text"
                    placeholder="e.g. KN/BNG/0012345/000/01"
                    value={pfNumber}
                    onChange={(e) => setPfNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Wage Ceiling (₹15,000 Cap)</label>
                  <label className="flex items-center gap-2 mt-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pfCeiling}
                      onChange={(e) => setPfCeiling(e.target.checked)}
                      className="rounded text-indigo-600"
                    />
                    <span className="text-[11px] text-slate-600 dark:text-slate-400">
                      Cap at ₹1,800/mo (12% of ₹15k)
                    </span>
                  </label>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Voluntary PF (VPF %)</label>
                  <input
                    type="number"
                    min="0"
                    max="88"
                    step="1"
                    value={vpfPercent}
                    onChange={(e) => setVpfPercent(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-slate-900 dark:text-white"
                  />
                  <span className="text-[10px] text-slate-400">Additional voluntary employee deduction</span>
                </div>
              </div>
            </div>

            {/* 2. ESI Card */}
            <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Employees' State Insurance (ESIC)</span>
                </h3>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isEsiEligible}
                    onChange={(e) => setIsEsiEligible(e.target.checked)}
                    className="rounded text-emerald-600"
                  />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">ESI Eligible</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <div>
                  <label className="block font-semibold mb-1">ESI Insurance Number</label>
                  <input
                    type="text"
                    placeholder="17-digit IP Number"
                    value={esiNumber}
                    onChange={(e) => setEsiNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-slate-900 dark:text-white"
                  />
                </div>

                <div className="text-[11px] text-slate-500 space-y-1">
                  <p className="font-semibold text-slate-700 dark:text-slate-300">Statutory Rules:</p>
                  <p>• Applicable only if Monthly Gross $\le$ ₹21,000.</p>
                  <p>• Employee Contribution: 0.75% of Gross.</p>
                  <p>• Employer Contribution: 3.25% of Gross.</p>
                </div>
              </div>
            </div>

            {/* 3. Professional Tax Card */}
            <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span>Professional Tax (PT) Work Location</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <div>
                  <label className="block font-semibold mb-1">State / Union Territory</label>
                  <select
                    value={ptState}
                    onChange={(e) => setPtState(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="Karnataka">Karnataka (₹200 for gross ≥ ₹25k)</option>
                    <option value="Maharashtra">Maharashtra (₹200/mo, ₹300 in Feb for gross above ₹10k)</option>
                    <option value="Telangana">Telangana (₹200 for gross above ₹20k)</option>
                    <option value="Tamil Nadu">Tamil Nadu (~₹208/mo)</option>
                    <option value="Delhi">Delhi (No Professional Tax)</option>
                    <option value="Haryana">Haryana (No Professional Tax)</option>
                  </select>
                </div>

                <div className="text-[11px] text-slate-500 space-y-1">
                  <p className="font-semibold text-slate-700 dark:text-slate-300">Deduction Rule:</p>
                  <p>Deducted automatically during each monthly payroll run according to state government schedules.</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="submit"
                disabled={savingStat}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{savingStat ? 'Saving...' : 'Save Statutory Settings'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
