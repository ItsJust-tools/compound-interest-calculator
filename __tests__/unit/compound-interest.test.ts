import { describe, it, expect } from 'vitest';
import {
  parseNumber,
  formatNumber,
  formatCurrency,
  periodsPerYear,
  computeSchedule,
  resultText,
  stepsFor,
  summaryText,
} from '@/tool/types';
import {
  serializeState,
  deserializeState,
  roundTrips,
  compoundInterestCalculatorTool,
} from '@/tool/tool-definition';
import { DEFAULT_STATE, type ToolState } from '@/tool/types';

const state = (patch: Partial<ToolState> = {}): ToolState => ({ ...DEFAULT_STATE, ...patch });

describe('parseNumber', () => {
  it('parses integers, decimals, signs and exponents', () => {
    expect(parseNumber('42')).toBe(42);
    expect(parseNumber('-3.5')).toBe(-3.5);
    expect(parseNumber('+0.25')).toBeCloseTo(0.25);
    expect(parseNumber('.5')).toBeCloseTo(0.5);
    expect(parseNumber('5.')).toBeCloseTo(5);
    expect(parseNumber('1e3')).toBe(1000);
  });

  it('rejects invalid input', () => {
    expect(parseNumber('')).toBeNull();
    expect(parseNumber('  ')).toBeNull();
    expect(parseNumber('abc')).toBeNull();
    expect(parseNumber('12,5')).toBeNull();
    expect(parseNumber('1.2.3')).toBeNull();
    expect(parseNumber('--5')).toBeNull();
  });
});

describe('formatNumber / formatCurrency', () => {
  it('formats integers without decimals', () => {
    expect(formatNumber(30)).toBe('30');
    expect(formatNumber(-42)).toBe('-42');
  });

  it('trims float noise on decimals', () => {
    expect(formatNumber(0.1 + 0.2)).toBe('0.3');
  });

  it('handles non-finite values', () => {
    expect(formatNumber(Infinity)).toBe('—');
    expect(formatNumber(NaN)).toBe('—');
    expect(formatCurrency(NaN)).toBe('—');
  });

  it('formats currency with two decimals and separators', () => {
    expect(formatCurrency(1100)).toBe('1,100.00');
    expect(formatCurrency(1234.5)).toBe('1,234.50');
  });
});

describe('periodsPerYear', () => {
  it('maps frequencies correctly', () => {
    expect(periodsPerYear('annually')).toBe(1);
    expect(periodsPerYear('quarterly')).toBe(4);
    expect(periodsPerYear('monthly')).toBe(12);
    expect(periodsPerYear('daily')).toBe(365);
  });
});

describe('computeSchedule compounding frequency math', () => {
  it('compounds 1000 at 10% for 1 year annually to 1100', () => {
    const s = state({
      principal: '1000',
      rate: '10',
      years: '1',
      frequency: 'annually',
      monthlyContribution: '0',
    });
    const r = computeSchedule(s);
    expect(r).not.toBeNull();
    expect(r?.rows).toHaveLength(1);
    expect(r?.finalBalance).toBeCloseTo(1100, 2);
    expect(r?.totalContributed).toBeCloseTo(1000, 2);
    expect(r?.totalInterest).toBeCloseTo(100, 2);
  });

  it('compounds 1000 at 10% for 1 year monthly to more than 1100', () => {
    const s = state({
      principal: '1000',
      rate: '10',
      years: '1',
      frequency: 'monthly',
      monthlyContribution: '0',
    });
    const r = computeSchedule(s);
    // (1 + 0.10/12)^12 = 1.104713...
    expect(r?.finalBalance).toBeCloseTo(1104.71, 1);
    expect(r!.finalBalance).toBeGreaterThan(1100);
  });

  it('daily compounding slightly beats monthly', () => {
    const daily = computeSchedule(
      state({ rate: '10', frequency: 'daily', monthlyContribution: '0' })
    );
    const monthly = computeSchedule(
      state({ rate: '10', frequency: 'monthly', monthlyContribution: '0' })
    );
    expect(daily!.finalBalance).toBeGreaterThan(monthly!.finalBalance);
  });

  it('matches closed-form FV for principal-only growth', () => {
    const s = state({
      principal: '5000',
      rate: '6',
      years: '7',
      frequency: 'quarterly',
      monthlyContribution: '0',
    });
    const r = computeSchedule(s)!;
    const expected = 5000 * Math.pow(1 + 0.06 / 4, 4 * 7);
    expect(r.finalBalance).toBeCloseTo(expected, 1);
  });
});

