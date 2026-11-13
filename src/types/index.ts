// Core domain types for Aapka PG

export type UserRole = 'tenant' | 'manager' | 'owner';

export type BedStatus = 'occupied' | 'vacant' | 'notice';

export type ComplaintCategory = 'AC' | 'WiFi' | 'Water' | 'Cleaning' | 'Electrical' | 'Plumbing' | 'Other';

export type ComplaintStatus = 'Submitted' | 'Seen' | 'In Progress' | 'Resolved';

export type PaymentMethod = 'UPI' | 'Card' | 'Net Banking';

export type PaymentStatus = 'Paid' | 'Pending' | 'Overdue';

export type MealType = 'Breakfast' | 'Lunch' | 'Dinner';

export interface Tenant {
  id: string;
  fullName: string;
  mobile: string;
  email: string;
  emergencyContact: string;
  roomId: string;
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

export interface Room {
  id: string;
  roomNumber: string;
  floor: number;
  totalBeds: number;
  sharingType: number; // 1, 2, 3, 4 sharing
  attachedBathroom: boolean;
}

export interface Bed {
  id: string;
  roomId: string;
  bedNumber: number;
  status: BedStatus;
  tenantId?: string;
  vacantSince?: string;
}

export interface MeterReading {
  id: string;
  roomId: string;
  month: string; // YYYY-MM
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

export interface Payment {
  id: string;
  tenantId: string;
  type: 'Rent' | 'Electricity' | 'Deposit';
  month: string; // YYYY-MM
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  paidAt?: string;
  dueDate: string;
  reference?: string;
}

export interface Complaint {
  id: string;
  tenantId: string;
  category: ComplaintCategory;
  description: string;
  imageUrl?: string;
  roomNumber: string;
  status: ComplaintStatus;
  submittedAt: string;
  resolvedAt?: string;
  remarks?: string;
}

export interface FoodMenuItem {
  id: string;
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  mealType: MealType;
  items: string[];
  timing: string;
}

export interface MealOptOut {
  id: string;
  tenantId: string;
  date: string; // YYYY-MM-DD
  mealType: MealType;
}

export interface FoodRating {
  id: string;
  tenantId: string;
  date: string;
  mealType: MealType;
  rating: number; // 1-5
  review?: string;
}

export interface Notification {
  id: string;
  userId: string;
  userRole: UserRole;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: string;
  link?: string;
  category?: NotificationCategory;
  dedupeKey?: string;
}

export type NotificationCategory =
  | 'Rent'
  | 'Electricity'
  | 'Complaint'
  | 'Tenant'
  | 'Bed'
  | 'Subscription'
  | 'Admission'
  | 'System';

export type NotificationChannel = 'In-App' | 'WhatsApp' | 'SMS' | 'Email';

export type DeliveryStatus = 'Delivered' | 'Simulated' | 'Failed' | 'Retried' | 'Skipped';

export interface NotificationLogEntry {
  id: string;
  notificationId?: string;
  dedupeKey?: string;
  category: NotificationCategory;
  title: string;
  recipient: string;
  recipientRole: UserRole;
  channel: NotificationChannel;
  status: DeliveryStatus;
  attempts: number;
  createdAt: string;
  note?: string;
}

export interface NotificationPrefs {
  tenantId: string;
  whatsapp: boolean;
  sms: boolean;
  email: boolean;
}

export interface ReminderSchedule {
  rentDaysBefore: number[]; // e.g. [5, 1]
  rentOverdueDays: number[]; // e.g. [1, 3, 7]
  electricityDueDaysBefore: number[]; // e.g. [5, 1]
  electricityOverdueDays: number[]; // e.g. [1, 3, 7]
  electricityDueInDays: number; // due date offset after publishing a bill
  complaintUnresolvedHours: number;
  gracePeriodDays: number; // subscription grace period
  retryAttempts: number; // delivery retries per channel
}

export interface PGSettings {
  name: string;
  address: string;
  city: string;
  contactEmail: string;
  contactPhone: string;
  electricityRate: number;
  foodCharge: number;
  ownerName: string;
  timezone: string;
  channels: {
    whatsapp: boolean;
    sms: boolean;
    email: boolean;
  };
}

// ---------- Subscription (SaaS billing – separate from tenant payments) ----------

export type PlanId = 'starter' | 'growth' | 'pro';

export type BillingCycle = 'monthly' | 'annual';

export type SubscriptionStatus =
  | 'Trial'
  | 'Active'
  | 'Payment Pending'
  | 'Past Due'
  | 'Suspended'
  | 'Cancelled'
  | 'Expired';

export type SaaSPaymentMethod = 'UPI' | 'Card' | 'Net Banking';

export interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  monthlyPrice: number; // editable sample price
  annualPrice: number; // editable sample price (after annual discount)
  limits: {
    rooms: number | null; // null = unlimited
    beds: number | null;
    branches: number | null;
  };
  features: string[];
  recommended?: boolean;
}

export interface SubscriptionInvoice {
  id: string;
  number: string;
  date: string;
  planId: PlanId;
  cycle: BillingCycle;
  amount: number;
  status: 'Paid' | 'Pending' | 'Failed';
  method: SaaSPaymentMethod;
  paidAt?: string;
  reference?: string;
}

export interface Subscription {
  planId: PlanId;
  status: SubscriptionStatus;
  cycle: BillingCycle;
  startedAt: string;
  currentPeriodEnd: string; // renewal / expiry date (YYYY-MM-DD)
  trialEndsAt?: string;
  amountPaid: number;
  autoRenew: boolean;
  pendingPlanId?: PlanId; // scheduled downgrade
  pendingCycle?: BillingCycle;
  failedPaymentAt?: string;
  invoices: SubscriptionInvoice[];
}

// ---------- Multi-PG platform (SaaS registry) ----------

export type PGType = 'Boys' | 'Girls' | 'Co-living' | 'Other';

/**
 * A registered PG on the platform. `pgUsername` is the globally unique,
 * case-insensitive public identifier tenants use for discovery. It is a public
 * identifier, NOT a security credential — passwords are hashed separately.
 */
export interface PGAccount {
  id: string;
  pgName: string;
  pgUsername: string; // globally unique, case-insensitive
  description: string;
  address: string;
  city: string;
  state: string;
  pinCode: string;
  pgType: PGType;
  ownerName: string;
  ownerEmail: string; // unique across the platform
  ownerMobile: string; // unique across the platform
  passwordHash: string | null; // PBKDF2-SHA256 (demo-grade stand-in for Argon2id/bcrypt)
  isActive: boolean;
  isDiscoverable: boolean;
  showAvailableBeds: boolean; // public visibility of vacant bed count
  subscriptionPlanId: PlanId;
  createdAt: string;
  updatedAt: string;
}

/** Platform-wide tenant account (identity), separate from per-PG tenant records. */
export interface TenantUser {
  id: string;
  fullName: string;
  mobile: string; // unique, used for OTP login
  email: string;
  gender?: string;
  createdAt: string;
}

export type AdmissionStatus = 'Pending' | 'Approved' | 'Rejected';

export interface AdmissionRequest {
  id: string;
  requestId: string; // human-readable unique id, e.g. AR-2026-0001
  pgId: string;
  tenantUserId: string;
  fullName: string;
  mobile: string;
  email: string;
  gender?: string;
  emergencyContact: string;
  preferredJoiningDate: string;
  preferredRoomType: string;
  preferredBedId?: string;
  occupants: number;
  additionalMessage: string;
  documents: { idProof?: string; photograph?: string; additional?: string };
  status: AdmissionStatus;
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type MembershipStatus = 'Active' | 'Ended' | 'Deactivated';

/** Tenant-to-PG membership. Historical memberships are preserved (never hard-deleted). */
export interface Membership {
  id: string;
  pgId: string;
  tenantUserId: string;
  tenantId: string; // per-PG tenant record inside the PG workspace
  roomId: string;
  bedId: string;
  status: MembershipStatus;
  joiningDate: string;
  leavingDate?: string;
  monthlyRent: number;
  securityDeposit: number;
  approvedBy: string;
  approvedAt: string;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  ts: string;
  actor: string;
  action: string;
  entity: string;
  entityId: string;
  details: string;
}

export type RegistrationStatus =
  | 'Awaiting Payment'
  | 'Payment Pending Verification'
  | 'Payment Failed'
  | 'Payment Verified'
  | 'Username Confirmed'
  | 'Active';

/** Resumable owner onboarding state (survives browser refresh mid-flow). */
export interface PendingRegistration {
  id: string;
  owner: { fullName: string; mobile: string; email: string };
  pg: {
    pgName: string;
    address: string;
    city: string;
    state: string;
    pinCode: string;
    rooms: number;
    beds: number;
    description: string;
    pgType: PGType;
  };
  planId: PlanId;
  cycle: BillingCycle;
  amount: number;
  status: RegistrationStatus;
  pgId?: string; // set once payment is verified
  suggestedUsernames: string[];
  pgUsername?: string;
  orderId?: string;
  processedCallbacks: string[]; // payment idempotency registry
  createdAt: string;
}

/** Per-PG data workspace. The active workspace is mirrored at the top level of AppData. */
export interface PGWorkspace {
  settings: PGSettings;
  tenants: Tenant[];
  rooms: Room[];
  beds: Bed[];
  meterReadings: MeterReading[];
  payments: Payment[];
  complaints: Complaint[];
  foodMenu: FoodMenuItem[];
  foodRatings: FoodRating[];
  mealOptOuts: MealOptOut[];
  notifications: Notification[];
  notificationLog: NotificationLogEntry[];
  notificationPrefs: NotificationPrefs[];
  reminderSchedule: ReminderSchedule;
  subscription: Subscription;
}

export interface PlatformData {
  pgs: PGAccount[];
  tenantUsers: TenantUser[];
  admissionRequests: AdmissionRequest[];
  memberships: Membership[];
  auditLogs: AuditLogEntry[];
  pendingRegistrations: PendingRegistration[];
}
