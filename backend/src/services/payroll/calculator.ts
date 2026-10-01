/**
 * ============================================================================
 * PAYDOC AI — Deterministic Payroll Calculation Engine
 * ============================================================================
 * CRITICAL INVARIANT: Payroll and financial arithmetic MUST NEVER be estimated
 * or performed by AI. All formulas are executed deterministically with exact
 * decimal precision.
 */

export interface EmployeeSalaryInput {
  basicSalary: number;
  salaryType: 'monthly' | 'hourly' | 'daily';
  daysWorked?: number;
  totalWorkingDays?: number;
  overtimeHours?: number;
  overtimeHourlyRate?: number;
  bonus?: number;
  allowances?: Array<{ name: string; amount: number; isPercentage?: boolean; percentageValue?: number }>;
  deductions?: Array<{ name: string; amount: number; isPercentage?: boolean; percentageValue?: number }>;
  advances?: number;
  unpaidLeaveDays?: number;
}

export interface PayrollCalculationResult {
  basicSalary: number;
  overtimeHours: number;
  overtimeAmount: number;
  bonusAmount: number;
  allowancesAmount: number;
  deductionsAmount: number;
  advancesAmount: number;
  leaveDeductionsAmount: number;
  grossSalary: number;
  netSalary: number;
  breakdown: {
    allowances: Array<{ name: string; amount: number }>;
    deductions: Array<{ name: string; amount: number }>;
  };
}

/**
 * 1. Calculate base earned salary based on salary type and attendance days
 */
export function calculateBasicSalary(
  baseAmount: number,
  salaryType: 'monthly' | 'hourly' | 'daily' = 'monthly',
  daysWorked: number = 30,
  totalWorkingDays: number = 30
): number {
  if (baseAmount < 0) return 0;
  if (salaryType === 'daily') {
    return roundToTwoDecimals(baseAmount * Math.max(0, daysWorked));
  }
  if (salaryType === 'hourly') {
    return roundToTwoDecimals(baseAmount * Math.max(0, daysWorked)); // hours in this context
  }
  // Monthly salary prorated if attendance days provided
  if (totalWorkingDays > 0 && daysWorked < totalWorkingDays) {
    return roundToTwoDecimals((baseAmount / totalWorkingDays) * daysWorked);
  }
  return roundToTwoDecimals(baseAmount);
}

/**
 * 2. Calculate overtime compensation
 */
export function calculateOvertime(
  overtimeHours: number = 0,
  hourlyRate?: number,
  baseMonthlySalary: number = 0,
  monthlyWorkingHours: number = 240
): number {
  if (overtimeHours <= 0) return 0;
  const effectiveHourlyRate = hourlyRate && hourlyRate > 0
    ? hourlyRate
    : (baseMonthlySalary > 0 ? (baseMonthlySalary / monthlyWorkingHours) * 1.5 : 0); // 1.5x standard OT multiplier
  return roundToTwoDecimals(overtimeHours * effectiveHourlyRate);
}

/**
 * 3. Calculate bonuses
 */
export function calculateBonus(bonus: number = 0): number {
  return roundToTwoDecimals(Math.max(0, bonus));
}

/**
 * 4. Calculate total recurring allowances (HRA, Special, Travel, Medical, etc.)
 */
export function calculateAllowances(
  allowances: Array<{ name: string; amount: number; isPercentage?: boolean; percentageValue?: number }> = [],
  baseSalary: number = 0
): { total: number; items: Array<{ name: string; amount: number }> } {
  let total = 0;
  const items: Array<{ name: string; amount: number }> = [];

  for (const item of allowances) {
    let itemAmount = 0;
    if (item.isPercentage && item.percentageValue !== undefined) {
      itemAmount = roundToTwoDecimals((baseSalary * item.percentageValue) / 100);
    } else {
      itemAmount = roundToTwoDecimals(Math.max(0, item.amount));
    }
    items.push({ name: item.name, amount: itemAmount });
    total += itemAmount;
  }

  return { total: roundToTwoDecimals(total), items };
}

/**
 * 5. Calculate statutory and custom deductions (PF, Tax, ESI, Professional Tax)
 */
export function calculateDeductions(
  deductions: Array<{ name: string; amount: number; isPercentage?: boolean; percentageValue?: number }> = [],
  baseSalary: number = 0
): { total: number; items: Array<{ name: string; amount: number }> } {
  let total = 0;
  const items: Array<{ name: string; amount: number }> = [];

  for (const item of deductions) {
    let itemAmount = 0;
    if (item.isPercentage && item.percentageValue !== undefined) {
      itemAmount = roundToTwoDecimals((baseSalary * item.percentageValue) / 100);
    } else {
      itemAmount = roundToTwoDecimals(Math.max(0, item.amount));
    }
    items.push({ name: item.name, amount: itemAmount });
    total += itemAmount;
  }

  return { total: roundToTwoDecimals(total), items };
}

/**
 * 6. Calculate salary advance recoveries
 */
export function calculateAdvance(advances: number = 0): number {
  return roundToTwoDecimals(Math.max(0, advances));
}

/**
 * 7. Calculate unpaid leave deductions
 */
export function calculateLeaveDeductions(
  unpaidLeaveDays: number = 0,
  baseMonthlySalary: number = 0,
  totalMonthDays: number = 30
): number {
  if (unpaidLeaveDays <= 0 || baseMonthlySalary <= 0 || totalMonthDays <= 0) return 0;
  const perDayRate = baseMonthlySalary / totalMonthDays;
  return roundToTwoDecimals(unpaidLeaveDays * perDayRate);
}

/**
 * 8. Comprehensive Net Salary Calculation
 * Formula: Net = Basic + Overtime + Bonus + Allowances - Deductions - Advances - Leave Deductions
 */
export function calculateNetSalary(input: EmployeeSalaryInput): PayrollCalculationResult {
  const basic = calculateBasicSalary(
    input.basicSalary,
    input.salaryType,
    input.daysWorked,
    input.totalWorkingDays
  );

  const overtime = calculateOvertime(
    input.overtimeHours,
    input.overtimeHourlyRate,
    input.basicSalary
  );

  const bonus = calculateBonus(input.bonus);
  const allowancesCalc = calculateAllowances(input.allowances, basic);
  const deductionsCalc = calculateDeductions(input.deductions, basic);
  const advances = calculateAdvance(input.advances);
  const leaveDeductions = calculateLeaveDeductions(
    input.unpaidLeaveDays,
    input.basicSalary,
    input.totalWorkingDays
  );

  const grossSalary = roundToTwoDecimals(basic + overtime + bonus + allowancesCalc.total);
  const totalSubtractions = roundToTwoDecimals(
    deductionsCalc.total + advances + leaveDeductions
  );
  const netSalary = roundToTwoDecimals(Math.max(0, grossSalary - totalSubtractions));

  return {
    basicSalary: basic,
    overtimeHours: input.overtimeHours || 0,
    overtimeAmount: overtime,
    bonusAmount: bonus,
    allowancesAmount: allowancesCalc.total,
    deductionsAmount: deductionsCalc.total,
    advancesAmount: advances,
    leaveDeductionsAmount: leaveDeductions,
    grossSalary,
    netSalary,
    breakdown: {
      allowances: allowancesCalc.items,
      deductions: deductionsCalc.items,
    },
  };
}

/**
 * Helper to ensure deterministic two-decimal financial precision
 */
function roundToTwoDecimals(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}
