import { NormalizedResult, SearchCategory, SearchProvider } from '../types.js';

export const wikipediaProvider: SearchProvider = {
  id: 'wikipedia',
  name: 'Wikipedia',
  supportedCategories: ['all', 'science'],
  isConfigured: () => true,

  async search(query: string, category: SearchCategory, limit = 8, signal?: AbortSignal): Promise<NormalizedResult[]> {
    const encoded = encodeURIComponent(query.trim());
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encoded}&format=json&origin=*&srlimit=${limit}`;

    const res = await fetch(searchUrl, {
      signal,
      headers: {
        'User-Agent': 'MsWaveMetasearch/1.0 (https://mswave.search; contact@mswave.search)',
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`Wikipedia API returned status ${res.status}`);
    }

    const data = await res.json();
    const searchResults = data?.query?.search || [];
    if (searchResults.length === 0) return [];

    // Fetch page summaries/thumbnails concurrently for top results
    const results: NormalizedResult[] = await Promise.all(
      searchResults.map(async (item: any, index: number) => {
        const pageTitle = item.title;
        const pageUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(pageTitle.replace(/\s+/g, '_'))}`;
        let thumbnail: string | undefined;
        let snippet = item.snippet
          ? item.snippet.replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&')
          : '';

        try {
          // REST summary for thumbnail & extract
          const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pageTitle)}`;
          const sumRes = await fetch(summaryUrl, {
            signal,
            headers: {
              'User-Agent': 'MsWaveMetasearch/1.0',
            },
          });
          if (sumRes.ok) {
            const sumData = await sumRes.json();
            if (sumData.thumbnail?.source) {
              thumbnail = sumData.thumbnail.source;
            }
            if (sumData.extract) {
              snippet = sumData.extract;
            }
          }
        } catch {
          // fallback to initial snippet
        }

        return {
          id: `wiki-${item.pageid || index}`,
          title: pageTitle,
          url: pageUrl,
          description: snippet,
          source: 'Wikipedia',
          type: 'web',
          thumbnail,
          publishedAt: item.timestamp,
          author: 'Wikimedia Foundation',
          score: 40 - index * 2,
          metadata: {
            wordcount: item.wordcount,
            pageid: item.pageid,
          },
        };
      })
    );

    return results;
  },
};
