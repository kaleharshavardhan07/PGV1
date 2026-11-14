import mongoose from 'mongoose';
import { schemaOptions } from './_helpers.js';
import { NOTIFICATION_CATEGORIES, NOTIFICATION_CHANNELS, DELIVERY_STATUS } from '../constants/index.js';

const notificationLogSchema = new mongoose.Schema(
  {
    pg: { type: mongoose.Schema.Types.ObjectId, ref: 'PgAccount', required: true, index: true },
    notificationId: { type: String },
    dedupeKey: { type: String, index: true },
    category: { type: String, enum: NOTIFICATION_CATEGORIES, required: true },
    title: { type: String, required: true },
    recipient: { type: String, required: true },
    recipientRole: { type: String, enum: ['tenant', 'manager', 'owner'], required: true },
    channel: { type: String, enum: NOTIFICATION_CHANNELS, required: true },
    status: { type: String, enum: DELIVERY_STATUS, required: true },
    attempts: { type: Number, default: 1 },
    createdAt: { type: String },
    note: { type: String },
  },
  schemaOptions
);

export default mongoose.model('NotificationLog', notificationLogSchema);
