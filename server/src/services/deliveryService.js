// Simulated notification delivery + draft materialization.
// In-app notifications are real; WhatsApp/SMS/Email are simulated with a
// deterministic outcome and clearly labelled notes. This mirrors the frontend
// deliveryService.ts and leaves a clean seam for real providers.

import { planAllowsChannelForPlan } from './subscriptionService.js';

const hash = (s) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

const channelsForDraft = (draft, ctx) => {
  const channels = ['In-App'];
  const external = ['WhatsApp', 'SMS', 'Email'];
  for (const ch of external) {
    const key = ch.toLowerCase();
    if (!ctx.settings?.channels?.[key]) continue;
    if (!planAllowsChannelForPlan(ctx.planId, ch)) continue; // plan policy
    if (draft.audience === 'tenant') {
      const prefs = ctx.prefs.find((p) => String(p.tenant) === String(draft.tenantId));
      if (prefs && !prefs[key]) continue; // tenant opt-out
    }
    channels.push(ch);
  }
  return channels;
};

export const simulateDelivery = (key, channel, retryAttempts) => {
  if (channel === 'In-App') return { status: 'Delivered', attempts: 1 };
  const failed = hash(`${key}::${channel}`) % 100 >= 85;
  if (!failed) {
    return { status: 'Simulated', attempts: 1, note: `${channel} delivery simulated – no real provider connected` };
  }
  if (retryAttempts > 0) {
    return {
      status: 'Retried',
      attempts: 2,
      note: `${channel} delivery failed once, retry succeeded (retry policy: ${retryAttempts} attempts)`,
    };
  }
  return { status: 'Failed', attempts: 1, note: `${channel} delivery failed (retry attempts configured: 0)` };
};

export const materializeDraft = (draft, ctx) => {
  if (ctx.existingKeys.has(draft.dedupeKey)) return { notification: null, logs: [] };

  const channels = channelsForDraft(draft, ctx);
  const logs = channels.map((channel, i) => {
    const result = simulateDelivery(`${draft.dedupeKey}#${i}`, channel, ctx.retryAttempts);
    return {
      dedupeKey: draft.dedupeKey,
      notificationId: draft.dedupeKey,
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

  const notification = {
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
