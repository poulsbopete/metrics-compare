"use client";

import { useState, useEffect } from "react";

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
  const [isDragging, setIsDragging] = useState(false);

  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-3">
        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          {label}
        </label>
        <span className="text-lg font-bold text-blue-600 dark:text-blue-400 transition-all duration-200">
          {formatValue(value)}
        </span>
      </div>
      <div className="relative">
        <div className="relative h-3 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 rounded-full overflow-hidden">
          <div
            className="absolute h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-300 ease-out shadow-lg"
            style={{ width: `${percentage}%` }}
          >
            <div className="absolute inset-0 gradient-shimmer" />
          </div>
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
          onTouchStart={() => setIsDragging(true)}
          onTouchEnd={() => setIsDragging(false)}
          className="absolute top-0 left-0 w-full h-3 opacity-0 cursor-pointer z-10"
          style={{
            background: "transparent",
          }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-white dark:bg-gray-200 rounded-full shadow-lg border-2 border-blue-500 transition-transform duration-200 pointer-events-none z-20"
          style={{
            left: `calc(${percentage}% - 12px)`,
            transform: `translateY(-50%) ${isDragging ? "scale(1.2)" : "scale(1)"}`,
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

