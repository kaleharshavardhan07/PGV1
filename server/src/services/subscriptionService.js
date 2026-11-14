// Subscription policy helpers: feature matrix, plan limits, invoice generation.
// Port of the frontend subscriptionService.ts. SaaS billing is kept fully
// separate from tenant payment ledgers.

import { getPlan } from '../constants/plans.js';

const PLAN_FEATURES = {
  starter: ['core'],
  growth: ['core', 'autoReminders', 'whatsapp', 'financialReports', 'vacantSharing', 'advancedComplaints'],
  pro: [
    'core',
    'autoReminders',
    'whatsapp',
    'financialReports',
    'vacantSharing',
    'advancedComplaints',
    'multiBranch',
    'advancedAnalytics',
    'autoWorkflows',
    'prioritySupport',
  ],
};

export const FULL_ACCESS_STATUSES = ['Trial', 'Active', 'Cancelled'];

export const subscriptionAllows = (sub, feature) => {
  if (feature === 'core') return true;
  if (!FULL_ACCESS_STATUSES.includes(sub.status)) return false;
  return (PLAN_FEATURES[sub.planId] || []).includes(feature);
};

export const planAllowsChannel = (sub, channel) => {
  if (!FULL_ACCESS_STATUSES.includes(sub.status)) return false;
  if (channel === 'WhatsApp') return subscriptionAllows(sub, 'whatsapp');
  return true; // SMS and Email available on all plans
};

export const planAllowsChannelForPlan = (planId, channel) => {
  if (channel === 'WhatsApp') return (PLAN_FEATURES[planId] || []).includes('whatsapp');
  return true;
};

export const usageSummary = (sub, usage) => {
  const plan = getPlan(sub.planId);
  return [
    { label: 'Rooms', used: usage.rooms, limit: plan.limits.rooms },
    { label: 'Beds', used: usage.beds, limit: plan.limits.beds },
    { label: 'PG Branches', used: usage.branches, limit: plan.limits.branches },
  ];
};

export const isOverLimit = (used, limit) => limit !== null && used > limit;

export const buildInvoice = ({ number, date, planId, cycle, amount, status = 'Paid', method = 'UPI', paidAt, reference }) => ({
  number,
  date,
  planId,
  cycle,
  amount,
  status,
  method,
  paidAt,
  reference,
});
