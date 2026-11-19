// Shared enums and constants used across the backend.
export const ROLES = ['tenant', 'manager', 'owner'];

export const BED_STATUS = ['occupied', 'vacant', 'notice', 'unavailable'];

export const COMPLAINT_CATEGORIES = [
  'AC',
  'WiFi',
  'Water',
  'Cleaning',
  'Electrical',
  'Plumbing',
  'Other',
];

export const COMPLAINT_STATUS = ['Submitted', 'Seen', 'In Progress', 'Resolved'];

export const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner'];
export const WEEK_DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export const NOTIFICATION_CATEGORIES = [
  'Expense',
  'Invoice',
  'Complaint',
  'Tenant',
  'Bed',
  'System',
];
export const NOTIFICATION_CHANNELS = ['In-App', 'WhatsApp', 'SMS', 'Email'];
export const DELIVERY_STATUS = ['Delivered', 'Simulated', 'Failed', 'Retried', 'Skipped'];

export const PG_TYPES = ['Boys', 'Girls', 'Co-living', 'Other'];
export const POLICE_VERIFICATION = ['Pending', 'Verified', 'Not Required'];
export const TENANT_STATUS = ['Active', 'Notice Period', 'Left'];

export const DOCUMENT_TYPES = ['ID Proof', 'Photograph', 'Rental Agreement', 'Police Verification', 'Receipt', 'Invoice', 'Other'];
export const DOCUMENT_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
// Allowed upload types, with the leading file signature used to confirm the
// declared MIME type really matches the bytes.
export const DOCUMENT_MIME_TYPES = {
  'application/pdf': [0x25, 0x50, 0x44, 0x46],
  'image/jpeg': [0xff, 0xd8, 0xff],
  'image/png': [0x89, 0x50, 0x4e, 0x47],
  'image/webp': [0x52, 0x49, 0x46, 0x46],
};

export const EXPENSE_CATEGORIES = ['Maintenance', 'Utilities', 'Groceries', 'Cleaning', 'Repairs', 'Salaries', 'Supplies', 'Other'];
export const EXPENSE_STATUS = ['Pending', 'Settled'];
export const INVOICE_STATUS = ['Draft', 'Issued', 'Paid', 'Cancelled'];

// Modules the platform admin can allow and the owner can switch on/off per PG.
// Core features (tenants, dashboard, notifications) are always on.
export const FEATURES = ['rooms', 'food', 'expenses', 'documents', 'billing', 'complaints', 'exports'];

// Operational permissions an owner can grant a manager. The owner always has all of them.
export const PERMISSIONS = ['tenants', 'rooms', 'food', 'expenses', 'billing', 'documents', 'complaints', 'exports'];
export const DEFAULT_MANAGER_PERMISSIONS = {
  tenants: true, rooms: false, food: true, expenses: false, billing: false, documents: true, complaints: true, exports: false,
};
