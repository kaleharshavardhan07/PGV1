import mongoose from 'mongoose';
import { schemaOptions } from './_helpers.js';

// Per-PG manager (staff) identity with its own credentials.
const managerSchema = new mongoose.Schema(
  {
    pg: { type: mongoose.Schema.Types.ObjectId, ref: 'PgAccount', required: true, index: true },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    mobile: { type: String, default: '', trim: true },
    passwordHash: { type: String, required: true },
  },
  schemaOptions
);

export default mongoose.model('Manager', managerSchema);
