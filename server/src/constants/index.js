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

export const PAYMENT_METHODS = ['UPI', 'Card', 'Net Banking'];
export const PAYMENT_STATUS = ['Paid', 'Pending', 'Overdue'];
export const PAYMENT_TYPES = ['Rent', 'Electricity', 'Deposit'];

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

export const ADMISSION_STATUS = ['Pending', 'Approved', 'Rejected'];
export const MEMBERSHIP_STATUS = ['Active', 'Ended', 'Deactivated'];
export const REGISTRATION_STATUS = [
  'Awaiting Payment',
  'Payment Pending Verification',
  'Payment Failed',
  'Payment Verified',
  'Username Confirmed',
  'Active',
];

export const SUBSCRIPTION_STATUS = [
  'Trial',
  'Active',
  'Payment Pending',
  'Past Due',
  'Suspended',
  'Cancelled',
  'Expired',
];
export const BILLING_CYCLES = ['monthly', 'annual'];

export const NOTIFICATION_CATEGORIES = [
  'Rent',
  'Electricity',
  'Complaint',
  'Tenant',
  'Bed',
  'Subscription',
  'Admission',
  'System',
];
export const NOTIFICATION_CHANNELS = ['In-App', 'WhatsApp', 'SMS', 'Email'];
export const DELIVERY_STATUS = ['Delivered', 'Simulated', 'Failed', 'Retried', 'Skipped'];

export const PG_TYPES = ['Boys', 'Girls', 'Co-living', 'Other'];
export const POLICE_VERIFICATION = ['Pending', 'Verified', 'Not Required'];
export const TENANT_STATUS = ['Active', 'Notice Period', 'Left'];
