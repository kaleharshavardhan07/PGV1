// Maps API DTOs onto the domain shapes the existing React pages already consume.
// This is the compatibility boundary: pages keep reading `roomId`, `tenantId`,
// etc., while the server speaks `room`, `tenant` and Mongo `id`s.
import type {
  Bed,
  BedStatus,
  Complaint,
  FoodMenuItem,
  FoodRating,
  MealOptOut,
  MeterReading,
  Notification,
  NotificationLogEntry,
  NotificationPrefs,
  Payment,
  PGSettings,
  ReminderSchedule,
  Room,
  Subscription,
  Tenant,
} from '../types';
import type {
  ApiAdmissionRequest,
  ApiAuditLog,
  ApiBed,
  ApiComplaint,
  ApiFoodMenuItem,
  ApiFoodRating,
  ApiMealOptOut,
  ApiMembership,
  ApiMeterReading,
  ApiNotification,
  ApiNotificationLog,
  ApiNotificationPref,
  ApiPayment,
  ApiPgAccount,
  ApiReminderSchedule,
  ApiRoom,
  ApiSettings,
  ApiSubscription,
  ApiTenant,
} from './types';

export const mapTenant = (t: ApiTenant): Tenant => ({
  id: t.id,
  fullName: t.fullName,
  mobile: t.mobile,
  email: t.email ?? '',
  emergencyContact: t.emergencyContact ?? '',
  roomId: t.room ?? t.roomId ?? '',
  bedNumber: t.bedNumber,
  monthlyRent: t.monthlyRent,
  securityDeposit: t.securityDeposit,
  joiningDate: t.joiningDate,
  idProofUrl: t.idProofUrl,
  photographUrl: t.photographUrl,
  agreementUrl: t.agreementUrl,
  policeVerification: t.policeVerification,
  status: t.status,
  noticeDate: t.noticeDate,
});

export const mapRoom = (r: ApiRoom): Room => ({
  id: r.id,
  roomNumber: r.roomNumber,
  floor: r.floor,
  totalBeds: r.totalBeds,
  sharingType: r.sharingType,
  attachedBathroom: r.attachedBathroom,
});

export const mapBed = (b: ApiBed): Bed => ({
  id: b.id,
  roomId: b.room,
  bedNumber: b.bedNumber,
  status: b.status as BedStatus,
  tenantId: b.tenant ?? undefined,
  vacantSince: b.vacantSince ?? undefined,
});

export const mapPayment = (p: ApiPayment): Payment => ({
  id: p.id,
  tenantId: p.tenant,
  type: p.type,
  month: p.month,
  amount: p.amount,
  method: p.method,
  status: p.status,
  paidAt: p.paidAt,
  dueDate: p.dueDate,
  reference: p.reference,
});

export const mapMeterReading = (m: ApiMeterReading): MeterReading => ({
  id: m.id,
  roomId: m.room,
  month: m.month,
  previousReading: m.previousReading,
  currentReading: m.currentReading,
  units: m.units,
  ratePerUnit: m.ratePerUnit,
  totalAmount: m.totalAmount,
  occupants: m.occupants,
  perTenantAmount: m.perTenantAmount,
  photoUrl: m.photoUrl,
  recordedAt: m.recordedAt,
  published: m.published,
});

export const mapComplaint = (c: ApiComplaint): Complaint => ({
  id: c.id,
  tenantId: c.tenant,
  category: c.category,
  description: c.description,
  imageUrl: c.imageUrl,
  roomNumber: c.roomNumber,
  status: c.status,
  submittedAt: c.submittedAt,
  resolvedAt: c.resolvedAt,
  remarks: c.remarks,
});

export const mapMenuItem = (m: ApiFoodMenuItem): FoodMenuItem => ({
  id: m.id,
  day: m.day,
  mealType: m.mealType,
  items: m.items,
  timing: m.timing,
});

export const mapMealOptOut = (o: ApiMealOptOut): MealOptOut => ({
  id: o.id,
  tenantId: o.tenant,
  date: o.date,
  mealType: o.mealType,
});

export const mapFoodRating = (r: ApiFoodRating): FoodRating => ({
  id: r.id,
  tenantId: r.tenant,
  date: r.date,
  mealType: r.mealType,
  rating: r.rating,
  review: r.review,
});

export const mapNotification = (n: ApiNotification): Notification => ({
  id: n.id,
  userId: n.userId,
  userRole: n.userRole,
  title: n.title,
  message: n.message,
  type: n.type,
  read: n.read,
  createdAt: n.createdAt,
  link: n.link,
  category: n.category as Notification['category'],
  dedupeKey: n.dedupeKey,
});

