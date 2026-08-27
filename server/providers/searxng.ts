import { NormalizedResult, SearchCategory, SearchProvider } from '../types.js';
import { CONFIG } from '../config.js';

// Reliable public SearXNG instances used if no custom SEARXNG_URL is configured
const PUBLIC_SEARXNG_INSTANCES = [
  'https://search.ononoki.org',
  'https://searx.tiekoetter.com',
  'https://searx.work',
  'https://priv.au',
];

export const searxngProvider: SearchProvider = {
  id: 'searxng',
  name: 'SearXNG Metasearch',
  supportedCategories: ['all', 'images', 'videos', 'news', 'science', 'music', 'maps'],
  isConfigured: () => true, // Enabled by default with public fallback support

  async search(query: string, category: SearchCategory, limit = 15, signal?: AbortSignal): Promise<NormalizedResult[]> {
    const instances = CONFIG.SEARXNG_URL
      ? [CONFIG.SEARXNG_URL, ...PUBLIC_SEARXNG_INSTANCES]
      : PUBLIC_SEARXNG_INSTANCES;

    let categoriesParam = 'general';
    if (category === 'images') categoriesParam = 'images';
    if (category === 'videos') categoriesParam = 'videos';
    if (category === 'news') categoriesParam = 'news';
    if (category === 'science') categoriesParam = 'science';
    if (category === 'music') categoriesParam = 'music';
    if (category === 'maps') categoriesParam = 'map';

    const encoded = encodeURIComponent(query.trim());

    // Try instances sequentially with fast failover
    for (const baseUrl of instances) {
      try {
        const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
        const apiUrl = `${cleanBaseUrl}/search?q=${encoded}&format=json&categories=${categoriesParam}&engines=auto`;

        // Inner timeout per instance attempt
        const instanceController = new AbortController();
        const timeout = setTimeout(() => instanceController.abort(), 3000);

        const res = await fetch(apiUrl, {
          signal: signal || instanceController.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) MsWave/2.0',
            Accept: 'application/json',
          },
        });

        clearTimeout(timeout);

        if (!res.ok) {
          continue;
        }

        const data = await res.json();
        const results = data?.results || [];

        if (!Array.isArray(results) || results.length === 0) {
          continue;
        }

        return results.slice(0, limit).map((item: any, index: number) => {
          let type: 'web' | 'image' | 'video' | 'news' | 'science' | 'music' | 'map' = 'web';
          if (category === 'images' || item.img_src) type = 'image';
          else if (category === 'videos') type = 'video';
          else if (category === 'news') type = 'news';
          else if (category === 'science') type = 'science';
          else if (category === 'music') type = 'music';
          else if (category === 'maps') type = 'map';

          const sourceEngine = item.engine ? `SearXNG (${item.engine})` : 'SearXNG';

          return {
            id: `searx-${index}-${encodeURIComponent(item.url || '').slice(0, 30)}`,
            title: item.title || 'Search Result',
            url: item.url,
            description: item.content || item.description || '',
            source: sourceEngine,
            type,
            thumbnail: item.thumbnail_src || item.img_src || item.thumbnail || undefined,
            publishedAt: item.publishedDate,
            author: item.author || item.engine,
            score: (item.score || 1) * 10 - index,
            metadata: {
              engine: item.engine,
              engines: item.engines,
              searxScore: item.score,
            },
          };
        });
      } catch {
        // Try next instance
        continue;
      }
    }

    // If all SearXNG instances fail, return empty list gracefully rather than failing search
    return [];
  },
};
