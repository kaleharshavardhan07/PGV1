import { useEffect, useState, useCallback } from 'react';
import type {
  Tenant,
  Room,
  Bed,
  MeterReading,
  Payment,
  Complaint,
  FoodMenuItem,
  Notification,
  PGSettings,
  FoodRating,
  MealOptOut,
  BedStatus,
  ComplaintStatus,
  BillingCycle,
  NotificationLogEntry,
  NotificationPrefs,
  PlanId,
  ReminderSchedule,
  Subscription,
  SubscriptionInvoice,
  SaaSPaymentMethod,
  PlatformData,
  PGWorkspace,
  PGAccount,
  TenantUser,
  AdmissionRequest,
  Membership,
  AuditLogEntry,
  PendingRegistration,
  PGType,
} from '../types';
import {
  initialTenants,
  initialRooms,
  initialBeds,
  initialMeterReadings,
  initialPayments,
  initialComplaints,
  initialFoodMenu,
  initialNotifications,
  initialSettings,
  initialFoodRatings,
  initialMealOptOuts,
  initialSubscription,
  initialNotificationLog,
  initialNotificationPrefs,
  initialReminderSchedule,
  initialWorkspaces,
  initialPlatform,
  PG_ID_SHREE,
} from '../data/seed';
import { getPlan, FREE_TRIAL_DAYS } from '../data/plans';
import { nextInvoiceNumber } from '../services/subscriptionService';
import { materializeDraft, type NotificationDraft } from '../services/deliveryService';
import { runNotificationScan } from '../services/notificationEngine';
import { hashPassword, verifyPassword, validatePassword, DEMO_RESET_CODE } from '../services/authService';
import {
  generateUsernameSuggestions,
  normalizeUsername,
  usernameError,
  isUsernameTaken,
  slugifyPgName,
} from '../services/pgPlatform';
import {
  createOrder,
  simulateGatewayCallback,
  verifyCallback,
  type GatewayCallback,
} from '../services/paymentGateway';

const STORAGE_KEY = 'aapka-pg-data-v3';

// Workspace field names mirrored between AppData top level and PGWorkspace.
const WORKSPACE_KEYS = [
  'settings',
  'tenants',
  'rooms',
  'beds',
  'meterReadings',
  'payments',
  'complaints',
  'foodMenu',
  'foodRatings',
  'mealOptOuts',
  'notifications',
  'notificationLog',
  'notificationPrefs',
  'reminderSchedule',
  'subscription',
] as const;

function snapshotOf(data: AppData): PGWorkspace {
  const ws = {} as unknown as Record<string, unknown>;
  for (const k of WORKSPACE_KEYS) ws[k] = data[k];
  return ws as unknown as PGWorkspace;
}

interface AppData {
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
  // multi-PG platform registry
  platform: PlatformData;
  workspaces: Record<string, PGWorkspace>;
  activePgId: string;
  activeTenantUserId: string; // platform tenant account logged in
  activeTenantId: string; // per-PG tenant record id within the active workspace
  activeRole: 'tenant' | 'manager' | 'owner' | null;
}

const defaultData: AppData = {
  settings: initialSettings,
  tenants: initialTenants,
  rooms: initialRooms,
  beds: initialBeds,
  meterReadings: initialMeterReadings,
  payments: initialPayments,
  complaints: initialComplaints,
  foodMenu: initialFoodMenu,
  foodRatings: initialFoodRatings,
  mealOptOuts: initialMealOptOuts,
  notifications: initialNotifications,
  notificationLog: initialNotificationLog,
  notificationPrefs: initialNotificationPrefs,
  reminderSchedule: initialReminderSchedule,
  subscription: initialSubscription,
  platform: initialPlatform,
  workspaces: initialWorkspaces,
  activePgId: PG_ID_SHREE,
  activeTenantUserId: 'tu-t001',
  activeTenantId: 't-001',
  activeRole: null,
};

function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultData;
    const parsed = JSON.parse(raw) as AppData;
    // basic validation - merge missing keys from default
    const merged = { ...defaultData, ...parsed };
    if (!merged.workspaces || !merged.workspaces[merged.activePgId]) {
      merged.workspaces = { ...initialWorkspaces, ...merged.workspaces };
      if (!merged.workspaces[merged.activePgId]) merged.activePgId = PG_ID_SHREE;
    }
    return merged;
  } catch {
    return defaultData;
  }
}

