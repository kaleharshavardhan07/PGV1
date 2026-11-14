import { AuditLog } from '../models/index.js';
import { nowISO } from '../utils/ids.js';

// Append an audit trail entry. Non-blocking (fire and forget).
export const recordAudit = (actor, action, entity, entityId, details = '') => {
  AuditLog.create({ ts: nowISO(), actor, action, entity, entityId, details }).catch(() => {});
};

export const listAuditLogs = ({ entity, entityId, limit = 100, skip = 0 } = {}) => {
  const filter = {};
  if (entity) filter.entity = entity;
  if (entityId) filter.entityId = entityId;
  return AuditLog.find(filter).sort({ ts: -1 }).skip(skip).limit(limit).lean();
};
