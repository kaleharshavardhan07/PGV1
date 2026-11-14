// Notification Automation Engine (server-side).
// Scans PG data and generates notifications from configured schedules. Fully
// idempotent thanks to dedupe keys. Runs after data-changing actions and can be
// triggered on demand or by a cron job. Port of the frontend notificationEngine.ts.

import {
  Workspace,
  Tenant,
  Room,
  Payment,
  MeterReading,
  Complaint,
  Notification,
  NotificationLog,
  NotificationPref,
} from '../models/index.js';
import { todayISODate, daysBetween, isUnpaid, daysOverdue, daysUntilDue } from './billingService.js';
import { materializeDraft } from './deliveryService.js';

const fmtDate = (iso) =>
  new Date(`${iso}${iso.length === 10 ? 'T00:00:00' : ''}`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
  });

const largestBucketPassed = (buckets, value) => {
  const passed = buckets.filter((b) => value >= b);
  return passed.length ? Math.max(...passed) : null;
};

const inr = (n) => n.toLocaleString('en-IN');

export async function runNotificationEngine(pgId) {
  const [workspace, tenants, rooms, payments, meterReadings, complaints, prefs] = await Promise.all([
    Workspace.findOne({ pg: pgId }).lean(),
    Tenant.find({ pg: pgId }).lean(),
    Room.find({ pg: pgId }).lean(),
    Payment.find({ pg: pgId }).lean(),
    MeterReading.find({ pg: pgId }).lean(),
    Complaint.find({ pg: pgId }).lean(),
    NotificationPref.find({ pg: pgId }).lean(),
  ]);

  if (!workspace) return { emitted: 0, logs: 0, updatedPayments: 0, subscriptionChanged: false };

  const settings = workspace.settings || {};
  const schedule = workspace.reminderSchedule || {};
  const sub = workspace.subscription || {};

  const roomById = new Map(rooms.map((r) => [String(r._id), r]));
  const tenantById = new Map(tenants.map((t) => [String(t._id), t]));

  const existingKeys = new Set();
  const existingN = await Notification.find({ pg: pgId }, { dedupeKey: 1 }).lean();
  const existingL = await NotificationLog.find({ pg: pgId }, { dedupeKey: 1 }).lean();
  for (const n of existingN) if (n.dedupeKey) existingKeys.add(n.dedupeKey);
  for (const l of existingL) if (l.dedupeKey) existingKeys.add(l.dedupeKey);

  const today = todayISODate();
  const now = new Date().toISOString();
  const drafts = [];
  const push = (d) => drafts.push(d);

  // ---------- A. Rent notifications ----------
  for (const p of payments) {
    if (p.type !== 'Rent' || !isUnpaid(p)) continue;
    const tenant = tenantById.get(String(p.tenant));
    if (!tenant || tenant.status === 'Left') continue;
    const room = roomById.get(String(tenant.room));
    const roomNo = room?.roomNumber ?? '-';
    const daysUntil = daysUntilDue(p, today);
    const daysOver = daysOverdue(p, today);

    if (daysUntil > 0 && daysUntil <= Math.max(0, ...(schedule.rentDaysBefore || [1]))) {
      push({
        dedupeKey: `rent-upcoming-${p._id}`,
        category: 'Rent',
        userRole: 'tenant',
        userId: String(tenant._id),
        tenantId: String(tenant._id),
        audience: 'tenant',
        title: 'Upcoming Rent Reminder',
        message: `Hi ${tenant.fullName.split(' ')[0]}, your monthly PG rent of ₹${inr(p.amount)} for Room ${roomNo} is due on ${fmtDate(p.dueDate)} (${daysUntil} day${daysUntil === 1 ? '' : 's'} from now). Please complete your payment through Aapka PG.`,
        type: 'info',
        link: '/app/tenant/rent',
        createdAt: now,
      });
    }

    if (daysOver > 0) {
      const bucket = largestBucketPassed(schedule.rentOverdueDays || [1, 3, 7], daysOver);
      if (bucket !== null) {
        push({
          dedupeKey: `rent-overdue-${p._id}-d${bucket}`,
          category: 'Rent',
          userRole: 'tenant',
          userId: String(tenant._id),
          tenantId: String(tenant._id),
          audience: 'tenant',
          title: bucket >= 7 ? 'Rent Overdue – Final Reminder' : 'Rent Payment Overdue',
          message: `Hi ${tenant.fullName.split(' ')[0]}, your PG rent of ₹${inr(p.amount)} is overdue by ${daysOver} day${daysOver === 1 ? '' : 's'}. Please clear your outstanding payment as soon as possible.`,
          type: bucket >= 7 ? 'error' : 'warning',
          link: '/app/tenant/rent',
          createdAt: now,
        });
        if (bucket >= 3) {
          push({
            dedupeKey: `rent-overdue-mgr-${p._id}-d${bucket}`,
            category: 'Rent',
            userRole: 'manager',
            userId: 'all',
            audience: 'staff',
            title: 'Tenant Rent Overdue',
            message: `${tenant.fullName} (Room ${roomNo}) has rent of ₹${inr(p.amount)} overdue by ${daysOver} days. Open the tenant record to follow up.`,
            type: 'warning',
            link: '/app/manager/tenants',
            createdAt: now,
          });
        }
        if (bucket >= 7 && (schedule.rentOverdueDays || []).includes(7)) {
          push({
            dedupeKey: `rent-overdue-own-${p._id}-d${bucket}`,
            category: 'Rent',
            userRole: 'owner',
            userId: 'all',
            audience: 'staff',
            title: 'Escalation: Rent Overdue 7+ Days',
            message: `${tenant.fullName} (Room ${roomNo}) has not paid rent of ₹${inr(p.amount)} for ${daysOver} days. Manager follow-ups have not resolved this yet.`,
            type: 'error',
            link: '/app/owner/finance',
            createdAt: now,
          });
        }
      }
    }
  }

  // ---------- B. Electricity notifications ----------
  for (const p of payments) {
    if (p.type !== 'Electricity' || !isUnpaid(p)) continue;
    const tenant = tenantById.get(String(p.tenant));
    if (!tenant || tenant.status === 'Left') continue;
    const room = roomById.get(String(tenant.room));
    const roomNo = room?.roomNumber ?? '-';
    const reading = meterReadings.find((m) => String(m.room) === String(tenant.room) && m.month === p.month);
    const daysUntil = daysUntilDue(p, today);
    const daysOver = daysOverdue(p, today);

    if (reading?.published) {
      push({
        dedupeKey: `elec-published-${reading._id}-${tenant._id}`,
        category: 'Electricity',
        userRole: 'tenant',
        userId: String(tenant._id),
        tenantId: String(tenant._id),
        audience: 'tenant',
        title: 'New Electricity Bill',
        message: `Your electricity bill for Room ${roomNo} is ₹${inr(p.amount)}. The payment due date is ${fmtDate(p.dueDate)}. Please pay through Aapka PG.`,
        type: 'info',
        link: '/app/tenant/electricity',
        createdAt: now,
      });
    }

    if (daysUntil > 0 && daysUntil <= Math.max(0, ...(schedule.electricityDueDaysBefore || [1]))) {
      push({
        dedupeKey: `elec-upcoming-${p._id}`,
        category: 'Electricity',
        userRole: 'tenant',
        userId: String(tenant._id),
        tenantId: String(tenant._id),
        audience: 'tenant',
        title: 'Electricity Bill Due Soon',
        message: `Your electricity bill of ₹${inr(p.amount)} for Room ${roomNo} is due on ${fmtDate(p.dueDate)} (${daysUntil} day${daysUntil === 1 ? '' : 's'} from now). Please pay through Aapka PG.`,
        type: 'info',
        link: '/app/tenant/electricity',
        createdAt: now,
      });
    }

    if (daysOver > 0) {
      const bucket = largestBucketPassed(schedule.electricityOverdueDays || [1, 3, 7], daysOver);
      if (bucket !== null) {
        push({
          dedupeKey: `elec-overdue-${p._id}-d${bucket}`,
          category: 'Electricity',
          userRole: 'tenant',
          userId: String(tenant._id),
          tenantId: String(tenant._id),
          audience: 'tenant',
          title: 'Electricity Bill Overdue',
          message: `Your electricity bill of ₹${inr(p.amount)} for Room ${roomNo} is overdue by ${daysOver} day${daysOver === 1 ? '' : 's'}. Please complete the payment to avoid further outstanding dues.`,
          type: 'warning',
          link: '/app/tenant/electricity',
          createdAt: now,
        });
        if (bucket >= 3) {
          push({
            dedupeKey: `elec-overdue-mgr-${p._id}-d${bucket}`,
            category: 'Electricity',
            userRole: 'manager',
            userId: 'all',
            audience: 'staff',
            title: 'Electricity Bill Unpaid',
            message: `${tenant.fullName} (Room ${roomNo}) has an electricity bill of ₹${inr(p.amount)} overdue by ${daysOver} days.`,
            type: 'warning',
            link: '/app/manager/meter',
            createdAt: now,
          });
        }
        if (bucket >= 7 && (schedule.electricityOverdueDays || []).includes(7)) {
          push({
            dedupeKey: `elec-overdue-own-${p._id}-d${bucket}`,
            category: 'Electricity',
            userRole: 'owner',
            userId: 'all',
            audience: 'staff',
            title: 'Electricity Bill Overdue 7+ Days',
            message: `${tenant.fullName} (Room ${roomNo}) has an electricity bill of ₹${inr(p.amount)} unpaid for ${daysOver} days.`,
            type: 'error',
            link: '/app/owner/finance',
            createdAt: now,
          });
        }
      }
    }
  }

  // ---------- C. Complaint escalation ----------
  for (const c of complaints) {
    if (c.status === 'Resolved') continue;
    const ageHours = (Date.now() - new Date(c.submittedAt).getTime()) / 3600000;
    if (ageHours >= (schedule.complaintUnresolvedHours || 48)) {
      const tenant = tenantById.get(String(c.tenant));
      push({
        dedupeKey: `complaint-stale-${c._id}-${schedule.complaintUnresolvedHours || 48}h`,
        category: 'Complaint',
        userRole: 'manager',
        userId: 'all',
        audience: 'staff',
        title: 'Complaint Not Resolved In Time',
        message: `${tenant?.fullName ?? 'A tenant'}'s ${c.category} complaint (Room ${c.roomNumber}) has been open for over ${schedule.complaintUnresolvedHours || 48} hours. Please update its status.`,
        type: 'warning',
        link: '/app/manager/complaints',
        createdAt: now,
      });
    }
  }

  // ---------- D. New tenant + vacant bed events ----------
  for (const t of tenants) {
    const joined = daysBetween(t.joiningDate, today);
    if (joined >= 0 && joined <= 1) {
      push({
        dedupeKey: `tenant-registered-${t._id}`,
        category: 'Tenant',
        userRole: 'manager',
        userId: 'all',
        audience: 'staff',
        title: 'New Tenant Registered',
        message: `${t.fullName} joined Room ${roomById.get(String(t.room))?.roomNumber ?? '-'} (Bed ${t.bedNumber}). Complete document verification from the tenants list.`,
        type: 'info',
        link: '/app/manager/tenants',
        createdAt: now,
      });
    }
  }

  // ---------- E. Owner monthly collection summary ----------
  const dayOfMonth = new Date().getDate();
  if (dayOfMonth >= 3) {
    const prev = new Date();
    prev.setDate(1);
    prev.setMonth(prev.getMonth() - 1);
    const prevMonth = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
    const collected = payments
      .filter((p) => p.month === prevMonth && p.status === 'Paid' && p.type !== 'Deposit')
      .reduce((s, p) => s + p.amount, 0);
    const outstanding = payments.filter((p) => p.month === prevMonth && isUnpaid(p)).reduce((s, p) => s + p.amount, 0);
    push({
      dedupeKey: `owner-monthly-${prevMonth}`,
      category: 'Rent',
      userRole: 'owner',
      userId: 'all',
      audience: 'staff',
      title: 'Monthly Rent Collection Summary',
      message: `Collection summary for ${prevMonth}: ₹${inr(collected)} received, ₹${inr(outstanding)} still outstanding. Open the finance dashboard for the full report.`,
      type: outstanding > 0 ? 'info' : 'success',
      link: '/app/owner/finance',
      createdAt: now,
    });
  }

  // ---------- F. Subscription lifecycle notifications ----------
  const periodEnd = sub.currentPeriodEnd;
  if (periodEnd) {
    const daysToRenewal = daysBetween(today, periodEnd);
    if (sub.status === 'Trial' && sub.trialEndsAt) {
      const daysLeft = daysBetween(today, sub.trialEndsAt);
      for (const bucket of [3, 1]) {
        if (daysLeft === bucket) {
          push({
            dedupeKey: `sub-trial-ending-${sub.trialEndsAt}-d${bucket}`,
            category: 'Subscription',
            userRole: 'owner',
            userId: 'all',
            audience: 'staff',
            title: 'Free Trial Ending Soon',
            message: `Your Aapka PG free trial ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'} (${fmtDate(sub.trialEndsAt)}). Choose a plan to keep automation features active.`,
            type: 'warning',
            link: '/app/owner/subscription',
            createdAt: now,
          });
        }
      }
      if (daysLeft < 0) {
        push({
          dedupeKey: `sub-trial-expired-${sub.trialEndsAt}`,
          category: 'Subscription',
          userRole: 'owner',
          userId: 'all',
          audience: 'staff',
          title: 'Free Trial Expired',
          message: 'Your trial has ended. Your PG records are safe — subscribe to a plan to restore full access.',
          type: 'error',
          link: '/app/owner/subscription',
          createdAt: now,
        });
      }
    }
    if (sub.status === 'Active' && sub.autoRenew) {
      for (const bucket of [7, 3, 1]) {
        if (daysToRenewal === bucket) {
          push({
            dedupeKey: `sub-renew-${periodEnd}-d${bucket}`,
            category: 'Subscription',
            userRole: 'owner',
            userId: 'all',
            audience: 'staff',
            title: 'Subscription Renewal Reminder',
            message: `Your Aapka PG subscription renews on ${fmtDate(periodEnd)}. Please ensure your payment method is ready.`,
            type: 'info',
            link: '/app/owner/subscription',
            createdAt: now,
          });
        }
      }
    }
    if ((sub.status === 'Payment Pending' || sub.status === 'Past Due') && sub.failedPaymentAt) {
      const sinceFailure = daysBetween(sub.failedPaymentAt.split('T')[0], today);
      if (sinceFailure > (schedule.gracePeriodDays || 7)) {
        const isSuspended = sinceFailure > (schedule.gracePeriodDays || 7) + 7;
        push({
          dedupeKey: `sub-${isSuspended ? 'suspended' : 'pastdue'}-${periodEnd}`,
          category: 'Subscription',
          userRole: 'owner',
          userId: 'all',
          audience: 'staff',
          title: isSuspended ? 'Subscription Suspended' : 'Subscription Past Due',
          message: isSuspended
            ? `Your subscription was suspended after the ${schedule.gracePeriodDays || 7}-day grace period. Paid features are restricted until payment is completed. Your PG records are never deleted.`
            : `Your subscription payment is past the ${schedule.gracePeriodDays || 7}-day grace period. Please retry the payment to avoid suspension of paid features.`,
          type: 'error',
          link: '/app/owner/subscription',
          createdAt: now,
        });
      }
    }
  }

  // ---------- Materialize ----------
  const ctx = {
    existingKeys,
    prefs,
    settings,
    planId: sub.planId || 'growth',
    retryAttempts: schedule.retryAttempts ?? 0,
  };

  const newNotifications = [];
  const newLogs = [];
  for (const draft of drafts) {
    const { notification, logs } = materializeDraft(draft, ctx);
    if (notification) {
      newNotifications.push({ pg: pgId, ...notification });
      newLogs.push(...logs.map((l) => ({ pg: pgId, ...l })));
    }
  }

  if (newNotifications.length) await Notification.insertMany(newNotifications);
  if (newLogs.length) await NotificationLog.insertMany(newLogs);

  // ---------- Data sync: mark pending past-due payments as Overdue ----------
  const updatedPayments = await Payment.updateMany(
    { pg: pgId, status: 'Pending', dueDate: { $lt: today } },
    { $set: { status: 'Overdue' } }
  );

  // ---------- Data sync: advance subscription lifecycle ----------
  let subscriptionChanged = false;
  if (sub.status === 'Trial' && sub.trialEndsAt && daysBetween(today, sub.trialEndsAt) < 0) {
    await Workspace.updateOne({ pg: pgId }, { $set: { 'subscription.status': 'Expired' } });
    subscriptionChanged = true;
  } else if ((sub.status === 'Active' || sub.status === 'Cancelled') && periodEnd && daysBetween(today, periodEnd) < 0) {
    const next =
      sub.status === 'Cancelled' || !sub.autoRenew
        ? 'Expired'
        : { status: 'Payment Pending', failedPaymentAt: now };
    await Workspace.updateOne({ pg: pgId }, {
      $set: typeof next === 'string' ? { 'subscription.status': next } : next,
    });
    subscriptionChanged = true;
  }

  return {
    emitted: newNotifications.length,
    logs: newLogs.length,
    updatedPayments: updatedPayments.modifiedCount,
    subscriptionChanged,
  };
}
