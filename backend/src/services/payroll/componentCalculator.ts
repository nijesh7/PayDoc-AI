/**
 * ============================================================================
 * PAYDOC AI — Deterministic Salary Component & CTC Calculation Engine
 * ============================================================================
 * Implements pure functions for evaluating configurable salary components,
 * percentage rules, formulas, and CTC template breakdowns using high-precision Decimal.
 * Invariant: AI never estimates or calculates financial values.
 */

import { Decimal, D } from './decimal';

export type CalcType = 'fixed' | 'percent_of_basic' | 'percent_of_gross' | 'formula';
export type ComponentType = 'earning' | 'deduction';

export interface SalaryComponentDef {
  id?: string;
  name: string;
  code: string;
  component_type: ComponentType;
  calc_type: CalcType;
  default_value: number;
  formula?: string | null;
  is_taxable?: boolean;
  pf_applicable?: boolean;
  esi_applicable?: boolean;
  display_order?: number;
}

export interface EmployeeComponentAssignment {
  component_code: string;
  component_name: string;
  component_type: ComponentType;
  calc_type: CalcType;
  value: number;
  formula?: string | null;
}

export interface ComputedComponentItem {
  code: string;
  name: string;
  type: ComponentType;
  amount: number;
  calc_type: CalcType;
  formula_applied?: string;
}

export interface SalaryBreakdownResult {
  basicSalary: number;
  grossSalary: number;
  totalEarnings: number;
  totalDeductions: number;
  netSalary: number;
  earnings: ComputedComponentItem[];
  deductions: ComputedComponentItem[];
}

/**
 * Safely evaluates simple deterministic formula strings like:
 * - 'BASIC * 0.50'
 * - 'LEAST(BASIC, 15000) * 0.12'
 * - 'BASIC * 0.40 + 200'
 */
export function evaluateFormula(
  formula: string,
  variables: { BASIC: Decimal; GROSS?: Decimal }
): Decimal {
  let expr = formula.trim().toUpperCase();

  // Replace variable placeholders with exact decimal values
  expr = expr.replace(/\bBASIC\b/g, variables.BASIC.toString());
  if (variables.GROSS) {
    expr = expr.replace(/\bGROSS\b/g, variables.GROSS.toString());
  }

  // Handle LEAST(a, b)
  const leastRegex = /LEAST\s*\(\s*([\d.]+)\s*,\s*([\d.]+)\s*\)/g;
  expr = expr.replace(leastRegex, (_, a, b) => {
    return Decimal.min(a, b).toString();
  });

  // Handle GREATEST(a, b)
  const greatestRegex = /GREATEST\s*\(\s*([\d.]+)\s*,\s*([\d.]+)\s*\)/g;
  expr = expr.replace(greatestRegex, (_, a, b) => {
    return Decimal.max(a, b).toString();
  });

  // Strict whitelist check: expression must only contain digits, periods, and operators + - * / ( )
  if (!/^[\d\s.+\-*/()]+$/.test(expr)) {
    throw new Error(`Invalid formula syntax: "${formula}" contains illegal tokens`);
  }

  // Evaluate arithmetic using deterministic recursive descent or safe token evaluation
  return safeMathEval(expr);
}

/**
 * Deterministic safe mathematical expression parser for +, -, *, /
 */
function safeMathEval(expr: string): Decimal {
  // Simple tokenizer
  const tokens: string[] = [];
  let current = '';

  for (let i = 0; i < expr.length; i++) {
    const char = expr[i];
    if (char === ' ') continue;
    if (['+', '-', '*', '/', '(', ')'].includes(char)) {
      if (current) {
        tokens.push(current);
        current = '';
      }
      tokens.push(char);
    } else {
      current += char;
    }
  }
  if (current) tokens.push(current);

  let index = 0;

  function parseExpression(): Decimal {
    let result = parseTerm();
    while (index < tokens.length && (tokens[index] === '+' || tokens[index] === '-')) {
      const op = tokens[index++];
      const nextTerm = parseTerm();
      result = op === '+' ? result.plus(nextTerm) : result.minus(nextTerm);
    }
    return result;
  }

  function parseTerm(): Decimal {
    let result = parseFactor();
    while (index < tokens.length && (tokens[index] === '*' || tokens[index] === '/')) {
      const op = tokens[index++];
      const nextFactor = parseFactor();
      result = op === '*' ? result.times(nextFactor) : result.dividedBy(nextFactor);
    }
    return result;
  }

  function parseFactor(): Decimal {
    const token = tokens[index++];
    if (token === '(') {
      const sub = parseExpression();
      if (tokens[index++] !== ')') {
        throw new Error('Mismatched parentheses in formula');
      }
      return sub;
    }
    if (token === '-') {
      return parseFactor().times(-1);
    }
    const val = Number(token);
    if (isNaN(val)) {
      throw new Error(`Invalid numeric token in formula: ${token}`);
    }
    return D(token);
  }

  return parseExpression().round();
}

/**
 * Calculate the exact value of an individual salary component
 */