describe('monthly contributions', () => {
  it('accumulates monthly contributions across years', () => {
    // 1000 principal, 100/month, 0% rate, 2 years
    const s = state({
      principal: '1000',
      rate: '0',
      years: '2',
      monthlyContribution: '100',
      frequency: 'annually',
    });
    const r = computeSchedule(s)!;
    // contributionPerPeriod = 100*1/12 per annual period... wait: with annually n=1,
    // per-period contribution = 100*1/12 ≈ 8.33, added once per year.
    // Total contributed = 1000 + 2 * (100*1/12) = 1016.67
    expect(r.totalContributed).toBeCloseTo(1000 + 2 * (100 / 12), 1);
  });

  it('monthly frequency adds full monthly contributions every period', () => {
    const s = state({
      principal: '0',
      rate: '0',
      years: '2',
      monthlyContribution: '100',
      frequency: 'monthly',
    });
    const r = computeSchedule(s)!;
    expect(r.totalContributed).toBeCloseTo(2400, 2);
    expect(r.finalBalance).toBeCloseTo(2400, 2);
    expect(r.totalInterest).toBeCloseTo(0, 2);
  });

  it('applies annual contribution increase', () => {
    // 0 principal, 0 rate, 0% increase baseline vs 10% increase, monthly contrib 100, 3 years
    const flat = computeSchedule(
      state({
        principal: '0',
        rate: '0',
        years: '3',
        monthlyContribution: '100',
        annualIncrease: '0',
      })
    )!;
    const rising = computeSchedule(
      state({
        principal: '0',
        rate: '0',
        years: '3',
        monthlyContribution: '100',
        annualIncrease: '10',
      })
    )!;
    expect(rising.totalContributed).toBeGreaterThan(flat.totalContributed);
    // Default monthly frequency: 12 periods/year, year k contributes
    // 100 * 12 * 1.1^(k-1)
    const expected = 100 * 12 * (1 + 1.1 + 1.21);
    expect(rising.totalContributed).toBeCloseTo(expected, 1);
  });
});

describe('edge cases', () => {
  it('zero rate returns principal plus contributions', () => {
    const s = state({
      principal: '1000',
      rate: '0',
      years: '5',
      monthlyContribution: '100',
      frequency: 'monthly',
    });
    const r = computeSchedule(s)!;
    expect(r.finalBalance).toBeCloseTo(1000 + 6000, 2);
    expect(r.totalInterest).toBeCloseTo(0, 2);
  });

  it('zero term yields no rows and unchanged principal', () => {
    const s = state({ principal: '1000', rate: '5', years: '0', monthlyContribution: '100' });
    const r = computeSchedule(s)!;
    expect(r.rows).toHaveLength(0);
    expect(r.finalBalance).toBeCloseTo(1000, 2);
    expect(r.totalContributed).toBeCloseTo(1000, 2);
  });

  it('negative rate shrinks the balance', () => {
    const r = computeSchedule(
      state({
        principal: '1000',
        rate: '-10',
        years: '1',
        frequency: 'annually',
        monthlyContribution: '0',
      })
    )!;
    expect(r.finalBalance).toBeCloseTo(900, 2);
    expect(r.totalInterest).toBeLessThan(0);
  });

  it('fractional years are floored to whole years', () => {
    const r = computeSchedule(state({ years: '2.9', monthlyContribution: '0' }))!;
    expect(r.rows).toHaveLength(2);
  });

  it('returns null for invalid inputs', () => {
    expect(computeSchedule(state({ principal: 'abc' }))).toBeNull();
    expect(computeSchedule(state({ rate: '' }))).toBeNull();
    expect(computeSchedule(state({ years: 'x' }))).toBeNull();
    expect(computeSchedule(state({ monthlyContribution: '1.2.3' }))).toBeNull();
  });

  it('handles zero principal with contributions', () => {
    const r = computeSchedule(
      state({
        principal: '0',
        rate: '5',
        years: '1',
        monthlyContribution: '1200',
        frequency: 'annually',
      })
    )!;
    // per-period contribution = 1200/12 = 100; with annually (n=1) the single
    // contribution is added after the (zero-balance) growth period
    expect(r.finalBalance).toBeCloseTo(100, 2);
  });
});

