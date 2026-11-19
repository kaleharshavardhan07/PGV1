// Typed endpoint functions: one place for every backend route the UI uses.
import { api, API_BASE_URL, getToken } from './client';
import type {
  Bed, Complaint, DashboardSummary, Enquiry, Expense, FeatureMap, FoodMenuItem, FoodRating, Invoice, Manager, MealOptOut,
  Notification, NotificationLogEntry, NotificationPrefs, PGLocation, PGSettings, PGVisibility, PermissionMap, ReminderSchedule,
  Room, Tenant, TenantDocument, TenantSummary,
} from '../types';

export interface AuthResponse {
  token: string;
  user: { id: string; role: 'owner' | 'manager' | 'tenant' | 'admin'; pgId: string | null; [k: string]: unknown };
}

export interface Credentials {
  mobile?: string;
  email?: string;
  password: string;
}

export interface Context {
  role: string;
  pgId: string | null;
  pgName: string;
  features: Partial<FeatureMap>;
  permissions: Partial<PermissionMap>;
  tenant: Tenant | null;
}

// ---------- Find PG (public) ----------
export interface PgCard {
  id: string;
  pgName: string;
  pgUsername: string;
  description: string;
  address: string;
  area: string;
  city: string;
  state: string;
  pgType: 'Boys' | 'Girls' | 'Co-living' | 'Other';
  latitude: number | null;
  longitude: number | null;
  distanceKm: number | null;
  vacancy: { totalBeds: number; vacantBeds: number; minRent: number | null; maxRent: number | null; sharingTypes: number[] } | null;
  contact: { ownerName: string; phone: string | null; whatsapp: string | null };
}

export interface PgSearchParams {
  q?: string; city?: string; area?: string; pgType?: string; sharing?: number; minPrice?: number; maxPrice?: number;
  available?: boolean; lat?: number; lng?: number; radiusKm?: number; sort?: string; limit?: number; offset?: number;
}

export interface PgDetail {
  pg: PgCard & { vacancy: { totalBeds: number; vacantBeds: number } | null };
  rooms: {
    id: string; roomNumber: string; floor: number; sharingType: number; attachedBathroom: boolean; totalBeds: number; vacantBeds: number; rentFrom: number | null;
    beds: { id: string; bedNumber: number; label: string; rent: number | null; status: 'vacant' | 'occupied' | 'unavailable' }[];
  }[];
}

const qs = (params: object) => {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '' && v !== null) sp.set(k, String(v));
  const s = sp.toString();
  return s ? `?${s}` : '';
};

// ---------- Auth ----------
export const authApi = {
  ownerRegister: (body: Record<string, unknown>) => api.post<AuthResponse>('/auth/owner/register', body, { auth: false }),
  ownerLogin: (identifier: string, password: string) => api.post<AuthResponse>('/auth/owner/login', { identifier, password }, { auth: false }),
  managerLogin: (email: string, password: string) => api.post<AuthResponse>('/auth/manager/login', { email, password }, { auth: false }),
  tenantLogin: (mobile: string, password: string) => api.post<AuthResponse>('/auth/tenant/login', { mobile, password }, { auth: false }),
  adminLogin: (email: string, password: string) => api.post<AuthResponse>('/auth/admin/login', { email, password }, { auth: false }),
  usernameAvailable: (username: string) =>
    api.get<{ available: boolean; error: string | null; suggestions: string[] }>(`/auth/owner/username-available?username=${encodeURIComponent(username)}`, { auth: false }),
  changePassword: (currentPassword: string, newPassword: string) => api.post<{ message: string }>('/auth/change-password', { currentPassword, newPassword }),
  context: () => api.get<Context>('/me/context'),
};

export const publicApi = {
  search: (p: PgSearchParams) => api.get<{ total: number; pgs: PgCard[] }>(`/public/pgs${qs(p)}`, { auth: false }),
  locations: () => api.get<{ locations: { city: string; area: string; pgs: number }[] }>('/public/locations', { auth: false }),
  detail: (username: string) => api.get<PgDetail>(`/public/pg/${username}`, { auth: false }),
  enquire: (username: string, body: { name: string; mobile: string; email?: string; message?: string }) =>
    api.post<{ message: string }>(`/public/pg/${username}/enquiries`, body, { auth: false }),
};

