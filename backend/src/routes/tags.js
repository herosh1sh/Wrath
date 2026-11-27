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

// Get all tags for workspace
router.get('/:workspaceId', (req, res, next) => {
  try {
    const access = db.prepare('SELECT 1 FROM workspace_members WHERE workspace_id = ? AND user_id = ?')
      .get(req.params.workspaceId, req.user.id);
    if (!access) {
      throw new AppError('Access denied', 403);
    }

    const tags = db.prepare('SELECT * FROM tags WHERE workspace_id = ? ORDER BY name').all(req.params.workspaceId);
    res.json({ tags });
  } catch (err) {
    next(err);
  }
});

// Create tag
router.post('/:workspaceId', (req, res, next) => {
  try {
    const schema = z.object({
      name: z.string().min(1).max(50),
      color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    });
    const { name, color } = schema.parse(req.body);

    const access = db.prepare('SELECT 1 FROM workspace_members WHERE workspace_id = ? AND user_id = ?')
      .get(req.params.workspaceId, req.user.id);
    if (!access) {
      throw new AppError('Access denied', 403);
    }

    const tagId = uuidv4();
    db.prepare(`
      INSERT INTO tags (id, workspace_id, name, color, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(tagId, req.params.workspaceId, name, color, Date.now());

    const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(tagId);
    res.status(201).json({ tag });
  } catch (err) {
    next(err);
  }
});

// Update tag
router.patch('/:workspaceId/:tagId', (req, res, next) => {
  try {
    const schema = z.object({
      name: z.string().min(1).max(50).optional(),
      color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    });
    const data = schema.parse(req.body);

    const access = db.prepare('SELECT 1 FROM workspace_members WHERE workspace_id = ? AND user_id = ?')
      .get(req.params.workspaceId, req.user.id);
    if (!access) {
      throw new AppError('Access denied', 403);
    }

    const tag = db.prepare('SELECT * FROM tags WHERE id = ? AND workspace_id = ?')
      .get(req.params.tagId, req.params.workspaceId);
    if (!tag) {
      throw new AppError('Tag not found', 404);
    }

    const updates = [];
    const params = [];
    if (data.name !== undefined) { updates.push('name = ?'); params.push(data.name); }
    if (data.color !== undefined) { updates.push('color = ?'); params.push(data.color); }

    if (updates.length > 0) {
      params.push(req.params.tagId);
      db.prepare(`UPDATE tags SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }

    const updatedTag = db.prepare('SELECT * FROM tags WHERE id = ?').get(req.params.tagId);
    res.json({ tag: updatedTag });
  } catch (err) {
    next(err);
  }
});

// Delete tag
router.delete('/:workspaceId/:tagId', (req, res, next) => {
  try {
    const access = db.prepare('SELECT 1 FROM workspace_members WHERE workspace_id = ? AND user_id = ?')
      .get(req.params.workspaceId, req.user.id);
    if (!access) {
      throw new AppError('Access denied', 403);
    }

    db.prepare('DELETE FROM tags WHERE id = ? AND workspace_id = ?')
      .run(req.params.tagId, req.params.workspaceId);

    res.json({ message: 'Tag deleted' });
  } catch (err) {
    next(err);
  }
});

// Add tag to page
router.post('/pages/:pageId', (req, res, next) => {
  try {
    const schema = z.object({
      tagId: z.string().uuid(),
    });
    const { tagId } = schema.parse(req.body);

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

    // Verify tag belongs to same workspace
    const tag = db.prepare('SELECT * FROM tags WHERE id = ? AND workspace_id = ?')
      .get(tagId, page.workspace_id);
    if (!tag) {
      throw new AppError('Tag not found', 404);
    }

    db.prepare('INSERT OR IGNORE INTO page_tags (page_id, tag_id) VALUES (?, ?)')
      .run(req.params.pageId, tagId);

    res.json({ message: 'Tag added' });
  } catch (err) {
    next(err);
  }
});

// Remove tag from page
router.delete('/pages/:pageId/:tagId', (req, res, next) => {
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

    db.prepare('DELETE FROM page_tags WHERE page_id = ? AND tag_id = ?')
      .run(req.params.pageId, req.params.tagId);

    res.json({ message: 'Tag removed' });
  } catch (err) {
    next(err);
  }
});

export default router;