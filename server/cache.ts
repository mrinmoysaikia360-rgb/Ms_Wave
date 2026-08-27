import { SearchCategory, SearchResponsePayload } from './types.js';

interface CacheEntry {
  key: string;
  payload: SearchResponsePayload;
  cachedAt: number;
  expiresAt: number;
  hitCount: number;
  lastAccessedAt: number;
}

// TTL configuration per category in milliseconds
export const CATEGORY_TTL_MS: Record<SearchCategory, number> = {
  news: 3 * 60 * 1000, // 3 minutes for fast-moving breaking news
  all: 8 * 60 * 1000, // 8 minutes for general multi-source web results
  images: 15 * 60 * 1000, // 15 minutes for images
  videos: 15 * 60 * 1000, // 15 minutes for video feeds
  science: 15 * 60 * 1000, // 15 minutes for academic & research papers
  music: 15 * 60 * 1000, // 15 minutes for audio & music results
  maps: 15 * 60 * 1000, // 15 minutes for geographic locations
};

const DEFAULT_TTL_MS = 10 * 60 * 1000;
const MAX_CACHE_ENTRIES = 500;

class SearchCacheManager {
  private cache: Map<string, CacheEntry> = new Map();
  private totalHits = 0;
  private totalMisses = 0;

  /**
   * Generate canonical cache key based on query, category, and sortBy
   */
  public generateKey(
    query: string,
    category: SearchCategory = 'all',
    sortBy: 'relevance' | 'date' | 'source' = 'relevance'
  ): string {
    const normalizedQuery = query.trim().toLowerCase().replace(/\s+/g, ' ');
    return `search:${category}:${sortBy}:${normalizedQuery}`;
  }

  /**
   * Get TTL for a specific category
   */
  public getTtlForCategory(category: SearchCategory): number {
    return CATEGORY_TTL_MS[category] || DEFAULT_TTL_MS;
  }

  /**
   * Retrieve cached search results if valid and unexpired
   */
  public get(
    query: string,
    category: SearchCategory = 'all',
    sortBy: 'relevance' | 'date' | 'source' = 'relevance'
  ): SearchResponsePayload | null {
    const key = this.generateKey(query, category, sortBy);
    const entry = this.cache.get(key);

    if (!entry) {
      this.totalMisses++;
      return null;
    }

    const now = Date.now();

    // Check expiration
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      this.totalMisses++;
      return null;
    }

    // Cache Hit! Update telemetry
    entry.hitCount++;
    entry.lastAccessedAt = now;
    this.totalHits++;

    const ageSec = Math.max(0, Math.floor((now - entry.cachedAt) / 1000));
    const ttlSec = Math.floor((entry.expiresAt - entry.cachedAt) / 1000);

    // Deep clone payload to prevent accidental mutations by callers
    const cloned: SearchResponsePayload = JSON.parse(JSON.stringify(entry.payload));

    // Annotate stats with cache metrics
    cloned.stats = {
      ...cloned.stats,
      cacheHit: true,
      cacheAgeSec: ageSec,
      cacheTtlSec: ttlSec,
      latencyMs: 1, // Serving from memory cache is instant (<1ms)
    };

    return cloned;
  }

  /**
   * Store search results in cache with category TTL
   */
  public set(
    query: string,
    category: SearchCategory,
    sortBy: 'relevance' | 'date' | 'source',
    payload: SearchResponsePayload
  ): void {
    // Only cache successful searches with results or clean responses
    if (!query.trim()) return;

    // Prune expired entries if capacity limit is reached
    if (this.cache.size >= MAX_CACHE_ENTRIES) {
      this.prune();
    }

    const key = this.generateKey(query, category, sortBy);
    const now = Date.now();
    const ttlMs = this.getTtlForCategory(category);

    // Clean payload for caching
    const payloadToCache: SearchResponsePayload = {
      ...payload,
      stats: {
        ...payload.stats,
        cacheHit: false, // Baseline value before retrieval
      },
    };

    this.cache.set(key, {
      key,
      payload: payloadToCache,
      cachedAt: now,
      expiresAt: now + ttlMs,
      hitCount: 0,
      lastAccessedAt: now,
    });
  }

  /**
   * Prune expired or least-recently-used cache entries
   */
  private prune(): void {
    const now = Date.now();

    // Remove expired entries first
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }

    // If still oversized, evict least recently accessed entries
    if (this.cache.size >= MAX_CACHE_ENTRIES) {
      const sorted = Array.from(this.cache.values()).sort(
        (a, b) => a.lastAccessedAt - b.lastAccessedAt
      );
      const evictCount = Math.floor(MAX_CACHE_ENTRIES * 0.2); // Evict oldest 20%
      for (let i = 0; i < evictCount && i < sorted.length; i++) {
        this.cache.delete(sorted[i].key);
      }
    }
  }

  /**
   * Invalidate/clear entire cache or specific category
   */
  public clear(category?: SearchCategory): void {
    if (!category) {
      this.cache.clear();
      return;
    }

    const prefix = `search:${category}:`;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get diagnostics telemetry regarding the caching layer
   */
  public getStats() {
    const now = Date.now();
    let activeEntries = 0;
    let expiredEntries = 0;

    for (const entry of this.cache.values()) {
      if (now <= entry.expiresAt) {
        activeEntries++;
      } else {
        expiredEntries++;
      }
    }

    const totalRequests = this.totalHits + this.totalMisses;
    const hitRate =
      totalRequests > 0 ? Number(((this.totalHits / totalRequests) * 100).toFixed(1)) : 0;

    return {
      activeEntries,
      expiredEntries,
      totalEntries: this.cache.size,
      totalHits: this.totalHits,
      totalMisses: this.totalMisses,
      hitRatePercentage: hitRate,
      maxCapacity: MAX_CACHE_ENTRIES,
      categoryTtlsSec: {
        news: CATEGORY_TTL_MS.news / 1000,
        all: CATEGORY_TTL_MS.all / 1000,
        images: CATEGORY_TTL_MS.images / 1000,
        videos: CATEGORY_TTL_MS.videos / 1000,
        science: CATEGORY_TTL_MS.science / 1000,
        music: CATEGORY_TTL_MS.music / 1000,
        maps: CATEGORY_TTL_MS.maps / 1000,
      },
    };
  }
}

export const searchCache = new SearchCacheManager();
