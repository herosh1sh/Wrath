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

// Helper: Check workspace access
function checkWorkspaceAccess(workspaceId, userId) {
  return db.prepare('SELECT 1 FROM workspace_members WHERE workspace_id = ? AND user_id = ?')
    .get(workspaceId, userId);
}

// Get page tree for workspace
router.get('/tree/:workspaceId', (req, res, next) => {
  try {
    if (!checkWorkspaceAccess(req.params.workspaceId, req.user.id)) {
      throw new AppError('Access denied', 403);
    }

    const pages = db.prepare(`
      SELECT id, workspace_id, parent_id, title, icon, icon_color, is_deleted, updated_at
      FROM pages
      WHERE workspace_id = ? AND is_deleted = 0
      ORDER BY updated_at DESC
    `).all(req.params.workspaceId);

    // Build tree
    const pageMap = new Map();
    const roots = [];

    pages.forEach(page => {
      pageMap.set(page.id, { ...page, children: [] });
    });

    pages.forEach(page => {
      const node = pageMap.get(page.id);
      if (page.parent_id) {
        const parent = pageMap.get(page.parent_id);
        if (parent) parent.children.push(node);
        else roots.push(node);
      } else {
        roots.push(node);
      }
    });

    res.json({ tree: roots });
  } catch (err) {
    next(err);
  }
});

// Get single page with full content
router.get('/:id', (req, res, next) => {
  try {
    const page = db.prepare(`
      SELECT p.*, wm.role as workspace_role
      FROM pages p
      JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE p.id = ? AND wm.user_id = ? AND p.is_deleted = 0
    `).get(req.params.id, req.user.id);

    if (!page) {
      throw new AppError('Page not found', 404);
    }

    // Parse JSON fields
    page.content = page.content ? JSON.parse(page.content) : [];
    page.properties = page.properties ? JSON.parse(page.properties) : {};

    // Get tags
    const tags = db.prepare(`
      SELECT t.* FROM tags t
      JOIN page_tags pt ON t.id = pt.tag_id
      WHERE pt.page_id = ?
    `).all(page.id);

    // Get favorites
    const isFavorite = db.prepare('SELECT 1 FROM favorites WHERE user_id = ? AND page_id = ?')
      .get(req.user.id, page.id);

    res.json({ page: { ...page, tags, isFavorite: !!isFavorite } });
  } catch (err) {
    next(err);
  }
});

