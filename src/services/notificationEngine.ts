// Notification Automation Engine
// Scans application data and generates notifications from configured schedules.
// In production this would run as a background scheduler / job queue; in the
// prototype it runs on app load and after data-changing actions. It is fully
// idempotent thanks to dedupe keys, so running it repeatedly is safe.

import type {
  AppDataLike,
} from './engineTypes';
import {
  todayISODate,
  daysBetween,
  isUnpaid,
  daysOverdue,
  daysUntilDue,
} from './billingService';
import { materializeDraft, type NotificationDraft } from './deliveryService';

const fmtDate = (iso: string) =>
  new Date(iso + (iso.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
  });

const largestBucketPassed = (buckets: number[], value: number): number | null => {
  const passed = buckets.filter((b) => value >= b);
  return passed.length ? Math.max(...passed) : null;
};

export function runNotificationScan<T extends AppDataLike>(data: T): T {
  const today = todayISODate();
  const now = new Date().toISOString();
  const schedule = data.reminderSchedule;
  const settings = data.settings;
  const drafts: NotificationDraft[] = [];

  const existingKeys = new Set<string>();
  for (const n of data.notifications) if (n.dedupeKey) existingKeys.add(n.dedupeKey);
  for (const l of data.notificationLog) if (l.dedupeKey) existingKeys.add(l.dedupeKey);

  const push = (d: NotificationDraft) => drafts.push(d);

  // ---------- A. Rent payment notifications ----------
  for (const p of data.payments) {
    if (p.type !== 'Rent' || !isUnpaid(p)) continue;
    const tenant = data.tenants.find((t) => t.id === p.tenantId);
    if (!tenant || tenant.status === 'Left') continue;
    const room = data.rooms.find((r) => r.id === tenant.roomId);
    const roomNo = room?.roomNumber ?? '-';
    const daysUntil = daysUntilDue(p, today);
    const daysOver = daysOverdue(p, today);

    if (daysUntil > 0) {
      const maxBefore = Math.max(0, ...schedule.rentDaysBefore);
      if (daysUntil <= maxBefore) {
        push({
          dedupeKey: `rent-upcoming-${p.id}`,
          category: 'Rent',
          userRole: 'tenant',
          userId: tenant.id,
          tenantId: tenant.id,
          audience: 'tenant',
          title: 'Upcoming Rent Reminder',
          message: `Hi ${tenant.fullName.split(' ')[0]}, your monthly PG rent of ₹${p.amount.toLocaleString('en-IN')} for Room ${roomNo} is due on ${fmtDate(p.dueDate)} (${daysUntil} day${daysUntil === 1 ? '' : 's'} from now). Please complete your payment through Aapka PG.`,
          type: 'info',
          link: '/app/tenant/rent',
          createdAt: now,
        });
      }
      if (schedule.rentDaysBefore.includes(1) && daysUntil === 1) {
        push({
          dedupeKey: `rent-tomorrow-${p.id}`,
          category: 'Rent',
          userRole: 'tenant',
          userId: tenant.id,
          tenantId: tenant.id,
          audience: 'tenant',
          title: 'Rent Due Tomorrow',
          message: `Hi ${tenant.fullName.split(' ')[0]}, your PG rent of ₹${p.amount.toLocaleString('en-IN')} for Room ${roomNo} is due tomorrow (${fmtDate(p.dueDate)}). Please pay through Aapka PG to avoid late payment.`,
          type: 'warning',
          link: '/app/tenant/rent',
          createdAt: now,
        });
      }
    }

    if (daysUntil === 0) {
      push({
        dedupeKey: `rent-due-${p.id}`,
        category: 'Rent',
        userRole: 'tenant',
        userId: tenant.id,
        tenantId: tenant.id,
        audience: 'tenant',
        title: 'Rent Payment Due Today',
        message: `Hi ${tenant.fullName.split(' ')[0]}, your PG rent of ₹${p.amount.toLocaleString('en-IN')} for Room ${roomNo} is due today. Please complete your payment through Aapka PG.`,
        type: 'warning',
        link: '/app/tenant/rent',
        createdAt: now,
      });
    }

    if (daysOver > 0) {
      const bucket = largestBucketPassed(schedule.rentOverdueDays, daysOver);
      if (bucket !== null) {
        push({
          dedupeKey: `rent-overdue-${p.id}-d${bucket}`,
          category: 'Rent',
          userRole: 'tenant',
          userId: tenant.id,
          tenantId: tenant.id,
          audience: 'tenant',
          title: bucket >= 7 ? 'Rent Overdue – Final Reminder' : 'Rent Payment Overdue',
          message: `Hi ${tenant.fullName.split(' ')[0]}, your PG rent of ₹${p.amount.toLocaleString('en-IN')} is overdue by ${daysOver} day${daysOver === 1 ? '' : 's'}. Please clear your outstanding payment as soon as possible.`,
          type: bucket >= 7 ? 'error' : 'warning',
          link: '/app/tenant/rent',
          createdAt: now,
        });

        // Manager is informed from day 3; owner is escalated at day 7 (if configured)
        if (bucket >= 3) {
          push({
            dedupeKey: `rent-overdue-mgr-${p.id}-d${bucket}`,
            category: 'Rent',
            userRole: 'manager',
            userId: 'all',
            audience: 'staff',
            title: 'Tenant Rent Overdue',
            message: `${tenant.fullName} (Room ${roomNo}) has rent of ₹${p.amount.toLocaleString('en-IN')} overdue by ${daysOver} days. Open the tenant record to follow up.`,
            type: 'warning',
            link: '/app/manager/tenants',
            createdAt: now,
          });
        }
        if (bucket >= 7 && schedule.rentOverdueDays.includes(7)) {
          push({
            dedupeKey: `rent-overdue-own-${p.id}-d${bucket}`,
            category: 'Rent',
            userRole: 'owner',
            userId: 'all',
            audience: 'staff',
            title: 'Escalation: Rent Overdue 7+ Days',
            message: `${tenant.fullName} (Room ${roomNo}) has not paid rent of ₹${p.amount.toLocaleString('en-IN')} for ${daysOver} days. Manager follow-ups have not resolved this yet.`,
            type: 'error',
            link: '/app/owner/finance',
            createdAt: now,
          });
        }
      }
    }
  }

  // ---------- B. Electricity bill notifications ----------
  for (const p of data.payments) {
    if (p.type !== 'Electricity' || !isUnpaid(p)) continue;
    const tenant = data.tenants.find((t) => t.id === p.tenantId);
    if (!tenant || tenant.status === 'Left') continue;
    const room = data.rooms.find((r) => r.id === tenant.roomId);
    const roomNo = room?.roomNumber ?? '-';
    const reading = data.meterReadings.find(
      (m) => m.roomId === tenant.roomId && m.month === p.month
    );

    // Bill published → notify tenant once per reading+tenant
    if (reading?.published) {
      push({
        dedupeKey: `elec-published-${reading.id}-${tenant.id}`,
        category: 'Electricity',
        userRole: 'tenant',
        userId: tenant.id,
        tenantId: tenant.id,
        audience: 'tenant',
        title: 'New Electricity Bill',
        message: `Your electricity bill for Room ${roomNo} is ₹${p.amount.toLocaleString('en-IN')}. The payment due date is ${fmtDate(p.dueDate)}. Please pay through Aapka PG.`,
        type: 'info',
        link: '/app/tenant/electricity',
        createdAt: now,
      });
    }

    const daysUntil = daysUntilDue(p, today);
    const daysOver = daysOverdue(p, today);

    if (daysUntil > 0 && daysUntil <= Math.max(0, ...schedule.electricityDueDaysBefore)) {
      push({
        dedupeKey: `elec-upcoming-${p.id}`,
        category: 'Electricity',
        userRole: 'tenant',
        userId: tenant.id,
        tenantId: tenant.id,
        audience: 'tenant',
        title: 'Electricity Bill Due Soon',
        message: `Your electricity bill of ₹${p.amount.toLocaleString('en-IN')} for Room ${roomNo} is due on ${fmtDate(p.dueDate)} (${daysUntil} day${daysUntil === 1 ? '' : 's'} from now). Please pay through Aapka PG.`,
        type: 'info',
        link: '/app/tenant/electricity',
        createdAt: now,
      });
    }

    if (daysOver > 0) {
      const bucket = largestBucketPassed(schedule.electricityOverdueDays, daysOver);
      if (bucket !== null) {
        push({
          dedupeKey: `elec-overdue-${p.id}-d${bucket}`,
          category: 'Electricity',
          userRole: 'tenant',
          userId: tenant.id,
          tenantId: tenant.id,
          audience: 'tenant',
          title: 'Electricity Bill Overdue',
          message: `Your electricity bill of ₹${p.amount.toLocaleString('en-IN')} for Room ${roomNo} is overdue by ${daysOver} day${daysOver === 1 ? '' : 's'}. Please complete the payment to avoid further outstanding dues.`,
          type: 'warning',
          link: '/app/tenant/electricity',
          createdAt: now,
        });
        if (bucket >= 3) {
          push({
            dedupeKey: `elec-overdue-mgr-${p.id}-d${bucket}`,
            category: 'Electricity',
            userRole: 'manager',
            userId: 'all',
            audience: 'staff',
            title: 'Electricity Bill Unpaid',
            message: `${tenant.fullName} (Room ${roomNo}) has an electricity bill of ₹${p.amount.toLocaleString('en-IN')} overdue by ${daysOver} days.`,
            type: 'warning',
            link: '/app/manager/meter',
            createdAt: now,
          });
        }
        if (bucket >= 7 && schedule.electricityOverdueDays.includes(7)) {
          push({
            dedupeKey: `elec-overdue-own-${p.id}-d${bucket}`,
            category: 'Electricity',
            userRole: 'owner',
            userId: 'all',
            audience: 'staff',
            title: 'Electricity Bill Overdue 7+ Days',
            message: `${tenant.fullName} (Room ${roomNo}) has an electricity bill of ₹${p.amount.toLocaleString('en-IN')} unpaid for ${daysOver} days.`,
            type: 'error',
            link: '/app/owner/finance',
            createdAt: now,
          });
        }
      }
    }
  }

  // ---------- C. Complaint escalation ----------
  for (const c of data.complaints) {
    if (c.status === 'Resolved') continue;
    const ageHours = (Date.now() - new Date(c.submittedAt).getTime()) / 3600000;
    if (ageHours >= schedule.complaintUnresolvedHours) {
      const tenant = data.tenants.find((t) => t.id === c.tenantId);
      push({
        dedupeKey: `complaint-stale-${c.id}-${schedule.complaintUnresolvedHours}h`,
        category: 'Complaint',
        userRole: 'manager',
        userId: 'all',
        audience: 'staff',
        title: 'Complaint Not Resolved In Time',
        message: `${tenant?.fullName ?? 'A tenant'}'s ${c.category} complaint (Room ${c.roomNumber}) has been open for over ${schedule.complaintUnresolvedHours} hours. Please update its status.`,
        type: 'warning',
        link: '/app/manager/complaints',
        createdAt: now,
      });
    }
  }

  // ---------- D. New tenant + vacant bed events ----------
  for (const t of data.tenants) {
    const joined = daysBetween(t.joiningDate, today);
    if (joined >= 0 && joined <= 1) {
      push({
        dedupeKey: `tenant-registered-${t.id}`,
        category: 'Tenant',
        userRole: 'manager',
        userId: 'all',
        audience: 'staff',
        title: 'New Tenant Registered',
        message: `${t.fullName} joined Room ${data.rooms.find((r) => r.id === t.roomId)?.roomNumber ?? '-'} (Bed ${t.bedNumber}). Complete document verification from the tenants list.`,
        type: 'info',
        link: '/app/manager/tenants',
        createdAt: now,
      });
    }
  }

  for (const b of data.beds) {
    if (b.status !== 'vacant' || !b.vacantSince) continue;
    const vacantDays = daysBetween(b.vacantSince.split('T')[0], today);
    if (vacantDays >= 0 && vacantDays <= 1) {
      const room = data.rooms.find((r) => r.id === b.roomId);
      push({
        dedupeKey: `bed-vacant-${b.id}-${b.vacantSince.split('T')[0]}`,
        category: 'Bed',
        userRole: 'owner',
        userId: 'all',
        audience: 'staff',
        title: 'Vacant Bed Available',
        message: `Room ${room?.roomNumber ?? '-'} Bed ${b.bedNumber} is now vacant. Share the vacancy link to fill it faster.`,
        type: 'info',
        link: '/app/owner/beds',
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
    const collected = data.payments
      .filter((p) => p.month === prevMonth && p.status === 'Paid' && p.type !== 'Deposit')
      .reduce((s, p) => s + p.amount, 0);
    const outstanding = data.payments
      .filter((p) => p.month === prevMonth && isUnpaid(p))
      .reduce((s, p) => s + p.amount, 0);
    push({
      dedupeKey: `owner-monthly-${prevMonth}`,
      category: 'Rent',
      userRole: 'owner',
      userId: 'all',
      audience: 'staff',
      title: 'Monthly Rent Collection Summary',
      message: `Collection summary for ${prevMonth}: ₹${collected.toLocaleString('en-IN')} received, ₹${outstanding.toLocaleString('en-IN')} still outstanding. Open the finance dashboard for the full report.`,
      type: outstanding > 0 ? 'info' : 'success',
      link: '/app/owner/finance',
      createdAt: now,
    });
  }

  // ---------- F. Subscription lifecycle notifications ----------
  const sub = data.subscription;
  const periodEnd = sub.currentPeriodEnd;
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
          message: `Your Aapka PG subscription renews on ${fmtDate(periodEnd)}. Please ensure your payment method is ready. (Simulated payment gateway.)`,
          type: 'info',
          link: '/app/owner/subscription',
          createdAt: now,
        });
      }
    }
  }

  if (sub.status === 'Payment Pending' && sub.failedPaymentAt) {
    const sinceFailure = daysBetween(sub.failedPaymentAt.split('T')[0], today);
    if (sinceFailure > schedule.gracePeriodDays) {
      const isSuspended = sinceFailure > schedule.gracePeriodDays + 7;
      push({
        dedupeKey: `sub-${isSuspended ? 'suspended' : 'pastdue'}-${periodEnd}`,
        category: 'Subscription',
        userRole: 'owner',
        userId: 'all',
        audience: 'staff',
        title: isSuspended ? 'Subscription Suspended' : 'Subscription Past Due',
        message: isSuspended
          ? `Your subscription was suspended after the ${schedule.gracePeriodDays}-day grace period. Paid features are restricted until payment is completed. Your PG records are never deleted.`
          : `Your subscription payment is past the ${schedule.gracePeriodDays}-day grace period. Please retry the payment to avoid suspension of paid features.`,
        type: 'error',
        link: '/app/owner/subscription',
        createdAt: now,
      });
    }
  }

  // ---------- Materialize drafts into notifications + delivery logs ----------
  const ctx = {
    existingKeys,
    prefs: data.notificationPrefs,
    settings,
    planId: sub.planId,
    retryAttempts: schedule.retryAttempts,
  };

  const newNotifications = [];
  const newLogs = [];
  for (const draft of drafts) {
    const { notification, logs } = materializeDraft(draft, ctx);
    if (notification) {
      newNotifications.push(notification);
      newLogs.push(...logs);
    }
  }

  // ---------- Data sync: mark unpaid past-due payments as Overdue ----------
  const paymentsChanged = data.payments.some(
    (p) => p.status === 'Pending' && p.dueDate < today
  );
  const payments = paymentsChanged
    ? data.payments.map((p) =>
        p.status === 'Pending' && p.dueDate < today ? { ...p, status: 'Overdue' as const } : p
      )
    : data.payments;

  // ---------- Data sync: advance subscription lifecycle ----------
  let subscription = sub;

  if (sub.status === 'Trial' && sub.trialEndsAt && daysBetween(today, sub.trialEndsAt) < 0) {
    subscription = { ...sub, status: 'Expired' };
  } else if ((sub.status === 'Active' || sub.status === 'Cancelled') && daysToRenewal < 0) {
    if (sub.status === 'Cancelled' || !sub.autoRenew) {
      subscription = { ...sub, status: 'Expired' };
    } else {
      // Simulated auto-charge failure → Payment Pending (retry from dashboard)
      subscription = {
        ...sub,
        status: 'Payment Pending',
        failedPaymentAt: now,
      };
    }
  } else if (sub.status === 'Payment Pending' && sub.failedPaymentAt) {
    const sinceFailure = daysBetween(sub.failedPaymentAt.split('T')[0], today);
    if (sinceFailure > schedule.gracePeriodDays + 7) {
      subscription = { ...sub, status: 'Suspended' };
    } else if (sinceFailure > schedule.gracePeriodDays) {
      subscription = { ...sub, status: 'Past Due' };
    }
  } else if (sub.status === 'Past Due' && sub.failedPaymentAt) {
    const sinceFailure = daysBetween(sub.failedPaymentAt.split('T')[0], today);
    if (sinceFailure > schedule.gracePeriodDays + 7) {
      subscription = { ...sub, status: 'Suspended' };
    }
  }

  if (newNotifications.length === 0 && newLogs.length === 0 && payments === data.payments && subscription === sub) {
    return data;
  }

  return {
    ...data,
    notifications: [...newNotifications, ...data.notifications],
    notificationLog: [...newLogs, ...data.notificationLog],
    payments,
    subscription,
  };
}
