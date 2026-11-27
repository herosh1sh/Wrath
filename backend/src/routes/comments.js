import express from 'express';
import { z } from 'zod';
import Database from 'better-sqlite3';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../middleware/errorHandler.js';

const router = express.Router();
const DATA_DIR = join(process.cwd(), 'data');
const dbPath = join(DATA_DIR, 'notion-clone.db');
const db = new Database(dbPath);

// Get comments for a page
router.get('/page/:pageId', (req, res, next) => {
  try {
    // Verify page access
    const page = db.prepare(`
      SELECT p.workspace_id
      FROM pages p
      JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE p.id = ? AND wm.user_id = ? AND p.is_deleted = 0
    `).get(req.params.pageId, req.user.id);

    if (!page) {
      throw new AppError('Page not found', 404);
    }

    const comments = db.prepare(`
      SELECT c.*, u.name as author_name, u.avatar_url as author_avatar
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.page_id = ?
      ORDER BY c.created_at
    `).all(req.params.pageId);

    res.json({ comments });
  } catch (err) {
    next(err);
  }
});

// Get comments for a block
router.get('/block/:blockId', (req, res, next) => {
  try {
    // Verify block access
    const block = db.prepare(`
      SELECT p.workspace_id
      FROM blocks b
      JOIN pages p ON b.page_id = p.id
      JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE b.id = ? AND wm.user_id = ?
    `).get(req.params.blockId, req.user.id);

    if (!block) {
      throw new AppError('Block not found', 404);
    }

    const comments = db.prepare(`
      SELECT c.*, u.name as author_name, u.avatar_url as author_avatar
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.block_id = ?
      ORDER BY c.created_at
    `).all(req.params.blockId);

    res.json({ comments });
  } catch (err) {
    next(err);
  }
});

// Create comment
router.post('/', (req, res, next) => {
  try {
    const schema = z.object({
      pageId: z.string().uuid(),
      blockId: z.string().uuid().optional().nullable(),
      content: z.string().min(1).max(5000),
    });
    const { pageId, blockId, content } = schema.parse(req.body);

    // Verify page access
    const page = db.prepare(`
      SELECT p.workspace_id
      FROM pages p
      JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE p.id = ? AND wm.user_id = ? AND p.is_deleted = 0
    `).get(pageId, req.user.id);

    if (!page) {
      throw new AppError('Page not found', 404);
    }

    // Verify block if provided
    if (blockId) {
      const block = db.prepare('SELECT id FROM blocks WHERE id = ? AND page_id = ?').get(blockId, pageId);
      if (!block) {
        throw new AppError('Block not found', 404);
      }
    }

    const commentId = uuidv4();
    const now = Date.now();

    db.prepare(`
      INSERT INTO comments (id, page_id, block_id, user_id, content, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(commentId, pageId, blockId || null, req.user.id, content, now, now);

    const comment = db.prepare(`
      SELECT c.*, u.name as author_name, u.avatar_url as author_avatar
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `).get(commentId);

    const io = req.app.get('io');
    io?.to(`page:${pageId}`).emit('comment:created', comment);

    res.status(201).json({ comment });
  } catch (err) {
    next(err);
  }
});

// Update comment
router.patch('/:id', (req, res, next) => {
  try {
    const schema = z.object({
      content: z.string().min(1).max(5000),
    });
    const { content } = schema.parse(req.body);

    const comment = db.prepare(`
      SELECT c.*, p.workspace_id
      FROM comments c
      JOIN pages p ON c.page_id = p.id
      JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE c.id = ? AND wm.user_id = ?
    `).get(req.params.id, req.user.id);

    if (!comment) {
      throw new AppError('Comment not found', 404);
    }

    if (comment.user_id !== req.user.id) {
      throw new AppError('Not authorized to edit this comment', 403);
    }

    db.prepare('UPDATE comments SET content = ?, updated_at = ? WHERE id = ?')
      .run(content, Date.now(), req.params.id);

    const updatedComment = db.prepare(`
      SELECT c.*, u.name as author_name, u.avatar_url as author_avatar
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `).get(req.params.id);

    const io = req.app.get('io');
    io?.to(`page:${comment.page_id}`).emit('comment:updated', updatedComment);

    res.json({ comment: updatedComment });
  } catch (err) {
    next(err);
  }
});

// Delete comment
router.delete('/:id', (req, res, next) => {
  try {
    const comment = db.prepare(`
      SELECT c.*, p.workspace_id
      FROM comments c
      JOIN pages p ON c.page_id = p.id
      JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE c.id = ? AND wm.user_id = ?
    `).get(req.params.id, req.user.id);

    if (!comment) {
      throw new AppError('Comment not found', 404);
    }

    if (comment.user_id !== req.user.id) {
      throw new AppError('Not authorized to delete this comment', 403);
    }

    db.prepare('DELETE FROM comments WHERE id = ?').run(req.params.id);

    const io = req.app.get('io');
    io?.to(`page:${comment.page_id}`).emit('comment:deleted', { id: req.params.id });

    res.json({ message: 'Comment deleted' });
  } catch (err) {
    next(err);
  }
});

// Resolve/unresolve comment
router.post('/:id/resolve', (req, res, next) => {
  try {
    const schema = z.object({
      resolved: z.boolean(),
    });
    const { resolved } = schema.parse(req.body);

    const comment = db.prepare(`
      SELECT c.*, p.workspace_id
      FROM comments c
      JOIN pages p ON c.page_id = p.id
      JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE c.id = ? AND wm.user_id = ?
    `).get(req.params.id, req.user.id);

    if (!comment) {
      throw new AppError('Comment not found', 404);
    }

    db.prepare('UPDATE comments SET resolved = ?, updated_at = ? WHERE id = ?')
      .run(resolved ? 1 : 0, Date.now(), req.params.id);

    const updatedComment = db.prepare(`
      SELECT c.*, u.name as author_name, u.avatar_url as author_avatar
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `).get(req.params.id);

    const io = req.app.get('io');
    io?.to(`page:${comment.page_id}`).emit('comment:updated', updatedComment);

    res.json({ comment: updatedComment });
  } catch (err) {
    next(err);
  }
});

export default router;