import assert from 'assert';
import {
  calculateLOPAndOvertime,
  getDaysInMonth,
  aggregateMonthlyAttendance,
} from '../services/attendance/lopCalculator';

console.log('\n============================================================');
console.log('       RUNNING PAYDOC AI PHASE 2 UNIT TESTS');
console.log('============================================================\n');

// 1. Days In Month Tests
console.log('--- Test Suite 1: Days In Month Calculation ---');
assert.strictEqual(getDaysInMonth(1, 2026), 31, 'January has 31 days');
assert.strictEqual(getDaysInMonth(2, 2026), 28, 'February 2026 has 28 days (non-leap)');
assert.strictEqual(getDaysInMonth(2, 2024), 29, 'February 2024 has 29 days (leap)');
assert.strictEqual(getDaysInMonth(4, 2026), 30, 'April has 30 days');
console.log('✓ Days in month calculations are accurate across leap/non-leap years.');

// 2. LOP Deduction Tests
console.log('\n--- Test Suite 2: Deterministic Loss of Pay (LOP) Deduction ---');
// Basic = 31000, Month = January (31 days). Daily rate = 1000.00. LOP days = 2. Deduction = 2000.00
const lop1 = calculateLOPAndOvertime(31000, 2, 0, { month: 1, year: 2026, divisorMode: 'calendar_days' });
assert.strictEqual(lop1.dailyRate, '1000.00');
assert.strictEqual(lop1.leaveDeductionsAmount, '2000.00');
assert.strictEqual(lop1.overtimeAmount, '0.00');

// Basic = 50000, Standard 30 days. Daily rate = 1666.67. LOP days = 1.5. Deduction = 2500.00
const lop2 = calculateLOPAndOvertime(50000, 1.5, 0, { divisorMode: 'standard_30' });
assert.strictEqual(lop2.dailyRate, '1666.67');
assert.strictEqual(lop2.leaveDeductionsAmount, '2500.00'); // 1666.6666... * 1.5 = 2500.00
console.log('✓ LOP deduction computed with exact half-up precision.');

// 3. Overtime Pay Tests
console.log('\n--- Test Suite 3: Overtime Pay Calculation ---');
// Basic = 48000, 24 working days, 8 hrs/day = 250/hr. OT multiplier = 2.0x. OT hours = 10 -> 250 * 2 * 10 = 5000.00
const ot1 = calculateLOPAndOvertime(48000, 0, 10, {
  workingDaysInMonth: 24,
  standardWorkHoursPerDay: 8,
  otMultiplier: 2.0,
});
assert.strictEqual(ot1.dailyRate, '2000.00');
assert.strictEqual(ot1.overtimeAmount, '5000.00');

// Overtime 0 hours
const ot2 = calculateLOPAndOvertime(50000, 0, 0);
assert.strictEqual(ot2.overtimeAmount, '0.00');
console.log('✓ Overtime pay computed deterministically.');

// 4. Monthly Attendance Aggregation Tests
console.log('\n--- Test Suite 4: Monthly Attendance Aggregation ---');
const summary = aggregateMonthlyAttendance('EMP-101', 10, 2026, [
  { date: '2026-10-01', status: 'present', overtime_hours: 2 },
  { date: '2026-10-02', status: 'holiday' },
  { date: '2026-10-03', status: 'weekend' },
  { date: '2026-10-04', status: 'weekend' },
  { date: '2026-10-05', status: 'present', overtime_hours: 1 },
  { date: '2026-10-06', status: 'half_day' }, // 0.5 present, 0.5 lop
  { date: '2026-10-07', status: 'absent' }, // 1.0 lop
  { date: '2026-10-08', status: 'on_leave', is_paid_leave: true }, // paid leave
  { date: '2026-10-09', status: 'on_leave', is_paid_leave: false }, // unpaid leave -> 1.0 lop
]);

assert.strictEqual(summary.presentDays, 2.5); // 1 + 1 + 0.5
assert.strictEqual(summary.lopDays, 2.5); // 0.5 (half_day) + 1.0 (absent) + 1.0 (unpaid leave)
assert.strictEqual(summary.paidLeaveDays, 1);
assert.strictEqual(summary.holidays, 1);
assert.strictEqual(summary.weekends, 2);
assert.strictEqual(summary.overtimeHours, 3);
console.log('✓ Attendance aggregation accurately tracks present, half-day, and unpaid LOP.');

console.log('\n============================================================');
console.log('   ALL PHASE 2 ATTENDANCE & LOP TESTS PASSED!');
console.log('============================================================\n');
