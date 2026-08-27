import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

export const CONFIG = {
  PORT: 3000,
  HOST: '0.0.0.0',
  
  // Auth Config
  AUTH_USER: process.env.MS_WAVE_USER || 'Msaikia',
  AUTH_PASSWORD: process.env.MS_WAVE_PASSWORD || '1091',
  AUTH_PASSWORD_HASH: process.env.MS_WAVE_PASSWORD_HASH || '',
  
  SESSION_SECRET: process.env.SESSION_SECRET || 'ms_wave_secure_session_key_2026_x79',
  SESSION_COOKIE_NAME: 'ms_wave_session',
  SESSION_MAX_AGE_MS: 7 * 24 * 60 * 60 * 1000, // 7 days

  // Metasearch & External APIs
  SEARXNG_URL: process.env.SEARXNG_URL ? process.env.SEARXNG_URL.replace(/\/+$/, '') : '',
  BRAVE_API_KEY: process.env.BRAVE_API_KEY || '',
  YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY || '',
  OPENALEX_EMAIL: process.env.OPENALEX_EMAIL || 'contact@mswave.search',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',

  // Provider Settings
  PROVIDER_TIMEOUT_MS: 4500,
  MAX_RESULTS_PER_PROVIDER: 15,
};

// Compute SHA-256 for password verification
export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Compute hash of the default 2229 if none configured
export const DEFAULT_PASS_HASH = hashPassword(CONFIG.AUTH_PASSWORD);
