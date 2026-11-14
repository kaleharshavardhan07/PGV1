import mongoose from 'mongoose';
import { schemaOptions } from './_helpers.js';

const meterReadingSchema = new mongoose.Schema(
  {
    pg: { type: mongoose.Schema.Types.ObjectId, ref: 'PgAccount', required: true, index: true },
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    month: { type: String, required: true }, // YYYY-MM
    previousReading: { type: Number, required: true, min: 0 },
    currentReading: { type: Number, required: true, min: 0 },
    units: { type: Number, default: 0 },
    ratePerUnit: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, default: 0 },
    occupants: { type: Number, default: 1, min: 1 },
    perTenantAmount: { type: Number, default: 0 },
    photoUrl: { type: String },
    recordedAt: { type: String },
    published: { type: Boolean, default: false },
  },
  schemaOptions
);

meterReadingSchema.index({ room: 1, month: 1 }, { unique: true });

export default mongoose.model('MeterReading', meterReadingSchema);
