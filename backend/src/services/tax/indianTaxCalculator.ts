import { Decimal } from '../payroll/decimal';

export interface TaxDeductionInputs {
  sec80C?: number | string; // Max 1,50,000
  sec80D_self?: number | string; // Max 25,000
  sec80D_parents?: number | string; // Max 50,000
  sec80CCD_nps?: number | string; // Max 50,000
  sec24b_homeLoanInterest?: number | string; // Max 2,00,000
  annualRentPaid?: number | string;
  isMetroCity?: boolean;
  otherExemptions?: number | string;
}

export interface RegimeTaxCalculation {
  regime: 'new' | 'old';
  grossAnnualSalary: string;
  standardDeduction: string;
  totalExemptionsAndDeductions: string;
  taxableIncome: string;
  taxBeforeCess: string;
  rebate87A: string;
  healthAndEduCess: string;
  totalAnnualTax: string;
  monthlyTDS: string;
  slabBreakdown: Array<{
    slab: string;
    rate: string;
    taxableAmount: string;
    tax: string;
  }>;
  deductionsBreakdown: Record<string, string>;
}

export interface TaxComparisonResult {
  newRegime: RegimeTaxCalculation;
  oldRegime: RegimeTaxCalculation;
  recommendedRegime: 'new' | 'old';
  annualTaxDifference: string;
  monthlyTaxDifference: string;
  recommendationReason: string;
}

export interface EPFCalculationResult {
  eligibleWage: string;
  employeePF: string; // 12%
  employerEPS: string; // 8.33% capped at 1250
  employerEPF: string; // 3.67%
  totalEmployerPF: string; // 12%
  vpfAmount: string;
  isCeilingApplied: boolean;
}

export interface ESICalculationResult {
  isApplicable: boolean;
  grossSalary: string;
  employeeESI: string; // 0.75%
  employerESI: string; // 3.25%
  totalESI: string; // 4.0%
}

/**
 * Deterministic Section 10(13A) HRA Exemption Calculator.
 *
 * Exemption is least of:
 * 1. Actual HRA received annually
 * 2. Rent paid minus 10% of annual basic salary
 * 3. 50% of annual basic (Metro) or 40% (Non-Metro)
 */
export function calculateHRAExemption(
  annualBasic: number | string,
  annualHRA: number | string,
  annualRentPaid: number | string,
  isMetro: boolean = true
): string {
  const basic = new Decimal(annualBasic);
  const hra = new Decimal(annualHRA);
  const rent = new Decimal(annualRentPaid);

  if (rent.lessThanOrEqualTo(0) || basic.lessThanOrEqualTo(0)) {
    return '0.00';
  }

  // 10% of basic
  const tenPercentBasic = basic.mul('0.10');
  const rentMinusTenPercent = rent.minus(tenPercentBasic);
  const condition2 = rentMinusTenPercent.greaterThan(0) ? rentMinusTenPercent : new Decimal(0);

  // 50% or 40% of basic
  const percentage = isMetro ? '0.50' : '0.40';
  const condition3 = basic.mul(percentage);

  // Find minimum of hra, condition2, condition3
  let minExemption = hra;
  if (condition2.lessThan(minExemption)) {
    minExemption = condition2;
  }
  if (condition3.lessThan(minExemption)) {
    minExemption = condition3;
  }

  return minExemption.toFixed(2);
}

/**
 * New Tax Regime (Section 115BAC) for FY 2024-25 / 2025-26 / 2026-27.
 *
 * Standard Deduction: ₹75,000 for salaried employees.
 * Slabs:
 * - Up to ₹3,00,000: Nil
 * - ₹3,00,001 - ₹7,00,000: 5%
 * - ₹7,00,001 - ₹10,00,000: 10%
 * - ₹10,00,001 - ₹12,00,000: 15%
 * - ₹12,00,001 - ₹15,00,000: 20%
 * - Above ₹15,00,000: 30%
 *
 * Section 87A Rebate:
 * Tax rebate up to ₹25,000 if taxable income <= ₹7,00,000 (effectively zero tax up to ₹7,75,000 gross).
 * Cess: 4%
 */
