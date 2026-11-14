// API-backed application store.
//
// Replaces the former localStorage prototype store with a single shared state
// fed by the Express/MongoDB API. It deliberately keeps the SAME `data` shape
// the existing pages already consume (roomId/tenantId, platform.*, etc.) so the
// UI needed no structural rewrite — see src/api/adapters.ts for the mapping.
import { useMemo, useSyncExternalStore } from 'react';
import { errorMessage, sessionStore, type Session } from '../api/client';
import * as ep from '../api/endpoints';
import * as map from '../api/adapters';
import type { ApiAuthResponse, ApiNotificationPref } from '../api/types';
import type {
  AdmissionRequest,
  Complaint,
  FoodMenuItem,
  FoodRating,
  MealOptOut,
  MeterReading,
  Notification,
  NotificationLogEntry,
  NotificationPrefs,
  Payment,
  PGAccount,
  PGSettings,
  PGWorkspace,
  ReminderSchedule,
  Room,
  Bed,
  Subscription,
  Tenant,
  TenantUser,
} from '../types';

const PENDING_REG_KEY = 'aapka-pg-pending-registration';

export interface AppDataState {
  settings: PGSettings;
  tenants: Tenant[];
  rooms: Room[];
  beds: Bed[];
  meterReadings: MeterReading[];
  payments: Payment[];
  complaints: Complaint[];
  foodMenu: FoodMenuItem[];
  foodRatings: FoodRating[];
  mealOptOuts: MealOptOut[];
  notifications: Notification[];
  notificationLog: NotificationLogEntry[];
  notificationPrefs: NotificationPrefs[];
  reminderSchedule: ReminderSchedule;
  subscription: Subscription;
  platform: {
    pgs: PGAccount[];
    tenantUsers: TenantUser[];
    admissionRequests: AdmissionRequest[];
    memberships: ReturnType<typeof map.mapMembership>[];
    auditLogs: ReturnType<typeof map.mapAuditLog>[];
    pendingRegistrations: PendingRegistrationState[];
  };
  workspaces: Record<string, PGWorkspace>;
  activePgId: string;
  activeTenantUserId: string;
  activeTenantId: string;
  activeRole: 'tenant' | 'manager' | 'owner' | null;
}

export interface PendingRegistrationState {
  id: string;
  owner: { fullName: string; mobile: string; email: string };
  pg: {
    pgName: string;
    address: string;
    city: string;
    state: string;
    pinCode: string;
    rooms: number;
    beds: number;
    description: string;
    pgType: 'Boys' | 'Girls' | 'Co-living' | 'Other';
  };
  planId: 'starter' | 'growth' | 'pro';
  cycle: 'monthly' | 'annual';
  amount: number;
  status: string;
  pgId?: string;
  suggestedUsernames: string[];
  pgUsername?: string;
  orderId?: string;
  createdAt: string;
}

type Result<T = unknown> = ({ ok: true } & T) | { ok: false; error: string };

interface StoreState {
  data: AppDataState;
  session: Session | null;
  loading: boolean;
  ready: boolean;
  error: string | null;
}

const emptySettings = (): PGSettings => ({
  name: '',
  address: '',
  city: '',
  contactEmail: '',
  contactPhone: '',
  electricityRate: 9,
  foodCharge: 0,
  ownerName: '',
  timezone: 'Asia/Kolkata',
  channels: { whatsapp: true, sms: true, email: true },
});

const emptySchedule = (): ReminderSchedule => ({
  rentDaysBefore: [5, 1],
  rentOverdueDays: [1, 3, 7],
  electricityDueDaysBefore: [5, 1],
  electricityOverdueDays: [1, 3, 7],
  electricityDueInDays: 5,
  complaintUnresolvedHours: 48,
  gracePeriodDays: 7,
  retryAttempts: 2,
});

const emptySubscription = (): Subscription => ({
  planId: 'growth',
  status: 'Trial',
  cycle: 'monthly',
  startedAt: '',
  currentPeriodEnd: '',
  amountPaid: 0,
  autoRenew: false,
  invoices: [],
});

