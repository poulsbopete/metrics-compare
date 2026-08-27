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

function tabIdleClass(highlight?: "amber" | "emerald" | "sky"): string {
  if (highlight === "emerald") {
    return "text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 border border-emerald-300 dark:border-emerald-700";
  }
  if (highlight === "amber") {
    return "text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 border border-amber-300 dark:border-amber-700";
  }
  if (highlight === "sky") {
    return "text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-900/20 border border-sky-300 dark:border-sky-700";
  }
  return "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700";
}

export default function ObservabilityTabs({
  activeTab,
  onTabChange,
  children,
}: ObservabilityTabsProps) {
  const tabs: TabDef[] = [
    { id: "serverless", label: "Serverless Estimator", icon: "☁️", highlight: "sky" },
    { id: "metrics", label: "Metrics", icon: "📊" },
    { id: "tracing", label: "Tracing/APM", icon: "🔍" },
    { id: "logs", label: "Logs", icon: "📝" },
    { id: "security", label: "Security", icon: "🔒" },
    { id: "fullstack", label: "Full Stack TCO", icon: "⚡", highlight: "amber" },
    { id: "datablocks", label: "Data Blocks", icon: "📦", highlight: "emerald" },
  ];

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex justify-center">
        <div className="inline-flex flex-wrap justify-center gap-1 rounded-xl border border-gray-200 dark:border-gray-700 p-1.5 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm shadow-lg">
          {tabs.map((tab) => (
            <button
              key={tab.id}
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

      {/* Tab Content */}
      <div className="animate-fade-in-up">{children}</div>
    </div>
  );
}