export const mapNotificationLog = (l: ApiNotificationLog): NotificationLogEntry => ({
  id: l.id,
  notificationId: l.notificationId,
  dedupeKey: l.dedupeKey,
  category: l.category as NotificationLogEntry['category'],
  title: l.title,
  recipient: l.recipient,
  recipientRole: l.recipientRole,
  channel: l.channel,
  status: l.status,
  attempts: l.attempts,
  createdAt: l.createdAt,
  note: l.note,
});

export const mapSettings = (s: ApiSettings): PGSettings => ({
  name: s.name,
  address: s.address,
  city: s.city,
  contactEmail: s.contactEmail,
  contactPhone: s.contactPhone,
  electricityRate: s.electricityRate,
  foodCharge: s.foodCharge,
  ownerName: s.ownerName,
  timezone: s.timezone,
  channels: s.channels,
});

export const mapReminderSchedule = (s: ApiReminderSchedule): ReminderSchedule => ({
  rentDaysBefore: s.rentDaysBefore,
  rentOverdueDays: s.rentOverdueDays,
  electricityDueDaysBefore: s.electricityDueDaysBefore,
  electricityOverdueDays: s.electricityOverdueDays,
  electricityDueInDays: s.electricityDueInDays,
  complaintUnresolvedHours: s.complaintUnresolvedHours,
  gracePeriodDays: s.gracePeriodDays,
  retryAttempts: s.retryAttempts,
});

export const mapSubscription = (s: ApiSubscription): Subscription => ({
  planId: s.planId,
  status: s.status,
  cycle: s.cycle,
  startedAt: s.startedAt ?? '',
  currentPeriodEnd: s.currentPeriodEnd ?? '',
  trialEndsAt: s.trialEndsAt,
  amountPaid: s.amountPaid,
  autoRenew: s.autoRenew,
  pendingPlanId: s.pendingPlanId,
  pendingCycle: s.pendingCycle,
  failedPaymentAt: s.failedPaymentAt,
  invoices: s.invoices.map((inv, i) => ({ ...inv, id: `${inv.number}-${i}` })),
});

export const mapPrefs = (p: ApiNotificationPref): NotificationPrefs => ({
  tenantId: p.tenantId,
  whatsapp: p.whatsapp,
  sms: p.sms,
  email: p.email,
});

export const mapPgAccount = (p: ApiPgAccount) => ({
  id: p.id,
  pgName: p.pgName,
  pgUsername: p.pgUsername,
  description: p.description,
  address: p.address,
  city: p.city,
  state: p.state,
  pinCode: p.pinCode,
  pgType: p.pgType,
  ownerName: p.ownerName,
  ownerEmail: p.ownerEmail,
  ownerMobile: p.ownerMobile,
  passwordHash: null,
  isActive: p.isActive,
  isDiscoverable: p.isDiscoverable,
  showAvailableBeds: p.showAvailableBeds,
  subscriptionPlanId: p.subscriptionPlanId,
  createdAt: p.createdAt ?? '',
  updatedAt: p.updatedAt ?? '',
});

export const mapMembership = (m: ApiMembership) => ({
  id: m.id,
  pgId: m.pgId,
  tenantUserId: m.tenantUserId,
  tenantId: m.tenantId,
  roomId: m.roomId ?? '',
  bedId: m.bedId ?? '',
  status: m.status,
  joiningDate: m.joiningDate,
  leavingDate: m.leavingDate,
  monthlyRent: m.monthlyRent,
  securityDeposit: m.securityDeposit,
  approvedBy: m.approvedBy ?? '',
  approvedAt: m.approvedAt ?? '',
  createdAt: m.createdAt ?? '',
});

export const mapAdmission = (r: ApiAdmissionRequest) => ({
  id: r.id,
  requestId: r.requestId,
  pgId: r.pgId,
  tenantUserId: r.tenantUserId,
  fullName: r.fullName,
  mobile: r.mobile,
  email: r.email,
  gender: r.gender,
  emergencyContact: r.emergencyContact,
  preferredJoiningDate: r.preferredJoiningDate,
  preferredRoomType: r.preferredRoomType,
  preferredBedId: r.preferredBedId,
  occupants: r.occupants,
  additionalMessage: r.additionalMessage,
  documents: r.documents ?? {},
  status: r.status,
  rejectionReason: r.rejectionReason,
  reviewedBy: r.reviewedBy,
  reviewedAt: r.reviewedAt,
  createdAt: r.createdAt,
  updatedAt: r.updatedAt,
});

export const mapAuditLog = (l: ApiAuditLog) => ({
  id: l.id,
  ts: l.ts,
  actor: l.actor,
  action: l.action,
  entity: l.entity,
  entityId: l.entityId,
  details: l.details,
});
