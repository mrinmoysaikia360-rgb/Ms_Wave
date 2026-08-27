import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Clock,
  ShieldCheck,
  Database,
  Zap,
  Trash2,
  RefreshCw,
  Layers,
} from 'lucide-react';
import { ProviderDiagnostic, CacheStatsTelemetry } from '../types.js';
import { apiFetch } from '../lib/api.js';

interface DiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  diagnostics: ProviderDiagnostic[];
  totalLatencyMs?: number;
  sourcesQueried?: number;
  successful?: number;
  failed?: number;
  cacheHit?: boolean;
  cacheAgeSec?: number;
  cacheTtlSec?: number;
}

export const DiagnosticsModal: React.FC<DiagnosticsModalProps> = ({
  isOpen,
  onClose,
  diagnostics,
  totalLatencyMs = 0,
  sourcesQueried = 0,
  successful = 0,
  failed = 0,
  cacheHit = false,
  cacheAgeSec,
  cacheTtlSec,
}) => {
  const [activeTab, setActiveTab] = useState<'providers' | 'cache'>('providers');
  const [cacheStats, setCacheStats] = useState<CacheStatsTelemetry | null>(null);
  const [loadingCacheStats, setLoadingCacheStats] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);
  const [cacheClearSuccess, setCacheClearSuccess] = useState(false);

  const fetchCacheStats = async () => {
    setLoadingCacheStats(true);
    try {
      const res = await apiFetch('/api/cache/stats');
      if (res.ok) {
        const data = await res.json();
        setCacheStats(data.cache);
      }
    } catch (err) {
      console.error('Fetch cache stats error:', err);
    } finally {
      setLoadingCacheStats(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCacheStats();
      setCacheClearSuccess(false);
    }
  }, [isOpen]);

  const handleClearCache = async () => {
    setClearingCache(true);
    try {
      const res = await apiFetch('/api/cache/clear', { method: 'POST' });
      if (res.ok) {
        setCacheClearSuccess(true);
        fetchCacheStats();
        setTimeout(() => setCacheClearSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Clear cache error:', err);
    } finally {
      setClearingCache(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="diagnostics-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="diagnostics-modal-content"
        className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-5 sm:p-6 overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">Ms Wave Engine Telemetry</h3>
              <p className="text-xs text-slate-400">Multi-source provider statuses and caching performance</p>
            </div>
          </div>
          <button
            id="btn-close-diagnostics"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 my-3 border-b border-slate-800 pb-2 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('providers')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'providers'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 bg-slate-950/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Search Providers ({diagnostics.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('cache');
              fetchCacheStats();
            }}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'cache'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 bg-slate-950/60'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>Search Cache Layer</span>
          </button>
        </div>

        {/* PROVIDERS TAB */}
        {activeTab === 'providers' && (
          <>
            {/* Quick Stats Summary */}
            <div className="grid grid-cols-4 gap-2 mb-3">
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-2.5 text-center">
                <div className="text-xs text-slate-400 font-medium">Queried</div>
                <div className="text-base sm:text-lg font-bold text-white mt-0.5">{sourcesQueried}</div>
              </div>
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-2.5 text-center">
                <div className="text-xs text-emerald-400 font-medium">Successful</div>
                <div className="text-base sm:text-lg font-bold text-emerald-400 mt-0.5">{successful}</div>
              </div>
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-2.5 text-center">
                <div className="text-xs text-rose-400 font-medium">Failed</div>
                <div className="text-base sm:text-lg font-bold text-rose-400 mt-0.5">{failed}</div>
              </div>
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-2.5 text-center">
                <div className="text-xs text-cyan-400 font-medium">Pipeline</div>
                <div className="text-base sm:text-lg font-bold text-cyan-400 mt-0.5">{totalLatencyMs}ms</div>
              </div>
            </div>

            {/* Provider List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {diagnostics.map((diag) => {
                let statusBadge = (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    <CheckCircle2 className="w-3 h-3" /> OK ({diag.resultsCount})
                  </span>
                );

                if (diag.status === 'unavailable') {
                  statusBadge = (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                      <AlertTriangle className="w-3 h-3" /> Unavailable
                    </span>
                  );
                } else if (diag.status === 'timeout') {
                  statusBadge = (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                      <Clock className="w-3 h-3" /> Timed Out
                    </span>
                  );
                } else if (diag.status === 'unconfigured') {
                  statusBadge = (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                      <HelpCircle className="w-3 h-3" /> Not Configured
                    </span>
                  );
                }

                return (
                  <div
                    key={diag.id}
                    className="flex flex-col p-3 rounded-xl bg-slate-950/40 border border-slate-800/80 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-200">{diag.name}</span>
                        <span className="text-xs text-slate-500">({diag.latencyMs}ms)</span>
                      </div>
                      {statusBadge}
                    </div>

                    {diag.error && (
                      <p className="mt-1.5 text-xs text-slate-400 bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-slate-800/60 font-mono">
                        {diag.error}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* CACHE LAYER TAB */}
        {activeTab === 'cache' && (
          <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar">
            {/* Cache Telemetry Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-center">
                <div className="text-xs text-slate-400 font-medium">Hit Rate</div>
                <div className="text-xl font-bold text-cyan-400 mt-1">
                  {cacheStats?.hitRatePercentage ?? 0}%
                </div>
              </div>
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-center">
                <div className="text-xs text-slate-400 font-medium">Cached Queries</div>
                <div className="text-xl font-bold text-white mt-1">
                  {cacheStats?.activeEntries ?? 0}
                </div>
              </div>
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-center">
                <div className="text-xs text-emerald-400 font-medium">Cache Hits</div>
                <div className="text-xl font-bold text-emerald-400 mt-1">
                  {cacheStats?.totalHits ?? 0}
                </div>
              </div>
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-center">
                <div className="text-xs text-slate-400 font-medium">Misses</div>
                <div className="text-xl font-bold text-slate-400 mt-1">
                  {cacheStats?.totalMisses ?? 0}
                </div>
              </div>
            </div>

            {/* Current Search Cache Status */}
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
              <div className="font-semibold text-slate-200 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  Current Search State:
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full font-bold ${
                    cacheHit
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {cacheHit ? 'Served from Cache' : 'Direct Live Query'}
                </span>
              </div>
              {cacheHit && (
                <div className="text-slate-400 space-y-1">
                  <div>Cache Entry Age: <strong className="text-slate-200">{cacheAgeSec} seconds</strong></div>
                  <div>Category Max TTL: <strong className="text-slate-200">{cacheTtlSec} seconds</strong></div>
                </div>
              )}
            </div>

            {/* TTL Policies Table */}
            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Category TTL Expiration Rules
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800/80 flex items-center justify-between">
                  <span className="text-slate-400 capitalize">News</span>
                  <span className="font-semibold text-amber-400">3 minutes (180s)</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800/80 flex items-center justify-between">
                  <span className="text-slate-400 capitalize">All (Web)</span>
                  <span className="font-semibold text-blue-400">8 minutes (480s)</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800/80 flex items-center justify-between">
                  <span className="text-slate-400 capitalize">Images / Videos</span>
                  <span className="font-semibold text-purple-400">15 minutes (900s)</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800/80 flex items-center justify-between">
                  <span className="text-slate-400 capitalize">Science & Papers</span>
                  <span className="font-semibold text-emerald-400">15 minutes (900s)</span>
                </div>
              </div>
            </div>

            {/* Cache Invalidation Action */}
            <div className="flex items-center justify-between pt-2">
              {cacheClearSuccess ? (
                <div className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Search cache cleared successfully!</span>
                </div>
              ) : (
                <div className="text-xs text-slate-500">
                  Cache auto-prunes with LRU eviction at {cacheStats?.maxCapacity || 500} entries
                </div>
              )}

              <button
                onClick={handleClearCache}
                disabled={clearingCache}
                className="px-3 py-1.5 bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{clearingCache ? 'Clearing...' : 'Clear Search Cache'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="pt-4 mt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            Isolated cache & automatic provider fallbacks active
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
