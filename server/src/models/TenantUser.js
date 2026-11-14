import mongoose from 'mongoose';
import { schemaOptions } from './_helpers.js';

const tenantUserSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, unique: true, trim: true },
    email: { type: String, lowercase: true, trim: true, default: '' },
    gender: { type: String, enum: ['Male', 'Female', 'Other'], default: undefined },
    // Optional password. OTP login is also supported; see auth controller.
    passwordHash: { type: String, default: null },
  },
  schemaOptions
);

export default mongoose.model('TenantUser', tenantUserSchema);
