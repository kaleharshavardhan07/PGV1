// Username generation/validation (port of the frontend pgPlatform.ts).
// Usernames are the public, globally-unique, case-insensitive identifier for a PG.
import { PgAccount } from '../models/index.js';

export const USERNAME_PATTERN = /^[a-z0-9_]{4,30}$/;

export const normalizeUsername = (raw) => raw.trim().toLowerCase();

export const isValidPgUsername = (raw) => USERNAME_PATTERN.test(normalizeUsername(raw));

export const usernameError = (raw) => {
  const u = normalizeUsername(raw);
  if (!u) return 'Username is required';
  if (u.length < 4) return 'Username must be at least 4 characters';
  if (u.length > 30) return 'Username must be at most 30 characters';
  if (!/^[a-z0-9_]+$/.test(u)) return 'Only lowercase letters, numbers and underscores allowed';
  if (!/^[a-z]/.test(u)) return 'Username must start with a letter';
  return null;
};

export const slugifyPgName = (name) =>
  normalizeUsername(name)
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 24)
    .replace(/_+$/g, '');

export const isUsernameTaken = async (raw) => {
  const u = normalizeUsername(raw);
  const found = await PgAccount.findOne({ pgUsername: u }).lean();
  return Boolean(found);
};

export const generateUsernameSuggestions = async (pgName, existing = [], count = 3) => {
  const base = slugifyPgName(pgName) || 'mypg';
  const taken = new Set([...existing.map((u) => normalizeUsername(u)), ...(await PgAccount.distinct('pgUsername'))]);
  const out = [];
  let suffix = 1;
  const candidates = [base, `${base}_01`, `${base}_${Math.floor(1000 + Math.random() * 9000)}`];
  while (out.length < count) {
    for (const c of candidates) {
      if (out.length >= count) break;
      if (!taken.has(c) && !out.includes(c) && isValidPgUsername(c)) out.push(c);
    }
    if (out.length >= count) break;
    const numbered = `${base}_${String(suffix++).padStart(2, '0')}`;
    if (!taken.has(numbered) && !out.includes(numbered)) out.push(numbered);
    if (suffix > 99) out.push(`${base}_${Math.floor(1000 + Math.random() * 9000)}`);
  }
  return out.slice(0, count);
};
