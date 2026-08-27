import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  Music,
  Disc,
  User,
  ExternalLink,
  Volume2,
  VolumeX,
  Clock,
  Sparkles,
} from 'lucide-react';
import { NormalizedResult } from '../types.js';

interface MusicResultListProps {
  results: NormalizedResult[];
}

export const MusicResultList: React.FC<MusicResultListProps> = ({ results }) => {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<string>('0:00');
  const [muted, setMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  if (!results || results.length === 0) return null;

  const handleTogglePlay = (track: NormalizedResult) => {
    const previewUrl = track.metadata?.previewUrl || track.metadata?.audioUrl;
    if (!previewUrl) {
      window.open(track.url, '_blank');
      return;
    }

    if (playingId === track.id) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setPlayingId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }

      const audio = new Audio(previewUrl);
      audio.muted = muted;
      audioRef.current = audio;

      audio.ontimeupdate = () => {
        if (audio.duration) {
          const prog = (audio.currentTime / audio.duration) * 100;
          setProgress(prog);
          const curMins = Math.floor(audio.currentTime / 60);
          const curSecs = Math.floor(audio.currentTime % 60);
          setCurrentTime(`${curMins}:${curSecs < 10 ? '0' : ''}${curSecs}`);
        }
      };

      audio.onended = () => {
        setPlayingId(null);
        setProgress(0);
        setCurrentTime('0:00');
      };

      audio.play().catch(() => {});
      setPlayingId(track.id);
    }
  };

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (audioRef.current) {
      audioRef.current.muted = !muted;
    }
    setMuted(!muted);
  };

  return (
    <div id="music-results-container" className="w-full space-y-3 sm:space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {results.map((track) => {
          const isPlaying = playingId === track.id;
          const previewUrl = track.metadata?.previewUrl || track.metadata?.audioUrl;
          const artist = track.author || track.metadata?.artist || 'Unknown Artist';
          const album = track.metadata?.album;
          const genre = track.metadata?.genre;
          const duration = track.metadata?.duration;
          const license = track.metadata?.license;

          return (
            <div
              key={track.id}
              id={`music-card-${track.id}`}
              className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                isPlaying
                  ? 'bg-blue-950/40 border-blue-500 shadow-xl shadow-blue-950/40'
                  : 'bg-slate-900/60 hover:bg-slate-900 border-slate-800/80 hover:border-blue-500/40'
              }`}
            >
              <div className="flex items-center gap-3.5">
                {/* Artwork Stage with Play Overlay */}
                <div
                  className="relative w-18 h-18 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-slate-950 shrink-0 border border-slate-800 cursor-pointer group"
                  onClick={() => handleTogglePlay(track)}
                >
                  {track.thumbnail ? (
                    <img
                      src={track.thumbnail}
                      alt={track.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-500">
                      <Disc className="w-8 h-8 opacity-40 text-blue-400" />
                    </div>
                  )}

                  {/* Play/Pause Button Overlay */}
                  <div
                    className={`absolute inset-0 bg-black/45 flex items-center justify-center transition-opacity ${
                      isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                      {isPlaying ? (
                        <Pause className="w-4 h-4 fill-white" />
                      ) : (
                        <Play className="w-4 h-4 fill-white ml-0.5" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Track Details */}
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm sm:text-base font-bold text-slate-100 truncate hover:text-blue-400 transition-colors">
                      <a href={track.url} target="_blank" rel="noopener noreferrer">
                        {track.title}
                      </a>
                    </h4>
                    {duration && (
                      <span className="text-xs font-mono text-slate-400 shrink-0 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {duration}
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-300 font-medium truncate flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{artist}</span>
                  </div>

                  {album && (
                    <div className="text-xs text-slate-400 truncate flex items-center gap-1.5">
                      <Disc className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{album}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* In-Card Progress Bar & Audio Player Controls (When active) */}
              {isPlaying && (
                <div className="bg-slate-950/80 p-2.5 rounded-xl border border-blue-500/30 space-y-1.5 animate-in fade-in">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-300">
                    <span className="text-blue-400 font-semibold flex items-center gap-1">
                      <Volume2 className="w-3 h-3 animate-pulse" /> Playing Preview
                    </span>
                    <span>{currentTime}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-150"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Bottom bar with genre tag and actions */}
              <div className="flex items-center justify-between pt-1 text-xs text-slate-400">
                <span className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-[11px] text-blue-400 font-semibold">
                  {genre || track.source}
                </span>

                <div className="flex items-center gap-2">
                  {previewUrl && (
                    <button
                      onClick={() => handleTogglePlay(track)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                        isPlaying
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                      }`}
                    >
                      {isPlaying ? (
                        <>
                          <Pause className="w-3 h-3 fill-current" />
                          <span>Pause</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3 fill-current ml-0.5" />
                          <span>Preview</span>
                        </>
                      )}
                    </button>
                  )}

                  {isPlaying && (
                    <button
                      onClick={handleToggleMute}
                      className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors"
                      title={muted ? 'Unmute' : 'Mute'}
                    >
                      {muted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5" />}
                    </button>
                  )}

                  <a
                    href={track.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 text-slate-400 hover:text-blue-400 transition-colors"
                    title={`Open track on ${track.source}`}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
