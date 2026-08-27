import { NormalizedResult, SearchCategory, SearchProvider } from '../types.js';
import { CONFIG } from '../config.js';

export const braveProvider: SearchProvider = {
  id: 'brave',
  name: 'Brave Search',
  supportedCategories: ['all', 'news', 'images', 'videos'],
  isConfigured: () => Boolean(CONFIG.BRAVE_API_KEY),

  async search(query: string, category: SearchCategory, limit = 10, signal?: AbortSignal): Promise<NormalizedResult[]> {
    if (!CONFIG.BRAVE_API_KEY) {
      throw new Error('Brave Search API is not configured (set BRAVE_API_KEY)');
    }

    const encoded = encodeURIComponent(query.trim());
    const apiUrl = `https://api.search.brave.com/res/v1/web/search?q=${encoded}&count=${limit}`;

    const res = await fetch(apiUrl, {
      signal,
      headers: {
        Accept: 'application/json',
        'X-Subscription-Token': CONFIG.BRAVE_API_KEY,
      },
    });

    if (!res.ok) {
      throw new Error(`Brave Search API returned status ${res.status}`);
    }

    const data = await res.json();
    const results = data?.web?.results || [];

    return results.map((item: any, index: number) => {
      return {
        id: `brave-${index}-${encodeURIComponent(item.url || '').slice(0, 30)}`,
        title: item.title || 'Brave Search Result',
        url: item.url,
        description: item.description || '',
        source: 'Brave Search',
        type: 'web',
        thumbnail: item.thumbnail?.src || item.profile?.img,
        publishedAt: item.page_age,
        author: item.profile?.name,
        score: 40 - index * 2,
        metadata: {
          familyFriendly: item.family_friendly,
          domain: item.meta_url?.hostname,
        },
      };
    });
  },
};
