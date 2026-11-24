export type Frequency = 'daily' | 'monthly' | 'quarterly' | 'annually';

export interface ToolState {
  /** Initial balance (principal) as a string. */
  principal: string;
  /** Annual nominal interest rate in percent as a string (may be negative). */
  rate: string;
  /** Term in years as a string. */
  years: string;
  /** Compounding frequency. */
  frequency: Frequency;
  /** Recurring monthly contribution as a string. */
  monthlyContribution: string;
  /** Annual contribution increase in percent as a string. */
  annualIncrease: string;
  /** Annual inflation rate in percent as a string (for real-value display). */
  inflation: string;
}

export const DEFAULT_STATE: ToolState = {
  principal: '1000',
  rate: '5',
  years: '10',
  frequency: 'monthly',
  monthlyContribution: '100',
  annualIncrease: '0',
  inflation: '2',
};

export const FREQUENCIES: { value: Frequency; label: string; periodsPerYear: number }[] = [
  { value: 'daily', label: 'Daily', periodsPerYear: 365 },
  { value: 'monthly', label: 'Monthly', periodsPerYear: 12 },
  { value: 'quarterly', label: 'Quarterly', periodsPerYear: 4 },
  { value: 'annually', label: 'Annually', periodsPerYear: 1 },
];

/** Parse a plain decimal number; returns null for empty/unparseable input. */
export function parseNumber(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (!/^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/.test(trimmed)) return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

/** Format a number without float noise where possible. */
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '—';
  if (Number.isInteger(value) && Math.abs(value) < 1e15) return String(value);
  if (Math.abs(value) >= 1e15 || (Math.abs(value) < 1e-6 && value !== 0)) {
    return value.toExponential(6).replace(/e([+-])(\d)$/, 'e$10$2');
  }
  return String(Number(value.toFixed(10)));
}

/** Currency-style formatting with two decimals and thousands separators. */
export function formatCurrency(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function periodsPerYear(frequency: Frequency): number {
  return FREQUENCIES.find((f) => f.value === frequency)?.periodsPerYear ?? 12;
}

export interface ScheduleRow {
  /** 1-based year this row completes. */
  year: number;
  /** Nominal balance at the end of the year. */
  balance: number;
  /** Inflation-adjusted (today's money) balance at the end of the year. */
  realBalance: number;
  /** Total money contributed (including principal) up to this year. */
  contributed: number;
  /** Interest earned up to this year (balance − contributed). */
  interest: number;
}

export interface ScheduleResult {
  /** Year-by-year rows, one per completed year. Empty for zero/invalid term. */
  rows: ScheduleRow[];
  /** Final nominal balance. */
  finalBalance: number;
  /** Total contributed (principal + all contributions). */
  totalContributed: number;
  /** Final balance − total contributed. */
  totalInterest: number;
}

/** Round to cents to keep simulated balances stable. */
function toCents(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Simulate compound growth of `principal` at `rate` percent per year,
 * compounded `frequency` times per year, with monthly contributions that
 * optionally increase by `annualIncrease` percent each year, all adjusted
 * for `inflation` percent annual price growth in the real-value column.
 *
 * Zero rate returns principal plus contributions. Contributions are added at
 * the end of each compounding period.
 */
export function computeSchedule(state: ToolState): ScheduleResult | null {
  const principal = parseNumber(state.principal);
  const rate = parseNumber(state.rate);
  const yearsInput = parseNumber(state.years);
  const monthly = parseNumber(state.monthlyContribution);
  const increase = parseNumber(state.annualIncrease);
  const inflation = parseNumber(state.inflation);
  if (
    principal === null ||
    rate === null ||
    yearsInput === null ||
    monthly === null ||
    increase === null ||
    inflation === null
  ) {
    return null;
  }

  const years = Math.max(0, Math.floor(yearsInput));
  const n = periodsPerYear(state.frequency);
  const isInflationReal = inflation !== 0; // real display requested
  const deflatorStep = isInflationReal ? 1 + inflation / 100 : 1;

  let balance = toCents(principal);
  let contributed = toCents(principal);
  const rows: ScheduleRow[] = [];

  for (let year = 1; year <= years; year++) {
    const yearContributionMonthly = toCents(monthly * Math.pow(1 + increase / 100, year - 1));
    const contributionPerPeriod = toCents((yearContributionMonthly * n) / 12);
    const periodsInYear = n;
    for (let p = 0; p < periodsInYear; p++) {
      if (rate !== 0) {
        balance = toCents(balance * (1 + rate / 100 / n));
      }
      balance = toCents(balance + contributionPerPeriod);
      contributed = toCents(contributed + contributionPerPeriod);
    }
    const realBalance = isInflationReal ? balance / Math.pow(deflatorStep, year) : balance;
    rows.push({
      year,
      balance,
      realBalance: toCents(realBalance),
      contributed,
      interest: toCents(balance - contributed),
    });
  }

  const finalBalance = balance;
  const totalContributed = contributed;
  return {
    rows,
    finalBalance,
    totalContributed,
    totalInterest: toCents(finalBalance - totalContributed),
  };
}

export interface GrowthBreakdown {
  finalBalance: number;
  realBalance: number;
  totalContributed: number;
  totalInterest: number;
}

/** Human-readable result for the status bar, or null when inputs are invalid. */
export function resultText(state: ToolState): string | null {
  const schedule = computeSchedule(state);
  if (!schedule) return null;
  return formatCurrency(schedule.finalBalance);
}

/** Step lines explaining the computation for the current inputs. */
export function stepsFor(state: ToolState): string[] {
  const principal = parseNumber(state.principal);
  const rate = parseNumber(state.rate);
  const yearsInput = parseNumber(state.years);
  const monthly = parseNumber(state.monthlyContribution);
  if (principal === null || rate === null || yearsInput === null || monthly === null) {
    return ['Enter valid numbers for principal, rate, term and contributions to see the steps.'];
  }
  const years = Math.max(0, Math.floor(yearsInput));
  const n = periodsPerYear(state.frequency);
  const schedule = computeSchedule(state);
  if (!schedule) return ['Enter valid inputs to see the steps.'];
  const steps = [
    `Formula: balance = principal × (1 + r/n)^(n×t) + contributions per period`,
    `Compounding: ${n} period${n === 1 ? '' : 's'} per year over ${years} year${years === 1 ? '' : 's'}`,
  ];
  if (monthly > 0) {
    const contributionPerPeriod = toCents((monthly * n) / 12);
    steps.push(`Contribution: ${formatCurrency(contributionPerPeriod)} per compounding period`);
  }
  steps.push(`Final balance: ${formatCurrency(schedule.finalBalance)}`);
  return steps;
}

/** Compact summary used by the status bar and copy actions. */
export function summaryText(state: ToolState): string {
  const schedule = computeSchedule(state);
  if (!schedule) return 'Compound Interest: enter valid inputs';
  return `Compound Interest: ${formatCurrency(schedule.finalBalance)} (contributed ${formatCurrency(
    schedule.totalContributed
  )}, interest ${formatCurrency(schedule.totalInterest)})`;
}
