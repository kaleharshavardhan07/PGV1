// Typed endpoint functions: one place for every backend route the UI uses.
import { api } from './client';
import type {
  Bed, Complaint, DashboardSummary, FoodMenuItem, FoodRating, MealOptOut, MeterReading, Notification,
  NotificationLogEntry, NotificationPrefs, PGSettings, PGVisibility, ReminderSchedule, Room, Tenant, TenantDocument,
} from '../types';

export interface AuthResponse {
  token: string;
  user: { id: string; role: 'owner' | 'manager' | 'tenant'; pgId: string | null; [k: string]: unknown };
}

export interface Credentials {
  mobile: string;
  password: string;
}

export interface PublicVacancy {
  pg: { id: string; pgName: string; pgUsername: string; address: string; city: string; state: string; pgType: string };
  rooms: {
    id: string; roomNumber: string; floor: number; sharingType: number; attachedBathroom: boolean;
    totalBeds: number; vacantBeds: number; rentFrom: number | null;
    beds: { id: string; bedNumber: number; label: string; status: 'vacant' | 'occupied'; rent: number | null }[];
  }[];
}

// ---------- Auth ----------
export const authApi = {
  ownerRegister: (body: Record<string, unknown>) => api.post<AuthResponse>('/auth/owner/register', body, { auth: false }),
  ownerLogin: (identifier: string, password: string) =>
    api.post<AuthResponse>('/auth/owner/login', { identifier, password }, { auth: false }),
  managerLogin: (email: string, password: string) =>
    api.post<AuthResponse>('/auth/manager/login', { email, password }, { auth: false }),
  tenantLogin: (mobile: string, password: string) =>
    api.post<AuthResponse>('/auth/tenant/login', { mobile, password }, { auth: false }),
  usernameAvailable: (username: string) =>
    api.get<{ available: boolean; error: string | null; suggestions: string[] }>(
      `/auth/owner/username-available?username=${encodeURIComponent(username)}`,
      { auth: false }
    ),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post<{ message: string }>('/auth/change-password', { currentPassword, newPassword }),
  context: () => api.get<{ role: string; pgId: string; pgName: string; tenant: Tenant | null }>('/me/context'),
};

// ---------- Public ----------
export const publicApi = {
  pgs: () => api.get<{ pgs: { id: string; pgName: string; pgUsername: string; city: string; pgType: string }[] }>('/public/pgs', { auth: false }),
  vacancy: (username: string) => api.get<PublicVacancy>(`/public/pg/${username}/vacancy`, { auth: false }),
};

// ---------- Rooms & beds ----------
export const roomApi = {
  list: () => api.get<{ rooms: Room[] }>('/rooms'),
  create: (body: Record<string, unknown>) => api.post<{ room: Room }>('/rooms', body),
  update: (id: string, body: Record<string, unknown>) => api.patch<{ room: Room }>(`/rooms/${id}`, body),
  remove: (id: string) => api.del<{ message: string }>(`/rooms/${id}`),
  addBed: (roomId: string, body: Record<string, unknown>) => api.post<{ bed: Bed }>(`/rooms/${roomId}/beds`, body),
  updateBed: (id: string, body: Record<string, unknown>) => api.patch<{ bed: Bed }>(`/beds/${id}`, body),
  removeBed: (id: string) => api.del<{ message: string }>(`/beds/${id}`),
};

// ---------- Tenants ----------
export const tenantApi = {
  list: () => api.get<{ tenants: Tenant[] }>('/tenants'),
  create: (body: Record<string, unknown>) => api.post<{ tenant: Tenant; credentials: Credentials }>('/tenants', body),
  update: (id: string, body: Record<string, unknown>) => api.patch<{ tenant: Tenant }>(`/tenants/${id}`, body),
  remove: (id: string) => api.del<{ message: string }>(`/tenants/${id}`),
  resetPassword: (id: string, password?: string) =>
    api.post<{ credentials: Credentials }>(`/tenants/${id}/reset-password`, password ? { password } : {}),
  notice: (id: string) => api.post<{ tenant: Tenant }>(`/tenants/${id}/notice`),
  moveOut: (id: string) => api.post<{ tenant: Tenant }>(`/tenants/${id}/move-out`),
  reallocate: (id: string, bedId: string) => api.post<{ tenant: Tenant }>(`/tenants/${id}/reallocate`, { bedId }),
};

