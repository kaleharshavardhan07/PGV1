import { z } from 'zod';

export const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid object id');
const optionalString = z.string().trim().max(500).optional().or(z.literal(''));
const mobile = z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number');
const email = z.string().email('Enter a valid email');
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');

// ---------- Auth ----------
export const ownerRegisterSchema = z.object({
  owner: z.object({
    fullName: z.string().trim().min(2, 'Full name is required'),
    mobile: mobile,
    email: email,
  }),
  pg: z.object({
    pgName: z.string().trim().min(2, 'PG name is required'),
    address: z.string().trim().min(5, 'Address is required'),
    city: z.string().trim().min(2, 'City is required'),
    state: z.string().trim().optional(),
    pinCode: z.string().trim().optional(),
    rooms: z.number().int().min(1).default(1),
    beds: z.number().int().min(1).default(1),
    description: z.string().trim().max(500).optional(),
    pgType: z.enum(['Boys', 'Girls', 'Co-living', 'Other']).default('Other'),
  }),
  planId: z.enum(['starter', 'growth', 'pro']).default('growth'),
  cycle: z.enum(['monthly', 'annual']).default('monthly'),
});

export const ownerSetPasswordSchema = z.object({
  registrationId: objectId,
  pgUsername: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z][a-z0-9_]{3,29}$/, 'Username must start with a letter, be 4-30 chars (letters, numbers, underscores)'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const ownerLoginSchema = z.object({
  identifier: z.string().trim().min(3), // pgUsername or ownerEmail
  password: z.string().min(1, 'Password is required'),
});

export const ownerResetSchema = z.object({
  identifier: z.string().trim().min(3),
  code: z.string().min(1, 'Reset code is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

export const tenantRegisterSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name is required'),
  mobile: mobile,
  email: email.optional().or(z.literal('')),
  gender: z.enum(['Male', 'Female', 'Other']).optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
});

export const tenantLoginSchema = z.object({
  mobile: mobile,
  password: z.string().optional(),
  otp: z.string().optional(),
}).refine((v) => v.password || v.otp, { message: 'Password or OTP is required' });

export const tenantOtpSchema = z.object({ mobile: mobile });

export const managerLoginSchema = z.object({
  email: email,
  password: z.string().min(1, 'Password is required'),
});

// ---------- Rooms / Beds ----------
export const roomCreateSchema = z.object({
  roomNumber: z.string().trim().min(1, 'Room number is required'),
  floor: z.number().int().optional().default(0),
  totalBeds: z.number().int().min(1),
  sharingType: z.number().int().min(1).max(10).default(1),
  attachedBathroom: z.boolean().default(false),
});

export const roomUpdateSchema = roomCreateSchema.partial();

export const bedUpdateSchema = z.object({
  status: z.enum(['occupied', 'vacant', 'notice']).optional(),
  tenant: objectId.nullable().optional(),
  vacantSince: dateStr.optional().nullable(),
});

// ---------- Tenants ----------
export const tenantCreateSchema = z.object({
  fullName: z.string().trim().min(2),
  mobile: mobile,
  email: optionalString,
  emergencyContact: optionalString,
  room: objectId,
  bedNumber: z.number().int().min(1),
  monthlyRent: z.number().min(0),
  securityDeposit: z.number().min(0).default(0),
  joiningDate: dateStr,
  idProofUrl: optionalString,
  photographUrl: optionalString,
  agreementUrl: optionalString,
  policeVerification: z.enum(['Pending', 'Verified', 'Not Required']).default('Pending'),
});

export const tenantUpdateSchema = z.object({
  fullName: z.string().trim().min(2).optional(),
  mobile: mobile.optional(),
  email: optionalString,
  emergencyContact: optionalString,
  monthlyRent: z.number().min(0).optional(),
  securityDeposit: z.number().min(0).optional(),
  policeVerification: z.enum(['Pending', 'Verified', 'Not Required']).optional(),
  idProofUrl: optionalString,
  photographUrl: optionalString,
  agreementUrl: optionalString,
});

// ---------- Payments / Meter ----------
export const paySchema = z.object({
  method: z.enum(['UPI', 'Card', 'Net Banking']).default('UPI'),
});

export const meterReadingSchema = z.object({
  room: objectId,
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Use YYYY-MM'),
  previousReading: z.number().min(0),
  currentReading: z.number().min(0),
  ratePerUnit: z.number().min(0).optional(),
  occupants: z.number().int().min(1).optional(),
  photoUrl: optionalString,
});

// ---------- Complaints ----------
export const complaintCreateSchema = z.object({
  category: z.enum(['AC', 'WiFi', 'Water', 'Cleaning', 'Electrical', 'Plumbing', 'Other']),
  description: z.string().trim().min(5, 'Please describe the issue'),
  imageUrl: optionalString,
});

export const complaintUpdateSchema = z.object({
  status: z.enum(['Submitted', 'Seen', 'In Progress', 'Resolved']),
  remarks: z.string().trim().max(500).optional(),
});

// ---------- Food ----------
export const mealOptOutSchema = z.object({
  date: dateStr,
  mealType: z.enum(['Breakfast', 'Lunch', 'Dinner']),
});

export const foodRatingSchema = z.object({
  date: dateStr,
  mealType: z.enum(['Breakfast', 'Lunch', 'Dinner']),
  rating: z.number().int().min(1).max(5),
  review: z.string().trim().max(500).optional(),
});

// ---------- Notifications ----------
export const notificationPrefSchema = z.object({
  whatsapp: z.boolean(),
  sms: z.boolean(),
  email: z.boolean(),
});

// ---------- Settings ----------
export const settingsUpdateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  address: z.string().trim().optional(),
  city: z.string().trim().optional(),
  contactEmail: z.string().trim().optional(),
  contactPhone: z.string().trim().optional(),
  electricityRate: z.number().min(0).optional(),
  foodCharge: z.number().min(0).optional(),
  ownerName: z.string().trim().optional(),
  timezone: z.string().trim().optional(),
  channels: z.object({
    whatsapp: z.boolean().optional(),
    sms: z.boolean().optional(),
    email: z.boolean().optional(),
  }).optional(),
});

