import ApiError from '../utils/apiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import * as ops from '../repositories/operations.js';
import { recordAudit } from '../services/auditService.js';

export const listMenu = asyncHandler(async (req, res) => {
  res.json({ success: true, menu: await ops.listMenu({ pgId: req.pgId, day: req.query.day, mealType: req.query.mealType }) });
});

export const upsertMenu = asyncHandler(async (req, res) => {
  const item = await ops.upsertMenu(req.pgId, req.body);
  recordAudit(req.pgId, req.user.id, 'menu.updated', 'FoodMenuItem', item.id, `${item.day} ${item.mealType} menu updated`);
  res.json({ success: true, item });
});

export const myOptOuts = asyncHandler(async (req, res) => {
  res.json({ success: true, optOuts: await ops.listOptOuts(req.pgId, req.tenantId) });
});

export const addMealOptOut = asyncHandler(async (req, res) => {
  const optOut = await ops.addOptOut(req.pgId, req.tenantId, req.body.date, req.body.mealType);
  res.status(201).json({ success: true, optOut });
});

export const removeMealOptOut = asyncHandler(async (req, res) => {
  if (!(await ops.removeOptOut(req.pgId, req.tenantId, req.params.id))) throw ApiError.notFound('Opt-out not found');
  res.json({ success: true, message: 'Opt-out removed' });
});

export const rateMeal = asyncHandler(async (req, res) => {
  res.json({ success: true, rating: await ops.rateMeal(req.pgId, req.tenantId, req.body) });
});

export const listRatings = asyncHandler(async (req, res) => {
  res.json({ success: true, ratings: await ops.listRatings({ pgId: req.pgId, mealType: req.query.mealType }) });
});