export function calculateNewRegimeTax(
  grossAnnualSalary: number | string,
  standardDeductionAmount: number | string = 75000
): RegimeTaxCalculation {
  const gross = new Decimal(grossAnnualSalary);
  const stdDed = new Decimal(standardDeductionAmount);

  // Taxable income = max(0, gross - standard deduction)
  const taxableInc = gross.minus(stdDed);
  const taxable = taxableInc.greaterThan(0) ? taxableInc : new Decimal(0);

  const slabs = [
    { limit: 300000, rate: 0.0, label: 'Up to ₹3,00,000' },
    { limit: 400000, rate: 0.05, label: '₹3,00,001 - ₹7,00,000' },
    { limit: 300000, rate: 0.1, label: '₹7,00,001 - ₹10,00,000' },
    { limit: 200000, rate: 0.15, label: '₹10,00,001 - ₹12,00,000' },
    { limit: 300000, rate: 0.2, label: '₹12,00,001 - ₹15,00,000' },
    { limit: Infinity, rate: 0.3, label: 'Above ₹15,00,000' },
  ];

  let remaining = new Decimal(taxable.toFixed(2));
  let totalTaxBeforeCess = new Decimal(0);
  const slabBreakdown = [];

  for (const s of slabs) {
    if (remaining.lessThanOrEqualTo(0)) {
      slabBreakdown.push({
        slab: s.label,
        rate: `${(s.rate * 100).toFixed(0)}%`,
        taxableAmount: '0.00',
        tax: '0.00',
      });
      continue;
    }

    const chunk = s.limit === Infinity ? remaining : Decimal.min(remaining, new Decimal(s.limit));
    const taxOnChunk = chunk.mul(new Decimal(s.rate));
    totalTaxBeforeCess = totalTaxBeforeCess.plus(taxOnChunk);
    remaining = remaining.minus(chunk);

    slabBreakdown.push({
      slab: s.label,
      rate: `${(s.rate * 100).toFixed(0)}%`,
      taxableAmount: chunk.toFixed(2),
      tax: taxOnChunk.toFixed(2),
    });
  }

  // Section 87A Rebate: if taxable income <= 7,00,000, rebate covers up to ₹25,000
  let rebate87A = new Decimal(0);
  if (taxable.lessThanOrEqualTo(700000)) {
    rebate87A = Decimal.min(totalTaxBeforeCess, new Decimal(25000));
  }

  const taxAfterRebate = totalTaxBeforeCess.minus(rebate87A);
  const netTax = taxAfterRebate.greaterThan(0) ? taxAfterRebate : new Decimal(0);

  // 4% Health & Education Cess
  const cess = netTax.mul('0.04');
  const totalAnnualTax = netTax.plus(cess);
  const monthlyTDS = totalAnnualTax.div(12);

  return {
    regime: 'new',
    grossAnnualSalary: gross.toFixed(2),
    standardDeduction: stdDed.toFixed(2),
    totalExemptionsAndDeductions: stdDed.toFixed(2),
    taxableIncome: taxable.toFixed(2),
    taxBeforeCess: totalTaxBeforeCess.toFixed(2),
    rebate87A: rebate87A.toFixed(2),
    healthAndEduCess: cess.toFixed(2),
    totalAnnualTax: totalAnnualTax.toFixed(2),
    monthlyTDS: monthlyTDS.toFixed(2),
    slabBreakdown,
    deductionsBreakdown: {
      standardDeduction: stdDed.toFixed(2),
    },
  };
}

/**
 * Old Tax Regime with itemized Chapter VI-A deductions & HRA exemption.
 *
 * Slabs:
 * - Up to ₹2,50,000: Nil
 * - ₹2,50,001 - ₹5,00,000: 5%
 * - ₹5,00,001 - ₹10,00,000: 20%
 * - Above ₹10,00,000: 30%
 *
 * Section 87A: Max ₹12,500 rebate if taxable income <= ₹5,00,000.
 * Cess: 4%
 */
