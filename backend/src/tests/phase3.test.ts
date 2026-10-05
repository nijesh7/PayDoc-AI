import assert from 'assert';
import {
  calculateNewRegimeTax,
  calculateOldRegimeTax,
  compareTaxRegimes,
  calculateHRAExemption,
  calculateEPF,
  calculateESI,
  calculateProfessionalTax,
} from '../services/tax/indianTaxCalculator';

console.log('\n============================================================');
console.log('       RUNNING PAYDOC AI PHASE 3 UNIT TESTS');
console.log('============================================================\n');

// 1. New Tax Regime Tests
console.log('--- Test Suite 1: New Tax Regime (Section 115BAC) ---');

// Test Case 1.1: Gross ₹7,50,000 (Standard deduction ₹75,000 -> Taxable ₹6,75,000 -> 87A rebate applies -> Tax ₹0.00)
const newReg1 = calculateNewRegimeTax(750000);
assert.strictEqual(newReg1.standardDeduction, '75000.00');
assert.strictEqual(newReg1.taxableIncome, '675000.00');
assert.strictEqual(newReg1.totalAnnualTax, '0.00', 'Gross 7.5L is completely tax-free under New Regime');
assert.strictEqual(newReg1.monthlyTDS, '0.00');
console.log('✓ Section 87A rebate verified: ₹7.5L gross yields exactly ₹0 tax.');

// Test Case 1.2: Gross ₹15,00,000 -> Std Ded ₹75,000 -> Taxable ₹14,25,000
// Slabs: 0-3L @0% (0), 3-7L @5% (20k), 7-10L @10% (30k), 10-12L @15% (30k), 12-14.25L @20% (45k) = 1,25,000.
// Cess @4% = 5,000 -> Total = 1,30,000.00
const newReg2 = calculateNewRegimeTax(1500000);
assert.strictEqual(newReg2.taxableIncome, '1425000.00');
assert.strictEqual(newReg2.taxBeforeCess, '125000.00');
assert.strictEqual(newReg2.healthAndEduCess, '5000.00');
assert.strictEqual(newReg2.totalAnnualTax, '130000.00');
assert.strictEqual(newReg2.monthlyTDS, '10833.33');
console.log('✓ High income New Regime progressive tax calculated accurately.');

// 2. Old Tax Regime & HRA Tests
console.log('\n--- Test Suite 2: Old Tax Regime & Section 10(13A) HRA ---');
// HRA Inputs: Basic = 4,80,000, Actual HRA = 1,92,000, Rent Paid = 2,40,000 (Metro)
// 1. Actual HRA = 1,92,000
// 2. Rent - 10% basic = 2,40,000 - 48,000 = 1,92,000
// 3. 50% basic = 2,40,000
// Min = 1,92,000
const hraExemption = calculateHRAExemption(480000, 192000, 240000, true);
assert.strictEqual(hraExemption, '192000.00');
console.log('✓ Section 10(13A) HRA least-of-three rule passed.');

// Old Regime calculation with full 80C, 80D, 24b, and HRA
const oldReg = calculateOldRegimeTax(1500000, 480000, 192000, {
  sec80C: 150000,
  sec80D_self: 25000,
  sec80D_parents: 50000,
  sec24b_homeLoanInterest: 200000,
  annualRentPaid: 240000,
  isMetroCity: true,
});
// Total Deductions = 50,000 (std) + 1.5L + 25k + 50k + 2L + 1.92L = 6,67,000
assert.strictEqual(oldReg.totalExemptionsAndDeductions, '667000.00');
assert.strictEqual(oldReg.taxableIncome, '833000.00');
console.log('✓ Old Regime deductions capped and calculated accurately.');

// 3. Regime Comparison
console.log('\n--- Test Suite 3: Side-by-Side Regime Comparison ---');
const comp = compareTaxRegimes(1500000, 480000, 192000, {
  sec80C: 150000,
  sec80D_self: 25000,
  annualRentPaid: 240000,
  isMetroCity: true,
});
assert.ok(comp.recommendedRegime === 'new' || comp.recommendedRegime === 'old');
assert.ok(Number(comp.annualTaxDifference) >= 0);
console.log(`✓ Comparison engine recommended: ${comp.recommendedRegime.toUpperCase()} regime (${comp.recommendationReason})`);

// 4. Statutory EPF Tests
console.log('\n--- Test Suite 4: Statutory EPF & Wage Ceiling ---');
// Basic 50,000 with ₹15,000 wage ceiling -> 12% of 15,000 = 1,800.00
const epfCeiling = calculateEPF(50000, true);
assert.strictEqual(epfCeiling.eligibleWage, '15000.00');
assert.strictEqual(epfCeiling.employeePF, '1800.00');
assert.strictEqual(epfCeiling.totalEmployerPF, '1800.00');
assert.strictEqual(epfCeiling.isCeilingApplied, true);

// Basic 50,000 without ceiling -> 12% of 50,000 = 6,000.00
const epfNoCeiling = calculateEPF(50000, false);
assert.strictEqual(epfNoCeiling.employeePF, '6000.00');
assert.strictEqual(epfNoCeiling.isCeilingApplied, false);
console.log('✓ EPF statutory ceiling logic passed.');

// 5. Statutory ESI Tests
console.log('\n--- Test Suite 5: Statutory ESI Eligibility ---');
// Gross 18,000 (<= 21,000 threshold) -> Employee: 18000 * 0.0075 = 135.00, Employer: 18000 * 0.0325 = 585.00
const esiEligible = calculateESI(18000);
assert.strictEqual(esiEligible.isApplicable, true);
assert.strictEqual(esiEligible.employeeESI, '135.00');
assert.strictEqual(esiEligible.employerESI, '585.00');

// Gross 35,000 (> 21,000 threshold) -> Ineligible
const esiIneligible = calculateESI(35000);
assert.strictEqual(esiIneligible.isApplicable, false);
assert.strictEqual(esiIneligible.employeeESI, '0.00');
console.log('✓ ESI ₹21,000 wage ceiling applicability passed.');

// 6. Professional Tax Tests
console.log('\n--- Test Suite 6: Professional Tax (PT) Slabs ---');
assert.strictEqual(calculateProfessionalTax(30000, 'Karnataka'), '200.00');
assert.strictEqual(calculateProfessionalTax(20000, 'Karnataka'), '0.00');
assert.strictEqual(calculateProfessionalTax(30000, 'Maharashtra', 2), '300.00', 'Feb in Maharashtra is ₹300');
assert.strictEqual(calculateProfessionalTax(30000, 'Maharashtra', 5), '200.00');
assert.strictEqual(calculateProfessionalTax(30000, 'Delhi'), '0.00', 'Delhi has no PT');
console.log('✓ Professional Tax state slabs passed.');

console.log('\n============================================================');
console.log('   ALL PHASE 3 STATUTORY TAX TESTS PASSED!');
console.log('============================================================\n');
