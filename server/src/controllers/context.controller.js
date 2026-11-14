// Role-scoped platform context for the frontend.
// One call hydrates the client's identity, PG registry, memberships and
// admission requests — everything the existing React pages read from
// `data.platform` plus the active tenant record.
import asyncHandler from '../utils/asyncHandler.js';
import {
  PgAccount,
  TenantUser,
  Tenant,
  Membership,
  AdmissionRequest,
  AuditLog,
  Room,
} from '../models/index.js';

const pgSummary = (pg) => ({
  id: String(pg._id),
  pgName: pg.pgName,
  pgUsername: pg.pgUsername,
  description: pg.description,
  address: pg.address,
  city: pg.city,
  state: pg.state,
  pinCode: pg.pinCode,
  pgType: pg.pgType,
  ownerName: pg.ownerName,
  ownerEmail: pg.ownerEmail,
  ownerMobile: pg.ownerMobile,
  isActive: pg.isActive,
  isDiscoverable: pg.isDiscoverable,
  showAvailableBeds: pg.showAvailableBeds,
  subscriptionPlanId: pg.subscriptionPlanId,
  createdAt: pg.createdAt,
  updatedAt: pg.updatedAt,
});

const membershipSummary = (m) => ({
  id: String(m._id),
  pgId: String(m.pg),
  tenantUserId: String(m.tenantUser),
  tenantId: String(m.tenant),
  roomId: m.room ? String(m.room) : null,
  bedId: m.bed ? String(m.bed) : null,
  status: m.status,
  joiningDate: m.joiningDate,
  leavingDate: m.leavingDate,
  monthlyRent: m.monthlyRent,
  securityDeposit: m.securityDeposit,
  approvedBy: m.approvedBy,
  approvedAt: m.approvedAt,
  createdAt: m.createdAt,
});

const requestSummary = (r) => ({
  id: String(r._id),
  requestId: r.requestId,
  pgId: String(r.pg),
  tenantUserId: String(r.tenantUser),
  fullName: r.fullName,
  mobile: r.mobile,
  email: r.email,
  gender: r.gender,
  emergencyContact: r.emergencyContact,
  preferredJoiningDate: r.preferredJoiningDate,
  preferredRoomType: r.preferredRoomType,
  preferredBedId: r.preferredBed ? String(r.preferredBed) : undefined,
  occupants: r.occupants,
  additionalMessage: r.additionalMessage,
  documents: r.documents,
  status: r.status,
  rejectionReason: r.rejectionReason,
  reviewedBy: r.reviewedBy,
  reviewedAt: r.reviewedAt,
  createdAt: r.createdAt,
  updatedAt: r.updatedAt,
});

const tenantSummary = (t) => ({
  ...t.toJSON(),
  roomId: t.room ? String(t.room) : null,
});

export const context = asyncHandler(async (req, res) => {
  const { role, pgId, id } = req.user;

  if (role === 'owner' || role === 'manager') {
    const pg = await PgAccount.findById(pgId);
    const [memberships, requests] = await Promise.all([
      Membership.find({ pg: pgId }),
      AdmissionRequest.find({ pg: pgId }),
    ]);
    const tenantUserIds = [...new Set([...memberships.map((m) => String(m.tenantUser)), ...requests.map((r) => String(r.tenantUser))])];
    const tenantUsers = await TenantUser.find({ _id: { $in: tenantUserIds } });
    const auditLogs = await AuditLog.find({
      entityId: { $in: [...requests.map((r) => r.requestId), pgId] },
    })
      .sort({ ts: -1 })
      .limit(100);

    return res.json({
      success: true,
      role,
      pgId,
      pgs: [pgSummary(pg)],
      memberships: memberships.map(membershipSummary),
      admissionRequests: requests.map(requestSummary),
      tenantUsers: tenantUsers.map((u) => ({ id: String(u._id), fullName: u.fullName, mobile: u.mobile, email: u.email })),
      auditLogs: auditLogs.map((l) => ({ ...l.toJSON() })),
      tenant: null,
    });
  }

  // Tenant: discoverable PGs (for admission requests) + own records.
  const [pgs, memberships, requests, me] = await Promise.all([
    PgAccount.find({ isActive: true }).sort({ createdAt: -1 }),
    Membership.find({ tenantUser: id }),
    AdmissionRequest.find({ tenantUser: id }),
    TenantUser.findById(id),
  ]);

  const active = memberships.find((m) => m.status === 'Active' && String(m.pg) === String(pgId));
  const tenant = active ? await Tenant.findById(active.tenant) : null;
  let roomNumber = null;
  if (tenant?.room) {
    const room = await Room.findById(tenant.room);
    roomNumber = room?.roomNumber ?? null;
  }

  res.json({
    success: true,
    role,
    pgId,
    pgs: pgs.map(pgSummary),
    memberships: memberships.map(membershipSummary),
    admissionRequests: requests.map(requestSummary),
    tenantUsers: me ? [{ id: String(me._id), fullName: me.fullName, mobile: me.mobile, email: me.email, gender: me.gender }] : [],
    auditLogs: [],
    tenant: tenant ? { ...tenantSummary(tenant), roomNumber } : null,
  });
});

export { pgSummary, membershipSummary, requestSummary, tenantSummary };
