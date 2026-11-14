import mongoose from 'mongoose';
import { schemaOptions } from './_helpers.js';

const roomSchema = new mongoose.Schema(
  {
    pg: { type: mongoose.Schema.Types.ObjectId, ref: 'PgAccount', required: true, index: true },
    roomNumber: { type: String, required: true, trim: true },
    floor: { type: Number, default: 0 },
    totalBeds: { type: Number, required: true, min: 1 },
    sharingType: { type: Number, default: 1 }, // 1, 2, 3, 4 sharing
    attachedBathroom: { type: Boolean, default: false },
  },
  schemaOptions
);

roomSchema.index({ pg: 1, roomNumber: 1 }, { unique: true });

export default mongoose.model('Room', roomSchema);
