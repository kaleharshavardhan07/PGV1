import mongoose from 'mongoose';
import { schemaOptions } from './_helpers.js';
import { SUBSCRIPTION_STATUS, BILLING_CYCLES } from '../constants/index.js';

const settingsSchema = new mongoose.Schema(
  {
    name: { type: String, default: 'My PG' },
    address: { type: String, default: '' },
    city: { type: String, default: '' },
    contactEmail: { type: String, default: '' },
    contactPhone: { type: String, default: '' },
    electricityRate: { type: Number, default: 8.5 },
    foodCharge: { type: Number, default: 1500 },
    ownerName: { type: String, default: '' },
    timezone: { type: String, default: 'Asia/Kolkata' },
    channels: {
      whatsapp: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
      email: { type: Boolean, default: true },
    },
  },
  { _id: false }
);

const reminderScheduleSchema = new mongoose.Schema(
  {
    rentDaysBefore: { type: [Number], default: [5, 1] },
    rentOverdueDays: { type: [Number], default: [1, 3, 7] },
    electricityDueDaysBefore: { type: [Number], default: [5, 1] },
    electricityOverdueDays: { type: [Number], default: [1, 3, 7] },
    electricityDueInDays: { type: Number, default: 5 },
    complaintUnresolvedHours: { type: Number, default: 48 },
    gracePeriodDays: { type: Number, default: 7 },
    retryAttempts: { type: Number, default: 2 },
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    number: { type: String, required: true },
    date: { type: String, required: true },
    planId: { type: String, enum: ['starter', 'growth', 'pro'], required: true },
    cycle: { type: String, enum: BILLING_CYCLES, required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ['Paid', 'Pending', 'Failed'], default: 'Pending' },
    method: { type: String, enum: ['UPI', 'Card', 'Net Banking'], default: 'UPI' },
    paidAt: { type: String },
    reference: { type: String },
  },
  { _id: false }
);

const subscriptionSchema = new mongoose.Schema(
  {
    planId: { type: String, enum: ['starter', 'growth', 'pro'], default: 'growth' },
    status: { type: String, enum: SUBSCRIPTION_STATUS, default: 'Trial' },
    cycle: { type: String, enum: BILLING_CYCLES, default: 'monthly' },
    startedAt: { type: String },
    currentPeriodEnd: { type: String },
    trialEndsAt: { type: String },
    amountPaid: { type: Number, default: 0 },
    autoRenew: { type: Boolean, default: false },
    pendingPlanId: { type: String },
    pendingCycle: { type: String },
    failedPaymentAt: { type: String },
    invoices: { type: [invoiceSchema], default: [] },
  },
  { _id: false }
);

// One workspace per PG: holds the singleton per-PG configuration documents
// (settings, reminder schedule, SaaS subscription). Bulk domain data lives in
// dedicated collections keyed by the same pg reference.
const workspaceSchema = new mongoose.Schema(
  {
    pg: { type: mongoose.Schema.Types.ObjectId, ref: 'PgAccount', required: true, unique: true, index: true },
    settings: { type: settingsSchema, default: () => ({}) },
    reminderSchedule: { type: reminderScheduleSchema, default: () => ({}) },
    subscription: { type: subscriptionSchema, default: () => ({}) },
  },
  schemaOptions
);

export default mongoose.model('Workspace', workspaceSchema);
