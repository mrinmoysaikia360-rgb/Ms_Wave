import React from 'react';
import { ArrowUpDown, Filter, X } from 'lucide-react';

interface FilterSortBarProps {
  totalResults: number;
  availableSources: string[];
  selectedSource: string | null;
  onSelectSource: (source: string | null) => void;
  sortBy: 'relevance' | 'date' | 'source';
  onChangeSortBy: (sortBy: 'relevance' | 'date' | 'source') => void;
}

export const FilterSortBar: React.FC<FilterSortBarProps> = ({
  totalResults,
  availableSources,
  selectedSource,
  onSelectSource,
  sortBy,
  onChangeSortBy,
}) => {
  return (
    <div
      id="filter-sort-bar"
      className="w-full max-w-4xl mx-auto my-3 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm text-slate-400 px-1"
    >
      {/* Left: Sources filter chips */}
      <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto no-scrollbar">
        <span className="text-slate-500 font-medium mr-1 hidden sm:inline">Filter by source:</span>
        <button
          onClick={() => onSelectSource(null)}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
            selectedSource === null
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          All Sources ({totalResults})
        </button>

        {availableSources.map((src) => (
          <button
            key={src}
            onClick={() => onSelectSource(selectedSource === src ? null : src)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
              selectedSource === src
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <span>{src}</span>
            {selectedSource === src && <X className="w-3 h-3" />}
          </button>
        ))}
      </div>

      {/* Right: Sort By Dropdown */}
      <div className="flex items-center gap-2 ml-auto">
        <span className="text-slate-500 font-medium hidden sm:inline">Sort:</span>
        <div className="relative">
          <select
            id="select-sort-by"
            value={sortBy}
            onChange={(e) => onChangeSortBy(e.target.value as any)}
            className="bg-slate-900 text-slate-200 border border-slate-800 rounded-lg px-2.5 py-1 text-xs font-medium focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="relevance">Relevance (Score)</option>
            <option value="date">Date (Newest)</option>
            <option value="source">Source Name (A-Z)</option>
          </select>
        </div>
      </div>
    </div>
  );
};
