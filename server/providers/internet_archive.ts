import { NormalizedResult, SearchCategory, SearchProvider } from '../types.js';

export const internetArchiveProvider: SearchProvider = {
  id: 'internet_archive',
  name: 'Internet Archive',
  supportedCategories: ['videos', 'all', 'music'],
  isConfigured: () => true,

  async search(query: string, category: SearchCategory, limit = 10, signal?: AbortSignal): Promise<NormalizedResult[]> {
    const encoded = encodeURIComponent(query.trim());
    let mediatypeQuery = '(mediatype:movies OR mediatype:audio OR mediatype:texts)';
    if (category === 'videos') mediatypeQuery = 'mediatype:movies';
    if (category === 'music') mediatypeQuery = 'mediatype:audio';

    // Search title, description, creator, or fulltext with score relevance sort
    const queryPart = encodeURIComponent(`(title:("${query.trim()}") OR description:("${query.trim()}") OR "${query.trim()}")`);
    const apiUrl = `https://archive.org/advancedsearch.php?q=${queryPart}+AND+${mediatypeQuery}&fl[]=identifier,title,description,mediatype,creator,date,downloads,year&sort[]=_score+desc&rows=${limit}&output=json`;

    const res = await fetch(apiUrl, {
      signal,
      headers: {
        'User-Agent': 'MsWaveMetasearch/1.0',
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`Internet Archive API returned status ${res.status}`);
    }

    const data = await res.json();
    const docs = data?.response?.docs || [];

    return docs.map((doc: any, index: number) => {
      const id = doc.identifier;
      const title = doc.title || id;
      const url = `https://archive.org/details/${id}`;
      const thumbnail = `https://archive.org/services/img/${id}`;
      const author = Array.isArray(doc.creator) ? doc.creator.join(', ') : doc.creator || 'Internet Archive';
      const mediatype = doc.mediatype;

      let resultType: 'video' | 'music' | 'web' = 'web';
      if (mediatype === 'movies') resultType = 'video';
      if (mediatype === 'audio') resultType = 'music';

      let description = '';
      if (Array.isArray(doc.description)) {
        description = doc.description[0];
      } else if (doc.description) {
        description = doc.description;
      }
      description = (description || `Archived ${mediatype} item on Internet Archive.`).replace(/<[^>]+>/g, '').slice(0, 240);

      // Direct embed URL if video
      const embedUrl = mediatype === 'movies' ? `https://archive.org/embed/${id}` : undefined;

      return {
        id: `ia-${id}`,
        title,
        url,
        description,
        source: 'Internet Archive',
        type: resultType,
        thumbnail,
        publishedAt: doc.date || (doc.year ? `${doc.year}-01-01` : undefined),
        author,
        score: 30 - index * 2,
        metadata: {
          identifier: id,
          mediatype,
          downloads: doc.downloads,
          embedUrl,
        },
      };
    });
  },
};
