import ApiError from '../utils/apiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import * as tenants from '../repositories/tenants.js';
import * as rooms from '../repositories/rooms.js';
import * as finance from '../repositories/finance.js';
import { toCsv, writeXlsx } from '../services/exportService.js';
import { recordAudit } from '../services/auditService.js';

// Each dataset names the module it belongs to, so a switched-off feature cannot be exported either.
const DATASETS = {
  tenants: {
    feature: null,
    title: 'Tenants',
    build: async (pgId) => {
      const columns = ['Name', 'Mobile', 'Email', 'Gender', 'Emergency Contact', 'Room', 'Bed', 'Monthly Rent', 'Security Deposit', 'Joining Date', 'Police Verification', 'Status'];
      const rows = (await tenants.listTenants({ pgId })).map((t) => ({
        Name: t.fullName, Mobile: t.mobile, Email: t.email, Gender: t.gender ?? '', 'Emergency Contact': t.emergencyContact,
        Room: t.roomNumber ?? '', Bed: t.bedNumber ?? '', 'Monthly Rent': t.monthlyRent, 'Security Deposit': t.securityDeposit,
        'Joining Date': t.joiningDate, 'Police Verification': t.policeVerification, Status: t.status,
      }));
      return { columns, rows };
    },
  },
  rooms: {
    feature: null,
    title: 'Rooms and Beds',
    build: async (pgId) => {
      const columns = ['Room', 'Floor', 'Sharing', 'Attached Bathroom', 'Bed', 'Label', 'Rent', 'Status', 'Tenant'];
      const rows = (await rooms.listRooms(pgId)).flatMap((r) =>
        (r.beds.length ? r.beds : [null]).map((b) => ({
          Room: r.roomNumber, Floor: r.floor, Sharing: `${r.sharingType}-sharing`, 'Attached Bathroom': r.attachedBathroom ? 'Yes' : 'No',
          Bed: b?.bedNumber ?? '', Label: b?.label ?? '', Rent: b?.rent ?? '', Status: b?.status ?? '', Tenant: b?.tenantName ?? '',
        }))
      );
      return { columns, rows };
    },
  },
  occupancy: {
    feature: null,
    title: 'Occupancy',
    build: async (pgId) => {
      const columns = ['Room', 'Floor', 'Total Beds', 'Occupied', 'Vacant', 'Unavailable', 'Occupancy %'];
      const rows = (await rooms.listRooms(pgId)).map((r) => ({
        Room: r.roomNumber, Floor: r.floor, 'Total Beds': r.totalBeds, Occupied: r.occupiedBeds, Vacant: r.vacantBeds,
        Unavailable: r.unavailableBeds, 'Occupancy %': r.totalBeds ? Math.round((r.occupiedBeds / r.totalBeds) * 100) : 0,
      }));
      return { columns, rows };
    },
  },
  expenses: {
    feature: 'expenses',
    title: 'Expenses',
    build: async (pgId) => {
      const columns = ['Date', 'Title', 'Category', 'Amount', 'Status', 'Visible To Tenants', 'Proof Required', 'Description'];
      const rows = (await finance.listExpenses({ pgId })).map((e) => ({
        Date: e.expenseDate, Title: e.title, Category: e.category, Amount: e.amount, Status: e.status,
        'Visible To Tenants': e.visibleToTenants ? 'Yes' : 'No', 'Proof Required': e.proofRequired ? 'Yes' : 'No', Description: e.description,
      }));
      return { columns, rows };
    },
  },
  invoices: {
    feature: 'billing',
    title: 'Invoices',
    build: async (pgId) => {
      const columns = ['Invoice', 'Tenant', 'Room', 'Billing Period', 'Amount', 'Due Date', 'Status', 'Paid On', 'Payment Note', 'Description'];
      const rows = (await finance.listInvoices({ pgId })).map((i) => ({
        Invoice: i.number, Tenant: i.tenantName, Room: i.roomNumber ?? '', 'Billing Period': i.billingPeriod, Amount: i.amount,
        'Due Date': i.dueDate, Status: i.overdue ? 'Overdue' : i.status, 'Paid On': i.paidOn ?? '', 'Payment Note': i.paymentNote, Description: i.description,
      }));
      return { columns, rows };
    },
  },
};

export const exportDataset = asyncHandler(async (req, res) => {
  const dataset = DATASETS[req.params.dataset];
  if (!dataset) throw ApiError.notFound('Unknown export');
  // The dataset's own module must also be on, and (for managers) permitted.
  if (dataset.feature) {
    if (req.user.features[dataset.feature] === false) throw new ApiError(403, `The ${dataset.feature} feature is not enabled for this PG`);
    if (!req.user.permissions[dataset.feature]) throw ApiError.forbidden(`You don't have permission to export ${dataset.feature}`);
  }

  const { columns, rows } = await dataset.build(req.pgId); // always scoped to the caller's PG
  const stamp = new Date().toISOString().split('T')[0];
  const base = `${req.params.dataset}-${stamp}`;
  recordAudit(req.pgId, req.user.id, 'export.created', 'Export', req.params.dataset, `${rows.length} rows as ${req.query.format}`);

  if (req.query.format === 'xlsx') {
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${base}.xlsx"`);
    res.setHeader('Cache-Control', 'private, no-store');
    await writeXlsx(res, dataset.title, columns, rows);
    return res.end();
  }
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${base}.csv"`);
  res.setHeader('Cache-Control', 'private, no-store');
  res.send(toCsv(columns, rows));
});
