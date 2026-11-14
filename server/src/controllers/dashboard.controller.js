import asyncHandler from '../utils/asyncHandler.js';
import { Tenant, Room, Payment, MeterReading, Complaint, AdmissionRequest } from '../models/index.js';
import { ensureWorkspace } from '../services/workspaceService.js';
import { getOverdueSummary } from '../services/billingService.js';
import { getPlan } from '../constants/plans.js';
import { currentMonth } from '../utils/ids.js';

const month = currentMonth();

export const summary = asyncHandler(async (req, res) => {
  const pgId = req.pgId;
  const role = req.user.role;

  const [workspace, tenants, rooms, payments, meter, complaints, admissions] = await Promise.all([
    ensureWorkspace(pgId),
    Tenant.find({ pg: pgId }),
    Room.find({ pg: pgId }),
    Payment.find({ pg: pgId }),
    MeterReading.find({ pg: pgId }),
    Complaint.find({ pg: pgId }),
    AdmissionRequest.find({ pg: pgId }),
  ]);

  const totalBeds = rooms.reduce((s, r) => s + r.totalBeds, 0);
  const occupiedBeds = tenants.filter((t) => t.status !== 'Left').length;
  const roomByTenant = new Map();
  for (const t of tenants) roomByTenant.set(String(t._id), rooms.find((r) => String(r._id) === String(t.room)));

  const base = {
    role,
    pgName: workspace.settings?.name,
    totalBeds,
    occupiedBeds,
    vacantBeds: totalBeds - occupiedBeds,
    occupancyPercent: totalBeds ? Math.round((occupiedBeds / totalBeds) * 100) : 0,
    totalRooms: rooms.length,
  };

  if (role === 'tenant') {
    const tenantId = req.tenantId;
    const myTenant = tenants.find((t) => String(t._id) === tenantId);
    const myPayments = payments.filter((p) => String(p.tenant) === tenantId);
    const due = myPayments.filter((p) => p.status !== 'Paid');
    res.json({
      success: true,
      summary: {
        ...base,
        tenant: myTenant,
        rentDue: due.filter((p) => p.type === 'Rent').reduce((s, p) => s + p.amount, 0),
        electricityDue: due.filter((p) => p.type === 'Electricity').reduce((s, p) => s + p.amount, 0),
        openComplaints: complaints.filter((c) => String(c.tenant) === tenantId && c.status !== 'Resolved').length,
      },
    });
    return;
  }

  const rentThisMonth = payments.filter((p) => p.month === month && p.type === 'Rent');
  const rentReceived = rentThisMonth.filter((p) => p.status === 'Paid').reduce((s, p) => s + p.amount, 0);
  const rentPending = rentThisMonth.filter((p) => p.status !== 'Paid').reduce((s, p) => s + p.amount, 0);
  const electricityThisMonth = meter.filter((m) => m.month === month).reduce((s, m) => s + m.totalAmount, 0);
  const totalMonthlyRent = tenants.filter((t) => t.status !== 'Left').reduce((s, t) => s + t.monthlyRent, 0);
  const totalDeposits = tenants.reduce((s, t) => s + t.securityDeposit, 0);
  const overdue = getOverdueSummary(tenants, payments, roomByTenant);

  const result = {
    ...base,
    totalMonthlyRent,
    rentReceived,
    rentPending,
    electricityThisMonth,
    totalDeposits,
    overdue,
    pendingComplaints: complaints.filter((c) => c.status !== 'Resolved').length,
    pendingAdmissions: admissions.filter((a) => a.status === 'Pending').length,
  };

  if (role === 'owner') {
    const sub = workspace.subscription;
    result.subscription = {
      planId: sub.planId,
      planName: getPlan(sub.planId).name,
      status: sub.status,
      cycle: sub.cycle,
      currentPeriodEnd: sub.currentPeriodEnd,
      trialEndsAt: sub.trialEndsAt,
    };
  }

  res.json({ success: true, summary: result });
});

