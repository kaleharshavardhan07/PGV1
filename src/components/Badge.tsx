import type { ComplaintStatus, BedStatus, PaymentStatus } from '../types';

const complaintColors: Record<ComplaintStatus, string> = {
  Submitted: 'bg-primary-50 text-primary',
  Seen: 'bg-warning-light text-warning',
  'In Progress': 'bg-secondary-50 text-secondary-600',
  Resolved: 'bg-success-light text-success',
};

const bedColors: Record<BedStatus, string> = {
  occupied: 'bg-success-light text-success',
  vacant: 'bg-primary-50 text-primary',
  notice: 'bg-warning-light text-warning',
};

const paymentColors: Record<PaymentStatus, string> = {
  Paid: 'bg-success-light text-success',
  Pending: 'bg-warning-light text-warning',
  Overdue: 'bg-error-light text-error',
};

export function ComplaintStatusBadge({ status }: { status: ComplaintStatus }) {
  return <span className={`badge ${complaintColors[status]}`}>{status}</span>;
}

export function BedStatusBadge({ status }: { status: BedStatus }) {
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return <span className={`badge ${bedColors[status]}`}>{label}</span>;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <span className={`badge ${paymentColors[status]}`}>{status}</span>;
}
