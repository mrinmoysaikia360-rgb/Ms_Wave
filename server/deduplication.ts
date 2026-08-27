import { NormalizedResult } from './types.js';

const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'fbclid',
  'gclid',
  'ref',
  'source',
  'ref_src',
  '_ga',
  '_gl',
  'msclkid',
  'mc_cid',
  'mc_eid',
]);

/**
 * Normalizes a URL to a canonical comparable string
 */
export function normalizeUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  try {
    const parsed = new URL(rawUrl.trim());

    // Normalize protocol and host
    let hostname = parsed.hostname.toLowerCase();
    if (hostname.startsWith('www.')) hostname = hostname.slice(4);
    if (hostname.endsWith('.m.wikipedia.org')) {
      hostname = hostname.replace('.m.wikipedia.org', '.wikipedia.org');
    }

    // Remove tracking parameters
    const searchParams = new URLSearchParams(parsed.search);
    for (const key of Array.from(searchParams.keys())) {
      if (TRACKING_PARAMS.has(key.toLowerCase()) || key.toLowerCase().startsWith('utm_')) {
        searchParams.delete(key);
      }
    }

    let pathname = parsed.pathname.replace(/\/+$/, '');
    if (pathname.endsWith('/index.html') || pathname.endsWith('/index.htm') || pathname.endsWith('/index.php')) {
      pathname = pathname.substring(0, pathname.lastIndexOf('/'));
    }
    if (!pathname) pathname = '/';

    const cleanSearch = searchParams.toString();
    return `${parsed.protocol}//${hostname}${pathname}${cleanSearch ? '?' + cleanSearch : ''}`;
  } catch {
    return rawUrl.trim().toLowerCase().replace(/\/+$/, '');
  }
}

/**
 * Tokenize string for similarity comparison
 */
function tokenize(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);
  return new Set(words);
}

/**
 * Compute Jaccard Similarity between two texts
 */
function jaccardSimilarity(a: string, b: string): number {
  const setA = tokenize(a);
  const setB = tokenize(b);
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }

  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Strips common brand suffixes from titles (e.g. " - Wikipedia", " | Nature")
 */
function cleanTitle(title: string): string {
  return title
    .replace(/\s*[-–—|]\s*(Wikipedia|Wikimedia|arXiv|OpenAlex|YouTube|Internet Archive|Brave|Crossref).*$/i, '')
    .trim();
}

/**
 * Deduplicates and merges multi-source results
 */
export function deduplicateResults(results: NormalizedResult[]): {
  deduplicated: NormalizedResult[];
  duplicatesRemoved: number;
} {
  const mergedMap = new Map<string, NormalizedResult>();
  let duplicatesRemoved = 0;

  for (const item of results) {
    const canonical = normalizeUrl(item.url);
    const cleanedItemTitle = cleanTitle(item.title);

    // Look for matching key: either exact canonical URL or very high title + domain similarity
    let matchedKey: string | null = null;

    if (canonical && mergedMap.has(canonical)) {
      matchedKey = canonical;
    } else {
      // Check for title similarity across existing items in the same domain
      for (const [key, existing] of mergedMap.entries()) {
        const existingCleanedTitle = cleanTitle(existing.title);
        const titleSim = jaccardSimilarity(cleanedItemTitle, existingCleanedTitle);

        // If high title match (>0.85) or matching identifier in metadata (like DOI or ISBN)
        const sameDoi =
          item.metadata?.doi &&
          existing.metadata?.doi &&
          item.metadata.doi.toLowerCase() === existing.metadata.doi.toLowerCase();

        if (sameDoi || titleSim > 0.85) {
          matchedKey = key;
          break;
        }
      }
    }

    if (matchedKey) {
      const existing = mergedMap.get(matchedKey)!;
      duplicatesRemoved++;

      // Merge corroborating sources
      const allSources = new Set<string>(existing.sources || [existing.source]);
      allSources.add(item.source);
      if (item.sources) {
        item.sources.forEach((s) => allSources.add(s));
      }

      // Pick best description (longer and cleaner)
      const bestDescription =
        (item.description?.length || 0) > (existing.description?.length || 0)
          ? item.description
          : existing.description;

      // Pick best thumbnail
      const bestThumbnail = existing.thumbnail || item.thumbnail;

      // Pick earliest published date if available
      const publishedAt = existing.publishedAt || item.publishedAt;

      // Corroboration bonus for multi-provider agreement
      const corroborationBonus = (allSources.size - 1) * 8;

      mergedMap.set(matchedKey, {
        ...existing,
        title: existing.title.length < item.title.length && item.title.length < 120 ? item.title : existing.title,
        description: bestDescription,
        thumbnail: bestThumbnail,
        publishedAt,
        sources: Array.from(allSources),
        score: Math.max(existing.score, item.score) + corroborationBonus,
        metadata: {
          ...existing.metadata,
          ...item.metadata,
        },
      });
    } else {
      const initialKey = canonical || `title:${cleanedItemTitle}:${item.source}`;
      mergedMap.set(initialKey, {
        ...item,
        sources: item.sources || [item.source],
      });
    }
  }

  return {
    deduplicated: Array.from(mergedMap.values()),
    duplicatesRemoved,
  };
}
