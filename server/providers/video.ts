import { searchYouTube, YouTubeSearchResultItem } from './youtube.js';
import { searchPeerTube } from './peertube.js';
import { internetArchiveProvider } from './internet_archive.js';
import { wikimediaProvider } from './wikimedia.js';
import { CONFIG } from '../config.js';
import { NormalizedResult } from '../types.js';
import { calculateRelevance } from '../ranking.js';

export interface UnifiedVideoSearchResult {
  id: string;
  title: string;
  description: string;
  thumbnail?: string;
  channel?: string;
  channel_id?: string;
  published_at?: string;
  duration?: string;
  view_count?: string;
  url: string;
  embed_url?: string;
  source: string;
  type: string;
  score?: number;
  metadata?: Record<string, any>;
}

export async function searchAllVideos(options: {
  query: string;
  limit?: number;
  safeSearch?: 'none' | 'moderate' | 'strict';
  language?: string;
}): Promise<{
  results: UnifiedVideoSearchResult[];
  providersQueried: string[];
  providersSuccessful: string[];
}> {
  const { query, limit = 20, safeSearch = 'moderate', language } = options;
  const trimmed = query.trim();
  if (!trimmed) {
    return { results: [], providersQueried: [], providersSuccessful: [] };
  }

  const providersQueried: string[] = [];
  const providersSuccessful: string[] = [];
  const promises: Promise<UnifiedVideoSearchResult[]>[] = [];

  // 1. YouTube Data API v3 (if configured)
  if (CONFIG.YOUTUBE_API_KEY) {
    providersQueried.push('YouTube');
    promises.push(
      searchYouTube({ query: trimmed, limit: Math.min(limit, 15), safeSearch, language })
        .then((res) => {
          providersSuccessful.push('YouTube');
          return res.items.map((item) => ({
            id: item.id,
            title: item.title,
            description: item.description,
            thumbnail: item.thumbnail,
            channel: item.channel,
            channel_id: item.channel_id,
            published_at: item.published_at,
            duration: item.duration,
            view_count: item.view_count,
            url: item.url,
            embed_url: item.embed_url,
            source: 'YouTube',
            type: 'video',
            metadata: item.metadata,
          }));
        })
        .catch((err) => {
          console.warn('[VideoSearch] YouTube failed:', err.message);
          return [];
        })
    );
  }

  // 2. PeerTube Open Video
  providersQueried.push('PeerTube');
  promises.push(
    searchPeerTube({ query: trimmed, limit: 8 })
      .then((items) => {
        if (items.length > 0) providersSuccessful.push('PeerTube');
        return items.map((item) => ({
          id: item.id,
          title: item.title,
          description: item.description,
          thumbnail: item.thumbnail,
          channel: item.author || (item.metadata?.channel as string),
          channel_id: item.metadata?.channelId as string,
          published_at: item.publishedAt,
          duration: item.metadata?.duration as string,
          view_count: item.metadata?.viewCount as string,
          url: item.url,
          embed_url: item.metadata?.embedUrl as string,
          source: 'PeerTube',
          type: 'video',
          metadata: item.metadata,
        }));
      })
      .catch(() => [])
  );

  // 3. Internet Archive Movies
  providersQueried.push('Internet Archive');
  promises.push(
    internetArchiveProvider
      .search(trimmed, 'videos', 8)
      .then((items) => {
        if (items.length > 0) providersSuccessful.push('Internet Archive');
        return items.map((item) => ({
          id: item.id,
          title: item.title,
          description: item.description,
          thumbnail: item.thumbnail,
          channel: item.author || 'Internet Archive',
          published_at: item.publishedAt,
          url: item.url,
          embed_url: item.metadata?.embedUrl as string,
          source: 'Internet Archive',
          type: 'video',
          metadata: item.metadata,
        }));
      })
      .catch(() => [])
  );

  // 4. Wikimedia Commons Video
  providersQueried.push('Wikimedia Commons');
  promises.push(
    wikimediaProvider
      .search(trimmed, 'videos', 6)
      .then((items) => {
        if (items.length > 0) providersSuccessful.push('Wikimedia Commons');
        return items.map((item) => ({
          id: item.id,
          title: item.title,
          description: item.description,
          thumbnail: item.thumbnail,
          channel: item.author || 'Wikimedia Commons',
          published_at: item.publishedAt,
          url: item.url,
          embed_url: item.metadata?.videoUrl as string,
          source: 'Wikimedia Commons',
          type: 'video',
          metadata: item.metadata,
        }));
      })
      .catch(() => [])
  );

  const settled = await Promise.all(promises);
  const combined = settled.flat();

  // Deduplicate and filter strictly for query relevance
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();
  const relevantResults: UnifiedVideoSearchResult[] = [];

  for (const video of combined) {
    const cleanUrl = video.url.toLowerCase().trim();
    const cleanTitle = video.title.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (seenUrls.has(cleanUrl) || (cleanTitle.length > 5 && seenTitles.has(cleanTitle))) {
      continue;
    }

    // Evaluate query relevance
    const normalizedItem: NormalizedResult = {
      id: video.id,
      title: video.title,
      url: video.url,
      description: video.description,
      source: video.source,
      type: 'video',
      thumbnail: video.thumbnail,
      author: video.channel,
      publishedAt: video.published_at,
      score: 0,
      metadata: video.metadata,
    };

    const evaluation = calculateRelevance(normalizedItem, trimmed, 'videos');
    if (!evaluation.isRelevant) {
      // Reject irrelevant videos
      continue;
    }

    seenUrls.add(cleanUrl);
    seenTitles.add(cleanTitle);
    relevantResults.push({
      ...video,
      score: evaluation.score,
    });
  }

  // Sort by relevance score descending
  relevantResults.sort((a, b) => (b.score || 0) - (a.score || 0));

  return {
    results: relevantResults.slice(0, limit),
    providersQueried,
    providersSuccessful,
  };
}
