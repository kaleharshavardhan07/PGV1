import ApiError from '../utils/apiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { DOCUMENT_MIME_TYPES } from '../constants/index.js';
import { signToken, verifyToken } from '../services/tokenService.js';
import { loadPrincipal } from '../middlewares/auth.js';
import * as documents from '../repositories/documents.js';
import * as tenants from '../repositories/tenants.js';
import { recordAudit } from '../services/auditService.js';

const isStaff = (req) => req.user.role !== 'tenant';

const displayName = (user) => user.doc.ownerName ?? user.doc.fullName ?? '';

/** A tenant may only touch their own documents; staff may touch any in their PG. */
const assertCanAccess = (req, doc) => {
  if (!isStaff(req) && doc.tenantId !== req.tenantId) throw ApiError.notFound('Document not found');
};

const mustGet = async (req) => {
  const doc = await documents.getDocument(req.pgId, req.params.id);
  if (!doc) throw ApiError.notFound('Document not found');
  assertCanAccess(req, doc);
  return doc;
};

export const listDocuments = asyncHandler(async (req, res) => {
  const tenantId = isStaff(req) ? req.query.tenant : req.tenantId;
  res.json({ success: true, documents: await documents.listDocuments({ pgId: req.pgId, tenantId }) });
});

export const uploadDocument = asyncHandler(async (req, res) => {
  const { file } = req;
  if (!file) throw ApiError.badRequest('Choose a file to upload');

  // The declared MIME type must match the file's real leading bytes.
  const signature = DOCUMENT_MIME_TYPES[file.mimetype];
  if (!signature || !signature.every((byte, i) => file.buffer[i] === byte)) {
    throw ApiError.badRequest('The file content does not match its type. Upload a valid PDF, JPG, PNG or WebP file.');
  }

  // Tenants upload for themselves; staff name the tenant and it must belong to their PG.
  const tenantId = isStaff(req) ? req.body.tenantId : req.tenantId;
  if (!tenantId) throw ApiError.badRequest('Select the tenant this document belongs to');
  if (!(await tenants.getTenant(req.pgId, tenantId))) throw ApiError.badRequest('Tenant not found');

  const document = await documents.createDocument({
    pgId: req.pgId,
    tenantId,
    type: req.body.type,
    title: req.body.title,
    file,
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
  const { t } = req.query;
  let user = req.user;
  if (user) {
    req.pgId = user.pgId;
  } else {
    let payload;
    try {
      payload = verifyToken(String(t ?? ''));
    } catch {
      throw ApiError.unauthorized('This link has expired. Reopen the document.');
    }
    if (payload.purpose !== 'document' || payload.doc !== req.params.id) throw ApiError.unauthorized('Invalid link');
    user = await loadPrincipal(payload);
    req.user = user;
    req.pgId = user.pgId;
    req.tenantId = user.tenantId;
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
