import { NormalizedResult, SearchCategory } from './types.js';

export interface ScoreFactors {
  titleExactMatch: number;
  titleTermMatch: number;
  descExactMatch: number;
  descTermMatch: number;
  metaTermMatch: number;
  corroborationBonus: number;
  freshnessBonus: number;
  metadataQuality: number;
  total: number;
}

export interface RelevanceEvaluation {
  score: number;
  isRelevant: boolean;
  rejectReason?: string;
  factors: ScoreFactors;
  tokensMatched: number;
  totalTokens: number;
}

const COMMON_STOP_WORDS = new Set([
  'a',
  'about',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'by',
  'for',
  'from',
  'how',
  'in',
  'is',
  'it',
  'of',
  'on',
  'or',
  'that',
  'the',
  'this',
  'to',
  'was',
  'what',
  'when',
  'where',
  'which',
  'who',
  'will',
  'with',
]);

/**
 * Tokenize string into clean words
 */
export function tokenize(text: string): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

/**
 * Extract significant query tokens (filtering non-essential stop words unless all are stop words)
 */
export function extractSignificantTokens(allTokens: string[]): string[] {
  const filtered = allTokens.filter((t) => t.length > 1 && !COMMON_STOP_WORDS.has(t));
  if (filtered.length > 0) return filtered;
  // If all words were stop words or 1-char, keep all non-empty tokens
  return allTokens.filter((t) => t.length > 0);
}

/**
 * Calculates transparent relevance score and evaluates strict acceptance threshold
 */
export function calculateRelevance(
  result: NormalizedResult,
  query: string,
  category: SearchCategory
): RelevanceEvaluation {
  const cleanQ = query.trim().toLowerCase();
  const allQueryTokens = tokenize(cleanQ);
  const sigTokens = extractSignificantTokens(allQueryTokens);

  const titleLower = (result.title || '').toLowerCase();
  const descLower = (result.description || '').toLowerCase();
  const authorLower = (result.author || '').toLowerCase();
  const tagsLower = Array.isArray(result.metadata?.tags)
    ? result.metadata.tags.join(' ').toLowerCase()
    : '';
  const categoryLower = (
    result.metadata?.category ||
    result.metadata?.genre ||
    result.metadata?.placeType ||
    ''
  ).toLowerCase();
  const urlLower = (result.url || '').toLowerCase();

  const combinedSearchable = `${titleLower} ${descLower} ${authorLower} ${tagsLower} ${categoryLower} ${urlLower}`;

  let titleExactMatch = 0;
  let descExactMatch = 0;
  let titleTermMatch = 0;
  let descTermMatch = 0;
  let metaTermMatch = 0;
  let corroborationBonus = 0;
  let freshnessBonus = 0;
  let metadataQuality = 0;

  // 1. Exact query phrase matching
  if (titleLower === cleanQ) {
    titleExactMatch = 60;
  } else if (titleLower.includes(cleanQ)) {
    titleExactMatch = 45;
  }

  if (descLower.includes(cleanQ)) {
    descExactMatch = 25;
  }

  // 2. Token Matching Analysis
  const queryTokensToCheck = sigTokens.length > 0 ? sigTokens : allQueryTokens;
  let matchedTitleTerms = 0;
  let matchedDescTerms = 0;
  let matchedMetaTerms = 0;
  let totalDistinctTokensMatched = 0;

  for (const token of queryTokensToCheck) {
    let matchedInThisItem = false;

    if (titleLower.includes(token)) {
      matchedTitleTerms++;
      matchedInThisItem = true;
    }
    if (descLower.includes(token)) {
      matchedDescTerms++;
      matchedInThisItem = true;
    }
    if (authorLower.includes(token) || tagsLower.includes(token) || categoryLower.includes(token) || urlLower.includes(token)) {
      matchedMetaTerms++;
      matchedInThisItem = true;
    }

    if (matchedInThisItem) {
      totalDistinctTokensMatched++;
    }
  }

  const tokenCount = queryTokensToCheck.length;
  if (tokenCount > 0) {
    titleTermMatch = Math.round((matchedTitleTerms / tokenCount) * 40);
    descTermMatch = Math.round((matchedDescTerms / tokenCount) * 20);
    metaTermMatch = Math.round((matchedMetaTerms / tokenCount) * 10);
  }

  // 3. Corroboration bonus: if multiple sources independently indexed this
  if (result.sources && result.sources.length > 1) {
    corroborationBonus = (result.sources.length - 1) * 10;
  }

  // 4. Freshness bonus for recent verified items
  if (result.publishedAt) {
    try {
      const pubDate = new Date(result.publishedAt).getTime();
      const ageDays = (Date.now() - pubDate) / (1000 * 60 * 60 * 24);
      if (ageDays >= 0 && ageDays < 30) {
        freshnessBonus = 8;
      } else if (ageDays >= 30 && ageDays < 365) {
        freshnessBonus = 4;
      }
    } catch {
      // ignore
    }
  }

  // 5. Metadata completeness & richness
  if (result.thumbnail) metadataQuality += 4;
  if (result.author) metadataQuality += 2;
  if (result.description && result.description.length > 60) metadataQuality += 4;
  if (result.metadata?.viewCount || result.metadata?.duration) metadataQuality += 3;

  const baseScore =
    titleExactMatch +
    descExactMatch +
    titleTermMatch +
    descTermMatch +
    metaTermMatch +
    corroborationBonus +
    freshnessBonus +
    metadataQuality;

  const total = Math.max(0, Math.round(baseScore));

  // ----------------------------------------------------
  // Strict Relevance Decision Rules
  // ----------------------------------------------------
  let isRelevant = true;
  let rejectReason: string | undefined;

  if (tokenCount > 0) {
    // Condition A: 0 matching tokens in any searchable field
    if (totalDistinctTokensMatched === 0) {
      isRelevant = false;
      rejectReason = `Matched 0 of ${tokenCount} query tokens across title, description, and metadata`;
    }
    // Condition B: Multi-word query where none of the words appear in title or description
    else if (tokenCount >= 2 && matchedTitleTerms === 0 && matchedDescTerms === 0 && !titleExactMatch && !descExactMatch) {
      // Even if token was loosely in URL/author, reject if not in title or description
      isRelevant = false;
      rejectReason = 'Multi-word query terms missing from title and description';
    }
    // Condition C: Score below minimum threshold for non-exact matches
    else if (total < 12 && titleExactMatch === 0 && descExactMatch === 0 && matchedTitleTerms === 0) {
      isRelevant = false;
      rejectReason = `Relevance score (${total}) below minimum quality threshold`;
    }
  } else if (cleanQ.length > 0 && !combinedSearchable.includes(cleanQ)) {
    isRelevant = false;
    rejectReason = 'No query match found';
  }

  return {
    score: total,
    isRelevant,
    rejectReason,
    tokensMatched: totalDistinctTokensMatched,
    totalTokens: tokenCount,
    factors: {
      titleExactMatch,
      titleTermMatch,
      descExactMatch,
      descTermMatch,
      metaTermMatch,
      corroborationBonus,
      freshnessBonus,
      metadataQuality,
      total,
    },
  };
}