export function calculateOldRegimeTax(
  grossAnnualSalary: number | string,
  annualBasic: number | string,
  annualHRA: number | string,
  deductions: TaxDeductionInputs = {}
): RegimeTaxCalculation {
  const gross = new Decimal(grossAnnualSalary);
  const stdDed = new Decimal(50000); // Standard deduction under old regime

  // 1. Chapter VI-A Deductions with statutory caps
  const sec80C_capped = Decimal.min(new Decimal(deductions.sec80C || 0), new Decimal(150000));
  const sec80D_self_capped = Decimal.min(new Decimal(deductions.sec80D_self || 0), new Decimal(25000));
  const sec80D_parents_capped = Decimal.min(new Decimal(deductions.sec80D_parents || 0), new Decimal(50000));
  const sec80CCD_nps_capped = Decimal.min(new Decimal(deductions.sec80CCD_nps || 0), new Decimal(50000));
  const sec24b_capped = Decimal.min(new Decimal(deductions.sec24b_homeLoanInterest || 0), new Decimal(200000));

  // 2. HRA Exemption under Section 10(13A)
  const hraExemption = new Decimal(
    calculateHRAExemption(
      annualBasic,
      annualHRA,
      deductions.annualRentPaid || 0,
      deductions.isMetroCity ?? true
    )
  );

  const otherExemptions = new Decimal(deductions.otherExemptions || 0);

  const totalDeductions = stdDed
    .plus(sec80C_capped)
    .plus(sec80D_self_capped)
    .plus(sec80D_parents_capped)
    .plus(sec80CCD_nps_capped)
    .plus(sec24b_capped)
    .plus(hraExemption)
    .plus(otherExemptions);

  // Taxable income
  const taxableInc = gross.minus(totalDeductions);
  const taxable = taxableInc.greaterThan(0) ? taxableInc : new Decimal(0);

  // Old Regime Slabs
  const slabs = [
    { limit: 250000, rate: 0.0, label: 'Up to ₹2,50,000' },
    { limit: 250000, rate: 0.05, label: '₹2,50,001 - ₹5,00,000' },
    { limit: 500000, rate: 0.2, label: '₹5,00,001 - ₹10,00,000' },
    { limit: Infinity, rate: 0.3, label: 'Above ₹10,00,000' },
  ];

  let remaining = new Decimal(taxable.toFixed(2));
  let totalTaxBeforeCess = new Decimal(0);
  const slabBreakdown = [];

  for (const s of slabs) {
    if (remaining.lessThanOrEqualTo(0)) {
      slabBreakdown.push({
        slab: s.label,
        rate: `${(s.rate * 100).toFixed(0)}%`,
        taxableAmount: '0.00',
        tax: '0.00',
      });
      continue;
    }

    const chunk = s.limit === Infinity ? remaining : Decimal.min(remaining, new Decimal(s.limit));
    const taxOnChunk = chunk.mul(new Decimal(s.rate));
    totalTaxBeforeCess = totalTaxBeforeCess.plus(taxOnChunk);
    remaining = remaining.minus(chunk);

    slabBreakdown.push({
      slab: s.label,
      rate: `${(s.rate * 100).toFixed(0)}%`,
      taxableAmount: chunk.toFixed(2),
      tax: taxOnChunk.toFixed(2),
    });
  }

  // Section 87A: Max ₹12,500 if taxable <= ₹5,00,000
  let rebate87A = new Decimal(0);
  if (taxable.lessThanOrEqualTo(500000)) {
    rebate87A = Decimal.min(totalTaxBeforeCess, new Decimal(12500));
  }

  const taxAfterRebate = totalTaxBeforeCess.minus(rebate87A);
  const netTax = taxAfterRebate.greaterThan(0) ? taxAfterRebate : new Decimal(0);

  const cess = netTax.mul('0.04');
  const totalAnnualTax = netTax.plus(cess);
  const monthlyTDS = totalAnnualTax.div(12);

  return {
    regime: 'old',
    grossAnnualSalary: gross.toFixed(2),
    standardDeduction: stdDed.toFixed(2),
    totalExemptionsAndDeductions: totalDeductions.toFixed(2),
    taxableIncome: taxable.toFixed(2),
    taxBeforeCess: totalTaxBeforeCess.toFixed(2),
    rebate87A: rebate87A.toFixed(2),
    healthAndEduCess: cess.toFixed(2),
    totalAnnualTax: totalAnnualTax.toFixed(2),
    monthlyTDS: monthlyTDS.toFixed(2),
    slabBreakdown,
    deductionsBreakdown: {
      standardDeduction: stdDed.toFixed(2),
      sec80C: sec80C_capped.toFixed(2),
      sec80D_self: sec80D_self_capped.toFixed(2),
      sec80D_parents: sec80D_parents_capped.toFixed(2),
      sec80CCD_nps: sec80CCD_nps_capped.toFixed(2),
      sec24b_homeLoanInterest: sec24b_capped.toFixed(2),
      hraExemption: hraExemption.toFixed(2),
      otherExemptions: otherExemptions.toFixed(2),
    },
  };
}

