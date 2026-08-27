import { SearchCategory, SearchProvider } from '../types.js';
import { wikipediaProvider } from './wikipedia.js';
import { wikimediaProvider } from './wikimedia.js';
import { searxngProvider } from './searxng.js';
import { openalexProvider } from './openalex.js';
import { crossrefProvider } from './crossref.js';
import { arxivProvider } from './arxiv.js';
import { duckduckgoProvider } from './duckduckgo.js';
import { internetArchiveProvider } from './internet_archive.js';
import { nominatimProvider } from './nominatim.js';
import { newsRssProvider } from './news_rss.js';
import { musicProvider } from './music.js';
import { youtubeProvider } from './youtube.js';
import { peertubeProvider } from './peertube.js';
import { braveProvider } from './brave.js';

export const ALL_PROVIDERS: SearchProvider[] = [
  searxngProvider,
  wikipediaProvider,
  duckduckgoProvider,
  braveProvider,
  newsRssProvider,
  wikimediaProvider,
  youtubeProvider,
  peertubeProvider,
  openalexProvider,
  arxivProvider,
  crossrefProvider,
  nominatimProvider,
  musicProvider,
  internetArchiveProvider,
];

export function getProvidersForCategory(category: SearchCategory): SearchProvider[] {
  if (category === 'all') {
    // For 'all', prioritize general knowledge, instant answers, top news, and media
    return [
      searxngProvider,
      wikipediaProvider,
      duckduckgoProvider,
      braveProvider,
      newsRssProvider,
      openalexProvider,
      nominatimProvider,
      wikimediaProvider,
      musicProvider,
      youtubeProvider,
      internetArchiveProvider,
    ];
  }

  return ALL_PROVIDERS.filter((p) => p.supportedCategories.includes(category));
}
