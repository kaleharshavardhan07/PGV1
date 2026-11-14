import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    actor: { type: String, required: true },
    action: { type: String, required: true },
    entity: { type: String, required: true },
    entityId: { type: String, required: true },
    details: { type: String, default: '' },
    ts: { type: String, default: () => new Date().toISOString() },
  },
  { timestamps: true, toJSON: { virtuals: true, versionKey: false, transform: (_d, r) => { if (r._id) { r.id = r._id.toString(); delete r._id; } return r; } } }
);

auditLogSchema.index({ entity: 1, entityId: 1 });

export default mongoose.model('AuditLog', auditLogSchema);

