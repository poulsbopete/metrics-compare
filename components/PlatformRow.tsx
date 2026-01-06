"use client";

import { Platform } from "@/lib/costCalculator";
import { ObservabilityPlatform } from "@/lib/observabilityPricing";
import { useState } from "react";
import AnimatedNumber from "./AnimatedNumber";
import PlatformDetails from "./PlatformDetails";

interface PlatformRowProps {
  platform: Platform | ObservabilityPlatform;
  cost: number;
  monthlyMetrics: number;
  formatCurrency: (value: number) => string;
  formatNumber: (value: number) => string;
  index: number;
}

export default function PlatformRow({
  platform,
  cost,
  monthlyMetrics,
  formatCurrency,
  formatNumber,
  index,
}: PlatformRowProps) {
  const [expanded, setExpanded] = useState(false);
  const annualCost = cost * 12;

  const isPlatform = (p: Platform | ObservabilityPlatform): p is Platform => {
    return 'metricTypes' in p;
  };

  const hasDetails = isPlatform(platform) 
    ? (platform.metricTypes && platform.metricTypes.length > 0) || platform.infrastructure
    : platform.infrastructure || (platform as ObservabilityPlatform).notes;

  return (
    <>
      <tr
        className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 cursor-pointer group"
        onClick={() => setExpanded(!expanded)}
        style={{
          animationDelay: `${index * 50}ms`,
        }}
      >
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="flex items-center">
            <div
              className={`w-4 h-4 rounded-full ${platform.color} mr-3 shadow-sm`}
            />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {platform.name}
            </span>
            {hasDetails && (
              <>
                <button
                  className="ml-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpanded(!expanded);
                  }}
                  title="Click to view details"
                >
                  <svg
                    className={`w-5 h-5 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                <span className="ml-2 text-xs text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300">
                  Click for details
                </span>
              </>
            )}
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
          {formatNumber(monthlyMetrics)}
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            <AnimatedNumber value={cost} format={formatCurrency} />
          </span>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            <AnimatedNumber value={annualCost} format={formatCurrency} />
          </span>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={4} className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50">
            <PlatformDetails platform={platform} />
          </td>
        </tr>
      )}
    </>
  );
}

