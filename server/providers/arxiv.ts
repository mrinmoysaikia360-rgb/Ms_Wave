import { XMLParser } from 'fast-xml-parser';
import { NormalizedResult, SearchCategory, SearchProvider } from '../types.js';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
});

export const arxivProvider: SearchProvider = {
  id: 'arxiv',
  name: 'arXiv',
  supportedCategories: ['science', 'all'],
  isConfigured: () => true,

  async search(query: string, category: SearchCategory, limit = 8, signal?: AbortSignal): Promise<NormalizedResult[]> {
    const encoded = encodeURIComponent(query.trim());
    const apiUrl = `https://export.arxiv.org/api/query?search_query=all:${encoded}&start=0&max_results=${limit}&sortBy=relevance&sortOrder=descending`;

    const res = await fetch(apiUrl, {
      signal,
      headers: {
        'User-Agent': 'MsWaveMetasearch/1.0 (contact@mswave.search)',
        Accept: 'application/atom+xml, application/xml, text/xml',
      },
    });

    if (!res.ok) {
      throw new Error(`arXiv API returned status ${res.status}`);
    }

    const xmlText = await res.text();
    const parsed = parser.parse(xmlText);
    const entries = parsed?.feed?.entry;
    if (!entries) return [];

    const entryList = Array.isArray(entries) ? entries : [entries];

    return entryList.map((entry: any, index: number) => {
      const idUrl = entry.id || '';
      const arxivId = idUrl.replace(/^http:\/\/arxiv\.org\/abs\//, '');
      const title = (entry.title || '').replace(/\s+/g, ' ').trim();
      const summary = (entry.summary || '').replace(/\s+/g, ' ').trim().slice(0, 300);

      // Authors extraction
      let authors = '';
      if (Array.isArray(entry.author)) {
        authors = entry.author.map((a: any) => a.name).filter(Boolean).slice(0, 4).join(', ');
      } else if (entry.author?.name) {
        authors = entry.author.name;
      }

      // Link and PDF
      let pdfUrl: string | undefined;
      let landingUrl = idUrl;

      if (Array.isArray(entry.link)) {
        for (const l of entry.link) {
          if (l['@_title'] === 'pdf' || l['@_type'] === 'application/pdf') {
            pdfUrl = l['@_href'];
          }
          if (l['@_rel'] === 'alternate') {
            landingUrl = l['@_href'];
          }
        }
      }

      return {
        id: `arxiv-${arxivId || index}`,
        title,
        url: landingUrl || idUrl,
        description: summary,
        source: 'arXiv',
        type: 'science',
        publishedAt: entry.published,
        author: authors || 'arXiv Contributors',
        score: 36 - index * 2,
        metadata: {
          arxivId,
          pdfUrl,
          primaryCategory: entry['arxiv:primary_category']?.['@_term'],
          comment: entry['arxiv:comment'],
        },
      };
    });
  },
};
