import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { getDatabase } from '../db/init.js';
import { asyncHandler, NotFoundError, ForbiddenError, ValidationError } from '../middleware/errorHandler.js';

const router = express.Router();

const createBlockSchema = z.object({
  pageId: z.string().uuid(),
  parentId: z.string().uuid().optional(),
  type: z.string().min(1),
  content: z.any(),
  position: z.number().int().optional()
});

const updateBlockSchema = z.object({
  type: z.string().optional(),
  content: z.any().optional(),
  position: z.number().int().optional(),
  parentId: z.string().uuid().optional().nullable()
});

const reorderBlocksSchema = z.object({
  blockIds: z.array(z.string().uuid())
});

// Get blocks for a page
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

  const blocks = db.prepare(`
    SELECT b.*, u.username as created_by_username, u.display_name as created_by_display_name
    FROM blocks b
    LEFT JOIN users u ON b.created_by = u.id
    WHERE b.page_id = ?
    ORDER BY b.position, b.created_at
  `).all(req.params.pageId);

  res.json({ blocks });
});

// Create block
router.post('/', asyncHandler(async (req, res) => {
  const data = createBlockSchema.parse(req.body);
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

  // Determine position
  let position = data.position;
  if (position === undefined) {
    const maxPos = db.prepare('SELECT MAX(position) as max FROM blocks WHERE page_id = ? AND parent_id IS ?')
      .get(data.pageId, data.parentId || null);
    position = (maxPos.max || -1) + 1;
  }

  const blockId = uuidv4();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO blocks (id, page_id, parent_id, type, content, position, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(blockId, data.pageId, data.parentId || null, data.type, JSON.stringify(data.content), position, req.user.id, now, now);

  // Update page updated_at
  db.prepare('UPDATE pages SET updated_at = ?, last_edited_by = ?, last_edited_at = ? WHERE id = ?')
    .run(now, req.user.id, now, data.pageId);

  const block = db.prepare(`
    SELECT b.*, u.username as created_by_username, u.display_name as created_by_display_name
    FROM blocks b
    LEFT JOIN users u ON b.created_by = u.id
    WHERE b.id = ?
  `).get(blockId);

  res.status(201).json({ block });
}));

// Update block
router.patch('/:blockId', asyncHandler(async (req, res) => {
  const data = updateBlockSchema.parse(req.body);
  const db = getDatabase();

  const block = db.prepare(`
    SELECT b.*, p.workspace_id
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

  const updates = [];
  const params = [];

  if (data.type !== undefined) { updates.push('type = ?'); params.push(data.type); }
  if (data.content !== undefined) { updates.push('content = ?'); params.push(JSON.stringify(data.content)); }
  if (data.position !== undefined) { updates.push('position = ?'); params.push(data.position); }
  if (data.parentId !== undefined) { updates.push('parent_id = ?'); params.push(data.parentId || null); }

  if (updates.length > 0) {
    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(block.id);

    db.prepare(`UPDATE blocks SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    // Update page updated_at
    db.prepare('UPDATE pages SET updated_at = ?, last_edited_by = ?, last_edited_at = ? WHERE id = ?')
      .run(new Date().toISOString(), req.user.id, new Date().toISOString(), block.page_id);
  }

  const updatedBlock = db.prepare(`
    SELECT b.*, u.username as created_by_username, u.display_name as created_by_display_name
    FROM blocks b
    LEFT JOIN users u ON b.created_by = u.id
    WHERE b.id = ?
  `).get(block.id);

  res.json({ block: updatedBlock });
}));

// Delete block
router.delete('/:blockId', asyncHandler(async (req, res) => {
  const db = getDatabase();

  const block = db.prepare(`
    SELECT b.*, p.workspace_id
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

  // Delete block and all children recursively
  function deleteBlockAndChildren(blockId) {
    const children = db.prepare('SELECT id FROM blocks WHERE parent_id = ?').all(blockId);
    for (const child of children) {
      deleteBlockAndChildren(child.id);
    }
    db.prepare('DELETE FROM blocks WHERE id = ?').run(blockId);
  }

  deleteBlockAndChildren(block.id);

  // Update page updated_at
  db.prepare('UPDATE pages SET updated_at = ?, last_edited_by = ?, last_edited_at = ? WHERE id = ?')
    .run(new Date().toISOString(), req.user.id, new Date().toISOString(), block.page_id);

  res.json({ message: 'Block deleted' });
}));

// Reorder blocks
router.post('/reorder', asyncHandler(async (req, res) => {
  const data = reorderBlocksSchema.parse(req.body);
  const db = getDatabase();

  if (data.blockIds.length > 0) {
    const firstBlock = db.prepare(`
      SELECT p.workspace_id
      FROM blocks b
      JOIN pages p ON b.page_id = p.id
      WHERE b.id = ?
    `).get(data.blockIds[0]);

    if (!firstBlock) {
      throw new NotFoundError('Block not found');
    }

    const membership = db.prepare('SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?')
      .get(firstBlock.workspace_id, req.user.id);

    if (!membership) {
      throw new ForbiddenError('Not a member of this workspace');
    }
  }

  const stmt = db.prepare('UPDATE blocks SET position = ?, updated_at = ? WHERE id = ?');
  const now = new Date().toISOString();

  for (let i = 0; i < data.blockIds.length; i++) {
    stmt.run(i, now, data.blockIds[i]);
  }

  res.json({ message: 'Blocks reordered' });
}));

// Duplicate block
router.post('/:blockId/duplicate', asyncHandler(async (req, res) => {
  const db = getDatabase();

  const block = db.prepare(`
    SELECT b.*, p.workspace_id
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

  const newBlockId = uuidv4();
  const now = new Date().toISOString();

  // Get position after original
  const maxPos = db.prepare('SELECT MAX(position) as max FROM blocks WHERE page_id = ? AND parent_id IS ?')
    .get(block.page_id, block.parent_id);
  const position = (maxPos.max || -1) + 1;

  db.prepare(`
    INSERT INTO blocks (id, page_id, parent_id, type, content, position, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(newBlockId, block.page_id, block.parent_id, block.type, block.content, position, req.user.id, now, now);

  // If block has children, duplicate them too
  const children = db.prepare('SELECT * FROM blocks WHERE parent_id = ? ORDER BY position').all(block.id);
  for (const child of children) {
    const newChildId = uuidv4();
    db.prepare(`
      INSERT INTO blocks (id, page_id, parent_id, type, content, position, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(newChildId, block.page_id, newBlockId, child.type, child.content, child.position, req.user.id, now, now);
  }

  const newBlock = db.prepare(`
    SELECT b.*, u.username as created_by_username, u.display_name as created_by_display_name
    FROM blocks b
    LEFT JOIN users u ON b.created_by = u.id
    WHERE b.id = ?
  `).get(newBlockId);

  res.status(201).json({ block: newBlock });
}));

export default router;