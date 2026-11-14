// Typed API endpoint functions — one place for every backend route the UI uses.
import { api } from './client';
import type {
  ApiAdmissionRequest,
  ApiAuthResponse,
  ApiBed,
  ApiComplaint,
  ApiContext,
  ApiFoodMenuItem,
  ApiFoodRating,
  ApiMealOptOut,
  ApiMeterReading,
  ApiNotification,
  ApiNotificationLog,
  ApiNotificationPref,
  ApiPayment,
  ApiPublicVacancy,
  ApiRegistration,
  ApiReminderSchedule,
  ApiRoom,
  ApiSettings,
  ApiSubscription,
  ApiTenant,
} from './types';

// ---------- Auth ----------
export const authApi = {
  ownerLogin: (identifier: string, password: string) =>
    api.post<ApiAuthResponse>('/auth/owner/login', { identifier, password }, { auth: false }),

  ownerResetPassword: (identifier: string, code: string, newPassword: string) =>
    api.post<{ success: true; message: string }>(
      '/auth/owner/reset-password',
      { identifier, code, newPassword },
      { auth: false }
    ),

  ownerRegister: (payload: {
    owner: { fullName: string; mobile: string; email: string };
    pg: Record<string, unknown>;
    planId: string;
    cycle: string;
  }) =>
    api.post<{
      registration: ApiRegistration;
      suggestedUsernames: string[];
      order: { orderId: string; amount: number };
    }>('/auth/owner/register', payload, { auth: false }),

  ownerCompletePayment: (registrationId: string, orderId: string, outcome: 'success' | 'failure') =>
    api.post<{ registrationId: string; status: string; pgId: string; suggestedUsernames: string[] }>(
      '/auth/owner/complete-payment',
      { registrationId, orderId, outcome },
      { auth: false }
    ),

  ownerActivate: (registrationId: string, pgUsername: string, password: string) =>
    api.post<ApiAuthResponse>('/auth/owner/activate', { registrationId, pgUsername, password }, { auth: false }),

  ownerRegistration: (id: string) =>
    api.get<{ registration: ApiRegistration & { suggestedUsernames?: string[]; pgId?: string; pgUsername?: string } }>(
      `/auth/owner/registration/${id}`,
      { auth: false }
    ),

  usernameAvailable: (username: string) =>
    api.get<{ available: boolean; error: string | null; suggestions: string[] }>(
      `/auth/owner/username-available?username=${encodeURIComponent(username)}`,
      { auth: false }
    ),

  tenantLogin: (mobile: string, credential: { otp?: string; password?: string }) =>
    api.post<ApiAuthResponse>('/auth/tenant/login', { mobile, ...credential }, { auth: false }),

  tenantRegister: (payload: {
    fullName: string;
    mobile: string;
    email?: string;
    gender?: string;
    password?: string;
  }) => api.post<ApiAuthResponse>('/auth/tenant/register', payload, { auth: false }),

  tenantSendOtp: (mobile: string) =>
    api.post<{ success: true; message: string; demoOtp?: string }>('/auth/tenant/otp', { mobile }, { auth: false }),

  managerLogin: (email: string, password: string) =>
    api.post<ApiAuthResponse>('/auth/manager/login', { email, password }, { auth: false }),

  me: () => api.get<{ success: true; user: Record<string, unknown> }>('/auth/me'),

  context: () => api.get<ApiContext>('/me/context'),
};

// ---------- Public ----------
export const publicApi = {
  pgs: () => api.get<{ pgs: Record<string, unknown>[] }>('/public/pgs', { auth: false }),
  pg: (username: string) => api.get<{ pg: Record<string, unknown> }>(`/public/pg/${username}`, { auth: false }),
  vacancy: (username: string) =>
    api.get<ApiPublicVacancy>(`/public/pg/${username}/vacancy`, { auth: false }),
};

// ---------- Rooms & beds ----------
export const roomApi = {
  list: () => api.get<{ rooms: ApiRoom[] }>('/rooms'),
  create: (body: Record<string, unknown>) => api.post<{ room: ApiRoom }>('/rooms', body),
  update: (id: string, body: Record<string, unknown>) => api.patch<{ room: ApiRoom }>(`/rooms/${id}`, body),
  remove: (id: string) => api.del<{ message: string }>(`/rooms/${id}`),
  beds: () => api.get<{ beds: ApiBed[] }>('/beds'),
  updateBed: (id: string, body: Record<string, unknown>) => api.patch<{ bed: ApiBed }>(`/beds/${id}`, body),
};

// ---------- Tenants ----------
export const tenantApi = {
  list: (query = '') => api.get<{ tenants: ApiTenant[] }>(`/tenants${query}`),
  get: (id: string) => api.get<{ tenant: ApiTenant }>(`/tenants/${id}`),
  create: (body: Record<string, unknown>) => api.post<{ tenant: ApiTenant }>('/tenants', body),
  update: (id: string, body: Record<string, unknown>) => api.patch<{ tenant: ApiTenant }>(`/tenants/${id}`, body),
  remove: (id: string) => api.del<{ message: string }>(`/tenants/${id}`),
  notice: (id: string) => api.post<{ tenant: ApiTenant }>(`/tenants/${id}/notice`),
  moveOut: (id: string) => api.post<{ tenant: ApiTenant }>(`/tenants/${id}/move-out`),
  reallocate: (id: string, room: string, bedNumber: number) =>
    api.post<{ tenant: ApiTenant }>(`/tenants/${id}/reallocate`, { room, bedNumber }),
};

