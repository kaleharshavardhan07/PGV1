// Owner authentication service.
// Passwords are hashed with PBKDF2-SHA256 (Web Crypto) — a real key-derivation
// function used as the demo-grade stand-in for Argon2id/bcrypt on a backend.
// Plain-text passwords are NEVER stored. On a real backend, swap these
// functions for Argon2id/bcrypt and keep the same interface.

const ITERATIONS = 100_000;
const KEY_LENGTH_BITS = 256;

const bytesToHex = (buf: ArrayBuffer | Uint8Array) =>
  Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

const hexToBytes = (hex: string) => {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
};

export const randomSaltHex = (bytes = 16) => {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return bytesToHex(arr);
};

export async function hashPassword(password: string, saltHex?: string): Promise<string> {
  const salt = saltHex ?? randomSaltHex();
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: hexToBytes(salt), iterations: ITERATIONS },
    key,
    KEY_LENGTH_BITS
  );
  return `pbkdf2$${ITERATIONS}$${salt}$${bytesToHex(bits)}`;
}

export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  if (!stored) return false;
  const parts = stored.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
  const [, iterations, salt, expectedHash] = parts;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: hexToBytes(salt), iterations: Number(iterations) },
    key,
    KEY_LENGTH_BITS
  );
  const actual = bytesToHex(bits);
  // constant-time-ish comparison
  if (actual.length !== expectedHash.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual.charCodeAt(i) ^ expectedHash.charCodeAt(i);
  return diff === 0;
}

export interface PasswordPolicy {
  ok: boolean;
  errors: string[];
}

export function validatePassword(password: string): PasswordPolicy {
  const errors: string[] = [];
  if (password.length < 8) errors.push('At least 8 characters');
  if (!/[a-z]/.test(password)) errors.push('One lowercase letter');
  if (!/[A-Z]/.test(password)) errors.push('One uppercase letter');
  if (!/\d/.test(password)) errors.push('One number');
  return { ok: errors.length === 0, errors };
}

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  color: string;
}

export function passwordStrength(password: string): PasswordStrength {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  const clamped = Math.min(4, score) as 0 | 1 | 2 | 3 | 4;
  const labels = ['Very weak', 'Weak', 'Fair', 'Strong', 'Very strong'];
  const colors = ['bg-error', 'bg-error', 'bg-warning', 'bg-success', 'bg-success'];
  return { score: clamped, label: labels[clamped], color: colors[clamped] };
}

/** Demo password reset code. In production this is an emailed/SMS OTP via the notification service. */
export const DEMO_RESET_CODE = '1234';
