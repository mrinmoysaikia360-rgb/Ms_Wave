import React from 'react';
import { Newspaper, ExternalLink, Clock, Globe } from 'lucide-react';
import { NormalizedResult } from '../types.js';

interface NewsResultListProps {
  results: NormalizedResult[];
}

function timeAgo(dateString?: string): string {
  if (!dateString) return 'Recent';
  try {
    const pub = new Date(dateString).getTime();
    const diffMs = Date.now() - pub;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 1) {
      const diffMins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
      return `${diffMins} min ago`;
    }
    if (diffHours < 24) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    }
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    }
    return new Date(dateString).toLocaleDateString();
  } catch {
    return 'Recent';
  }
}

export const NewsResultList: React.FC<NewsResultListProps> = ({ results }) => {
  if (!results || results.length === 0) return null;

  return (
    <div id="news-results-container" className="w-full space-y-3 sm:space-y-4">
      {results.map((item) => {
        const sourceName = item.author || item.metadata?.newsSource || item.source;
        return (
          <article
            key={item.id}
            className="group p-4 sm:p-5 bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 hover:border-blue-500/40 rounded-2xl transition-all shadow-sm flex flex-col gap-2"
          >
            {/* Top row: Source publication & time */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-bold border border-blue-500/20">
                  {sourceName}
                </span>
                <span className="text-slate-500 font-mono flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {timeAgo(item.publishedAt)}
                </span>
              </div>
            </div>

            {/* Headline */}
            <h3 className="text-base sm:text-lg font-bold text-slate-100 group-hover:text-blue-400 transition-colors leading-snug">
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline flex items-start gap-1.5"
              >
                <span>{item.title}</span>
                <ExternalLink className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
              </a>
            </h3>

            {/* Excerpt */}
            <p className="text-sm text-slate-300 leading-relaxed line-clamp-3 font-normal">
              {item.description}
            </p>
          </article>
        );
      })}
    </div>
  );
};