export function calculateComponentAmount(
  calcType: CalcType,
  value: number | Decimal,
  basicSalary: Decimal,
  grossSalary: Decimal = basicSalary,
  formula?: string | null
): Decimal {
  const decVal = value instanceof Decimal ? value : D(value);

  switch (calcType) {
    case 'fixed':
      return decVal.round();

    case 'percent_of_basic':
      // (BASIC * percentage) / 100
      return basicSalary.times(decVal).dividedBy(100).round();

    case 'percent_of_gross':
      // (GROSS * percentage) / 100
      return grossSalary.times(decVal).dividedBy(100).round();

    case 'formula':
      if (!formula || !formula.trim()) {
        return decVal.round();
      }
      return evaluateFormula(formula, { BASIC: basicSalary, GROSS: grossSalary }).round();

    default:
      return decVal.round();
  }
}

/**
 * Computes a comprehensive salary breakdown for an employee given their active components.
 * Deterministic formula:
 * Net Salary = Basic + Total Earnings - Total Deductions
 */
export function computeEmployeeSalaryBreakdown(
  baseSalary: number | Decimal,
  components: EmployeeComponentAssignment[]
): SalaryBreakdownResult {
  const basic = (baseSalary instanceof Decimal ? baseSalary : D(baseSalary)).round();
  
  // First pass: Calculate initial earnings to determine estimated Gross Salary
  let initialEarnings = basic;
  for (const c of components) {
    if (c.component_type === 'earning' && c.component_code !== 'BASIC') {
      if (c.calc_type === 'fixed') {
        initialEarnings = initialEarnings.plus(c.value);
      } else if (c.calc_type === 'percent_of_basic') {
        initialEarnings = initialEarnings.plus(basic.times(c.value).dividedBy(100));
      }
    }
  }
  const gross = initialEarnings.round();

  const computedEarnings: ComputedComponentItem[] = [
    {
      code: 'BASIC',
      name: 'Basic Salary',
      type: 'earning',
      amount: basic.toNumber(),
      calc_type: 'fixed',
    },
  ];

  let totalEarningsDec = basic;

  // Process all additional earnings
  for (const c of components) {
    if (c.component_type === 'earning' && c.component_code !== 'BASIC') {
      const amt = calculateComponentAmount(c.calc_type, c.value, basic, gross, c.formula);
      totalEarningsDec = totalEarningsDec.plus(amt);
      computedEarnings.push({
        code: c.component_code,
        name: c.component_name,
        type: 'earning',
        amount: amt.toNumber(),
        calc_type: c.calc_type,
        formula_applied: c.formula || undefined,
      });
    }
  }

  // Second pass: Calculate deductions
  const computedDeductions: ComputedComponentItem[] = [];
  let totalDeductionsDec = D(0);

  for (const c of components) {
    if (c.component_type === 'deduction') {
      const amt = calculateComponentAmount(c.calc_type, c.value, basic, totalEarningsDec, c.formula);
      totalDeductionsDec = totalDeductionsDec.plus(amt);
      computedDeductions.push({
        code: c.component_code,
        name: c.component_name,
        type: 'deduction',
        amount: amt.toNumber(),
        calc_type: c.calc_type,
        formula_applied: c.formula || undefined,
      });
    }
  }

  const netSalaryDec = totalEarningsDec.minus(totalDeductionsDec);

  return {
    basicSalary: basic.toNumber(),
    grossSalary: totalEarningsDec.toNumber(),
    totalEarnings: totalEarningsDec.toNumber(),
    totalDeductions: totalDeductionsDec.toNumber(),
    netSalary: Decimal.max(0, netSalaryDec).toNumber(),
    earnings: computedEarnings,
    deductions: computedDeductions,
  };
}

/**
 * Breaks down an annual or monthly CTC into standard Indian salary components:
 * - Basic Salary = 50% of Gross
 * - HRA = 50% of Basic
 * - Special Allowance = Balancing item
 * - PF = 12% of Basic (capped at ₹1,800/mo if standard)
 * - Professional Tax = ₹200/mo standard
 */
export function calculateStandardCTCBreakup(monthlyGross: number): {
  basic: number;
  hra: number;
  specialAllowance: number;
  pfEmployee: number;
  pt: number;
  totalEarnings: number;
  totalDeductions: number;
  netTakeHome: number;
} {
  const gross = D(monthlyGross).round();
  const basic = gross.times(0.50).round();
  const hra = basic.times(0.50).round();
  const pf = Decimal.min(basic, 15000).times(0.12).round();
  const pt = D(200);

  const allocated = basic.plus(hra);
  const specialAllowance = Decimal.max(0, gross.minus(allocated)).round();

  const totalEarnings = basic.plus(hra).plus(specialAllowance);
  const totalDeductions = pf.plus(pt);
  const netTakeHome = totalEarnings.minus(totalDeductions);

  return {
    basic: basic.toNumber(),
    hra: hra.toNumber(),
    specialAllowance: specialAllowance.toNumber(),
    pfEmployee: pf.toNumber(),
    pt: pt.toNumber(),
    totalEarnings: totalEarnings.toNumber(),
    totalDeductions: totalDeductions.toNumber(),
    netTakeHome: netTakeHome.toNumber(),
  };
}
