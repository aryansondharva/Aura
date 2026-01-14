import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import config from '../config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Allowed file types
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.txt'];
const ALLOWED_MIMETYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
];

/**
 * File filter function to validate file types
 * @param {Object} req - Express request object
 * @param {Object} file - Multer file object
 * @param {Function} cb - Callback function
 */
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mimetype = file.mimetype;

  if (ALLOWED_EXTENSIONS.includes(ext) && ALLOWED_MIMETYPES.includes(mimetype)) {
    cb(null, true);
  } else {
    const error = new Error(`Invalid file type. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`);
    error.name = 'ValidationError';
    cb(error, false);
  }
};

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

// Create multer upload instance with 5MB limit
const upload = multer({
  storage,
  limits: {
    fileSize: config.maxFileSize // 5MB from config
  },
  fileFilter
});

// Export configured upload middleware
export default upload;

// Export constants for testing
export { ALLOWED_EXTENSIONS, ALLOWED_MIMETYPES, fileFilter };
