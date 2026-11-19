// Domain types shared by the store, API layer and pages.
// The REST API already returns these shapes (camelCase), so no mapping layer is needed.

export type UserRole = 'tenant' | 'manager' | 'owner' | 'admin';
export type BedStatus = 'occupied' | 'vacant' | 'notice' | 'unavailable';
export type TenantStatus = 'Active' | 'Notice Period' | 'Left';
export type PoliceVerification = 'Pending' | 'Verified' | 'Not Required';
export type ComplaintCategory = 'AC' | 'WiFi' | 'Water' | 'Cleaning' | 'Electrical' | 'Plumbing' | 'Other';
export type ComplaintStatus = 'Submitted' | 'Seen' | 'In Progress' | 'Resolved';
export type MealType = 'Breakfast' | 'Lunch' | 'Dinner';
export type PGType = 'Boys' | 'Girls' | 'Co-living' | 'Other';

export const DOCUMENT_TYPES = ['ID Proof', 'Photograph', 'Rental Agreement', 'Police Verification', 'Receipt', 'Invoice', 'Other'] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export interface Tenant {
  id: string;
  fullName: string;
  mobile: string;
  email: string;
  gender?: 'Male' | 'Female' | 'Other' | null;
  emergencyContact: string;
  roomId: string | null;
  roomNumber: string | null;
  bedId: string | null;
  bedNumber: number | null;
  monthlyRent: number;
  securityDeposit: number;
  joiningDate: string;
  policeVerification: PoliceVerification;
  status: TenantStatus;
  noticeDate?: string | null;
}

export interface Bed {
  id: string;
  roomId: string;
  bedNumber: number;
  label: string;
  rent: number | null;
  status: BedStatus;
  unavailable: boolean;
  tenantId: string | null;
  tenantName: string | null;
  vacantSince?: string | null;
}

export interface Room {
  id: string;
  roomNumber: string;
  floor: number;
  sharingType: number;
  attachedBathroom: boolean;
  totalBeds: number;
  occupiedBeds: number;
  vacantBeds: number;
  unavailableBeds: number;
  beds: Bed[];
}

export interface Complaint {
  id: string;
  tenantId: string;
  tenantName: string;
  category: ComplaintCategory;
  description: string;
  roomNumber: string;
  status: ComplaintStatus;
  submittedAt: string;
  resolvedAt?: string | null;
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
  date: string;
  mealType: MealType;
}

export interface FoodRating {
  id: string;
  tenantId: string;
  tenantName?: string;
  date: string;
  mealType: MealType;
  rating: number;
  review?: string;
}

export type NotificationCategory = 'Expense' | 'Invoice' | 'Complaint' | 'Tenant' | 'Bed' | 'System';
export type NotificationChannel = 'In-App' | 'WhatsApp' | 'SMS' | 'Email';

export interface Notification {
  id: string;
  userId: string;
  userRole: UserRole;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: string;
  link?: string | null;
  category?: NotificationCategory | null;
}

export interface NotificationLogEntry {
  id: string;
  category: NotificationCategory;
  title: string;
  recipient: string;
  recipientRole: UserRole;
  channel: NotificationChannel;
  status: 'Delivered' | 'Simulated' | 'Failed' | 'Retried' | 'Skipped';
  attempts: number;
  createdAt: string;
  note?: string | null;
}

export interface NotificationPrefs {
  tenantId: string;
  tenantName?: string;
  whatsapp: boolean;
  sms: boolean;
  email: boolean;
}

export interface ReminderSchedule {
  complaintUnresolvedHours: number;
  retryAttempts: number;
}

export interface PGSettings {
  name: string;
  address: string;
  city: string;
  contactEmail: string;
  contactPhone: string;
  ownerName: string;
  timezone: string;
  channels: { whatsapp: boolean; sms: boolean; email: boolean };
}

export interface PGVisibility {
  isDiscoverable: boolean;
  showAvailableBeds: boolean;
  contactPublic: boolean;
  pgUsername: string;
}

