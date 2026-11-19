import bcrypt from 'bcryptjs';
import { randomInt } from 'node:crypto';

export const hashPassword = (pw) => bcrypt.hash(pw, 10);
export const verifyPassword = (pw, hash) => (hash ? bcrypt.compare(pw, hash) : Promise.resolve(false));

// Readable one-time password for accounts created by an owner. Avoids look-alike
// characters (0/O, 1/l/I) because it is usually read out or sent by message.
const ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const generatePassword = (length = 10) =>
  Array.from({ length }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
