import { DEFAULT_STATE, FREQUENCIES, type Frequency, type ToolState } from './types';

export { FREQUENCIES };

/** Compact UI state for the canvas inputs. */
export type { ToolState, Frequency };

export const MODES: { value: Frequency; label: string }[] = FREQUENCIES.map((f) => ({
  value: f.value,
  label: f.label,
}));

export const UI_DEFAULT_STATE: ToolState = DEFAULT_STATE;

export function isState(value: unknown): value is ToolState {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Partial<ToolState>;
  return (
    typeof v.principal === 'string' &&
    typeof v.rate === 'string' &&
    typeof v.years === 'string' &&
    typeof v.frequency === 'string'
  );
}
