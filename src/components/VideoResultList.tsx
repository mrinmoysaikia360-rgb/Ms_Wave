import React, { useState } from 'react';
import {
  Play,
  ExternalLink,
  X,
  User,
  Calendar,
  Eye,
  Clock,
  Tv,
  Film,
  AlertCircle,
  Share2,
} from 'lucide-react';
import { NormalizedResult } from '../types.js';

interface VideoResultListProps {
  results: NormalizedResult[];
}

export const VideoResultList: React.FC<VideoResultListProps> = ({ results }) => {
  const [activeEmbed, setActiveEmbed] = useState<NormalizedResult | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!results || results.length === 0) {
    return null;
  }

  const handleShare = (e: React.MouseEvent, video: NormalizedResult) => {
    e.stopPropagation();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(video.url);
      setCopiedId(video.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  return (
    <div id="video-results-container" className="w-full space-y-4">
      {/* Video Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {results.map((video) => {
          const embedUrl = video.metadata?.embedUrl || video.metadata?.videoUrl;
          const duration = video.metadata?.duration;
          const viewCount = video.metadata?.viewCount;
          const channel = video.metadata?.channel || video.author || 'Video Creator';
          const isDirectVideo =
            video.metadata?.videoUrl ||
            (embedUrl && (embedUrl.endsWith('.mp4') || embedUrl.endsWith('.webm') || embedUrl.endsWith('.ogv')));

          return (
            <div
              key={video.id}
              id={`video-card-${video.id}`}
              className="group p-3.5 sm:p-4 bg-slate-900/70 hover:bg-slate-900 border border-slate-800/80 hover:border-blue-500/40 rounded-2xl transition-all flex flex-col justify-between gap-3 shadow-lg shadow-black/20"
            >
              {/* Top: Video Thumbnail Stage */}
              <div
                className="relative aspect-video bg-slate-950 rounded-xl overflow-hidden cursor-pointer group/thumb flex items-center justify-center border border-slate-800"
                onClick={() => {
                  if (embedUrl) {
                    setActiveEmbed(video);
                  } else {
                    window.open(video.url, '_blank', 'noopener,noreferrer');
                  }
                }}
              >
                {video.thumbnail ? (
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-slate-600 gap-2">
                    <Film className="w-10 h-10 opacity-30 text-blue-400" />
                    <span className="text-[11px] font-medium text-slate-500">{video.source}</span>
                  </div>
                )}

                {/* Dark Hover Overlay & Center Play Button */}
                <div className="absolute inset-0 bg-black/30 group-hover/thumb:bg-black/50 transition-colors flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-blue-600/90 text-white flex items-center justify-center shadow-xl group-hover/thumb:scale-110 group-hover/thumb:bg-blue-500 transition-all">
                    <Play className="w-5 h-5 fill-white ml-0.5" />
                  </div>
                </div>

                {/* Source Badge (Top Left) */}
                <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-md text-[11px] font-bold text-blue-400 border border-white/10 shadow-md">
                  {video.source}
                </span>

                {/* Duration Badge (Bottom Right) */}
                {duration && (
                  <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/85 backdrop-blur-md text-[11px] font-mono font-semibold text-slate-200 border border-white/10 shadow-md flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {duration}
                  </span>
                )}
              </div>

              {/* Middle: Video Information */}
              <div className="flex flex-col gap-2 flex-1 justify-between">
                <div className="space-y-1.5">
                  <h4 className="text-sm sm:text-base font-bold text-slate-100 group-hover:text-blue-400 transition-colors line-clamp-2">
                    <a
                      href={video.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      {video.title}
                    </a>
                  </h4>

                  <p className="text-xs text-slate-400 line-clamp-2 font-normal leading-relaxed">
                    {video.description || 'Verified video stream indexed by Ms Wave.'}
                  </p>
                </div>

                {/* Meta details (Channel, Date, Views) */}
                <div className="pt-2 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-y-1.5 text-xs text-slate-400">
                  <div className="flex items-center gap-1.5 font-medium text-slate-300 truncate max-w-[180px]">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{channel}</span>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-slate-400 shrink-0 ml-auto">
                    {viewCount && (
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3 text-slate-400" />
                        {viewCount}
                      </span>
                    )}

                    {video.publishedAt && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {new Date(video.publishedAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions (Watch in App / Open Externally) */}
                <div className="pt-2 flex items-center justify-between gap-2">
                  <button
                    onClick={() => {
                      if (embedUrl) {
                        setActiveEmbed(video);
                      } else {
                        window.open(video.url, '_blank', 'noopener,noreferrer');
                      }
                    }}
                    className="flex-1 py-1.5 px-3 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Watch in Ms Wave</span>
                  </button>

                  <a
                    href={video.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1 transition-colors"
                    title={`Open on ${video.source}`}
                  >
                    <span>{video.source}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>

                  <button
                    onClick={(e) => handleShare(e, video)}
                    className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title="Copy Video Link"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                  {copiedId === video.id && (
                    <span className="text-[10px] text-emerald-400 font-semibold animate-in fade-in">
                      Copied!
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* In-App Embedded Video Player Modal */}
      {activeEmbed && (
        <div
          id="video-player-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/90 backdrop-blur-md animate-in fade-in duration-150"
          onClick={() => setActiveEmbed(null)}
        >
          <div
            className="relative max-w-4xl w-full bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
              <div className="flex items-center gap-2 truncate pr-4">
                <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-bold shrink-0">
                  {activeEmbed.source}
                </span>
                <h3 className="text-sm sm:text-base font-bold text-white truncate">
                  {activeEmbed.title}
                </h3>
              </div>
              <button
                onClick={() => setActiveEmbed(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
                title="Close Player"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Video Stage */}
            <div className="aspect-video w-full bg-black flex items-center justify-center relative">
              {activeEmbed.metadata?.videoUrl &&
              (activeEmbed.metadata?.videoUrl.endsWith('.mp4') ||
                activeEmbed.metadata?.videoUrl.endsWith('.webm') ||
                activeEmbed.metadata?.videoUrl.endsWith('.ogv')) ? (
                <video
                  src={activeEmbed.metadata.videoUrl}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              ) : (
                <iframe
                  src={activeEmbed.metadata?.embedUrl}
                  title={activeEmbed.title}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="p-4 bg-slate-950/90 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3 text-slate-400">
                {activeEmbed.metadata?.channel && (
                  <span className="font-semibold text-slate-200">
                    Channel: {activeEmbed.metadata.channel}
                  </span>
                )}
                {activeEmbed.metadata?.viewCount && <span>{activeEmbed.metadata.viewCount}</span>}
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <a
                  href={activeEmbed.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors"
                >
                  <span>Watch on {activeEmbed.source}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
