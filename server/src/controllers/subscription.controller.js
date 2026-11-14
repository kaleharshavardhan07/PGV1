import ApiError from '../utils/apiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { PgAccount } from '../models/index.js';
import { ensureWorkspace } from '../services/workspaceService.js';
import { getPlan } from '../constants/plans.js';
import { buildInvoice } from '../services/subscriptionService.js';
import { createOrder, simulateGatewayCallback, verifyCallback } from '../services/paymentGateway.js';
import { recordAudit } from '../services/auditService.js';
import { runNotificationEngine } from '../services/notificationEngine.js';
import { nowISO, todayISO, nextInvoiceNumber } from '../utils/ids.js';

const isoDays = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
};

const activateSubscription = (sub, planId, cycle, amount, method) => {
  const today = todayISO();
  const periodDays = cycle === 'annual' ? 365 : 30;
  sub.planId = planId;
  sub.cycle = cycle;
  sub.status = 'Active';
  sub.startedAt = today;
  sub.currentPeriodEnd = isoDays(periodDays);
  sub.trialEndsAt = undefined;
  sub.amountPaid = (sub.amountPaid || 0) + amount;
  sub.failedPaymentAt = undefined;
  sub.pendingPlanId = undefined;
  sub.pendingCycle = undefined;
  sub.invoices.push(
    buildInvoice({
      number: nextInvoiceNumber(new Date().getFullYear(), sub.invoices.length + 1),
      date: today,
      planId,
      cycle,
      amount,
      status: 'Paid',
      method,
      paidAt: nowISO(),
    })
  );
};

export const getSubscription = asyncHandler(async (req, res) => {
  const ws = await ensureWorkspace(req.pgId);
  const plan = getPlan(ws.subscription.planId);
  res.json({ success: true, subscription: ws.subscription, plan });
});

export const checkout = asyncHandler(async (req, res) => {
  const { planId, cycle, method } = req.body;
  const ws = await ensureWorkspace(req.pgId);
  const plan = getPlan(planId);
  const amount = cycle === 'annual' ? plan.annualPrice : plan.monthlyPrice;

  // Simulated gateway flow with signature + idempotency verification.
  const order = createOrder(amount, method);
  const callback = simulateGatewayCallback(order, 'success');
  const verification = verifyCallback(callback, []);

  if (!verification.verified) throw ApiError.badRequest(verification.reason);

  activateSubscription(ws.subscription, planId, cycle, amount, method);
  await ws.save();

  const pg = await PgAccount.findById(req.pgId);
  if (pg) {
    pg.subscriptionPlanId = planId;
    await pg.save();
  }

  recordAudit(req.user.id, 'subscription.checkout', 'Subscription', String(req.pgId), `Subscribed to ${plan.name} (${cycle}) â‚¹${amount}`);
  await runNotificationEngine(req.pgId);
  res.json({ success: true, subscription: ws.subscription, payment: callback });
});

export const upgradePlan = asyncHandler(async (req, res) => {
  const { planId } = req.body;
  const ws = await ensureWorkspace(req.pgId);
  ws.subscription.pendingPlanId = planId;
  await ws.save();
  recordAudit(req.user.id, 'subscription.upgrade', 'Subscription', String(req.pgId), `Upgrade scheduled to ${planId}`);
  res.json({ success: true, subscription: ws.subscription });
});

export const changeCycle = asyncHandler(async (req, res) => {
  const { cycle } = req.body;
  const ws = await ensureWorkspace(req.pgId);
  ws.subscription.cycle = cycle;
  await ws.save();
  res.json({ success: true, subscription: ws.subscription });
});

export const renew = asyncHandler(async (req, res) => {
  const { method = 'UPI' } = req.body;
  const ws = await ensureWorkspace(req.pgId);
  const sub = ws.subscription;
  if (sub.status === 'Trial' || sub.status === 'Active') throw ApiError.badRequest('Subscription is not due for renewal');

  const plan = getPlan(sub.pendingPlanId || sub.planId);
  const cycle = sub.pendingCycle || sub.cycle;
  const amount = cycle === 'annual' ? plan.annualPrice : plan.monthlyPrice;

  const order = createOrder(amount, method);
  const callback = simulateGatewayCallback(order, 'success');
  if (!verifyCallback(callback, []).verified) throw ApiError.badRequest('Payment verification failed');

  activateSubscription(sub, plan.id, cycle, amount, method);
  await ws.save();
  recordAudit(req.user.id, 'subscription.renewed', 'Subscription', String(req.pgId), `Renewed ${plan.name} â‚¹${amount}`);
  await runNotificationEngine(req.pgId);
  res.json({ success: true, subscription: sub });
});

export const retryPayment = asyncHandler(async (req, res) => {
  const { method = 'UPI' } = req.body;
  const ws = await ensureWorkspace(req.pgId);
  const sub = ws.subscription;
  if (!['Payment Pending', 'Past Due', 'Suspended'].includes(sub.status)) {
    throw ApiError.badRequest('No failed payment to retry');
  }

  const plan = getPlan(sub.planId);
  const amount = sub.cycle === 'annual' ? plan.annualPrice : plan.monthlyPrice;
  const order = createOrder(amount, method);
  const callback = simulateGatewayCallback(order, 'success');
  if (!verifyCallback(callback, []).verified) throw ApiError.badRequest('Payment verification failed');

  activateSubscription(sub, sub.planId, sub.cycle, amount, method);
  await ws.save();
  recordAudit(req.user.id, 'subscription.retry', 'Subscription', String(req.pgId), 'Retried failed subscription payment');
  await runNotificationEngine(req.pgId);
  res.json({ success: true, subscription: sub });
});

export const setAutoRenew = asyncHandler(async (req, res) => {
  const { autoRenew } = req.body;
  const ws = await ensureWorkspace(req.pgId);
  ws.subscription.autoRenew = autoRenew;
  await ws.save();
  res.json({ success: true, subscription: ws.subscription });
});

