import multer from 'multer';
import ApiError from '../utils/apiError.js';
import { DOCUMENT_MAX_BYTES, DOCUMENT_MIME_TYPES } from '../constants/index.js';

// Files are buffered in memory (capped at DOCUMENT_MAX_BYTES) and stored in Postgres (bytea).
const uploader = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: DOCUMENT_MAX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!DOCUMENT_MIME_TYPES[file.mimetype]) {
      return cb(ApiError.badRequest('Unsupported file type. Upload a PDF, JPG, PNG or WebP file.'));
    }
    cb(null, true);
  },
});

/** Accepts a single multipart `file` field and turns multer errors into ApiErrors. */
export const uploadSingle = (req, res, next) => {
  uploader.single('file')(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(ApiError.badRequest(`File is too large. The limit is ${DOCUMENT_MAX_BYTES / 1024 / 1024} MB.`));
    }
    if (err.name === 'MulterError') return next(ApiError.badRequest(err.message));
    return next(err);
  });
};
