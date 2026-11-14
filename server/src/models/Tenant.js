import mongoose from 'mongoose';
import { schemaOptions } from './_helpers.js';
import { TENANT_STATUS, POLICE_VERIFICATION } from '../constants/index.js';

// Per-PG tenant record. A platform identity (TenantUser) may link here via `user`.
const tenantSchema = new mongoose.Schema(
  {
    pg: { type: mongoose.Schema.Types.ObjectId, ref: 'PgAccount', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'TenantUser', default: null },

    fullName: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, trim: true },
    email: { type: String, default: '', trim: true },
    emergencyContact: { type: String, default: '', trim: true },

    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', default: null },
    bedNumber: { type: Number, default: null },
    monthlyRent: { type: Number, required: true, min: 0 },
    securityDeposit: { type: Number, default: 0, min: 0 },
    joiningDate: { type: String, required: true }, // YYYY-MM-DD

    idProofUrl: { type: String },
    photographUrl: { type: String },
    agreementUrl: { type: String },
    policeVerification: { type: String, enum: POLICE_VERIFICATION, default: 'Pending' },
    status: { type: String, enum: TENANT_STATUS, default: 'Active' },
    noticeDate: { type: String },
  },
  schemaOptions
);

export default mongoose.model('Tenant', tenantSchema);
