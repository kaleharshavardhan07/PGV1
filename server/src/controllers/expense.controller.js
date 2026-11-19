import ApiError from '../utils/apiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import * as finance from '../repositories/finance.js';
import * as documents from '../repositories/documents.js';
import { insertNotification } from '../repositories/notifications.js';
import { recordAudit } from '../services/auditService.js';

const isTenant = (req) => req.user.role === 'tenant';

const mustGet = async (req) => {
  const expense = await finance.getExpense(req.pgId, req.params.id);
  // Tenants must not learn that hidden expenses exist.
  if (!expense || (isTenant(req) && !expense.visibleToTenants)) throw ApiError.notFound('Expense not found');
  return expense;
};

export const listExpenses = asyncHandler(async (req, res) => {
  const { status, category, from, to } = req.query;
  const expenses = await finance.listExpenses({ pgId: req.pgId, tenantView: isTenant(req), status, category, from, to });
  res.json({ success: true, expenses });
});

export const getExpense = asyncHandler(async (req, res) => {
  const expense = await mustGet(req);
  const docs = await documents.listDocuments({ pgId: req.pgId, expenseId: expense.id });
  res.json({ success: true, expense, documents: docs });
});

export const createExpense = asyncHandler(async (req, res) => {
  const expense = await finance.createExpense(req.pgId, req.body, { id: req.user.id, role: req.user.role });
  if (expense.visibleToTenants) {
    await insertNotification(req.pgId, {
      dedupeKey: `expense-new-${expense.id}`, userId: 'all', userRole: 'tenant', category: 'Expense', type: 'info',
      title: 'New expense posted',
      message: `${expense.title} (₹${Number(expense.amount).toLocaleString('en-IN')}) was added.${expense.proofRequired ? ' Please upload your proof or receipt.' : ''}`,
      link: '/app/tenant/expenses',
    });
  }
  recordAudit(req.pgId, req.user.id, 'expense.created', 'Expense', expense.id, `${expense.title}: ₹${expense.amount}`);
  res.status(201).json({ success: true, expense });
});

export const updateExpense = asyncHandler(async (req, res) => {
  const expense = await finance.updateExpense(req.pgId, req.params.id, req.body);
  if (!expense) throw ApiError.notFound('Expense not found');
  recordAudit(req.pgId, req.user.id, 'expense.updated', 'Expense', expense.id, expense.title);
  res.json({ success: true, expense });
});

export const deleteExpense = asyncHandler(async (req, res) => {
  const expense = await finance.deleteExpense(req.pgId, req.params.id); // attached documents cascade
  if (!expense) throw ApiError.notFound('Expense not found');
  recordAudit(req.pgId, req.user.id, 'expense.deleted', 'Expense', expense.id, expense.title);
  res.json({ success: true, message: 'Expense deleted' });
});
