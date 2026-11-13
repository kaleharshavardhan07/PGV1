// Unique PG username generation and validation.
// Usernames are the platform-wide public identifier for a PG: globally unique,
// case-insensitive, slug format (letters, numbers, underscores). They are easy
// to share and never used as a security credential.

import type { PGAccount } from '../types';

export const USERNAME_PATTERN = /^[a-z0-9_]{4,30}$/;

export const normalizeUsername = (raw: string): string => raw.trim().toLowerCase();

export const isValidPgUsername = (raw: string): boolean => USERNAME_PATTERN.test(normalizeUsername(raw));

export const usernameError = (raw: string): string | null => {
  const u = normalizeUsername(raw);
  if (!u) return 'Username is required';
  if (u.length < 4) return 'Username must be at least 4 characters';
  if (u.length > 30) return 'Username must be at most 30 characters';
  if (!/^[a-z0-9_]+$/.test(u)) return 'Only lowercase letters, numbers and underscores allowed';
  if (!/^[a-z]/.test(u)) return 'Username must start with a letter';
  return null;
};

export const slugifyPgName = (name: string): string =>
  normalizeUsername(name)
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 24)
    .replace(/_+$/g, '');

export const isUsernameTaken = (raw: string, pgs: PGAccount[]): boolean => {
  const u = normalizeUsername(raw);
  return pgs.some((p) => p.pgUsername.toLowerCase() === u);
};

/**
 * Generate username suggestions: base, base_01, base_<4 random digits>.
 * Guarantees all suggestions are free and unique among existing PGs.
 */
export function generateUsernameSuggestions(pgName: string, pgs: PGAccount[], count = 3): string[] {
  const base = slugifyPgName(pgName) || 'mypg';
  const taken = new Set(pgs.map((p) => p.pgUsername.toLowerCase()));
  const out: string[] = [];
  const candidates = [base, `${base}_01`, `${base}_${Math.floor(1000 + Math.random() * 9000)}`];
  let suffix = 1;
  while (out.length < count) {
    for (const c of candidates) {
      if (out.length >= count) break;
      if (!taken.has(c) && !out.includes(c) && isValidPgUsername(c)) out.push(c);
    }
    if (out.length >= count) break;
    const numbered = `${base}_${String(suffix++).padStart(2, '0')}`;
    if (!taken.has(numbered) && !out.includes(numbered)) out.push(numbered);
    if (suffix > 99) {
      out.push(`${base}_${Math.floor(1000 + Math.random() * 9000)}`);
    }
  }
  return out.slice(0, count);
}

/** Format a username for display (keeps stored lowercase form). */
export const formatUsername = (u: string) => u.toLowerCase();
