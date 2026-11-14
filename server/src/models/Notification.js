import mongoose from 'mongoose';
import { schemaOptions } from './_helpers.js';
import { NOTIFICATION_CATEGORIES } from '../constants/index.js';

const notificationSchema = new mongoose.Schema(
  {
    pg: { type: mongoose.Schema.Types.ObjectId, ref: 'PgAccount', required: true, index: true },
    // userId semantics mirror the frontend: tenant id, 'manager', 'owner' or 'all'.
    userId: { type: String, required: true },
    userRole: { type: String, enum: ['tenant', 'manager', 'owner'], required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ['info', 'success', 'warning', 'error'], default: 'info' },
    read: { type: Boolean, default: false },
    createdAt: { type: String },
    link: { type: String },
    category: { type: String, enum: NOTIFICATION_CATEGORIES },
    dedupeKey: { type: String, index: true },
  },
  schemaOptions
);

export default mongoose.model('Notification', notificationSchema);
