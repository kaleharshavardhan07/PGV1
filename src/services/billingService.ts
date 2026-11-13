// Shared billing calculations: overdue detection, outstanding totals.
// Used by dashboards, the notification engine and reports.

import type { Payment, Tenant, Room } from '../types';

export const todayISODate = () => new Date().toISOString().split('T')[0];

export const daysBetween = (fromISODate: string, toISODate: string): number =>
  Math.round((new Date(toISODate).getTime() - new Date(fromISODate).getTime()) / 86400000);

export const isUnpaid = (p: Payment) => p.status !== 'Paid';

export const daysOverdue = (p: Payment, today = todayISODate()): number => {
  if (!isUnpaid(p)) return 0;
  const d = daysBetween(p.dueDate, today);
  return d > 0 ? d : 0;
};

export const daysUntilDue = (p: Payment, today = todayISODate()): number =>
  daysBetween(today, p.dueDate);

export interface TenantOutstanding {
  tenant: Tenant;
  roomNumber?: string;
  rentDue: number;
  electricityDue: number;
  totalDue: number;
  worstDaysOverdue: number;
  unpaidPayments: Payment[];
}

export const getTenantOutstanding = (
  tenant: Tenant,
  payments: Payment[],
  rooms: Room[],
  today = todayISODate()
): TenantOutstanding => {
  const unpaid = payments.filter((p) => p.tenantId === tenant.id && isUnpaid(p));
  const rentDue = unpaid.filter((p) => p.type === 'Rent').reduce((s, p) => s + p.amount, 0);
  const electricityDue = unpaid.filter((p) => p.type === 'Electricity').reduce((s, p) => s + p.amount, 0);
  const room = rooms.find((r) => r.id === tenant.roomId);
  return {
    tenant,
    roomNumber: room?.roomNumber,
    rentDue,
    electricityDue,
    totalDue: rentDue + electricityDue,
    worstDaysOverdue: unpaid.reduce((m, p) => Math.max(m, daysOverdue(p, today)), 0),
    unpaidPayments: unpaid,
  };
};

export const getOutstandingTenants = (
  tenants: Tenant[],
  payments: Payment[],
  rooms: Room[],
  today = todayISODate()
): TenantOutstanding[] =>
  tenants
    .filter((t) => t.status !== 'Left')
    .map((t) => getTenantOutstanding(t, payments, rooms, today))
    .filter((o) => o.totalDue > 0)
    .sort((a, b) => b.worstDaysOverdue - a.worstDaysOverdue);

export interface OverdueSummary {
  overdueTenants: number;
  rentOutstanding: number;
  electricityOutstanding: number;
  totalOutstanding: number;
  overdueMoreThan3Days: number;
  overdueMoreThan7Days: number;
  rows: TenantOutstanding[];
}

export const getOverdueSummary = (
  tenants: Tenant[],
  payments: Payment[],
  rooms: Room[],
  today = todayISODate()
): OverdueSummary => {
  const rows = getOutstandingTenants(tenants, payments, rooms, today);
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
