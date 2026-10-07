"use client";

import ServerlessEstimator from "@/components/ServerlessEstimator";
import {
  ELASTIC_CLOUD_SERVERLESS_PRICING_URL,
  ELASTIC_SERVERLESS_OBSERVABILITY_MARKETING_URL,
  TCO_LIST_RATES_AS_OF,
} from "@/lib/tcoDisclaimer";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-10 max-w-7xl">
        <ServerlessEstimator />

        <p className="mt-10 text-center text-xs text-gray-500 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
          Unofficial Observability Serverless field helper · list rates as of {TCO_LIST_RATES_AS_OF} ·{" "}
          <a
            href={ELASTIC_SERVERLESS_OBSERVABILITY_MARKETING_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-gray-700 dark:hover:text-gray-200"
          >
            elastic.co pricing
          </a>{" "}
          ·{" "}
          <a
            href={ELASTIC_CLOUD_SERVERLESS_PRICING_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-gray-700 dark:hover:text-gray-200"
          >
            Cloud volume table
          </a>
          . Not a quote — confirm with the official estimator and measured usage. Do not use for
          Security.
        </p>
      </div>
    </div>
  );
}
