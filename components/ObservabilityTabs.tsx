"use client";

import { ReactNode } from "react";

export type ObservabilityTab = "metrics" | "tracing" | "logs" | "security";

interface ObservabilityTabsProps {
  activeTab: ObservabilityTab;
  onTabChange: (tab: ObservabilityTab) => void;
  children: ReactNode;
}

export default function ObservabilityTabs({
  activeTab,
  onTabChange,
  children,
}: ObservabilityTabsProps) {
  const tabs: { id: ObservabilityTab; label: string; icon: string }[] = [
    { id: "metrics", label: "Metrics", icon: "📊" },
    { id: "tracing", label: "Tracing/APM", icon: "🔍" },
    { id: "logs", label: "Logs", icon: "📝" },
    { id: "security", label: "Security", icon: "🔒" },
  ];

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-xl border border-gray-200 dark:border-gray-700 p-1.5 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm shadow-lg">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`px-6 py-3 text-sm font-semibold rounded-lg transition-all duration-200 ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md transform scale-105"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
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

