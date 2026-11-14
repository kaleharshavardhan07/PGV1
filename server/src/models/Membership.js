import mongoose from 'mongoose';
import { schemaOptions } from './_helpers.js';
import { MEMBERSHIP_STATUS } from '../constants/index.js';

// Tenant-to-PG membership. Historical memberships are preserved, never hard-deleted.
const membershipSchema = new mongoose.Schema(
  {
    pg: { type: mongoose.Schema.Types.ObjectId, ref: 'PgAccount', required: true, index: true },
    tenantUser: { type: mongoose.Schema.Types.ObjectId, ref: 'TenantUser', required: true },
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', default: null },
    bed: { type: mongoose.Schema.Types.ObjectId, ref: 'Bed', default: null },
    status: { type: String, enum: MEMBERSHIP_STATUS, default: 'Active' },
    joiningDate: { type: String, required: true },
    leavingDate: { type: String },
    monthlyRent: { type: Number, required: true, min: 0 },
    securityDeposit: { type: Number, default: 0 },
    approvedBy: { type: String },
    approvedAt: { type: String },
  },
  schemaOptions
);

export default mongoose.model('Membership', membershipSchema);
