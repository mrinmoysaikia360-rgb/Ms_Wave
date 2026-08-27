import {
  NormalizedResult,
  ProviderDiagnostic,
  SearchCategory,
  SearchProvider,
  SearchResponsePayload,
  SearchStats,
} from './types.js';
import { getProvidersForCategory } from './providers/index.js';
import { deduplicateResults } from './deduplication.js';
import { rankResults } from './ranking.js';
import { generateAiOverview } from './ai.js';
import { CONFIG } from './config.js';

interface ProviderExecutionResult {
  diagnostic: ProviderDiagnostic;
  results: NormalizedResult[];
}

/**
 * Execute a single provider query with timeout and 1 auto-recovery retry for transient network errors
 */
async function executeProviderWithRetry(
  provider: SearchProvider,
  query: string,
  category: SearchCategory,
  timeoutMs: number = CONFIG.PROVIDER_TIMEOUT_MS
): Promise<ProviderExecutionResult> {
  const startTime = Date.now();

  // If provider is not configured (e.g. Missing API key), skip immediately with clear diagnostic
  if (!provider.isConfigured()) {
    return {
      diagnostic: {
        id: provider.id,
        name: provider.name,
        status: 'unconfigured',
        latencyMs: 0,
        resultsCount: 0,
        error: `${provider.name} requires configuration in environment variables`,
        supportedCategories: provider.supportedCategories,
      },
      results: [],
    };
  }

  let attempt = 0;
  const maxAttempts = 2; // Initial attempt + 1 retry

  while (attempt < maxAttempts) {
    attempt++;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const results = await provider.search(query, category, CONFIG.MAX_RESULTS_PER_PROVIDER, controller.signal);
      clearTimeout(timer);
      const latencyMs = Date.now() - startTime;

      return {
        diagnostic: {
          id: provider.id,
          name: provider.name,
          status: 'ok',
          latencyMs,
          resultsCount: results.length,
          supportedCategories: provider.supportedCategories,
        },
        results,
      };
    } catch (err: any) {
      clearTimeout(timer);

      const isAbort = err.name === 'AbortError' || controller.signal.aborted;
      const isLastAttempt = attempt >= maxAttempts;

      if (!isLastAttempt && !isAbort) {
        // Wait 300ms before retry
        await new Promise((r) => setTimeout(r, 300));
        continue;
      }

      const latencyMs = Date.now() - startTime;
      const status = isAbort ? 'timeout' : 'unavailable';
      const errorMsg = isAbort
        ? `Request timed out after ${timeoutMs}ms`
        : err.message || 'Provider connection failed';

      return {
        diagnostic: {
          id: provider.id,
          name: provider.name,
          status,
          latencyMs,
          resultsCount: 0,
          error: errorMsg,
          supportedCategories: provider.supportedCategories,
        },
        results: [],
      };
    }
  }

  return {
    diagnostic: {
      id: provider.id,
      name: provider.name,
      status: 'error',
      latencyMs: Date.now() - startTime,
      resultsCount: 0,
      error: 'Max retries exhausted',
      supportedCategories: provider.supportedCategories,
    },
    results: [],
  };
}

/**
 * Main search pipeline
 */
export async function performSearch(
  query: string,
  category: SearchCategory = 'all',
  sortBy: 'relevance' | 'date' | 'source' = 'relevance'
): Promise<SearchResponsePayload> {
  const globalStartTime = Date.now();
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return {
      query: '',
      category,
      results: [],
      stats: {
        sourcesQueried: 0,
        successful: 0,
        failed: 0,
        resultsCollected: 0,
        duplicatesRemoved: 0,
        lowRelevanceFiltered: 0,
        totalReturned: 0,
        latencyMs: 0,
        providers: [],
      },
    };
  }

  // 1. Select matching providers for category
  const allProviders = getProvidersForCategory(category);
  const providersToQuery = allProviders.filter((p) => p.isConfigured());
  const unconfiguredProviders = allProviders.filter((p) => !p.isConfigured());

  // 2. Query all configured providers in parallel
  const executionPromises = providersToQuery.map((p) =>
    executeProviderWithRetry(p, trimmedQuery, category)
  );

  const settledResults = await Promise.all(executionPromises);

  // 3. Aggregate results and metrics
  const rawResults: NormalizedResult[] = [];
  const diagnostics: ProviderDiagnostic[] = [];

  let successfulCount = 0;
  let failedCount = 0;

  for (const item of settledResults) {
    diagnostics.push(item.diagnostic);
    if (item.diagnostic.status === 'ok') {
      successfulCount++;
      rawResults.push(...item.results);
    } else if (item.diagnostic.status === 'unavailable' || item.diagnostic.status === 'timeout' || item.diagnostic.status === 'error') {
      failedCount++;
    }
  }

  // Include unconfigured providers in diagnostics for visibility without counting as failure
  for (const p of unconfiguredProviders) {
    diagnostics.push({
      id: p.id,
      name: p.name,
      status: 'unconfigured',
      latencyMs: 0,
      resultsCount: 0,
      error: `Optional integration (set API key/URL in environment if desired)`,
      supportedCategories: p.supportedCategories,
    });
  }

  // 4. Deduplication
  const { deduplicated, duplicatesRemoved } = deduplicateResults(rawResults);

  // 5. Strict Relevance Ranking & Filtering
  const { ranked, lowRelevanceCount } = rankResults(deduplicated, trimmedQuery, category, sortBy);

  // 6. AI Overview Synthesis with Google Search Grounding
  let aiOverview: any = undefined;
  if (category === 'all' || category === 'science' || category === 'news') {
    try {
      aiOverview = await generateAiOverview(trimmedQuery, ranked.slice(0, 6));
    } catch {
      // Graceful fallback if AI overview fails
    }
  }

  const totalLatencyMs = Date.now() - globalStartTime;

  const stats: SearchStats = {
    sourcesQueried: providersToQuery.length,
    successful: successfulCount,
    failed: failedCount,
    resultsCollected: rawResults.length,
    duplicatesRemoved,
    lowRelevanceFiltered: lowRelevanceCount,
    totalReturned: ranked.length,
    latencyMs: totalLatencyMs,
    providers: diagnostics,
  };

  return {
    query: trimmedQuery,
    category,
    results: ranked,
    stats,
    aiOverview,
  };
}