// Create page
router.post('/', (req, res, next) => {
  try {
    const schema = z.object({
      workspaceId: z.string().uuid(),
      parentId: z.string().uuid().optional().nullable(),
      title: z.string().max(200).default('Untitled'),
      icon: z.string().max(10).optional(),
      iconColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      content: z.array(z.any()).optional(),
      properties: z.record(z.any()).optional(),
    });
    const data = schema.parse(req.body);

    if (!checkWorkspaceAccess(data.workspaceId, req.user.id)) {
      throw new AppError('Access denied', 403);
    }

    const pageId = uuidv4();
    const now = Date.now();

    db.prepare(`
      INSERT INTO pages (id, workspace_id, parent_id, title, icon, icon_color, content, properties, created_by, last_edited_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      pageId,
      data.workspaceId,
      data.parentId || null,
      data.title,
      data.icon || null,
      data.iconColor || null,
      JSON.stringify(data.content || []),
      JSON.stringify(data.properties || {}),
      req.user.id,
      req.user.id,
      now,
      now
    );

    const page = db.prepare('SELECT * FROM pages WHERE id = ?').get(pageId);
    page.content = JSON.parse(page.content);
    page.properties = JSON.parse(page.properties);

    // Emit real-time event
    const io = req.app.get('io');
    io?.to(`workspace:${data.workspaceId}`).emit('page:created', page);

    res.status(201).json({ page });
  } catch (err) {
    next(err);
  }
});

// Update page
router.patch('/:id', (req, res, next) => {
  try {
    const schema = z.object({
      title: z.string().max(200).optional(),
      icon: z.string().max(10).optional().nullable(),
      iconColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
      coverUrl: z.string().url().optional().nullable(),
      coverPosition: z.number().min(0).max(1).optional(),
      content: z.array(z.any()).optional(),
      properties: z.record(z.any()).optional(),
      parentId: z.string().uuid().optional().nullable(),
    });
    const data = schema.parse(req.body);

    const page = db.prepare(`
      SELECT p.*, wm.role as workspace_role
      FROM pages p
      JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE p.id = ? AND wm.user_id = ? AND p.is_deleted = 0
    `).get(req.params.id, req.user.id);

    if (!page) {
      throw new AppError('Page not found', 404);
    }

    // Check for circular reference if changing parent
    if (data.parentId !== undefined && data.parentId !== page.parent_id) {
      if (data.parentId === page.id) {
        throw new AppError('Cannot set page as its own parent', 400);
      }
      // Check if new parent is a descendant
      let current = data.parentId;
      while (current) {
        const parent = db.prepare('SELECT parent_id FROM pages WHERE id = ?').get(current);
        if (!parent) break;
        if (parent.parent_id === page.id) {
          throw new AppError('Cannot move page under its own descendant', 400);
        }
        current = parent.parent_id;
      }
    }

    const updates = [];
    const params = [];
    const now = Date.now();

    if (data.title !== undefined) { updates.push('title = ?'); params.push(data.title); }
    if (data.icon !== undefined) { updates.push('icon = ?'); params.push(data.icon); }
    if (data.iconColor !== undefined) { updates.push('icon_color = ?'); params.push(data.iconColor); }
    if (data.coverUrl !== undefined) { updates.push('cover_url = ?'); params.push(data.coverUrl); }
    if (data.coverPosition !== undefined) { updates.push('cover_position = ?'); params.push(data.coverPosition); }
    if (data.content !== undefined) { updates.push('content = ?'); params.push(JSON.stringify(data.content)); }
    if (data.properties !== undefined) { updates.push('properties = ?'); params.push(JSON.stringify(data.properties)); }
    if (data.parentId !== undefined) { updates.push('parent_id = ?'); params.push(data.parentId); }

    updates.push('last_edited_by = ?', 'updated_at = ?');
    params.push(req.user.id, now);
    params.push(req.params.id);

    if (updates.length > 2) {
      db.prepare(`UPDATE pages SET ${updates.join(', ')} WHERE id = ?`).run(...params);

      // Create version snapshot for content changes
      if (data.content !== undefined) {
        const versionNumber = db.prepare('SELECT COALESCE(MAX(version_number), 0) + 1 FROM page_versions WHERE page_id = ?')
          .get(req.params.id)['COALESCE(MAX(version_number), 0) + 1'];

        db.prepare(`
          INSERT INTO page_versions (id, page_id, content, version_number, created_by, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(uuidv4(), req.params.id, JSON.stringify(data.content), versionNumber, req.user.id, now);
      }
    }

    const updatedPage = db.prepare('SELECT * FROM pages WHERE id = ?').get(req.params.id);
    updatedPage.content = JSON.parse(updatedPage.content);
    updatedPage.properties = JSON.parse(updatedPage.properties);

    const io = req.app.get('io');
    io?.to(`page:${req.params.id}`).emit('page:updated', updatedPage);
    io?.to(`workspace:${page.workspace_id}`).emit('page:updated', updatedPage);

    res.json({ page: updatedPage });
  } catch (err) {
    next(err);
  }
});

