import express from 'express';
import { z } from 'zod';
import Database from 'better-sqlite3';
import { join } from 'path';
import { AppError } from '../middleware/errorHandler.js';

const router = express.Router();
const DATA_DIR = join(process.cwd(), 'data');
const dbPath = join(DATA_DIR, 'notion-clone.db');
const db = new Database(dbPath);

// Global search
router.get('/', (req, res, next) => {
  try {
    const schema = z.object({
      q: z.string().min(1),
      workspaceId: z.string().uuid().optional(),
      limit: z.coerce.number().int().min(1).max(50).default(20),
      offset: z.coerce.number().int().min(0).default(0),
    });
    const { q, workspaceId, limit, offset } = schema.parse(req.query);

    // Verify workspace access if provided
    if (workspaceId) {
      const access = db.prepare('SELECT 1 FROM workspace_members WHERE workspace_id = ? AND user_id = ?')
        .get(workspaceId, req.user.id);
      if (!access) {
        throw new AppError('Access denied', 403);
      }
    }

    let query = `
      SELECT si.page_id, si.title, si.content,
             p.workspace_id, p.parent_id, p.icon, p.icon_color, p.updated_at,
             bm25(si) as rank
      FROM search_index si
      JOIN pages p ON si.page_id = p.id
      JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE si MATCH ? AND wm.user_id = ? AND p.is_deleted = 0
    `;
    const params = [q, req.user.id];

    if (workspaceId) {
      query += ' AND p.workspace_id = ?';
      params.push(workspaceId);
    }

    query += ' ORDER BY rank LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const results = db.prepare(query).all(...params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total
      FROM search_index si
      JOIN pages p ON si.page_id = p.id
      JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE si MATCH ? AND wm.user_id = ? AND p.is_deleted = 0
    `;
    const countParams = [q, req.user.id];

    if (workspaceId) {
      countQuery += ' AND p.workspace_id = ?';
      countParams.push(workspaceId);
    }

    const total = db.prepare(countQuery).get(...countParams).total;

    res.json({
      results: results.map(r => ({
        pageId: r.page_id,
        title: r.title,
        snippet: r.content.substring(0, 200),
        workspaceId: r.workspace_id,
        parentId: r.parent_id,
        icon: r.icon,
        iconColor: r.icon_color,
        updatedAt: r.updated_at,
      })),
      total,
      limit,
      offset,
    });
  } catch (err) {
    next(err);
  }
});

// Quick search (for autocomplete/suggestions)
router.get('/quick', (req, res, next) => {
  try {
    const schema = z.object({
      q: z.string().min(1),
      workspaceId: z.string().uuid().optional(),
      limit: z.coerce.number().int().min(1).max(10).default(5),
    });
    const { q, workspaceId, limit } = schema.parse(req.query);

    if (workspaceId) {
      const access = db.prepare('SELECT 1 FROM workspace_members WHERE workspace_id = ? AND user_id = ?')
        .get(workspaceId, req.user.id);
      if (!access) {
        throw new AppError('Access denied', 403);
      }
    }

    let query = `
      SELECT p.id, p.title, p.icon, p.icon_color, p.workspace_id
      FROM pages p
      JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE (p.title LIKE ? OR p.content LIKE ?)
        AND wm.user_id = ? AND p.is_deleted = 0
    `;
    const params = [`%${q}%`, `%${q}%`, req.user.id];

    if (workspaceId) {
      query += ' AND p.workspace_id = ?';
      params.push(workspaceId);
    }

    query += ' ORDER BY p.updated_at DESC LIMIT ?';
    params.push(limit);

    const results = db.prepare(query).all(...params);

    res.json({ results });
  } catch (err) {
    next(err);
  }
});

// Recent pages
router.get('/recent', (req, res, next) => {
  try {
    const schema = z.object({
      workspaceId: z.string().uuid().optional(),
      limit: z.coerce.number().int().min(1).max(20).default(10),
    });
    const { workspaceId, limit } = schema.parse(req.query);

    if (workspaceId) {
      const access = db.prepare('SELECT 1 FROM workspace_members WHERE workspace_id = ? AND user_id = ?')
        .get(workspaceId, req.user.id);
      if (!access) {
        throw new AppError('Access denied', 403);
      }
    }

    let query = `
      SELECT p.id, p.title, p.icon, p.icon_color, p.workspace_id, p.parent_id, p.updated_at
      FROM pages p
      JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE wm.user_id = ? AND p.is_deleted = 0
    `;
    const params = [req.user.id];

    if (workspaceId) {
      query += ' AND p.workspace_id = ?';
      params.push(workspaceId);
    }

    query += ' ORDER BY p.updated_at DESC LIMIT ?';
    params.push(limit);

    const results = db.prepare(query).all(...params);

    res.json({ results });
  } catch (err) {
    next(err);
  }
});

export default router;