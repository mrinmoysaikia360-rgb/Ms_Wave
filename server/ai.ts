import { GoogleGenAI } from '@google/genai';
import { CONFIG } from './config.js';
import { NormalizedResult, AiCitation, AiOverviewData } from './types.js';

let aiClient: GoogleGenAI | null = null;
let quotaExhaustedUntil = 0;

// In-memory cache for AI generated overviews (TTL: 10 minutes)
const overviewCache = new Map<string, { data: AiOverviewData; expiresAt: number }>();
const assistantCache = new Map<string, { data: AiAssistantResponse; expiresAt: number }>();

function getAiClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    try {
      aiClient = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    } catch {
      aiClient = null;
    }
  }
  return aiClient;
}

function isRateLimited(): boolean {
  return Date.now() < quotaExhaustedUntil;
}

function handleAiError(err: any, context: string) {
  const errMsg = err?.message || String(err);
  const is429 =
    errMsg.includes('429') ||
    errMsg.includes('RESOURCE_EXHAUSTED') ||
    errMsg.includes('quota') ||
    err?.status === 429 ||
    err?.error?.code === 429;

  if (is429) {
    // Cooldown for 60 seconds before retrying Gemini to avoid rate limit spikes
    quotaExhaustedUntil = Date.now() + 60_000;
    console.info(`[${context}] Gemini API quota reached. Gracefully falling back to Ms Wave Multi-Source Engine.`);
  } else {
    console.warn(`[${context}] Gemini generation issue:`, errMsg.slice(0, 120));
  }
}

export interface AiOverviewResult extends AiOverviewData {}

export interface AiAssistantResponse {
  answer: string;
  factualSummary: string;
  reasoning?: string;
  citations: AiCitation[];
  relatedSearches: string[];
  groundedWithGoogle?: boolean;
  webSearchQueries?: string[];
  model: string;
}

/**
 * Extracts verified Google Search grounding citations and queries from Gemini response metadata
 */
function extractGroundingDetails(candidate: any): {
  groundedCitations: AiCitation[];
  webSearchQueries: string[];
} {
  const groundedCitations: AiCitation[] = [];
  const webSearchQueries: string[] = [];
  const seenUrls = new Set<string>();

  const groundingMetadata = candidate?.groundingMetadata;
  if (!groundingMetadata) {
    return { groundedCitations, webSearchQueries };
  }

  if (Array.isArray(groundingMetadata.webSearchQueries)) {
    for (const q of groundingMetadata.webSearchQueries) {
      if (typeof q === 'string' && q.trim()) {
        webSearchQueries.push(q.trim());
      }
    }
  }

  if (Array.isArray(groundingMetadata.groundingChunks)) {
    for (const chunk of groundingMetadata.groundingChunks) {
      if (chunk.web?.uri) {
        const uri = chunk.web.uri.trim();
        const lower = uri.toLowerCase();
        if (!seenUrls.has(lower)) {
          seenUrls.add(lower);
          let domain = '';
          try {
            domain = new URL(uri).hostname.replace(/^www\./, '');
          } catch {
            domain = 'web';
          }

          groundedCitations.push({
            title: chunk.web.title || domain || 'Google Search Source',
            url: uri,
            source: domain ? `Google Search (${domain})` : 'Google Search',
            domain,
            isGoogleSearchGrounded: true,
          });
        }
      }
    }
  }

  return { groundedCitations, webSearchQueries };
}

/**
 * Generates an extractive, high-fidelity multi-source summary when Gemini is unavailable or rate-limited.
 */
function buildExtractiveOverview(
  query: string,
  topResults: NormalizedResult[],
  providerCitations: AiCitation[]
): AiOverviewResult | undefined {
  if (topResults.length === 0) return undefined;

  const validDescItems = topResults.filter((r) => r.description && r.description.trim().length > 20);
  if (validDescItems.length === 0) return undefined;

  const primary = validDescItems[0];
  const summaryParagraphs: string[] = [primary.description];

  const keyPoints: string[] = [];
  for (const item of validDescItems.slice(0, 4)) {
    const cleanDesc = item.description.replace(/\s+/g, ' ').trim();
    if (cleanDesc.length > 30) {
      keyPoints.push(`[${item.source}] ${item.title}: ${cleanDesc.slice(0, 160)}${cleanDesc.length > 160 ? '...' : ''}`);
    }
  }

  return {
    summary: summaryParagraphs.join('\n\n'),
    keyPoints: keyPoints.length > 0 ? keyPoints : [primary.description.slice(0, 200)],
    citations: providerCitations.slice(0, 6),
    suggestedQueries: [
      `${query} latest`,
      `${query} guide & details`,
      `${query} documentation`,
    ],
    generatedBy: 'Ms Wave Multi-Source Engine',
    groundedWithGoogle: false,
  };
}