// Delete page (soft delete)
router.delete('/:id', (req, res, next) => {
  try {
    const page = db.prepare(`
      SELECT p.*, wm.role as workspace_role
      FROM pages p
      JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE p.id = ? AND wm.user_id = ? AND p.is_deleted = 0
    `).get(req.params.id, req.user.id);

    if (!page) {
      throw new AppError('Page not found', 404);
    }

    const now = Date.now();
    db.prepare('UPDATE pages SET is_deleted = 1, deleted_at = ?, updated_at = ? WHERE id = ?')
      .run(now, now, req.params.id);

    // Also soft delete children
    const deleteChildren = (parentId) => {
      const children = db.prepare('SELECT id FROM pages WHERE parent_id = ? AND is_deleted = 0').all(parentId);
      children.forEach(child => {
        db.prepare('UPDATE pages SET is_deleted = 1, deleted_at = ?, updated_at = ? WHERE id = ?')
          .run(now, now, child.id);
        deleteChildren(child.id);
      });
    };
    deleteChildren(req.params.id);

    const io = req.app.get('io');
    io?.to(`workspace:${page.workspace_id}`).emit('page:deleted', { id: req.params.id });

    res.json({ message: 'Page moved to trash' });
  } catch (err) {
    next(err);
  }
});

// Get trash pages for workspace
router.get('/trash/:workspaceId', (req, res, next) => {
  try {
    if (!checkWorkspaceAccess(req.params.workspaceId, req.user.id)) {
      throw new AppError('Access denied', 403);
    }

    const pages = db.prepare(`
      SELECT id, workspace_id, parent_id, title, icon, icon_color, is_deleted, deleted_at, updated_at
      FROM pages
      WHERE workspace_id = ? AND is_deleted = 1
      ORDER BY deleted_at DESC
    `).all(req.params.workspaceId);

    res.json({ pages });
  } catch (err) {
    next(err);
  }
});

// Restore page from trash
router.post('/:id/restore', (req, res, next) => {
  try {
    const page = db.prepare(`
      SELECT p.*, wm.role as workspace_role
      FROM pages p
      JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE p.id = ? AND wm.user_id = ? AND p.is_deleted = 1
    `).get(req.params.id, req.user.id);

    if (!page) {
      throw new AppError('Page not found in trash', 404);
    }

    db.prepare('UPDATE pages SET is_deleted = 0, deleted_at = NULL, updated_at = ? WHERE id = ?')
      .run(Date.now(), req.params.id);

    const restoredPage = db.prepare('SELECT * FROM pages WHERE id = ?').get(req.params.id);
    restoredPage.content = JSON.parse(restoredPage.content);
    restoredPage.properties = JSON.parse(restoredPage.properties);

    const io = req.app.get('io');
    io?.to(`workspace:${page.workspace_id}`).emit('page:restored', restoredPage);

    res.json({ page: restoredPage });
  } catch (err) {
    next(err);
  }
});

// Get page history
router.get('/:id/history', (req, res, next) => {
  try {
    const page = db.prepare(`
      SELECT p.workspace_id
      FROM pages p
      JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE p.id = ? AND wm.user_id = ?
    `).get(req.params.id, req.user.id);

    if (!page) {
      throw new AppError('Page not found', 404);
    }

    const versions = db.prepare(`
      SELECT pv.*, u.name as author_name
      FROM page_versions pv
      JOIN users u ON pv.created_by = u.id
      WHERE pv.page_id = ?
      ORDER BY pv.version_number DESC
      LIMIT 50
    `).all(req.params.id);

    res.json({ versions });
  } catch (err) {
    next(err);
  }
});

