import React, { useState } from 'react';
import { ExternalLink, X, Download, Maximize2, ShieldCheck, User } from 'lucide-react';
import { NormalizedResult } from '../types.js';

interface ImageResultGridProps {
  results: NormalizedResult[];
}

export const ImageResultGrid: React.FC<ImageResultGridProps> = ({ results }) => {
  const [selectedImage, setSelectedImage] = useState<NormalizedResult | null>(null);

  if (!results || results.length === 0) {
    return null;
  }

  return (
    <div id="image-results-container" className="w-full">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
        {results.map((item) => {
          const imgUrl = item.metadata?.imageUrl || item.thumbnail || item.url;
          return (
            <div
              key={item.id}
              onClick={() => setSelectedImage(item)}
              className="group relative bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden cursor-pointer shadow-sm hover:shadow-xl hover:border-blue-500/50 transition-all flex flex-col"
            >
              {/* Image Container */}
              <div className="relative aspect-square sm:aspect-[4/3] bg-slate-950 overflow-hidden flex items-center justify-center">
                <img
                  src={item.thumbnail || imgUrl}
                  alt={item.title}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=60';
                  }}
                />

                {/* Hover overlay icon */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2 sm:p-3">
                  <span className="text-white text-xs font-semibold truncate flex items-center gap-1">
                    <Maximize2 className="w-3.5 h-3.5" /> View image
                  </span>
                </div>
              </div>

              {/* Caption */}
              <div className="p-2.5 bg-slate-900/90 flex flex-col gap-1">
                <h4 className="text-xs font-semibold text-slate-200 truncate group-hover:text-blue-400 transition-colors">
                  {item.title}
                </h4>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="text-blue-400 truncate max-w-[100px]">{item.source}</span>
                  {item.metadata?.width && (
                    <span className="font-mono text-[10px] text-slate-400">
                      {item.metadata.width}×{item.metadata.height}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Full-view Lightbox Modal */}
      {selectedImage && (
        <div
          id="image-lightbox-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-150"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="relative max-w-4xl w-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-3.5 border-b border-slate-800 bg-slate-950/60">
              <div className="truncate pr-4">
                <h3 className="text-sm sm:text-base font-bold text-white truncate">{selectedImage.title}</h3>
                <span className="text-xs text-blue-400">{selectedImage.source}</span>
              </div>
              <button
                onClick={() => setSelectedImage(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Main Image */}
            <div className="flex-1 overflow-auto bg-black/60 p-4 flex items-center justify-center min-h-[300px]">
              <img
                src={selectedImage.metadata?.imageUrl || selectedImage.thumbnail || selectedImage.url}
                alt={selectedImage.title}
                referrerPolicy="no-referrer"
                className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-lg"
              />
            </div>

            {/* Footer Metadata & Actions */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
              <div className="flex flex-col gap-1 text-slate-300">
                {selectedImage.author && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <User className="w-3.5 h-3.5" />
                    <span>Creator: {selectedImage.author}</span>
                  </div>
                )}
                {selectedImage.metadata?.license && (
                  <div className="text-xs text-slate-400">
                    License: <span className="text-slate-300">{selectedImage.metadata.license}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={selectedImage.metadata?.imageUrl || selectedImage.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Original</span>
                </a>
                <a
                  href={selectedImage.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium text-xs flex items-center gap-1.5 transition-colors"
                >
                  <span>Source Page</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
