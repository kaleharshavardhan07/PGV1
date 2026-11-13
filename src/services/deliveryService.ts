// Simulated notification delivery service.
// In-app delivery is real (stored notifications). WhatsApp, SMS and Email are
// simulated locally and clearly labelled, with a clean seam for real providers
// (WhatsApp Business API / SMS gateway / email service) to be plugged in later.

import type {
  Notification,
  NotificationCategory,
  NotificationChannel,
  NotificationLogEntry,
  NotificationPrefs,
  PGSettings,
  PlanId,
  UserRole,
} from '../types';
import { planAllowsChannelForPlan } from './subscriptionService';

export interface NotificationDraft {
  dedupeKey: string;
  category: NotificationCategory;
  userRole: UserRole;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  link?: string;
  createdAt: string;
  audience: 'tenant' | 'staff';
  tenantId?: string;
}

export interface MaterializeCtx {
  existingKeys: Set<string>;
  prefs: NotificationPrefs[];
  settings: PGSettings;
  planId: PlanId;
  retryAttempts: number;
}

const hash = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

const channelsForDraft = (draft: NotificationDraft, ctx: MaterializeCtx): NotificationChannel[] => {
  const channels: NotificationChannel[] = ['In-App'];
  const external: Array<'WhatsApp' | 'SMS' | 'Email'> = ['WhatsApp', 'SMS', 'Email'];
  for (const ch of external) {
    if (!ctx.settings.channels[ch.toLowerCase() as 'whatsapp' | 'sms' | 'email']) continue;
    if (!planAllowsChannelForPlan(ctx.planId, ch)) continue; // plan policy (e.g. WhatsApp needs Growth+)
    if (draft.audience === 'tenant') {
      const prefs = ctx.prefs.find((p) => p.tenantId === draft.tenantId);
      if (prefs && !prefs[ch.toLowerCase() as 'whatsapp' | 'sms' | 'email']) continue; // tenant opt-out
    }
    channels.push(ch);
  }
  return channels;
};

/** Deterministic simulated delivery outcome for one channel. */
export const simulateDelivery = (
  key: string,
  channel: NotificationChannel,
  retryAttempts: number
): { status: NotificationLogEntry['status']; attempts: number; note?: string } => {
  if (channel === 'In-App') return { status: 'Delivered', attempts: 1 };
  // ~85% simulated success rate, deterministic per key+channel
  const failed = hash(`${key}::${channel}`) % 100 >= 85;
  if (!failed) {
    return {
      status: 'Simulated',
      attempts: 1,
      note: `${channel} delivery simulated – no real provider connected`,
    };
  }
  if (retryAttempts > 0) {
    return {
      status: 'Retried',
      attempts: 2,
      note: `${channel} delivery failed once, retry succeeded (retry policy: ${retryAttempts} attempts)`,
    };
  }
  return {
    status: 'Failed',
    attempts: 1,
    note: `${channel} delivery failed (retry attempts configured: 0)`,
  };
};

export interface Materialized {
  notification: Notification | null;
  logs: NotificationLogEntry[];
}

/** Turn a draft into an in-app notification (if not a duplicate) plus delivery log entries. */
export const materializeDraft = (draft: NotificationDraft, ctx: MaterializeCtx): Materialized => {
  if (ctx.existingKeys.has(draft.dedupeKey)) return { notification: null, logs: [] };

  const channels = channelsForDraft(draft, ctx);
  const logs: NotificationLogEntry[] = channels.map((channel, i) => {
    const result = simulateDelivery(`${draft.dedupeKey}#${i}`, channel, ctx.retryAttempts);
    return {
      id: `nl-${draft.dedupeKey}-${channel}`.toLowerCase().replace(/[^a-z0-9-]/g, ''),
      notificationId: draft.dedupeKey,
      dedupeKey: draft.dedupeKey,
      category: draft.category,
      title: draft.title,
      recipient:
        draft.audience === 'tenant'
          ? draft.userId
          : draft.userRole === 'manager'
          ? 'PG Manager'
          : 'PG Owner',
      recipientRole: draft.userRole,
      channel,
      status: result.status,
      attempts: result.attempts,
      createdAt: draft.createdAt,
      note: result.note,
    };
  });

  const notification: Notification = {
    id: `n-${hash(draft.dedupeKey).toString(36)}`,
    userId: draft.userId,
    userRole: draft.userRole,
    title: draft.title,
    message: draft.message,
    type: draft.type,
    read: false,
    createdAt: draft.createdAt,
    link: draft.link,
    category: draft.category,
    dedupeKey: draft.dedupeKey,
  };

  return { notification, logs };
};
