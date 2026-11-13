import type { Plan, PlanId } from '../types';

// SAMPLE PRICING – final commercial pricing is not finalized.
// These values are intentionally easy to edit in one place.
export const PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'For small PGs going digital',
    monthlyPrice: 499,
    annualPrice: 4788, // 20% off ₹5,988/yr
    limits: { rooms: 10, beds: 30, branches: 1 },
    features: [
      'Manage rooms and beds',
      'Tenant registration',
      'Rent tracking',
      'Electricity bill management',
      'Basic complaint management',
      'Basic notifications',
      'Single PG location',
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    tagline: 'For medium-sized PGs that want automation',
    monthlyPrice: 999,
    annualPrice: 9588, // 20% off ₹11,988/yr
    limits: { rooms: 50, beds: 150, branches: 1 },
    features: [
      'Everything in Starter',
      'Automated rent reminders',
      'Electricity bill overdue notifications',
      'WhatsApp notification integration',
      'Food menu management',
      'Financial reports',
      'Advanced complaint management',
      'Vacant bed sharing links',
      'More rooms and beds',
    ],
    recommended: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'For large PGs and hostel operators',
    monthlyPrice: 1999,
    annualPrice: 19188, // 20% off ₹23,988/yr
    limits: { rooms: null, beds: null, branches: 10 },
    features: [
      'Everything in Growth',
      'Multiple PG branches',
      'Centralized dashboard',
      'Advanced analytics',
      'Automated notification workflows',
      'Detailed financial reports',
      'Priority support',
      'Advanced staff and access management',
    ],
  },
];

// Configurable commercial parameters (sample values)
export const ANNUAL_DISCOUNT_PERCENT = 20;
export const FREE_TRIAL_DAYS = 14;

export const getPlan = (id: PlanId): Plan => PLANS.find((p) => p.id === id) ?? PLANS[1];
