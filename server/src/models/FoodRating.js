import mongoose from 'mongoose';
import { schemaOptions } from './_helpers.js';
import { MEAL_TYPES } from '../constants/index.js';

const foodRatingSchema = new mongoose.Schema(
  {
    pg: { type: mongoose.Schema.Types.ObjectId, ref: 'PgAccount', required: true, index: true },
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    mealType: { type: String, enum: MEAL_TYPES, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    review: { type: String, default: '' },
  },
  schemaOptions
);

export default mongoose.model('FoodRating', foodRatingSchema);
