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

// Get blocks for a page (flat list, ordered by position)
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

    const blocks = db.prepare(`
      SELECT * FROM blocks
      WHERE page_id = ?
      ORDER BY position
    `).all(req.params.pageId);

    // Parse content JSON
    blocks.forEach(b => { b.content = b.content ? JSON.parse(b.content) : {}; });

    res.json({ blocks });
  } catch (err) {
    next(err);
  }
});

// Create block
router.post('/', (req, res, next) => {
  try {
    const schema = z.object({
      pageId: z.string().uuid(),
      parentBlockId: z.string().uuid().optional().nullable(),
      type: z.string(),
      content: z.any().optional(),
      position: z.number().int().optional(),
    });
    const data = schema.parse(req.body);

    // Verify page access
    const page = db.prepare(`
      SELECT p.workspace_id
      FROM pages p
      JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE p.id = ? AND wm.user_id = ? AND p.is_deleted = 0
    `).get(data.pageId, req.user.id);

    if (!page) {
      throw new AppError('Page not found', 403);
    }

    // Get max position if not provided
    let position = data.position;
    if (position === undefined) {
      const maxPos = db.prepare('SELECT COALESCE(MAX(position), -1) as max FROM blocks WHERE page_id = ? AND parent_block_id IS ?')
        .get(data.pageId, data.parentBlockId || null);
      position = maxPos.max + 1;
    } else {
      // Shift existing blocks
      db.prepare(`
        UPDATE blocks SET position = position + 1
        WHERE page_id = ? AND parent_block_id IS ? AND position >= ?
      `).run(data.pageId, data.parentBlockId || null, position);
    }

    const blockId = uuidv4();
    const now = Date.now();

    db.prepare(`
      INSERT INTO blocks (id, page_id, parent_block_id, type, content, position, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(blockId, data.pageId, data.parentBlockId || null, data.type, JSON.stringify(data.content || {}), position, req.user.id, now, now);

    const block = db.prepare('SELECT * FROM blocks WHERE id = ?').get(blockId);
    block.content = JSON.parse(block.content);

    const io = req.app.get('io');
    io?.to(`page:${data.pageId}`).emit('block:created', block);

    res.status(201).json({ block });
  } catch (err) {
    next(err);
  }
});

// Update block
router.patch('/:id', (req, res, next) => {
  try {
    const schema = z.object({
      type: z.string().optional(),
      content: z.any().optional(),
      position: z.number().int().optional(),
      parentBlockId: z.string().uuid().optional().nullable(),
    });
    const data = schema.parse(req.body);

    const block = db.prepare(`
      SELECT b.*, p.workspace_id
      FROM blocks b
      JOIN pages p ON b.page_id = p.id
      JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE b.id = ? AND wm.user_id = ?
    `).get(req.params.id, req.user.id);

    if (!block) {
      throw new AppError('Block not found', 404);
    }

    const updates = [];
    const params = [];

    if (data.type !== undefined) { updates.push('type = ?'); params.push(data.type); }
    if (data.content !== undefined) { updates.push('content = ?'); params.push(JSON.stringify(data.content)); }
    if (data.position !== undefined) {
      // Handle reordering
      if (data.position !== block.position) {
        if (data.position > block.position) {
          db.prepare(`
            UPDATE blocks SET position = position - 1
            WHERE page_id = ? AND parent_block_id IS ? AND position > ? AND position <= ?
          `).run(block.page_id, block.parent_block_id, block.position, data.position);
        } else {
          db.prepare(`
            UPDATE blocks SET position = position + 1
            WHERE page_id = ? AND parent_block_id IS ? AND position >= ? AND position < ?
          `).run(block.page_id, block.parent_block_id, data.position, block.position);
        }
      }
      updates.push('position = ?');
      params.push(data.position);
    }
    if (data.parentBlockId !== undefined) {
      updates.push('parent_block_id = ?');
      params.push(data.parentBlockId);
    }

    if (updates.length > 0) {
      updates.push('updated_at = ?');
      params.push(Date.now());
      params.push(req.params.id);
      db.prepare(`UPDATE blocks SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }

    const updatedBlock = db.prepare('SELECT * FROM blocks WHERE id = ?').get(req.params.id);
    updatedBlock.content = JSON.parse(updatedBlock.content);

    const io = req.app.get('io');
    io?.to(`page:${block.page_id}`).emit('block:updated', updatedBlock);

    res.json({ block: updatedBlock });
  } catch (err) {
    next(err);
  }
});

// Delete block
router.delete('/:id', (req, res, next) => {
  try {
    const block = db.prepare(`
      SELECT b.*, p.workspace_id
      FROM blocks b
      JOIN pages p ON b.page_id = p.id
      JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE b.id = ? AND wm.user_id = ?
    `).get(req.params.id, req.user.id);

    if (!block) {
      throw new AppError('Block not found', 404);
    }

    // Delete children first (recursive)
    const deleteChildren = (parentId) => {
      const children = db.prepare('SELECT id FROM blocks WHERE parent_block_id = ?').all(parentId);
      children.forEach(child => {
        deleteChildren(child.id);
        db.prepare('DELETE FROM blocks WHERE id = ?').run(child.id);
      });
    };
    deleteChildren(req.params.id);

    db.prepare('DELETE FROM blocks WHERE id = ?').run(req.params.id);

    // Reorder remaining blocks
    db.prepare(`
      UPDATE blocks SET position = position - 1
      WHERE page_id = ? AND parent_block_id IS ? AND position > ?
    `).run(block.page_id, block.parent_block_id, block.position);

    const io = req.app.get('io');
    io?.to(`page:${block.page_id}`).emit('block:deleted', { id: req.params.id });

    res.json({ message: 'Block deleted' });
  } catch (err) {
    next(err);
  }
});

// Bulk update block positions (for drag & drop)
router.post('/reorder', (req, res, next) => {
  try {
    const schema = z.object({
      pageId: z.string().uuid(),
      blocks: z.array(z.object({
        id: z.string().uuid(),
        position: z.number().int(),
        parentBlockId: z.string().uuid().nullable().optional(),
      })),
    });
    const { pageId, blocks } = schema.parse(req.body);

    // Verify page access
    const page = db.prepare(`
      SELECT p.workspace_id
      FROM pages p
      JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE p.id = ? AND wm.user_id = ? AND p.is_deleted = 0
    `).get(pageId, req.user.id);

    if (!page) {
      throw new AppError('Page not found', 403);
    }

    const stmt = db.prepare('UPDATE blocks SET position = ?, parent_block_id = ?, updated_at = ? WHERE id = ?');
    const now = Date.now();

    const transaction = db.transaction((blocks) => {
      blocks.forEach(b => {
        stmt.run(b.position, b.parentBlockId || null, now, b.id);
      });
    });

    transaction(blocks);

    const updatedBlocks = db.prepare('SELECT * FROM blocks WHERE page_id = ? ORDER BY position').all(pageId);
    updatedBlocks.forEach(b => { b.content = JSON.parse(b.content); });

    const io = req.app.get('io');
    io?.to(`page:${pageId}`).emit('blocks:reordered', updatedBlocks);

    res.json({ blocks: updatedBlocks });
  } catch (err) {
    next(err);
  }
});

export default router;