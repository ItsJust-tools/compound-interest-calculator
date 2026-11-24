import type { Tool, DeserializeResult } from '@itsjust/core';
import toolConfig from './tool.config';
import {
  DEFAULT_STATE,
  computeSchedule,
  formatCurrency,
  resultText,
  stepsFor,
  summaryText,
  type Frequency,
  type ToolState,
} from './types';

const VALID_FREQUENCIES: Frequency[] = ['daily', 'monthly', 'quarterly', 'annually'];

/** Serialize tool state into a compact JSON string for share/import. */
export function serializeState(state: ToolState): string {
  return JSON.stringify({
    principal: state.principal,
    rate: state.rate,
    years: state.years,
    frequency: state.frequency,
    monthlyContribution: state.monthlyContribution,
    annualIncrease: state.annualIncrease,
    inflation: state.inflation,
  });
}

function stringOr(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

/** Validate and recover tool state from an arbitrary payload. */
export function deserializeState(data: unknown): DeserializeResult<ToolState> {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return {
      success: false,
      error: 'Invalid data format: expected compound interest calculator state object',
    };
  }
  const v = data as Record<string, unknown>;
  const frequency: Frequency = VALID_FREQUENCIES.includes(v.frequency as Frequency)
    ? (v.frequency as Frequency)
    : DEFAULT_STATE.frequency;
  const state: ToolState = {
    principal: stringOr(v.principal, DEFAULT_STATE.principal),
    rate: stringOr(v.rate, DEFAULT_STATE.rate),
    years: stringOr(v.years, DEFAULT_STATE.years),
    frequency,
    monthlyContribution: stringOr(v.monthlyContribution, DEFAULT_STATE.monthlyContribution),
    annualIncrease: stringOr(v.annualIncrease, DEFAULT_STATE.annualIncrease),
    inflation: stringOr(v.inflation, DEFAULT_STATE.inflation),
  };
  return { success: true, data: state };
}

/** True when a serialized string round-trips back to the same state. */
export function roundTrips(state: ToolState): boolean {
  try {
    const restored = deserializeState(JSON.parse(serializeState(state)));
    return restored.success && JSON.stringify(restored.data) === JSON.stringify(state);
  } catch {
    return false;
  }
}

export const compoundInterestCalculatorTool: Tool<ToolState> = {
  id: toolConfig.id,
  name: toolConfig.name,
  version: toolConfig.version,
  config: toolConfig,
  initialState: { ...DEFAULT_STATE },
  serialize: serializeState,
  deserialize: deserializeState,
  exporters: [
    { format: 'png', loader: () => import('./exporters/png') },
    { format: 'jpeg', loader: () => import('./exporters/jpeg') },
    { format: 'webp', loader: () => import('./exporters/webp') },
    { format: 'pdf', loader: () => import('./exporters/pdf') },
  ],
};

export { computeSchedule, resultText, stepsFor, summaryText, formatCurrency };
