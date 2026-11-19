// API-backed application store.
//
// One module-level store (useSyncExternalStore) holds the session and a
// role-scoped snapshot of server data. Every mutation calls the API and then
// reloads the snapshot, so the server stays the single source of truth.
import { useMemo, useSyncExternalStore } from 'react';
import { errorMessage, sessionStore, type Session } from '../api/client';
import * as ep from '../api/endpoints';
import type {
  Bed, Complaint, DashboardSummary, FoodMenuItem, FoodRating, MealOptOut, MeterReading, Notification,
  NotificationLogEntry, NotificationPrefs, PGSettings, PGVisibility, ReminderSchedule, Room, Tenant, TenantDocument,
} from '../types';

export interface AppDataState {
  activeRole: 'tenant' | 'manager' | 'owner' | null;
  activePgId: string;
  activeTenantId: string;
  settings: PGSettings;
  visibility: PGVisibility;
  reminderSchedule: ReminderSchedule;
  summary: DashboardSummary | null;
  rooms: Room[];
  beds: Bed[]; // flattened from rooms
  tenants: Tenant[];
  documents: TenantDocument[];
  meterReadings: MeterReading[];
  complaints: Complaint[];
  foodMenu: FoodMenuItem[];
  foodRatings: FoodRating[];
  mealOptOuts: MealOptOut[];
  notifications: Notification[];
  notificationLog: NotificationLogEntry[];
  notificationPrefs: NotificationPrefs[];
}

export type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

interface StoreState {
  data: AppDataState;
  session: Session | null;
  loading: boolean;
  ready: boolean;
  error: string | null;
}

const emptyData = (): AppDataState => ({
  activeRole: null,
  activePgId: '',
  activeTenantId: '',
  settings: {
    name: '', address: '', city: '', contactEmail: '', contactPhone: '', electricityRate: 0,
    ownerName: '', timezone: 'Asia/Kolkata', channels: { whatsapp: true, sms: true, email: true },
  },
  visibility: { isDiscoverable: true, showAvailableBeds: true, pgUsername: '' },
  reminderSchedule: { complaintUnresolvedHours: 48, retryAttempts: 2 },
  summary: null,
  rooms: [],
  beds: [],
  tenants: [],
  documents: [],
  meterReadings: [],
  complaints: [],
  foodMenu: [],
  foodRatings: [],
  mealOptOuts: [],
  notifications: [],
  notificationLog: [],
  notificationPrefs: [],
});

let state: StoreState = { data: emptyData(), session: sessionStore.load(), loading: false, ready: false, error: null };
const listeners = new Set<() => void>();

