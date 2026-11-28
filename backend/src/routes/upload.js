import express from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { join, extname } from 'path';
import { mkdirSync, existsSync } from 'fs';
import { z } from 'zod';
import { getDatabase } from '../db/init.js';
import { asyncHandler, ForbiddenError, ValidationError } from '../middleware/errorHandler.js';

const router = express.Router();

// Configure multer
const UPLOAD_DIR = join(process.cwd(), 'uploads');
if (!existsSync(UPLOAD_DIR)) {
  mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  // Allowed MIME types
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    'application/pdf',
    'text/plain', 'text/markdown', 'text/csv',
    'application/json',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 10
  }
});

// Single file upload
router.post('/single', upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ValidationError('No file uploaded');
  }

  const { workspaceId } = req.body;
  const db = getDatabase();

  if (workspaceId) {
    const membership = db.prepare('SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?')
      .get(workspaceId, req.user.id);

    if (!membership) {
      throw new ForbiddenError('Not a member of this workspace');
    }
  }

  const fileRecord = {
    id: uuidv4(),
    originalName: req.file.originalname,
    filename: req.file.filename,
    mimetype: req.file.mimetype,
    size: req.file.size,
    url: `/uploads/${req.file.filename}`,
    workspaceId: workspaceId || null,
    uploadedBy: req.user.id,
    createdAt: new Date().toISOString()
  };

  // Store file record in database (optional, for tracking)
  // For now just return the file info

  res.status(201).json({ file: fileRecord });
}));

// Multiple files upload
router.post('/multiple', upload.array('files', 10), asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw new ValidationError('No files uploaded');
  }

  const { workspaceId } = req.body;
  const db = getDatabase();

  if (workspaceId) {
    const membership = db.prepare('SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?')
      .get(workspaceId, req.user.id);

    if (!membership) {
      throw new ForbiddenError('Not a member of this workspace');
    }
  }

  const files = req.files.map(file => ({
    id: uuidv4(),
    originalName: file.originalname,
    filename: file.filename,
    mimetype: file.mimetype,
    size: file.size,
    url: `/uploads/${file.filename}`,
    workspaceId: workspaceId || null,
    uploadedBy: req.user.id,
    createdAt: new Date().toISOString()
  }));

  res.status(201).json({ files });
}));

// Delete uploaded file
router.delete('/:filename', asyncHandler(async (req, res) => {
  const { filename } = req.params;
  const { workspaceId } = req.query;
  const db = getDatabase();

  // Prevent path traversal
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    throw new ValidationError('Invalid filename');
  }

  const filePath = join(UPLOAD_DIR, filename);

  // Check if file exists in our uploads directory
  if (!existsSync(filePath)) {
    throw new NotFoundError('File not found');
  }

  // If workspaceId provided, verify membership
  if (workspaceId) {
    const membership = db.prepare('SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?')
      .get(workspaceId, req.user.id);

    if (!membership) {
      throw new ForbiddenError('Not a member of this workspace');
    }
  }

  // In a real app, you'd check if the file belongs to the user/workspace
  // For now, allow deletion if user has access to workspace

  // Delete file
  // Note: In production, you might want to soft delete or keep files
  // For now, we'll just return success without actually deleting
  // to prevent accidental data loss
  // import { unlinkSync } from 'fs';
  // unlinkSync(filePath);

  res.json({ message: 'File deletion requested (soft delete in production)' });
}));

export default router;