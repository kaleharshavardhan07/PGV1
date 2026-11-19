import ApiError from '../utils/apiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { DOCUMENT_MIME_TYPES } from '../constants/index.js';
import { signToken, verifyToken } from '../services/tokenService.js';
import { loadPrincipal } from '../middlewares/auth.js';
import * as documents from '../repositories/documents.js';
import * as tenants from '../repositories/tenants.js';
import * as finance from '../repositories/finance.js';
import { recordAudit } from '../services/auditService.js';

// A document belongs to a tenant, an expense, an invoice, or just the PG. Each kind
// is governed by its own module: the feature must be on and (for managers) the
// permission granted.
const KINDS = {
  tenant: { feature: 'documents', permission: 'documents' },
  pg: { feature: 'documents', permission: 'documents' },
  expense: { feature: 'expenses', permission: 'expenses' },
  invoice: { feature: 'billing', permission: 'billing' },
};

const kindOf = (d) => (d.invoiceId ? 'invoice' : d.expenseId ? 'expense' : d.tenantId ? 'tenant' : 'pg');
const isStaff = (req) => req.user.role !== 'tenant';
const featureOn = (req, kind) => req.user.features?.[KINDS[kind].feature] !== false;
const staffMay = (req, kind) => featureOn(req, kind) && req.user.permissions?.[KINDS[kind].permission] === true;
const displayName = (user) => user.doc.ownerName ?? user.doc.fullName ?? '';

const assertStaff = (req, kind) => {
  if (!featureOn(req, kind)) throw new ApiError(403, `The ${KINDS[kind].feature} feature is not enabled for this PG`);
  if (!staffMay(req, kind)) throw ApiError.forbidden(`You don't have permission to manage ${KINDS[kind].permission}`);
};

const viewerTenantId = (req) => (isStaff(req) ? undefined : req.tenantId);

/** Metadata for a document this caller is allowed to see (404 otherwise, never 403, to avoid leaking existence). */
const mustGet = async (req) => {
  const doc = await documents.getDocument(req.pgId, req.params.id, viewerTenantId(req));
  if (!doc) throw ApiError.notFound('Document not found');
  const kind = kindOf(doc);
  if (isStaff(req)) assertStaff(req, kind);
  else if (!featureOn(req, kind)) throw ApiError.notFound('Document not found');
  return doc;
};

export const listDocuments = asyncHandler(async (req, res) => {
  const { tenant, expense, invoice } = req.query;
  const all = await documents.listDocuments({
    pgId: req.pgId, tenantId: tenant, expenseId: expense, invoiceId: invoice, viewerTenantId: viewerTenantId(req),
  });
  const visible = all.filter((d) => (isStaff(req) ? staffMay(req, kindOf(d)) : featureOn(req, kindOf(d))));
  res.json({ success: true, documents: visible });
});

/** Work out and authorise what the upload is attached to. */
const resolveTarget = async (req) => {
  const { tenantId, expenseId, invoiceId } = req.body;
  if ([tenantId, expenseId, invoiceId].filter(Boolean).length > 1) throw ApiError.badRequest('Attach a document to one thing only');

  if (isStaff(req)) {
    if (expenseId) {
      assertStaff(req, 'expense');
      if (!(await finance.getExpense(req.pgId, expenseId))) throw ApiError.badRequest('Expense not found');
      return { expenseId };
    }
    if (invoiceId) {
      assertStaff(req, 'invoice');
      const inv = await finance.getInvoice(req.pgId, invoiceId);
      if (!inv) throw ApiError.badRequest('Invoice not found');
      return { invoiceId, tenantId: inv.tenantId };
    }
    assertStaff(req, tenantId ? 'tenant' : 'pg');
    if (tenantId && !(await tenants.getTenant(req.pgId, tenantId))) throw ApiError.badRequest('Tenant not found');
    return { tenantId: tenantId ?? null };
  }

  // Tenants: their own documents, proof on an expense that asks for it, or a receipt for their own invoice.
  if (expenseId) {
    if (!featureOn(req, 'expense')) throw new ApiError(403, 'The expenses feature is not enabled for this PG');
    const expense = await finance.getExpense(req.pgId, expenseId);
    if (!expense || !expense.visibleToTenants) throw ApiError.badRequest('Expense not found');
    if (!expense.proofRequired) throw ApiError.forbidden('This expense does not ask for receipts or proofs');
    return { expenseId, tenantId: req.tenantId };
  }
  if (invoiceId) {
    if (!featureOn(req, 'invoice')) throw new ApiError(403, 'The billing feature is not enabled for this PG');
    const inv = await finance.getInvoice(req.pgId, invoiceId);
    if (!inv || inv.tenantId !== req.tenantId || inv.status === 'Draft') throw ApiError.badRequest('Invoice not found');
    return { invoiceId, tenantId: req.tenantId };
  }
  if (!featureOn(req, 'tenant')) throw new ApiError(403, 'The documents feature is not enabled for this PG');
  if (tenantId && tenantId !== req.tenantId) throw ApiError.forbidden('You can only upload your own documents');
  return { tenantId: req.tenantId };
};

