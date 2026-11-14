import mongoose from 'mongoose';
import { schemaOptions } from './_helpers.js';
import { MEAL_TYPES } from '../constants/index.js';

const mealOptOutSchema = new mongoose.Schema(
  {
    pg: { type: mongoose.Schema.Types.ObjectId, ref: 'PgAccount', required: true, index: true },
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    mealType: { type: String, enum: MEAL_TYPES, required: true },
  },
  schemaOptions
);

mealOptOutSchema.index({ tenant: 1, date: 1, mealType: 1 }, { unique: true });

export default mongoose.model('MealOptOut', mealOptOutSchema);