// ---------- Platform admin ----------
export interface AdminPg {
  id: string; pgName: string; pgUsername: string; city: string; area: string; pgType: string; ownerName: string; ownerEmail: string;
  ownerMobile: string; isActive: boolean; isDiscoverable: boolean; rooms: number; beds: number; tenants: number; managers: number;
  createdAt: string; featuresAllowed: FeatureMap; featuresEnabled: FeatureMap; effectiveFeatures: FeatureMap;
}
export const adminApi = {
  overview: () =>
    api.get<{ overview: { pgs: number; activePgs: number; tenants: number; managers: number; beds: number; occupiedBeds: number; newEnquiries: number }; emailConfigured: boolean }>('/admin/overview'),
  pgs: (search = '') => api.get<{ pgs: AdminPg[] }>(`/admin/pgs${qs({ search })}`),
  updatePg: (id: string, body: Record<string, unknown>) => api.patch<{ pg: unknown }>(`/admin/pgs/${id}`, body),
};

// ---------- Rooms & beds ----------
export const roomApi = {
  list: () => api.get<{ rooms: Room[] }>('/rooms'),
  create: (body: Record<string, unknown>) => api.post<{ room: Room }>('/rooms', body),
  bulk: (rooms: Record<string, unknown>[]) => api.post<{ created: number }>('/rooms/bulk', { rooms }),
  update: (id: string, body: Record<string, unknown>) => api.patch<{ room: Room }>(`/rooms/${id}`, body),
  remove: (id: string) => api.del<{ message: string }>(`/rooms/${id}`),
  addBed: (roomId: string, body: Record<string, unknown>) => api.post<{ bed: Bed }>(`/rooms/${roomId}/beds`, body),
  updateBed: (id: string, body: Record<string, unknown>) => api.patch<{ bed: Bed }>(`/beds/${id}`, body),
  removeBed: (id: string) => api.del<{ message: string }>(`/beds/${id}`),
};

// ---------- Managers ----------
export const managerApi = {
  list: () => api.get<{ managers: Manager[] }>('/managers'),
  create: (body: Record<string, unknown>) => api.post<{ manager: Manager; credentials: Credentials }>('/managers', body),
  update: (id: string, body: Record<string, unknown>) => api.patch<{ manager: Manager }>(`/managers/${id}`, body),
  resetPassword: (id: string, password?: string) => api.post<{ credentials: Credentials }>(`/managers/${id}/reset-password`, password ? { password } : {}),
  remove: (id: string) => api.del<{ message: string }>(`/managers/${id}`),
};

// ---------- Tenants ----------
export const tenantApi = {
  list: () => api.get<{ tenants: Tenant[] }>('/tenants'),
  create: (body: Record<string, unknown>) => api.post<{ tenant: Tenant; credentials: Credentials }>('/tenants', body),
  update: (id: string, body: Record<string, unknown>) => api.patch<{ tenant: Tenant }>(`/tenants/${id}`, body),
  remove: (id: string) => api.del<{ message: string }>(`/tenants/${id}`),
  resetPassword: (id: string, password?: string) => api.post<{ credentials: Credentials }>(`/tenants/${id}/reset-password`, password ? { password } : {}),
  notice: (id: string) => api.post<{ tenant: Tenant }>(`/tenants/${id}/notice`),
  moveOut: (id: string) => api.post<{ tenant: Tenant }>(`/tenants/${id}/move-out`),
  reallocate: (id: string, bedId: string) => api.post<{ tenant: Tenant }>(`/tenants/${id}/reallocate`, { bedId }),
};

// ---------- Documents ----------
export const documentApi = {
  list: (filter: { tenant?: string; expense?: string; invoice?: string } = {}) => api.get<{ documents: TenantDocument[] }>(`/documents${qs(filter)}`),
  upload: (form: FormData) => api.upload<{ document: TenantDocument }>('/documents', form),
  remove: (id: string) => api.del<{ message: string }>(`/documents/${id}`),
  /** Short-lived URL that can be opened directly in a tab / <img>. */
  link: (id: string) => api.post<{ url: string }>(`/documents/${id}/link`),
};

