import express from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { join, extname } from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { AppError } from '../middleware/errorHandler.js';

const router = express.Router();
const DATA_DIR = join(process.cwd(), 'data');
const UPLOAD_DIR = join(DATA_DIR, 'uploads');

if (!existsSync(UPLOAD_DIR)) {
  mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'application/pdf',
      'text/plain',
      'text/markdown',
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError('File type not allowed', 400));
    }
  },
});

// Upload single file
router.post('/', upload.single('file'), (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError('No file uploaded', 400);
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    const fileInfo = {
      id: uuidv4(),
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      url: fileUrl,
      uploadedAt: Date.now(),
    };

    res.status(201).json({ file: fileInfo });
  } catch (err) {
    next(err);
  }
});

// Upload multiple files
router.post('/multiple', upload.array('files', 10), (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      throw new AppError('No files uploaded', 400);
    }

    const files = req.files.map(file => ({
      id: uuidv4(),
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      url: `/uploads/${file.filename}`,
      uploadedAt: Date.now(),
    }));

    res.status(201).json({ files });
  } catch (err) {
    next(err);
  }
});

// Delete uploaded file
router.delete('/:filename', (req, res, next) => {
  try {
    const { unlinkSync, existsSync } = require('fs');
    const filePath = join(UPLOAD_DIR, req.params.filename);

    if (!existsSync(filePath)) {
      throw new AppError('File not found', 404);
    }

    // Security: ensure filename doesn't contain path traversal
    if (req.params.filename.includes('..') || req.params.filename.includes('/')) {
      throw new AppError('Invalid filename', 400);
    }

    unlinkSync(filePath);
    res.json({ message: 'File deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;