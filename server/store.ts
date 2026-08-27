import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { SearchCategory } from './types.js';
import { CONFIG, hashPassword, DEFAULT_PASS_HASH } from './config.js';

export interface StoredUser {
  id: string;
  username: string;
  normalizedUsername: string;
  displayName: string;
  passwordHash: string;
  salt: string;
  createdAt: number;
  lastLoginAt: number;
  searchCount: number;
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

const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');

// In-memory caches for low-latency lookups, synchronized with filesystem
let usersMap: Map<string, StoredUser> = new Map();
let historyList: SearchHistoryItem[] = [];
let isInitialized = false;

// Generate secure salt
function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

// Hash password with salt
export function hashPasswordWithSalt(password: string, salt: string): string {
  return crypto.createHash('sha256').update(`${password}:${salt}`).digest('hex');
}

// Ensure data directory exists
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Persist users to disk
function saveUsersToDisk() {
  try {
    ensureDataDir();
    const usersArray = Array.from(usersMap.values());
    fs.writeFileSync(USERS_FILE, JSON.stringify(usersArray, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Ms Wave Store] Failed to save users:', err);
  }
}

// Persist history to disk
function saveHistoryToDisk() {
  try {
    ensureDataDir();
    // Cap total history to latest 5000 items to prevent unbounded disk growth
    const capped = historyList.slice(-5000);
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(capped, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Ms Wave Store] Failed to save history:', err);
  }
}

// Initialize database and seed default user
export function initStore() {
  if (isInitialized) return;
  ensureDataDir();

  // Load users
  if (fs.existsSync(USERS_FILE)) {
    try {
      const data = fs.readFileSync(USERS_FILE, 'utf-8');
      const parsed: StoredUser[] = JSON.parse(data);
      usersMap = new Map(parsed.map((u) => [u.normalizedUsername, u]));
    } catch (err) {
      console.warn('[Ms Wave Store] Could not parse users.json, starting fresh:', err);
      usersMap = new Map();
    }
  }

  // Load history
  if (fs.existsSync(HISTORY_FILE)) {
    try {
      const data = fs.readFileSync(HISTORY_FILE, 'utf-8');
      historyList = JSON.parse(data);
    } catch (err) {
      console.warn('[Ms Wave Store] Could not parse history.json, starting fresh:', err);
      historyList = [];
    }
  }

  // Seed default creator accounts "Msaikia" and "Mrinmoy Saikia" if not present
  const defaultUsernames = ['Msaikia', 'Mrinmoy Saikia'];
  for (const defaultName of defaultUsernames) {
    const norm = defaultName.trim().toLowerCase();
    if (!usersMap.has(norm)) {
      const salt = 'ms_wave_master_salt_2026';
      const passwordHash = hashPasswordWithSalt(CONFIG.AUTH_PASSWORD, salt);

      const defaultUser: StoredUser = {
        id: `usr_${norm.replace(/[^a-z0-9]/g, '_')}`,
        username: defaultName,
        normalizedUsername: norm,
        displayName: defaultName === 'Msaikia' ? 'Mrinmoy Saikia (Msaikia)' : defaultName,
        passwordHash,
        salt,
        createdAt: Date.now(),
        lastLoginAt: Date.now(),
        searchCount: 0,
      };
      usersMap.set(norm, defaultUser);
    }
  }
  saveUsersToDisk();

  isInitialized = true;
}

// Initialize on module load
initStore();

/**
 * Find user by normalized username (case-insensitive)
 */
export function findUserByUsername(username: string): StoredUser | null {
  initStore();
  const normalized = username.trim().toLowerCase();
  return usersMap.get(normalized) || null;
}

/**
 * Register a new user account
 */
export function registerUser(
  username: string,
  password: string,
  displayName?: string
): { success: boolean; user?: StoredUser; error?: string } {
  initStore();

  const trimmedUser = username.trim();
  const normalized = trimmedUser.toLowerCase();

  if (trimmedUser.length < 2) {
    return { success: false, error: 'Username must be at least 2 characters long' };
  }

  if (password.length < 3) {
    return { success: false, error: 'Password must be at least 3 characters long' };
  }

  if (usersMap.has(normalized)) {
    return { success: false, error: 'Username is already taken. Please choose another one.' };
  }

  const salt = generateSalt();
  const passwordHash = hashPasswordWithSalt(password, salt);
  const id = `usr_${crypto.randomBytes(6).toString('hex')}`;

  const newUser: StoredUser = {
    id,
    username: trimmedUser,
    normalizedUsername: normalized,
    displayName: displayName?.trim() || trimmedUser,
    passwordHash,
    salt,
    createdAt: Date.now(),
    lastLoginAt: Date.now(),
    searchCount: 0,
  };

  usersMap.set(normalized, newUser);
  saveUsersToDisk();

  return { success: true, user: newUser };
}

/**
 * Authenticate user credentials
 */
export function verifyCredentials(
  username: string,
  password: string
): { valid: boolean; user?: StoredUser } {
  initStore();

  const normalized = username.trim().toLowerCase();
  const user = usersMap.get(normalized);

  if (!user) {
    // Check fallback for default user configured via env
    const defaultNormalized = CONFIG.AUTH_USER.trim().toLowerCase();
    if (normalized === defaultNormalized) {
      const inputHash = hashPassword(password);
      const isDefaultMatch =
        password === CONFIG.AUTH_PASSWORD ||
        inputHash === CONFIG.AUTH_PASSWORD_HASH ||
        inputHash === DEFAULT_PASS_HASH;

      if (isDefaultMatch) {
        // Re-create user if missing
        const salt = generateSalt();
        const fallbackUser: StoredUser = {
          id: 'usr_default_admin',
          username: CONFIG.AUTH_USER,
          normalizedUsername: defaultNormalized,
          displayName: CONFIG.AUTH_USER,
          passwordHash: hashPasswordWithSalt(password, salt),
          salt,
          createdAt: Date.now(),
          lastLoginAt: Date.now(),
          searchCount: 0,
        };
        usersMap.set(defaultNormalized, fallbackUser);
        saveUsersToDisk();
        return { valid: true, user: fallbackUser };
      }
    }
    return { valid: false };
  }

  // Check salted password hash
  const computedHash = hashPasswordWithSalt(password, user.salt);
  if (computedHash === user.passwordHash) {
    user.lastLoginAt = Date.now();
    saveUsersToDisk();
    return { valid: true, user };
  }

  // Backward compatibility check for un-salted default password
  if (user.normalizedUsername === CONFIG.AUTH_USER.trim().toLowerCase()) {
    if (password === CONFIG.AUTH_PASSWORD || hashPassword(password) === DEFAULT_PASS_HASH) {
      user.passwordHash = computedHash;
      user.lastLoginAt = Date.now();
      saveUsersToDisk();
      return { valid: true, user };
    }
  }

  return { valid: false };
}

/**
 * Update user display name
 */
export function updateUserProfile(
  username: string,
  data: { displayName?: string }
): { success: boolean; user?: StoredUser; error?: string } {
  initStore();
  const user = findUserByUsername(username);
  if (!user) {
    return { success: false, error: 'User not found' };
  }

  if (data.displayName && data.displayName.trim()) {
    user.displayName = data.displayName.trim();
  }

  saveUsersToDisk();
  return { success: true, user };
}

/**
 * Change password
 */
export function updateUserPassword(
  username: string,
  currentPass: string,
  newPass: string
): { success: boolean; error?: string } {
  initStore();
  const user = findUserByUsername(username);
  if (!user) {
    return { success: false, error: 'User not found' };
  }

  const currentComputed = hashPasswordWithSalt(currentPass, user.salt);
  if (currentComputed !== user.passwordHash && currentPass !== CONFIG.AUTH_PASSWORD) {
    return { success: false, error: 'Current password is incorrect' };
  }

  if (newPass.length < 3) {
    return { success: false, error: 'New password must be at least 3 characters long' };
  }

  const newSalt = generateSalt();
  user.salt = newSalt;
  user.passwordHash = hashPasswordWithSalt(newPass, newSalt);

  saveUsersToDisk();
  return { success: true };
}

/**
 * Delete account and user history
 */
export function deleteUserAccount(username: string): { success: boolean; error?: string } {
  initStore();
  const normalized = username.trim().toLowerCase();
  if (!usersMap.has(normalized)) {
    return { success: false, error: 'User not found' };
  }

  usersMap.delete(normalized);
  saveUsersToDisk();

  // Remove history for this user
  historyList = historyList.filter((h) => h.username.trim().toLowerCase() !== normalized);
  saveHistoryToDisk();

  return { success: true };
}

/**
 * Increment search counter for a user
 */
export function incrementUserSearchCount(username: string) {
  initStore();
  const user = findUserByUsername(username);
  if (user) {
    user.searchCount = (user.searchCount || 0) + 1;
    saveUsersToDisk();
  }
}

/**
 * Record a search history entry (strictly private to user)
 */
export function recordSearchHistory(
  username: string,
  query: string,
  category: SearchCategory,
  sortBy: 'relevance' | 'date' | 'source',
  resultsCount: number,
  topSources?: string[]
): SearchHistoryItem {
  initStore();
  const normalized = username.trim().toLowerCase();
  const user = findUserByUsername(username);
  const userId = user ? user.id : `usr_${normalized}`;

  const item: SearchHistoryItem = {
    id: `hist_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    userId,
    username: user ? user.username : username,
    query: query.trim(),
    category,
    sortBy,
    timestamp: Date.now(),
    resultsCount,
    topSources,
  };

  historyList.push(item);
  incrementUserSearchCount(username);
  saveHistoryToDisk();

  return item;
}

/**
 * Get private search history for a user
 */
export function getUserSearchHistory(
  username: string,
  options?: {
    category?: string;
    search?: string;
    limit?: number;
  }
): SearchHistoryItem[] {
  initStore();
  const normalized = username.trim().toLowerCase();
  const limit = options?.limit || 100;

  let filtered = historyList.filter(
    (item) => item.username.trim().toLowerCase() === normalized
  );

  if (options?.category && options.category !== 'all') {
    filtered = filtered.filter((item) => item.category === options.category);
  }

  if (options?.search && options.search.trim()) {
    const q = options.search.trim().toLowerCase();
    filtered = filtered.filter((item) => item.query.toLowerCase().includes(q));
  }

  // Return sorted by timestamp descending
  return filtered
    .slice()
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
}

/**
 * Delete a specific history item for a user
 */
export function deleteUserHistoryItem(
  username: string,
  historyId: string
): { success: boolean; error?: string } {
  initStore();
  const normalized = username.trim().toLowerCase();
  const index = historyList.findIndex(
    (h) => h.id === historyId && h.username.trim().toLowerCase() === normalized
  );

  if (index === -1) {
    return { success: false, error: 'History record not found or access denied' };
  }

  historyList.splice(index, 1);
  saveHistoryToDisk();
  return { success: true };
}

/**
 * Clear all search history for a specific user
 */
export function clearUserSearchHistory(username: string): { success: boolean; count: number } {
  initStore();
  const normalized = username.trim().toLowerCase();
  const initialLength = historyList.length;

  historyList = historyList.filter((h) => h.username.trim().toLowerCase() !== normalized);
  const deletedCount = initialLength - historyList.length;

  saveHistoryToDisk();
  return { success: true, count: deletedCount };
}