/**
 * Synthesizes a structured AI Overview from top retrieved search results,
 * enhanced with real-time Google Search Grounding for accurate, up-to-date information.
 */
export async function generateAiOverview(
  query: string,
  topResults: NormalizedResult[] = []
): Promise<AiOverviewResult | undefined> {
  const cacheKey = query.trim().toLowerCase();
  const cached = overviewCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }

  const providerCitations: AiCitation[] = topResults.slice(0, 6).map((r) => ({
    title: r.title,
    url: r.url,
    source: r.source,
    isGoogleSearchGrounded: false,
  }));

  const client = getAiClient();
  if (client && !isRateLimited()) {
    try {
      const factsContext = topResults
        .slice(0, 8)
        .map(
          (r, idx) =>
            `[Source ${idx + 1}: ${r.title} (${r.source})]\nURL: ${r.url}\n${r.description || 'No description.'}`
        )
        .join('\n\n');

      const prompt = `You are the AI Research Assistant for "Ms Wave", an intelligent multi-source metasearch engine created by Mrinmoy Saikia.
Search Query: "${query}"

Retrieved Provider Sources:
${factsContext || 'None provided.'}

Instructions:
1. Synthesize an up-to-date, accurate, and comprehensive overview answering the query directly.
2. Use Google Search grounding to retrieve real-time and up-to-date facts, current dates, statistics, and recent developments.
3. Provide 3 to 4 concise bullet points summarizing key facts, findings, metrics, or recent developments.
4. Suggest 3 to 4 concise related queries for deeper exploration (prefixed under a "Related Searches:" header).
5. Ensure clarity, factual integrity, and neutrality.`;

      const response = await client.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      const candidate = response.candidates?.[0];
      const { groundedCitations, webSearchQueries } = extractGroundingDetails(candidate);

      const text = response.text || '';
      if (text.trim()) {
        const lines = text.split('\n');
        const bullets: string[] = [];
        const paragraphs: string[] = [];
        const related: string[] = [];

        let inRelated = false;
        for (const line of lines) {
          const trimmed = line.trim();
          if (
            trimmed.toLowerCase().includes('related search') ||
            trimmed.toLowerCase().includes('related queries')
          ) {
            inRelated = true;
            continue;
          }

          if (inRelated) {
            if (trimmed.startsWith('* ') || trimmed.startsWith('- ') || trimmed.match(/^\d+\.\s/)) {
              related.push(trimmed.replace(/^[*-\d.]+\s+/, '').replace(/"/g, ''));
            }
          } else if (trimmed.startsWith('* ') || trimmed.startsWith('- ') || trimmed.match(/^\d+\.\s/)) {
            bullets.push(trimmed.replace(/^[*-\d.]+\s+/, ''));
          } else if (trimmed.length > 0 && !trimmed.startsWith('#')) {
            paragraphs.push(trimmed);
          }
        }

        // Combine grounded citations (prioritized) and provider citations
        const mergedCitations: AiCitation[] = [];
        const seenUrls = new Set<string>();

        for (const c of groundedCitations) {
          if (!seenUrls.has(c.url.toLowerCase())) {
            seenUrls.add(c.url.toLowerCase());
            mergedCitations.push(c);
          }
        }

        for (const c of providerCitations) {
          if (!seenUrls.has(c.url.toLowerCase())) {
            seenUrls.add(c.url.toLowerCase());
            mergedCitations.push(c);
          }
        }

        const isGrounded = groundedCitations.length > 0 || webSearchQueries.length > 0;

        const overviewResult: AiOverviewResult = {
          summary: paragraphs.join('\n\n') || text,
          keyPoints: bullets.length > 0 ? bullets : [text.slice(0, 180)],
          citations: mergedCitations.slice(0, 8),
          suggestedQueries: related.length > 0 ? related.slice(0, 4) : undefined,
          generatedBy: isGrounded
            ? 'Ms Wave AI · Grounded with Google Search (Gemini 3.5 Flash)'
            : 'Ms Wave AI (Gemini 3.5 Flash)',
          groundedWithGoogle: isGrounded,
          webSearchQueries: webSearchQueries.length > 0 ? webSearchQueries : undefined,
        };

        // Cache for 10 minutes
        overviewCache.set(cacheKey, {
          data: overviewResult,
          expiresAt: Date.now() + 10 * 60 * 1000,
        });

        return overviewResult;
      }
    } catch (err: any) {
      handleAiError(err, 'AI Overview');
    }
  }

  // Graceful fallback to extractive summary if Gemini is unavailable, rate-limited, or failed
  const fallbackResult = buildExtractiveOverview(query, topResults, providerCitations);
  if (fallbackResult) {
    overviewCache.set(cacheKey, {
      data: fallbackResult,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });
  }
  return fallbackResult;
}

/**
 * Dedicated AI Assistant interactive query answerer with Google Search Grounding and citations
 */
export async function answerWithAiAssistant(options: {
  query: string;
  contextResults?: NormalizedResult[];
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}): Promise<AiAssistantResponse> {
  const { query, contextResults = [] } = options;
  const cacheKey = `asst_${query.trim().toLowerCase()}`;
  const cached = assistantCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }

  const providerCitations: AiCitation[] = contextResults.slice(0, 8).map((r) => ({
    title: r.title,
    url: r.url,
    source: r.source,
    isGoogleSearchGrounded: false,
  }));

  const client = getAiClient();
  if (client && !isRateLimited()) {
    try {
      const contextText = contextResults
        .map(
          (r, i) =>
            `[Citation ${i + 1}] Title: ${r.title} | Source: ${r.source}\nURL: ${r.url}\nExcerpt: ${r.description}`
        )
        .join('\n\n');

      const systemPrompt = `You are the Ms Wave AI Assistant, an advanced search and research copilot created by Mrinmoy Saikia.
Your role is to understand user inquiries, analyze multi-source retrieved search data, compare findings, retrieve current information using Google Search grounding, and give clear, cited answers.
Always distinguish between verified facts from sources and logical reasoning.`;

      const userPrompt = `User Query: "${query}"

Available Search Sources Context:
${contextText || 'No direct search context passed. Retrieve live facts using Google Search.'}

Please provide:
1. A direct, informative answer to the question with source attribution and real-time accuracy.
2. 3 actionable related search suggestions.`;

      const response = await client.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: `${systemPrompt}\n\n${userPrompt}`,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      const candidate = response.candidates?.[0];
      const { groundedCitations, webSearchQueries } = extractGroundingDetails(candidate);

      const mergedCitations: AiCitation[] = [];
      const seenUrls = new Set<string>();

      for (const c of groundedCitations) {
        if (!seenUrls.has(c.url.toLowerCase())) {
          seenUrls.add(c.url.toLowerCase());
          mergedCitations.push(c);
        }
      }

      for (const c of providerCitations) {
        if (!seenUrls.has(c.url.toLowerCase())) {
          seenUrls.add(c.url.toLowerCase());
          mergedCitations.push(c);
        }
      }

      const responseText = response.text || '';
      const isGrounded = groundedCitations.length > 0 || webSearchQueries.length > 0;

      const assistantResult: AiAssistantResponse = {
        answer: responseText,
        factualSummary: responseText.slice(0, 280),
        citations: mergedCitations.slice(0, 10),
        relatedSearches: [
          `${query} summary`,
          `${query} latest developments`,
          `${query} overview`,
        ],
        groundedWithGoogle: isGrounded,
        webSearchQueries: webSearchQueries.length > 0 ? webSearchQueries : undefined,
        model: isGrounded ? 'gemini-3.5-flash (Google Search Grounded)' : 'gemini-3.5-flash',
      };

      assistantCache.set(cacheKey, {
        data: assistantResult,
        expiresAt: Date.now() + 10 * 60 * 1000,
      });

      return assistantResult;
    } catch (err: any) {
      handleAiError(err, 'AiAssistant');
    }
  }

  // Fallback response without Gemini
  const topText = contextResults.map((r) => r.description).filter(Boolean).join(' ');
  const fallbackAsst: AiAssistantResponse = {
    answer: topText
      ? `Based on retrieved records from Ms Wave providers: ${topText.slice(0, 400)}...`
      : `Ms Wave metasearch indexed results for "${query}" across verified providers.`,
    factualSummary: topText ? topText.slice(0, 200) : `Results for ${query}`,
    citations: providerCitations,
    relatedSearches: [
      `${query} overview`,
      `${query} videos`,
      `${query} science`,
    ],
    groundedWithGoogle: false,
    model: 'Ms Wave Extractive Engine',
  };

  return fallbackAsst;
}
