// Static plan catalogue (mirrors src/data/plans.ts on the frontend).
// Single source of truth for plan limits and feature gating server-side.
export const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'For small PGs going digital',
    monthlyPrice: 499,
    annualPrice: 4788,
    limits: { rooms: 10, beds: 30, branches: 1 },
    features: [
      'core',
      // starter only has core
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    tagline: 'For medium-sized PGs that want automation',
    monthlyPrice: 999,
    annualPrice: 9588,
    limits: { rooms: 50, beds: 150, branches: 1 },
    features: ['core', 'autoReminders', 'whatsapp', 'financialReports', 'vacantSharing', 'advancedComplaints'],
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'For large PGs and hostel operators',
    monthlyPrice: 1999,
    annualPrice: 19188,
    limits: { rooms: null, beds: null, branches: 10 },
    features: [
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
  },
];

export const FREE_TRIAL_DAYS = 14;
export const ANNUAL_DISCOUNT_PERCENT = 20;

export const getPlan = (id) => PLANS.find((p) => p.id === id) ?? PLANS[1];
