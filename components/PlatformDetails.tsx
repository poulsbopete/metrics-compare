"use client";

import { Platform } from "@/lib/costCalculator";
import { ObservabilityPlatform } from "@/lib/observabilityPricing";

interface PlatformDetailsProps {
  platform: Platform | ObservabilityPlatform;
  calculationContext?: {
    eventsPerSecond?: number;
    monthlyEvents?: number;
    monthlyGB?: number;
    spansPerSecond?: number;
    monthlySpans?: number;
    monthlyTraces?: number;
    cost: number;
  };
}

export default function PlatformDetails({ platform, calculationContext }: PlatformDetailsProps) {
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

  const isPlatform = (p: Platform | ObservabilityPlatform): p is Platform => {
    return 'metricTypes' in p;
  };

  return (
    <div className="space-y-4">
      {/* Metric Types */}
      {isPlatform(platform) && platform.metricTypes && platform.metricTypes.length > 0 && (
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

      {/* Cardinality Note or Observability Notes */}
      {isPlatform(platform) && platform.cardinalityNote && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <h4 className="text-xs font-semibold text-blue-900 dark:text-blue-200 uppercase tracking-wide mb-2">
            💡 Cardinality Impact on TCO
          </h4>
          <p className="text-sm text-blue-800 dark:text-blue-200">
            {platform.cardinalityNote}
          </p>
        </div>
      )}
      {(platform as ObservabilityPlatform).notes && (
        <>
          {(platform as ObservabilityPlatform).notes?.tracing && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <h4 className="text-xs font-semibold text-blue-900 dark:text-blue-200 uppercase tracking-wide mb-2">
                💡 Tracing/APM Details
              </h4>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                {(platform as ObservabilityPlatform).notes?.tracing}
              </p>
            </div>
          )}
          {(platform as ObservabilityPlatform).notes?.logs && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <h4 className="text-xs font-semibold text-blue-900 dark:text-blue-200 uppercase tracking-wide mb-2">
                💡 Logs Details
              </h4>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                {(platform as ObservabilityPlatform).notes?.logs}
              </p>
            </div>
          )}
          {(platform as ObservabilityPlatform).notes?.security && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <h4 className="text-xs font-semibold text-blue-900 dark:text-blue-200 uppercase tracking-wide mb-2">
                💡 Security Details
              </h4>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                {(platform as ObservabilityPlatform).notes?.security}
              </p>
            </div>
          )}
        </>
      )}

      {/* TCO Calculation Breakdown for Tracing */}
      {calculationContext && 
       calculationContext.spansPerSecond !== undefined && 
       !isPlatform(platform) &&
       platform.pricing?.tracing && (
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h4 className="text-xs font-semibold text-blue-900 dark:text-blue-200 uppercase tracking-wide mb-3">
            📊 TCO Calculation Breakdown
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Spans per Second:</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {calculationContext.spansPerSecond.toLocaleString()}/sec
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Monthly Spans:</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {calculationContext.monthlySpans ? 
                  calculationContext.monthlySpans >= 1_000_000_000
                    ? `${(calculationContext.monthlySpans / 1_000_000_000).toFixed(2)}B`
                    : calculationContext.monthlySpans >= 1_000_000
                    ? `${(calculationContext.monthlySpans / 1_000_000).toFixed(2)}M`
                    : calculationContext.monthlySpans >= 1_000
                    ? `${(calculationContext.monthlySpans / 1_000).toFixed(2)}K`
                    : calculationContext.monthlySpans.toLocaleString()
                  : 'N/A'}
              </span>
            </div>
            {/* Show trace conversion for Elastic APM (trace-based pricing) */}
            {platform.pricing.tracing.pricePerMillionTraces && calculationContext.monthlyTraces !== undefined && (
              <>
                <div className="pt-2 border-t border-blue-200 dark:border-blue-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 italic">
                    Elastic APM uses trace-based pricing (assumes 10 spans per trace)
                  </p>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Monthly Traces:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {calculationContext.monthlyTraces >= 1_000_000_000
                        ? `${(calculationContext.monthlyTraces / 1_000_000_000).toFixed(2)}B`
                        : calculationContext.monthlyTraces >= 1_000_000
                        ? `${(calculationContext.monthlyTraces / 1_000_000).toFixed(2)}M`
                        : calculationContext.monthlyTraces >= 1_000
                        ? `${(calculationContext.monthlyTraces / 1_000).toFixed(2)}K`
                        : calculationContext.monthlyTraces.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Price per Million Traces:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(platform.pricing.tracing.pricePerMillionTraces)}/M traces
                    </span>
                  </div>
                </div>
              </>
            )}
            {/* Show span-based pricing for other platforms */}
            {platform.pricing.tracing.pricePerMillionSpans && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Price per Million Spans:</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(platform.pricing.tracing.pricePerMillionSpans)}/M spans
                </span>
              </div>
            )}
            {/* Show GB-based pricing */}
            {platform.pricing.tracing.pricePerGB && platform.pricing.tracing.pricePerGB > 0 && (
              <>
                {calculationContext.monthlyGB !== undefined && calculationContext.monthlyGB > 0 && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Monthly GB (calculated):</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {calculationContext.monthlyGB.toFixed(2)} GB
                      </span>
                    </div>
                    {platform.pricing.tracing.freeTier && platform.pricing.tracing.freeTier > 0 && (
                      <div className="flex justify-between items-center text-green-600 dark:text-green-400">
                        <span>Free Tier:</span>
                        <span className="font-semibold">-{platform.pricing.tracing.freeTier.toLocaleString()} spans</span>
                      </div>
                    )}
                  </>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Price per GB:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(platform.pricing.tracing.pricePerGB)}/GB
                  </span>
                </div>
              </>
            )}
            {platform.pricing.tracing.basePrice && platform.pricing.tracing.basePrice > 0 && (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Fixed Infrastructure Cost:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(platform.pricing.tracing.basePrice)}/month
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">
                  Self-hosted solution with fixed monthly infrastructure costs (see breakdown below)
                </p>
              </>
            )}
            <div className="pt-2 border-t border-blue-200 dark:border-blue-700">
              <div className="flex justify-between items-center font-semibold">
                <span className="text-blue-900 dark:text-blue-200">Total Monthly Cost:</span>
                <span className="text-blue-900 dark:text-blue-200 text-lg">
                  {formatCurrency(calculationContext.cost)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TCO Calculation Breakdown for Security */}
      {calculationContext && 
       calculationContext.eventsPerSecond !== undefined && 
       !isPlatform(platform) &&
       platform.pricing?.security && (
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
          <h4 className="text-xs font-semibold text-purple-900 dark:text-purple-200 uppercase tracking-wide mb-3">
            📊 TCO Calculation Breakdown
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Events per Second:</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {calculationContext.eventsPerSecond.toLocaleString()}/sec
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Monthly Events:</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {calculationContext.monthlyEvents ? 
                  calculationContext.monthlyEvents >= 1_000_000_000
                    ? `${(calculationContext.monthlyEvents / 1_000_000_000).toFixed(2)}B`
                    : calculationContext.monthlyEvents >= 1_000_000
                    ? `${(calculationContext.monthlyEvents / 1_000_000).toFixed(2)}M`
                    : calculationContext.monthlyEvents >= 1_000
                    ? `${(calculationContext.monthlyEvents / 1_000).toFixed(2)}K`
                    : calculationContext.monthlyEvents.toLocaleString()
                  : 'N/A'}
              </span>
            </div>
            {/* Always show Monthly GB and Price per GB for volume-based pricing */}
            {platform.pricing.security.pricePerGB !== undefined && platform.pricing.security.pricePerGB > 0 && (
              <>
                {calculationContext.monthlyGB !== undefined && calculationContext.monthlyGB > 0 && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Monthly GB (calculated):</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {calculationContext.monthlyGB.toFixed(2)} GB
                      </span>
                    </div>
                    {platform.pricing.security.freeTier && platform.pricing.security.freeTier > 0 && (
                      <div className="flex justify-between items-center text-green-600 dark:text-green-400">
                        <span>Free Tier:</span>
                        <span className="font-semibold">-{platform.pricing.security.freeTier} GB</span>
                      </div>
                    )}
                    {platform.pricing.security.freeTier && platform.pricing.security.freeTier > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">Billable GB:</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {Math.max(0, calculationContext.monthlyGB - (platform.pricing.security.freeTier || 0)).toFixed(2)} GB
                        </span>
                      </div>
                    )}
                  </>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Price per GB:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(platform.pricing.security.pricePerGB)}/GB
                  </span>
                </div>
              </>
            )}
            {platform.pricing.security.basePrice && platform.pricing.security.basePrice > 0 && (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Fixed Infrastructure Cost:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(platform.pricing.security.basePrice)}/month
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">
                  Self-hosted solution with fixed monthly infrastructure costs (see breakdown below)
                </p>
              </>
            )}
            <div className="pt-2 border-t border-purple-200 dark:border-purple-700">
              <div className="flex justify-between items-center font-semibold">
                <span className="text-purple-900 dark:text-purple-200">Total Monthly Cost:</span>
                <span className="text-purple-900 dark:text-purple-200 text-lg">
                  {formatCurrency(calculationContext.cost)}
                </span>
              </div>
            </div>
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

