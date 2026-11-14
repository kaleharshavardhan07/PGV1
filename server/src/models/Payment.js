import mongoose from 'mongoose';
import { schemaOptions } from './_helpers.js';
import { PAYMENT_METHODS, PAYMENT_STATUS, PAYMENT_TYPES } from '../constants/index.js';

const paymentSchema = new mongoose.Schema(
  {
    pg: { type: mongoose.Schema.Types.ObjectId, ref: 'PgAccount', required: true, index: true },
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    type: { type: String, enum: PAYMENT_TYPES, required: true },
    month: { type: String, required: true }, // YYYY-MM
    amount: { type: Number, required: true, min: 0 },
    method: { type: String, enum: PAYMENT_METHODS, default: 'UPI' },
    status: { type: String, enum: PAYMENT_STATUS, default: 'Pending' },
    paidAt: { type: String },
    dueDate: { type: String, required: true },
    reference: { type: String },
  },
  schemaOptions
);

export default mongoose.model('Payment', paymentSchema);