function saveData(data: AppData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

const subscribers = new Set<() => void>();

function notify() {
  subscribers.forEach((fn) => fn());
}

/** Build the materialization context for emitting notification drafts from store actions. */
function buildCtx(prev: AppData) {
  const existingKeys = new Set<string>();
  for (const n of prev.notifications) if (n.dedupeKey) existingKeys.add(n.dedupeKey);
  for (const l of prev.notificationLog) if (l.dedupeKey) existingKeys.add(l.dedupeKey);
  return {
    existingKeys,
    prefs: prev.notificationPrefs,
    settings: prev.settings,
    planId: prev.subscription.planId,
    retryAttempts: prev.reminderSchedule.retryAttempts,
  };
}

/** Emit notification drafts into a specific PG workspace (deduped, with delivery log). */
function emitDraftsIntoWorkspace(
  ws: PGWorkspace,
  drafts: NotificationDraft[]
): Pick<PGWorkspace, 'notifications' | 'notificationLog'> {
  const existingKeys = new Set<string>();
  for (const n of ws.notifications) if (n.dedupeKey) existingKeys.add(n.dedupeKey);
  for (const l of ws.notificationLog) if (l.dedupeKey) existingKeys.add(l.dedupeKey);
  const ctx = {
    existingKeys,
    prefs: ws.notificationPrefs,
    settings: ws.settings,
    planId: ws.subscription.planId,
    retryAttempts: ws.reminderSchedule.retryAttempts,
  };
  const notifications: Notification[] = [];
  const notificationLog: NotificationLogEntry[] = [];
  for (const draft of drafts) {
    const { notification, logs } = materializeDraft(draft, ctx);
    if (notification) {
      notifications.push(notification);
      notificationLog.push(...logs);
    }
  }
  return {
    notifications: [...notifications, ...ws.notifications],
    notificationLog: [...notificationLog, ...ws.notificationLog],
  };
}

/** Emit notification drafts (deduped) plus their delivery log entries into the active data. */
function emitDrafts(prev: AppData, drafts: NotificationDraft[]): Partial<AppData> {
  return emitDraftsIntoWorkspace(snapshotOf(prev), drafts);
}

/**
 * Apply a mutation to a specific PG workspace. When the target PG is active,
 * the top-level fields (the live workspace) are updated; otherwise only the
 * stored workspace snapshot is touched. This keeps cross-PG operations
 * (e.g. a tenant requesting admission to a different PG) isolated per PG.
 */
function applyToWorkspace(
  prev: AppData,
  pgId: string,
  fn: (ws: PGWorkspace) => PGWorkspace
): AppData {
  if (pgId === prev.activePgId) {
    const nextWs = fn(snapshotOf(prev));
    return {
      ...prev,
      ...nextWs,
      workspaces: { ...prev.workspaces, [pgId]: nextWs },
    };
  }
  const target = prev.workspaces[pgId];
  if (!target) return prev;
  return { ...prev, workspaces: { ...prev.workspaces, [pgId]: fn(target) } };
}

function auditEntry(
  actor: string,
  action: string,
  entity: string,
  entityId: string,
  details: string
): AuditLogEntry {
  return { id: uid('al'), ts: new Date().toISOString(), actor, action, entity, entityId, details };
}

export function useAppStore() {
  const [data, setData] = useState<AppData>(loadData);

  useEffect(() => {
    const fn = () => setData(loadData());
    subscribers.add(fn);
    return () => {
      subscribers.delete(fn);
    };
  }, []);

  useEffect(() => {
    saveData(data);
  }, [data]);

  const update = useCallback((updater: (prev: AppData) => AppData) => {
    setData((prev) => {
      const next = updater(prev);
      // Keep the stored snapshot of the active PG workspace in sync with the
      // live top-level fields.
      const synced: AppData = {
        ...next,
        workspaces: { ...next.workspaces, [next.activePgId]: snapshotOf(next) },
      };
      saveData(synced);
      return synced;
    });
  }, []);

  // Mutation that also runs the notification automation engine afterwards,
  // mirroring a production background job queue trigger.
  const updateScanned = useCallback(
    (updater: (prev: AppData) => AppData) => {
      update((prev) => runNotificationScan(updater(prev)));
    },
    [update]
  );

  // ----- Auth / role -----
  const login = useCallback((role: 'tenant' | 'manager' | 'owner', tenantId?: string) => {
      update((prev) => {
        if (role === 'tenant') {
          // Resolve the demo tenant session: prefer an active membership in the
          // active PG, else the first tenant user.
          const member = prev.platform.memberships.find(
            (m) => m.pgId === prev.activePgId && m.status === 'Active'
          );
          const userId = member?.tenantUserId ?? prev.activeTenantUserId ?? 'tu-t001';
          const membership = prev.platform.memberships.find(
            (m) => m.tenantUserId === userId && m.status === 'Active'
          );
          const pgId = membership?.pgId ?? prev.activePgId;
          const ws = prev.workspaces[pgId];
          const tenantRecord =
            membership?.tenantId ?? ws?.tenants.find((t) => t.status !== 'Left')?.id ?? prev.activeTenantId;
          const next: AppData = {
            ...prev,
            activeRole: 'tenant',
            activeTenantUserId: userId,
            activePgId: pgId,
            activeTenantId: tenantRecord,
            ...(pgId !== prev.activePgId ? { ...ws } : {}),
          };
          return runNotificationScan(next);
        }
        return { ...prev, activeRole: role, activeTenantId: tenantId || prev.activeTenantId };
      });
  }, [update]);

  const logout = useCallback(() => {
    update((prev) => ({ ...prev, activeRole: null }));
  }, [update]);

  // ----- Workspace switching (multi-PG) -----
  const switchWorkspace = useCallback(
    (pgId: string) => {
      update((prev) => {
        const target = prev.workspaces[pgId];
        if (!target || pgId === prev.activePgId) return prev;
        const savedWorkspaces = { ...prev.workspaces, [prev.activePgId]: snapshotOf(prev) };
        const loaded: AppData = { ...prev, ...target, workspaces: savedWorkspaces, activePgId: pgId };
        // Run the notification engine for the newly loaded workspace
        // (idempotent thanks to dedupe keys).
        return runNotificationScan(loaded);
      });
    },
    [update]
  );

  // Keep the active per-PG tenant record in sync with the approved membership
  // (e.g. when an admission is approved while the tenant is logged in).
  const syncTenantSession = useCallback(() => {
    update((prev) => {
      if (prev.activeRole !== 'tenant') return prev;
      const membership = prev.platform.memberships.find(
        (m) => m.pgId === prev.activePgId && m.tenantUserId === prev.activeTenantUserId && m.status === 'Active'
      );
      if (!membership || membership.tenantId === prev.activeTenantId) return prev;
      return { ...prev, activeTenantId: membership.tenantId };
    });
  }, [update]);

  // ----- Tenants -----
  const addTenant = useCallback((tenant: Omit<Tenant, 'id'>) => {
    updateScanned((prev) => {
      const id = uid('t');
      const newTenant: Tenant = { ...tenant, id };
      // mark bed occupied
      const beds = prev.beds.map((b) =>
        b.roomId === tenant.roomId && b.bedNumber === tenant.bedNumber
          ? { ...b, status: 'occupied' as BedStatus, tenantId: id, vacantSince: undefined }
          : b
      );
      // add a security deposit record
      const depositPayment: Payment = {
        id: uid('p'),
        tenantId: id,
        type: 'Deposit',
        month: tenant.joiningDate.slice(0, 7),
        amount: tenant.securityDeposit,
        method: 'UPI',
        status: 'Paid',
        paidAt: tenant.joiningDate + 'T10:00:00Z',
        dueDate: tenant.joiningDate,
      };
      // add this month's rent record (pending until paid)
      const now = new Date();
      const rentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const rentPayment: Payment = {
        id: uid('p'),
        tenantId: id,
        type: 'Rent',
        month: rentMonth,
        amount: tenant.monthlyRent + prev.settings.foodCharge,
        method: 'UPI',
        status: 'Pending',
        dueDate: `${rentMonth}-05`,
      };
      const notif: Notification = {
        id: uid('n'),
        userId: 'all',
        userRole: 'owner',
        title: 'New Tenant Registered',
        message: `${tenant.fullName} has been allocated to Room ${prev.rooms.find((r) => r.id === tenant.roomId)?.roomNumber}, Bed ${tenant.bedNumber}.`,
        type: 'success',
        read: false,
        createdAt: new Date().toISOString(),
      };
      return {
        ...prev,
        tenants: [...prev.tenants, newTenant],
        beds,
        payments: [...prev.payments, depositPayment, rentPayment],
        notifications: [notif, ...prev.notifications],
      };
    });
  }, [updateScanned]);

  const updateTenant = useCallback((id: string, updates: Partial<Tenant>) => {
    updateScanned((prev) => ({
      ...prev,
      tenants: prev.tenants.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }));
  }, [updateScanned]);

  const deleteTenant = useCallback((id: string) => {
    updateScanned((prev) => {
      const tenant = prev.tenants.find((t) => t.id === id);
      if (!tenant) return prev;
      const beds = prev.beds.map((b) =>
        b.roomId === tenant.roomId && b.bedNumber === tenant.bedNumber
          ? { ...b, status: 'vacant' as BedStatus, tenantId: undefined, vacantSince: new Date().toISOString() }
          : b
      );
      return {
        ...prev,
        tenants: prev.tenants.filter((t) => t.id !== id),
        beds,
        payments: prev.payments.filter((p) => p.tenantId !== id),
      };
    });
  }, [updateScanned]);

  const markTenantNotice = useCallback((id: string) => {
    updateScanned((prev) => {
      const tenant = prev.tenants.find((t) => t.id === id);
      if (!tenant) return prev;
      const beds = prev.beds.map((b) =>
        b.roomId === tenant.roomId && b.bedNumber === tenant.bedNumber
          ? { ...b, status: 'notice' as BedStatus }
          : b
      );
      return {
        ...prev,
        tenants: prev.tenants.map((t) =>
          t.id === id ? { ...t, status: 'Notice Period', noticeDate: new Date().toISOString().split('T')[0] } : t
        ),
        beds,
      };
    });
  }, [updateScanned]);

  // ----- Payments -----
  const payPayment = useCallback((paymentId: string, method: Payment['method']) => {
    updateScanned((prev) => {
      const ref = `UPI/${Math.floor(Math.random() * 9000 + 1000)}/${Math.floor(Math.random() * 900 + 100)}`;
      const paidAt = new Date().toISOString();
      const payment = prev.payments.find((p) => p.id === paymentId);
      const tenant = prev.tenants.find((t) => t.id === payment?.tenantId);
      const tenantName = tenant?.fullName;
      const notif: Notification = {
        id: uid('n'),
        userId: 'all',
        userRole: 'owner',
        title: 'Payment Received',
        message: `${tenantName || 'Tenant'} made a payment of ₹${payment?.amount ?? 0}.`,
        type: 'success',
        read: false,
        createdAt: paidAt,
        category: payment?.type === 'Electricity' ? 'Electricity' : 'Rent',
        dedupeKey: `owner-pay-${paymentId}`,
      };
      // Tenant receipt notification via the delivery service (in-app + simulated channels)
      const receipt = payment
        ? materializeDraft(
            {
              dedupeKey: `pay-receipt-${payment.id}`,
              category: payment.type === 'Electricity' ? 'Electricity' : 'Rent',
              userRole: 'tenant',
              userId: payment.tenantId,
              tenantId: payment.tenantId,
              audience: 'tenant',
              title: 'Payment Successful',
              message: `Hi ${tenantName?.split(' ')[0] ?? 'there'}, your ${payment.type.toLowerCase()} payment of ₹${payment.amount.toLocaleString('en-IN')} was received (${method}). Reference: ${ref}. Thank you!`,
              type: 'success',
              link: payment.type === 'Electricity' ? '/app/tenant/electricity' : '/app/tenant/rent',
              createdAt: paidAt,
            },
            buildCtx(prev)
          )
        : { notification: null, logs: [] };
      return {
        ...prev,
        payments: prev.payments.map((p) =>
          p.id === paymentId
            ? { ...p, status: 'Paid', paidAt, method, reference: ref }
            : p
        ),
        notifications: [
          notif,
          ...(receipt.notification ? [receipt.notification] : []),
          ...prev.notifications,
        ],
        notificationLog: [...receipt.logs, ...prev.notificationLog],
      };
    });
  }, [updateScanned]);

  const sendRentReminder = useCallback((tenantId: string) => {
    update((prev) => {
      const tenant = prev.tenants.find((t) => t.id === tenantId);
      if (!tenant) return prev;
      const emitted = emitDrafts(prev, [
        {
          dedupeKey: `manual-reminder-${tenantId}-${new Date().toISOString().split('T')[0]}`,
          category: 'Rent',
          userRole: 'tenant',
          userId: tenantId,
          tenantId,
          audience: 'tenant',
          title: 'Rent Reminder',
          message: `Hi ${tenant.fullName.split(' ')[0]}, this is a friendly reminder from ${prev.settings.name} to pay your pending rent. Please complete your payment through Aapka PG.`,
          type: 'warning',
          link: '/app/tenant/rent',
          createdAt: new Date().toISOString(),
        },
      ]);
      return { ...prev, ...emitted };
    });
  }, [update]);

  const payElectricityShare = useCallback((readingId: string, method: Payment['method']) => {
    updateScanned((prev) => {
      const reading = prev.meterReadings.find((r) => r.id === readingId);
      if (!reading) return prev;
      const existing = prev.payments.find(
        (p) => p.type === 'Electricity' && p.month === reading.month && p.tenantId === prev.activeTenantId
      );
      const ref = `UPI/${Math.floor(Math.random() * 9000 + 1000)}/${Math.floor(Math.random() * 900 + 100)}`;
      const paidAt = new Date().toISOString();
      let payments: Payment[];
      if (existing) {
        payments = prev.payments.map((p) =>
          p.id === existing.id ? { ...p, status: 'Paid', paidAt, method, reference: ref } : p
        );
      } else {
        payments = [
          ...prev.payments,
          {
            id: uid('p'),
            tenantId: prev.activeTenantId,
            type: 'Electricity',
            month: reading.month,
            amount: reading.perTenantAmount,
            method,
            status: 'Paid',
            paidAt,
            dueDate: reading.recordedAt.split('T')[0],
            reference: ref,
          },
        ];
      }
      return { ...prev, payments };
    });
  }, [updateScanned]);

  // ----- Meter Readings -----
  const saveMeterReading = useCallback((reading: Omit<MeterReading, 'id' | 'units' | 'totalAmount' | 'perTenantAmount'>) => {
    updateScanned((prev) => {
      const units = Math.max(0, reading.currentReading - reading.previousReading);
      const totalAmount = units * reading.ratePerUnit;
      const perTenantAmount = Math.round(totalAmount / Math.max(1, reading.occupants));
      const newReading: MeterReading = {
        ...reading,
        id: uid('mr'),
        units,
        totalAmount,
        perTenantAmount,
      };

      // create pending electricity bills for each tenant in this room
      const tenantsInRoom = prev.tenants.filter((t) => t.roomId === reading.roomId && t.status !== 'Left');
      const existingMonthPayments = prev.payments.filter(
        (p) => p.type === 'Electricity' && p.month === reading.month
      );
      const newPayments: Payment[] = tenantsInRoom
        .filter((t) => !existingMonthPayments.some((p) => p.tenantId === t.id))
        .map((t) => ({
          id: uid('p'),
          tenantId: t.id,
          type: 'Electricity',
          month: reading.month,
          amount: perTenantAmount,
          method: 'UPI',
          status: 'Pending',
          dueDate: reading.recordedAt.split('T')[0],
        }));

      return {
        ...prev,
        meterReadings: [newReading, ...prev.meterReadings.filter((r) => !(r.roomId === reading.roomId && r.month === reading.month))],
        payments: [...prev.payments, ...newPayments],
      };
    });
  }, [updateScanned]);

  const publishBills = useCallback((month: string) => {
    updateScanned((prev) => {
      const updated = prev.meterReadings.map((r) =>
        r.month === month ? { ...r, published: true } : r
      );

      // create pending electricity payments for tenants of published rooms that don't have one yet
      const publishedRooms = new Set(updated.filter((r) => r.published && r.month === month).map((r) => r.roomId));
      const readingByRoom = new Map(updated.filter((r) => r.month === month).map((r) => [r.roomId, r]));
      const existingElec = new Set(
        prev.payments.filter((p) => p.type === 'Electricity' && p.month === month).map((p) => `${p.tenantId}`)
      );
      const newPayments: Payment[] = prev.tenants
        .filter((t) => t.status !== 'Left' && publishedRooms.has(t.roomId) && !existingElec.has(t.id))
        .map((t) => {
          const reading = readingByRoom.get(t.roomId)!;
          return {
            id: uid('p'),
            tenantId: t.id,
            type: 'Electricity' as const,
            month,
            amount: reading.perTenantAmount,
            method: 'UPI' as const,
            status: 'Pending' as const,
            dueDate: new Date(Date.now() + prev.reminderSchedule.electricityDueInDays * 86400000)
              .toISOString()
              .split('T')[0],
          };
        });

      // Per-tenant "bill published" notifications are generated by the
      // notification engine (deduped per reading + tenant).
      return {
        ...prev,
        meterReadings: updated,
        payments: [...prev.payments, ...newPayments],
      };
    });
  }, [updateScanned]);

  // ----- Complaints -----
  const addComplaint = useCallback((complaint: Omit<Complaint, 'id' | 'status' | 'submittedAt'>) => {
    updateScanned((prev) => {
      const newComplaint: Complaint = {
        ...complaint,
        id: uid('c'),
        status: 'Submitted',
        submittedAt: new Date().toISOString(),
      };
      const tenantName = prev.tenants.find((t) => t.id === complaint.tenantId)?.fullName;
      const notif: Notification = {
        id: uid('n'),
        userId: 'all',
        userRole: 'manager',
        title: 'New Complaint',
        message: `${tenantName || 'A tenant'} submitted a complaint in Room ${complaint.roomNumber}.`,
        type: 'info',
        read: false,
        createdAt: new Date().toISOString(),
      };
      const tenantNotif: Notification = {
        id: uid('n'),
        userId: complaint.tenantId,
        userRole: 'tenant',
        title: 'Complaint Submitted',
        message: `Your ${complaint.category} complaint has been submitted successfully.`,
        type: 'success',
        read: false,
        createdAt: new Date().toISOString(),
      };
      return {
        ...prev,
        complaints: [newComplaint, ...prev.complaints],
        notifications: [notif, tenantNotif, ...prev.notifications],
      };
    });
  }, [updateScanned]);

  const updateComplaintStatus = useCallback((id: string, status: ComplaintStatus, remarks?: string) => {
    updateScanned((prev) => {
      const complaint = prev.complaints.find((c) => c.id === id);
      const resolvedAt = status === 'Resolved' ? new Date().toISOString() : complaint?.resolvedAt;
      const tenantNotif: Notification | null = complaint ? {
        id: uid('n'),
        userId: complaint.tenantId,
        userRole: 'tenant',
        title: `Complaint ${status}`,
        message: `Your ${complaint.category} complaint is now ${status}.${remarks ? ` Note: ${remarks}` : ''}`,
        type: status === 'Resolved' ? 'success' : 'info',
        read: false,
        createdAt: new Date().toISOString(),
      } : null;
      return {
        ...prev,
        complaints: prev.complaints.map((c) =>
          c.id === id ? { ...c, status, remarks: remarks ?? c.remarks, resolvedAt } : c
        ),
        notifications: tenantNotif ? [tenantNotif, ...prev.notifications] : prev.notifications,
      };
    });
  }, [updateScanned]);

  // ----- Food -----
  const addMealOptOut = useCallback((tenantId: string, date: string, mealType: MealOptOut['mealType']) => {
    update((prev) => {
      // remove existing opt-out for same tenant+date+mealType
      const filtered = prev.mealOptOuts.filter(
        (o) => !(o.tenantId === tenantId && o.date === date && o.mealType === mealType)
      );
      return {
        ...prev,
        mealOptOuts: [...filtered, { id: uid('mo'), tenantId, date, mealType }],
      };
    });
  }, [update]);

  const removeMealOptOut = useCallback((tenantId: string, date: string, mealType: MealOptOut['mealType']) => {
    update((prev) => ({
      ...prev,
      mealOptOuts: prev.mealOptOuts.filter(
        (o) => !(o.tenantId === tenantId && o.date === date && o.mealType === mealType)
      ),
    }));
  }, [update]);

  const rateMeal = useCallback((tenantId: string, date: string, mealType: MealOptOut['mealType'], rating: number, review?: string) => {
    update((prev) => {
      const filtered = prev.foodRatings.filter(
        (r) => !(r.tenantId === tenantId && r.date === date && r.mealType === mealType)
      );
      return {
        ...prev,
        foodRatings: [...filtered, { id: uid('fr'), tenantId, date, mealType, rating, review }],
      };
    });
  }, [update]);

  // ----- Notifications -----
  const markNotificationRead = useCallback((id: string) => {
    update((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    }));
  }, [update]);

  const markAllNotificationsRead = useCallback((userId: string, role: 'tenant' | 'manager' | 'owner') => {
    update((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) =>
        (n.userId === userId || n.userId === prev.activeTenantUserId || n.userId === 'all') &&
        n.userRole === role
          ? { ...n, read: true }
          : n
      ),
    }));
  }, [update]);

  // ----- Settings -----
  const updateSettings = useCallback((updates: Partial<PGSettings>) => {
    update((prev) => ({ ...prev, settings: { ...prev.settings, ...updates } }));
  }, [update]);

  // ----- Bed actions -----
  const updateBedStatus = useCallback((bedId: string, status: BedStatus) => {
    updateScanned((prev) => ({
      ...prev,
      beds: prev.beds.map((b) =>
        b.id === bedId
          ? {
              ...b,
              status,
              vacantSince: status === 'vacant' ? new Date().toISOString() : undefined,
            }
          : b
      ),
    }));
  }, [updateScanned]);

  const reallocateBed = useCallback((tenantId: string, roomId: string, bedNumber: number) => {
    updateScanned((prev) => ({
      ...prev,
      beds: prev.beds.map((b) => {
        if (b.tenantId === tenantId && !(b.roomId === roomId && b.bedNumber === bedNumber)) {
          return { ...b, status: 'vacant' as BedStatus, tenantId: undefined, vacantSince: new Date().toISOString() };
        }
        if (b.roomId === roomId && b.bedNumber === bedNumber) {
          return { ...b, status: 'occupied' as BedStatus, tenantId, vacantSince: undefined };
        }
        return b;
      }),
    }));
  }, [updateScanned]);

  // ----- Notification automation engine (prototype of a background scheduler) -----
  const runNotificationEngine = useCallback(() => {
    update((prev) => runNotificationScan(prev));
  }, [update]);

  // ----- Notification preferences & schedule -----
  const updateNotificationPrefs = useCallback(
    (tenantId: string, prefs: Partial<Omit<NotificationPrefs, 'tenantId'>>) => {
      update((prev) => ({
        ...prev,
        notificationPrefs: prev.notificationPrefs.map((p) =>
          p.tenantId === tenantId ? { ...p, ...prefs } : p
        ),
      }));
    },
    [update]
  );

  const updateReminderSchedule = useCallback((updates: Partial<ReminderSchedule>) => {
    update((prev) => ({ ...prev, reminderSchedule: { ...prev.reminderSchedule, ...updates } }));
  }, [update]);

  // ----- Subscription (SaaS billing â€“ kept separate from tenant payments) -----
  const ownerSubDraft = (
    dedupeKey: string,
    title: string,
    message: string,
    type: Notification['type']
  ): NotificationDraft => ({
    dedupeKey,
    category: 'Subscription',
    userRole: 'owner',
    userId: 'all',
    audience: 'staff',
    title,
    message,
    type,
    link: '/app/owner/subscription',
    createdAt: new Date().toISOString(),
  });

  const checkoutSubscription = useCallback(
    (opts: { planId: PlanId; cycle: BillingCycle; method: SaaSPaymentMethod; simulateFailure?: boolean; trial?: boolean }) => {
      update((prev) => {
        const plan = getPlan(opts.planId);
        const amount = opts.cycle === 'monthly' ? plan.monthlyPrice : plan.annualPrice;
        const periodEnd = new Date();
        if (opts.trial) {
          periodEnd.setDate(periodEnd.getDate() + FREE_TRIAL_DAYS);
        } else if (opts.cycle === 'monthly') {
          periodEnd.setMonth(periodEnd.getMonth() + 1);
        } else {
          periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        }
        const now = new Date().toISOString();
        const success = opts.trial || !opts.simulateFailure;
        const invoice: SubscriptionInvoice = {
          id: uid('inv'),
          number: nextInvoiceNumber(prev.subscription.invoices),
          date: now.split('T')[0],
          planId: opts.planId,
          cycle: opts.cycle,
          amount: opts.trial ? 0 : amount,
          status: opts.trial ? 'Paid' : success ? 'Paid' : 'Failed',
          method: opts.method,
          paidAt: success ? now : undefined,
          reference: opts.trial ? 'TRIAL' : success ? `SIM/${opts.method}/${Math.floor(Math.random() * 9000 + 1000)}` : undefined,
        };
        const subscription: Subscription = {
          planId: opts.planId,
          status: opts.trial ? 'Trial' : success ? 'Active' : 'Payment Pending',
          cycle: opts.cycle,
          startedAt: now.split('T')[0],
          currentPeriodEnd: periodEnd.toISOString().split('T')[0],
          trialEndsAt: opts.trial ? periodEnd.toISOString().split('T')[0] : undefined,
          amountPaid: success && !opts.trial ? amount : 0,
          autoRenew: true,
          failedPaymentAt: success ? undefined : now,
          invoices: [...prev.subscription.invoices, invoice],
        };
        const draft = opts.trial
          ? ownerSubDraft(
              `sub-trial-started-${subscription.startedAt}`,
              'Free Trial Started',
              `Your ${FREE_TRIAL_DAYS}-day free trial of the ${plan.name} plan has started. Trial ends on ${subscription.trialEndsAt}.`,
              'success'
            )
          : success
          ? ownerSubDraft(
              `sub-activated-${subscription.startedAt}-${opts.planId}`,
              'Subscription Activated',
              `Your ${plan.name} plan (${opts.cycle}) is now active. Next renewal: ${subscription.currentPeriodEnd}. Simulated payment of ₹${amount.toLocaleString('en-IN')} via ${opts.method}.`,
              'success'
            )
          : ownerSubDraft(
              `sub-failed-${subscription.startedAt}-${opts.planId}`,
              'Subscription Payment Failed',
              `Your ${plan.name} plan payment of ₹${amount.toLocaleString('en-IN')} failed. Please retry the payment from the Subscription & Billing page. Grace period: ${prev.reminderSchedule.gracePeriodDays} days.`,
              'error'
            );
        const emitted = emitDrafts(prev, [draft]);
        return { ...prev, subscription, ...emitted };
      });
    },
    [update]
  );

  const upgradePlan = useCallback((planId: PlanId) => {
    update((prev) => {
      const plan = getPlan(planId);
      const amount = prev.subscription.cycle === 'monthly' ? plan.monthlyPrice : plan.annualPrice;
      const now = new Date().toISOString();
      const invoice: SubscriptionInvoice = {
        id: uid('inv'),
        number: nextInvoiceNumber(prev.subscription.invoices),
        date: now.split('T')[0],
        planId,
        cycle: prev.subscription.cycle,
        amount,
        status: 'Paid',
        method: 'UPI',
        paidAt: now,
        reference: `SIM/UPI/${Math.floor(Math.random() * 9000 + 1000)}`,
      };
      const draft = ownerSubDraft(
        `sub-upgraded-${planId}-${now.split('T')[0]}`,
        'Plan Upgraded',
        `Your plan has been upgraded to ${plan.name}. New features are available immediately. Simulated payment of ₹${amount.toLocaleString('en-IN')}.`,
        'success'
      );
      const emitted = emitDrafts(prev, [draft]);
      return {
        ...prev,
        subscription: {
          ...prev.subscription,
          planId,
          pendingPlanId: undefined,
          status: prev.subscription.status === 'Trial' ? 'Trial' : 'Active',
          amountPaid: prev.subscription.amountPaid + amount,
          invoices: [...prev.subscription.invoices, invoice],
        },
        ...emitted,
      };
    });
  }, [update]);

  const scheduleDowngrade = useCallback((planId: PlanId) => {
    update((prev) => {
      const plan = getPlan(planId);
      const draft = ownerSubDraft(
        `sub-downgrade-scheduled-${planId}-${prev.subscription.currentPeriodEnd}`,
        'Downgrade Scheduled',
        `Your plan will change to ${plan.name} on ${prev.subscription.currentPeriodEnd} (next renewal). You keep ${getPlan(prev.subscription.planId).name} features until then.`,
        'info'
      );
      const emitted = emitDrafts(prev, [draft]);
      return { ...prev, subscription: { ...prev.subscription, pendingPlanId: planId }, ...emitted };
    });
  }, [update]);

  const changeBillingCycle = useCallback((cycle: BillingCycle) => {
    update((prev) => {
      const draft = ownerSubDraft(
        `sub-cycle-${cycle}-${prev.subscription.currentPeriodEnd}`,
        'Billing Cycle Change Scheduled',
        `Your subscription will switch to ${cycle} billing on ${prev.subscription.currentPeriodEnd}.`,
        'info'
      );
      const emitted = emitDrafts(prev, [draft]);
      return { ...prev, subscription: { ...prev.subscription, pendingCycle: cycle }, ...emitted };
    });
  }, [update]);

  const renewSubscription = useCallback((method: SaaSPaymentMethod = 'UPI') => {
    update((prev) => {
      const sub = prev.subscription;
      const effectivePlan = getPlan(sub.pendingPlanId ?? sub.planId);
      const effectiveCycle = sub.pendingCycle ?? sub.cycle;
      const amount = effectiveCycle === 'monthly' ? effectivePlan.monthlyPrice : effectivePlan.annualPrice;
      const periodEnd = new Date(sub.currentPeriodEnd);
      if (effectiveCycle === 'monthly') periodEnd.setMonth(periodEnd.getMonth() + 1);
      else periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      const now = new Date().toISOString();
      const invoice: SubscriptionInvoice = {
        id: uid('inv'),
        number: nextInvoiceNumber(sub.invoices),
        date: now.split('T')[0],
        planId: effectivePlan.id,
        cycle: effectiveCycle,
        amount,
        status: 'Paid',
        method,
        paidAt: now,
        reference: `SIM/${method}/${Math.floor(Math.random() * 9000 + 1000)}`,
      };
      const draft = ownerSubDraft(
        `sub-renewed-${periodEnd.toISOString().split('T')[0]}`,
        'Subscription Renewed',
        `Your ${effectivePlan.name} plan (${effectiveCycle}) was renewed successfully. Next renewal: ${periodEnd.toISOString().split('T')[0]}.`,
        'success'
      );
      const emitted = emitDrafts(prev, [draft]);
      return {
        ...prev,
        subscription: {
          ...sub,
          planId: effectivePlan.id,
          cycle: effectiveCycle,
          pendingPlanId: undefined,
          pendingCycle: undefined,
          status: 'Active',
          failedPaymentAt: undefined,
          currentPeriodEnd: periodEnd.toISOString().split('T')[0],
          amountPaid: sub.amountPaid + amount,
          invoices: [...sub.invoices, invoice],
        },
        ...emitted,
      };
    });
  }, [update]);

  const retrySubscriptionPayment = useCallback((method: SaaSPaymentMethod = 'UPI') => {
    update((prev) => {
      const sub = prev.subscription;
      const plan = getPlan(sub.planId);
      const amount = sub.cycle === 'monthly' ? plan.monthlyPrice : plan.annualPrice;
      const now = new Date().toISOString();
      const invoice: SubscriptionInvoice = {
        id: uid('inv'),
        number: nextInvoiceNumber(sub.invoices),
        date: now.split('T')[0],
        planId: sub.planId,
        cycle: sub.cycle,
        amount,
        status: 'Paid',
        method,
        paidAt: now,
        reference: `SIM/${method}/${Math.floor(Math.random() * 9000 + 1000)}`,
      };
      const draft = ownerSubDraft(
        `sub-retry-success-${now.split('T')[0]}`,
        'Payment Successful',
        `Your subscription payment of ₹${amount.toLocaleString('en-IN')} succeeded. Full access restored.`,
        'success'
      );
      const emitted = emitDrafts(prev, [draft]);
      return {
        ...prev,
        subscription: {
          ...sub,
          status: 'Active',
          failedPaymentAt: undefined,
          amountPaid: sub.amountPaid + amount,
          invoices: [...sub.invoices, invoice],
        },
        ...emitted,
      };
    });
  }, [update]);

  const setAutoRenew = useCallback((autoRenew: boolean) => {
    update((prev) => {
      const draft = ownerSubDraft(
        `sub-autorenew-${autoRenew}-${prev.subscription.currentPeriodEnd}`,
        autoRenew ? 'Auto-Renew Enabled' : 'Subscription Cancelled',
        autoRenew
          ? 'Your subscription will renew automatically at the end of the billing period.'
          : `Auto-renew turned off. You keep access until ${prev.subscription.currentPeriodEnd}; after that the subscription expires. Your PG records are never deleted.`,
        autoRenew ? 'success' : 'warning'
      );
      const emitted = emitDrafts(prev, [draft]);
      return {
        ...prev,
        subscription: {
          ...prev.subscription,
          autoRenew,
          status: autoRenew ? 'Active' : 'Cancelled',
        },
        ...emitted,
      };
    });
  }, [update]);


  // =====================================================================
  // Multi-PG platform: owner onboarding, authentication and admissions
  // (API seam: these actions mirror the documented REST endpoints)
  // =====================================================================

  // POST /api/owner/register
  const startOwnerRegistration = useCallback(
    (payload: {
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
        pgType: PGType;
      };
      planId: PlanId;
      cycle: BillingCycle;
      amount: number;
    }) => {
      const email = payload.owner.email.trim().toLowerCase();
      const mobile = payload.owner.mobile.trim();
      if (data.platform.pgs.some((p) => p.ownerEmail.toLowerCase() === email)) {
        return { ok: false as const, error: 'An account with this email already exists. Please log in instead.' };
      }
      if (data.platform.pgs.some((p) => p.ownerMobile === mobile)) {
        return { ok: false as const, error: 'An account with this mobile number already exists. Please log in instead.' };
      }
      if (
        data.platform.pendingRegistrations.some(
          (r) => r.owner.email.toLowerCase() === email && r.status !== 'Active'
        )
      ) {
        return { ok: false as const, error: 'A registration is already in progress for this email. Complete it from the login page.' };
      }
      const plan = getPlan(payload.planId);
      if (plan.limits.beds !== null && payload.pg.beds > plan.limits.beds) {
        return {
          ok: false as const,
          error: `${plan.name} plan supports up to ${plan.limits.beds} beds. Choose a bigger plan or reduce the bed count.`,
        };
      }
      const reg: PendingRegistration = {
        id: uid('reg'),
        owner: payload.owner,
        pg: payload.pg,
        planId: payload.planId,
        cycle: payload.cycle,
        amount: payload.amount,
        status: 'Awaiting Payment',
        suggestedUsernames: generateUsernameSuggestions(payload.pg.pgName, data.platform.pgs),
        processedCallbacks: [],
        createdAt: new Date().toISOString(),
      };
      update((prev) => ({
        ...prev,
        platform: {
          ...prev.platform,
          pendingRegistrations: [reg, ...prev.platform.pendingRegistrations],
        },
      }));
      return { ok: true as const, regId: reg.id };
    },
    [update, data.platform]
  );

  // POST /api/owner/complete-payment (initiate)
  const submitRegistrationPayment = useCallback(
    (regId: string, method: SaaSPaymentMethod) => {
      const reg = data.platform.pendingRegistrations.find((r) => r.id === regId);
      if (!reg || (reg.status !== 'Awaiting Payment' && reg.status !== 'Payment Failed')) {
        return { ok: false as const, error: 'This registration is not awaiting payment' };
      }
      const order = createOrder(reg.amount, method);
      update((prev) => ({
        ...prev,
        platform: {
          ...prev.platform,
          pendingRegistrations: prev.platform.pendingRegistrations.map((r) =>
            r.id === regId ? { ...r, orderId: order.orderId, status: 'Payment Pending Verification' } : r
          ),
        },
      }));
      return { ok: true as const, order };
    },
    [update, data.platform]
  );

  // POST /api/owner/complete-payment (gateway callback → verify → provision)
  const completeRegistrationPayment = useCallback(
    (regId: string, outcome: 'success' | 'failure') => {
      const reg = data.platform.pendingRegistrations.find((r) => r.id === regId);
      if (!reg || !reg.orderId) {
        return { ok: false as const, error: 'No payment order found for this registration' };
      }
      const cb: GatewayCallback = simulateGatewayCallback(
        { orderId: reg.orderId, amount: reg.amount, method: 'UPI', status: 'created' },
        outcome
      );
      // Backend-style verification: signature + idempotency before anything is activated.
      const verification = verifyCallback(cb, reg.processedCallbacks);
      if (verification.duplicate) {
        return { ok: false as const, duplicate: true, error: 'Duplicate payment callback ignored' };
      }
      if (!verification.verified) {
        update((prev) => ({
          ...prev,
          platform: {
            ...prev.platform,
            pendingRegistrations: prev.platform.pendingRegistrations.map((r) =>
              r.id === regId
                ? {
                    ...r,
                    status: 'Payment Failed',
                    processedCallbacks: [...r.processedCallbacks, cb.paymentId],
                  }
                : r
            ),
          },
        }));
        return { ok: false as const, error: verification.reason ?? 'Payment verification failed' };
      }

      // Verified → provision the PG account (inactive until setup completes)
      const pgId = uid('pg');
      const now = new Date().toISOString();
      const today = now.split('T')[0];
      const plan = getPlan(reg.planId);
      const periodEnd = new Date();
      if (reg.cycle === 'monthly') periodEnd.setMonth(periodEnd.getMonth() + 1);
      else periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      const invoice: SubscriptionInvoice = {
        id: uid('inv'),
        number: nextInvoiceNumber([]),
        date: today,
        planId: reg.planId,
        cycle: reg.cycle,
        amount: reg.amount,
        status: 'Paid',
        method: 'UPI',
        paidAt: now,
        reference: `SIM/UPI/${cb.paymentId.slice(-6).toUpperCase()}`,
      };
      const workspace: PGWorkspace = {
        settings: {
          name: reg.pg.pgName,
          address: reg.pg.address,
          city: reg.pg.city,
          contactEmail: reg.owner.email,
          contactPhone: reg.owner.mobile,
          electricityRate: 9,
          foodCharge: 1000,
          ownerName: reg.owner.fullName,
          timezone: 'Asia/Kolkata',
          channels: { whatsapp: true, sms: true, email: true },
        },
        tenants: [],
        rooms: [],
        beds: [],
        meterReadings: [],
        payments: [],
        complaints: [],
        foodMenu: initialFoodMenu,
        foodRatings: [],
        mealOptOuts: [],
        notifications: [],
        notificationLog: [],
        notificationPrefs: [],
        reminderSchedule: initialReminderSchedule,
        subscription: {
          planId: reg.planId,
          status: 'Active',
          cycle: reg.cycle,
          startedAt: today,
          currentPeriodEnd: periodEnd.toISOString().split('T')[0],
          amountPaid: reg.amount,
          autoRenew: true,
          invoices: [invoice],
        },
      };
      const pgAccount: PGAccount = {
        id: pgId,
        pgName: reg.pg.pgName,
        pgUsername: normalizeUsername(reg.suggestedUsernames[0] ?? slugifyPgName(reg.pg.pgName)),
        description: reg.pg.description,
        address: reg.pg.address,
        city: reg.pg.city,
        state: reg.pg.state,
        pinCode: reg.pg.pinCode,
        pgType: reg.pg.pgType,
        ownerName: reg.owner.fullName,
        ownerEmail: reg.owner.email,
        ownerMobile: reg.owner.mobile,
        passwordHash: null,
        isActive: false, // activated only after username confirmation + password setup
        isDiscoverable: false,
        showAvailableBeds: true,
        subscriptionPlanId: reg.planId,
        createdAt: now,
        updatedAt: now,
      };
      update((prev) => ({
        ...prev,
        platform: {
          ...prev.platform,
          pgs: [...prev.platform.pgs, pgAccount],
          pendingRegistrations: prev.platform.pendingRegistrations.map((r) =>
            r.id === regId
              ? {
                  ...r,
                  status: 'Payment Verified',
                  pgId,
                  processedCallbacks: [...r.processedCallbacks, cb.paymentId],
                }
              : r
          ),
          auditLogs: [
            auditEntry(
              'system',
              'PAYMENT_VERIFIED',
              'Payment',
              cb.paymentId,
              `Subscription payment of ₹${reg.amount.toLocaleString('en-IN')} verified for ${reg.pg.pgName} (${plan.name}, ${reg.cycle}).`
            ),
            ...prev.platform.auditLogs,
          ],
        },
        workspaces: { ...prev.workspaces, [pgId]: workspace },
      }));
      return { ok: true as const, pgId };
    },
    [update, data.platform]
  );

  // POST /api/pg/confirm-username
  const confirmPgUsername = useCallback(
    (regId: string, username: string) => {
      const reg = data.platform.pendingRegistrations.find((r) => r.id === regId);
      if (!reg || !reg.pgId) return { ok: false as const, error: 'Complete the payment first' };
      const err = usernameError(username);
      if (err) return { ok: false as const, error: err };
      const u = normalizeUsername(username);
      if (isUsernameTaken(u, data.platform.pgs.filter((p) => p.id !== reg.pgId))) {
        return {
          ok: false as const,
          error: 'This username is already taken. Try one of the suggestions.',
          suggestions: generateUsernameSuggestions(reg.pg.pgName, data.platform.pgs),
        };
      }
      const now = new Date().toISOString();
      update((prev) => ({
        ...prev,
        platform: {
          ...prev.platform,
          pgs: prev.platform.pgs.map((p) =>
            p.id === reg.pgId ? { ...p, pgUsername: u, updatedAt: now } : p
          ),
          pendingRegistrations: prev.platform.pendingRegistrations.map((r) =>
            r.id === regId ? { ...r, pgUsername: u, status: 'Username Confirmed' } : r
          ),
          auditLogs: [
            auditEntry(reg.owner.fullName, 'PG_USERNAME_CONFIRMED', 'PG', u, `Username ${u} confirmed for ${reg.pg.pgName}.`),
            ...prev.platform.auditLogs,
          ],
        },
      }));
      return { ok: true as const, username: u };
    },
    [update, data.platform]
  );

  // POST /api/owner/set-password (+ PG activation)
  const setOwnerPasswordAndActivate = useCallback(
    async (regId: string, password: string) => {
      const reg = data.platform.pendingRegistrations.find((r) => r.id === regId);
      if (!reg || !reg.pgId) return { ok: false as const, error: 'Registration not found' };
      const policy = validatePassword(password);
      if (!policy.ok) return { ok: false as const, error: `Password must include ${policy.errors.join(', ')}` };
      const passwordHash = await hashPassword(password);
      const now = new Date().toISOString();
      const username = reg.pgUsername ?? '';
      update((prev) => ({
        ...prev,
        platform: {
          ...prev.platform,
          pgs: prev.platform.pgs.map((p) =>
            p.id === reg.pgId
              ? { ...p, passwordHash, isActive: true, isDiscoverable: true, updatedAt: now }
              : p
          ),
          pendingRegistrations: prev.platform.pendingRegistrations.map((r) =>
            r.id === regId ? { ...r, status: 'Active' } : r
          ),
          auditLogs: [
            auditEntry(reg.owner.fullName, 'PG_ACTIVATED', 'PG', username, `${reg.pg.pgName} activated and made discoverable as ${username}.`),
            ...prev.platform.auditLogs,
          ],
        },
        workspaces: {
          ...prev.workspaces,
          [reg.pgId!]: {
            ...prev.workspaces[reg.pgId!],
            notifications: [
              {
                id: uid('n'),
                userId: 'all',
                userRole: 'owner',
                title: 'Welcome to Aapka PG!',
                message: `Congratulations! ${reg.pg.pgName} is now registered on Aapka PG. Share your unique PG username (${username}) with your tenants so they can request to join your PG.`,
                type: 'success',
                read: false,
                createdAt: now,
                link: '/app/owner',
                category: 'Admission',
                dedupeKey: `pg-activated-${reg.pgId}`,
              },
              ...prev.workspaces[reg.pgId!].notifications,
            ],
          },
        },
      }));
      return { ok: true as const, username };
    },
    [update, data.platform]
  );

  // POST /api/owner/login
  const ownerLogin = useCallback(
    async (username: string, password: string) => {
      const u = normalizeUsername(username);
      const pg = data.platform.pgs.find(
        (p) => p.pgUsername.toLowerCase() === u && p.isActive
      );
      if (!pg) {
        return { ok: false as const, error: 'No PG account found with this username' };
      }
      if (!pg.passwordHash) {
        return { ok: false as const, error: 'Account setup incomplete. Complete your PG setup first.' };
      }
      const pwOk = await verifyPassword(password, pg.passwordHash);
      if (!pwOk) {
        return { ok: false as const, error: 'Incorrect password' };
      }
      update((prev) => {
        const savedWorkspaces = { ...prev.workspaces, [prev.activePgId]: snapshotOf(prev) };
        const target = savedWorkspaces[pg.id] ?? prev.workspaces[pg.id];
        const next: AppData = {
          ...prev,
          ...(target ?? {}),
          workspaces: savedWorkspaces,
          activePgId: pg.id,
          activeRole: 'owner',
          platform: {
            ...prev.platform,
            auditLogs: [
              auditEntry(pg.ownerName, 'OWNER_LOGIN', 'PG', pg.pgUsername, `Owner logged in to ${pg.pgName}.`),
              ...prev.platform.auditLogs,
            ],
          },
        };
        return runNotificationScan(next);
      });
      return { ok: true as const };
    },
    [update, data.platform]
  );

  // POST /api/owner/reset-password (demo reset code verified here, not in UI)
  const resetOwnerPassword = useCallback(
    async (username: string, code: string, newPassword: string) => {
      if (code !== DEMO_RESET_CODE) {
        return { ok: false as const, error: 'Invalid reset code. Use the demo code 1234.' };
      }
      const u = normalizeUsername(username);
      const pg = data.platform.pgs.find((p) => p.pgUsername.toLowerCase() === u && p.isActive);
      if (!pg) return { ok: false as const, error: 'No PG account found with this username' };
      const policy = validatePassword(newPassword);
      if (!policy.ok) return { ok: false as const, error: `Password must include ${policy.errors.join(', ')}` };
      const passwordHash = await hashPassword(newPassword);
      update((prev) => ({
        ...prev,
        platform: {
          ...prev.platform,
          pgs: prev.platform.pgs.map((p) =>
            p.id === pg.id ? { ...p, passwordHash, updatedAt: new Date().toISOString() } : p
          ),
          auditLogs: [
            auditEntry(pg.ownerName, 'PASSWORD_RESET', 'PG', pg.pgUsername, 'Owner password was reset via verified recovery contact.'),
            ...prev.platform.auditLogs,
          ],
        },
      }));
      return { ok: true as const };
    },
    [update, data.platform]
  );

  // POST /api/tenant/register
  const tenantRegister = useCallback(
    (payload: { fullName: string; mobile: string; email: string; gender?: string }) => {
      const mobile = payload.mobile.trim();
      if (!/^[6-9]\d{9}$/.test(mobile)) return { ok: false as const, error: 'Enter a valid 10-digit mobile number' };
      if (data.platform.tenantUsers.some((u) => u.mobile === mobile)) {
        return { ok: false as const, error: 'An account with this mobile number already exists. Please log in.' };
      }
      const user: TenantUser = {
        id: uid('tu'),
        fullName: payload.fullName.trim(),
        mobile,
        email: payload.email.trim(),
        gender: payload.gender,
        createdAt: new Date().toISOString(),
      };
      update((prev) => ({
        ...prev,
        platform: { ...prev.platform, tenantUsers: [...prev.platform.tenantUsers, user] },
        activeRole: 'tenant',
        activeTenantUserId: user.id,
      }));
      return { ok: true as const, userId: user.id };
    },
    [update, data.platform]
  );

  // POST /api/tenant/login (OTP verified in the demo UI; account resolved here)
  const tenantLogin = useCallback(
    (mobile: string) => {
      const user = data.platform.tenantUsers.find((u) => u.mobile === mobile.trim());
      if (!user) {
        return { ok: false as const, error: 'No tenant account found with this mobile number. Create an account first.' };
      }
      update((prev) => {
        const membership = prev.platform.memberships.find(
          (m) => m.tenantUserId === user.id && m.status === 'Active'
        );
        const latestRequest = [...prev.platform.admissionRequests]
          .filter((r) => r.tenantUserId === user.id)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
        const pgId = membership?.pgId ?? latestRequest?.pgId ?? prev.activePgId;
        const savedWorkspaces = { ...prev.workspaces, [prev.activePgId]: snapshotOf(prev) };
        const target = savedWorkspaces[pgId] ?? prev.workspaces[pgId] ?? snapshotOf(prev);
        const next: AppData = {
          ...prev,
          ...target,
          workspaces: savedWorkspaces,
          activePgId: pgId,
          activeRole: 'tenant',
          activeTenantUserId: user.id,
          activeTenantId: membership?.tenantId ?? prev.activeTenantId,
        };
        return runNotificationScan(next);
      });
      return { ok: true as const };
    },
    [update, data.platform]
  );

  // POST /api/admission/request
  const submitAdmissionRequest = useCallback(
    (payload: {
      pgId: string;
      tenantUserId: string;
      fullName: string;
      mobile: string;
      email: string;
      gender?: string;
      emergencyContact: string;
      preferredJoiningDate: string;
      preferredRoomType: string;
      preferredBedId?: string;
      occupants: number;
      additionalMessage: string;
      documents: { idProof?: string; photograph?: string; additional?: string };
    }) => {
      const pg = data.platform.pgs.find((p) => p.id === payload.pgId);
      if (!pg || !pg.isActive || !pg.isDiscoverable) {
        return { ok: false as const, error: 'This PG is not accepting admission requests' };
      }
      const user = data.platform.tenantUsers.find((u) => u.id === payload.tenantUserId);
      if (!user) return { ok: false as const, error: 'Please log in to submit an admission request' };
      const duplicate = data.platform.admissionRequests.find(
        (r) => r.pgId === payload.pgId && r.tenantUserId === payload.tenantUserId && r.status === 'Pending'
      );
      if (duplicate) {
        return { ok: false as const, error: 'You already have a pending request with this PG' };
      }
      const today = new Date().toISOString().split('T')[0];
      if (payload.preferredJoiningDate < today) {
        return { ok: false as const, error: 'Preferred joining date cannot be in the past' };
      }
      const year = new Date().getFullYear();
      let seq = data.platform.admissionRequests.length + 1;
      let requestId = `AR-${year}-${String(seq).padStart(4, '0')}`;
      while (data.platform.admissionRequests.some((r) => r.requestId === requestId)) {
        seq += 1;
        requestId = `AR-${year}-${String(seq).padStart(4, '0')}`;
      }
      const now = new Date().toISOString();
      const request: AdmissionRequest = {
        id: uid('ar'),
        requestId,
        pgId: payload.pgId,
        tenantUserId: payload.tenantUserId,
        fullName: payload.fullName.trim(),
        mobile: payload.mobile.trim(),
        email: payload.email.trim(),
        gender: payload.gender,
        emergencyContact: payload.emergencyContact.trim(),
        preferredJoiningDate: payload.preferredJoiningDate,
        preferredRoomType: payload.preferredRoomType,
        preferredBedId: payload.preferredBedId,
        occupants: payload.occupants,
        additionalMessage: payload.additionalMessage.trim(),
        documents: payload.documents,
        status: 'Pending',
        createdAt: now,
        updatedAt: now,
      };

      const pgId = payload.pgId;
      updateScanned((prev) => {
        // Re-check duplicates against latest state (transactional guard)
        const dup = prev.platform.admissionRequests.find(
          (r) => r.pgId === pgId && r.tenantUserId === payload.tenantUserId && r.status === 'Pending'
        );
        if (dup) return prev;
        const emitted = applyToWorkspace(prev, pgId, (ws) => ({
          ...ws,
          ...emitDraftsIntoWorkspace(ws, [
            {
              dedupeKey: `admission-submitted-${requestId}`,
              category: 'Admission',
              userRole: 'owner',
              userId: 'all',
              audience: 'staff',
              title: 'New Tenant Admission Request',
              message: `${request.fullName} has requested admission to ${ws.settings.name}. Request ${requestId} · submitted ${new Date(now).toLocaleString('en-IN')}.`,
              type: 'info',
              link: '/app/owner/admissions',
              createdAt: now,
            },
            {
              dedupeKey: `admission-submitted-tenant-${requestId}`,
              category: 'Admission',
              userRole: 'tenant',
              userId: payload.tenantUserId,
              audience: 'tenant',
              title: 'Admission Request Submitted',
              message: `Your admission request has been successfully submitted to ${ws.settings.name}. You will receive a notification once the owner reviews your application.`,
              type: 'success',
              link: '/app/tenant/admission',
              createdAt: now,
            },
          ]),
        }));
        return {
          ...emitted,
          platform: {
            ...prev.platform,
            admissionRequests: [request, ...prev.platform.admissionRequests],
            auditLogs: [
              auditEntry(
                request.fullName,
                'ADMISSION_SUBMITTED',
                'AdmissionRequest',
                requestId,
                `Admission request submitted to ${pg.pgName}.`
              ),
              ...prev.platform.auditLogs,
            ],
          },
        };
      });
      return { ok: true as const, requestId };
    },
    [updateScanned, data.platform]
  );

  // POST /api/owner/admission-requests/{id}/approve
  const approveAdmissionRequest = useCallback(
    (
      requestId: string,
      allocation: { roomId: string; bedId: string; monthlyRent: number; securityDeposit: number; joiningDate: string }
    ) => {
      const req = data.platform.admissionRequests.find((r) => r.requestId === requestId);
      if (!req) return { ok: false as const, error: 'Request not found' };
      if (req.status !== 'Pending') return { ok: false as const, error: 'This request has already been reviewed' };
      const ws = data.workspaces[req.pgId] ?? (req.pgId === data.activePgId ? snapshotOf(data) : undefined);
      if (!ws) return { ok: false as const, error: 'PG workspace not found' };
      const bed = ws.beds.find((b) => b.id === allocation.bedId);
      if (!bed) return { ok: false as const, error: 'Selected bed does not exist' };
      if (bed.status !== 'vacant') {
        return {
          ok: false as const,
          error: 'This bed was just allocated to someone else. Please select another vacant bed.',
        };
      }
      if (allocation.monthlyRent <= 0) return { ok: false as const, error: 'Monthly rent must be greater than zero' };
      if (allocation.securityDeposit < 0) return { ok: false as const, error: 'Security deposit cannot be negative' };
      const pg = data.platform.pgs.find((p) => p.id === req.pgId)!;
      const room = ws.rooms.find((r) => r.id === allocation.roomId);
      const now = new Date().toISOString();

      updateScanned((prev) => {
        // Re-validate on latest state to prevent two tenants getting the same bed
        const latest = prev.platform.admissionRequests.find((r) => r.requestId === requestId);
        if (!latest || latest.status !== 'Pending') return prev;
        const wsNow =
          req.pgId === prev.activePgId ? snapshotOf(prev) : prev.workspaces[req.pgId];
        const bedNow = wsNow?.beds.find((b) => b.id === allocation.bedId);
        if (!wsNow || !bedNow || bedNow.status !== 'vacant') return prev;

        const existingMembership = prev.platform.memberships.find(
          (m) => m.pgId === req.pgId && m.tenantUserId === latest.tenantUserId
        );
        const tenantId = existingMembership?.tenantId ?? uid('t');

        const next = applyToWorkspace(prev, req.pgId, (ws2) => {
          const tenants = existingMembership
            ? ws2.tenants.map((t) =>
                t.id === tenantId
                  ? {
                      ...t,
                      roomId: allocation.roomId,
                      bedNumber: bedNow.bedNumber,
                      monthlyRent: allocation.monthlyRent,
                      securityDeposit: allocation.securityDeposit,
                      joiningDate: allocation.joiningDate,
                      status: 'Active' as const,
                    }
                  : t
              )
            : [
                ...ws2.tenants,
                {
                  id: tenantId,
                  fullName: latest.fullName,
                  mobile: latest.mobile,
                  email: latest.email,
                  emergencyContact: latest.emergencyContact,
                  roomId: allocation.roomId,
                  bedNumber: bedNow.bedNumber,
                  monthlyRent: allocation.monthlyRent,
                  securityDeposit: allocation.securityDeposit,
                  joiningDate: allocation.joiningDate,
                  policeVerification: 'Pending' as const,
                  status: 'Active' as const,
                } satisfies Tenant,
              ];
          const beds = ws2.beds.map((b) =>
            b.id === allocation.bedId
              ? { ...b, status: 'occupied' as BedStatus, tenantId, vacantSince: undefined }
              : b
          );
          const rentMonth = allocation.joiningDate.slice(0, 7);
          const payments: Payment[] = [
            ...ws2.payments,
            {
              id: uid('p'),
              tenantId,
              type: 'Rent',
              month: rentMonth,
              amount: allocation.monthlyRent + ws2.settings.foodCharge,
              method: 'UPI',
              status: 'Pending',
              dueDate: `${rentMonth}-05`,
            },
          ];
          const emitted = emitDraftsIntoWorkspace({ ...ws2, tenants, beds, payments }, [
            {
              dedupeKey: `admission-approved-${requestId}`,
              category: 'Admission',
              userRole: 'tenant',
              userId: latest.tenantUserId,
              audience: 'tenant',
              title: 'Admission Approved',
              message: `Congratulations! Your admission request has been approved by ${ws2.settings.name}. You can now access your tenant dashboard.`,
              type: 'success',
              link: '/app/tenant',
              createdAt: now,
            },
            {
              dedupeKey: `admission-approved-owner-${requestId}`,
              category: 'Admission',
              userRole: 'owner',
              userId: 'all',
              audience: 'staff',
              title: 'Tenant Approved Successfully',
              message: `${latest.fullName} has been successfully admitted to ${ws2.settings.name} — Room ${room?.roomNumber ?? '-'}, Bed ${bedNow.bedNumber}, joining ${allocation.joiningDate}.`,
              type: 'success',
              link: '/app/owner/admissions',
              createdAt: now,
            },
          ]);
          return { ...ws2, tenants, beds, payments, ...emitted };
        });

        const memberships = existingMembership
          ? prev.platform.memberships.map((m) =>
              m.id === existingMembership.id
                ? {
                    ...m,
                    roomId: allocation.roomId,
                    bedId: allocation.bedId,
                    status: 'Active' as const,
                    joiningDate: allocation.joiningDate,
                    leavingDate: undefined,
                    monthlyRent: allocation.monthlyRent,
                    securityDeposit: allocation.securityDeposit,
                    approvedBy: pg.ownerName,
                    approvedAt: now,
                  }
                : m
            )
          : [
              ...prev.platform.memberships,
              {
                id: uid('m'),
                pgId: req.pgId,
                tenantUserId: latest.tenantUserId,
                tenantId,
                roomId: allocation.roomId,
                bedId: allocation.bedId,
                status: 'Active' as const,
                joiningDate: allocation.joiningDate,
                monthlyRent: allocation.monthlyRent,
                securityDeposit: allocation.securityDeposit,
                approvedBy: pg.ownerName,
                approvedAt: now,
                createdAt: now,
              } satisfies Membership,
            ];

        return {
          ...next,
          platform: {
            ...prev.platform,
            admissionRequests: prev.platform.admissionRequests.map((r) =>
              r.requestId === requestId
                ? { ...r, status: 'Approved', reviewedBy: pg.ownerName, reviewedAt: now, updatedAt: now }
                : r
            ),
            memberships,
            auditLogs: [
              auditEntry(
                pg.ownerName,
                'ADMISSION_APPROVED',
                'AdmissionRequest',
                requestId,
                `Approved ${latest.fullName} → Room ${room?.roomNumber ?? '-'}, Bed ${bedNow.bedNumber}. Rent ₹${allocation.monthlyRent.toLocaleString('en-IN')}, deposit ₹${allocation.securityDeposit.toLocaleString('en-IN')}.`
              ),
              ...prev.platform.auditLogs,
            ],
          },
        };
      });
      return { ok: true as const };
    },
    [updateScanned, data]
  );

  // POST /api/owner/admission-requests/{id}/reject
  const rejectAdmissionRequest = useCallback(
    (requestId: string, reason: string) => {
      const req = data.platform.admissionRequests.find((r) => r.requestId === requestId);
      if (!req) return { ok: false as const, error: 'Request not found' };
      if (req.status !== 'Pending') return { ok: false as const, error: 'This request has already been reviewed' };
      if (!reason.trim()) return { ok: false as const, error: 'Please provide a rejection reason' };
      const pg = data.platform.pgs.find((p) => p.id === req.pgId)!;
      const now = new Date().toISOString();

      updateScanned((prev) => {
        const latest = prev.platform.admissionRequests.find((r) => r.requestId === requestId);
        if (!latest || latest.status !== 'Pending') return prev;
        const emitted = applyToWorkspace(prev, req.pgId, (ws) => ({
          ...ws,
          ...emitDraftsIntoWorkspace(ws, [
            {
              dedupeKey: `admission-rejected-${requestId}`,
              category: 'Admission',
              userRole: 'tenant',
              userId: latest.tenantUserId,
              audience: 'tenant',
              title: 'Admission Request Declined',
              message: `Your admission request to ${ws.settings.name} has been declined. Reason: ${reason.trim()}. Please check the application status for further details.`,
              type: 'error',
              link: '/app/tenant/admission',
              createdAt: now,
            },
            {
              dedupeKey: `admission-rejected-owner-${requestId}`,
              category: 'Admission',
              userRole: 'owner',
              userId: 'all',
              audience: 'staff',
              title: 'Admission Request Rejected',
              message: `You rejected ${latest.fullName}'s admission request (${requestId}). Reason: ${reason.trim()}. No bed was allocated.`,
              type: 'info',
              link: '/app/owner/admissions',
              createdAt: now,
            },
          ]),
        }));
        return {
          ...emitted,
          platform: {
            ...prev.platform,
            admissionRequests: prev.platform.admissionRequests.map((r) =>
              r.requestId === requestId
                ? {
                    ...r,
                    status: 'Rejected',
                    rejectionReason: reason.trim(),
                    reviewedBy: pg.ownerName,
                    reviewedAt: now,
                    updatedAt: now,
                  }
                : r
            ),
            auditLogs: [
              auditEntry(
                pg.ownerName,
                'ADMISSION_REJECTED',
                'AdmissionRequest',
                requestId,
                `Rejected ${latest.fullName}. Reason: ${reason.trim()}.`
              ),
              ...prev.platform.auditLogs,
            ],
          },
        };
      });
      return { ok: true as const };
    },
    [updateScanned, data]
  );

  // POST /api/owner/tenants/{id}/deactivate  (soft removal – records preserved)
  const moveOutTenant = useCallback(
    (tenantId: string, mode: 'Ended' | 'Deactivated' = 'Ended') => {
      const tenant = data.tenants.find((t) => t.id === tenantId);
      if (!tenant) return { ok: false as const, error: 'Tenant not found' };
      const now = new Date().toISOString();
      updateScanned((prev) => {
        const next = applyToWorkspace(prev, prev.activePgId, (ws) => {
          const beds = ws.beds.map((b) =>
            b.tenantId === tenantId
              ? { ...b, status: 'vacant' as BedStatus, tenantId: undefined, vacantSince: now }
              : b
          );
          const tenants = ws.tenants.map((t) =>
            t.id === tenantId ? { ...t, status: 'Left' as const } : t
          );
          const emitted = emitDraftsIntoWorkspace({ ...ws, beds, tenants }, [
            {
              dedupeKey: `membership-${mode === 'Ended' ? 'ended' : 'deactivated'}-${tenantId}-${now.split('T')[0]}`,
              category: 'Tenant',
              userRole: 'owner',
              userId: 'all',
              audience: 'staff',
              title: mode === 'Ended' ? 'Tenant Moved Out' : 'Membership Deactivated',
              message: `${tenant.fullName}'s membership has ended. The bed is now vacant. Payment history and deposit records are preserved.`,
              type: 'info',
              link: '/app/owner/tenants',
              createdAt: now,
            },
          ]);
          return { ...ws, beds, tenants, ...emitted };
        });
        return {
          ...next,
          platform: {
            ...next.platform,
            memberships: next.platform.memberships.map((m) =>
              m.pgId === prev.activePgId && m.tenantId === tenantId && m.status === 'Active'
                ? { ...m, status: mode, leavingDate: now.split('T')[0] }
                : m
            ),
            auditLogs: [
              auditEntry(
                data.settings.ownerName,
                mode === 'Ended' ? 'TENANT_MOVED_OUT' : 'MEMBERSHIP_DEACTIVATED',
                'Membership',
                tenantId,
                `${tenant.fullName} — bed released, records preserved.`
              ),
              ...next.platform.auditLogs,
            ],
          },
        };
      });
      return { ok: true as const };
    },
    [updateScanned, data]
  );

  // ----- Reset -----
  const resetData = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setData(defaultData);
    saveData(defaultData);
    notify();
  }, []);

  return {
    data,
    login,
    logout,
    addTenant,
    updateTenant,
    deleteTenant,
    markTenantNotice,
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
    updateSettings,
    updateBedStatus,
    reallocateBed,
    runNotificationEngine,
    updateNotificationPrefs,
    updateReminderSchedule,
    checkoutSubscription,
    upgradePlan,
    scheduleDowngrade,
    changeBillingCycle,
    renewSubscription,
    retrySubscriptionPayment,
    setAutoRenew,
    switchWorkspace,
    syncTenantSession,
    ownerLogin,
    resetOwnerPassword,
    tenantLogin,
    tenantRegister,
    startOwnerRegistration,
    submitRegistrationPayment,
    completeRegistrationPayment,
    confirmPgUsername,
    setOwnerPasswordAndActivate,
    submitAdmissionRequest,
    approveAdmissionRequest,
    rejectAdmissionRequest,
    moveOutTenant,
    resetData,
  };
}
