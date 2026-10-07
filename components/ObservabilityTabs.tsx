"use client";

import { ReactNode } from "react";

export type ObservabilityTab =
  | "metrics"
  | "tracing"
  | "logs"
  | "security"
  | "fullstack"
  | "datablocks"
  | "serverless";

interface ObservabilityTabsProps {
  activeTab: ObservabilityTab;
  onTabChange: (tab: ObservabilityTab) => void;
  children: ReactNode;
}

type TabDef = {
  id: ObservabilityTab;
  label: string;
  icon: string;
  highlight?: "amber" | "emerald" | "sky";
};

function tabActiveClass(highlight?: "amber" | "emerald" | "sky"): string {
  if (highlight === "emerald") {
    return "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md transform scale-105";
  }
  if (highlight === "amber") {
    return "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md transform scale-105";
  }
  if (highlight === "sky") {
    return "bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md transform scale-105";
  }
  return "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md transform scale-105";
}

export default function ObservabilityTabs({
  children,
}: ObservabilityTabsProps) {
  // Public site: Observability Serverless only (Security / competitor TCO removed per Product).
  const tabs: TabDef[] = [
    { id: "serverless", label: "Observability Serverless", icon: "☁️", highlight: "sky" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <div className="inline-flex flex-wrap justify-center gap-1 rounded-xl border border-gray-200 dark:border-gray-700 p-1.5 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm shadow-lg">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`px-5 py-3 text-sm font-semibold rounded-lg transition-all duration-200 ${tabActiveClass(tab.highlight)}`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="animate-fade-in-up">{children}</div>
    </div>
  );
}
