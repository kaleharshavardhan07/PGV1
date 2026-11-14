import mongoose from 'mongoose';
import { schemaOptions } from './_helpers.js';
import { PG_TYPES } from '../constants/index.js';

const pgAccountSchema = new mongoose.Schema(
  {
    pgName: { type: String, required: true, trim: true },
    // Globally unique, case-insensitive public identifier used for discovery.
    pgUsername: { type: String, unique: true, sparse: true, lowercase: true, trim: true, index: true },
    description: { type: String, default: '', maxlength: 500 },
    address: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, default: '', trim: true },
    pinCode: { type: String, default: '', trim: true },
    pgType: { type: String, enum: PG_TYPES, default: 'Other' },

    ownerName: { type: String, required: true, trim: true },
    ownerEmail: { type: String, required: true, unique: true, lowercase: true, trim: true },
    ownerMobile: { type: String, required: true, unique: true, trim: true },

    passwordHash: { type: String, default: null },
    isActive: { type: Boolean, default: false },
    isDiscoverable: { type: Boolean, default: true },
    showAvailableBeds: { type: Boolean, default: true },
    subscriptionPlanId: { type: String, enum: ['starter', 'growth', 'pro'], default: 'growth' },
  },
  schemaOptions
);

export default mongoose.model('PgAccount', pgAccountSchema);
