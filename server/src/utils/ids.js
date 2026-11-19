import { randomBytes } from 'node:crypto';

// Short human-friendly ids (matches the frontend's uid() style).
export const uid = (prefix) =>
  `${prefix}-${Date.now().toString(36)}-${randomBytes(2).toString('hex')}`;

export const nowISO = () => new Date().toISOString();

export const todayISO = () => new Date().toISOString().split('T')[0];

export const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
