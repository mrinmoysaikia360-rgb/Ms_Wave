import { NormalizedResult, SearchCategory, SearchProvider } from '../types.js';

export const duckduckgoProvider: SearchProvider = {
  id: 'duckduckgo',
  name: 'DuckDuckGo Open',
  supportedCategories: ['all'],
  isConfigured: () => true,

  async search(query: string, category: SearchCategory, limit = 8, signal?: AbortSignal): Promise<NormalizedResult[]> {
    const encoded = encodeURIComponent(query.trim());
    const apiUrl = `https://api.duckduckgo.com/?q=${encoded}&format=json&no_html=1&skip_disambig=0`;

    const res = await fetch(apiUrl, {
      signal,
      headers: {
        'User-Agent': 'MsWaveMetasearch/1.0',
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`DuckDuckGo API returned status ${res.status}`);
    }

    const data = await res.json();
    const results: NormalizedResult[] = [];

    // 1. Direct Abstract Answer
    if (data.Abstract && data.AbstractURL) {
      results.push({
        id: `ddg-abstract-${encodeURIComponent(data.Heading || query)}`,
        title: data.Heading || `${query} Overview`,
        url: data.AbstractURL,
        description: data.Abstract,
        source: 'DuckDuckGo Open',
        type: 'web',
        thumbnail: data.Image ? `https://duckduckgo.com${data.Image}` : undefined,
        author: data.AbstractSource || 'DuckDuckGo Instant Answers',
        score: 45,
        metadata: {
          isDirectAnswer: true,
          sourceType: data.AbstractSource,
        },
      });
    }

    // 2. Related Topics
    if (Array.isArray(data.RelatedTopics)) {
      for (const topic of data.RelatedTopics) {
        if (results.length >= limit) break;

        // Skip nested groups for simple items
        if (topic.Text && topic.FirstURL) {
          const match = topic.Text.match(/^([^-–—]+)\s*[-–—]\s*(.*)$/);
          const title = match ? match[1].trim() : topic.Text.slice(0, 60);
          const description = match ? match[2].trim() : topic.Text;

          results.push({
            id: `ddg-topic-${encodeURIComponent(topic.FirstURL)}`,
            title,
            url: topic.FirstURL,
            description,
            source: 'DuckDuckGo Open',
            type: 'web',
            thumbnail: topic.Icon?.URL ? (topic.Icon.URL.startsWith('http') ? topic.Icon.URL : `https://duckduckgo.com${topic.Icon.URL}`) : undefined,
            score: 30 - results.length,
          });
        } else if (Array.isArray(topic.Topics)) {
          // Grouped topics
          for (const subTopic of topic.Topics) {
            if (results.length >= limit) break;
            if (subTopic.Text && subTopic.FirstURL) {
              results.push({
                id: `ddg-subtopic-${encodeURIComponent(subTopic.FirstURL)}`,
                title: subTopic.Text.slice(0, 60),
                url: subTopic.FirstURL,
                description: subTopic.Text,
                source: 'DuckDuckGo Open',
                type: 'web',
                thumbnail: subTopic.Icon?.URL ? (subTopic.Icon.URL.startsWith('http') ? subTopic.Icon.URL : `https://duckduckgo.com${subTopic.Icon.URL}`) : undefined,
                score: 28 - results.length,
              });
            }
          }
        }
      }
    }

    return results;
  },
};
