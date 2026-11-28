import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { getDatabase } from '../db/init.js';
import { asyncHandler, NotFoundError, ForbiddenError } from '../middleware/errorHandler.js';

const router = express.Router();

// Get user's favorites
router.get('/', asyncHandler(async (req, res) => {
  const db = getDatabase();

  const favorites = db.prepare(`
    SELECT f.*, p.title, p.icon, p.cover_url, p.workspace_id, p.updated_at,
           w.name as workspace_name
    FROM favorites f
    JOIN pages p ON f.page_id = p.id
    JOIN workspaces w ON p.workspace_id = w.id
    WHERE f.user_id = ? AND p.is_archived = 0
    ORDER BY f.created_at DESC
  `).all(req.user.id);

  res.json({ favorites });
}));

// Add to favorites
router.post('/', asyncHandler(async (req, res) => {
  const schema = z.object({ pageId: z.string().uuid() });
  const data = schema.parse(req.body);
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

  const existing = db.prepare('SELECT id FROM favorites WHERE user_id = ? AND page_id = ?')
    .get(req.user.id, data.pageId);

  if (existing) {
    return res.json({ message: 'Already in favorites', favorite: existing });
  }

  const favoriteId = uuidv4();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO favorites (id, user_id, page_id, created_at)
    VALUES (?, ?, ?, ?)
  `).run(favoriteId, req.user.id, data.pageId, now);

  const favorite = db.prepare('SELECT * FROM favorites WHERE id = ?').get(favoriteId);
  res.status(201).json({ favorite });
}));

// Remove from favorites
router.delete('/:pageId', asyncHandler(async (req, res) => {
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

  db.prepare('DELETE FROM favorites WHERE user_id = ? AND page_id = ?')
    .run(req.user.id, req.params.pageId);

  res.json({ message: 'Removed from favorites' });
}));

// Check if page is favorited
router.get('/:pageId/check', asyncHandler(async (req, res) => {
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

  const favorite = db.prepare('SELECT id FROM favorites WHERE user_id = ? AND page_id = ?')
    .get(req.user.id, req.params.pageId);

  res.json({ isFavorited: !!favorite });
}));

export default router;