const setState = (patch: Partial<StoreState>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const getSnapshot = () => state;

/** Resolve a settled promise, falling back to a default so one failing endpoint cannot blank the app. */
const pick = <T,>(r: PromiseSettledResult<T>, fallback: T): T => (r.status === 'fulfilled' ? r.value : fallback);

/** Load everything the current role can see. */
export async function refresh() {
  const session = sessionStore.load();
  if (!session?.role) {
    if (session) sessionStore.clear();
    setState({ data: emptyData(), session: null, loading: false, ready: true, error: null });
    return;
  }

  setState({ loading: true, session });
  try {
    const role = session.role;
    const ctx = await ep.authApi.context();
    const staff = role !== 'tenant';

    const [rooms, settings, notifs, complaints, meter, menu, ratings, docs] = await Promise.allSettled([
      ep.roomApi.list(), ep.settingsApi.get(), ep.notificationApi.list(), ep.complaintApi.list(),
      ep.meterApi.list(), ep.foodApi.menu(), ep.foodApi.ratings(), ep.documentApi.list(),
    ]);

    const data = emptyData();
    data.activeRole = role;
    data.activePgId = ctx.pgId;
    data.activeTenantId = ctx.tenant?.id ?? '';
    data.rooms = pick(rooms, { rooms: [] }).rooms;
    data.beds = data.rooms.flatMap((r) => r.beds);
    data.notifications = pick(notifs, { notifications: [], unread: 0 }).notifications;
    data.complaints = pick(complaints, { complaints: [] }).complaints;
    data.meterReadings = pick(meter, { readings: [] }).readings;
    data.foodMenu = pick(menu, { menu: [] }).menu;
    data.foodRatings = pick(ratings, { ratings: [] }).ratings;
    data.documents = pick(docs, { documents: [] }).documents;

    const cfg = pick(settings, undefined as Awaited<ReturnType<typeof ep.settingsApi.get>> | undefined);
    if (cfg) {
      data.settings = cfg.settings;
      data.reminderSchedule = cfg.reminderSchedule;
      data.visibility = cfg.visibility;
      data.notificationPrefs = cfg.notificationPrefs;
    } else {
      data.settings.name = ctx.pgName;
    }

    if (staff) {
      const [tenants, log, summary] = await Promise.allSettled([
        ep.tenantApi.list(), ep.notificationApi.log(), ep.dashboardApi.summary(),
      ]);
      data.tenants = pick(tenants, { tenants: [] }).tenants;
      data.notificationLog = pick(log, { log: [] }).log;
      data.summary = pick(summary, undefined as { summary: DashboardSummary } | undefined)?.summary ?? null;
    } else {
      data.tenants = ctx.tenant ? [ctx.tenant] : [];
      const [optOuts, prefs] = await Promise.allSettled([ep.foodApi.optOuts(), ep.notificationApi.prefs()]);
      data.mealOptOuts = pick(optOuts, { optOuts: [] }).optOuts;
      const mine = pick(prefs, undefined as Awaited<ReturnType<typeof ep.notificationApi.prefs>> | undefined)?.prefs;
      if (mine && ctx.tenant) data.notificationPrefs = [{ tenantId: ctx.tenant.id, ...mine }];
    }

    setState({ data, session, loading: false, ready: true, error: null });
  } catch (err) {
    // An invalid/expired/deactivated session drops to the login screen instead of looping.
    const expired = (err as { status?: number })?.status === 401;
    if (expired) sessionStore.clear();
    setState({
      data: emptyData(), session: expired ? null : session, loading: false, ready: true, error: errorMessage(err),
    });
  }
}

/** Run a mutation, reload the snapshot, and return a uniform result. */
async function mutate<T extends object>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    const value = await fn();
    await refresh();
    return { ok: true, ...value };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

const startSession = async (res: ep.AuthResponse) => {
  sessionStore.save({ token: res.token, role: res.user.role, pgId: res.user.pgId, user: res.user });
  await refresh();
};

const login = async (fn: () => Promise<ep.AuthResponse>): Promise<Result> => {
  try {
    await startSession(await fn());
    return { ok: true };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
};

// ============================== Actions ==============================
const actions = {
  refresh,

  logout: () => {
    sessionStore.clear();
    state = { data: emptyData(), session: null, loading: false, ready: true, error: null };
    listeners.forEach((l) => l());
  },

  // ---------- Auth ----------
  ownerLogin: (identifier: string, password: string) => login(() => ep.authApi.ownerLogin(identifier.trim(), password)),
  managerLogin: (email: string, password: string) => login(() => ep.authApi.managerLogin(email.trim(), password)),
  tenantLogin: (mobile: string, password: string) => login(() => ep.authApi.tenantLogin(mobile.trim(), password)),
  ownerRegister: (payload: Record<string, unknown>) => login(() => ep.authApi.ownerRegister(payload)),
  changePassword: async (current: string, next: string): Promise<Result> => {
    try {
      await ep.authApi.changePassword(current, next);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: errorMessage(err) };
    }
  },

  // ---------- Rooms & beds ----------
  addRoom: (body: Record<string, unknown>) => mutate(() => ep.roomApi.create(body)),
  updateRoom: (id: string, body: Record<string, unknown>) => mutate(() => ep.roomApi.update(id, body)),
  deleteRoom: (id: string) => mutate(() => ep.roomApi.remove(id)),
  addBed: (roomId: string, body: Record<string, unknown>) => mutate(() => ep.roomApi.addBed(roomId, body)),
  updateBed: (id: string, body: Record<string, unknown>) => mutate(() => ep.roomApi.updateBed(id, body)),
  deleteBed: (id: string) => mutate(() => ep.roomApi.removeBed(id)),

  // ---------- Tenants ----------
  addTenant: (body: Record<string, unknown>) => mutate(() => ep.tenantApi.create(body)),
  updateTenant: (id: string, body: Record<string, unknown>) => mutate(() => ep.tenantApi.update(id, body)),
  resetTenantPassword: (id: string, password?: string) => mutate(() => ep.tenantApi.resetPassword(id, password)),
  deleteTenant: (id: string) => mutate(() => ep.tenantApi.remove(id)),
  markTenantNotice: (id: string) => mutate(() => ep.tenantApi.notice(id)),
  moveOutTenant: (id: string) => mutate(() => ep.tenantApi.moveOut(id)),
  reallocateBed: (id: string, bedId: string) => mutate(() => ep.tenantApi.reallocate(id, bedId)),

  // ---------- Documents ----------
  uploadDocument: (form: FormData) => mutate(() => ep.documentApi.upload(form)),
  deleteDocument: (id: string) => mutate(() => ep.documentApi.remove(id)),
  /** Open a document in a new tab through a short-lived, document-scoped link. */
  openDocument: async (id: string, download = false): Promise<Result> => {
    try {
      const { url } = await ep.documentApi.link(id);
      window.open(download ? `${url}&download=1` : url, '_blank', 'noopener');
      return { ok: true };
    } catch (err) {
      return { ok: false, error: errorMessage(err) };
    }
  },

  // ---------- Meter ----------
  saveMeterReading: (payload: {
    roomId: string; month: string; previousReading: number; currentReading: number; ratePerUnit?: number; occupants?: number;
  }) =>
    mutate(() =>
      ep.meterApi.save({
        room: payload.roomId, month: payload.month, previousReading: payload.previousReading,
        currentReading: payload.currentReading, ratePerUnit: payload.ratePerUnit, occupants: payload.occupants,
      })
    ),
  publishBills: (month: string) => mutate(() => ep.meterApi.publish(month)),

  // ---------- Complaints ----------
  addComplaint: (payload: { category: Complaint['category']; description: string }) => mutate(() => ep.complaintApi.create(payload)),
  updateComplaintStatus: (id: string, status: Complaint['status'], remarks?: string) =>
    mutate(() => ep.complaintApi.updateStatus(id, status, remarks)),

  // ---------- Food ----------
  addMealOptOut: (date: string, mealType: MealOptOut['mealType']) => mutate(() => ep.foodApi.addOptOut(date, mealType)),
  removeMealOptOut: (date: string, mealType: MealOptOut['mealType']) => {
    const existing = state.data.mealOptOuts.find((o) => o.date === date && o.mealType === mealType);
    return existing ? mutate(() => ep.foodApi.removeOptOut(existing.id)) : Promise.resolve<Result>({ ok: true });
  },
  rateMeal: (date: string, mealType: MealOptOut['mealType'], rating: number) => mutate(() => ep.foodApi.rate(date, mealType, rating)),
  saveMenuItem: (body: Record<string, unknown>) => mutate(() => ep.foodApi.upsertMenu(body)),

  // ---------- Notifications ----------
  markNotificationRead: (id: string) => mutate(() => ep.notificationApi.markRead(id)),
  markAllNotificationsRead: () => mutate(() => ep.notificationApi.markAllRead()),
  runNotificationEngine: async () => {
    if (state.session && state.session.role !== 'tenant') await mutate(() => ep.notificationApi.run());
  },
  updateNotificationPrefs: (tenantId: string, patch: Partial<NotificationPrefs>) =>
    mutate(() => {
      const cur = state.data.notificationPrefs.find((p) => p.tenantId === tenantId);
      const next = { whatsapp: patch.whatsapp ?? cur?.whatsapp ?? true, sms: patch.sms ?? cur?.sms ?? true, email: patch.email ?? cur?.email ?? true };
      return state.session?.role === 'tenant' ? ep.notificationApi.updatePrefs(next) : ep.settingsApi.updateTenantPref(tenantId, next);
    }),

  // ---------- Settings ----------
  updateSettings: (patch: Record<string, unknown>) => mutate(() => ep.settingsApi.update(patch)),
  updateReminderSchedule: (patch: Partial<ReminderSchedule>) => mutate(() => ep.settingsApi.updateSchedule(patch)),
};

export function useAppStore() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return useMemo(
    () => ({
      data: snapshot.data,
      session: snapshot.session,
      loading: snapshot.loading,
      ready: snapshot.ready,
      error: snapshot.error,
      ...actions,
    }),
    [snapshot]
  );
}

// Kick off the first load once the module is imported (browser only).
if (typeof window !== 'undefined') void refresh();
