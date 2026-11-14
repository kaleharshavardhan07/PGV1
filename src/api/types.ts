// Server response shapes (as returned by the API). Keep in sync with
// server/src/controllers and server/src/models.

export type ApiBedStatus = 'occupied' | 'vacant' | 'notice';
export type ApiComplaintStatus = 'Submitted' | 'Seen' | 'In Progress' | 'Resolved';
export type ApiPaymentStatus = 'Paid' | 'Pending' | 'Overdue';
export type ApiPaymentType = 'Rent' | 'Electricity' | 'Deposit';
export type ApiPaymentMethod = 'UPI' | 'Card' | 'Net Banking';
export type ApiMealType = 'Breakfast' | 'Lunch' | 'Dinner';
export type ApiPlanId = 'starter' | 'growth' | 'pro';
export type ApiCycle = 'monthly' | 'annual';

export interface ApiRoom {
  id: string;
  pg: string;
  roomNumber: string;
  floor: number;
  totalBeds: number;
  sharingType: number;
  attachedBathroom: boolean;
  occupiedBeds?: number;
  beds?: ApiBed[];
}

export interface ApiBed {
  id: string;
  pg: string;
  room: string;
  bedNumber: number;
  status: ApiBedStatus;
  tenant?: string | null;
  vacantSince?: string | null;
}

export interface ApiTenant {
  id: string;
  pg: string;
  user?: string | null;
  fullName: string;
  mobile: string;
  email: string;
  emergencyContact: string;
  room: string | null;
  roomId?: string | null;
  roomNumber?: string;
  bedNumber: number;
  monthlyRent: number;
  securityDeposit: number;
  joiningDate: string;
  idProofUrl?: string;
  photographUrl?: string;
  agreementUrl?: string;
  policeVerification: 'Pending' | 'Verified' | 'Not Required';
  status: 'Active' | 'Notice Period' | 'Left';
  noticeDate?: string;
}

export interface ApiPayment {
  id: string;
  pg: string;
  tenant: string;
  tenantName?: string;
  type: ApiPaymentType;
  month: string;
  amount: number;
  method: ApiPaymentMethod;
  status: ApiPaymentStatus;
  paidAt?: string;
  dueDate: string;
  reference?: string;
}

export interface ApiMeterReading {
  id: string;
  pg: string;
  room: string;
  roomNumber?: string;
  month: string;
  previousReading: number;
  currentReading: number;
  units: number;
  ratePerUnit: number;
  totalAmount: number;
  occupants: number;
  perTenantAmount: number;
  photoUrl?: string;
  recordedAt: string;
  published: boolean;
}

export interface ApiComplaint {
  id: string;
  pg: string;
  tenant: string;
  tenantName?: string;
  category: 'AC' | 'WiFi' | 'Water' | 'Cleaning' | 'Electrical' | 'Plumbing' | 'Other';
  description: string;
  imageUrl?: string;
  roomNumber: string;
  status: ApiComplaintStatus;
  submittedAt: string;
  resolvedAt?: string;
  remarks?: string;
}

export interface ApiFoodMenuItem {
  id: string;
  pg: string;
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  mealType: ApiMealType;
  items: string[];
  timing: string;
}

export interface ApiMealOptOut {
  id: string;
  pg: string;
  tenant: string;
  date: string;
  mealType: ApiMealType;
}

export interface ApiFoodRating {
  id: string;
  pg: string;
  tenant: string;
  tenantName?: string;
  date: string;
  mealType: ApiMealType;
  rating: number;
  review?: string;
}

export interface ApiNotification {
  id: string;
  pg: string;
  userId: string;
  userRole: 'tenant' | 'manager' | 'owner';
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: string;
  link?: string;
  category?: string;
  dedupeKey?: string;
}

export interface ApiNotificationLog {
  id: string;
  notificationId?: string;
  dedupeKey?: string;
  category: string;
  title: string;
  recipient: string;
  recipientRole: 'tenant' | 'manager' | 'owner';
  channel: 'In-App' | 'WhatsApp' | 'SMS' | 'Email';
  status: 'Delivered' | 'Simulated' | 'Failed' | 'Retried' | 'Skipped';
  attempts: number;
  createdAt: string;
  note?: string;
}

export interface ApiNotificationPref {
  id?: string;
  tenantId: string;
  tenantName?: string;
  whatsapp: boolean;
  sms: boolean;
  email: boolean;
}

