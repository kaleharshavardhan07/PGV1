import mongoose from 'mongoose';
import { schemaOptions } from './_helpers.js';
import { REGISTRATION_STATUS, PG_TYPES, BILLING_CYCLES } from '../constants/index.js';

// Resumable owner onboarding state. Persisted so a browser refresh mid-flow
// does not lose the registration.
const pendingRegistrationSchema = new mongoose.Schema(
  {
    owner: {
      fullName: { type: String, required: true, trim: true },
      mobile: { type: String, required: true, trim: true },
      email: { type: String, required: true, lowercase: true, trim: true },
    },
    pg: {
      pgName: { type: String, required: true, trim: true },
      address: { type: String, required: true, trim: true },
      city: { type: String, required: true, trim: true },
      state: { type: String, default: '' },
      pinCode: { type: String, default: '' },
      rooms: { type: Number, default: 1, min: 1 },
      beds: { type: Number, default: 1, min: 1 },
      description: { type: String, default: '' },
      pgType: { type: String, enum: PG_TYPES, default: 'Other' },
    },
    planId: { type: String, enum: ['starter', 'growth', 'pro'], default: 'growth' },
    cycle: { type: String, enum: BILLING_CYCLES, default: 'monthly' },
    amount: { type: Number, default: 0 },
    status: { type: String, enum: REGISTRATION_STATUS, default: 'Awaiting Payment' },
    pgId: { type: mongoose.Schema.Types.ObjectId, ref: 'PgAccount', default: null },
    suggestedUsernames: { type: [String], default: [] },
    pgUsername: { type: String },
    orderId: { type: String },
    processedCallbacks: { type: [String], default: [] },
  },
  schemaOptions
);

export default mongoose.model('PendingRegistration', pendingRegistrationSchema);
