'use client';

import React from 'react';
import { computeSchedule, formatCurrency, formatNumber, periodsPerYear } from '../types';
import { FREQUENCIES, type ToolState } from '../types';

interface CanvasProps {
  state: ToolState;
  onChange?: (state: ToolState) => void;
}

const numberInputClass =
  'mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100';

function CopyButton({ value, testid }: { value: string; testid?: string }) {
  const [copied, setCopied] = React.useState(false);
  const handleCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable; ignore
    }
  }, [value]);
  return (
    <button
      type="button"
      onClick={handleCopy}
      data-testid={testid}
      className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
      aria-label="Copy value"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

function NumberField({
  label,
  value,
  onChangeState,
  testid,
}: {
  label: string;
  value: string;
  onChangeState: (next: string) => void;
  testid: string;
}) {
  return (
    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
      {label}
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChangeState(e.target.value)}
        data-testid={testid}
        className={numberInputClass}
      />
    </label>
  );
}

/** Simple SVG bar chart of nominal balances per year. */
function GrowthChart({ rows }: { rows: { year: number; balance: number }[] }) {
  if (rows.length === 0) return null;
  const max = Math.max(...rows.map((r) => Math.abs(r.balance)), 1);
  const width = Math.min(Math.max(rows.length * 28, 120), 720);
  const height = 140;
  const barW = Math.max(width / rows.length - 4, 6);
  return (
    <svg
      data-testid="growth-chart"
      role="img"
      aria-label="Balance growth by year"
      width={width}
      height={height}
      className="max-w-full"
    >
      {rows.map((row, i) => {
        const h = Math.max((Math.abs(row.balance) / max) * (height - 20), 1);
        return (
          <rect
            key={row.year}
            x={i * (barW + 4) + 2}
            y={height - h}
            width={barW}
            height={h}
            className={row.balance < 0 ? 'fill-red-500' : 'fill-emerald-500'}
            rx="2"
          />
        );
      })}
    </svg>
  );
}

export const Canvas: React.FC<CanvasProps> = ({ state, onChange }) => {
  const update = (patch: Partial<ToolState>) => onChange?.({ ...state, ...patch });
  const schedule = computeSchedule(state);
  const valid = schedule !== null;
  const n = periodsPerYear(state.frequency);

  return (
    <div className="p-4 space-y-6 overflow-y-auto h-full" data-testid="compound-canvas">
      <div className="grid gap-4 sm:grid-cols-2" data-testid="calc-inputs">
        <NumberField
          label="Initial balance / principal"
          value={state.principal}
          onChangeState={(v) => update({ principal: v })}
          testid="input-principal"
        />
        <NumberField
          label="Annual interest rate (%)"
          value={state.rate}
          onChangeState={(v) => update({ rate: v })}
          testid="input-rate"
        />
        <NumberField
          label="Term (years)"
          value={state.years}
          onChangeState={(v) => update({ years: v })}
          testid="input-years"
        />
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
          Compounding frequency
          <select
            value={state.frequency}
            onChange={(e) => update({ frequency: e.target.value as ToolState['frequency'] })}
            data-testid="input-frequency"
            className={numberInputClass}
          >
            {FREQUENCIES.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label} ({f.periodsPerYear}/year)
              </option>
            ))}
          </select>
        </label>
        <NumberField
          label="Monthly contribution"
          value={state.monthlyContribution}
          onChangeState={(v) => update({ monthlyContribution: v })}
          testid="input-monthly-contribution"
        />
        <NumberField
          label="Annual contribution increase (%)"
          value={state.annualIncrease}
          onChangeState={(v) => update({ annualIncrease: v })}
          testid="input-annual-increase"
        />
        <NumberField
          label="Annual inflation rate (%)"
          value={state.inflation}
          onChangeState={(v) => update({ inflation: v })}
          testid="input-inflation"
        />
      </div>

      <div
        className="rounded-lg border border-gray-200 bg-white p-4 text-center dark:border-gray-800 dark:bg-gray-900"
        data-testid="result-card"
        role="status"
      >
        <span className="mb-1 block text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-400">
          Final balance
        </span>
        <span className="flex items-center justify-center gap-2">
          <span className="block font-mono text-3xl font-bold" data-testid="result-main">
            {valid ? formatCurrency(schedule.finalBalance) : '—'}
          </span>
          {valid ? (
            <CopyButton value={formatCurrency(schedule.finalBalance)} testid="copy-result" />
          ) : null}
        </span>
        {valid ? (
          <>
            <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3" data-testid="breakdown">
              <span
                className="rounded-md bg-gray-100 px-2 py-1 dark:bg-gray-800"
                data-testid="breakdown-contributed"
              >
                Contributed: {formatCurrency(schedule.totalContributed)}
              </span>
              <span
                className="rounded-md bg-gray-100 px-2 py-1 dark:bg-gray-800"
                data-testid="breakdown-interest"
              >
                Interest: {formatCurrency(schedule.totalInterest)}
              </span>
              <span
                className="rounded-md bg-gray-100 px-2 py-1 dark:bg-gray-800"
                data-testid="breakdown-real"
              >
                Real (inflation-adjusted):{' '}
                {formatCurrency(schedule.rows.at(-1)?.realBalance ?? schedule.finalBalance)}
              </span>
            </div>
          </>
        ) : (
          <span
            className="mt-2 block text-xs text-gray-600 dark:text-gray-300"
            data-testid="result-summary"
          >
            Enter valid inputs
          </span>
        )}
      </div>

      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50">
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Step-by-step
        </h3>
        <ol className="space-y-1 text-xs text-gray-700 dark:text-gray-300" data-testid="steps-list">
          {(valid
            ? [
                `Formula: balance = principal × (1 + r/n)^(n×t) + contributions per period`,
                `Compounding: ${n} period${n === 1 ? '' : 's'} per year`,
              ]
            : ['Enter valid numbers for principal, rate, term and contributions to see the steps.']
          ).map((step, i) => (
            <li key={i} className="font-mono">
              {step}
            </li>
          ))}
        </ol>
      </div>

      {valid && schedule.rows.length > 0 ? (
        <>
          <div>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Balance growth by year
            </h3>
            <GrowthChart rows={schedule.rows} />
          </div>

          <div>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Year-by-year table
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs" data-testid="growth-table">
                <thead>
                  <tr className="text-gray-500 dark:text-gray-400">
                    <th className="py-1 pr-3">Year</th>
                    <th className="py-1 pr-3">Balance</th>
                    <th className="py-1 pr-3">Real value</th>
                    <th className="py-1 pr-3">Contributed</th>
                    <th className="py-1 pr-3">Interest</th>
                  </tr>
                </thead>
                <tbody>
                  {schedule.rows.map((row) => (
                    <tr
                      key={row.year}
                      data-testid={`growth-row-${row.year}`}
                      className="border-t border-gray-200 dark:border-gray-800"
                    >
                      <td className="py-1 pr-3 font-mono">{row.year}</td>
                      <td className="py-1 pr-3 font-mono">{formatCurrency(row.balance)}</td>
                      <td className="py-1 pr-3 font-mono">{formatCurrency(row.realBalance)}</td>
                      <td className="py-1 pr-3 font-mono">{formatCurrency(row.contributed)}</td>
                      <td className="py-1 pr-3 font-mono">{formatCurrency(row.interest)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}

      <p className="text-center text-xs text-gray-500 dark:text-gray-400">
        Example: {formatNumber(1000)} at 10% for 1 year, compounded annually, grows to{' '}
        {formatNumber(1100)}. All calculations run locally in your browser; nothing is uploaded.
      </p>
    </div>
  );
};
