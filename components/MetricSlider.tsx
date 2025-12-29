"use client";

interface MetricSliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label: string;
  formatValue?: (value: number) => string;
}

export default function MetricSlider({
  value,
  onChange,
  min = 1,
  max = 10000,
  step = 1,
  label,
  formatValue = (v) => v.toLocaleString(),
}: MetricSliderProps) {
  const percentage = ((value - min) / (max - min)) * 100;

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
      </div>
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
        <span className="font-medium">{formatValue(min)}</span>
        <span className="font-medium">{formatValue(max)}</span>
      </div>
    </div>
  );
}
