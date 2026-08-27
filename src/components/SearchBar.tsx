import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Clock, ArrowRight } from 'lucide-react';

interface SearchBarProps {
  query: string;
  onSearch: (query: string) => void;
  isLoading?: boolean;
  autoFocus?: boolean;
  compact?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  query,
  onSearch,
  isLoading = false,
  autoFocus = false,
  compact = false,
}) => {
  const [inputValue, setInputValue] = useState(query);
  const [showHistory, setShowHistory] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInputValue(query);
  }, [query]);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ms_wave_recent_searches');
      if (saved) {
        setRecentSearches(JSON.parse(saved).slice(0, 5));
      }
    } catch {
      // ignore
    }
  }, []);

  const saveRecentSearch = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    try {
      const updated = [trimmed, ...recentSearches.filter((s) => s.toLowerCase() !== trimmed.toLowerCase())].slice(0, 6);
      setRecentSearches(updated);
      localStorage.setItem('ms_wave_recent_searches', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      saveRecentSearch(inputValue);
      setShowHistory(false);
      onSearch(inputValue.trim());
    }
  };

  const handleSelectQuery = (term: string) => {
    setInputValue(term);
    saveRecentSearch(term);
    setShowHistory(false);
    onSearch(term);
  };

  const handleClear = () => {
    setInputValue('');
    inputRef.current?.focus();
  };

  // Close history on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowHistory(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div
      ref={containerRef}
      id="ms-wave-searchbar-container"
      className={`relative w-full ${compact ? 'max-w-3xl' : 'max-w-2xl mx-auto'}`}
    >
      <form
        onSubmit={handleSubmit}
        className="relative flex items-center w-full shadow-2xl rounded-full transition-all group"
      >
        <div className="absolute left-4 sm:left-5 text-slate-400 group-focus-within:text-blue-400 transition-colors pointer-events-none">
          <Search className="w-5 h-5" />
        </div>

        <input
          ref={inputRef}
          id="search-input"
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={() => setShowHistory(true)}
          placeholder="Search with Ms Wave across multiple sources..."
          autoFocus={autoFocus}
          autoComplete="off"
          className="w-full bg-slate-900/90 text-slate-100 placeholder-slate-500 pl-12 sm:pl-14 pr-28 sm:pr-32 py-3.5 sm:py-4 rounded-full border border-slate-800 focus:border-blue-500/80 focus:ring-4 focus:ring-blue-500/20 focus:outline-none text-sm sm:text-base transition-all backdrop-blur-sm"
        />

        {inputValue && (
          <button
            type="button"
            id="btn-clear-search"
            onClick={handleClear}
            className="absolute right-24 sm:right-28 text-slate-400 hover:text-slate-200 p-1.5 rounded-full hover:bg-slate-800 transition-colors"
            title="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <button
          type="submit"
          id="btn-search-submit"
          disabled={isLoading || !inputValue.trim()}
          className="absolute right-1.5 sm:right-2 px-4 sm:px-6 py-2 sm:py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white font-semibold text-xs sm:text-sm rounded-full shadow-lg shadow-blue-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <span>Search</span>
              <ArrowRight className="w-3.5 h-3.5 hidden sm:inline" />
            </>
          )}
        </button>
      </form>

      {/* Search History Dropdown */}
      {showHistory && recentSearches.length > 0 && (
        <div
          id="search-suggestions-dropdown"
          className="absolute top-full left-0 right-0 mt-2 bg-slate-900/95 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-xl p-3 z-40 animate-in fade-in slide-in-from-top-2 duration-150"
        >
          <div>
            <div className="flex items-center justify-between px-3 py-1 text-xs font-semibold text-slate-400 tracking-wider uppercase">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-400" /> Recent Searches
              </span>
              <button
                type="button"
                onClick={() => {
                  setRecentSearches([]);
                  localStorage.removeItem('ms_wave_recent_searches');
                }}
                className="text-xs text-slate-500 hover:text-red-400 transition-colors lowercase cursor-pointer"
              >
                clear
              </button>
            </div>
            <div className="mt-1 space-y-1">
              {recentSearches.map((term, i) => (
                <button
                  key={`recent-${i}`}
                  type="button"
                  onClick={() => handleSelectQuery(term)}
                  className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-slate-800/80 rounded-xl transition-colors flex items-center justify-between group cursor-pointer"
                >
                  <span className="truncate">{term}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-all" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
