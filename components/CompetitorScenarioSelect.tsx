"use client";

import {
  COMPETITOR_SCENARIOS,
  type CompetitorScenarioId,
  getCompetitorScenario,
} from "@/lib/competitorScenarios";

interface CompetitorScenarioSelectProps {
  value: CompetitorScenarioId;
  onChange: (id: CompetitorScenarioId) => void;
}

export default function CompetitorScenarioSelect({ value, onChange }: CompetitorScenarioSelectProps) {
  const scenario = getCompetitorScenario(value);

  return (
    <div className="rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/50 dark:bg-indigo-950/20 p-4">
      <label
        htmlFor="competitor-scenario"
        className="block text-xs font-semibold text-indigo-900 dark:text-indigo-200 uppercase tracking-wide mb-2"
      >
        Your current solution
      </label>
      <select
        id="competitor-scenario"
        value={value}
        onChange={(e) => onChange(e.target.value as CompetitorScenarioId)}
        className="w-full rounded-lg border border-indigo-200 dark:border-indigo-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        {COMPETITOR_SCENARIOS.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>
      <p className="text-xs text-indigo-900/80 dark:text-indigo-200/80 mt-2 leading-relaxed">
        {scenario.description} The comparison chart and platform list update to match.
      </p>
    </div>
  );
}
