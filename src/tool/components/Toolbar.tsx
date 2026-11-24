'use client';

import React from 'react';
import { computeSchedule, formatCurrency } from '../types';
import type { ToolState } from '../types';

interface ToolbarProps {
  state: ToolState;
  onChange?: (next: ToolState) => void;
  onClear?: () => void;
  onCopy?: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ state, onChange, onClear, onCopy }) => {
  void state;
  void onChange;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
      <div
        className="flex items-center gap-2"
        role="group"
        aria-label="Compound interest tool controls"
      >
        <button
          type="button"
          onClick={onClear}
          data-testid="btn-clear"
          className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Reset inputs
        </button>
        {onCopy ? (
          <button
            type="button"
            onClick={onCopy}
            data-testid="btn-copy-result"
            className="rounded-md bg-emerald-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-emerald-600"
          >
            Copy result
          </button>
        ) : null}
      </div>
    </div>
  );
};

export function resultSummary(state: ToolState): string | null {
  const schedule = computeSchedule(state);
  return schedule ? formatCurrency(schedule.finalBalance) : null;
}
