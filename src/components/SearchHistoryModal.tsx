import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  Trash2,
  Search,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Download,
  Filter,
  Layers,
  Sparkles,
  AlertCircle,
  FileText,
  Video,
  Image,
  Newspaper,
  BookOpen,
  Music,
  MapPin,
  RefreshCw,
} from 'lucide-react';
import { SearchCategory, SearchHistoryItem } from '../types.js';
import { apiFetch } from '../lib/api.js';

interface SearchHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectQuery: (query: string, category: SearchCategory, sortBy: 'relevance' | 'date' | 'source') => void;
}

const CATEGORY_ICONS: Record<SearchCategory, React.ReactNode> = {
  all: <Search className="w-3.5 h-3.5" />,
  images: <Image className="w-3.5 h-3.5" />,
  videos: <Video className="w-3.5 h-3.5" />,
  news: <Newspaper className="w-3.5 h-3.5" />,
  science: <BookOpen className="w-3.5 h-3.5" />,
  music: <Music className="w-3.5 h-3.5" />,
  maps: <MapPin className="w-3.5 h-3.5" />,
};

export const SearchHistoryModal: React.FC<SearchHistoryModalProps> = ({
  isOpen,
  onClose,
  onSelectQuery,
}) => {
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = '/api/history?limit=100';
      if (categoryFilter !== 'all') {
        url += `&category=${encodeURIComponent(categoryFilter)}`;
      }
      if (searchTerm.trim()) {
        url += `&search=${encodeURIComponent(searchTerm.trim())}`;
      }

      const res = await apiFetch(url);
      if (!res.ok) {
        throw new Error('Failed to load search history');
      }
      const data = await res.json();
      setHistory(data.history || []);
    } catch (err: any) {
      setError(err.message || 'Unable to retrieve search history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen, categoryFilter, searchTerm]);

  const handleDeleteItem = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeletingId(id);
    try {
      const res = await apiFetch(`/api/history/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setHistory((prev) => prev.filter((item) => item.id !== id));
      }
    } catch (err) {
      console.error('Delete history item error:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearAll = async () => {
    setClearing(true);
    try {
      const res = await apiFetch('/api/history', { method: 'DELETE' });
      if (res.ok) {
        setHistory([]);
        setShowConfirmClear(false);
      }
    } catch (err) {
      console.error('Clear history error:', err);
    } finally {
      setClearing(false);
    }
  };

  const handleExportHistory = () => {
    if (history.length === 0) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(history, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `ms_wave_history_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const formatTimestamp = (ts: number) => {
    const diff = Date.now() - ts;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  if (!isOpen) return null;

  return (
    <div
      id="search-history-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="search-history-modal-content"
        className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white">Private Search History</h3>
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-700">
                  {history.length} {history.length === 1 ? 'entry' : 'entries'}
                </span>
              </div>
              <p className="text-xs text-slate-400">Search events isolated and encrypted to your account</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <button
                id="btn-export-history"
                onClick={handleExportHistory}
                title="Export Search History as JSON"
                className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700 transition-colors flex items-center gap-1.5 text-xs font-medium"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export</span>
              </button>
            )}

            <button
              id="btn-close-history-modal"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter & Search Bar within history */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-950/30 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Query Filter */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search your history..."
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter Selector */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
            {(['all', 'news', 'science', 'images', 'videos', 'music', 'maps'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap capitalize transition-all ${
                  categoryFilter === cat
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
              <p className="text-xs">Loading search history...</p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && history.length === 0 && (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-500 mb-3">
                <Clock className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-slate-300 mb-1">No search history found</h4>
              <p className="text-xs text-slate-500 max-w-sm">
                {searchTerm || categoryFilter !== 'all'
                  ? 'No search history matches your current filters.'
                  : 'Your metasearches across Ms Wave will appear here securely.'}
              </p>
            </div>
          )}

          {!loading &&
            history.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  onSelectQuery(item.query, item.category, item.sortBy);
                  onClose();
                }}
                className="group flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/50 border border-slate-800/80 hover:border-blue-500/40 hover:bg-slate-800/40 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0 pr-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 group-hover:text-blue-400 flex items-center justify-center shrink-0">
                    {CATEGORY_ICONS[item.category] || <Search className="w-3.5 h-3.5" />}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-100 group-hover:text-blue-400 transition-colors truncate">
                        {item.query}
                      </span>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 shrink-0">
                        {item.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                      <span>{formatTimestamp(item.timestamp)}</span>
                      {item.resultsCount !== undefined && (
                        <>
                          <span>•</span>
                          <span>{item.resultsCount} results</span>
                        </>
                      )}
                      {item.topSources && item.topSources.length > 0 && (
                        <>
                          <span className="hidden sm:inline">•</span>
                          <span className="hidden sm:inline text-slate-400 truncate max-w-xs">
                            {item.topSources.slice(0, 3).join(', ')}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={(e) => handleDeleteItem(e, item.id)}
                    disabled={deletingId === item.id}
                    title="Delete entry"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    {deletingId === item.id ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>

                  <div className="p-1.5 text-slate-400 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/70 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Strictly isolated & private to your account</span>
          </div>

          {history.length > 0 && (
            <div>
              {showConfirmClear ? (
                <div className="flex items-center gap-2">
                  <span className="text-rose-400 font-semibold">Delete all?</span>
                  <button
                    onClick={handleClearAll}
                    disabled={clearing}
                    className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium transition-colors"
                  >
                    {clearing ? 'Clearing...' : 'Confirm'}
                  </button>
                  <button
                    onClick={() => setShowConfirmClear(false)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  id="btn-clear-all-history"
                  onClick={() => setShowConfirmClear(true)}
                  className="px-3 py-1.5 rounded-xl text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-all flex items-center gap-1.5 font-medium cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear All History</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