// ---------- Admissions ----------
export const admissionApi = {
  list: (status?: string) => api.get<{ requests: ApiAdmissionRequest[] }>(`/admissions${status ? `?status=${status}` : ''}`),
  mine: () => api.get<{ requests: ApiAdmissionRequest[] }>('/admissions/me'),
  submit: (body: Record<string, unknown>) => api.post<{ request: ApiAdmissionRequest }>('/admissions', body),
  approve: (id: string, body: { room: string; bed: string; monthlyRent: number; securityDeposit: number }) =>
    api.patch<{ request: ApiAdmissionRequest }>(`/admissions/${id}/approve`, body),
  reject: (id: string, reason: string) =>
    api.patch<{ request: ApiAdmissionRequest }>(`/admissions/${id}/reject`, { reason }),
};

// ---------- Payments ----------
export const paymentApi = {
  list: () => api.get<{ payments: ApiPayment[] }>('/payments'),
  pay: (id: string, method: string) => api.post<{ payment: ApiPayment }>(`/payments/${id}/pay`, { method }),
  remind: () => api.post<{ reminded: number }>('/payments/remind'),
  outstanding: () => api.get<{ summary: Record<string, unknown> }>('/payments/outstanding'),
};

// ---------- Meter ----------
export const meterApi = {
  list: () => api.get<{ readings: ApiMeterReading[] }>('/meter'),
  save: (body: Record<string, unknown>) => api.post<{ reading: ApiMeterReading }>('/meter', body),
  publish: (month: string) =>
    api.post<{ publishedReadings: number; tenantBillsCreated: number }>('/meter/publish', { month }),
};

// ---------- Complaints ----------
export const complaintApi = {
  list: () => api.get<{ complaints: ApiComplaint[] }>('/complaints'),
  create: (body: Record<string, unknown>) => api.post<{ complaint: ApiComplaint }>('/complaints', body),
  updateStatus: (id: string, status: string, remarks?: string) =>
    api.patch<{ complaint: ApiComplaint }>(`/complaints/${id}/status`, { status, remarks }),
};

// ---------- Food ----------
export const foodApi = {
  menu: () => api.get<{ menu: ApiFoodMenuItem[] }>('/food/menu'),
  upsertMenu: (body: Record<string, unknown>) => api.post<{ item: ApiFoodMenuItem }>('/food/menu', body),
  ratings: () => api.get<{ ratings: ApiFoodRating[] }>('/food/ratings'),
  optOuts: () => api.get<{ optOuts: ApiMealOptOut[] }>('/food/optouts'),
  addOptOut: (date: string, mealType: string) => api.post<{ optOut: ApiMealOptOut }>('/food/optout', { date, mealType }),
  removeOptOut: (id: string) => api.del<{ message: string }>(`/food/optout/${id}`),
  rate: (date: string, mealType: string, rating: number, review?: string) =>
    api.post<{ rating: ApiFoodRating }>('/food/rate', { date, mealType, rating, review }),
};

// ---------- Notifications ----------
export const notificationApi = {
  list: () => api.get<{ notifications: ApiNotification[]; unread: number }>('/notifications'),
  markRead: (id: string) => api.patch<{ notification: ApiNotification }>(`/notifications/${id}/read`),
  markAllRead: () => api.patch<{ updated: number }>('/notifications/read-all'),
  prefs: () => api.get<{ prefs: ApiNotificationPref }>('/notifications/prefs'),
  updatePrefs: (body: { whatsapp: boolean; sms: boolean; email: boolean }) =>
    api.put<{ prefs: ApiNotificationPref }>('/notifications/prefs', body),
  run: () => api.post<{ emitted: number }>('/notifications/run'),
  log: () => api.get<{ log: ApiNotificationLog[] }>('/notifications/log'),
};

// ---------- Settings ----------
export const settingsApi = {
  get: () =>
    api.get<{
      settings: ApiSettings;
      reminderSchedule: ApiReminderSchedule;
      subscription: ApiSubscription;
      notificationPrefs: ApiNotificationPref[];
    }>('/settings'),
  update: (body: Record<string, unknown>) => api.patch<{ settings: ApiSettings }>('/settings', body),
  updateSchedule: (body: Record<string, unknown>) =>
    api.put<{ reminderSchedule: ApiReminderSchedule }>('/reminder-schedule', body),
  updateTenantPref: (tenantId: string, body: Record<string, unknown>) =>
    api.put<{ prefs: ApiNotificationPref }>(`/settings/notification-prefs/${tenantId}`, body),
};

// ---------- Subscription ----------
export const subscriptionApi = {
  get: () => api.get<{ subscription: ApiSubscription }>('/subscription'),
  checkout: (planId: string, cycle: string, method: string) =>
    api.post<{ subscription: ApiSubscription }>('/subscription/checkout', { planId, cycle, method }),
  upgrade: (planId: string) => api.post<{ subscription: ApiSubscription }>('/subscription/upgrade', { planId }),
  cycle: (cycle: string) => api.post<{ subscription: ApiSubscription }>('/subscription/cycle', { cycle }),
  renew: (method: string) => api.post<{ subscription: ApiSubscription }>('/subscription/renew', { method }),
  retry: (method: string) => api.post<{ subscription: ApiSubscription }>('/subscription/retry', { method }),
  autoRenew: (autoRenew: boolean) =>
    api.post<{ subscription: ApiSubscription }>('/subscription/auto-renew', { autoRenew }),
};

export const dashboardApi = {
  summary: () => api.get<{ summary: Record<string, unknown> }>('/dashboard/summary'),
};
