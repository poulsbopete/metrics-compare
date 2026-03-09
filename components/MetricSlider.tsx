"use client";

const LOG_RESOLUTION = 10000;

function toLogPosition(value: number, min: number, max: number): number {
  const minSafe = Math.max(min, 1e-10);
  const maxSafe = Math.max(max, minSafe + 1e-10);
  const clamped = Math.max(minSafe, Math.min(maxSafe, value));
  return (Math.log(clamped / minSafe) / Math.log(maxSafe / minSafe)) * LOG_RESOLUTION;
}

function fromLogPosition(pos: number, min: number, max: number, step: number): number {
  const minSafe = Math.max(min, 1e-10);
  const maxSafe = Math.max(max, minSafe + 1e-10);
  const raw = minSafe * Math.pow(maxSafe / minSafe, pos / LOG_RESOLUTION);
  const stepped = step > 0 ? Math.round(raw / step) * step : raw;
  return Math.max(min, Math.min(max, stepped));
}

interface MetricSliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label: string;
  formatValue?: (value: number) => string;
  logarithmic?: boolean;
}

export default function MetricSlider({
  value,
  onChange,
  min = 1,
  max = 10000,
  step = 1,
  label,
  formatValue = (v) => v.toLocaleString(),
  logarithmic = false,
}: MetricSliderProps) {
  const percentage = logarithmic
    ? (toLogPosition(value, min, max) / LOG_RESOLUTION) * 100
    : ((value - min) / (max - min)) * 100;

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-3">
        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          {label}
        </label>
        <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
          {formatValue(value)}
        </span>
      </div>
      <div className="relative h-6 flex items-center">
        {logarithmic ? (
          <input
            type="range"
            min={0}
            max={LOG_RESOLUTION}
            step={1}
            value={toLogPosition(value, min, max)}
            onChange={(e) =>
              onChange(fromLogPosition(Number(e.target.value), min, max, step))
            }
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-blue-600"
            style={{
              background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${percentage}%, #e5e7eb ${percentage}%, #e5e7eb 100%)`,
            }}
          />
        ) : (
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-blue-600"
            style={{
              background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${percentage}%, #e5e7eb ${percentage}%, #e5e7eb 100%)`,
            }}
          />
        )}
      </div>
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
        <span className="font-medium">{formatValue(min)}</span>
        <span className="font-medium">{formatValue(max)}</span>
      </div>
    </div>
  );
}