export interface ApiSettings {
  name: string;
  address: string;
  city: string;
  contactEmail: string;
  contactPhone: string;
  electricityRate: number;
  foodCharge: number;
  ownerName: string;
  timezone: string;
  channels: { whatsapp: boolean; sms: boolean; email: boolean };
}

export interface ApiReminderSchedule {
  rentDaysBefore: number[];
  rentOverdueDays: number[];
  electricityDueDaysBefore: number[];
  electricityOverdueDays: number[];
  electricityDueInDays: number;
  complaintUnresolvedHours: number;
  gracePeriodDays: number;
  retryAttempts: number;
}

export interface ApiSubscriptionInvoice {
  number: string;
  date: string;
  planId: ApiPlanId;
  cycle: ApiCycle;
  amount: number;
  status: 'Paid' | 'Pending' | 'Failed';
  method: ApiPaymentMethod;
  paidAt?: string;
  reference?: string;
}

export interface ApiSubscription {
  planId: ApiPlanId;
  status: 'Trial' | 'Active' | 'Payment Pending' | 'Past Due' | 'Suspended' | 'Cancelled' | 'Expired';
  cycle: ApiCycle;
  startedAt?: string;
  currentPeriodEnd?: string;
  trialEndsAt?: string;
  amountPaid: number;
  autoRenew: boolean;
  pendingPlanId?: ApiPlanId;
  pendingCycle?: ApiCycle;
  failedPaymentAt?: string;
  invoices: ApiSubscriptionInvoice[];
}

export interface ApiPgAccount {
  id: string;
  pgName: string;
  pgUsername: string;
  description: string;
  address: string;
  city: string;
  state: string;
  pinCode: string;
  pgType: 'Boys' | 'Girls' | 'Co-living' | 'Other';
  ownerName: string;
  ownerEmail: string;
  ownerMobile: string;
  isActive: boolean;
  isDiscoverable: boolean;
  showAvailableBeds: boolean;
  subscriptionPlanId: ApiPlanId;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiMembership {
  id: string;
  pgId: string;
  tenantUserId: string;
  tenantId: string;
  roomId: string | null;
  bedId: string | null;
  status: 'Active' | 'Ended' | 'Deactivated';
  joiningDate: string;
  leavingDate?: string;
  monthlyRent: number;
  securityDeposit: number;
  approvedBy?: string;
  approvedAt?: string;
  createdAt?: string;
}

export interface ApiAdmissionRequest {
  id: string;
  requestId: string;
  pgId: string;
  tenantUserId: string;
  fullName: string;
  mobile: string;
  email: string;
  gender?: 'Male' | 'Female' | 'Other';
  emergencyContact: string;
  preferredJoiningDate: string;
  preferredRoomType: string;
  preferredBedId?: string;
  occupants: number;
  additionalMessage: string;
  documents: { idProof?: string; photograph?: string; additional?: string };
  status: 'Pending' | 'Approved' | 'Rejected';
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiAuditLog {
  id: string;
  ts: string;
  actor: string;
  action: string;
  entity: string;
  entityId: string;
  details: string;
}

export interface ApiContext {
  role: 'tenant' | 'manager' | 'owner';
  pgId: string | null;
  pgs: ApiPgAccount[];
  memberships: ApiMembership[];
  admissionRequests: ApiAdmissionRequest[];
  tenantUsers: { id: string; fullName: string; mobile: string; email: string; gender?: string }[];
  auditLogs: ApiAuditLog[];
  tenant: ApiTenant | null;
}

export interface ApiAuthUser {
  id: string;
  role: 'tenant' | 'manager' | 'owner';
  pgId: string | null;
  pgName?: string;
  pgUsername?: string;
  ownerName?: string;
  fullName?: string;
  mobile?: string;
  email?: string;
  gender?: string;
}

export interface ApiAuthResponse {
  success: true;
  token: string;
  user: ApiAuthUser;
}

export interface ApiRegistration {
  id: string;
  status: string;
  amount: number;
  planId: ApiPlanId;
  cycle: ApiCycle;
}

export interface ApiPublicVacancy {
  pg: { id: string; pgName: string; pgUsername: string; address: string; city: string; state: string; pgType: string };
  rooms: (ApiRoom & { rentFrom: number | null })[];
  beds: { id: string; roomId: string; bedNumber: number; status: ApiBedStatus }[];
}
