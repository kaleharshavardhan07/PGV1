import { z } from 'zod';
import { DOCUMENT_TYPES, EXPENSE_CATEGORIES, FEATURES, PERMISSIONS } from '../constants/index.js';

export const uuid = z.string().uuid('Invalid id');
const optionalString = z.string().trim().max(500).optional().or(z.literal(''));
const mobile = z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number');
const email = z.string().trim().email('Enter a valid email');
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');
const password = z.string().min(8, 'Password must be at least 8 characters').max(72, 'Password is too long');
const lat = z.number().min(-90).max(90);
const lng = z.number().min(-180).max(180);
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
    area: z.string().trim().max(100).optional(),
    state: z.string().trim().optional(),
    pinCode: z.string().trim().optional(),
    latitude: lat.optional(),
    longitude: lng.optional(),
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

const bulkRoom = z.object({
  roomNumber: z.string().trim().min(1).max(20),
  floor: z.number().int().min(-2).max(100).default(0),
  sharingType: z.number().int().min(1).max(10).default(1),
  attachedBathroom: z.boolean().default(false),
  bedCount: z.number().int().min(0).max(20),
  bedRent: z.number().min(0).optional(),
});

export const roomBulkSchema = z
  .object({ rooms: z.array(bulkRoom).min(1, 'Add at least one room').max(200, 'Create at most 200 rooms at a time') })
  .refine((v) => new Set(v.rooms.map((r) => r.roomNumber.toLowerCase())).size === v.rooms.length, { message: 'Room numbers must be unique within the batch' });

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

export const bedUpdateSchema = bedCreateSchema.extend({ unavailable: z.boolean().optional() });

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
  expenseId: uuid.optional(),
  invoiceId: uuid.optional(),
  type: z.enum(DOCUMENT_TYPES).default('Other'),
  title: z.string().trim().max(120).optional().default(''),
});

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
  ownerName: z.string().trim().optional(),
  timezone: z.string().trim().optional(),
  channels: z.object({ whatsapp: z.boolean().optional(), sms: z.boolean().optional(), email: z.boolean().optional() }).optional(),
  isDiscoverable: z.boolean().optional(),
  showAvailableBeds: z.boolean().optional(),
  contactPublic: z.boolean().optional(),
  description: z.string().trim().max(500).optional(),
  pgType: z.enum(['Boys', 'Girls', 'Co-living', 'Other']).optional(),
  location: z
    .object({
      address: z.string().trim().min(3).optional(),
      area: z.string().trim().max(100).optional(),
      city: z.string().trim().min(2).optional(),
      state: z.string().trim().max(100).optional(),
      pinCode: z.string().trim().max(10).optional(),
      latitude: lat.nullable().optional(),
      longitude: lng.nullable().optional(),
    })
    .optional(),
  featuresEnabled: z.object(Object.fromEntries(FEATURES.map((f) => [f, z.boolean().optional()]))).optional(),
});

export const reminderScheduleSchema = z.object({
  complaintUnresolvedHours: z.number().int().min(1).optional(),
  retryAttempts: z.number().int().min(0).max(10).optional(),
});

// ---------- Managers ----------
const permissionMap = z.object(Object.fromEntries(PERMISSIONS.map((p) => [p, z.boolean().optional()])));

export const managerCreateSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name is required'),
  email,
  mobile: mobile.optional().or(z.literal('')),
  password: password.optional(),
  permissions: permissionMap.optional(),
});

export const managerUpdateSchema = z
  .object({ fullName: z.string().trim().min(2), mobile: mobile.or(z.literal('')), isActive: z.boolean(), permissions: permissionMap })
  .partial();

// ---------- Expenses ----------
export const expenseCreateSchema = z.object({
  title: z.string().trim().min(2, 'Title is required').max(150),
  description: z.string().trim().max(1000).optional().default(''),
  amount: z.number().min(0, 'Amount cannot be negative').max(100000000),
  expenseDate: dateStr,
  category: z.enum(EXPENSE_CATEGORIES),
  status: z.enum(['Pending', 'Settled']).optional(),
  visibleToTenants: z.boolean().optional(),
  proofRequired: z.boolean().optional(),
});
export const expenseUpdateSchema = expenseCreateSchema.partial();

// ---------- Invoices ----------
const period = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use YYYY-MM');
export const invoiceCreateSchema = z
  .object({
    tenantIds: z.array(uuid).max(500).optional(),
    allActive: z.boolean().optional(),
    billingPeriod: period,
    description: z.string().trim().max(500).optional().default(''),
    amount: z.number().min(0).max(100000000),
    dueDate: dateStr,
    issue: z.boolean().optional(),
  })
  .refine((v) => v.allActive || (v.tenantIds && v.tenantIds.length), { message: 'Select at least one tenant', path: ['tenantIds'] });

export const invoiceUpdateSchema = z
  .object({ billingPeriod: period, description: z.string().trim().max(500), amount: z.number().min(0).max(100000000), dueDate: dateStr })
  .partial();

export const invoicePaidSchema = z.object({ paidOn: dateStr.optional(), paymentNote: z.string().trim().max(300).optional() });

// ---------- Admin ----------
export const adminLoginSchema = z.object({ email, password: z.string().min(1, 'Password is required') });
export const adminPgUpdateSchema = z.object({
  featuresAllowed: z.object(Object.fromEntries(FEATURES.map((f) => [f, z.boolean().optional()]))).optional(),
  isActive: z.boolean().optional(),
  isDiscoverable: z.boolean().optional(),
  approvalStatus: z.enum(['Pending', 'Approved', 'Rejected']).optional(),
});

// ---------- Find PG (public) ----------
const num = (schema) => z.preprocess((v) => (v === '' || v == null ? undefined : Number(v)), schema.optional());
export const pgSearchSchema = z.object({
  q: z.string().trim().max(100).optional(),
  city: z.string().trim().max(100).optional(),
  area: z.string().trim().max(100).optional(),
  pgType: z.enum(['Boys', 'Girls', 'Co-living', 'Other']).optional(),
  sharing: num(z.number().int().min(1).max(10)),
  minPrice: num(z.number().min(0)),
  maxPrice: num(z.number().min(0)),
  available: z.enum(['true', 'false']).optional(),
  lat: num(lat),
  lng: num(lng),
  radiusKm: num(z.number().min(1).max(500)),
  sort: z.enum(['nearest', 'price', 'availability', 'newest']).default('newest'),
  limit: num(z.number().int().min(1).max(50)),
  offset: num(z.number().int().min(0)),
});

export const enquirySchema = z.object({
  name: z.string().trim().min(2, 'Enter your name').max(100),
  mobile,
  email: email.optional().or(z.literal('')),
  message: z.string().trim().max(1000).optional().default(''),
});

export const enquiryStatusSchema = z.object({ status: z.enum(['New', 'Contacted', 'Closed']) });

export const exportQuerySchema = z.object({ format: z.enum(['csv', 'xlsx']).default('csv') });
