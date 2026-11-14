import mongoose from 'mongoose';
import { schemaOptions } from './_helpers.js';
import { BED_STATUS } from '../constants/index.js';

const bedSchema = new mongoose.Schema(
  {
    pg: { type: mongoose.Schema.Types.ObjectId, ref: 'PgAccount', required: true, index: true },
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
    bedNumber: { type: Number, required: true, min: 1 },
    status: { type: String, enum: BED_STATUS, default: 'vacant' },
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', default: null },
    vacantSince: { type: String },
  },
  schemaOptions
);

bedSchema.index({ room: 1, bedNumber: 1 }, { unique: true });

export default mongoose.model('Bed', bedSchema);
