"use client";

import { ReactNode } from "react";

export type ObservabilityTab = "serverless" | "comparison";

interface ObservabilityTabsProps {
  activeTab: ObservabilityTab;
  onTabChange: (tab: ObservabilityTab) => void;
  children: ReactNode;
}

type TabDef = {
  id: ObservabilityTab;
  label: string;
  icon: string;
  highlight?: "amber" | "sky";
};

function tabActiveClass(highlight?: "amber" | "sky"): string {
  if (highlight === "amber") {
    return "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md transform scale-105";
  }
  return "bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md transform scale-105";
}

function tabIdleClass(highlight?: "amber" | "sky"): string {
  if (highlight === "amber") {
    return "text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 border border-amber-300 dark:border-amber-700";
  }
  return "text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-900/20 border border-sky-300 dark:border-sky-700";
}

export default function ObservabilityTabs({
  activeTab,
  onTabChange,
  children,
}: ObservabilityTabsProps) {
  const tabs: TabDef[] = [
    { id: "serverless", label: "Serverless Estimator", icon: "☁️", highlight: "sky" },
    { id: "comparison", label: "Competitor Comparison", icon: "⚡", highlight: "amber" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <div className="inline-flex flex-wrap justify-center gap-1 rounded-xl border border-gray-200 dark:border-gray-700 p-1.5 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm shadow-lg">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`px-5 py-3 text-sm font-semibold rounded-lg transition-all duration-200 ${
                activeTab === tab.id ? tabActiveClass(tab.highlight) : tabIdleClass(tab.highlight)
              }`}
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
