import mongoose from 'mongoose';
import { schemaOptions } from './_helpers.js';
import { COMPLAINT_CATEGORIES, COMPLAINT_STATUS } from '../constants/index.js';

const complaintSchema = new mongoose.Schema(
  {
    pg: { type: mongoose.Schema.Types.ObjectId, ref: 'PgAccount', required: true, index: true },
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    category: { type: String, enum: COMPLAINT_CATEGORIES, required: true },
    description: { type: String, required: true, trim: true },
    imageUrl: { type: String },
    roomNumber: { type: String, default: '' },
    status: { type: String, enum: COMPLAINT_STATUS, default: 'Submitted' },
    submittedAt: { type: String },
    resolvedAt: { type: String },
    remarks: { type: String, default: '' },
  },
  schemaOptions
);

export default mongoose.model('Complaint', complaintSchema);
