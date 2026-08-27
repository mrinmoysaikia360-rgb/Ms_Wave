import { NormalizedResult, SearchCategory, SearchProvider } from '../types.js';

export interface AudioSearchResultItem {
  id: string;
  title: string;
  artist: string;
  album?: string;
  genre?: string;
  duration?: string;
  thumbnail?: string;
  audio_url?: string;
  page_url: string;
  source: string;
  type: string;
  license?: string;
  metadata?: Record<string, any>;
}

/**
 * Format milliseconds into standard mm:ss
 */
function formatMsDuration(ms?: number): string {
  if (!ms || isNaN(ms)) return '';
  const totalSec = Math.floor(ms / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export async function searchAudio(options: {
  query: string;
  limit?: number;
  signal?: AbortSignal;
}): Promise<AudioSearchResultItem[]> {
  const trimmed = options.query.trim();
  if (!trimmed) return [];

  const limit = options.limit || 15;
  const encoded = encodeURIComponent(trimmed);

  const results: AudioSearchResultItem[] = [];

  // 1. iTunes Music API
  try {
    const itunesUrl = `https://itunes.apple.com/search?term=${encoded}&media=music&entity=song,album&limit=${limit}`;
    const itunesRes = await fetch(itunesUrl, {
      signal: options.signal,
      headers: {
        'User-Agent': 'MsWaveMetasearch/1.0',
        Accept: 'application/json',
      },
    });

    if (itunesRes.ok) {
      const itunesData = await itunesRes.json();
      for (const item of itunesData?.results || []) {
        const isSong = item.wrapperType === 'track';
        const title = isSong ? item.trackName : item.collectionName || 'Music Track';
        const artist = item.artistName || 'Unknown Artist';
        const album = item.collectionName || '';
        const genre = item.primaryGenreName || 'Music';
        const previewUrl = item.previewUrl; // 30s official stream
        const artwork = item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb', '600x600bb') : undefined;
        const pageUrl = item.trackViewUrl || item.collectionViewUrl || item.artistViewUrl || `https://music.apple.com`;
        const duration = formatMsDuration(item.trackTimeMillis);

        results.push({
          id: `itunes-${item.trackId || item.collectionId || results.length}`,
          title,
          artist,
          album,
          genre,
          duration,
          thumbnail: artwork,
          audio_url: previewUrl,
          page_url: pageUrl,
          source: 'iTunes Music',
          type: 'music',
          metadata: {
            trackId: item.trackId,
            collectionId: item.collectionId,
            releaseDate: item.releaseDate,
            previewUrl,
            duration,
          },
        });
      }
    }
  } catch {
    // Continue to other audio sources
  }

  // 2. Internet Archive Audio API
  try {
    const archiveUrl = `https://archive.org/advancedsearch.php?q=${encoded}+AND+mediatype:audio&fl[]=identifier,title,creator,description,date,year,downloads&sort[]=downloads+desc&rows=8&output=json`;
    const archiveRes = await fetch(archiveUrl, {
      signal: options.signal,
      headers: {
        'User-Agent': 'MsWaveMetasearch/1.0',
        Accept: 'application/json',
      },
    });

    if (archiveRes.ok) {
      const archiveData = await archiveRes.json();
      for (const doc of archiveData?.response?.docs || []) {
        const id = doc.identifier;
        const title = doc.title || id;
        const artist = Array.isArray(doc.creator) ? doc.creator.join(', ') : doc.creator || 'Internet Archive Community';
        const artwork = `https://archive.org/services/img/${id}`;
        const pageUrl = `https://archive.org/details/${id}`;
        const audioUrl = `https://archive.org/download/${id}/${id}.mp3`;

        results.push({
          id: `ia-audio-${id}`,
          title,
          artist,
          album: 'Archive Audio Collection',
          duration: '',
          thumbnail: artwork,
          audio_url: audioUrl,
          page_url: pageUrl,
          source: 'Internet Archive',
          type: 'music',
          license: 'Creative Commons / Public Domain',
          metadata: {
            identifier: id,
            downloads: doc.downloads,
            date: doc.date,
          },
        });
      }
    }
  } catch {
    // continue
  }

  return results;
}

export const musicProvider: SearchProvider = {
  id: 'music',
  name: 'iTunes / Apple Music & Audio',
  supportedCategories: ['music', 'all'],
  isConfigured: () => true,

  async search(query: string, category: SearchCategory, limit = 12, signal?: AbortSignal): Promise<NormalizedResult[]> {
    const items = await searchAudio({ query, limit, signal });
    return items.map((item, index) => ({
      id: item.id,
      title: item.title,
      url: item.page_url,
      description: `${item.artist}${item.album ? ` • ${item.album}` : ''}${item.genre ? ` • ${item.genre}` : ''}${item.duration ? ` (${item.duration})` : ''}`,
      source: item.source,
      type: 'music',
      thumbnail: item.thumbnail,
      author: item.artist,
      score: 38 - index * 2,
      metadata: {
        ...item.metadata,
        artist: item.artist,
        album: item.album,
        genre: item.genre,
        previewUrl: item.audio_url,
        duration: item.duration,
        license: item.license,
      },
    }));
  },
};
