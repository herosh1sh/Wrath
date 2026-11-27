import express from 'express';
import Database from 'better-sqlite3';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../middleware/errorHandler.js';

const router = express.Router();
const DATA_DIR = join(process.cwd(), 'data');
const dbPath = join(DATA_DIR, 'notion-clone.db');
const db = new Database(dbPath);

// Get user's favorites
router.get('/', (req, res, next) => {
  try {
    const favorites = db.prepare(`
      SELECT f.*, p.title, p.icon, p.icon_color, p.workspace_id, p.parent_id, p.updated_at
      FROM favorites f
      JOIN pages p ON f.page_id = p.id
      JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE f.user_id = ? AND wm.user_id = ? AND p.is_deleted = 0
      ORDER BY f.created_at DESC
    `).all(req.user.id, req.user.id);

    res.json({ favorites });
  } catch (err) {
    next(err);
  }
});

// Add to favorites
router.post('/', (req, res, next) => {
  try {
    const { pageId } = req.body;
    if (!pageId) {
      throw new AppError('pageId is required', 400);
    }

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

    const existing = db.prepare('SELECT id FROM favorites WHERE user_id = ? AND page_id = ?')
      .get(req.user.id, pageId);

    if (existing) {
      return res.json({ favorite: existing, alreadyExists: true });
    }

    const favoriteId = uuidv4();
    db.prepare(`
      INSERT INTO favorites (id, user_id, page_id, created_at)
      VALUES (?, ?, ?, ?)
    `).run(favoriteId, req.user.id, pageId, Date.now());

    const favorite = db.prepare('SELECT * FROM favorites WHERE id = ?').get(favoriteId);
    res.status(201).json({ favorite });
  } catch (err) {
    next(err);
  }
});

// Remove from favorites
router.delete('/:pageId', (req, res, next) => {
  try {
    const pageId = req.params.pageId;

    db.prepare('DELETE FROM favorites WHERE user_id = ? AND page_id = ?')
      .run(req.user.id, pageId);

    res.json({ message: 'Removed from favorites' });
  } catch (err) {
    next(err);
  }
});

// Check if page is favorited
router.get('/check/:pageId', (req, res, next) => {
  try {
    const favorite = db.prepare('SELECT id FROM favorites WHERE user_id = ? AND page_id = ?')
      .get(req.user.id, req.params.pageId);

    res.json({ isFavorite: !!favorite });
  } catch (err) {
    next(err);
  }
});

export default router;