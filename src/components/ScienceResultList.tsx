import React from 'react';
import { GraduationCap, ExternalLink, FileText, Download, Award, BookOpen } from 'lucide-react';
import { NormalizedResult } from '../types.js';

interface ScienceResultListProps {
  results: NormalizedResult[];
}

export const ScienceResultList: React.FC<ScienceResultListProps> = ({ results }) => {
  if (!results || results.length === 0) return null;

  return (
    <div id="science-results-container" className="w-full space-y-4">
      {results.map((paper) => {
        const doi = paper.metadata?.doi;
        const pdfUrl = paper.metadata?.pdfUrl || paper.metadata?.openAccessPdf;
        const citations = paper.metadata?.citationCount;
        const journal = paper.metadata?.journal || paper.metadata?.primaryCategory;
        const concepts = paper.metadata?.concepts || [];

        return (
          <article
            key={paper.id}
            className="group p-5 bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 hover:border-emerald-500/40 rounded-2xl transition-all shadow-sm flex flex-col gap-3"
          >
            {/* Header badges: Source, Journal, Year */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 flex items-center gap-1">
                  <GraduationCap className="w-3 h-3" />
                  {paper.source}
                </span>

                {journal && (
                  <span className="text-slate-400 font-medium truncate max-w-[250px]">
                    {journal}
                  </span>
                )}

                {paper.publishedAt && (
                  <span className="text-slate-500 font-mono">
                    {new Date(paper.publishedAt).getFullYear()}
                  </span>
                )}
              </div>

              {citations !== undefined && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[11px] font-semibold border border-amber-500/20 flex items-center gap-1">
                  <Award className="w-3 h-3" /> {citations} citations
                </span>
              )}
            </div>

            {/* Paper Title */}
            <h3 className="text-base sm:text-lg font-bold text-slate-100 group-hover:text-emerald-400 transition-colors leading-snug">
              <a
                href={paper.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline flex items-start gap-1.5"
              >
                <span>{paper.title}</span>
                <ExternalLink className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
              </a>
            </h3>

            {/* Authors */}
            {paper.author && (
              <div className="text-xs text-slate-400 font-medium">
                Authors: <span className="text-slate-300">{paper.author}</span>
              </div>
            )}

            {/* Abstract / Description */}
            <p className="text-sm text-slate-300 leading-relaxed font-normal">
              {paper.description}
            </p>

            {/* Research Concept Tags */}
            {concepts.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {concepts.map((concept: string, idx: number) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-md bg-slate-950 text-slate-400 text-[11px] border border-slate-800"
                  >
                    #{concept}
                  </span>
                ))}
              </div>
            )}

            {/* Action Bar: DOI, Open Access PDF, Source */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/60 text-xs">
              <div className="flex items-center gap-2">
                {doi && (
                  <span className="text-slate-400 font-mono text-[11px]">
                    DOI: {doi}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {pdfUrl && (
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-600/90 hover:bg-emerald-500 text-white rounded-lg font-semibold transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Open Access PDF</span>
                  </a>
                )}
                <a
                  href={paper.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>View Paper</span>
                </a>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
};
