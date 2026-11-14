import ApiError from '../utils/apiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { FoodMenuItem, MealOptOut, FoodRating, Tenant } from '../models/index.js';
import { runNotificationEngine } from '../services/notificationEngine.js';
import { recordAudit } from '../services/auditService.js';

export const listMenu = asyncHandler(async (req, res) => {
  const filter = { pg: req.pgId };
  if (req.query.day) filter.day = req.query.day;
  if (req.query.mealType) filter.mealType = req.query.mealType;
  const menu = await FoodMenuItem.find(filter).sort({ day: 1, mealType: 1 });
  res.json({ success: true, menu });
});

export const upsertMenu = asyncHandler(async (req, res) => {
  const { day, mealType, items, timing } = req.body;
  const item = await FoodMenuItem.findOneAndUpdate(
    { pg: req.pgId, day, mealType },
    { $set: { items, timing } },
    { new: true, upsert: true, runValidators: true }
  );
  recordAudit(req.user.id, 'menu.updated', 'FoodMenuItem', item.id, `${day} ${mealType} menu updated`);
  res.json({ success: true, item });
});

export const addMealOptOut = asyncHandler(async (req, res) => {
  if (req.user.role !== 'tenant') throw ApiError.forbidden('Only tenants can opt out of meals');
  const { date, mealType } = req.body;
  const optOut = await MealOptOut.findOneAndUpdate(
    { pg: req.pgId, tenant: req.tenantId, date, mealType },
    { $set: { date, mealType } },
    { new: true, upsert: true, runValidators: true }
  );
  recordAudit(req.user.id, 'meal.optout', 'MealOptOut', optOut.id, `${mealType} opt-out on ${date}`);
  res.status(201).json({ success: true, optOut });
});

export const removeMealOptOut = asyncHandler(async (req, res) => {
  const optOut = await MealOptOut.findOneAndDelete({ _id: req.params.id, pg: req.pgId });
  if (!optOut) throw ApiError.notFound('Opt-out not found');
  res.json({ success: true, message: 'Opt-out removed' });
});

export const myOptOuts = asyncHandler(async (req, res) => {
  const optOuts = await MealOptOut.find({ pg: req.pgId, tenant: req.tenantId }).sort({ date: -1 });
  res.json({ success: true, optOuts });
});

export const rateMeal = asyncHandler(async (req, res) => {
  if (req.user.role !== 'tenant') throw ApiError.forbidden('Only tenants can rate meals');
  const { date, mealType, rating, review } = req.body;
  const entry = await FoodRating.findOneAndUpdate(
    { pg: req.pgId, tenant: req.tenantId, date, mealType },
    { $set: { rating, review } },
    { new: true, upsert: true, runValidators: true }
  );
  recordAudit(req.user.id, 'meal.rated', 'FoodRating', entry.id, `${mealType} rated ${rating}/5`);
  res.json({ success: true, rating: entry });
});

export const listRatings = asyncHandler(async (req, res) => {
  const filter = { pg: req.pgId };
  if (req.query.mealType) filter.mealType = req.query.mealType;
  const ratings = await FoodRating.find(filter).sort({ date: -1 });
  const tenants = await Tenant.find({ pg: req.pgId });
  const nameById = new Map(tenants.map((t) => [String(t._id), t.fullName]));
  res.json({ success: true, ratings: ratings.map((r) => ({ ...r.toJSON(), tenantName: nameById.get(String(r.tenant)) })) });
});

