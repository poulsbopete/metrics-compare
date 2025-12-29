"use client";

import { Platform } from "@/lib/costCalculator";
import { useEffect, useState } from "react";

interface CostBarChartProps {
  platforms: Platform[];
  costs: Record<string, number>;
}

export default function CostBarChart({
  platforms,
  costs,
}: CostBarChartProps) {
  const [animatedCosts, setAnimatedCosts] = useState<Record<string, number>>(
    {}
  );

  useEffect(() => {
    // Animate the bars
    const timer = setTimeout(() => {
      setAnimatedCosts(costs);
    }, 100);
    return () => clearTimeout(timer);
  }, [costs]);

  const sortedPlatforms = [...platforms].sort(
    (a, b) => costs[a.id] - costs[b.id]
  );
  const maxCost = Math.max(...Object.values(costs), 1);

  const formatCurrency = (value: number) => {
    if (value < 1) return `$${value.toFixed(2)}`;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-4">
      {sortedPlatforms.map((platform, index) => {
        const cost = animatedCosts[platform.id] || 0;
        const percentage = (cost / maxCost) * 100;
        return (
          <div
            key={platform.id}
            className="group"
            style={{
              animationDelay: `${index * 50}ms`,
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-3">
                <div
                  className={`w-3 h-3 rounded-full ${platform.color} transition-transform group-hover:scale-125`}
                />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {platform.name}
                </span>
              </div>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {formatCurrency(cost)}
              </span>
            </div>
            <div className="relative h-8 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full ${platform.color} rounded-full transition-all duration-1000 ease-out relative overflow-hidden`}
                style={{
                  width: `${percentage}%`,
                  transitionDelay: `${index * 50}ms`,
                }}
              >
                <div className="absolute inset-0 gradient-shimmer" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

