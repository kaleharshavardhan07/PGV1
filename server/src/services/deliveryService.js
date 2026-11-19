// Simulated notification delivery. In-app notifications are real; WhatsApp/SMS/Email
// are simulated with a deterministic outcome and clearly labelled notes, leaving a
// clean seam for real providers.

const hash = (s) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

/** Channels a draft goes out on: always in-app, plus enabled external channels minus tenant opt-outs. */
export const channelsForDraft = (draft, { channels = {}, prefs }) => {
  const out = ['In-App'];
  for (const ch of ['WhatsApp', 'SMS', 'Email']) {
    const key = ch.toLowerCase();
    if (!channels[key]) continue;
    if (draft.audience === 'tenant' && prefs && prefs[key] === false) continue;
    out.push(ch);
  }
  return out;
};

export const simulateDelivery = (key, channel, retryAttempts) => {
  if (channel === 'In-App') return { status: 'Delivered', attempts: 1 };
  const failed = hash(`${key}::${channel}`) % 100 >= 85;
  if (!failed) return { status: 'Simulated', attempts: 1, note: `${channel} delivery simulated – no real provider connected` };
  if (retryAttempts > 0) {
    return { status: 'Retried', attempts: 2, note: `${channel} delivery failed once, retry succeeded (retry policy: ${retryAttempts} attempts)` };
  }
  return { status: 'Failed', attempts: 1, note: `${channel} delivery failed (retry attempts configured: 0)` };
};

/** Build the per-channel delivery log rows for a draft. */
export const buildLogs = (draft, ctx) =>
  channelsForDraft(draft, ctx).map((channel, i) => {
    const result = simulateDelivery(`${draft.dedupeKey}#${i}`, channel, ctx.retryAttempts);
    return {
      dedupeKey: draft.dedupeKey,
      category: draft.category,
      title: draft.title,
      recipient: draft.audience === 'tenant' ? draft.recipientName ?? draft.userId : draft.userRole === 'manager' ? 'PG Manager' : 'PG Owner',
      recipientRole: draft.userRole,
      channel,
      ...result,
    };
  });
