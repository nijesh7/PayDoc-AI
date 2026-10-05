import { Decimal } from '../payroll/decimal';

export interface AttendanceMonthlySummary {
  employeeId: string;
  month: number;
  year: number;
  totalCalendarDays: number;
  presentDays: number;
  absentDays: number;
  halfDays: number;
  paidLeaveDays: number;
  lopDays: number; // Loss of Pay days
  holidays: number;
  weekends: number;
  overtimeHours: number;
}

export interface LOPCalculationResult {
  dailyRate: string; // numeric(12,2)
  lopDays: string; // e.g. "2.00"
  leaveDeductionsAmount: string; // numeric(12,2)
  overtimeAmount: string; // numeric(12,2)
}

/**
 * Returns number of days in a given calendar month & year.
 */
export function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Deterministic Loss of Pay (LOP) and Overtime Calculation.
 *
 * Rules:
 * 1. Daily rate = Basic Salary / Days in Month (or configurable fixed divisor 30).
 * 2. LOP Deduction = Daily Rate * LOP Days (using Decimal with half-up rounding).
 * 3. Hourly Rate = Daily Rate / Standard Work Hours (e.g. 8 hours).
 * 4. OT Amount = Hourly Rate * OT Multiplier (default 2.0 for Indian factories/shops act or 1.5) * Overtime Hours.
 *
 * AI NEVER calculates money; only this deterministic function handles financial arithmetic.
 */
export function calculateLOPAndOvertime(
  basicSalary: number | string,
  lopDays: number | string,
  overtimeHours: number | string = 0,
  options: {
    month?: number;
    year?: number;
    divisorMode?: 'calendar_days' | 'standard_30' | 'working_days_26';
    workingDaysInMonth?: number;
    otMultiplier?: number;
    standardWorkHoursPerDay?: number;
  } = {}
): LOPCalculationResult {
  const basicDec = new Decimal(basicSalary);
  const lopDec = new Decimal(lopDays);
  const otHoursDec = new Decimal(overtimeHours);

  // 1. Determine divisor
  let divisor: number;
  if (options.divisorMode === 'standard_30') {
    divisor = 30;
  } else if (options.divisorMode === 'working_days_26') {
    divisor = 26;
  } else if (options.workingDaysInMonth && options.workingDaysInMonth > 0) {
    divisor = options.workingDaysInMonth;
  } else if (options.month && options.year) {
    divisor = getDaysInMonth(options.month, options.year);
  } else {
    divisor = 30; // fallback standard
  }

  const divisorDec = new Decimal(divisor);
  const dailyRateDec = basicDec.div(divisorDec);

  // 2. Compute LOP deduction
  const leaveDeductionsDec = dailyRateDec.mul(lopDec);

  // 3. Compute Overtime
  const workHoursPerDay = options.standardWorkHoursPerDay || 8;
  const hourlyRateDec = dailyRateDec.div(new Decimal(workHoursPerDay));
  const otMultiplier = options.otMultiplier || 1.5;
  const overtimeDec = hourlyRateDec.mul(new Decimal(otMultiplier)).mul(otHoursDec);

  return {
    dailyRate: dailyRateDec.toFixed(2),
    lopDays: lopDec.toFixed(2),
    leaveDeductionsAmount: leaveDeductionsDec.toFixed(2),
    overtimeAmount: overtimeDec.toFixed(2),
  };
}

/**
 * Aggregates daily attendance records for an employee in a given month.
 */
export function aggregateMonthlyAttendance(
  employeeId: string,
  month: number,
  year: number,
  records: Array<{
    date: string;
    status: 'present' | 'absent' | 'half_day' | 'holiday' | 'on_leave' | 'weekend';
    overtime_hours?: number;
    is_paid_leave?: boolean;
  }>
): AttendanceMonthlySummary {
  const totalCalendarDays = getDaysInMonth(month, year);

  let presentDays = 0;
  let absentDays = 0;
  let halfDays = 0;
  let paidLeaveDays = 0;
  let lopDays = 0;
  let holidays = 0;
  let weekends = 0;
  let overtimeHours = 0;

  for (const r of records) {
    overtimeHours += Number(r.overtime_hours || 0);

    switch (r.status) {
      case 'present':
        presentDays += 1;
        break;
      case 'absent':
        absentDays += 1;
        lopDays += 1; // Unapproved absence is treated as LOP
        break;
      case 'half_day':
        halfDays += 1;
        presentDays += 0.5;
        lopDays += 0.5;
        break;
      case 'on_leave':
        if (r.is_paid_leave === false) {
          lopDays += 1;
        } else {
          paidLeaveDays += 1;
        }
        break;
      case 'holiday':
        holidays += 1;
        break;
      case 'weekend':
        weekends += 1;
        break;
    }
  }

  return {
    employeeId,
    month,
    year,
    totalCalendarDays,
    presentDays,
    absentDays,
    halfDays,
    paidLeaveDays,
    lopDays,
    holidays,
    weekends,
    overtimeHours,
  };
}
