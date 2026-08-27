import { XMLParser } from 'fast-xml-parser';
import { NormalizedResult, SearchCategory, SearchProvider } from '../types.js';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
});

export const newsRssProvider: SearchProvider = {
  id: 'news_rss',
  name: 'Global News Feed',
  supportedCategories: ['news', 'all'],
  isConfigured: () => true,

  async search(query: string, category: SearchCategory, limit = 12, signal?: AbortSignal): Promise<NormalizedResult[]> {
    const encoded = encodeURIComponent(query.trim());
    const feedUrl = `https://news.google.com/rss/search?q=${encoded}&hl=en-US&gl=US&ceid=US:en`;

    const res = await fetch(feedUrl, {
      signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) MsWaveMetasearch/1.0',
        Accept: 'application/rss+xml, application/xml, text/xml',
      },
    });

    if (!res.ok) {
      throw new Error(`News RSS returned status ${res.status}`);
    }

    const xmlText = await res.text();
    const parsed = parser.parse(xmlText);
    const items = parsed?.rss?.channel?.item;
    if (!items) return [];

    const itemList = Array.isArray(items) ? items : [items];

    return itemList.slice(0, limit).map((item: any, index: number) => {
      let rawTitle = item.title || 'News Headline';
      let sourceName = 'News Source';

      // Parse "Title - Source Name"
      const lastDash = rawTitle.lastIndexOf(' - ');
      if (lastDash > -1) {
        sourceName = rawTitle.substring(lastDash + 3).trim();
        rawTitle = rawTitle.substring(0, lastDash).trim();
      }

      if (item.source && typeof item.source === 'string') {
        sourceName = item.source;
      } else if (item.source?.['#text']) {
        sourceName = item.source['#text'];
      }

      // Clean HTML tags from description
      let description = item.description || '';
      if (typeof description === 'string') {
        description = description
          .replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/\s+/g, ' ')
          .trim();
      }

      const link = item.link || item.guid || '';

      return {
        id: `news-${index}-${encodeURIComponent(link).slice(0, 30)}`,
        title: rawTitle,
        url: link,
        description: description.slice(0, 240) || `Latest updates reported by ${sourceName}.`,
        source: 'Global News Feed',
        type: 'news',
        publishedAt: item.pubDate,
        author: sourceName,
        score: 38 - index * 2,
        metadata: {
          newsSource: sourceName,
          guid: item.guid,
        },
      };
    });
  },
};
