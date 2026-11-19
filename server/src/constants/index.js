// Shared enums and constants used across the backend.
export const ROLES = ['tenant', 'manager', 'owner'];

export const BED_STATUS = ['occupied', 'vacant', 'notice'];

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
  'Electricity',
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

export const DOCUMENT_TYPES = ['ID Proof', 'Photograph', 'Rental Agreement', 'Police Verification', 'Other'];
export const DOCUMENT_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
// Allowed upload types, with the leading file signature used to confirm the
// declared MIME type really matches the bytes.
export const DOCUMENT_MIME_TYPES = {
  'application/pdf': [0x25, 0x50, 0x44, 0x46],
  'image/jpeg': [0xff, 0xd8, 0xff],
  'image/png': [0x89, 0x50, 0x4e, 0x47],
  'image/webp': [0x52, 0x49, 0x46, 0x46],
};