/**
 * Side-by-side Regime Comparison & Recommendation
 */
export function compareTaxRegimes(
  grossAnnualSalary: number | string,
  annualBasic: number | string,
  annualHRA: number | string,
  deductions: TaxDeductionInputs = {}
): TaxComparisonResult {
  const newReg = calculateNewRegimeTax(grossAnnualSalary);
  const oldReg = calculateOldRegimeTax(grossAnnualSalary, annualBasic, annualHRA, deductions);

  const newTaxDec = new Decimal(newReg.totalAnnualTax);
  const oldTaxDec = new Decimal(oldReg.totalAnnualTax);

  const diffDec = newTaxDec.minus(oldTaxDec).abs();
  const monthlyDiffDec = diffDec.div(12);

  let recommendedRegime: 'new' | 'old';
  let recommendationReason: string;

  if (newTaxDec.lessThan(oldTaxDec)) {
    recommendedRegime = 'new';
    recommendationReason = `New Tax Regime saves ₹${diffDec.toFixed(2)} annually (₹${monthlyDiffDec.toFixed(2)}/mo) due to lower slab rates and ₹75,000 standard deduction.`;
  } else if (oldTaxDec.lessThan(newTaxDec)) {
    recommendedRegime = 'old';
    recommendationReason = `Old Tax Regime saves ₹${diffDec.toFixed(2)} annually (₹${monthlyDiffDec.toFixed(2)}/mo) through itemized Chapter VI-A deductions (80C, 80D, HRA).`;
  } else {
    recommendedRegime = 'new';
    recommendationReason = 'Both regimes result in the exact same tax liability. New Regime is recommended for zero documentation hassle.';
  }

  return {
    newRegime: newReg,
    oldRegime: oldReg,
    recommendedRegime,
    annualTaxDifference: diffDec.toFixed(2),
    monthlyTaxDifference: monthlyDiffDec.toFixed(2),
    recommendationReason,
  };
}

/**
 * Statutory EPF Calculator (Employee 12% + Employer 12%).
 *
 * Under EPFO rules:
 * - Basic wage ceiling: ₹15,000/month.
 * - If ceiling applied: eligible wage = min(Basic, 15000).
 * - Employee PF = 12% of eligible wage.
 * - Employer EPS (Pension) = 8.33% capped at ₹1,250.
 * - Employer EPF = 12% of eligible wage - Employer EPS (typically 3.67%).
 */
