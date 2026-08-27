import React, { useState } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Layers,
  Zap,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { SearchStats } from '../types.js';
import { DiagnosticsModal } from './DiagnosticsModal.js';

interface SourceStatusProps {
  stats: SearchStats;
  onForceRefresh?: () => void;
  isRefreshing?: boolean;
}

export const SourceStatus: React.FC<SourceStatusProps> = ({
  stats,
  onForceRefresh,
  isRefreshing = false,
}) => {
  const [showModal, setShowModal] = useState(false);

  const failedProviders = stats.providers.filter(
    (p) => p.status === 'unavailable' || p.status === 'timeout'
  );

  return (
    <div id="source-status-section" className="w-full max-w-4xl mx-auto my-3 px-1">
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-900/60 border border-slate-800/80 rounded-2xl text-xs sm:text-sm text-slate-300 backdrop-blur-sm shadow-sm">
        {/* Main metric row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 font-medium">
          {/* Cache Hit Badge */}
          {stats.cacheHit ? (
            <div
              id="cache-hit-pill"
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 text-xs font-semibold animate-in fade-in"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>
                Cached ({stats.cacheAgeSec !== undefined ? `${stats.cacheAgeSec}s ago` : 'Fast'})
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-slate-200">
              <span className="text-slate-400">Sources queried:</span>
              <span className="font-bold text-white bg-slate-800/80 px-1.5 py-0.5 rounded-md border border-slate-700">
                {stats.sourcesQueried}
              </span>
            </div>
          )}

          <div className="flex items-center gap-1 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Successful:</span>
            <span className="font-bold">{stats.successful}</span>
          </div>

          {stats.failed > 0 && (
            <div className="flex items-center gap-1 text-rose-400">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Failed:</span>
              <span className="font-bold">{stats.failed}</span>
            </div>
          )}

          <div className="flex items-center gap-1 text-blue-400">
            <Layers className="w-3.5 h-3.5" />
            <span>Results collected:</span>
            <span className="font-bold text-slate-100">{stats.resultsCollected}</span>
          </div>

          <div className="flex items-center gap-1 text-purple-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Duplicates removed:</span>
            <span className="font-bold text-slate-100">{stats.duplicatesRemoved}</span>
          </div>

          {stats.lowRelevanceFiltered !== undefined && stats.lowRelevanceFiltered > 0 && (
            <div className="flex items-center gap-1 text-amber-400" title="Results rejected due to low query relevance">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Low relevance rejected:</span>
              <span className="font-bold text-amber-300">{stats.lowRelevanceFiltered}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 ml-auto">
          {onForceRefresh && (
            <button
              id="btn-force-refresh-search"
              onClick={onForceRefresh}
              disabled={isRefreshing}
              title="Bypass cache and query all search providers freshly"
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold border border-slate-700/80 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          )}

          <button
            id="btn-inspect-diagnostics"
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700/80 transition-all cursor-pointer hover:border-blue-500/50"
          >
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>Status Details ({stats.latencyMs}ms)</span>
          </button>
        </div>
      </div>

      {/* Notice only if whole search returned 0 results due to provider outages */}
      {stats.successful === 0 && failedProviders.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {failedProviders.map((p) => (
            <div
              key={p.id}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs"
            >
              <AlertCircle className="w-3 h-3 text-amber-400" />
              <span>
                <strong className="font-semibold">{p.name}</strong> — {p.error || 'temporarily unavailable'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Diagnostics details modal */}
      <DiagnosticsModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        diagnostics={stats.providers}
        totalLatencyMs={stats.latencyMs}
        sourcesQueried={stats.sourcesQueried}
        successful={stats.successful}
        failed={stats.failed}
        cacheHit={stats.cacheHit}
        cacheAgeSec={stats.cacheAgeSec}
        cacheTtlSec={stats.cacheTtlSec}
      />
    </div>
  );
};
