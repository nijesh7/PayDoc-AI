/**
 * ============================================================================
 * PAYDOC AI — Phase 1 Unit Tests: Financial Precision & Approvals Engine
 * ============================================================================
 * Tests:
 * 1. Decimal arithmetic (numeric(12,2) exact precision, half-up rounding, IEEE-754 immunity)
 * 2. Formula evaluation (BASIC * 0.5, LEAST(BASIC, 15000) * 0.12)
 * 3. Component calculations (fixed, % of basic, % of gross)
 * 4. Standard Indian CTC breakdown
 * 5. Deterministic employee salary breakdown calculation
 */

import { Decimal, D } from '../services/payroll/decimal';
import {
  evaluateFormula,
  calculateComponentAmount,
  computeEmployeeSalaryBreakdown,
  calculateStandardCTCBreakup,
  EmployeeComponentAssignment,
} from '../services/payroll/componentCalculator';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`TEST FAILED: ${msg}`);
  }
}

function assertEqual(actual: any, expected: any, msg: string) {
  if (actual !== expected) {
    throw new Error(`TEST FAILED [${msg}]: Expected "${expected}", got "${actual}"`);
  }
}

export function runPhase1Tests(): void {
  console.log('\n============================================================');
  console.log('       RUNNING PAYDOC AI PHASE 1 UNIT TESTS');
  console.log('============================================================\n');

  let passed = 0;

  // --------------------------------------------------------------------------
  // TEST SUITE 1: Decimal Precision Math
  // --------------------------------------------------------------------------
  console.log('--- Test Suite 1: High-Precision Decimal Math ---');

  // 1.1 IEEE 754 immunity (0.1 + 0.2 === 0.30)
  const sum = D('0.1').plus('0.2');
  assertEqual(sum.toFixed(2), '0.30', '0.1 + 0.2 must equal 0.30 exactly');
  passed++;

  // 1.2 Exact numeric(12,2) multiplication with half-up rounding
  const mult = D('100.555').times('2');
  assertEqual(mult.toFixed(2), '201.11', 'Half-up rounding check');
  passed++;

  // 1.3 Division precision
  const div = D('1000').dividedBy('3');
  assertEqual(div.toFixed(2), '333.33', '1000 / 3 must equal 333.33');
  passed++;

  // 1.4 Large financial amounts without overflow
  const largeSalary = D('999999999.99').plus('0.01');
  assertEqual(largeSalary.toFixed(2), '1000000000.00', 'Large financial bounds');
  passed++;

  // 1.5 Min and Max comparisons
  assertEqual(Decimal.min('15000', '25000').toNumber(), 15000, 'Decimal.min');
  assertEqual(Decimal.max('15000', '25000').toNumber(), 25000, 'Decimal.max');
  passed++;

  // --------------------------------------------------------------------------
  // TEST SUITE 2: Formula Parser & Evaluation
  // --------------------------------------------------------------------------
  console.log('\n--- Test Suite 2: Formula Parser & Evaluation ---');

  // 2.1 HRA Formula: BASIC * 0.50
  const hraResult = evaluateFormula('BASIC * 0.50', { BASIC: D(50000) });
  assertEqual(hraResult.toNumber(), 25000, 'HRA: 50% of 50000 is 25000');
  passed++;

  // 2.2 PF Capped Formula: LEAST(BASIC, 15000) * 0.12
  const pfHigh = evaluateFormula('LEAST(BASIC, 15000) * 0.12', { BASIC: D(50000) });
  assertEqual(pfHigh.toNumber(), 1800, 'PF on 50,000 capped at 15,000 * 0.12 = 1,800');
  passed++;

  const pfLow = evaluateFormula('LEAST(BASIC, 15000) * 0.12', { BASIC: D(10000) });
  assertEqual(pfLow.toNumber(), 1200, 'PF on 10,000 is 10,000 * 0.12 = 1,200');
  passed++;

  // 2.3 Combined arithmetic formula
  const custom = evaluateFormula('(BASIC * 0.40) + 1500', { BASIC: D(30000) });
  assertEqual(custom.toNumber(), 13500, 'Formula: 30000 * 0.40 + 1500 = 13500');
  passed++;

  // --------------------------------------------------------------------------
  // TEST SUITE 3: Component Calculations
  // --------------------------------------------------------------------------
  console.log('\n--- Test Suite 3: Component Calculations ---');

  // 3.1 Fixed allowance
  const fixed = calculateComponentAmount('fixed', 5000, D(20000));
  assertEqual(fixed.toNumber(), 5000, 'Fixed component');
  passed++;

  // 3.2 Percent of Basic
  const pctBasic = calculateComponentAmount('percent_of_basic', 25, D(40000));
  assertEqual(pctBasic.toNumber(), 10000, '25% of Basic (40000) = 10000');
  passed++;

  // 3.3 Percent of Gross
  const pctGross = calculateComponentAmount('percent_of_gross', 10, D(20000), D(50000));
  assertEqual(pctGross.toNumber(), 5000, '10% of Gross (50000) = 5000');
  passed++;

  // --------------------------------------------------------------------------
  // TEST SUITE 4: Standard Indian CTC Breakup
  // --------------------------------------------------------------------------
  console.log('\n--- Test Suite 4: Standard Indian CTC Breakup ---');

  const ctcBreakup = calculateStandardCTCBreakup(60000);
  assertEqual(ctcBreakup.basic, 30000, 'Basic is 50% of 60,000 = 30,000');
  assertEqual(ctcBreakup.hra, 15000, 'HRA is 50% of Basic = 15,000');
  assertEqual(ctcBreakup.specialAllowance, 15000, 'Special Allowance balances to 60,000');
  assertEqual(ctcBreakup.pfEmployee, 1800, 'PF Employee capped at 1,800');
  assertEqual(ctcBreakup.pt, 200, 'Professional Tax is 200');
  assertEqual(ctcBreakup.totalEarnings, 60000, 'Total Earnings equals Gross');
  assertEqual(ctcBreakup.totalDeductions, 2000, 'Total Deductions = 1800 + 200 = 2000');
  assertEqual(ctcBreakup.netTakeHome, 58000, 'Net Take-Home = 60,000 - 2,000 = 58,000');
  passed++;

  // --------------------------------------------------------------------------
  // TEST SUITE 5: Full Employee Salary Breakdown
  // --------------------------------------------------------------------------
  console.log('\n--- Test Suite 5: Full Employee Salary Breakdown ---');

  const employeeComponents: EmployeeComponentAssignment[] = [
    {
      component_code: 'HRA',
      component_name: 'House Rent Allowance',
      component_type: 'earning',
      calc_type: 'percent_of_basic',
      value: 50,
    },
    {
      component_code: 'SPECIAL',
      component_name: 'Special Allowance',
      component_type: 'earning',
      calc_type: 'fixed',
      value: 12500,
    },
    {
      component_code: 'CONVEYANCE',
      component_name: 'Conveyance Allowance',
      component_type: 'earning',
      calc_type: 'fixed',
      value: 1600,
    },
    {
      component_code: 'PF_EMP',
      component_name: 'Provident Fund (Employee)',
      component_type: 'deduction',
      calc_type: 'formula',
      value: 0,
      formula: 'LEAST(BASIC, 15000) * 0.12',
    },
    {
      component_code: 'PT',
      component_name: 'Professional Tax',
      component_type: 'deduction',
      calc_type: 'fixed',
      value: 200,
    },
    {
      component_code: 'TDS',
      component_name: 'Tax Deducted at Source',
      component_type: 'deduction',
      calc_type: 'fixed',
      value: 2500,
    },
  ];

  const breakdown = computeEmployeeSalaryBreakdown(35000, employeeComponents);
  assertEqual(breakdown.basicSalary, 35000, 'Basic is 35,000');
  // Earnings: Basic (35000) + HRA (17500) + Special (12500) + Conveyance (1600) = 66,600
  assertEqual(breakdown.grossSalary, 66600, 'Gross salary = 66,600');
  // Deductions: PF (1800) + PT (200) + TDS (2500) = 4,500
  assertEqual(breakdown.totalDeductions, 4500, 'Total deductions = 4,500');
  // Net: 66,600 - 4,500 = 62,100
  assertEqual(breakdown.netSalary, 62100, 'Net salary = 62,100');
  passed++;

  console.log(`\n============================================================`);
  console.log(`   ALL ${passed} PHASE 1 FINANCIAL MATH TESTS PASSED!`);
  console.log(`============================================================\n`);
}

// Execute directly if run as a script
if (require.main === module) {
  try {
    runPhase1Tests();
  } catch (err: any) {
    console.error(err.message);
    process.exit(1);
  }
}
