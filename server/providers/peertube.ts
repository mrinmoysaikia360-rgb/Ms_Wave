import { NormalizedResult, SearchCategory, SearchProvider } from '../types.js';

// Public instances that allow CORS / API search
const PEERTUBE_INSTANCES = [
  'https://peertube.tv',
  'https://framatube.org',
  'https://tilvids.com',
];

function formatDurationSeconds(sec?: number): string {
  if (!sec || isNaN(sec)) return '';
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = Math.floor(sec % 60);
  if (hours > 0) {
    return `${hours}:${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

export async function searchPeerTube(options: {
  query: string;
  limit?: number;
  signal?: AbortSignal;
}): Promise<NormalizedResult[]> {
  const trimmed = options.query.trim();
  if (!trimmed) return [];

  const limit = options.limit || 8;
  const encoded = encodeURIComponent(trimmed);

  // Attempt the primary instance, then fallbacks if needed
  for (const instance of PEERTUBE_INSTANCES) {
    try {
      const url = `${instance}/api/v1/search/videos?search=${encoded}&count=${limit}&sort=-match`;
      const res = await fetch(url, {
        signal: options.signal,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'MsWaveMetasearch/1.0',
        },
      });

      if (!res.ok) continue;

      const json = await res.json();
      const items = json?.data || [];
      if (!Array.isArray(items) || items.length === 0) continue;

      return items.map((v: any, index: number) => {
        const title = v.name || 'PeerTube Video';
        const description = (v.description || '').slice(0, 220);
        const channel = v.channel?.displayName || v.account?.displayName || 'PeerTube Creator';
        const channelId = v.channel?.name || '';
        const duration = formatDurationSeconds(v.duration);
        const viewCount = v.views !== undefined ? `${v.views.toLocaleString()} views` : '';
        const publishedAt = v.publishedAt;
        const pageUrl = v.url || `${instance}/w/${v.uuid || v.shortUUID}`;
        const embedUrl = v.embedPath ? `${instance}${v.embedPath}` : `${instance}/videos/embed/${v.uuid}`;
        const thumbnail = v.thumbnailPath ? `${instance}${v.thumbnailPath}` : (v.previewPath ? `${instance}${v.previewPath}` : undefined);

        return {
          id: `pt-${v.uuid || index}`,
          title,
          url: pageUrl,
          description: description || `Video by ${channel} on PeerTube.`,
          source: 'PeerTube',
          type: 'video' as const,
          thumbnail,
          publishedAt,
          author: channel,
          score: 32 - index * 2,
          metadata: {
            channel,
            channelId,
            duration,
            viewCount,
            embedUrl,
            instance,
            uuid: v.uuid,
          },
        };
      });
    } catch {
      // Continue to next instance on network error
    }
  }

  return [];
}

export const peertubeProvider: SearchProvider = {
  id: 'peertube',
  name: 'PeerTube Open Video',
  supportedCategories: ['videos', 'all'],
  isConfigured: () => true,

  async search(query: string, category: SearchCategory, limit = 8, signal?: AbortSignal): Promise<NormalizedResult[]> {
    return searchPeerTube({ query, limit, signal });
  },
};
