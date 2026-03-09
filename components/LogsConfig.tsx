"use client";

import MetricSlider from "./MetricSlider";

interface LogsConfigProps {
  gbPerDay: number;
  onGbPerDayChange: (value: number) => void;
}

function formatGBPerDay(v: number): string {
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)} TB/day`;
  if (v >= 1) return `${v.toFixed(1)} GB/day`;
  return `${v.toFixed(2)} GB/day`;
}

export default function LogsConfig({
  gbPerDay,
  onGbPerDayChange,
}: LogsConfigProps) {
  return (
    <div className="space-y-6">
      <MetricSlider
        label="Log Volume (GB per Day)"
        value={gbPerDay}
        onChange={onGbPerDayChange}
        min={0.1}
        max={100_000}
        step={0.1}
        logarithmic={true}
        formatValue={formatGBPerDay}
      />
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-3">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          💡 <strong>GB per day</strong> represents the uncompressed log volume your applications generate daily. Most platforms compress logs, so actual storage may be lower.
        </p>
        <div className="border-t border-blue-200 dark:border-blue-700 pt-3">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Quick reference:</strong> 10 GB/day = small app · 100 GB/day = medium scale · 1 TB/day = high traffic · 10–100 TB/day = enterprise / strat
          </p>
        </div>
      </div>
    </div>
  );
}
