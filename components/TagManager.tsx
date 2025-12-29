"use client";

import { useState } from "react";

interface TagManagerProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  tagValues: number;
  onTagValuesChange: (value: number) => void;
}

export default function TagManager({
  tags,
  onTagsChange,
  tagValues,
  onTagValuesChange,
}: TagManagerProps) {
  const [newTag, setNewTag] = useState("");

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      onTagsChange([...tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    onTagsChange(tags.filter((tag) => tag !== tagToRemove));
  };

  const percentage = ((tagValues - 1) / 99) * 100;

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Tags (each tag multiplies metric volume)
        </label>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && addTag()}
            placeholder="e.g., environment, service, region"
            className="flex-1 px-4 py-2.5 border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white transition-all duration-200"
          />
          <button
            onClick={addTag}
            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95 font-medium"
          >
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2 mt-3 min-h-[2.5rem]">
          {tags.map((tag, index) => (
            <span
              key={tag}
              className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 dark:from-blue-900 dark:to-blue-800 dark:text-blue-200 shadow-sm animate-slide-in hover:shadow-md transition-all duration-200 transform hover:scale-105"
              style={{
                animationDelay: `${index * 50}ms`,
              }}
            >
              {tag}
              <button
                onClick={() => removeTag(tag)}
                className="ml-2 text-blue-600 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-100 font-bold transition-colors duration-200 hover:scale-125"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>
      <div>
        <div className="flex justify-between items-center mb-3">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
            Unique Values per Tag
          </label>
          <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
            {tagValues}
          </span>
        </div>
        <div className="relative">
          <div className="relative h-3 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 rounded-full overflow-hidden">
            <div
              className="absolute h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full transition-all duration-300 ease-out shadow-lg"
              style={{ width: `${percentage}%` }}
            >
              <div className="absolute inset-0 gradient-shimmer" />
            </div>
          </div>
          <input
            type="range"
            min={1}
            max={100}
            step={1}
            value={tagValues}
            onChange={(e) => onTagValuesChange(Number(e.target.value))}
            className="absolute top-0 left-0 w-full h-3 opacity-0 cursor-pointer z-10"
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-white dark:bg-gray-200 rounded-full shadow-lg border-2 border-purple-500 transition-transform duration-200 pointer-events-none z-20"
            style={{
              left: `calc(${percentage}% - 12px)`,
            }}
          />
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Each tag multiplies your metric volume by this number
        </p>
      </div>
    </div>
  );
}

