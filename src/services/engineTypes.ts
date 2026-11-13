// Structural view of the app data used by the notification engine.
// Kept separate to avoid circular imports with the store.

import type {
  Bed,
  Complaint,
  MeterReading,
  Notification,
  NotificationLogEntry,
  NotificationPrefs,
  Payment,
  PGSettings,
  ReminderSchedule,
  Room,
  Subscription,
  Tenant,
} from '../types';

export interface AppDataLike {
  settings: PGSettings;
  tenants: Tenant[];
  rooms: Room[];
  beds: Bed[];
  meterReadings: MeterReading[];
  payments: Payment[];
  complaints: Complaint[];
  notifications: Notification[];
  notificationLog: NotificationLogEntry[];
  notificationPrefs: NotificationPrefs[];
  reminderSchedule: ReminderSchedule;
  subscription: Subscription;
}
