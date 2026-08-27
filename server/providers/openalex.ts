import { NormalizedResult, SearchCategory, SearchProvider } from '../types.js';
import { CONFIG } from '../config.js';

export const openalexProvider: SearchProvider = {
  id: 'openalex',
  name: 'OpenAlex',
  supportedCategories: ['science', 'all'],
  isConfigured: () => true,

  async search(query: string, category: SearchCategory, limit = 10, signal?: AbortSignal): Promise<NormalizedResult[]> {
    const encoded = encodeURIComponent(query.trim());
    const mailto = encodeURIComponent(CONFIG.OPENALEX_EMAIL);
    const apiUrl = `https://api.openalex.org/works?search=${encoded}&per-page=${limit}&mailto=${mailto}`;

    const res = await fetch(apiUrl, {
      signal,
      headers: {
        'User-Agent': `MsWaveMetasearch/1.0 (mailto:${CONFIG.OPENALEX_EMAIL})`,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`OpenAlex API returned status ${res.status}`);
    }

    const data = await res.json();
    const works = data?.results || [];

    return works.map((work: any, index: number) => {
      const title = work.title || 'Untitled Research Work';
      const doi = work.doi || work.ids?.doi;
      const url = doi || work.primary_location?.landing_page_url || work.id;

      // Extract authors
      const authors = (work.authorships || [])
        .map((a: any) => a.author?.display_name)
        .filter(Boolean)
        .slice(0, 4)
        .join(', ');

      const journal =
        work.primary_location?.source?.display_name ||
        work.host_venue?.name ||
        work.type ||
        'Academic Publication';

      // Open access PDF link
      const openAccessPdf = work.open_access?.oa_url || work.primary_location?.pdf_url;

      // Abstract reconstruction if inverted index exists
      let abstract = '';
      if (work.abstract_inverted_index) {
        const words: { word: string; pos: number }[] = [];
        for (const [w, positions] of Object.entries(work.abstract_inverted_index)) {
          for (const pos of positions as number[]) {
            words.push({ word: w, pos });
          }
        }
        words.sort((a, b) => a.pos - b.pos);
        abstract = words.map((x) => x.word).join(' ').slice(0, 300);
      }

      return {
        id: `openalex-${work.id?.replace(/^https:\/\/openalex\.org\//, '') || index}`,
        title,
        url,
        description:
          abstract ||
          `Published in ${journal} (${work.publication_year || 'N/A'}). Cited by ${work.cited_by_count || 0} papers.`,
        source: 'OpenAlex',
        type: 'science',
        publishedAt: work.publication_date || `${work.publication_year}-01-01`,
        author: authors ? `${authors}${work.authorships?.length > 4 ? ' et al.' : ''}` : 'Scholarly Authors',
        score: 38 - index * 2 + Math.min(10, Math.log10((work.cited_by_count || 0) + 1) * 3),
        metadata: {
          doi,
          journal,
          citationCount: work.cited_by_count,
          publicationYear: work.publication_year,
          openAccessPdf,
          isOpenAccess: work.open_access?.is_oa,
          concepts: (work.concepts || []).slice(0, 3).map((c: any) => c.display_name),
        },
      };
    });
  },
};
