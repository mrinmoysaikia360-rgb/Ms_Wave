import React from 'react';
import {
  Sparkles,
  ExternalLink,
  ArrowRight,
  Compass,
  Globe,
  CheckCircle2,
  Search,
} from 'lucide-react';
import { AiOverviewData } from '../types.js';

interface AIOverviewProps {
  data: AiOverviewData;
  onSelectQuery?: (query: string) => void;
}

export const AIOverview: React.FC<AIOverviewProps> = ({ data, onSelectQuery }) => {
  if (!data || (!data.summary && (!data.keyPoints || data.keyPoints.length === 0))) {
    return null;
  }

  const isGrounded = !!data.groundedWithGoogle;

  return (
    <div
      id="ai-overview-card"
      className="w-full max-w-4xl mx-auto my-4 p-5 sm:p-6 bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-blue-950/40 border border-blue-500/30 rounded-2xl shadow-xl backdrop-blur-md relative overflow-hidden"
    >
      {/* Glow highlight */}
      <div className="absolute -top-16 -right-16 w-36 h-36 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <Sparkles className="w-4 h-4" />
          </div>
          <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
            <span>AI Overview & Synthesis</span>
            {isGrounded && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm">
                <Globe className="w-3 h-3 text-emerald-400" />
                Google Search Grounded
              </span>
            )}
          </h2>
        </div>
        <span className="text-[11px] text-blue-400/90 font-mono bg-blue-950/80 px-2.5 py-1 rounded-full border border-blue-800/40">
          {data.generatedBy}
        </span>
      </div>

      {/* Google Web Search Queries Tag (if provided by grounding) */}
      {data.webSearchQueries && data.webSearchQueries.length > 0 && (
        <div className="mb-3.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-400 bg-slate-950/50 p-2 rounded-xl border border-slate-800/60">
          <span className="text-slate-400 font-medium flex items-center gap-1 mr-1">
            <Search className="w-3 h-3 text-blue-400" /> Live Web Grounding:
          </span>
          {data.webSearchQueries.map((query, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 font-mono text-[11px] border border-slate-700/60"
            >
              "{query}"
            </span>
          ))}
        </div>
      )}

      {/* Main summary paragraph */}
      {data.summary && (
        <p className="text-sm sm:text-base text-slate-200 leading-relaxed whitespace-pre-line mb-4 font-normal">
          {data.summary}
        </p>
      )}

      {/* Key points */}
      {data.keyPoints && data.keyPoints.length > 0 && (
        <div className="space-y-2 mb-4">
          {data.keyPoints.map((point, idx) => (
            <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-300">
              <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
              <span>{point}</span>
            </div>
          ))}
        </div>
      )}

      {/* Suggested Follow-up Queries */}
      {data.suggestedQueries && data.suggestedQueries.length > 0 && (
        <div className="pt-3 pb-2 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400 font-semibold flex items-center gap-1">
            <Compass className="w-3.5 h-3.5 text-blue-400" /> Explore Related:
          </span>
          {data.suggestedQueries.map((sug, idx) => (
            <button
              key={idx}
              onClick={() => onSelectQuery && onSelectQuery(sug)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-950/60 hover:bg-blue-900/60 text-blue-300 border border-blue-800/40 transition-colors text-xs font-medium cursor-pointer"
            >
              <span>{sug}</span>
              <ArrowRight className="w-2.5 h-2.5 opacity-60" />
            </button>
          ))}
        </div>
      )}

      {/* Citations & Verified Sources (both Google Grounding and Providers) */}
      {data.citations && data.citations.length > 0 && (
        <div className="pt-3 border-t border-slate-800/60 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400 font-medium mr-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Verified Sources:
          </span>
          {data.citations.map((cite, index) => (
            <a
              key={index}
              href={cite.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors border ${
                cite.isGoogleSearchGrounded
                  ? 'bg-blue-950/70 hover:bg-blue-900/80 text-blue-300 hover:text-blue-100 border-blue-700/50'
                  : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700/80'
              }`}
            >
              {cite.isGoogleSearchGrounded && (
                <Globe className="w-3 h-3 text-emerald-400 shrink-0" />
              )}
              <span className="font-semibold text-slate-200">{cite.source}</span>
              <span className="text-slate-400 max-w-[140px] truncate">({cite.title})</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-70" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
};
