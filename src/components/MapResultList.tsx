import React, { useState } from 'react';
import { MapPin, Navigation, ExternalLink, Compass, Globe } from 'lucide-react';
import { NormalizedResult } from '../types.js';

interface MapResultListProps {
  results: NormalizedResult[];
}

export const MapResultList: React.FC<MapResultListProps> = ({ results }) => {
  const [selectedMap, setSelectedMap] = useState<NormalizedResult | null>(results[0] || null);

  if (!results || results.length === 0) return null;

  return (
    <div id="maps-results-container" className="w-full space-y-4">
      {/* Active Featured Map Embed if available */}
      {selectedMap && selectedMap.metadata?.lat && selectedMap.metadata?.lon && (
        <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <MapPin className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-white">{selectedMap.title}</h3>
            </div>
            <a
              href={`https://www.openstreetmap.org/directions?to=${selectedMap.metadata.lat}%2C${selectedMap.metadata.lon}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Get Directions</span>
            </a>
          </div>

          {/* Interactive OpenStreetMap Embed */}
          <div className="w-full h-64 sm:h-80 bg-slate-950 rounded-xl overflow-hidden border border-slate-800 relative">
            <iframe
              title={`Map of ${selectedMap.title}`}
              width="100%"
              height="100%"
              frameBorder="0"
              scrolling="no"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${selectedMap.metadata.lon - 0.04}%2C${selectedMap.metadata.lat - 0.04}%2C${selectedMap.metadata.lon + 0.04}%2C${selectedMap.metadata.lat + 0.04}&layer=mapnik&marker=${selectedMap.metadata.lat}%2C${selectedMap.metadata.lon}`}
              className="w-full h-full"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between text-xs text-slate-400">
            <span>{selectedMap.description}</span>
            <span className="font-mono text-slate-500">
              Coordinates: {selectedMap.metadata.lat.toFixed(5)}, {selectedMap.metadata.lon.toFixed(5)}
            </span>
          </div>
        </div>
      )}

      {/* List of Locations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {results.map((loc) => {
          const isSelected = selectedMap?.id === loc.id;
          const lat = loc.metadata?.lat;
          const lon = loc.metadata?.lon;
          const placeType = loc.metadata?.placeType;

          return (
            <div
              key={loc.id}
              onClick={() => setSelectedMap(loc)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col gap-2 ${
                isSelected
                  ? 'bg-slate-900 border-blue-500 shadow-md shadow-blue-950/30'
                  : 'bg-slate-900/60 hover:bg-slate-900 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-semibold text-xs border border-blue-500/20 capitalize">
                  {placeType || 'Location'}
                </span>
                {lat && lon && (
                  <span className="text-[11px] font-mono text-slate-500">
                    {lat.toFixed(4)}, {lon.toFixed(4)}
                  </span>
                )}
              </div>

              <h4 className="text-base font-bold text-slate-100 hover:text-blue-400 transition-colors">
                {loc.title}
              </h4>

              <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                {loc.description}
              </p>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs">
                <span className="text-slate-500 flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5" />
                  {loc.source}
                </span>
                <a
                  href={loc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-blue-400 hover:underline flex items-center gap-1 font-medium"
                >
                  <span>Open in OSM</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
