import { recordAudit as insertAudit } from '../repositories/notifications.js';
import logger from '../utils/logger.js';

// Append an audit trail entry. Fire-and-forget: an audit failure must never fail the request.
export const recordAudit = (pgId, actor, action, entity, entityId, details = '') => {
  insertAudit(pgId, actor, action, entity, entityId, details).catch((err) => logger.error(`audit failed: ${err.message}`));
};
