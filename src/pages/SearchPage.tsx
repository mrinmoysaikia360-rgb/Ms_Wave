import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Layers,
  ShieldCheck,
  Search,
  AlertCircle,
  RefreshCw,
  SlidersHorizontal,
  Compass,
  ArrowRight,
  Database,
  Clock,
  User,
  Zap,
} from 'lucide-react';
import {
  NormalizedResult,
  SearchCategory,
  SearchResponsePayload,
  UserSession,
} from '../types.js';
import { Header } from '../components/Header.js';
import { SearchBar } from '../components/SearchBar.js';
import { CategoryTabs } from '../components/CategoryTabs.js';
import { SourceStatus } from '../components/SourceStatus.js';
import { DiagnosticsModal } from '../components/DiagnosticsModal.js';
import { SearchHistoryModal } from '../components/SearchHistoryModal.js';
import { AccountModal } from '../components/AccountModal.js';
import { AIOverview } from '../components/AIOverview.js';
import { ResultCard } from '../components/ResultCard.js';
import { ImageResultGrid } from '../components/ImageResultGrid.js';
import { VideoResultList } from '../components/VideoResultList.js';
import { NewsResultList } from '../components/NewsResultList.js';
import { ScienceResultList } from '../components/ScienceResultList.js';
import { MusicResultList } from '../components/MusicResultList.js';
import { MapResultList } from '../components/MapResultList.js';
import { FilterSortBar } from '../components/FilterSortBar.js';
import { apiFetch } from '../lib/api.js';

interface SearchPageProps {
  session: UserSession | null;
  onLogout: () => void;
  onProfileUpdated?: (session: UserSession) => void;
  onOpenLogin?: () => void;
}

