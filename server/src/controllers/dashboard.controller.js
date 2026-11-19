import asyncHandler from '../utils/asyncHandler.js';
import * as ops from '../repositories/operations.js';
import * as tenants from '../repositories/tenants.js';
import { getSettings } from '../repositories/accounts.js';

export const summary = asyncHandler(async (req, res) => {
  const [counts, { settings }] = await Promise.all([ops.dashboardCounts(req.pgId), getSettings(req.pgId)]);
  const occupancyPercent = counts.totalBeds ? Math.round((counts.occupiedBeds / counts.totalBeds) * 100) : 0;
  res.json({
    success: true,
    summary: {
      pgName: settings.name,
      totalRooms: counts.totalRooms,
      totalBeds: counts.totalBeds,
      occupiedBeds: counts.occupiedBeds,
      vacantBeds: counts.totalBeds - counts.occupiedBeds,
      occupancyPercent,
      activeTenants: counts.activeTenants,
      noticeTenants: counts.noticeTenants,
      pendingVerification: counts.pendingVerification,
      openComplaints: counts.openComplaints,
      documents: counts.documents,
    },
  });
});

// Identity + PG for the signed-in user; for tenants also their own record.
export const context = asyncHandler(async (req, res) => {
  const { role, pgId, id } = req.user;
  const { settings } = await getSettings(pgId);
  res.json({
    success: true,
    role,
    pgId,
    pgName: settings.name,
    tenant: role === 'tenant' ? await tenants.getTenant(pgId, id) : null,
  });
});
