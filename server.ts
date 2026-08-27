import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { CONFIG } from './server/config.js';
import {
  validateCredentials,
  createSessionToken,
  verifySessionToken,
  requireAuth,
  optionalAuth,
  AuthenticatedRequest,
} from './server/auth.js';
import {
  registerUser,
  findUserByUsername,
  updateUserProfile,
  updateUserPassword,
  deleteUserAccount,
  recordSearchHistory,
  getUserSearchHistory,
  deleteUserHistoryItem,
  clearUserSearchHistory,
} from './server/store.js';
import { searchCache } from './server/cache.js';
import { performSearch } from './server/search.js';
import { SearchCategory } from './server/types.js';
import { ALL_PROVIDERS } from './server/providers/index.js';
import { searchYouTube } from './server/providers/youtube.js';
import { searchAllVideos } from './server/providers/video.js';
import { searchAudio } from './server/providers/music.js';
import { answerWithAiAssistant } from './server/ai.js';
import { OPENAPI_SPEC, getSwaggerHtml, getRedocHtml } from './server/openapi.js';

async function startServer() {
  const app = express();

  // Basic security and parsing middleware
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  // Security headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  // ----------------------------------------------------
  // Interactive API Documentation (OpenAPI / Swagger / ReDoc)
  // ----------------------------------------------------
  app.get('/openapi.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.json(OPENAPI_SPEC);
  });

  app.get('/docs', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(getSwaggerHtml());
  });

  app.get('/redoc', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(getRedocHtml());
  });

  // Health check endpoints
  const healthHandler = (req: express.Request, res: express.Response) => {
    const configuredCount = ALL_PROVIDERS.filter((p) => p.isConfigured()).length;
    res.json({
      status: 'ok',
      service: 'Ms Wave',
      author: 'Mrinmoy Saikia',
      timestamp: new Date().toISOString(),
      youtubeConfigured: Boolean(CONFIG.YOUTUBE_API_KEY),
      geminiConfigured: Boolean(CONFIG.GEMINI_API_KEY),
      providers: {
        total: ALL_PROVIDERS.length,
        configured: configuredCount,
        list: ALL_PROVIDERS.map((p) => ({
          id: p.id,
          name: p.name,
          configured: p.isConfigured(),
          categories: p.supportedCategories,
        })),
      },
    });
  };

  app.get('/health', healthHandler);
  app.get('/api/health', healthHandler);

  // ----------------------------------------------------
  // Authentication & Account Management Routes
  // ----------------------------------------------------

  // Register New User
  app.post('/api/register', (req, res) => {
    const { username, password, displayName } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and Password are required to create an account',
      });
    }

    const regResult = registerUser(username, password, displayName);
    if (!regResult.success || !regResult.user) {
      return res.status(400).json({
        success: false,
        error: regResult.error || 'Failed to create user account',
      });
    }

    const token = createSessionToken(regResult.user);

    // Set secure HTTP-only cookie
    res.cookie(CONFIG.SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: CONFIG.SESSION_MAX_AGE_MS,
      path: '/',
    });

    res.status(201).json({
      success: true,
      token,
      user: {
        userId: regResult.user.id,
        username: regResult.user.username,
        displayName: regResult.user.displayName,
        authenticated: true,
        createdAt: regResult.user.createdAt,
        searchCount: regResult.user.searchCount,
      },
    });
  });

  // Login
  app.post('/api/login', (req, res) => {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username / ID and Password are required',
      });
    }

    const authResult = validateCredentials(username, password);
    if (!authResult.valid || !authResult.user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid Username or Password. Please verify your credentials.',
      });
    }

    const user = authResult.user;
    const token = createSessionToken(user);

    // Set secure HTTP-only cookie
    res.cookie(CONFIG.SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: CONFIG.SESSION_MAX_AGE_MS,
      path: '/',
    });

    res.json({
      success: true,
      token,
      user: {
        userId: user.id,
        username: user.username,
        displayName: user.displayName,
        authenticated: true,
        createdAt: user.createdAt,
        searchCount: user.searchCount,
      },
    });
  });

  // Logout
  app.post('/api/logout', (req, res) => {
    res.clearCookie(CONFIG.SESSION_COOKIE_NAME, { path: '/' });
    res.json({ success: true, message: 'Logged out successfully' });
  });

  // Check Active Session
  app.get('/api/session', (req, res) => {
    const token =
      req.cookies?.[CONFIG.SESSION_COOKIE_NAME] ||
      req.headers['authorization']?.replace(/^Bearer\s+/i, '');

    const session = verifySessionToken(token);
    if (!session) {
      return res.json({ authenticated: false });
    }

    res.json({
      authenticated: true,
      user: session,
    });
  });

  // Get User Profile & Stats (Protected)
  app.get('/api/user/profile', requireAuth, (req: AuthenticatedRequest, res) => {
    const username = req.user!.username;
    const user = findUserByUsername(username);

    if (!user) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    const history = getUserSearchHistory(username, { limit: 1000 });

    res.json({
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      searchCount: user.searchCount || history.length,
      historyCount: history.length,
    });
  });

  // Update User Profile (Protected)
  app.put('/api/user/profile', requireAuth, (req: AuthenticatedRequest, res) => {
    const username = req.user!.username;
    const { displayName } = req.body || {};

    const result = updateUserProfile(username, { displayName });
    if (!result.success || !result.user) {
      return res.status(400).json({ error: result.error || 'Failed to update profile' });
    }

    res.json({
      success: true,
      user: {
        userId: result.user.id,
        username: result.user.username,
        displayName: result.user.displayName,
        createdAt: result.user.createdAt,
        searchCount: result.user.searchCount,
      },
    });
  });

  // Change Password (Protected)
  app.put('/api/user/password', requireAuth, (req: AuthenticatedRequest, res) => {
    const username = req.user!.username;
    const { currentPassword, newPassword } = req.body || {};

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    const result = updateUserPassword(username, currentPassword, newPassword);
    if (!result.success) {
      return res.status(400).json({ error: result.error || 'Failed to update password' });
    }

    res.json({ success: true, message: 'Password updated successfully' });
  });

  // Delete User Account (Protected)
  app.delete('/api/user/account', requireAuth, (req: AuthenticatedRequest, res) => {
    const username = req.user!.username;
    const result = deleteUserAccount(username);

    if (!result.success) {
      return res.status(400).json({ error: result.error || 'Failed to delete account' });
    }

    res.clearCookie(CONFIG.SESSION_COOKIE_NAME, { path: '/' });
    res.json({ success: true, message: 'Account and associated search history deleted' });
  });

  // ----------------------------------------------------
  // User Search History Routes (Strictly User-Private)
  // ----------------------------------------------------

  // Get Private Search History for authenticated user
  app.get('/api/history', requireAuth, (req: AuthenticatedRequest, res) => {
    const username = req.user!.username;
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const limit = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : 50;

    const history = getUserSearchHistory(username, { category, search, limit });
    res.json({
      success: true,
      username,
      total: history.length,
      history,
    });
  });

  // Delete Single History Record
  app.delete('/api/history/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const username = req.user!.username;
    const historyId = req.params.id;

    const result = deleteUserHistoryItem(username, historyId);
    if (!result.success) {
      return res.status(404).json({ error: result.error || 'History record not found' });
    }

    res.json({ success: true, message: 'History entry deleted' });
  });

  // Clear All Search History for Authenticated User
  app.delete('/api/history', requireAuth, (req: AuthenticatedRequest, res) => {
    const username = req.user!.username;
    const result = clearUserSearchHistory(username);

    res.json({
      success: true,
      message: `Cleared ${result.count} search history records`,
      deletedCount: result.count,
    });
  });

  // ----------------------------------------------------
  // Dedicated Provider Endpoints (YouTube, Multi-Video, Audio, AI)
  // ----------------------------------------------------

  // Direct YouTube Data API Search
  app.get('/api/providers/youtube/search', async (req, res) => {
    try {
      const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
      if (!q) {
        return res.status(400).json({ error: 'Search query parameter "q" is required' });
      }

      if (!CONFIG.YOUTUBE_API_KEY) {
        return res.status(503).json({
          error: 'YouTube API is not configured',
          message: 'YOUTUBE_API_KEY environment variable is missing on the server. Alternative video providers (PeerTube, Internet Archive, Wikimedia) are available at /api/providers/video/search.',
        });
      }

      const limit = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : 12;
      const pageToken = typeof req.query.pageToken === 'string' ? req.query.pageToken : undefined;
      const safeSearch = (req.query.safe_search as 'none' | 'moderate' | 'strict') || 'moderate';
      const language = typeof req.query.language === 'string' ? req.query.language : undefined;

      const result = await searchYouTube({
        query: q,
        limit,
        pageToken,
        safeSearch,
        language,
      });

      res.json({
        success: true,
        source: 'YouTube Data API v3',
        query: q,
        count: result.items.length,
        totalResults: result.totalResults,
        nextPageToken: result.nextPageToken,
        results: result.items,
      });
    } catch (err: any) {
      console.error('YouTube search error:', err);
      res.status(500).json({
        error: 'YouTube Search Error',
        message: err.message || 'Failed to retrieve YouTube videos',
      });
    }
  });

  // Unified Multi-Source Video Search (YouTube, PeerTube, Internet Archive, Wikimedia)
  app.get('/api/providers/video/search', async (req, res) => {
    try {
      const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
      if (!q) {
        return res.status(400).json({ error: 'Search query parameter "q" is required' });
      }

      const limit = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : 20;
      const safeSearch = (req.query.safe_search as 'none' | 'moderate' | 'strict') || 'moderate';
      const language = typeof req.query.language === 'string' ? req.query.language : undefined;

      const result = await searchAllVideos({
        query: q,
        limit,
        safeSearch,
        language,
      });

      res.json({
        success: true,
        query: q,
        count: result.results.length,
        providersQueried: result.providersQueried,
        providersSuccessful: result.providersSuccessful,
        results: result.results,
      });
    } catch (err: any) {
      console.error('Unified video search error:', err);
      res.status(500).json({
        error: 'Video Search Error',
        message: err.message || 'Failed to retrieve video results',
      });
    }
  });

  // Unified Audio & Music Provider Search
  app.get('/api/providers/audio/search', async (req, res) => {
    try {
      const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
      if (!q) {
        return res.status(400).json({ error: 'Search query parameter "q" is required' });
      }

      const limit = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : 15;
      const tracks = await searchAudio({ query: q, limit });

      res.json({
        success: true,
        query: q,
        count: tracks.length,
        results: tracks,
      });
    } catch (err: any) {
      console.error('Audio search error:', err);
      res.status(500).json({
        error: 'Audio Search Error',
        message: err.message || 'Failed to retrieve audio results',
      });
    }
  });

  // Dedicated AI Assistant Search & Synthesis Endpoint
  app.post('/api/ai', async (req, res) => {
    try {
      const { query, contextResults } = req.body || {};
      const trimmedQuery = typeof query === 'string' ? query.trim() : '';
      if (!trimmedQuery) {
        return res.status(400).json({ error: 'Field "query" is required in request body' });
      }

      const aiResponse = await answerWithAiAssistant({
        query: trimmedQuery,
        contextResults: Array.isArray(contextResults) ? contextResults : [],
      });

      res.json({
        success: true,
        query: trimmedQuery,
        ...aiResponse,
      });
    } catch (err: any) {
      console.error('AI assistant error:', err);
      res.status(500).json({
        error: 'AI Assistant Error',
        message: err.message || 'Failed to generate AI response',
      });
    }
  });

  app.get('/api/ai', async (req, res) => {
    try {
      const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
      if (!q) {
        return res.status(400).json({ error: 'Query parameter "q" is required' });
      }

      const aiResponse = await answerWithAiAssistant({ query: q });
      res.json({
        success: true,
        query: q,
        ...aiResponse,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'AI Assistant Error' });
    }
  });

  // ----------------------------------------------------
  // Provider Status list
  // ----------------------------------------------------
  app.get('/api/providers', (req, res) => {
    const list = ALL_PROVIDERS.map((p) => ({
      id: p.id,
      name: p.name,
      configured: p.isConfigured(),
      supportedCategories: p.supportedCategories,
    }));
    res.json({ providers: list });
  });

  // ----------------------------------------------------
  // Cache Statistics & Diagnostics
  // ----------------------------------------------------
  app.get('/api/cache/stats', (req, res) => {
    const stats = searchCache.getStats();
    res.json({ success: true, cache: stats });
  });

  app.post('/api/cache/clear', (req, res) => {
    const category = typeof req.body?.category === 'string' ? (req.body.category as SearchCategory) : undefined;
    searchCache.clear(category);
    res.json({ success: true, message: category ? `Cleared cache for ${category}` : 'Cleared entire search cache' });
  });

  // ----------------------------------------------------
  // Search Route with Integrated Caching Layer & Private History
  // ----------------------------------------------------
  app.get('/api/search', optionalAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const q = typeof req.query.q === 'string' ? req.query.q : '';
      const category = (typeof req.query.type === 'string'
        ? req.query.type
        : typeof req.query.category === 'string'
        ? req.query.category
        : 'all') as SearchCategory;
      const sortBy = (typeof req.query.sortBy === 'string' ? req.query.sortBy : 'relevance') as
        | 'relevance'
        | 'date'
        | 'source';
      const refresh = req.query.refresh === 'true' || req.headers['x-cache-bypass'] === 'true';

      const trimmedQuery = q.trim();
      if (!trimmedQuery) {
        return res.status(400).json({ error: 'Search query "q" is required' });
      }

      const currentUser = req.user?.username;

      // 1. Check Search Cache Layer (unless explicit refresh requested)
      if (!refresh) {
        const cachedPayload = searchCache.get(trimmedQuery, category, sortBy);
        if (cachedPayload) {
          // Record private search history for the authenticated user
          if (currentUser) {
            const topSources = Array.from(
              new Set(cachedPayload.results.slice(0, 5).map((r) => r.source).filter(Boolean))
            );
            recordSearchHistory(
              currentUser,
              trimmedQuery,
              category,
              sortBy,
              cachedPayload.results.length,
              topSources
            );
          }

          return res.json(cachedPayload);
        }
      }

      // 2. Perform live multi-source metasearch pipeline
      const freshResults = await performSearch(trimmedQuery, category, sortBy);

      // 3. Store in Caching Layer with category TTL
      searchCache.set(trimmedQuery, category, sortBy, freshResults);

      // 4. Record private search history for the authenticated user
      if (currentUser) {
        const topSources = Array.from(
          new Set(freshResults.results.slice(0, 5).map((r) => r.source).filter(Boolean))
        );
        recordSearchHistory(
          currentUser,
          trimmedQuery,
          category,
          sortBy,
          freshResults.results.length,
          topSources
        );
      }

      res.json(freshResults);
    } catch (err: any) {
      console.error('Search error:', err);
      res.status(500).json({
        error: 'Search Execution Error',
        message: err.message || 'An unexpected error occurred during search execution',
      });
    }
  });

  // Vite development middleware or static production files
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(CONFIG.PORT, CONFIG.HOST, () => {
    console.log(`[Ms Wave] Server running on http://${CONFIG.HOST}:${CONFIG.PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Ms Wave server:', err);
  process.exit(1);
});