export interface RankedResultsPayload {
  ranked: NormalizedResult[];
  lowRelevanceCount: number;
}

/**
 * Ranks, strictly filters for query relevance, and sorts results
 */
export function rankResults(
  results: NormalizedResult[],
  query: string,
  category: SearchCategory,
  sortBy: 'relevance' | 'date' | 'source' = 'relevance'
): RankedResultsPayload {
  const evaluated = results.map((item) => {
    const evaluation = calculateRelevance(item, query, category);
    return {
      item: {
        ...item,
        score: evaluation.score,
        metadata: {
          ...item.metadata,
          scoreFactors: evaluation.factors,
          tokensMatched: evaluation.tokensMatched,
          totalTokens: evaluation.totalTokens,
        },
      },
      evaluation,
    };
  });

  // Filter out irrelevant results
  const relevantItems: NormalizedResult[] = [];
  let lowRelevanceCount = 0;

  for (const { item, evaluation } of evaluated) {
    if (evaluation.isRelevant) {
      relevantItems.push(item);
    } else {
      lowRelevanceCount++;
    }
  }

  // Sort relevant items
  if (sortBy === 'date') {
    relevantItems.sort((a, b) => {
      const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return dateB - dateA || b.score - a.score;
    });
  } else if (sortBy === 'source') {
    relevantItems.sort((a, b) => a.source.localeCompare(b.source) || b.score - a.score);
  } else {
    // Default: relevance score descending
    relevantItems.sort((a, b) => b.score - a.score);
  }

  return {
    ranked: relevantItems,
    lowRelevanceCount,
  };
}
