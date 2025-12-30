"use client";

import { Platform } from "@/lib/costCalculator";

interface CostBarChartProps {
  platforms: Platform[];
  costs: Record<string, number>;
}

// Color mapping for platforms
const colorMap: Record<string, string> = {
  "bg-blue-500": "#3b82f6",
  "bg-slate-500": "#64748b",
  "bg-purple-500": "#a855f7",
  "bg-green-500": "#22c55e",
  "bg-orange-500": "#f97316",
  "bg-cyan-500": "#06b6d4",
  "bg-red-500": "#ef4444",
  "bg-indigo-500": "#6366f1",
  "bg-pink-500": "#ec4899",
  "bg-emerald-500": "#10b981",
  "bg-amber-500": "#f59e0b",
  "bg-teal-500": "#14b8a6",
};

export default function CostBarChart({
  platforms,
  costs,
}: CostBarChartProps) {
  const sortedPlatforms = [...platforms].sort(
    (a, b) => (costs[a.id] || 0) - (costs[b.id] || 0)
  );
  
  const costValues = Object.values(costs).filter(v => v > 0);
  const maxCost = costValues.length > 0 ? Math.max(...costValues) : 1;

  const formatCurrency = (value: number) => {
    if (value < 1 && value > 0) return `$${value.toFixed(2)}`;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (sortedPlatforms.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No platforms to display
      </div>
    );
  }

  const getColor = (colorClass: string) => {
    return colorMap[colorClass] || "#3b82f6";
  };

  return (
    <div className="space-y-5">
      {sortedPlatforms.map((platform, index) => {
        const cost = costs[platform.id] || 0;
        const percentage = maxCost > 0 ? (cost / maxCost) * 100 : 0;
        // Ensure minimum 3% width for visibility if cost > 0
        const displayWidth = cost > 0 ? Math.max(percentage, 3) : 0;
        const barColor = getColor(platform.color);
        
        return (
          <div
            key={platform.id}
            className="group"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-3">
                <div
                  className="w-3 h-3 rounded-full transition-transform group-hover:scale-125 shadow-sm"
                  style={{ backgroundColor: barColor }}
                />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {platform.name}
                </span>
              </div>
              <div className="flex flex-col items-end min-w-[100px] text-right">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(cost)}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {formatCurrency(cost * 12)}/yr
                </span>
              </div>
            </div>
            <div 
              className="relative rounded-full overflow-hidden shadow-inner"
              style={{
                height: '40px',
                backgroundColor: '#f3f4f6',
              }}
            >
              {cost > 0 && (
                <div
                  className="rounded-full transition-all duration-1000 ease-out relative overflow-hidden flex items-center justify-end pr-2"
                  style={{
                    width: `${displayWidth}%`,
                    minWidth: '30px',
                    height: '100%',
                    backgroundColor: barColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                  }}
                >
                </div>
              )}
              {cost === 0 && (
                <div className="h-full w-full flex items-center justify-center">
                  <span className="text-xs text-gray-400 dark:text-gray-500">$0</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
