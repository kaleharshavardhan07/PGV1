// Domain types shared by the store, API layer and pages.
// The REST API already returns these shapes (camelCase), so no mapping layer is needed.

export type UserRole = 'tenant' | 'manager' | 'owner';
export type BedStatus = 'occupied' | 'vacant' | 'notice';
export type TenantStatus = 'Active' | 'Notice Period' | 'Left';
export type PoliceVerification = 'Pending' | 'Verified' | 'Not Required';
export type ComplaintCategory = 'AC' | 'WiFi' | 'Water' | 'Cleaning' | 'Electrical' | 'Plumbing' | 'Other';
export type ComplaintStatus = 'Submitted' | 'Seen' | 'In Progress' | 'Resolved';
export type MealType = 'Breakfast' | 'Lunch' | 'Dinner';
export type PGType = 'Boys' | 'Girls' | 'Co-living' | 'Other';

export const DOCUMENT_TYPES = ['ID Proof', 'Photograph', 'Rental Agreement', 'Police Verification', 'Other'] as const;
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
  beds: Bed[];
}

export interface MeterReading {
  id: string;
  roomId: string;
  roomNumber: string;
  month: string; // YYYY-MM
  previousReading: number;
  currentReading: number;
  units: number;
  ratePerUnit: number;
  totalAmount: number;
  occupants: number;
  perTenantAmount: number;
  recordedAt: string;
  published: boolean;
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

export type NotificationCategory = 'Electricity' | 'Complaint' | 'Tenant' | 'Bed' | 'System';
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
  electricityRate: number;
  ownerName: string;
  timezone: string;
  channels: { whatsapp: boolean; sms: boolean; email: boolean };
}

export interface PGVisibility {
  isDiscoverable: boolean;
  showAvailableBeds: boolean;
  pgUsername: string;
}

export interface TenantDocument {
  id: string;
  tenantId: string;
  tenantName: string;
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
  pgName: string;
  totalRooms: number;
  totalBeds: number;
  occupiedBeds: number;
  vacantBeds: number;
  occupancyPercent: number;
  activeTenants: number;
  noticeTenants: number;
  pendingVerification: number;
  openComplaints: number;
  documents: number;
}