// ---------- Expenses ----------
export const expenseApi = {
  list: () => api.get<{ expenses: Expense[] }>('/expenses'),
  get: (id: string) => api.get<{ expense: Expense; documents: TenantDocument[] }>(`/expenses/${id}`),
  create: (body: Record<string, unknown>) => api.post<{ expense: Expense }>('/expenses', body),
  update: (id: string, body: Record<string, unknown>) => api.patch<{ expense: Expense }>(`/expenses/${id}`, body),
  remove: (id: string) => api.del<{ message: string }>(`/expenses/${id}`),
};

// ---------- Invoices ----------
export const invoiceApi = {
  list: () => api.get<{ invoices: Invoice[] }>('/invoices'),
  get: (id: string) => api.get<{ invoice: Invoice; documents: TenantDocument[] }>(`/invoices/${id}`),
  create: (body: Record<string, unknown>) => api.post<{ invoices: Invoice[] }>('/invoices', body),
  update: (id: string, body: Record<string, unknown>) => api.patch<{ invoice: Invoice }>(`/invoices/${id}`, body),
  action: (id: string, action: 'issue' | 'mark-paid' | 'reopen' | 'cancel', body: Record<string, unknown> = {}) =>
    api.post<{ invoice: Invoice }>(`/invoices/${id}/${action}`, body),
  remove: (id: string) => api.del<{ message: string }>(`/invoices/${id}`),
};

// ---------- Complaints ----------
export const complaintApi = {
  list: () => api.get<{ complaints: Complaint[] }>('/complaints'),
  create: (body: Record<string, unknown>) => api.post<{ complaint: Complaint }>('/complaints', body),
  updateStatus: (id: string, status: string, remarks?: string) => api.patch<{ complaint: Complaint }>(`/complaints/${id}/status`, { status, remarks }),
};

// ---------- Food ----------
export const foodApi = {
  menu: () => api.get<{ menu: FoodMenuItem[] }>('/food/menu'),
  upsertMenu: (body: Record<string, unknown>) => api.post<{ item: FoodMenuItem }>('/food/menu', body),
  removeMenu: (id: string) => api.del<{ message: string }>(`/food/menu/${id}`),
  ratings: () => api.get<{ ratings: FoodRating[] }>('/food/ratings'),
  optOuts: () => api.get<{ optOuts: MealOptOut[] }>('/food/optouts'),
  addOptOut: (date: string, mealType: string) => api.post<{ optOut: MealOptOut }>('/food/optout', { date, mealType }),
  removeOptOut: (id: string) => api.del<{ message: string }>(`/food/optout/${id}`),
  rate: (date: string, mealType: string, rating: number, review?: string) => api.post<{ rating: FoodRating }>('/food/rate', { date, mealType, rating, review }),
};

// ---------- Enquiries ----------
export const enquiryApi = {
  list: () => api.get<{ enquiries: Enquiry[] }>('/enquiries'),
  update: (id: string, status: string) => api.patch<{ enquiry: Enquiry }>(`/enquiries/${id}`, { status }),
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
export interface SettingsPayload {
  settings: PGSettings;
  reminderSchedule: ReminderSchedule;
  visibility: PGVisibility;
  location: PGLocation;
  features: { allowed: FeatureMap; enabled: FeatureMap; effective: FeatureMap };
  notificationPrefs: NotificationPrefs[];
}
export const settingsApi = {
  get: () => api.get<SettingsPayload>('/settings'),
  update: (body: Record<string, unknown>) => api.patch<{ settings: PGSettings }>('/settings', body),
  updateSchedule: (body: Record<string, unknown>) => api.put<{ reminderSchedule: ReminderSchedule }>('/reminder-schedule', body),
  updateTenantPref: (tenantId: string, body: Record<string, unknown>) => api.put<{ success: boolean }>(`/settings/notification-prefs/${tenantId}`, body),
};

export const dashboardApi = {
  summary: () => api.get<{ summary: DashboardSummary | TenantSummary }>('/dashboard/summary'),
};

/** Download an export. The file needs the bearer token, so it is fetched and saved as a blob. */
export async function downloadExport(dataset: string, format: 'csv' | 'xlsx'): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/export/${dataset}?format=${format}`, { headers: { Authorization: `Bearer ${getToken() ?? ''}` } });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message ?? `Export failed (${res.status})`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${dataset}-${new Date().toISOString().split('T')[0]}.${format}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