export const reminderScheduleSchema = z.object({
  rentDaysBefore: z.array(z.number().int()).optional(),
  rentOverdueDays: z.array(z.number().int()).optional(),
  electricityDueDaysBefore: z.array(z.number().int()).optional(),
  electricityOverdueDays: z.array(z.number().int()).optional(),
  electricityDueInDays: z.number().int().min(1).optional(),
  complaintUnresolvedHours: z.number().int().min(1).optional(),
  gracePeriodDays: z.number().int().min(0).optional(),
  retryAttempts: z.number().int().min(0).optional(),
});

// ---------- Subscription ----------
export const checkoutSchema = z.object({
  planId: z.enum(['starter', 'growth', 'pro']),
  cycle: z.enum(['monthly', 'annual']).default('monthly'),
  method: z.enum(['UPI', 'Card', 'Net Banking']).default('UPI'),
});

export const cycleSchema = z.object({ cycle: z.enum(['monthly', 'annual']) });
export const autoRenewSchema = z.object({ autoRenew: z.boolean() });
export const renewSchema = z.object({ method: z.enum(['UPI', 'Card', 'Net Banking']).default('UPI') });

// ---------- Admission ----------
export const admissionCreateSchema = z.object({
  pg: objectId,
  fullName: z.string().trim().min(2).optional(),
  mobile: mobile.optional(),
  email: email.optional().or(z.literal('')),
  gender: z.enum(['Male', 'Female', 'Other']).optional(),
  emergencyContact: z.string().trim().optional(),
  preferredJoiningDate: dateStr,
  preferredRoomType: z.string().trim().optional(),
  preferredBed: objectId.optional(),
  occupants: z.number().int().min(1).default(1),
  additionalMessage: z.string().trim().max(500).optional(),
});

export const admissionApproveSchema = z.object({
  room: objectId,
  bed: objectId,
  monthlyRent: z.number().min(1, 'Monthly rent must be greater than zero'),
  securityDeposit: z.number().min(0).default(0),
});

export const admissionRejectSchema = z.object({
  reason: z.string().trim().min(3, 'Please provide a rejection reason'),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const planIdSchema = z.enum(['starter', 'growth', 'pro']);

export const foodMenuItemSchema = z.object({
  day: z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
  mealType: z.enum(['Breakfast', 'Lunch', 'Dinner']),
  items: z.array(z.string().trim()).min(1, 'Add at least one item'),
  timing: z.string().trim().max(50).optional(),
});

export const reallocateSchema = z.object({
  room: objectId,
  bedNumber: z.number().int().min(1),
});