export function calculateEPF(
  monthlyBasic: number | string,
  applyWageCeiling: boolean = true,
  vpfPercentage: number | string = 0
): EPFCalculationResult {
  const basic = new Decimal(monthlyBasic);
  const ceiling = new Decimal(15000);

  const eligibleWage = applyWageCeiling ? Decimal.min(basic, ceiling) : basic;

  // 12% employee PF
  const employeePF = eligibleWage.mul('0.12');

  // Voluntary PF (VPF)
  const vpfPct = new Decimal(vpfPercentage);
  const vpfAmount = vpfPct.greaterThan(0) ? basic.mul(vpfPct.div(100)) : new Decimal(0);

  // Employer contribution: 12% total
  // EPS is 8.33% capped at 1250 (15000 * 0.0833 = 1250 max)
  const epsCap = new Decimal(1250);
  const epsCalc = eligibleWage.mul('0.0833');
  const employerEPS = applyWageCeiling ? Decimal.min(epsCalc, epsCap) : epsCalc;

  const totalEmployerPF = eligibleWage.mul('0.12');
  const employerEPF = totalEmployerPF.minus(employerEPS);

  return {
    eligibleWage: eligibleWage.toFixed(2),
    employeePF: employeePF.toFixed(2),
    employerEPS: employerEPS.toFixed(2),
    employerEPF: employerEPF.toFixed(2),
    totalEmployerPF: totalEmployerPF.toFixed(2),
    vpfAmount: vpfAmount.toFixed(2),
    isCeilingApplied: applyWageCeiling && basic.greaterThan(ceiling),
  };
}

/**
 * Statutory ESI Calculator.
 *
 * ESIC rules:
 * - Applicable only if Gross Monthly Salary <= ₹21,000.
 * - Employee contribution = 0.75% of Gross.
 * - Employer contribution = 3.25% of Gross.
 */
export function calculateESI(monthlyGross: number | string): ESICalculationResult {
  const gross = new Decimal(monthlyGross);
  const esiThreshold = new Decimal(21000);

  if (gross.greaterThan(esiThreshold)) {
    return {
      isApplicable: false,
      grossSalary: gross.toFixed(2),
      employeeESI: '0.00',
      employerESI: '0.00',
      totalESI: '0.00',
    };
  }

  const employeeESI = gross.mul('0.0075');
  const employerESI = gross.mul('0.0325');
  const totalESI = employeeESI.plus(employerESI);

  return {
    isApplicable: true,
    grossSalary: gross.toFixed(2),
    employeeESI: employeeESI.toFixed(2),
    employerESI: employerESI.toFixed(2),
    totalESI: totalESI.toFixed(2),
  };
}

/**
 * Professional Tax (PT) Calculator based on state rules.
 */
export function calculateProfessionalTax(
  monthlyGross: number | string,
  state: string = 'Karnataka',
  month: number = new Date().getMonth() + 1
): string {
  const gross = new Decimal(monthlyGross);
  const st = state.trim().toLowerCase();

  if (st.includes('karnataka')) {
    // Gross >= 25,000: 200, else Nil
    return gross.greaterThanOrEqualTo(25000) ? '200.00' : '0.00';
  }

  if (st.includes('maharashtra')) {
    // Gross <= 7500: Nil; 7500-10000: 175; > 10000: 200 (Feb: 300)
    if (gross.lessThan(7500)) return '0.00';
    if (gross.lessThanOrEqualTo(10000)) return '175.00';
    return month === 2 ? '300.00' : '200.00';
  }

  if (st.includes('telangana') || st.includes('andhra')) {
    // <= 15000: Nil; 15000-20000: 150; > 20000: 200
    if (gross.lessThan(15000)) return '0.00';
    if (gross.lessThanOrEqualTo(20000)) return '150.00';
    return '200.00';
  }

  if (st.includes('tamil nadu')) {
    return gross.greaterThanOrEqualTo(21000) ? '208.00' : '0.00';
  }

  // Delhi, Haryana, etc.: No PT
  return '0.00';
}