// ---------- Documents ----------
export const documentApi = {
  list: () => api.get<{ documents: TenantDocument[] }>('/documents'),
  upload: (form: FormData) => api.upload<{ document: TenantDocument }>('/documents', form),
  remove: (id: string) => api.del<{ message: string }>(`/documents/${id}`),
  /** Short-lived URL that can be opened directly in a tab / <img>. */
  link: (id: string) => api.post<{ url: string }>(`/documents/${id}/link`),
};

// ---------- Meter ----------
export const meterApi = {
  list: () => api.get<{ readings: MeterReading[] }>('/meter'),
  save: (body: Record<string, unknown>) => api.post<{ reading: MeterReading }>('/meter', body),
  publish: (month: string) => api.post<{ publishedReadings: number }>('/meter/publish', { month }),
};

// ---------- Complaints ----------
export const complaintApi = {
  list: () => api.get<{ complaints: Complaint[] }>('/complaints'),
  create: (body: Record<string, unknown>) => api.post<{ complaint: Complaint }>('/complaints', body),
  updateStatus: (id: string, status: string, remarks?: string) =>
    api.patch<{ complaint: Complaint }>(`/complaints/${id}/status`, { status, remarks }),
};

// ---------- Food ----------
export const foodApi = {
  menu: () => api.get<{ menu: FoodMenuItem[] }>('/food/menu'),
  upsertMenu: (body: Record<string, unknown>) => api.post<{ item: FoodMenuItem }>('/food/menu', body),
  ratings: () => api.get<{ ratings: FoodRating[] }>('/food/ratings'),
  optOuts: () => api.get<{ optOuts: MealOptOut[] }>('/food/optouts'),
  addOptOut: (date: string, mealType: string) => api.post<{ optOut: MealOptOut }>('/food/optout', { date, mealType }),
  removeOptOut: (id: string) => api.del<{ message: string }>(`/food/optout/${id}`),
  rate: (date: string, mealType: string, rating: number, review?: string) =>
    api.post<{ rating: FoodRating }>('/food/rate', { date, mealType, rating, review }),
};

// ---------- Notifications ----------
export const notificationApi = {
  list: () => api.get<{ notifications: Notification[]; unread: number }>('/notifications'),
  markRead: (id: string) => api.patch<{ success: boolean }>(`/notifications/${id}/read`),
  markAllRead: () => api.patch<{ updated: number }>('/notifications/read-all'),
  prefs: () => api.get<{ prefs: Omit<NotificationPrefs, 'tenantId'> }>('/notifications/prefs'),
  updatePrefs: (body: { whatsapp: boolean; sms: boolean; email: boolean }) => api.put<{ success: boolean }>('/notifications/prefs', body),
  run: () => api.post<{ emitted: number }>('/notifications/run'),
  log: () => api.get<{ log: NotificationLogEntry[] }>('/notifications/log'),
};

// ---------- Settings ----------
export const settingsApi = {
  get: () =>
    api.get<{ settings: PGSettings; reminderSchedule: ReminderSchedule; visibility: PGVisibility; notificationPrefs: NotificationPrefs[] }>('/settings'),
  update: (body: Record<string, unknown>) => api.patch<{ settings: PGSettings }>('/settings', body),
  updateSchedule: (body: Record<string, unknown>) => api.put<{ reminderSchedule: ReminderSchedule }>('/reminder-schedule', body),
  updateTenantPref: (tenantId: string, body: Record<string, unknown>) => api.put<{ success: boolean }>(`/settings/notification-prefs/${tenantId}`, body),
};

export const dashboardApi = {
  summary: () => api.get<{ summary: DashboardSummary }>('/dashboard/summary'),
};
