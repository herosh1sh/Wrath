import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { getDatabase } from '../db/init.js';
import { asyncHandler, NotFoundError, ForbiddenError, ValidationError } from '../middleware/errorHandler.js';

const router = express.Router();

const createTagSchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#7E963B')
});

const updateTagSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional()
});

// Get all tags for workspace
router.get('/', asyncHandler(async (req, res) => {
  const { workspaceId } = req.query;
  const db = getDatabase();

  if (!workspaceId) {
    throw new ValidationError('workspaceId query parameter required');
  }

  const membership = db.prepare('SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?')
    .get(workspaceId, req.user.id);

  if (!membership) {
    throw new ForbiddenError('Not a member of this workspace');
  }

  const tags = db.prepare(`
    SELECT t.*, COUNT(pt.page_id) as page_count
    FROM tags t
    LEFT JOIN page_tags pt ON t.id = pt.tag_id
    WHERE t.workspace_id = ?
    GROUP BY t.id
    ORDER BY t.name
  `).all(workspaceId);

  res.json({ tags });
});

// Create tag
router.post('/', asyncHandler(async (req, res) => {
  const data = createTagSchema.parse(req.body);
  const db = getDatabase();

  const membership = db.prepare('SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?')
    .get(data.workspaceId, req.user.id);

  if (!membership) {
    throw new ForbiddenError('Not a member of this workspace');
  }

  try {
    const tagId = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO tags (id, workspace_id, name, color, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(tagId, data.workspaceId, data.name, data.color, now);

    const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(tagId);
    res.status(201).json({ tag });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      throw new ValidationError('Tag with this name already exists');
    }
    throw error;
  }
}));

// Update tag
router.patch('/:tagId', asyncHandler(async (req, res) => {
  const data = updateTagSchema.parse(req.body);
  const db = getDatabase();

  const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(req.params.tagId);
  if (!tag) {
    throw new NotFoundError('Tag not found');
  }

  const membership = db.prepare('SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?')
    .get(tag.workspace_id, req.user.id);

  if (!membership) {
    throw new ForbiddenError('Not a member of this workspace');
  }

  const updates = [];
  const params = [];

  if (data.name !== undefined) {
    // Check uniqueness
    const existing = db.prepare('SELECT id FROM tags WHERE workspace_id = ? AND name = ? AND id != ?')
      .get(tag.workspace_id, data.name, tag.id);
    if (existing) {
      throw new ValidationError('Tag with this name already exists');
    }
    updates.push('name = ?');
    params.push(data.name);
  }
  if (data.color !== undefined) {
    updates.push('color = ?');
    params.push(data.color);
  }

  if (updates.length > 0) {
    params.push(tag.id);
    db.prepare(`UPDATE tags SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }

  const updatedTag = db.prepare('SELECT * FROM tags WHERE id = ?').get(tag.id);
  res.json({ tag: updatedTag });
}));

// Delete tag
router.delete('/:tagId', asyncHandler(async (req, res) => {
  const db = getDatabase();

  const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(req.params.tagId);
  if (!tag) {
    throw new NotFoundError('Tag not found');
  }

  const membership = db.prepare('SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?')
    .get(tag.workspace_id, req.user.id);

  if (!membership) {
    throw new ForbiddenError('Not a member of this workspace');
  }

  db.prepare('DELETE FROM tags WHERE id = ?').run(tag.id);
  res.json({ message: 'Tag deleted' });
}));

// Add tag to page
router.post('/pages/:pageId/tags', asyncHandler(async (req, res) => {
  const schema = z.object({ tagId: z.string().uuid() });
  const data = schema.parse(req.body);
  const db = getDatabase();

  const page = db.prepare('SELECT workspace_id FROM pages WHERE id = ?').get(req.params.pageId);
  if (!page) {
    throw new NotFoundError('Page not found');
  }

  const tag = db.prepare('SELECT workspace_id FROM tags WHERE id = ?').get(data.tagId);
  if (!tag) {
    throw new NotFoundError('Tag not found');
  }

  if (page.workspace_id !== tag.workspace_id) {
    throw new ValidationError('Tag and page must be in the same workspace');
  }

  const membership = db.prepare('SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?')
    .get(page.workspace_id, req.user.id);

  if (!membership) {
    throw new ForbiddenError('Not a member of this workspace');
  }

  db.prepare('INSERT OR IGNORE INTO page_tags (page_id, tag_id) VALUES (?, ?)')
    .run(req.params.pageId, data.tagId);

  res.json({ message: 'Tag added to page' });
}));

// Remove tag from page
router.delete('/pages/:pageId/tags/:tagId', asyncHandler(async (req, res) => {
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

  db.prepare('DELETE FROM page_tags WHERE page_id = ? AND tag_id = ?')
    .run(req.params.pageId, req.params.tagId);

  res.json({ message: 'Tag removed from page' });
}));

// Get tags for a page
router.get('/pages/:pageId', asyncHandler(async (req, res) => {
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

  const tags = db.prepare(`
    SELECT t.* FROM tags t
    JOIN page_tags pt ON t.id = pt.tag_id
    WHERE pt.page_id = ?
  `).all(req.params.pageId);

  res.json({ tags });
}));

export default router;