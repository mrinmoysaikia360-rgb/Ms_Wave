export type SearchCategory = 'all' | 'images' | 'videos' | 'news' | 'science' | 'music' | 'maps';

export type ResultType = 'web' | 'image' | 'video' | 'news' | 'science' | 'music' | 'map';

export interface NormalizedResult {
  id: string;
  title: string;
  url: string;
  description: string;
  source: string;
  sources?: string[];
  type: ResultType;
  thumbnail?: string;
  publishedAt?: string;
  author?: string;
  score: number;
  metadata?: Record<string, any>;
}

export interface ProviderDiagnostic {
  id: string;
  name: string;
  status: 'ok' | 'unavailable' | 'unconfigured' | 'timeout' | 'error';
  latencyMs: number;
  resultsCount: number;
  error?: string;
  supportedCategories: SearchCategory[];
}

export interface SearchStats {
  sourcesQueried: number;
  successful: number;
  failed: number;
  resultsCollected: number;
  duplicatesRemoved: number;
  lowRelevanceFiltered: number;
  totalReturned: number;
  latencyMs: number;
  providers: ProviderDiagnostic[];
  cacheHit?: boolean;
  cacheAgeSec?: number;
  cacheTtlSec?: number;
}

export interface AiCitation {
  title: string;
  url: string;
  source: string;
  domain?: string;
  isGoogleSearchGrounded?: boolean;
}

export interface AiOverviewData {
  summary: string;
  keyPoints: string[];
  citations: AiCitation[];
  comparison?: string;
  suggestedQueries?: string[];
  generatedBy: string;
  groundedWithGoogle?: boolean;
  webSearchQueries?: string[];
}

export interface SearchResponsePayload {
  query: string;
  category: SearchCategory;
  results: NormalizedResult[];
  stats: SearchStats;
  aiOverview?: AiOverviewData;
}

export interface UserSession {
  userId?: string;
  username: string;
  displayName?: string;
  authenticated: boolean;
  loginAt?: number;
  createdAt?: number;
  searchCount?: number;
}

export interface SearchHistoryItem {
  id: string;
  userId: string;
  username: string;
  query: string;
  category: SearchCategory;
  sortBy: 'relevance' | 'date' | 'source';
  timestamp: number;
  resultsCount: number;
  topSources?: string[];
}

export interface CacheStatsTelemetry {
  activeEntries: number;
  expiredEntries: number;
  totalEntries: number;
  totalHits: number;
  totalMisses: number;
  hitRatePercentage: number;
  maxCapacity: number;
  categoryTtlsSec: Record<string, number>;
}
