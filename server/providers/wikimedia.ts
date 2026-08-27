import { NormalizedResult, SearchCategory, SearchProvider } from '../types.js';

export const wikimediaProvider: SearchProvider = {
  id: 'wikimedia',
  name: 'Wikimedia Commons',
  supportedCategories: ['images', 'videos', 'music', 'all'],
  isConfigured: () => true,

  async search(query: string, category: SearchCategory, limit = 15, signal?: AbortSignal): Promise<NormalizedResult[]> {
    const encoded = encodeURIComponent(query.trim());
    let searchQuery = encoded;

    // Filter by media type if specific category
    if (category === 'videos') {
      searchQuery += '+filetype:video';
    } else if (category === 'music') {
      searchQuery += '+filetype:audio';
    } else if (category === 'images') {
      searchQuery += '+filetype:bitmap';
    }

    const apiUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${searchQuery}&gsrnamespace=6&prop=imageinfo&iiprop=url|size|extmetadata|mime|mediatype&format=json&origin=*&gsrlimit=${limit}`;

    const res = await fetch(apiUrl, {
      signal,
      headers: {
        'User-Agent': 'MsWaveMetasearch/1.0 (https://mswave.search; contact@mswave.search)',
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`Wikimedia API returned status ${res.status}`);
    }

    const data = await res.json();
    const pages = data?.query?.pages;
    if (!pages) return [];

    const results: NormalizedResult[] = [];
    let rank = 0;

    for (const pageId of Object.keys(pages)) {
      const page = pages[pageId];
      const imageInfo = page.imageinfo?.[0];
      if (!imageInfo || !imageInfo.url) continue;

      const mime = imageInfo.mime || '';
      const mediaType = imageInfo.mediatype || '';
      
      let itemType: 'image' | 'video' | 'music' | 'web' = 'image';
      if (mime.startsWith('video/') || mediaType === 'VIDEO') {
        itemType = 'video';
      } else if (mime.startsWith('audio/') || mediaType === 'AUDIO') {
        itemType = 'music';
      } else if (!mime.startsWith('image/')) {
        continue;
      }

      // If category filter does not match
      if (category === 'images' && itemType !== 'image') continue;
      if (category === 'videos' && itemType !== 'video') continue;
      if (category === 'music' && itemType !== 'music') continue;

      const ext = imageInfo.extmetadata || {};
      const artist = ext.Artist?.value?.replace(/<[^>]+>/g, '') || 'Wikimedia Contributor';
      const description =
        ext.ImageDescription?.value?.replace(/<[^>]+>/g, '') ||
        ext.ObjectName?.value?.replace(/<[^>]+>/g, '') ||
        page.title?.replace(/^File:/, '').replace(/\.[^/.]+$/, '');
      const license = ext.LicenseShortName?.value || 'Creative Commons';

      const cleanTitle = page.title.replace(/^File:/, '').replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
      const fullUrl = imageInfo.url;
      const thumbUrl = imageInfo.thumburl || (itemType === 'image' ? imageInfo.url : undefined);

      results.push({
        id: `wikimedia-${pageId}`,
        title: cleanTitle,
        url: imageInfo.descriptionurl || fullUrl,
        description: description.slice(0, 220),
        source: 'Wikimedia Commons',
        type: itemType,
        thumbnail: thumbUrl,
        publishedAt: ext.DateTime?.value,
        author: artist,
        score: 35 - rank,
        metadata: {
          imageUrl: itemType === 'image' ? fullUrl : undefined,
          videoUrl: itemType === 'video' ? fullUrl : undefined,
          audioUrl: itemType === 'music' ? fullUrl : undefined,
          previewUrl: itemType === 'music' ? fullUrl : undefined,
          embedUrl: itemType === 'video' ? fullUrl : undefined,
          width: imageInfo.width,
          height: imageInfo.height,
          sizeBytes: imageInfo.size,
          mimeType: mime,
          license,
          filePageUrl: imageInfo.descriptionurl,
        },
      });

      rank++;
    }

    return results;
  },
};
