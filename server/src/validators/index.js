import { z } from 'zod';
import { DOCUMENT_TYPES } from '../constants/index.js';

export const uuid = z.string().uuid('Invalid id');
const optionalString = z.string().trim().max(500).optional().or(z.literal(''));
const mobile = z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number');
const email = z.string().trim().email('Enter a valid email');
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');
const password = z.string().min(8, 'Password must be at least 8 characters').max(72, 'Password is too long');
const mealType = z.enum(['Breakfast', 'Lunch', 'Dinner']);

// ---------- Auth ----------
export const ownerRegisterSchema = z.object({
  owner: z.object({
    fullName: z.string().trim().min(2, 'Full name is required'),
    mobile,
    email,
  }),
  pg: z.object({
    pgName: z.string().trim().min(2, 'PG name is required'),
    address: z.string().trim().min(5, 'Address is required'),
    city: z.string().trim().min(2, 'City is required'),
    state: z.string().trim().optional(),
    pinCode: z.string().trim().optional(),
    description: z.string().trim().max(500).optional(),
    pgType: z.enum(['Boys', 'Girls', 'Co-living', 'Other']).default('Other'),
  }),
  pgUsername: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z][a-z0-9_]{3,29}$/, 'Username must start with a letter and be 4-30 characters (letters, numbers, underscores)'),
  password,
});

export const ownerLoginSchema = z.object({
  identifier: z.string().trim().min(3, 'Enter your PG username or email'),
  password: z.string().min(1, 'Password is required'),
});

export const tenantLoginSchema = z.object({
  mobile,
  password: z.string().min(1, 'Password is required'),
});

export const managerLoginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: password,
});

// ---------- Rooms / Beds ----------
export const roomCreateSchema = z.object({
  roomNumber: z.string().trim().min(1, 'Room number is required').max(20),
  floor: z.number().int().min(-2).max(100).default(0),
  sharingType: z.number().int().min(1).max(10).default(1),
  attachedBathroom: z.boolean().default(false),
  bedCount: z.number().int().min(0).max(20).default(1),
  bedRent: z.number().min(0).optional(),
});

export const roomUpdateSchema = z
  .object({
    roomNumber: z.string().trim().min(1).max(20),
    floor: z.number().int().min(-2).max(100),
    sharingType: z.number().int().min(1).max(10),
    attachedBathroom: z.boolean(),
  })
  .partial();

export const bedCreateSchema = z.object({
  bedNumber: z.number().int().min(1).optional(),
  label: z.string().trim().max(40).optional(),
  rent: z.number().min(0).nullable().optional(),
});

export const bedUpdateSchema = bedCreateSchema;

// ---------- Tenants ----------
export const tenantCreateSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name is required'),
  mobile,
  email: email.optional().or(z.literal('')),
  gender: z.enum(['Male', 'Female', 'Other']).optional(),
  emergencyContact: optionalString,
  bedId: uuid,
  monthlyRent: z.number().min(0),
  securityDeposit: z.number().min(0).default(0),
  joiningDate: dateStr,
  policeVerification: z.enum(['Pending', 'Verified', 'Not Required']).default('Pending'),
  // Optional: the owner may choose the first password; otherwise one is generated.
  password: password.optional(),
});

export const tenantUpdateSchema = z
  .object({
    fullName: z.string().trim().min(2),
    mobile,
    email: email.or(z.literal('')),
    gender: z.enum(['Male', 'Female', 'Other']),
    emergencyContact: optionalString,
    monthlyRent: z.number().min(0),
    securityDeposit: z.number().min(0),
    joiningDate: dateStr,
    policeVerification: z.enum(['Pending', 'Verified', 'Not Required']),
  })
  .partial();

export const tenantPasswordSchema = z.object({ password: password.optional() });
export const reallocateSchema = z.object({ bedId: uuid });

// ---------- Documents ----------
export const documentUploadSchema = z.object({
  tenantId: uuid.optional(),
  type: z.enum(DOCUMENT_TYPES).default('Other'),
  title: z.string().trim().max(120).optional().default(''),
});

// ---------- Meter ----------
export const meterReadingSchema = z.object({
  room: uuid,
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Use YYYY-MM'),
  previousReading: z.number().min(0),
  currentReading: z.number().min(0),
  ratePerUnit: z.number().min(0).optional(),
  occupants: z.number().int().min(1).optional(),
});

export const meterPublishSchema = z.object({ month: z.string().regex(/^\d{4}-\d{2}$/, 'Use YYYY-MM') });

// ---------- Complaints ----------
export const complaintCreateSchema = z.object({
  category: z.enum(['AC', 'WiFi', 'Water', 'Cleaning', 'Electrical', 'Plumbing', 'Other']),
  description: z.string().trim().min(5, 'Please describe the issue').max(1000),
});

export const complaintUpdateSchema = z.object({
  status: z.enum(['Submitted', 'Seen', 'In Progress', 'Resolved']),
  remarks: z.string().trim().max(500).optional(),
});

// ---------- Food ----------
export const mealOptOutSchema = z.object({ date: dateStr, mealType });

export const foodRatingSchema = z.object({
  date: dateStr,
  mealType,
  rating: z.number().int().min(1).max(5),
  review: z.string().trim().max(500).optional(),
});

export const foodMenuItemSchema = z.object({
  day: z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
  mealType,
  items: z.array(z.string().trim().min(1)).min(1, 'Add at least one item'),
  timing: z.string().trim().max(50).optional(),
});

// ---------- Notifications / Settings ----------
export const notificationPrefSchema = z.object({ whatsapp: z.boolean(), sms: z.boolean(), email: z.boolean() });

export const settingsUpdateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  address: z.string().trim().optional(),
  city: z.string().trim().optional(),
  contactEmail: z.string().trim().optional(),
  contactPhone: z.string().trim().optional(),
  electricityRate: z.number().min(0).optional(),
  ownerName: z.string().trim().optional(),
  timezone: z.string().trim().optional(),
  channels: z.object({ whatsapp: z.boolean().optional(), sms: z.boolean().optional(), email: z.boolean().optional() }).optional(),
  isDiscoverable: z.boolean().optional(),
  showAvailableBeds: z.boolean().optional(),
});

export const reminderScheduleSchema = z.object({
  complaintUnresolvedHours: z.number().int().min(1).optional(),
  retryAttempts: z.number().int().min(0).max(10).optional(),
});
