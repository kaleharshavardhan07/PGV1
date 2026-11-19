import type { ComplaintStatus, BedStatus, TenantStatus, PoliceVerification, InvoiceStatus } from '../types';

const complaintColors: Record<ComplaintStatus, string> = {
  Submitted: 'bg-primary-50 text-primary-700',
  Seen: 'bg-warning-light text-warning',
  'In Progress': 'bg-secondary-50 text-secondary-700',
  Resolved: 'bg-success-light text-success',
};

const bedColors: Record<BedStatus, string> = {
  occupied: 'bg-dark-100 text-dark-600',
  vacant: 'bg-success-light text-success',
  notice: 'bg-warning-light text-warning',
  unavailable: 'bg-error-light text-error',
};

const tenantColors: Record<TenantStatus, string> = {
  Active: 'bg-success-light text-success',
  'Notice Period': 'bg-warning-light text-warning',
  Left: 'bg-dark-100 text-dark-500',
};

const verificationColors: Record<PoliceVerification, string> = {
  Verified: 'bg-success-light text-success',
  Pending: 'bg-warning-light text-warning',
  'Not Required': 'bg-dark-100 text-dark-500',
};

export const ComplaintStatusBadge = ({ status }: { status: ComplaintStatus }) => (
  <span className={`badge ${complaintColors[status]}`}>{status}</span>
);

export const BedStatusBadge = ({ status }: { status: BedStatus }) => (
  <span className={`badge ${bedColors[status]}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
);

export const TenantStatusBadge = ({ status }: { status: TenantStatus }) => (
  <span className={`badge ${tenantColors[status]}`}>{status}</span>
);

export const VerificationBadge = ({ status }: { status: PoliceVerification }) => (
  <span className={`badge ${verificationColors[status]}`}>{status}</span>
);

const invoiceColors: Record<InvoiceStatus | 'Overdue', string> = {
  Draft: 'bg-dark-100 text-dark-600',
  Issued: 'bg-primary-50 text-primary-700',
  Paid: 'bg-success-light text-success',
  Cancelled: 'bg-dark-100 text-dark-400 line-through',
  Overdue: 'bg-error-light text-error',
};

export const InvoiceStatusBadge = ({ status, overdue }: { status: InvoiceStatus; overdue?: boolean }) => {
  const key = overdue && status === 'Issued' ? 'Overdue' : status;
  return <span className={`badge ${invoiceColors[key]}`}>{key}</span>;
};