// Restore version
router.post('/:id/history/:versionId/restore', (req, res, next) => {
  try {
    const page = db.prepare(`
      SELECT p.*, wm.role as workspace_role
      FROM pages p
      JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE p.id = ? AND wm.user_id = ? AND p.is_deleted = 0
    `).get(req.params.id, req.user.id);

    if (!page) {
      throw new AppError('Page not found', 404);
    }

    const version = db.prepare('SELECT content FROM page_versions WHERE id = ? AND page_id = ?')
      .get(req.params.versionId, req.params.id);

    if (!version) {
      throw new AppError('Version not found', 404);
    }

    const now = Date.now();
    db.prepare('UPDATE pages SET content = ?, last_edited_by = ?, updated_at = ? WHERE id = ?')
      .run(version.content, req.user.id, now, req.params.id);

    const updatedPage = db.prepare('SELECT * FROM pages WHERE id = ?').get(req.params.id);
    updatedPage.content = JSON.parse(updatedPage.content);
    updatedPage.properties = JSON.parse(updatedPage.properties);

    // Create new version
    const versionNumber = db.prepare('SELECT COALESCE(MAX(version_number), 0) + 1 FROM page_versions WHERE page_id = ?')
      .get(req.params.id)['COALESCE(MAX(version_number), 0) + 1'];

    db.prepare(`
      INSERT INTO page_versions (id, page_id, content, version_number, created_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), req.params.id, version.content, versionNumber, req.user.id, now);

    const io = req.app.get('io');
    io?.to(`page:${req.params.id}`).emit('page:updated', updatedPage);

    res.json({ page: updatedPage });
  } catch (err) {
    next(err);
  }
});

// Duplicate page
router.post('/:id/duplicate', (req, res, next) => {
  try {
    const page = db.prepare(`
      SELECT p.*, wm.role as workspace_role
      FROM pages p
      JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE p.id = ? AND wm.user_id = ? AND p.is_deleted = 0
    `).get(req.params.id, req.user.id);

    if (!page) {
      throw new AppError('Page not found', 404);
    }

    const newPageId = uuidv4();
    const now = Date.now();

    db.prepare(`
      INSERT INTO pages (id, workspace_id, parent_id, title, icon, icon_color, cover_url, cover_position, content, properties, created_by, last_edited_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      newPageId,
      page.workspace_id,
      page.parent_id,
      `${page.title} (Copy)`,
      page.icon,
      page.icon_color,
      page.cover_url,
      page.cover_position,
      page.content,
      page.properties,
      req.user.id,
      req.user.id,
      now,
      now
    );

    // Duplicate tags
    const pageTags = db.prepare('SELECT tag_id FROM page_tags WHERE page_id = ?').all(page.id);
    pageTags.forEach(pt => {
      db.prepare('INSERT OR IGNORE INTO page_tags (page_id, tag_id) VALUES (?, ?)').run(newPageId, pt.tag_id);
    });

    const newPage = db.prepare('SELECT * FROM pages WHERE id = ?').get(newPageId);
    newPage.content = JSON.parse(newPage.content);
    newPage.properties = JSON.parse(newPage.properties);

    const io = req.app.get('io');
    io?.to(`workspace:${page.workspace_id}`).emit('page:created', newPage);

    res.status(201).json({ page: newPage });
  } catch (err) {
    next(err);
  }
});

// Move page (change parent)
router.post('/:id/move', (req, res, next) => {
  try {
    const schema = z.object({
      parentId: z.string().uuid().optional().nullable(),
    });
    const { parentId } = schema.parse(req.body);

    const page = db.prepare(`
      SELECT p.*, wm.role as workspace_role
      FROM pages p
      JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE p.id = ? AND wm.user_id = ? AND p.is_deleted = 0
    `).get(req.params.id, req.user.id);

    if (!page) {
      throw new AppError('Page not found', 404);
    }

    if (parentId === page.id) {
      throw new AppError('Cannot set page as its own parent', 400);
    }

    // Check for circular reference
    if (parentId) {
      let current = parentId;
      while (current) {
        const parent = db.prepare('SELECT parent_id FROM pages WHERE id = ?').get(current);
        if (!parent) break;
        if (parent.parent_id === page.id) {
          throw new AppError('Cannot move page under its own descendant', 400);
        }
        current = parent.parent_id;
      }
    }

    db.prepare('UPDATE pages SET parent_id = ?, updated_at = ? WHERE id = ?')
      .run(parentId, Date.now(), req.params.id);

    const updatedPage = db.prepare('SELECT * FROM pages WHERE id = ?').get(req.params.id);
    updatedPage.content = JSON.parse(updatedPage.content);
    updatedPage.properties = JSON.parse(updatedPage.properties);

    const io = req.app.get('io');
    io?.to(`workspace:${page.workspace_id}`).emit('page:moved', updatedPage);

    res.json({ page: updatedPage });
  } catch (err) {
    next(err);
  }
});

export default router;