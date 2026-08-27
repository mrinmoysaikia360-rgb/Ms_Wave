import React from 'react';
import { ExternalLink, Layers, Calendar, User, Check, Globe } from 'lucide-react';
import { NormalizedResult } from '../types.js';

interface ResultCardProps {
  result: NormalizedResult;
}

export const ResultCard: React.FC<ResultCardProps> = ({ result }) => {
  let hostname = '';
  try {
    hostname = new URL(result.url).hostname.replace(/^www\./, '');
  } catch {
    hostname = result.source;
  }

  const allSources = result.sources && result.sources.length > 0 ? result.sources : [result.source];

  return (
    <article
      id={`result-${result.id}`}
      className="group p-4 sm:p-5 bg-slate-900/60 hover:bg-slate-900/90 border border-slate-800/80 hover:border-blue-500/40 rounded-2xl transition-all duration-200 shadow-sm hover:shadow-lg hover:shadow-blue-950/20"
    >
      <div className="flex flex-col gap-2">
        {/* Top metadata line: Domain / Hostname & Sources */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            {result.thumbnail ? (
              <img
                src={result.thumbnail}
                alt=""
                referrerPolicy="no-referrer"
                className="w-4 h-4 rounded object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <Globe className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span className="text-slate-400 font-medium truncate max-w-[200px] sm:max-w-xs">{hostname}</span>
          </div>

          {/* Sources badges */}
          <div className="flex flex-wrap items-center gap-1.5">
            {allSources.map((src, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20"
              >
                {src}
              </span>
            ))}
            {allSources.length > 1 && (
              <span
                title="Corroborated by multiple search sources"
                className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 text-[10px] font-bold border border-emerald-500/30"
              >
                Corroborated ({allSources.length})
              </span>
            )}
          </div>
        </div>

        {/* Title */}
        <h3 className="text-base sm:text-lg font-bold text-blue-400 group-hover:text-blue-300 leading-snug">
          <a
            href={result.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline flex items-center gap-1.5"
          >
            <span>{result.title}</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity shrink-0" />
          </a>
        </h3>

        {/* Body Description with optional thumbnail */}
        <div className="flex gap-4 items-start mt-1">
          <p className="text-sm text-slate-300 leading-relaxed line-clamp-3 sm:line-clamp-4 flex-1 font-normal">
            {result.description || 'No description provided.'}
          </p>

          {result.thumbnail && (
            <div className="shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 hidden xs:block">
              <img
                src={result.thumbnail}
                alt={result.title}
                referrerPolicy="no-referrer"
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  (e.target as HTMLElement).parentElement!.style.display = 'none';
                }}
              />
            </div>
          )}
        </div>

        {/* Bottom meta details: Author, Published Date, Score */}
        <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-slate-500 border-t border-slate-800/40">
          {result.author && (
            <span className="flex items-center gap-1">
              <User className="w-3 h-3 text-slate-400" />
              <span className="text-slate-400 truncate max-w-[150px]">{result.author}</span>
            </span>
          )}

          {result.publishedAt && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" />
              <span>{new Date(result.publishedAt).toLocaleDateString()}</span>
            </span>
          )}

          <span className="ml-auto font-mono text-[11px] text-slate-400 bg-slate-950/60 px-2 py-0.5 rounded border border-slate-800/60">
            Relevance: {result.score} pts
          </span>
        </div>
      </div>
    </article>
  );
};