export const SearchPage: React.FC<SearchPageProps> = ({
  session,
  onLogout,
  onProfileUpdated,
  onOpenLogin,
}) => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<SearchCategory>('all');
  const [sortBy, setSortBy] = useState<'relevance' | 'date' | 'source'>('relevance');
  const [selectedSource, setSelectedSource] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [payload, setPayload] = useState<SearchResponsePayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [showDiagnosticsModal, setShowDiagnosticsModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);

  // Perform search against backend API with caching support and bypass option
  const executeSearch = async (
    targetQuery: string,
    targetCategory: SearchCategory = category,
    targetSort: 'relevance' | 'date' | 'source' = sortBy,
    forceRefresh: boolean = false
  ) => {
    const trimmed = targetQuery.trim();
    if (!trimmed) return;

    if (forceRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    setSelectedSource(null);

    try {
      let url = `/api/search?q=${encodeURIComponent(trimmed)}&type=${encodeURIComponent(
        targetCategory
      )}&sortBy=${encodeURIComponent(targetSort)}`;

      if (forceRefresh) {
        url += '&refresh=true';
      }

      const headers: Record<string, string> = {
        Accept: 'application/json',
      };
      if (forceRefresh) {
        headers['x-cache-bypass'] = 'true';
      }

      const res = await apiFetch(url, { headers });

      if (!res.ok) {
        if (res.status === 401 && session?.authenticated) {
          onLogout();
          return;
        }
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `Search service returned status ${res.status}`);
      }

      const data: SearchResponsePayload = await res.json();
      setPayload(data);
    } catch (err: any) {
      console.error('Search request error:', err);
      setError(err.message || 'Unable to connect to Ms Wave search service.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSearchSubmit = (newQuery: string) => {
    setQuery(newQuery);
    executeSearch(newQuery, category, sortBy, false);
  };

  const handleCategoryChange = (newCategory: SearchCategory) => {
    setCategory(newCategory);
    if (query.trim()) {
      executeSearch(query, newCategory, sortBy, false);
    }
  };

  const handleSortChange = (newSort: 'relevance' | 'date' | 'source') => {
    setSortBy(newSort);
    if (query.trim()) {
      executeSearch(query, category, newSort, false);
    }
  };

  const handleResetSearch = () => {
    setQuery('');
    setPayload(null);
    setError(null);
    setSelectedSource(null);
  };

  const handleSelectHistoryQuery = (
    histQuery: string,
    histCategory: SearchCategory,
    histSort: 'relevance' | 'date' | 'source'
  ) => {
    setQuery(histQuery);
    setCategory(histCategory);
    setSortBy(histSort);
    executeSearch(histQuery, histCategory, histSort, false);
  };

  // Compute available sources for filtering
  const availableSources = useMemo(() => {
    if (!payload?.results) return [];
    const set = new Set<string>();
    for (const item of payload.results) {
      if (item.sources && item.sources.length > 0) {
        item.sources.forEach((s) => set.add(s));
      } else if (item.source) {
        set.add(item.source);
      }
    }
    return Array.from(set).sort();
  }, [payload?.results]);

  // Filtered results
  const filteredResults = useMemo(() => {
    if (!payload?.results) return [];
    if (!selectedSource) return payload.results;
    return payload.results.filter(
      (item) =>
        item.source === selectedSource ||
        (item.sources && item.sources.includes(selectedSource))
    );
  }, [payload?.results, selectedSource]);

  const isSearchActive = Boolean(payload || loading || error);

  return (
    <div
      id="ms-wave-app-container"
      className="min-h-screen bg-[#020617] text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white"
    >
      {/* Dynamic Header */}
      <Header
        session={session}
        onLogout={onLogout}
        onResetSearch={handleResetSearch}
        compact={isSearchActive}
        onOpenDiagnostics={() => setShowDiagnosticsModal(true)}
        onOpenHistory={() => setShowHistoryModal(true)}
        onOpenAccount={() => setShowAccountModal(true)}
        onOpenLogin={onOpenLogin}
      />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col">
        {/* Initial Search Center View (Hero mode) */}
        {!isSearchActive && (
          <div className="flex-1 flex flex-col items-center justify-center my-auto py-8 max-w-3xl mx-auto text-center animate-in fade-in duration-300">
            {/* Search Input Box */}
            <div className="w-full mb-6">
              <SearchBar
                query={query}
                onSearch={handleSearchSubmit}
                isLoading={loading}
                autoFocus={true}
              />
            </div>

            {/* Category Selector */}
            <div className="w-full mb-10">
              <CategoryTabs
                activeCategory={category}
                onSelectCategory={handleCategoryChange}
              />
            </div>

            {/* Feature Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full text-left mt-2">
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-3">
                  <Layers className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-bold text-white mb-1">Multi-Source Engine</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Queries Wikipedia, OpenAlex, arXiv, OpenStreetMap, RSS Feeds, and SearXNG simultaneously.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-3">
                  <Zap className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-bold text-white mb-1">Intelligent Caching</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  High-speed response caching layer with TTL per category and instant cache bypass controls.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-3">
                  <Clock className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-bold text-white mb-1">Private Search History</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  User accounts and search history are strictly isolated, authenticated, and exportable.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Active Search Results View */}
        {isSearchActive && (
          <div className="flex-1 flex flex-col py-4 animate-in fade-in duration-200">
            {/* Top Search Controls Bar */}
            <div className="w-full max-w-4xl mx-auto flex flex-col gap-3 mb-2">
              <SearchBar
                query={query}
                onSearch={handleSearchSubmit}
                isLoading={loading}
                compact={true}
              />
              <CategoryTabs
                activeCategory={category}
                onSelectCategory={handleCategoryChange}
              />
            </div>

            {/* Error Message if search failed */}
            {error && (
              <div
                id="search-error-banner"
                className="w-full max-w-4xl mx-auto my-4 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-start gap-3"
              >
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <strong className="font-bold block text-white mb-0.5">Search Request Failed</strong>
                  <p>{error}</p>
                  <button
                    onClick={() => executeSearch(query, category, sortBy, true)}
                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-white text-xs font-semibold transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Retry Metasearch
                  </button>
                </div>
              </div>
            )}

            {/* Loading Skeletons */}
            {loading && (
              <div className="w-full max-w-4xl mx-auto my-6 space-y-4">
                <div className="p-4 bg-slate-900/40 rounded-2xl border border-slate-800 animate-pulse flex items-center justify-between">
                  <div className="h-4 bg-slate-800 rounded w-1/3" />
                  <div className="h-4 bg-slate-800 rounded w-20" />
                </div>
                {[1, 2, 3, 4].map((n) => (
                  <div
                    key={n}
                    className="p-5 bg-slate-900/40 border border-slate-800/60 rounded-2xl animate-pulse space-y-3"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-slate-800 rounded" />
                      <div className="h-3 bg-slate-800 rounded w-24" />
                      <div className="h-3 bg-slate-800 rounded w-16 ml-auto" />
                    </div>
                    <div className="h-5 bg-slate-800 rounded w-3/4" />
                    <div className="h-3 bg-slate-800 rounded w-full" />
                    <div className="h-3 bg-slate-800 rounded w-5/6" />
                  </div>
                ))}
              </div>
            )}

            {/* Search Results Display */}
            {!loading && payload && (
              <div className="w-full max-w-4xl mx-auto">
                {/* Source Status Bar with Cache badge and Refresh button */}
                <SourceStatus
                  stats={payload.stats}
                  onForceRefresh={() => executeSearch(query, category, sortBy, true)}
                  isRefreshing={refreshing}
                />

                {/* AI Overview Synthesis with Google Search Grounding */}
                {payload.aiOverview && (category === 'all' || category === 'science' || category === 'news') && (
                  <AIOverview
                    data={payload.aiOverview}
                    onSelectQuery={(sug) => handleSearchSubmit(sug)}
                  />
                )}

                {/* Filter and Sorting Controls */}
                {payload.results.length > 0 && (
                  <FilterSortBar
                    totalResults={payload.results.length}
                    availableSources={availableSources}
                    selectedSource={selectedSource}
                    onSelectSource={setSelectedSource}
                    sortBy={sortBy}
                    onChangeSortBy={handleSortChange}
                  />
                )}

                {/* Zero Results State */}
                {filteredResults.length === 0 && (
                  <div
                    id="zero-results-card"
                    className="my-8 p-8 bg-slate-900/40 border border-slate-800 rounded-3xl text-center flex flex-col items-center justify-center max-w-md mx-auto"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-slate-800/80 text-slate-400 flex items-center justify-center mb-3">
                      <Search className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-bold text-white mb-1">
                      {selectedSource
                        ? `No results from ${selectedSource}`
                        : 'No results found across providers'}
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed mb-4">
                      {selectedSource
                        ? 'Try clearing the source filter to view results from other providers.'
                        : `All ${payload.stats.sourcesQueried} queried providers completed successfully, but returned zero relevant results for "${query}".`}
                    </p>
                    {selectedSource ? (
                      <button
                        onClick={() => setSelectedSource(null)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition-colors"
                      >
                        Show All Sources
                      </button>
                    ) : (
                      <button
                        onClick={() => handleCategoryChange('all')}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors"
                      >
                        Switch to "All" Category
                      </button>
                    )}
                  </div>
                )}

                {/* Category-Specific Results Views */}
                {filteredResults.length > 0 && (
                  <div className="my-4">
                    {category === 'all' && (
                      <div className="space-y-4">
                        {filteredResults.map((item) => (
                          <ResultCard key={item.id} result={item} />
                        ))}
                      </div>
                    )}

                    {category === 'images' && (
                      <ImageResultGrid results={filteredResults} />
                    )}

                    {category === 'videos' && (
                      <VideoResultList results={filteredResults} />
                    )}

                    {category === 'news' && (
                      <NewsResultList results={filteredResults} />
                    )}

                    {category === 'science' && (
                      <ScienceResultList results={filteredResults} />
                    )}

                    {category === 'music' && (
                      <MusicResultList results={filteredResults} />
                    )}

                    {category === 'maps' && (
                      <MapResultList results={filteredResults} />
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Diagnostics Modal for full Engine Telemetry */}
      <DiagnosticsModal
        isOpen={showDiagnosticsModal}
        onClose={() => setShowDiagnosticsModal(false)}
        diagnostics={payload?.stats?.providers || []}
        totalLatencyMs={payload?.stats?.latencyMs || 0}
        sourcesQueried={payload?.stats?.sourcesQueried || 0}
        successful={payload?.stats?.successful || 0}
        failed={payload?.stats?.failed || 0}
        cacheHit={payload?.stats?.cacheHit}
        cacheAgeSec={payload?.stats?.cacheAgeSec}
        cacheTtlSec={payload?.stats?.cacheTtlSec}
      />

      {/* User Search History Modal */}
      <SearchHistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        onSelectQuery={handleSelectHistoryQuery}
      />

      {/* User Account & Security Modal */}
      <AccountModal
        isOpen={showAccountModal}
        onClose={() => setShowAccountModal(false)}
        session={session}
        onLogout={onLogout}
        onProfileUpdated={onProfileUpdated}
      />

      {/* Persistent Footer with author branding */}
      <footer
        id="ms-wave-footer"
        className="w-full border-t border-slate-900/80 bg-slate-950 py-4 px-4 text-center text-xs text-slate-400"
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-200">Ms Wave</span>
            <span>•</span>
            <span className="text-blue-400 font-semibold">Created by Mrinmoy Saikia.</span>
          </div>
          <p className="text-slate-400">
            Multi-Source Metasearch & AI Aggregation Engine
          </p>
        </div>
      </footer>
    </div>
  );
};
