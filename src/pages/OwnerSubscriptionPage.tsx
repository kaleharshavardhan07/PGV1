// Owner Subscription & Billing dashboard.
// SaaS subscription management — completely separate from tenant payment ledgers.

import { useState } from 'react';
import {
  CreditCard,
  Download,
  TriangleAlert,
  CircleCheck,
  ArrowUpCircle,
  ArrowDownCircle,
  RefreshCcw,
  Repeat,
  Settings2,
  X,
  Crown,
  CalendarClock,
  Wallet,
} from 'lucide-react';
import AppLayout from '../components/AppLayout';
import { useAppStore } from '../store/appStore';
import { PLANS, getPlan, FREE_TRIAL_DAYS } from '../data/plans';
import {
  subscriptionAllows,
  usageSummary,
  isOverLimit,
  downloadInvoice,
  limitLabel,
} from '../services/subscriptionService';
import { formatDate } from '../utils/format';
import type { BillingCycle, PlanId } from '../types';
import { useToast } from '../components/Toast';

const statusStyles: Record<string, string> = {
  Trial: 'bg-blue-50 text-blue-600',
  Active: 'bg-success-light text-success',
  'Payment Pending': 'bg-warning-light text-warning',
  'Past Due': 'bg-warning-light text-warning',
  Suspended: 'bg-error-light text-error',
  Cancelled: 'bg-gray-100 text-dark-500',
  Expired: 'bg-error-light text-error',
};

