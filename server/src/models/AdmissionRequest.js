import mongoose from 'mongoose';
import { schemaOptions } from './_helpers.js';
import { ADMISSION_STATUS } from '../constants/index.js';

const admissionRequestSchema = new mongoose.Schema(
  {
    pg: { type: mongoose.Schema.Types.ObjectId, ref: 'PgAccount', required: true, index: true },
    requestId: { type: String, required: true, unique: true }, // AR-2026-0001
    tenantUser: { type: mongoose.Schema.Types.ObjectId, ref: 'TenantUser', required: true },

    fullName: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, trim: true },
    email: { type: String, default: '', trim: true },
    gender: { type: String, enum: ['Male', 'Female', 'Other'] },
    emergencyContact: { type: String, default: '', trim: true },

    preferredJoiningDate: { type: String, required: true }, // YYYY-MM-DD
    preferredRoomType: { type: String, default: '' },
    preferredBed: { type: mongoose.Schema.Types.ObjectId, ref: 'Bed', default: null },
    occupants: { type: Number, default: 1, min: 1 },
    additionalMessage: { type: String, default: '' },
    documents: {
      idProof: { type: String },
      photograph: { type: String },
      additional: { type: String },
    },

    status: { type: String, enum: ADMISSION_STATUS, default: 'Pending' },
    rejectionReason: { type: String },
    reviewedBy: { type: String },
    reviewedAt: { type: String },
  },
  schemaOptions
);

export default mongoose.model('AdmissionRequest', admissionRequestSchema);
