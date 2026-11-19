import ApiError from '../utils/apiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import * as finance from '../repositories/finance.js';
import * as documents from '../repositories/documents.js';
import * as tenants from '../repositories/tenants.js';
import { insertNotification } from '../repositories/notifications.js';
import { recordAudit } from '../services/auditService.js';

const isTenant = (req) => req.user.role === 'tenant';

const mustGet = async (req) => {
  const invoice = await finance.getInvoice(req.pgId, req.params.id);
  // Tenants only ever see their own, non-draft invoices.
  if (!invoice || (isTenant(req) && (invoice.tenantId !== req.tenantId || invoice.status === 'Draft'))) throw ApiError.notFound('Invoice not found');
  return invoice;
};

export const listInvoices = asyncHandler(async (req, res) => {
  const { status, period, search } = req.query;
  const invoices = await finance.listInvoices({
    pgId: req.pgId, tenantId: isTenant(req) ? req.tenantId : undefined, status, period, search,
  });
  res.json({ success: true, invoices });
});

export const getInvoice = asyncHandler(async (req, res) => {
  const invoice = await mustGet(req);
  res.json({ success: true, invoice, documents: await documents.listDocuments({ pgId: req.pgId, invoiceId: invoice.id }) });
});

const notifyIssued = (pgId, invoice) =>
  insertNotification(pgId, {
    dedupeKey: `invoice-issued-${invoice.id}`, userId: invoice.tenantId, userRole: 'tenant', category: 'Invoice', type: 'info',
    title: `Invoice ${invoice.number}`,
    message: `A new invoice of ₹${Number(invoice.amount).toLocaleString('en-IN')} for ${invoice.billingPeriod} is due on ${invoice.dueDate}.`,
    link: '/app/tenant/invoices',
  });

export const createInvoices = asyncHandler(async (req, res) => {
  const { tenantIds, allActive, issue, ...data } = req.body;
  let ids = tenantIds ?? [];
  // Everyone still living in the PG, including tenants serving their notice period.
  if (allActive) ids = (await tenants.listTenants({ pgId: req.pgId })).filter((t) => t.status !== 'Left').map((t) => t.id);
  if (!ids.length) throw ApiError.badRequest('Select at least one tenant');

  const created = await finance.createInvoices(req.pgId, ids, { ...data, status: issue ? 'Issued' : 'Draft' }, req.user.id);
  const invoices = await Promise.all(created.map((id) => finance.getInvoice(req.pgId, id)));
  if (issue) await Promise.all(invoices.map((i) => notifyIssued(req.pgId, i)));
  recordAudit(req.pgId, req.user.id, 'invoice.created', 'Invoice', created[0], `Created ${created.length} invoice(s) for ${data.billingPeriod}`);
  res.status(201).json({ success: true, invoices });
});

export const updateInvoice = asyncHandler(async (req, res) => {
  const invoice = await finance.updateInvoice(req.pgId, req.params.id, req.body);
  if (!invoice) throw ApiError.badRequest('Only draft or issued invoices can be edited');
  recordAudit(req.pgId, req.user.id, 'invoice.updated', 'Invoice', invoice.id, invoice.number);
  res.json({ success: true, invoice });
});

export const transition = (action, message) =>
  asyncHandler(async (req, res) => {
    const invoice = await finance.transitionInvoice(req.pgId, req.params.id, action, req.body);
    if (!invoice) throw ApiError.badRequest(message);
    if (action === 'issue') await notifyIssued(req.pgId, invoice);
    recordAudit(req.pgId, req.user.id, `invoice.${action}`, 'Invoice', invoice.id, invoice.number);
    res.json({ success: true, invoice });
  });

export const deleteInvoice = asyncHandler(async (req, res) => {
  if (!(await finance.deleteDraftInvoice(req.pgId, req.params.id))) {
    throw ApiError.conflict('Only draft invoices can be deleted. Cancel an issued invoice instead.');
  }
  recordAudit(req.pgId, req.user.id, 'invoice.deleted', 'Invoice', req.params.id, 'Deleted draft invoice');
  res.json({ success: true, message: 'Invoice deleted' });
});
