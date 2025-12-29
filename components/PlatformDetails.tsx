"use client";

import { Platform } from "@/lib/costCalculator";

interface PlatformDetailsProps {
  platform: Platform;
}

export default function PlatformDetails({ platform }: PlatformDetailsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const totalInfra = platform.infrastructure
    ? Object.values(platform.infrastructure)
        .filter((v): v is number => typeof v === "number")
        .reduce((sum, val) => sum + val, 0)
    : 0;

  return (
    <div className="space-y-4">
      {/* Metric Types */}
      {platform.metricTypes && platform.metricTypes.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Supported Metric Types
          </h4>
          <div className="flex flex-wrap gap-2">
            {platform.metricTypes.map((type) => (
              <span
                key={type}
                className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-md"
              >
                {type}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Infrastructure Breakdown */}
      {platform.infrastructure && (
        <div>
          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            Infrastructure Cost Breakdown
          </h4>
          <div className="space-y-2">
            {platform.infrastructure.compute && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600 dark:text-gray-400">Compute (CPU/Hosts)</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(platform.infrastructure.compute)}
                </span>
              </div>
            )}
            {platform.infrastructure.storage && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600 dark:text-gray-400">Storage</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(platform.infrastructure.storage)}
                </span>
              </div>
            )}
            {platform.infrastructure.memory && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600 dark:text-gray-400">Memory</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(platform.infrastructure.memory)}
                </span>
              </div>
            )}
            {platform.infrastructure.network && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600 dark:text-gray-400">Network</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(platform.infrastructure.network)}
                </span>
              </div>
            )}
            {platform.infrastructure.other && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600 dark:text-gray-400">Other (Ops/Backup)</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(platform.infrastructure.other)}
                </span>
              </div>
            )}
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center text-sm font-semibold">
                <span className="text-gray-900 dark:text-white">Total Infrastructure</span>
                <span className="text-gray-900 dark:text-white">
                  {formatCurrency(totalInfra)}
                </span>
              </div>
            </div>
            {platform.infrastructure.notes && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic">
                {platform.infrastructure.notes}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

