"use client";

import { useEffect, useState, type ReactNode } from "react";

interface CollapsibleExampleProps {
  /** localStorage key for persist collapsed state */
  storageKey: string;
  title: string;
  collapsedHint?: string;
  /** Accent bar gradient classes, e.g. from-violet-500 to-purple-500 */
  accentClassName?: string;
  /** Default collapsed on first visit */
  defaultCollapsed?: boolean;
  children: ReactNode;
  /** Optional controls shown in the expanded header (right side, before Hide) */
  headerActions?: ReactNode;
  /** Optional subtitle under title when expanded */
  description?: ReactNode;
}

export default function CollapsibleExample({
  storageKey,
  title,
  collapsedHint = "Example — collapsed",
  accentClassName = "from-violet-500 to-indigo-500",
  defaultCollapsed = false,
  children,
  headerActions,
  description,
}: CollapsibleExampleProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved === "1") setCollapsed(true);
      if (saved === "0") setCollapsed(false);
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(storageKey, collapsed ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [collapsed, hydrated, storageKey]);

  if (collapsed) {
    return (
      <section className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 px-4 py-3 mb-6 animate-fade-in-up">
        <div className="flex flex-wrap items-center justify-between gap-3 min-w-0">
          <div className="flex items-center min-w-0 gap-3">
            <span
              className={`w-1 h-6 bg-gradient-to-b ${accentClassName} rounded-full shrink-0`}
            />
            <div className="min-w-0">
              <h2 className="text-base font-bold text-gray-900 dark:text-white truncate">{title}</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{collapsedHint}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700/80 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 transition-colors"
            aria-expanded={false}
            aria-label={`Show ${title}`}
          >
            Show
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-6 mb-6 animate-fade-in-up">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4 min-w-0">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center mb-1">
            <span
              className={`w-1 h-7 bg-gradient-to-b ${accentClassName} rounded-full mr-3 shrink-0`}
            />
            {title}
          </h2>
          {description && (
            <div className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed max-w-3xl pl-4">
              {description}
            </div>
          )}
        </div>
        <div className="shrink-0 flex flex-wrap items-center gap-2">
          {headerActions}
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-gray-700/80 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-expanded={true}
            aria-label={`Hide ${title}`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
            Hide
          </button>
        </div>
      </div>
      {children}
    </section>
  );
}
