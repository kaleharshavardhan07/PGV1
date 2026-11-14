import mongoose from 'mongoose';
import { schemaOptions } from './_helpers.js';
import { MEAL_TYPES, WEEK_DAYS } from '../constants/index.js';

const foodMenuItemSchema = new mongoose.Schema(
  {
    pg: { type: mongoose.Schema.Types.ObjectId, ref: 'PgAccount', required: true, index: true },
    day: { type: String, enum: WEEK_DAYS, required: true },
    mealType: { type: String, enum: MEAL_TYPES, required: true },
    items: { type: [String], default: [] },
    timing: { type: String, default: '' },
  },
  schemaOptions
);

foodMenuItemSchema.index({ pg: 1, day: 1, mealType: 1 }, { unique: true });

export default mongoose.model('FoodMenuItem', foodMenuItemSchema);
