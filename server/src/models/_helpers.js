// Shared schema options so every collection exposes a clean JSON shape:
// - `id` instead of `_id`
// - no `__v`
// - ISO timestamps
export const toJSON = {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    if (ret._id) {
      ret.id = ret._id.toString();
      delete ret._id;
    }
    return ret;
  },
};

export const schemaOptions = { timestamps: true, toJSON, toObject: toJSON };

// Helper to strip undefined/empty strings before create/update (keeps docs tidy).
export const scrub = (obj) => {
  const out = {};
  for (const [k, v] of Object.entries(obj ?? {})) {
    if (v === undefined || v === '') continue;
    out[k] = v;
  }
  return out;
};