export default function OwnerSubscriptionPage() {
  const {
    data,
    upgradePlan,
    scheduleDowngrade,
    changeBillingCycle,
    renewSubscription,
    retrySubscriptionPayment,
    setAutoRenew,
  } = useAppStore();
  const toast = useToast();
  const sub = data.subscription;
  const plan = getPlan(sub.planId);

  const usage = {
    rooms: data.rooms.length,
    beds: data.beds.length,
    branches: 1,
  };
  const usageRows = usageSummary(sub, usage);

  const [modal, setModal] = useState<'upgrade' | 'downgrade' | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(null);
  const [showCycle, setShowCycle] = useState(false);
  const [processing, setProcessing] = useState(false);

  const needsAttention = ['Payment Pending', 'Past Due', 'Suspended', 'Expired'].includes(sub.status);
  const trialEnding =
    sub.status === 'Trial' &&
    sub.trialEndsAt &&
    (new Date(sub.trialEndsAt).getTime() - Date.now()) / 86400000 <= 3;

  const simulate = (action: () => void | Promise<unknown>, message: string) => {
    setProcessing(true);
    setTimeout(async () => {
      await action();
      setProcessing(false);
      setModal(null);
      setShowCycle(false);
      toast.show(message, 'success');
    }, 1200);
  };

  const handleUpgrade = () => {
    if (!selectedPlan) return;
    simulate(() => upgradePlan(selectedPlan), `Upgraded to ${getPlan(selectedPlan).name}. New features unlocked.`);
  };

  const handleDowngrade = () => {
    if (!selectedPlan) return;
    scheduleDowngrade(selectedPlan);
    setModal(null);
    toast.show(`Downgrade to ${getPlan(selectedPlan).name} scheduled for ${formatDate(sub.currentPeriodEnd)}.`, 'info');
  };

  const confirmModal = () => {
    if (!selectedPlan || modal === null) return;
    if (modal === 'upgrade') handleUpgrade();
    else handleDowngrade();
  };

  return (
    <AppLayout role="owner" title="Subscription & Billing">
      <div className="space-y-6 max-w-5xl">
        {/* Payment warning banner */}
        {needsAttention && (
          <div className="rounded-2xl border border-warning bg-warning-light p-5 flex flex-col sm:flex-row sm:items-center gap-4">
            <TriangleAlert size={24} className="text-warning shrink-0" />
            <div className="flex-1">
              <div className="font-bold text-dark-900">Subscription payment needs attention</div>
              <p className="text-sm text-dark-600">
                Status: <strong>{sub.status}</strong>. Paid features are restricted per the subscription policy
                (grace period: {data.reminderSchedule.gracePeriodDays} days). Your tenant, payment and PG records are
                never deleted.
              </p>
            </div>
            <button
              onClick={() => simulate(() => retrySubscriptionPayment('UPI'), 'Payment successful — full access restored.')}
              disabled={processing}
              className="btn-primary shrink-0"
            >
              <RefreshCcw size={16} /> Retry Payment
            </button>
          </div>
        )}
        {trialEnding && (
          <div className="rounded-2xl border border-primary bg-primary-50 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
            <CalendarClock size={24} className="text-primary shrink-0" />
            <div className="flex-1">
              <div className="font-bold text-dark-900">Free trial ending soon</div>
              <p className="text-sm text-dark-600">
                Your trial ends on {formatDate(sub.trialEndsAt)}. Choose a plan to keep automation features active.
              </p>
            </div>
            <button onClick={() => setModal('upgrade')} className="btn-primary shrink-0">
              <Crown size={16} /> Choose a Plan
            </button>
          </div>
        )}

        {/* Current plan */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="card p-6 lg:col-span-2">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="text-xs text-dark-400 mb-1">Current Subscription</div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-dark-900">{plan.name}</h2>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${statusStyles[sub.status] ?? 'bg-gray-100'}`}>
                    {sub.status}
                  </span>
                </div>
                <p className="text-sm text-dark-500 mt-1">{plan.tagline} · {sub.cycle === 'monthly' ? 'Monthly' : 'Annual'} billing</p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-secondary text-white flex items-center justify-center">
                <Crown size={26} />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Amount Paid', value: `₹${sub.amountPaid.toLocaleString('en-IN')}` },
                { label: sub.status === 'Trial' ? 'Trial Ends' : 'Next Renewal', value: formatDate(sub.currentPeriodEnd) },
                { label: 'Started On', value: formatDate(sub.startedAt) },
                { label: 'Auto Renew', value: sub.autoRenew ? 'On' : 'Off' },
              ].map((s) => (
                <div key={s.label} className="bg-background-100 rounded-xl p-4">
                  <div className="text-xs text-dark-400 mb-1">{s.label}</div>
                  <div className="font-bold text-dark-900">{s.value}</div>
                </div>
              ))}
            </div>

            {sub.status === 'Expired' && (
              <div className="mb-6 rounded-xl bg-error-light p-4 text-sm text-dark-700">
                Your subscription has expired. Paid features are restricted, but all records remain accessible.
                Renew to restore full access.
              </div>
            )}

            {(sub.pendingPlanId || sub.pendingCycle) && (
              <div className="mb-6 rounded-xl bg-primary-50 p-4 text-sm text-dark-700 flex items-center gap-2">
                <Repeat size={16} className="text-primary" />
                Scheduled for {formatDate(sub.currentPeriodEnd)}:{' '}
                {sub.pendingPlanId && <>plan changes to <strong>{getPlan(sub.pendingPlanId).name}</strong></>}
                {sub.pendingPlanId && sub.pendingCycle && ' · '}
                {sub.pendingCycle && <>billing switches to <strong>{sub.pendingCycle}</strong></>}
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <button onClick={() => { setModal('upgrade'); setSelectedPlan(null); }} className="btn-primary">
                <ArrowUpCircle size={16} /> Upgrade Plan
              </button>
              <button
                onClick={() => { setModal('downgrade'); setSelectedPlan(null); }}
                className="btn-secondary"
                disabled={sub.planId === 'starter'}
              >
                <ArrowDownCircle size={16} /> Downgrade Plan
              </button>
              <button
                onClick={() => simulate(() => renewSubscription('UPI'), 'Subscription renewed successfully.')}
                disabled={processing}
                className="btn-secondary"
              >
                <RefreshCcw size={16} /> Renew Subscription
              </button>
              <button onClick={() => setShowCycle(true)} className="btn-secondary">
                <Repeat size={16} /> Change Billing Cycle
              </button>
              <button
                onClick={() => {
                  setAutoRenew(!sub.autoRenew);
                  toast.show(sub.autoRenew ? `Auto-renew turned off. Access continues until ${formatDate(sub.currentPeriodEnd)}.` : 'Auto-renew enabled.', sub.autoRenew ? 'info' : 'success');
                }}
                className="btn-secondary"
              >
                <Settings2 size={16} /> {sub.autoRenew ? 'Cancel Auto-Renew' : 'Enable Auto-Renew'}
              </button>
            </div>
          </div>

          {/* Plan limits / usage */}
          <div className="card p-6">
            <div className="text-xs text-dark-400 mb-1">Plan Limits</div>
            <h3 className="font-bold text-lg text-dark-900 mb-4">Usage</h3>
            <div className="space-y-4">
              {usageRows.map((row) => {
                const pct = row.limit === null ? 0 : Math.min(100, Math.round((row.used / row.limit) * 100));
                const over = isOverLimit(row.used, row.limit);
                return (
                  <div key={row.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-dark-600">{row.label}</span>
                      <span className={`font-semibold ${over ? 'text-error' : 'text-dark-900'}`}>
                        {row.used} / {limitLabel(row.limit)}
                      </span>
                    </div>
                    <div className="w-full bg-background-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${over ? 'bg-error' : 'bg-gradient-to-r from-primary to-secondary'}`}
                        style={{ width: row.limit === null ? '8%' : `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-5 pt-4 border-t border-background-300">
              <div className="text-xs text-dark-400 mb-2">Included in {plan.name}</div>
              <ul className="space-y-1.5 text-xs text-dark-600 max-h-44 overflow-y-auto">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-1.5">
                    <CircleCheck size={13} className="text-success mt-0.5 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Payment history / invoices */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-lg text-dark-900">Subscription Payment History</h3>
              <p className="text-xs text-dark-500">
                Aapka PG SaaS invoices — kept separate from your tenants' rent &amp; electricity ledger.
              </p>
            </div>
            <Wallet size={20} className="text-dark-300" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-dark-400 border-b border-background-300">
                  <th className="py-2.5 pr-4 font-medium">Invoice</th>
                  <th className="py-2.5 pr-4 font-medium">Date</th>
                  <th className="py-2.5 pr-4 font-medium">Plan</th>
                  <th className="py-2.5 pr-4 font-medium">Cycle</th>
                  <th className="py-2.5 pr-4 font-medium">Amount</th>
                  <th className="py-2.5 pr-4 font-medium">Status</th>
                  <th className="py-2.5 font-medium text-right">Download</th>
                </tr>
              </thead>
              <tbody>
                {[...sub.invoices].reverse().map((inv) => (
                  <tr key={inv.id} className="border-b border-background-200">
                    <td className="py-3 pr-4 font-medium text-dark-800">{inv.number}</td>
                    <td className="py-3 pr-4 text-dark-600">{formatDate(inv.date)}</td>
                    <td className="py-3 pr-4 text-dark-600 capitalize">{inv.planId}</td>
                    <td className="py-3 pr-4 text-dark-600 capitalize">{inv.cycle}</td>
                    <td className="py-3 pr-4 font-semibold text-dark-900">₹{inv.amount.toLocaleString('en-IN')}</td>
                    <td className="py-3 pr-4">
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                          inv.status === 'Paid'
                            ? 'bg-success-light text-success'
                            : inv.status === 'Pending'
                            ? 'bg-warning-light text-warning'
                            : 'bg-error-light text-error'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => downloadInvoice(inv, data.settings.name, data.settings.ownerName)}
                        className="inline-flex items-center gap-1 text-primary hover:underline text-xs font-medium"
                        title="Download invoice (demo HTML invoice)"
                      >
                        <Download size={14} /> Invoice
                      </button>
                    </td>
                  </tr>
                ))}
                {sub.invoices.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-dark-400">
                      No invoices yet — they appear after your first subscription payment.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-dark-400 mt-4 flex items-center gap-1.5">
            <CreditCard size={13} />
            All subscription payments in this demo are simulated. Real gateway integration plugs into the same billing module.
          </p>
        </div>

        {/* Feature policy note */}
        <div className="card p-6">
          <h3 className="font-bold text-lg text-dark-900 mb-2">Subscription Policy</h3>
          <ul className="text-sm text-dark-600 space-y-1.5">
            <li>• Grace period: <strong>{data.reminderSchedule.gracePeriodDays} days</strong> after a failed payment before "Past Due".</li>
            <li>• During grace and pending states, paid automation features are restricted according to policy; viewing records and billing history always stays available.</li>
            <li>• Expiring or suspending a subscription <strong>never deletes</strong> tenant, payment or PG records.</li>
            <li>• Upgrade applies instantly; downgrade and billing-cycle changes apply at the next renewal.</li>
          </ul>
          <div className="mt-4 flex items-center gap-2 text-sm">
            <span className="text-dark-500">Automation features active:</span>
            <span className={`font-semibold ${subscriptionAllows(sub, 'autoReminders') ? 'text-success' : 'text-error'}`}>
              {subscriptionAllows(sub, 'autoReminders') ? 'Yes' : 'Restricted'}
            </span>
          </div>
        </div>
      </div>

      {/* Upgrade / downgrade modal */}
      {modal && (
        <div className="fixed inset-0 bg-dark-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-xl text-dark-900">
                {modal === 'upgrade' ? 'Upgrade Plan' : 'Downgrade Plan'}
              </h3>
              <button onClick={() => setModal(null)} className="p-2 rounded-xl hover:bg-background-200">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-dark-500 mb-5">
              {modal === 'upgrade'
                ? 'Upgrades apply immediately with a simulated charge for the new plan.'
                : `Downgrades apply at your next renewal on ${formatDate(sub.currentPeriodEnd)}.`}
            </p>
            <div className="grid sm:grid-cols-3 gap-4">
              {PLANS.map((p) => {
                const isCurrent = p.id === sub.planId;
                const disabled = modal === 'downgrade' ? p.id === 'pro' || isCurrent : isCurrent;
                return (
                  <button
                    key={p.id}
                    disabled={disabled}
                    onClick={() => setSelectedPlan(p.id)}
                    className={`text-left rounded-2xl p-5 border-2 transition-all ${
                      selectedPlan === p.id
                        ? 'border-primary bg-primary-50'
                        : disabled
                        ? 'border-background-200 opacity-50 cursor-not-allowed'
                        : 'border-background-300 hover:border-primary-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-dark-900">{p.name}</span>
                      {isCurrent && <span className="text-[10px] font-bold bg-primary text-white px-2 py-0.5 rounded-full">CURRENT</span>}
                    </div>
                    <div className="text-lg font-bold text-dark-900 mb-2">
                      ₹{(sub.cycle === 'monthly' ? p.monthlyPrice : p.annualPrice).toLocaleString('en-IN')}
                      <span className="text-xs font-medium text-dark-400">/{sub.cycle === 'monthly' ? 'mo' : 'yr'}</span>
                    </div>
                    <p className="text-xs text-dark-500">{p.tagline}</p>
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
              <button onClick={confirmModal} disabled={!selectedPlan || processing} className="btn-primary">
                {processing ? 'Processing…' : modal === 'upgrade' ? 'Upgrade Now (Simulated)' : 'Schedule Downgrade'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Billing cycle modal */}
      {showCycle && (
        <div className="fixed inset-0 bg-dark-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-xl text-dark-900">Change Billing Cycle</h3>
              <button onClick={() => setShowCycle(false)} className="p-2 rounded-xl hover:bg-background-200">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-dark-500 mb-5">
              The new cycle takes effect at your next renewal on {formatDate(sub.currentPeriodEnd)}.
            </p>
            <div className="space-y-3">
              {(['monthly', 'annual'] as BillingCycle[]).map((c) => (
                <button
                  key={c}
                  disabled={c === sub.cycle}
                  onClick={() =>
                    simulate(
                      () => changeBillingCycle(c),
                      `Billing cycle change to ${c} scheduled for ${formatDate(sub.currentPeriodEnd)}.`
                    )
                  }
                  className={`w-full card p-4 flex items-center justify-between text-left ${
                    c === sub.cycle ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary-200'
                  }`}
                >
                  <div>
                    <div className="font-bold text-dark-900 capitalize">{c}</div>
                    <div className="text-xs text-dark-500">
                      ₹{getPlan(sub.planId)[c === 'monthly' ? 'monthlyPrice' : 'annualPrice'].toLocaleString('en-IN')}{' '}
                      {c === 'monthly' ? 'per month' : 'per year'}
                    </div>
                  </div>
                  {c === sub.cycle && <span className="text-xs font-bold text-success">Current</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Trial info */}
      {sub.status === 'Trial' && (
        <div className="max-w-5xl text-xs text-dark-400 flex items-center gap-2">
          <CreditCard size={13} /> Trial includes all {plan.name} features for {FREE_TRIAL_DAYS} days. Simulated billing — no real charges.
        </div>
      )}
    </AppLayout>
  );
}