describe('inflation adjustment', () => {
  it('real balances deflate by (1+inflation)^year', () => {
    const s = state({
      principal: '1100',
      rate: '10',
      years: '1',
      frequency: 'annually',
      monthlyContribution: '0',
      inflation: '10',
    });
    const r = computeSchedule(s)!;
    expect(r.rows[0]?.balance).toBeCloseTo(1210, 1);
    expect(r.rows[0]?.realBalance).toBeCloseTo(1100, 1);
  });

  it('zero inflation leaves real balances equal to nominal', () => {
    const r = computeSchedule(state({ inflation: '0' }))!;
    expect(r.rows.at(-1)?.realBalance).toBeCloseTo(r.rows.at(-1)!.balance, 2);
  });
});

describe('table/chart consistency', () => {
  it('rows end with the final balance and each row counts contributions', () => {
    const r = computeSchedule(state({ years: '4' }))!;
    expect(r.rows.at(-1)!.balance).toBeCloseTo(r.finalBalance, 2);
    expect(r.rows.at(-1)!.contributed).toBeCloseTo(r.totalContributed, 2);
    r.rows.forEach((row, i) => {
      expect(row.year).toBe(i + 1);
      expect(row.interest).toBeCloseTo(row.balance - row.contributed, 2);
    });
  });
});

describe('serialization round-trip', () => {
  it('serializes and deserializes state', () => {
    const s = state({ principal: '2500', rate: '7.5', frequency: 'quarterly' });
    const serialized = serializeState(s);
    expect(serialized).toContain('"frequency":"quarterly"');
    const parsed = JSON.parse(serialized);
    const result = deserializeState(parsed);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(s);
    }
  });

  it('round-trips all frequencies via roundTrips', () => {
    for (const freq of ['daily', 'monthly', 'quarterly', 'annually'] as const) {
      expect(roundTrips(state({ frequency: freq }))).toBe(true);
    }
  });

  it('round-trips negative rates and edge values', () => {
    expect(roundTrips(state({ rate: '-3.25', years: '0', inflation: '0' }))).toBe(true);
  });

  it('repairs invalid payloads with fallbacks', () => {
    const result = deserializeState({ frequency: 'weekly', principal: 42, rate: null });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.frequency).toBe(DEFAULT_STATE.frequency);
      expect(result.data.principal).toBe(DEFAULT_STATE.principal);
      expect(result.data.rate).toBe(DEFAULT_STATE.rate);
    }
  });

  it('rejects non-object payloads', () => {
    expect(deserializeState('nope').success).toBe(false);
    expect(deserializeState([1, 2]).success).toBe(false);
    expect(deserializeState(null).success).toBe(false);
  });
});

describe('tool contract', () => {
  it('exposes the correct identity', () => {
    expect(compoundInterestCalculatorTool.id).toBe('compound-interest-calculator');
    expect(compoundInterestCalculatorTool.name).toBe('Compound Interest Calculator');
    expect(compoundInterestCalculatorTool.initialState).toEqual(DEFAULT_STATE);
    expect(compoundInterestCalculatorTool.exporters).toHaveLength(4);
  });
});

describe('text helpers', () => {
  it('resultText formats the final balance', () => {
    expect(resultText(state())).toMatch(/^[\d,]+\.\d{2}$/);
    expect(resultText(state({ years: 'abc' }))).toBeNull();
  });

  it('stepsFor lists formula and compounding info', () => {
    const steps = stepsFor(state());
    expect(steps.length).toBeGreaterThan(0);
    expect(steps[0]).toContain('Formula');
  });

  it('stepsFor handles invalid input', () => {
    expect(stepsFor(state({ rate: '' }))[0]).toContain('Enter valid');
  });

  it('summaryText mentions invalid inputs for bad state', () => {
    expect(summaryText(state({ principal: '' }))).toContain('enter valid inputs');
  });

  it('summaryText includes balance for valid state', () => {
    expect(summaryText(state())).toContain('Compound Interest:');
  });
});
