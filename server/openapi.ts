/**
 * OpenAPI 3.1.0 Specification and Swagger UI / ReDoc HTML Renderers for Ms Wave
 */

export const OPENAPI_SPEC = {
  openapi: '3.1.0',
  info: {
    title: 'Ms Wave — Multi-Source Search & AI Platform API',
    version: '2.4.0',
    description: `
**Ms Wave** is a high-performance, privacy-first multi-source metasearch engine and AI research platform.
Created by **Mrinmoy Saikia**.

### Key Capabilities:
- **YouTube Data API v3 integration** for official video metadata, ISO 8601 duration parsing, and embedded playback.
- **Unified Multi-Source Video Search** querying YouTube, PeerTube Fediverse, Internet Archive Movies, and Wikimedia Commons.
- **Audio & Music Provider Search** supporting Apple Music / iTunes and Internet Archive collections with audio previews.
- **Gemini 3.7 Flash AI Assistant** for real-time search synthesis, citations, comparisons, and query suggestions.
- **Categorized Metasearch** (Web, Images, Videos, News, Science, Music, Maps).
- **Session-Based Privacy** & Search History isolation.
    `.trim(),
    contact: {
      name: 'Mrinmoy Saikia',
      url: 'https://mswave.search',
      email: 'contact@mswave.search',
    },
  },
  servers: [
    {
      url: '/',
      description: 'Current Ms Wave API Server',
    },
  ],
  paths: {
    '/health': {
      get: {
        summary: 'Engine Health Check',
        description: 'Returns health telemetry, author branding, and active provider count.',
        tags: ['System'],
        responses: {
          '200': {
            description: 'Engine is operational',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    service: { type: 'string', example: 'Ms Wave' },
                    author: { type: 'string', example: 'Mrinmoy Saikia' },
                    timestamp: { type: 'string', format: 'date-time' },
                    providers: {
                      type: 'object',
                      properties: {
                        total: { type: 'integer', example: 14 },
                        configured: { type: 'integer', example: 13 },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/search': {
      get: {
        summary: 'Multi-Source Metasearch',
        description: 'Executes parallel federated search across all active providers for the selected category.',
        tags: ['Search'],
        parameters: [
          {
            name: 'q',
            in: 'query',
            required: true,
            description: 'Search query string',
            schema: { type: 'string', example: 'quantum computing advances' },
          },
          {
            name: 'type',
            in: 'query',
            required: false,
            description: 'Search category filter',
            schema: {
              type: 'string',
              enum: ['all', 'images', 'videos', 'news', 'science', 'music', 'maps'],
              default: 'all',
            },
          },
          {
            name: 'sortBy',
            in: 'query',
            required: false,
            description: 'Sort ordering for results',
            schema: {
              type: 'string',
              enum: ['relevance', 'date', 'source'],
              default: 'relevance',
            },
          },
          {
            name: 'refresh',
            in: 'query',
            required: false,
            description: 'Bypass search cache and force live query',
            schema: { type: 'boolean', default: false },
          },
        ],
        responses: {
          '200': {
            description: 'Federated search results payload',
          },
        },
      },
    },
    '/api/providers/youtube/search': {
      get: {
        summary: 'Direct YouTube Video Search',
        description: 'Searches YouTube Data API v3 with video details batching for duration and view statistics.',
        tags: ['Video Providers'],
        parameters: [
          {
            name: 'q',
            in: 'query',
            required: true,
            description: 'Video search query',
            schema: { type: 'string', example: 'web development tutorial' },
          },
          {
            name: 'limit',
            in: 'query',
            required: false,
            schema: { type: 'integer', default: 12, maximum: 50 },
          },
          {
            name: 'safe_search',
            in: 'query',
            required: false,
            schema: { type: 'string', enum: ['none', 'moderate', 'strict'], default: 'moderate' },
          },
          {
            name: 'language',
            in: 'query',
            required: false,
            schema: { type: 'string', example: 'en' },
          },
        ],
        responses: {
          '200': {
            description: 'Normalized YouTube videos list',
          },
        },
      },
    },
    '/api/providers/video/search': {
      get: {
        summary: 'Unified Multi-Source Video Search',
        description: 'Aggregates videos across YouTube, PeerTube, Internet Archive Movies, and Wikimedia Commons.',
        tags: ['Video Providers'],
        parameters: [
          {
            name: 'q',
            in: 'query',
            required: true,
            description: 'Video search query',
            schema: { type: 'string', example: 'ambient space music' },
          },
          {
            name: 'limit',
            in: 'query',
            required: false,
            schema: { type: 'integer', default: 20 },
          },
        ],
        responses: {
          '200': {
            description: 'Deduplicated list of video results',
          },
        },
      },
    },
    '/api/providers/audio/search': {
      get: {
        summary: 'Unified Audio & Music Search',
        description: 'Searches iTunes Music and Internet Archive audio collections with high-res artwork and preview audio URLs.',
        tags: ['Audio Providers'],
        parameters: [
          {
            name: 'q',
            in: 'query',
            required: true,
            description: 'Song, artist, or album title',
            schema: { type: 'string', example: 'classical piano' },
          },
          {
            name: 'limit',
            in: 'query',
            required: false,
            schema: { type: 'integer', default: 15 },
          },
        ],
        responses: {
          '200': {
            description: 'List of audio tracks and preview streams',
          },
        },
      },
    },
    '/api/ai': {
      post: {
        summary: 'AI Research Assistant & Query Answerer',
        description: 'Generates citations, answers, and comparison points powered by Gemini 3.7 Flash.',
        tags: ['AI Assistant'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['query'],
                properties: {
                  query: { type: 'string', example: 'What are the main causes of solar flares?' },
                  contextResults: {
                    type: 'array',
                    items: { type: 'object' },
                    description: 'Optional pre-retrieved search results to synthesize from',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'AI answer with citations and follow-up queries',
          },
        },
      },
    },
  },
};

/**
 * Generates Swagger UI standalone HTML
 */
export function getSwaggerHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Ms Wave API Documentation — Swagger UI</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css" />
  <style>
    body { margin: 0; background: #020617; color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    .swagger-ui .topbar { display: none; }
    .swagger-ui { color: #f8fafc; max-width: 1200px; margin: 0 auto; padding: 20px; }
    .swagger-ui .info .title { color: #3b82f6; }
    .swagger-ui .scheme-container { background: #0f172a; border-radius: 12px; }
    .swagger-ui .opblock { border-radius: 12px; overflow: hidden; }
    .header-bar { background: #0f172a; border-bottom: 1px solid #1e293b; padding: 16px 24px; display: flex; align-items: center; justify-content: space-between; }
    .brand-title { font-size: 20px; font-weight: 800; }
    .brand-author { color: #60a5fa; font-size: 13px; font-weight: 600; }
    .docs-links a { color: #94a3b8; text-decoration: none; margin-left: 16px; font-size: 13px; font-weight: 600; }
    .docs-links a:hover { color: #38bdf8; }
  </style>
</head>
<body>
  <div class="header-bar">
    <div>
      <span class="brand-title">Ms <span style="color:#3b82f6">Wave</span> API</span>
      <span class="brand-author" style="margin-left:12px;">Created by Mrinmoy Saikia.</span>
    </div>
    <div class="docs-links">
      <a href="/redoc">ReDoc View</a>
      <a href="/openapi.json" target="_blank">OpenAPI JSON</a>
      <a href="/">Ms Wave Home</a>
    </div>
  </div>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.onload = () => {
      window.ui = SwaggerUIBundle({
        url: '/openapi.json',
        dom_id: '#swagger-ui',
        presets: [SwaggerUIBundle.presets.apis],
        layout: "BaseLayout",
        deepLinking: true
      });
    };
  </script>
</body>
</html>`;
}

/**
 * Generates ReDoc standalone HTML
 */
export function getRedocHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Ms Wave API Reference — ReDoc</title>
  <style>
    body { margin: 0; padding: 0; background: #020617; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    .header-bar { background: #0f172a; border-bottom: 1px solid #1e293b; padding: 14px 24px; display: flex; align-items: center; justify-content: space-between; color: white; }
    .brand-title { font-size: 18px; font-weight: 800; }
    .brand-author { color: #60a5fa; font-size: 13px; font-weight: 600; margin-left: 10px; }
    .docs-links a { color: #94a3b8; text-decoration: none; margin-left: 16px; font-size: 13px; font-weight: 600; }
    .docs-links a:hover { color: #38bdf8; }
  </style>
</head>
<body>
  <div class="header-bar">
    <div>
      <span class="brand-title">Ms <span style="color:#3b82f6">Wave</span> Interactive Reference</span>
      <span class="brand-author">Created by Mrinmoy Saikia.</span>
    </div>
    <div class="docs-links">
      <a href="/docs">Swagger UI</a>
      <a href="/openapi.json" target="_blank">OpenAPI JSON</a>
      <a href="/">Ms Wave Home</a>
    </div>
  </div>
  <redoc spec-url="/openapi.json" theme='{"colors":{"primary":{"main":"#3b82f6"}}}'></redoc>
  <script src="https://cdn.jsdelivr.net/npm/redoc@latest/bundles/redoc.standalone.js"></script>
</body>
</html>`;
}
