import { Workspace } from '../models/index.js';
import { FREE_TRIAL_DAYS } from '../constants/plans.js';

const isoDate = (d) => (d instanceof Date ? d.toISOString().split('T')[0] : d);

// Returns (creating if necessary) the workspace singleton for a PG.
export const ensureWorkspace = async (pgId, { pgName = '', ownerName = '' } = {}) => {
  let ws = await Workspace.findOne({ pg: pgId });
  if (ws) return ws;

  const start = new Date();
  const trialEnd = new Date(start);
  trialEnd.setDate(trialEnd.getDate() + FREE_TRIAL_DAYS);
  const periodEnd = new Date(trialEnd);
  periodEnd.setDate(periodEnd.getDate() + 30);

  ws = await Workspace.create({
    pg: pgId,
    settings: {
      name: pgName || 'My PG',
      ownerName: ownerName || '',
      electricityRate: 8.5,
      foodCharge: 1500,
      timezone: 'Asia/Kolkata',
      channels: { whatsapp: true, sms: true, email: true },
    },
    reminderSchedule: {
      rentDaysBefore: [5, 1],
      rentOverdueDays: [1, 3, 7],
      electricityDueDaysBefore: [5, 1],
      electricityOverdueDays: [1, 3, 7],
      electricityDueInDays: 5,
      complaintUnresolvedHours: 48,
      gracePeriodDays: 7,
      retryAttempts: 2,
    },
    subscription: {
      planId: 'growth',
      status: 'Trial',
      cycle: 'monthly',
      startedAt: start.toISOString().split('T')[0],
      currentPeriodEnd: periodEnd.toISOString().split('T')[0],
      trialEndsAt: trialEnd.toISOString().split('T')[0],
      amountPaid: 0,
      autoRenew: false,
      invoices: [],
    },
  });
  return ws;
};

export const getWorkspace = (pgId) => Workspace.findOne({ pg: pgId });
export const updateWorkspace = (pgId, update) =>
  Workspace.findOneAndUpdate({ pg: pgId }, update, { new: true, runValidators: true });

export { isoDate };
