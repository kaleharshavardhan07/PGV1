import mongoose from 'mongoose';
import { schemaOptions } from './_helpers.js';

// Per-tenant channel preferences (opt-out flags) for a given PG.
const notificationPrefSchema = new mongoose.Schema(
  {
    pg: { type: mongoose.Schema.Types.ObjectId, ref: 'PgAccount', required: true, index: true },
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    whatsapp: { type: Boolean, default: true },
    sms: { type: Boolean, default: true },
    email: { type: Boolean, default: true },
  },
  schemaOptions
);

notificationPrefSchema.index({ tenant: 1 }, { unique: true });

export default mongoose.model('NotificationPref', notificationPrefSchema);
