import { NormalizedResult, SearchCategory, SearchProvider } from '../types.js';
import { CONFIG } from '../config.js';

export interface YouTubeSearchResultItem {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  channel: string;
  channel_id: string;
  published_at: string;
  duration: string;
  view_count?: string;
  url: string;
  embed_url: string;
  source: string;
  type: string;
  metadata?: Record<string, any>;
}

/**
 * Parse ISO 8601 duration (e.g. PT4M32S -> "4:32", PT1H23M45S -> "1:23:45")
 */
export function parseIsoDuration(isoDuration?: string): string {
  if (!isoDuration) return '';
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return '';
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);

  if (hours > 0) {
    return `${hours}:${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

/**
 * Format view count (e.g. 1540000 -> "1.5M views")
 */
export function formatViewCount(views?: string | number): string {
  if (views === undefined || views === null) return '';
  const count = typeof views === 'string' ? parseInt(views, 10) : views;
  if (isNaN(count)) return '';
  if (count >= 1_000_000_000) return `${(count / 1_000_000_000).toFixed(1)}B views`;
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M views`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K views`;
  return `${count.toLocaleString()} views`;
}

/**
 * Search YouTube Data API v3 and optionally retrieve batched video details (duration, views)
 */
export async function searchYouTube(options: {
  query: string;
  limit?: number;
  pageToken?: string;
  safeSearch?: 'none' | 'moderate' | 'strict';
  language?: string;
  signal?: AbortSignal;
}): Promise<{
  items: YouTubeSearchResultItem[];
  nextPageToken?: string;
  totalResults?: number;
}> {
  const apiKey = CONFIG.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error('YouTube API is not configured (YOUTUBE_API_KEY environment variable is required)');
  }

  const { query, limit = 12, pageToken, safeSearch = 'moderate', language, signal } = options;
  const trimmed = query.trim();
  if (!trimmed) {
    return { items: [] };
  }

  // 1. Query YouTube Data API v3 Search
  const searchParams = new URLSearchParams({
    part: 'snippet',
    type: 'video',
    q: trimmed,
    maxResults: String(Math.min(limit, 50)),
    safeSearch,
    key: apiKey,
  });

  if (pageToken) {
    searchParams.set('pageToken', pageToken);
  }
  if (language) {
    searchParams.set('relevanceLanguage', language);
  }

  const searchUrl = `https://www.googleapis.com/youtube/v3/search?${searchParams.toString()}`;
  const searchRes = await fetch(searchUrl, {
    signal,
    headers: {
      Accept: 'application/json',
      'User-Agent': 'MsWaveMetasearch/1.0',
    },
  });

  if (!searchRes.ok) {
    const errJson = await searchRes.json().catch(() => ({}));
    const errMsg = errJson?.error?.message || `YouTube API error HTTP ${searchRes.status}`;
    throw new Error(errMsg);
  }

  const searchData = await searchRes.json();
  const rawItems = searchData?.items || [];
  const videoIds = rawItems
    .map((item: any) => item?.id?.videoId)
    .filter(Boolean) as string[];

  // 2. Batch fetch video details (duration, statistics, contentDetails)
  const detailsMap = new Map<string, { duration: string; viewCount: string }>();
  if (videoIds.length > 0) {
    try {
      const detailsParams = new URLSearchParams({
        part: 'contentDetails,statistics',
        id: videoIds.join(','),
        key: apiKey,
      });
      const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?${detailsParams.toString()}`;
      const detailsRes = await fetch(detailsUrl, {
        signal,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'MsWaveMetasearch/1.0',
        },
      });

      if (detailsRes.ok) {
        const detailsData = await detailsRes.json();
        for (const item of detailsData?.items || []) {
          const vId = item?.id;
          if (vId) {
            const rawDuration = item?.contentDetails?.duration;
            const parsedDuration = parseIsoDuration(rawDuration);
            const viewCount = formatViewCount(item?.statistics?.viewCount);
            detailsMap.set(vId, { duration: parsedDuration, viewCount });
          }
        }
      }
    } catch {
      // Non-blocking detail enrichment
    }
  }

  // 3. Normalize results
  const items: YouTubeSearchResultItem[] = rawItems.map((item: any, index: number) => {
    const videoId = item?.id?.videoId || `yt_${index}`;
    const snippet = item?.snippet || {};
    const title = snippet.title || 'YouTube Video';
    const description = snippet.description || '';
    const channel = snippet.channelTitle || 'YouTube Creator';
    const channelId = snippet.channelId || '';
    const publishedAt = snippet.publishedAt || '';
    const thumbnail =
      snippet.thumbnails?.high?.url ||
      snippet.thumbnails?.medium?.url ||
      snippet.thumbnails?.default?.url ||
      `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    const details = detailsMap.get(videoId);
    const duration = details?.duration || '';
    const viewCount = details?.viewCount || '';

    const url = `https://www.youtube.com/watch?v=${videoId}`;
    const embedUrl = `https://www.youtube.com/embed/${videoId}`;

    return {
      id: `yt-${videoId}`,
      title,
      description,
      thumbnail,
      channel,
      channel_id: channelId,
      published_at: publishedAt,
      duration,
      view_count: viewCount,
      url,
      embed_url: embedUrl,
      source: 'YouTube',
      type: 'video',
      metadata: {
        videoId,
        channelId,
        channelTitle: channel,
        embedUrl,
        viewCount,
        duration,
        publishedAt,
      },
    };
  });

  return {
    items,
    nextPageToken: searchData?.nextPageToken,
    totalResults: searchData?.pageInfo?.totalResults,
  };
}

export const youtubeProvider: SearchProvider = {
  id: 'youtube',
  name: 'YouTube Data API',
  supportedCategories: ['videos', 'all', 'music'],
  isConfigured: () => Boolean(CONFIG.YOUTUBE_API_KEY),

  async search(query: string, category: SearchCategory, limit = 10, signal?: AbortSignal): Promise<NormalizedResult[]> {
    if (!CONFIG.YOUTUBE_API_KEY) {
      throw new Error('YouTube Data API is not configured (set YOUTUBE_API_KEY)');
    }

    const { items } = await searchYouTube({
      query,
      limit,
      signal,
    });

    return items.map((item, index) => ({
      id: item.id,
      title: item.title,
      url: item.url,
      description: item.description,
      source: 'YouTube',
      type: category === 'music' ? 'music' : 'video',
      thumbnail: item.thumbnail,
      publishedAt: item.published_at,
      author: item.channel,
      score: 45 - index * 2,
      metadata: {
        ...item.metadata,
        channel: item.channel,
        channelId: item.channel_id,
        duration: item.duration,
        viewCount: item.view_count,
        embedUrl: item.embed_url,
      },
    }));
  },
};
