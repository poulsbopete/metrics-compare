"use client";

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
      <div className="container mx-auto px-4 py-10 max-w-7xl">
        <TcoDisclaimerBanner />

        <ServerlessEstimator />

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
