// Pure billing calculations (port of the frontend billingService.ts).
// Used by controllers, the notification engine and dashboards.

export const todayISODate = () => new Date().toISOString().split('T')[0];

export const daysBetween = (fromISODate, toISODate) =>
  Math.round(
    (new Date(`${toISODate}T00:00:00Z`).getTime() - new Date(`${fromISODate}T00:00:00Z`).getTime()) /
      86400000
  );

export const isUnpaid = (p) => p.status !== 'Paid';

export const daysOverdue = (p, today = todayISODate()) => {
  if (!isUnpaid(p)) return 0;
  const d = daysBetween(p.dueDate, today);
  return d > 0 ? d : 0;
};

export const daysUntilDue = (p, today = todayISODate()) => daysBetween(today, p.dueDate);

export const getTenantOutstanding = (tenant, payments, roomNumber) => {
  const unpaid = payments.filter((p) => String(p.tenant) === String(tenant.id ?? tenant._id) && isUnpaid(p));
  const rentDue = unpaid.filter((p) => p.type === 'Rent').reduce((s, p) => s + p.amount, 0);
  const electricityDue = unpaid.filter((p) => p.type === 'Electricity').reduce((s, p) => s + p.amount, 0);
  return {
    tenantId: tenant.id,
    fullName: tenant.fullName,
    roomNumber,
    rentDue,
    electricityDue,
    totalDue: rentDue + electricityDue,
    worstDaysOverdue: unpaid.reduce((m, p) => Math.max(m, daysOverdue(p)), 0),
    unpaidCount: unpaid.length,
  };
};

export const getOutstandingTenants = (tenants, payments, roomByTenant) =>
  tenants
    .filter((t) => t.status !== 'Left')
    .map((t) => getTenantOutstanding(t, payments, roomByTenant.get(String(t._id))?.roomNumber))
    .filter((o) => o.totalDue > 0)
    .sort((a, b) => b.worstDaysOverdue - a.worstDaysOverdue);

export const getOverdueSummary = (tenants, payments, roomByTenant) => {
  const rows = getOutstandingTenants(tenants, payments, roomByTenant);
  return {
    overdueTenants: rows.length,
    rentOutstanding: rows.reduce((s, r) => s + r.rentDue, 0),
    electricityOutstanding: rows.reduce((s, r) => s + r.electricityDue, 0),
    totalOutstanding: rows.reduce((s, r) => s + r.totalDue, 0),
    overdueMoreThan3Days: rows.filter((r) => r.worstDaysOverdue > 3).length,
    overdueMoreThan7Days: rows.filter((r) => r.worstDaysOverdue > 7).length,
    rows,
  };
};
