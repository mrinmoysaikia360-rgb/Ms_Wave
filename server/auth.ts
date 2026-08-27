import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { CONFIG } from './config.js';
import { UserSession } from './types.js';
import { verifyCredentials, findUserByUsername, StoredUser } from './store.js';

// Extend Express Request type with authenticated user session
export interface AuthenticatedRequest extends Request {
  user?: UserSession;
}

// Signed session token generator
export function createSessionToken(user: StoredUser | { username: string; id?: string; displayName?: string }): string {
  const payload = {
    userId: user.id || `usr_${user.username.trim().toLowerCase()}`,
    username: user.username,
    displayName: (user as any).displayName || user.username,
    authenticated: true,
    loginAt: Date.now(),
    expiresAt: Date.now() + CONFIG.SESSION_MAX_AGE_MS,
  };
  const json = JSON.stringify(payload);
  const base64 = Buffer.from(json).toString('base64url');
  const signature = crypto
    .createHmac('sha256', CONFIG.SESSION_SECRET)
    .update(base64)
    .digest('base64url');
  return `${base64}.${signature}`;
}

// Verify signed session token
export function verifySessionToken(token: string | undefined): UserSession | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [base64, signature] = parts;
  const expectedSignature = crypto
    .createHmac('sha256', CONFIG.SESSION_SECRET)
    .update(base64)
    .digest('base64url');

  if (signature !== expectedSignature) {
    return null;
  }

  try {
    const json = Buffer.from(base64, 'base64url').toString('utf8');
    const payload = JSON.parse(json);
    if (payload.expiresAt && Date.now() > payload.expiresAt) {
      return null;
    }

    // Refresh user state from store if available
    const freshUser = findUserByUsername(payload.username);

    return {
      userId: freshUser?.id || payload.userId,
      username: freshUser?.username || payload.username,
      displayName: freshUser?.displayName || payload.displayName || payload.username,
      authenticated: true,
      loginAt: payload.loginAt,
      createdAt: freshUser?.createdAt,
      searchCount: freshUser?.searchCount,
    };
  } catch {
    return null;
  }
}

// Express middleware to enforce authentication
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token =
    req.cookies?.[CONFIG.SESSION_COOKIE_NAME] ||
    req.headers['authorization']?.replace(/^Bearer\s+/i, '');

  const session = verifySessionToken(token);
  if (!session) {
    return res.status(401).json({
      error: 'Unauthenticated',
      message: 'Please login to access Ms Wave user services.',
    });
  }

  (req as AuthenticatedRequest).user = session;
  next();
}

// Express middleware for optional authentication (populates req.user if present without failing)
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const token =
    req.cookies?.[CONFIG.SESSION_COOKIE_NAME] ||
    req.headers['authorization']?.replace(/^Bearer\s+/i, '');

  if (token) {
    const session = verifySessionToken(token);
    if (session) {
      (req as AuthenticatedRequest).user = session;
    }
  }
  next();
}

// Validate credentials using persistent store
export function validateCredentials(username: string, password: string): { valid: boolean; user?: StoredUser } {
  return verifyCredentials(username, password);
}