const emptyData = (): AppDataState => ({
  settings: emptySettings(),
  tenants: [],
  rooms: [],
  beds: [],
  meterReadings: [],
  payments: [],
  complaints: [],
  foodMenu: [],
  foodRatings: [],
  mealOptOuts: [],
  notifications: [],
  notificationLog: [],
  notificationPrefs: [],
  reminderSchedule: emptySchedule(),
  subscription: emptySubscription(),
  platform: {
    pgs: [],
    tenantUsers: [],
    admissionRequests: [],
    memberships: [],
    auditLogs: [],
    pendingRegistrations: [],
  },
  workspaces: {},
  activePgId: '',
  activeTenantUserId: '',
  activeTenantId: '',
  activeRole: null,
});

let state: StoreState = {
  data: emptyData(),
  session: sessionStore.load(),
  loading: false,
  ready: false,
  error: null,
};

const listeners = new Set<() => void>();

const setState = (patch: Partial<StoreState>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = () => state;

/** Resolve a settled promise, falling back to a default value. */
const pick = <T,>(r: PromiseSettledResult<T>, fallback: T): T =>
  r.status === 'fulfilled' ? r.value : fallback;

const loadPendingRegistration = async (): Promise<PendingRegistrationState[]> => {
  const id = localStorage.getItem(PENDING_REG_KEY);
  if (!id) return [];
  try {
    const { registration } = await ep.authApi.ownerRegistration(id);
    const reg = registration as unknown as Record<string, unknown>;
    return [
      {
        id: registration.id,
        owner: (reg.owner as PendingRegistrationState['owner']) ?? { fullName: '', mobile: '', email: '' },
        pg: (reg.pg as PendingRegistrationState['pg']) ?? {
          pgName: '',
          address: '',
          city: '',
          state: '',
          pinCode: '',
          rooms: 1,
          beds: 1,
          description: '',
          pgType: 'Other',
        },
        planId: registration.planId,
        cycle: registration.cycle,
        amount: registration.amount,
        status: registration.status,
        pgId: reg.pgId as string | undefined,
        pgUsername: reg.pgUsername as string | undefined,
        suggestedUsernames: (reg.suggestedUsernames as string[]) ?? [],
        orderId: reg.orderId as string | undefined,
        createdAt: new Date().toISOString(),
      },
    ];
  } catch {
    localStorage.removeItem(PENDING_REG_KEY);
    return [];
  }
};

/** Load everything the current role can see. */
export async function refresh() {
  const session = sessionStore.load();

  // ---- Unauthenticated: public vacancy data for the shareable page ----
  if (!session) {
    setState({ loading: true, error: null });
    try {
      const list = await ep.publicApi.pgs();
      const first = list.pgs[0] as unknown as { id: string; pgName: string; pgUsername: string; address: string; city: string } | undefined;
      const pendingRegistrations = await loadPendingRegistration();
      const data = emptyData();
      data.platform.pendingRegistrations = pendingRegistrations;

      if (first?.pgUsername) {
        try {
          const vacancy = await ep.publicApi.vacancy(first.pgUsername);
          data.rooms = vacancy.rooms.map(map.mapRoom);
          data.beds = vacancy.beds.map((b) => ({
            id: b.id,
            roomId: b.roomId,
            bedNumber: b.bedNumber,
            status: b.status,
            tenantId: undefined,
            vacantSince: undefined,
          }));
          // Rent floor per room, expressed through the `tenants` list the
          // vacancy page reads from (no tenant PII is exposed by the API).
          data.tenants = vacancy.rooms
            .filter((r) => r.rentFrom != null)
            .map((r) => ({
              id: `public-${r.id}`,
              fullName: '',
              mobile: '',
              email: '',
              emergencyContact: '',
              roomId: r.id,
              bedNumber: 0,
              monthlyRent: r.rentFrom as number,
              securityDeposit: 0,
              joiningDate: '',
              policeVerification: 'Not Required',
              status: 'Active',
            }));
          data.settings = {
            ...emptySettings(),
            name: vacancy.pg.pgName,
            address: vacancy.pg.address,
            city: vacancy.pg.city,
            ownerName: '',
          };
        } catch {
          // A PG may disable public vacancy sharing.
        }
      }
      setState({ data, session: null, loading: false, ready: true });
    } catch (err) {
      setState({ error: errorMessage(err), session: null, loading: false, ready: true });
    }
    return;
  }

  // ---- Authenticated ----
  if (!session.role) {
    // Defensive: a malformed/legacy session is treated as logged out.
    sessionStore.clear();
    setState({ data: emptyData(), session: null, loading: false, ready: true });
    return;
  }

  setState({ loading: true, error: null, session });
  try {
    const role = session.role;
    const ctx = await ep.authApi.context();
    const [roomsRes, bedsRes, settingsRes, notifsRes] = await Promise.allSettled([
      ep.roomApi.list(),
      ep.roomApi.beds(),
      ep.settingsApi.get(),
      ep.notificationApi.list(),
    ]);

    const rooms = pick(roomsRes, { rooms: [] }).rooms.map(map.mapRoom);
    const beds = pick(bedsRes, { beds: [] }).beds.map(map.mapBed);
    const settingsPayload = pick(settingsRes, undefined as Awaited<ReturnType<typeof ep.settingsApi.get>> | undefined);
    const notifications = pick(notifsRes, { notifications: [], unread: 0 }).notifications.map(map.mapNotification);

    const data = emptyData();
    data.activeRole = role;
    data.rooms = rooms;
    data.beds = beds;
    data.notifications = notifications;
    data.activePgId = ctx.pgId ?? ctx.pgs[0]?.id ?? '';
    data.activeTenantUserId = role === 'tenant' ? ctx.tenantUsers[0]?.id ?? '' : '';
    data.activeTenantId = ctx.tenant?.id ?? '';

    if (settingsPayload) {
      data.settings = map.mapSettings(settingsPayload.settings);
      data.reminderSchedule = map.mapReminderSchedule(settingsPayload.reminderSchedule);
      data.subscription = map.mapSubscription(settingsPayload.subscription);
      data.notificationPrefs = (settingsPayload.notificationPrefs ?? []).map(map.mapPrefs);
    }

    data.platform.pgs = ctx.pgs.map(map.mapPgAccount) as unknown as PGAccount[];
    data.platform.tenantUsers = ctx.tenantUsers.map((u) => ({
      id: u.id,
      fullName: u.fullName,
      mobile: u.mobile,
      email: u.email,
      gender: u.gender,
      createdAt: '',
    })) as TenantUser[];
    data.platform.admissionRequests = ctx.admissionRequests.map(map.mapAdmission) as unknown as AdmissionRequest[];
    data.platform.memberships = ctx.memberships.map(map.mapMembership);
    data.platform.auditLogs = ctx.auditLogs.map(map.mapAuditLog);
    data.platform.pendingRegistrations = role === 'owner' ? await loadPendingRegistration() : [];

    if (role === 'tenant') {
      data.tenants = ctx.tenant ? [map.mapTenant(ctx.tenant)] : [];
      const [paymentsRes, complaintsRes, meterRes, menuRes, ratingsRes, optOutsRes, prefsRes] = await Promise.allSettled([
        ep.paymentApi.list(),
        ep.complaintApi.list(),
        ep.meterApi.list(),
        ep.foodApi.menu(),
        ep.foodApi.ratings(),
        ep.foodApi.optOuts(),
        ep.notificationApi.prefs(),
      ]);
      data.payments = pick(paymentsRes, { payments: [] }).payments.map(map.mapPayment);
      data.complaints = pick(complaintsRes, { complaints: [] }).complaints.map(map.mapComplaint);
      data.meterReadings = pick(meterRes, { readings: [] }).readings.map(map.mapMeterReading);
      data.foodMenu = pick(menuRes, { menu: [] }).menu.map(map.mapMenuItem);
      data.foodRatings = pick(ratingsRes, { ratings: [] }).ratings.map(map.mapFoodRating);
      data.mealOptOuts = pick(optOutsRes, { optOuts: [] }).optOuts.map(map.mapMealOptOut);
      const myPrefs = pick<{ prefs?: ApiNotificationPref }>(prefsRes, {}).prefs;
      if (myPrefs) data.notificationPrefs = [map.mapPrefs(myPrefs)];

      // Vacancy snapshots per PG so admission search can show availability.
      const vacancies = await Promise.allSettled(
        ctx.pgs
          .filter((p) => p.isDiscoverable && p.showAvailableBeds)
          .map((p) => ep.publicApi.vacancy(p.pgUsername))
      );
      const workspaces: Record<string, PGWorkspace> = {};
      ctx.pgs.forEach((p, i) => {
        const v = vacancies[i];
        if (v?.status !== 'fulfilled') return;
        workspaces[p.id] = {
          beds: v.value.beds.map((b) => ({
            id: b.id,
            roomId: b.roomId,
            bedNumber: b.bedNumber,
            status: b.status,
            tenantId: undefined,
            vacantSince: undefined,
          })),
          rooms: v.value.rooms.map(map.mapRoom),
        } as unknown as PGWorkspace;
      });
      data.workspaces = workspaces;
    } else {
      const [tenantsRes, paymentsRes, complaintsRes, meterRes, menuRes, ratingsRes, logRes] = await Promise.allSettled([
        ep.tenantApi.list(),
        ep.paymentApi.list(),
        ep.complaintApi.list(),
        ep.meterApi.list(),
        ep.foodApi.menu(),
        ep.foodApi.ratings(),
        ep.notificationApi.log(),
      ]);
      data.tenants = pick(tenantsRes, { tenants: [] }).tenants.map(map.mapTenant);
      data.payments = pick(paymentsRes, { payments: [] }).payments.map(map.mapPayment);
      data.complaints = pick(complaintsRes, { complaints: [] }).complaints.map(map.mapComplaint);
      data.meterReadings = pick(meterRes, { readings: [] }).readings.map(map.mapMeterReading);
      data.foodMenu = pick(menuRes, { menu: [] }).menu.map(map.mapMenuItem);
      data.foodRatings = pick(ratingsRes, { ratings: [] }).ratings.map(map.mapFoodRating);
      data.notificationLog = pick(logRes, { log: [] }).log.map(map.mapNotificationLog);
    }

    setState({ data, session, loading: false, ready: true, error: null });
  } catch (err) {
    // An invalid/expired token should drop the session rather than loop.
    const expired = (err as { status?: number })?.status === 401;
    if (expired) sessionStore.clear();
    setState({
      data: emptyData(),
      session: expired ? null : session,
      loading: false,
      ready: true,
      error: errorMessage(err),
    });
  }
}

/** Run a mutation, then reload the snapshot. */
async function mutate<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    const value = await fn();
    await refresh();
    return { ok: true, ...(value as T) } as Result<T>;
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

const startSession = async (res: ApiAuthResponse) => {
  const role = res.user.role as Session['role'];
  const session: Session = {
    token: res.token,
    role,
    pgId: (res.user.pgId as string | null) ?? null,
    user: res.user as unknown as Record<string, unknown>,
  };
  sessionStore.save(session);
  await refresh();
};

// ============================== Actions ==============================

const logout = () => {
  sessionStore.clear();
  localStorage.removeItem(PENDING_REG_KEY);
  state = { data: emptyData(), session: null, loading: false, ready: true, error: null };
  listeners.forEach((l) => l());
};

const ownerLogin = async (identifier: string, password: string): Promise<Result> => {
  try {
    const res = await ep.authApi.ownerLogin(identifier.trim(), password);
    await startSession(res);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
};

const managerLogin = async (email: string, password: string): Promise<Result> => {
  try {
    const res = await ep.authApi.managerLogin(email.trim(), password);
    await startSession(res);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
};

const resetOwnerPassword = async (identifier: string, code: string, newPassword: string): Promise<Result> => {
  try {
    await ep.authApi.ownerResetPassword(identifier.trim(), code.trim(), newPassword);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
};

const tenantSendOtp = async (mobile: string): Promise<Result<{ demoOtp?: string }>> => {
  try {
    const res = await ep.authApi.tenantSendOtp(mobile.trim());
    return { ok: true, demoOtp: res.demoOtp };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
};

const tenantLogin = async (mobile: string, credential: { otp?: string; password?: string }): Promise<Result> => {
  try {
    const res = await ep.authApi.tenantLogin(mobile.trim(), credential);
    await startSession(res);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
};

const tenantRegister = async (payload: {
  fullName: string;
  mobile: string;
  email?: string;
  password?: string;
}): Promise<Result> => {
  try {
    const res = await ep.authApi.tenantRegister(payload);
    await startSession(res);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
};

// ---------- Owner onboarding ----------
const startOwnerRegistration = async (payload: {
  owner: { fullName: string; mobile: string; email: string };
  pg: PendingRegistrationState['pg'];
  planId: 'starter' | 'growth' | 'pro';
  cycle: 'monthly' | 'annual';
  amount: number;
}): Promise<Result<{ regId: string; suggestedUsernames: string[] }>> => {
  try {
    const res = await ep.authApi.ownerRegister(payload);
    localStorage.setItem(PENDING_REG_KEY, res.registration.id);
    const reg: PendingRegistrationState = {
      id: res.registration.id,
      owner: payload.owner,
      pg: payload.pg,
      planId: payload.planId,
      cycle: payload.cycle,
      amount: res.registration.amount,
      status: res.registration.status,
      suggestedUsernames: res.suggestedUsernames,
      orderId: res.order.orderId,
      createdAt: new Date().toISOString(),
    };
    setState({
      data: {
        ...state.data,
        platform: { ...state.data.platform, pendingRegistrations: [reg] },
      },
    });
    return { ok: true, regId: reg.id, suggestedUsernames: res.suggestedUsernames };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
};

// The gateway step is fully simulated server-side by /complete-payment.
const submitRegistrationPayment = (_regId: string, _method: string): Result => ({ ok: true });

const completeRegistrationPayment = async (
  regId: string,
  outcome: 'success' | 'failure'
): Promise<{ ok: true; suggestedUsernames: string[] } | { ok: false; error: string; duplicate?: boolean }> => {
  const reg = state.data.platform.pendingRegistrations.find((r) => r.id === regId);
  try {
    const res = await ep.authApi.ownerCompletePayment(regId, reg?.orderId ?? '', outcome);
    setState({
      data: {
        ...state.data,
        platform: {
          ...state.data.platform,
          pendingRegistrations: state.data.platform.pendingRegistrations.map((r) =>
            r.id === regId ? { ...r, status: res.status, pgId: res.pgId, suggestedUsernames: res.suggestedUsernames } : r
          ),
        },
      },
    });
    return { ok: true, suggestedUsernames: res.suggestedUsernames };
  } catch (err) {
    const message = errorMessage(err);
    return { ok: false, error: message, duplicate: /duplicate/i.test(message) };
  }
};

const confirmPgUsername = async (
  regId: string,
  username: string
): Promise<{ ok: true; username: string } | { ok: false; error: string; suggestions: string[] }> => {
  try {
    const check = await ep.authApi.usernameAvailable(username.trim().toLowerCase());
    if (!check.available) {
      return { ok: false, error: check.error ?? 'This username is already taken', suggestions: check.suggestions ?? [] };
    }
    setState({
      data: {
        ...state.data,
        platform: {
          ...state.data.platform,
          pendingRegistrations: state.data.platform.pendingRegistrations.map((r) =>
            r.id === regId ? { ...r, pgUsername: username.trim().toLowerCase(), status: 'Username Confirmed' } : r
          ),
        },
      },
    });
    return { ok: true, username: username.trim().toLowerCase() };
  } catch (err) {
    return { ok: false, error: errorMessage(err), suggestions: [] };
  }
};

const setOwnerPasswordAndActivate = async (regId: string, password: string): Promise<Result<{ username: string }>> => {
  const reg = state.data.platform.pendingRegistrations.find((r) => r.id === regId);
  try {
    const res = await ep.authApi.ownerActivate(regId, reg?.pgUsername ?? '', password);
    localStorage.removeItem(PENDING_REG_KEY);
    await startSession(res);
    return { ok: true, username: res.user.pgUsername ?? reg?.pgUsername ?? '' };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
};

// ---------- Tenants ----------
const addTenant = async (payload: Omit<Tenant, 'id'>) =>
  mutate(() =>
    ep.tenantApi.create({
      fullName: payload.fullName,
      mobile: payload.mobile,
      email: payload.email,
      emergencyContact: payload.emergencyContact,
      room: payload.roomId,
      bedNumber: payload.bedNumber,
      monthlyRent: payload.monthlyRent,
      securityDeposit: payload.securityDeposit,
      joiningDate: payload.joiningDate,
      policeVerification: payload.policeVerification,
      idProofUrl: payload.idProofUrl,
      photographUrl: payload.photographUrl,
      agreementUrl: payload.agreementUrl,
    })
  );

const updateTenant = async (id: string, patch: Partial<Tenant>) =>
  mutate(() =>
    ep.tenantApi.update(id, {
      fullName: patch.fullName,
      mobile: patch.mobile,
      email: patch.email,
      emergencyContact: patch.emergencyContact,
      monthlyRent: patch.monthlyRent,
      securityDeposit: patch.securityDeposit,
      policeVerification: patch.policeVerification,
      idProofUrl: patch.idProofUrl,
      photographUrl: patch.photographUrl,
      agreementUrl: patch.agreementUrl,
    })
  );

const deleteTenant = (id: string) => mutate(() => ep.tenantApi.remove(id));
const markTenantNotice = (id: string) => mutate(() => ep.tenantApi.notice(id));
const moveOutTenant = (_id: string, _mode?: string) => mutate(() => ep.tenantApi.moveOut(_id));
const reallocateBed = (id: string, roomId: string, bedNumber: number) =>
  mutate(() => ep.tenantApi.reallocate(id, roomId, bedNumber));

// ---------- Payments ----------
const payPayment = (id: string, method: string) => mutate(() => ep.paymentApi.pay(id, method));

// Pay the tenant's electricity share for the month of a meter reading.
const payElectricityShare = async (readingId: string, method: string): Promise<Result> => {
  const reading = state.data.meterReadings.find((m) => m.id === readingId);
  if (!reading) return { ok: false, error: 'Meter reading not found' };
  const payment = state.data.payments.find(
    (p) => p.type === 'Electricity' && p.month === reading.month && p.status !== 'Paid'
  );
  if (!payment) return { ok: false, error: 'No unpaid electricity bill found for this month' };
  return payPayment(payment.id, method);
};
const sendRentReminder = (_tenantId?: string) => mutate(() => ep.paymentApi.remind());

// ---------- Meter ----------
const saveMeterReading = (payload: {
  roomId: string;
  month: string;
  previousReading: number;
  currentReading: number;
  ratePerUnit?: number;
  occupants?: number;
  photoUrl?: string;
  recordedAt?: string;
  published?: boolean;
}) =>
  mutate(() =>
    ep.meterApi.save({
      room: payload.roomId,
      month: payload.month,
      previousReading: payload.previousReading,
      currentReading: payload.currentReading,
      ratePerUnit: payload.ratePerUnit,
      occupants: payload.occupants,
      photoUrl: payload.photoUrl,
    })
  );

const publishBills = (month: string) => mutate(() => ep.meterApi.publish(month));

// ---------- Complaints ----------
const addComplaint = (payload: { tenantId: string; category: Complaint['category']; description: string; imageUrl?: string; roomNumber?: string }) =>
  mutate(() =>
    ep.complaintApi.create({
      category: payload.category,
      description: payload.description,
      imageUrl: payload.imageUrl,
    })
  );

const updateComplaintStatus = (id: string, status: Complaint['status'], remarks?: string) =>
  mutate(() => ep.complaintApi.updateStatus(id, status, remarks));

// ---------- Food ----------
const addMealOptOut = (_tenantId: string, date: string, mealType: MealOptOut['mealType']) =>
  mutate(() => ep.foodApi.addOptOut(date, mealType));

const removeMealOptOut = (_tenantId: string, date: string, mealType: MealOptOut['mealType']) => {
  const existing = state.data.mealOptOuts.find((o) => o.date === date && o.mealType === mealType);
  if (!existing) return Promise.resolve({ ok: true } as Result);
  return mutate(() => ep.foodApi.removeOptOut(existing.id));
};

const rateMeal = (_tenantId: string, date: string, mealType: MealOptOut['mealType'], rating: number) =>
  mutate(() => ep.foodApi.rate(date, mealType, rating));

// ---------- Notifications ----------
const markNotificationRead = (id: string) => mutate(() => ep.notificationApi.markRead(id));
const markAllNotificationsRead = (_userId?: string, _role?: string) => mutate(() => ep.notificationApi.markAllRead());
const runNotificationEngine = async () => {
  const role = state.session?.role;
  if (!role || role === 'tenant') return;
  await mutate(() => ep.notificationApi.run());
};
const updateNotificationPrefs = (tenantId: string, patch: Partial<NotificationPrefs>) =>
  mutate(() => {
    const current = state.data.notificationPrefs.find((p) => p.tenantId === tenantId);
    const next = {
      whatsapp: patch.whatsapp ?? current?.whatsapp ?? true,
      sms: patch.sms ?? current?.sms ?? true,
      email: patch.email ?? current?.email ?? true,
    };
    return state.session?.role === 'tenant'
      ? ep.notificationApi.updatePrefs(next)
      : ep.settingsApi.updateTenantPref(tenantId, next);
  });

// ---------- Settings ----------
const updateSettings = (patch: Partial<PGSettings>) => mutate(() => ep.settingsApi.update(patch));
const updateReminderSchedule = (patch: Partial<ReminderSchedule>) =>
  mutate(() => ep.settingsApi.updateSchedule(patch));

// ---------- Subscription ----------
const checkoutSubscription = (planId: string, cycle: string) =>
  mutate(() => ep.subscriptionApi.checkout(planId, cycle, 'UPI'));
const upgradePlan = (planId: string) => mutate(() => ep.subscriptionApi.upgrade(planId));
const scheduleDowngrade = (planId: string) => mutate(() => ep.subscriptionApi.upgrade(planId));
const changeBillingCycle = (cycle: 'monthly' | 'annual') => mutate(() => ep.subscriptionApi.cycle(cycle));
const renewSubscription = (method: string) => mutate(() => ep.subscriptionApi.renew(method));
const retrySubscriptionPayment = (method: string) => mutate(() => ep.subscriptionApi.retry(method));
const setAutoRenew = (autoRenew: boolean) => mutate(() => ep.subscriptionApi.autoRenew(autoRenew));

// ---------- Admissions ----------
const submitAdmissionRequest = async (payload: {
  pgId: string;
  tenantUserId?: string;
  fullName: string;
  mobile: string;
  email: string;
  gender?: string;
  emergencyContact: string;
  preferredJoiningDate: string;
  preferredRoomType: string;
  occupants: number;
  additionalMessage: string;
  documents?: { idProof?: string; photograph?: string; additional?: string };
}): Promise<Result<{ requestId: string }>> => {
  try {
    const res = await ep.admissionApi.submit({
      pg: payload.pgId,
      fullName: payload.fullName,
      mobile: payload.mobile,
      email: payload.email,
      gender: payload.gender,
      emergencyContact: payload.emergencyContact,
      preferredJoiningDate: payload.preferredJoiningDate,
      preferredRoomType: payload.preferredRoomType,
      occupants: payload.occupants,
      additionalMessage: payload.additionalMessage,
    });
    await refresh();
    return { ok: true, requestId: res.request.requestId };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
};

const approveAdmissionRequest = async (
  requestId: string,
  alloc: { roomId: string; bedId: string; monthlyRent: number; securityDeposit: number; joiningDate?: string }
): Promise<Result> => {
  const req = state.data.platform.admissionRequests.find((r) => r.requestId === requestId);
  if (!req) return { ok: false, error: 'Request not found' };
  return mutate(() =>
    ep.admissionApi.approve(req.id, {
      room: alloc.roomId,
      bed: alloc.bedId,
      monthlyRent: alloc.monthlyRent,
      securityDeposit: alloc.securityDeposit,
    })
  );
};

const rejectAdmissionRequest = async (requestId: string, reason: string): Promise<Result> => {
  const req = state.data.platform.admissionRequests.find((r) => r.requestId === requestId);
  if (!req) return { ok: false, error: 'Request not found' };
  return mutate(() => ep.admissionApi.reject(req.id, reason));
};

// ---------- Misc ----------
const updateBedStatus = (bedId: string, status: Bed['status']) =>
  mutate(() => ep.roomApi.updateBed(bedId, { status }));
const switchWorkspace = (_pgId: string) => Promise.resolve();
const syncTenantSession = () => refresh();
const resetData = () => refresh();

const actions = {
  refresh,
  logout,
  ownerLogin,
  managerLogin,
  resetOwnerPassword,
  tenantSendOtp,
  tenantLogin,
  tenantRegister,
  startOwnerRegistration,
  submitRegistrationPayment,
  completeRegistrationPayment,
  confirmPgUsername,
  setOwnerPasswordAndActivate,
  addTenant,
  updateTenant,
  deleteTenant,
  markTenantNotice,
  moveOutTenant,
  reallocateBed,
  payPayment,
  payElectricityShare,
  sendRentReminder,
  saveMeterReading,
  publishBills,
  addComplaint,
  updateComplaintStatus,
  addMealOptOut,
  removeMealOptOut,
  rateMeal,
  markNotificationRead,
  markAllNotificationsRead,
  runNotificationEngine,
  updateNotificationPrefs,
  updateSettings,
  updateReminderSchedule,
  checkoutSubscription,
  upgradePlan,
  scheduleDowngrade,
  changeBillingCycle,
  renewSubscription,
  retrySubscriptionPayment,
  setAutoRenew,
  submitAdmissionRequest,
  approveAdmissionRequest,
  rejectAdmissionRequest,
  updateBedStatus,
  switchWorkspace,
  syncTenantSession,
  resetData,
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
if (typeof window !== 'undefined') {
  void refresh();
}
