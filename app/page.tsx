"use client";

import ObservabilityTabs from "@/components/ObservabilityTabs";
import ServerlessEstimator from "@/components/ServerlessEstimator";
import TcoDisclaimerBanner from "@/components/TcoDisclaimerBanner";
import {
  ELASTIC_CLOUD_HOSTED_PRICING_URL,
  ELASTIC_CLOUD_SERVERLESS_PRICING_URL,
  ELASTIC_SERVERLESS_OBSERVABILITY_MARKETING_URL,
  TCO_LIST_RATES_AS_OF,
  TCO_VALIDATION_FOOTNOTE,
} from "@/lib/tcoDisclaimer";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-12 max-w-7xl">
        <div className="text-center mb-8 animate-fade-in-up">
          <h1 className="text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 dark:from-blue-400 dark:via-purple-400 dark:to-indigo-400 mb-4">
            Observability Serverless Estimator
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Unofficial field helper for Elastic <strong>Observability Complete</strong> (logs, metrics,
            traces). Security, Search, and competitor comparisons are not available here — use the
            official Elastic Cloud estimator for customer quotes.
          </p>
        </div>

        <TcoDisclaimerBanner />

        <ObservabilityTabs activeTab="serverless" onTabChange={() => {}}>
          <ServerlessEstimator />
        </ObservabilityTabs>

        <div className="mt-12 text-center">
          <div className="inline-block bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl px-6 py-4 border border-gray-200/50 dark:border-gray-700/50 shadow-md">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Pricing is based on publicly available list rates as of {TCO_LIST_RATES_AS_OF} (AWS us-east-1{" "}
              <a
                href={ELASTIC_CLOUD_SERVERLESS_PRICING_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                Serverless
              </a>{" "}
              and{" "}
              <a
                href={ELASTIC_CLOUD_HOSTED_PRICING_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                Cloud Hosted
              </a>{" "}
              pricing tables). Observability Serverless Complete rates per{" "}
              <a
                href={ELASTIC_SERVERLESS_OBSERVABILITY_MARKETING_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                elastic.co/pricing/serverless-observability
              </a>
              . {TCO_VALIDATION_FOOTNOTE}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