export interface PGLocation {
  address: string;
  area: string;
  city: string;
  state: string;
  pinCode: string;
  latitude: number | null;
  longitude: number | null;
}

export const FEATURES = ['rooms', 'food', 'expenses', 'documents', 'billing', 'complaints', 'exports'] as const;
export type Feature = (typeof FEATURES)[number];
export type FeatureMap = Record<Feature, boolean>;
export const PERMISSIONS = ['tenants', 'rooms', 'food', 'expenses', 'billing', 'documents', 'complaints', 'exports'] as const;
export type Permission = (typeof PERMISSIONS)[number];
export type PermissionMap = Record<Permission, boolean>;

export const FEATURE_LABELS: Record<Feature, string> = {
  rooms: 'Room management', food: 'Food / mess', expenses: 'Expenses', documents: 'Documents',
  billing: 'Billing & invoices', complaints: 'Complaints', exports: 'Data export',
};
export const PERMISSION_LABELS: Record<Permission, string> = {
  tenants: 'Manage tenants', rooms: 'Edit rooms & beds', food: 'Manage food menu', expenses: 'Manage expenses',
  billing: 'Manage invoices', documents: 'Manage documents', complaints: 'Handle complaints', exports: 'Export data',
};

export const EXPENSE_CATEGORIES = ['Maintenance', 'Utilities', 'Groceries', 'Cleaning', 'Repairs', 'Salaries', 'Supplies', 'Other'] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export interface Expense {
  id: string;
  title: string;
  description: string;
  amount: number;
  expenseDate: string;
  category: ExpenseCategory;
  status: 'Pending' | 'Settled';
  visibleToTenants: boolean;
  proofRequired: boolean;
  documentCount: number;
  createdAt: string;
}

export type InvoiceStatus = 'Draft' | 'Issued' | 'Paid' | 'Cancelled';

export interface Invoice {
  id: string;
  tenantId: string;
  tenantName: string;
  roomNumber: string | null;
  number: string;
  billingPeriod: string;
  description: string;
  amount: number;
  dueDate: string;
  status: InvoiceStatus;
  overdue: boolean;
  paidOn: string | null;
  paymentNote: string;
  documentCount: number;
  createdAt: string;
}

export interface Manager {
  id: string;
  fullName: string;
  email: string;
  mobile: string;
  isActive: boolean;
  permissions: PermissionMap;
  createdAt: string;
}

export interface Enquiry {
  id: string;
  name: string;
  mobile: string;
  email: string;
  message: string;
  status: 'New' | 'Contacted' | 'Closed';
  createdAt: string;
}

export interface TenantDocument {
  id: string;
  tenantId: string | null;
  tenantName: string | null;
  expenseId: string | null;
  invoiceId: string | null;
  type: DocumentType;
  title: string;
  fileName: string;
  mimeType: string;
  size: number;
  uploadedById: string;
  uploadedByRole: UserRole;
  uploadedByName: string;
  createdAt: string;
}

export interface DashboardSummary {
  role: UserRole;
  pgName: string;
  totalRooms: number;
  totalBeds: number;
  occupiedBeds: number;
  vacantBeds: number;
  unavailableBeds: number;
  occupancyPercent: number;
  totalTenants: number;
  activeTenants: number;
  noticeTenants: number;
  pendingVerification: number;
  expenses: { pendingCount: number; pendingAmount: number; monthAmount: number } | null;
  invoices: {
    drafts: number; outstandingCount: number; outstandingAmount: number; overdueCount: number; overdueAmount: number; paidThisMonth: number;
  } | null;
  openComplaints: number | null;
  newEnquiries: number | null;
  documents: number | null;
}

export interface TenantSummary {
  role: 'tenant';
  pgName: string;
  tenant: Tenant;
  invoices?: { outstandingCount: number; outstandingAmount: number; overdueCount: number };
  expenses?: { recent: Expense[] };
  todayMenu?: FoodMenuItem[];
  documents?: number;
}
