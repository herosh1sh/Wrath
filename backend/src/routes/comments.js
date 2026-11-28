import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { getDatabase } from '../db/init.js';
import { asyncHandler, NotFoundError, ForbiddenError, ValidationError } from '../middleware/errorHandler.js';

const router = express.Router();

const createCommentSchema = z.object({
  pageId: z.string().uuid(),
  blockId: z.string().uuid().optional(),
  content: z.string().min(1).max(5000)
});

const updateCommentSchema = z.object({
  content: z.string().min(1).max(5000)
});

// Get comments for a page
router.get('/page/:pageId', asyncHandler(async (req, res) => {
  const db = getDatabase();

  const page = db.prepare('SELECT workspace_id FROM pages WHERE id = ?').get(req.params.pageId);
  if (!page) {
    throw new NotFoundError('Page not found');
  }

  const membership = db.prepare('SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?')
    .get(page.workspace_id, req.user.id);

  if (!membership) {
    throw new ForbiddenError('Not a member of this workspace');
  }

  const comments = db.prepare(`
    SELECT c.*, u.username, u.display_name, u.avatar_url
    FROM comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.page_id = ?
    ORDER BY c.created_at
  `).all(req.params.pageId);

  res.json({ comments });
});

// Get comments for a block
router.get('/block/:blockId', asyncHandler(async (req, res) => {
  const db = getDatabase();

  const block = db.prepare(`
    SELECT p.workspace_id
    FROM blocks b
    JOIN pages p ON b.page_id = p.id
    WHERE b.id = ?
  `).get(req.params.blockId);

  if (!block) {
    throw new NotFoundError('Block not found');
  }

  const membership = db.prepare('SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?')
    .get(block.workspace_id, req.user.id);

  if (!membership) {
    throw new ForbiddenError('Not a member of this workspace');
  }

  const comments = db.prepare(`
    SELECT c.*, u.username, u.display_name, u.avatar_url
    FROM comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.block_id = ?
    ORDER BY c.created_at
  `).all(req.params.blockId);

  res.json({ comments });
});

// Create comment
router.post('/', asyncHandler(async (req, res) => {
  const data = createCommentSchema.parse(req.body);
  const db = getDatabase();

  const page = db.prepare('SELECT workspace_id FROM pages WHERE id = ?').get(data.pageId);
  if (!page) {
    throw new NotFoundError('Page not found');
  }

  const membership = db.prepare('SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?')
    .get(page.workspace_id, req.user.id);

  if (!membership) {
    throw new ForbiddenError('Not a member of this workspace');
  }

  // If blockId provided, verify it belongs to the page
  if (data.blockId) {
    const block = db.prepare('SELECT id FROM blocks WHERE id = ? AND page_id = ?').get(data.blockId, data.pageId);
    if (!block) {
      throw new ValidationError('Block not found in this page');
    }
  }

  const commentId = uuidv4();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO comments (id, page_id, block_id, user_id, content, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(commentId, data.pageId, data.blockId || null, req.user.id, data.content, now, now);

  const comment = db.prepare(`
    SELECT c.*, u.username, u.display_name, u.avatar_url
    FROM comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.id = ?
  `).get(commentId);

  // Emit socket event for real-time updates
  req.io?.to(`page:${data.pageId}`).emit('comment:created', comment);

  res.status(201).json({ comment });
}));

// Update comment
router.patch('/:commentId', asyncHandler(async (req, res) => {
  const data = updateCommentSchema.parse(req.body);
  const db = getDatabase();

  const comment = db.prepare(`
    SELECT c.*, p.workspace_id
    FROM comments c
    JOIN pages p ON c.page_id = p.id
    WHERE c.id = ?
  `).get(req.params.commentId);

  if (!comment) {
    throw new NotFoundError('Comment not found');
  }

  // Only author can edit
  if (comment.user_id !== req.user.id) {
    throw new ForbiddenError('Can only edit your own comments');
  }

  const membership = db.prepare('SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?')
    .get(comment.workspace_id, req.user.id);

  if (!membership) {
    throw new ForbiddenError('Not a member of this workspace');
  }

  const now = new Date().toISOString();
  db.prepare('UPDATE comments SET content = ?, updated_at = ? WHERE id = ?')
    .run(data.content, now, comment.id);

  const updatedComment = db.prepare(`
    SELECT c.*, u.username, u.display_name, u.avatar_url
    FROM comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.id = ?
  `).get(comment.id);

  req.io?.to(`page:${comment.page_id}`).emit('comment:updated', updatedComment);

  res.json({ comment: updatedComment });
}));

// Resolve/unresolve comment
router.post('/:commentId/resolve', asyncHandler(async (req, res) => {
  const db = getDatabase();

  const comment = db.prepare(`
    SELECT c.*, p.workspace_id
    FROM comments c
    JOIN pages p ON c.page_id = p.id
    WHERE c.id = ?
  `).get(req.params.commentId);

  if (!comment) {
    throw new NotFoundError('Comment not found');
  }

  const membership = db.prepare('SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?')
    .get(comment.workspace_id, req.user.id);

  if (!membership) {
    throw new ForbiddenError('Not a member of this workspace');
  }

  const resolved = !comment.resolved;
  db.prepare('UPDATE comments SET resolved = ?, updated_at = ? WHERE id = ?')
    .run(resolved ? 1 : 0, new Date().toISOString(), comment.id);

  const updatedComment = { ...comment, resolved };

  req.io?.to(`page:${comment.page_id}`).emit('comment:updated', updatedComment);

  res.json({ comment: updatedComment });
}));

// Delete comment
router.delete('/:commentId', asyncHandler(async (req, res) => {
  const db = getDatabase();

  const comment = db.prepare(`
    SELECT c.*, p.workspace_id
    FROM comments c
    JOIN pages p ON c.page_id = p.id
    WHERE c.id = ?
  `).get(req.params.commentId);

  if (!comment) {
    throw new NotFoundError('Comment not found');
  }

  // Author or workspace admin/owner can delete
  const membership = db.prepare('SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?')
    .get(comment.workspace_id, req.user.id);

  const canDelete = comment.user_id === req.user.id || ['owner', 'admin'].includes(membership?.role || '');

  if (!canDelete) {
    throw new ForbiddenError('Insufficient permissions');
  }

  db.prepare('DELETE FROM comments WHERE id = ?').run(comment.id);

  req.io?.to(`page:${comment.page_id}`).emit('comment:deleted', { id: comment.id });

  res.json({ message: 'Comment deleted' });
}));

export default router;