'use client';

import React from 'react';
import { FREQUENCIES, computeSchedule, formatCurrency } from '../types';
import type { ToolState } from '../types';

interface SidebarProps {
  state: ToolState;
  onChange?: (next: ToolState) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ state }) => {
  void state;
  return (
    <div className="p-4 space-y-6 text-sm overflow-y-auto h-full" data-testid="compound-sidebar">
      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">How it works</h3>
        <p className="text-xs text-gray-600 dark:text-gray-300">
          The balance grows at the annual rate divided across the compounding periods. Monthly
          contributions are added at the end of each compounding period, and can rise by a fixed
          percentage each year.
        </p>
      </div>
      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">
          Compounding frequencies
        </h3>
        <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
          {FREQUENCIES.map((f) => (
            <li key={f.value} className="flex justify-between gap-2">
              <span>{f.label}</span>
              <span className="text-gray-500 dark:text-gray-400">
                {f.periodsPerYear} periods/year
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Live summary</h3>
        <p className="text-xs text-gray-600 dark:text-gray-300" data-testid="sidebar-summary">
          {(() => {
            const schedule = computeSchedule(state);
            return schedule
              ? `${formatCurrency(schedule.finalBalance)} final · ${formatCurrency(
                  schedule.totalInterest
                )} interest`
              : 'Enter valid inputs to see a summary.';
          })()}
        </p>
      </div>
      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Share</h3>
        <p className="text-xs text-gray-600 dark:text-gray-300">
          Use the toolbar share button to create a URL containing the current inputs; open it to
          restore this scenario.
        </p>
      </div>
    </div>
  );
};
