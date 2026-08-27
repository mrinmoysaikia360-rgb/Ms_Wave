import { NormalizedResult, SearchCategory, SearchProvider } from '../types.js';

export const crossrefProvider: SearchProvider = {
  id: 'crossref',
  name: 'Crossref',
  supportedCategories: ['science'],
  isConfigured: () => true,

  async search(query: string, category: SearchCategory, limit = 8, signal?: AbortSignal): Promise<NormalizedResult[]> {
    const encoded = encodeURIComponent(query.trim());
    const apiUrl = `https://api.crossref.org/works?query=${encoded}&rows=${limit}&select=DOI,title,abstract,author,published-print,published-online,container-title,URL,is-referenced-by-count`;

    const res = await fetch(apiUrl, {
      signal,
      headers: {
        'User-Agent': 'MsWaveMetasearch/1.0 (mailto:contact@mswave.search)',
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`Crossref API returned status ${res.status}`);
    }

    const data = await res.json();
    const items = data?.message?.items || [];

    return items.map((item: any, index: number) => {
      const title = Array.isArray(item.title) ? item.title[0] : item.title || 'Scholarly Article';
      const doi = item.DOI;
      const url = item.URL || (doi ? `https://doi.org/${doi}` : '');
      const journal = Array.isArray(item['container-title']) ? item['container-title'][0] : item['container-title'] || 'Academic Journal';

      const authors = (item.author || [])
        .map((a: any) => `${a.given ? a.given + ' ' : ''}${a.family || ''}`)
        .filter(Boolean)
        .slice(0, 3)
        .join(', ');

      const pubDate =
        item['published-print']?.['date-parts']?.[0]?.join('-') ||
        item['published-online']?.['date-parts']?.[0]?.join('-') ||
        '';

      const abstract = item.abstract ? item.abstract.replace(/<[^>]+>/g, '').slice(0, 250) : '';

      return {
        id: `crossref-${doi || index}`,
        title,
        url,
        description: abstract || `Published in ${journal}. DOI: ${doi}`,
        source: 'Crossref',
        type: 'science',
        publishedAt: pubDate,
        author: authors || 'Scholarly Authors',
        score: 32 - index * 2,
        metadata: {
          doi,
          journal,
          citationCount: item['is-referenced-by-count'],
        },
      };
    });
  },
};
