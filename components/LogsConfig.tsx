"use client";

import MetricSlider from "./MetricSlider";

interface LogsConfigProps {
  gbPerDay: number;
  onGbPerDayChange: (value: number) => void;
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
        max={1000}
        step={0.1}
        formatValue={(v) => `${v.toFixed(1)} GB/day`}
      />
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          💡 <strong>GB per day</strong> represents the uncompressed log volume your applications generate daily. Most platforms compress logs, so actual storage may be lower.
        </p>
      </div>
    </div>
  );
}