export const uploadDocument = asyncHandler(async (req, res) => {
  const { file } = req;
  if (!file) throw ApiError.badRequest('Choose a file to upload');

  // The declared MIME type must match the file's real leading bytes.
  const signature = DOCUMENT_MIME_TYPES[file.mimetype];
  if (!signature || !signature.every((byte, i) => file.buffer[i] === byte)) {
    throw ApiError.badRequest('The file content does not match its type. Upload a valid PDF, JPG, PNG or WebP file.');
  }

  const target = await resolveTarget(req);
  const document = await documents.createDocument({
    pgId: req.pgId, ...target, type: req.body.type, title: req.body.title, file,
    uploader: { id: req.user.id, role: req.user.role, name: displayName(req.user) },
  });
  recordAudit(req.pgId, req.user.id, 'document.uploaded', 'Document', document.id, `${document.type}: ${document.fileName}`);
  res.status(201).json({ success: true, document });
});

export const deleteDocument = asyncHandler(async (req, res) => {
  const doc = await mustGet(req);
  // Tenants can only remove what they uploaded themselves.
  if (!isStaff(req) && doc.uploadedById !== req.user.id) throw ApiError.forbidden('You can only delete documents you uploaded');
  await documents.deleteDocument(req.pgId, doc.id);
  recordAudit(req.pgId, req.user.id, 'document.deleted', 'Document', doc.id, doc.fileName);
  res.json({ success: true, message: 'Document deleted' });
});

// Browsers cannot attach an Authorization header to <img>/<a>/window.open, so the
// client first asks for a short-lived link scoped to exactly this document.
export const createLink = asyncHandler(async (req, res) => {
  const doc = await mustGet(req);
  const token = signToken({ sub: req.user.id, role: req.user.role, purpose: 'document', doc: doc.id }, '2m');
  res.json({ success: true, url: `/api/documents/${doc.id}/file?t=${token}` });
});

export const streamFile = asyncHandler(async (req, res) => {
  // Accept either the normal bearer session or a link token minted by createLink.
  if (req.user) {
    req.pgId = req.user.pgId;
  } else {
    let payload;
    try {
      payload = verifyToken(String(req.query.t ?? ''));
    } catch {
      throw ApiError.unauthorized('This link has expired. Reopen the document.');
    }
    if (payload.purpose !== 'document' || payload.doc !== req.params.id) throw ApiError.unauthorized('Invalid link');
    req.user = await loadPrincipal(payload);
    req.pgId = req.user.pgId;
    req.tenantId = req.user.tenantId;
  }

  const doc = await mustGet(req);
  const file = await documents.getDocumentData(req.pgId, doc.id);
  const safeName = file.fileName.replace(/[^\w.\- ]+/g, '_');
  res.setHeader('Content-Type', file.mimeType);
  res.setHeader('Content-Length', file.data.length);
  res.setHeader('Content-Disposition', `${req.query.download ? 'attachment' : 'inline'}; filename="${safeName}"`);
  res.setHeader('Cache-Control', 'private, no-store');
  res.send(file.data);
});
