import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { getDatabase } from '../db/init.js';
import { asyncHandler, NotFoundError, ForbiddenError, ValidationError } from '../middleware/errorHandler.js';

const router = express.Router();

const createPageSchema = z.object({
  workspaceId: z.string().uuid(),
  parentId: z.string().uuid().optional(),
  title: z.string().max(200).default(''),
  icon: z.string().max(10).optional(),
  coverUrl: z.string().url().optional().or(z.literal('')),
  isTemplate: z.boolean().default(false)
});

const updatePageSchema = z.object({
  title: z.string().max(200).optional(),
  icon: z.string().max(10).optional(),
  coverUrl: z.string().url().optional().or(z.literal('')),
  content: z.string().optional(), // JSON string of blocks
  properties: z.string().optional(), // JSON string
  isArchived: z.boolean().optional(),
  isPublished: z.boolean().optional(),
  parentId: z.string().uuid().optional().nullable()
});

const reorderPagesSchema = z.object({
  pageIds: z.array(z.string().uuid())
});

// Get pages for workspace (tree structure)
router.get('/', asyncHandler(async (req, res) => {
  const { workspaceId } = req.query;
  const db = getDatabase();

  if (!workspaceId) {
    throw new ValidationError('workspaceId query parameter required');
  }

  // Verify membership
  const membership = db.prepare('SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?')
    .get(workspaceId, req.user.id);

  if (!membership) {
    throw new ForbiddenError('Not a member of this workspace');
  }

  const pages = db.prepare(`
    SELECT p.*, u.username as created_by_username, u.display_name as created_by_display_name,
           leu.username as last_edited_by_username, leu.display_name as last_edited_by_display_name
    FROM pages p
    LEFT JOIN users u ON p.created_by = u.id
    LEFT JOIN users leu ON p.last_edited_by = leu.id
    WHERE p.workspace_id = ? AND p.is_archived = 0
    ORDER BY p.created_at
  `).all(workspaceId);

  // Build tree
  const pageMap = new Map();
  const roots = [];

  for (const page of pages) {
    page.children = [];
    pageMap.set(page.id, page);
  }

  for (const page of pages) {
    if (page.parent_id && pageMap.has(page.parent_id)) {
      pageMap.get(page.parent_id).children.push(page);
    } else {
      roots.push(page);
    }
  }

  res.json({ pages: roots });
}));

// Get single page with full content
router.get('/:pageId', asyncHandler(async (req, res) => {
  const db = getDatabase();

  const page = db.prepare(`
    SELECT p.*, w.name as workspace_name,
           u.username as created_by_username, u.display_name as created_by_display_name, u.avatar_url as created_by_avatar,
           leu.username as last_edited_by_username, leu.display_name as last_edited_by_display_name
    FROM pages p
    JOIN workspaces w ON p.workspace_id = w.id
    LEFT JOIN users u ON p.created_by = u.id
    LEFT JOIN users leu ON p.last_edited_by = leu.id
    WHERE p.id = ?
  `).get(req.params.pageId);

  if (!page) {
    throw new NotFoundError('Page not found');
  }

  // Check workspace membership
  const membership = db.prepare('SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?')
    .get(page.workspace_id, req.user.id);

  if (!membership) {
    throw new ForbiddenError('Not a member of this workspace');
  }

  // Get tags
  const tags = db.prepare(`
    SELECT t.* FROM tags t
    JOIN page_tags pt ON t.id = pt.tag_id
    WHERE pt.page_id = ?
  `).all(page.id);

  // Check if favorited
  const favorite = db.prepare('SELECT id FROM favorites WHERE user_id = ? AND page_id = ?')
    .get(req.user.id, page.id);

  // Get comments count
  const commentsCount = db.prepare('SELECT COUNT(*) as count FROM comments WHERE page_id = ? AND resolved = 0')
    .get(page.id);

  res.json({
    page: {
      ...page,
      tags,
      isFavorited: !!favorite,
      commentsCount: commentsCount.count
    }
  });
}));

// Create page
router.post('/', asyncHandler(async (req, res) => {
  const data = createPageSchema.parse(req.body);
  const db = getDatabase();

  // Verify workspace membership
  const membership = db.prepare('SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?')
    .get(data.workspaceId, req.user.id);

  if (!membership) {
    throw new ForbiddenError('Not a member of this workspace');
  }

  // If parentId provided, verify it exists and is in same workspace
  if (data.parentId) {
    const parent = db.prepare('SELECT id FROM pages WHERE id = ? AND workspace_id = ?').get(data.parentId, data.workspaceId);
    if (!parent) {
      throw new ValidationError('Parent page not found in this workspace');
    }
  }

  const pageId = uuidv4();
  const now = new Date().toISOString();
  const content = JSON.stringify([]); // Empty blocks array

  db.prepare(`
    INSERT INTO pages (id, workspace_id, parent_id, title, icon, cover_url, content, is_template, created_by, created_at, updated_at, last_edited_by, last_edited_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(pageId, data.workspaceId, data.parentId || null, data.title, data.icon || '📄', data.coverUrl || null, content, data.isTemplate ? 1 : 0, req.user.id, now, now, req.user.id, now);

  // Log activity
  db.prepare(`
    INSERT INTO activities (id, workspace_id, user_id, action, entity_type, entity_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(uuidv4(), data.workspaceId, req.user.id, 'created', 'page', pageId, now);

  const page = db.prepare('SELECT * FROM pages WHERE id = ?').get(pageId);
  res.status(201).json({ page });
}));

// Update page
router.patch('/:pageId', asyncHandler(async (req, res) => {
  const data = updatePageSchema.parse(req.body);
  const db = getDatabase();

  const page = db.prepare('SELECT * FROM pages WHERE id = ?').get(req.params.pageId);
  if (!page) {
    throw new NotFoundError('Page not found');
  }

  // Check workspace membership
  const membership = db.prepare('SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?')
    .get(page.workspace_id, req.user.id);

  if (!membership) {
    throw new ForbiddenError('Not a member of this workspace');
  }

  // If parentId is being changed, verify it's valid
  if (data.parentId !== undefined) {
    if (data.parentId === page.id) {
      throw new ValidationError('Page cannot be its own parent');
    }
    if (data.parentId) {
      const parent = db.prepare('SELECT id FROM pages WHERE id = ? AND workspace_id = ?').get(data.parentId, page.workspace_id);
      if (!parent) {
        throw new ValidationError('Parent page not found in this workspace');
      }
      // Check for circular reference
      let current = data.parentId;
      while (current) {
        if (current === page.id) {
          throw new ValidationError('Circular reference detected');
        }
        const p = db.prepare('SELECT parent_id FROM pages WHERE id = ?').get(current);
        current = p?.parent_id;
      }
    }
  }

  const updates = [];
  const params = [];

  if (data.title !== undefined) { updates.push('title = ?'); params.push(data.title); }
  if (data.icon !== undefined) { updates.push('icon = ?'); params.push(data.icon); }
  if (data.coverUrl !== undefined) { updates.push('cover_url = ?'); params.push(data.coverUrl || null); }
  if (data.content !== undefined) { updates.push('content = ?'); params.push(data.content); }
  if (data.properties !== undefined) { updates.push('properties = ?'); params.push(data.properties); }
  if (data.isArchived !== undefined) { updates.push('is_archived = ?'); params.push(data.isArchived ? 1 : 0); }
  if (data.isPublished !== undefined) { updates.push('is_published = ?'); params.push(data.isPublished ? 1 : 0); }
  if (data.parentId !== undefined) { updates.push('parent_id = ?'); params.push(data.parentId || null); }

  if (updates.length > 0) {
    // Create version before updating
    if (data.content !== undefined || data.title !== undefined) {
      db.prepare(`
        INSERT INTO page_versions (id, page_id, content, title, created_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(uuidv4(), page.id, page.content, page.title, req.user.id, new Date().toISOString());
    }

    updates.push('updated_at = ?');
    updates.push('last_edited_by = ?');
    updates.push('last_edited_at = ?');
    params.push(new Date().toISOString());
    params.push(req.user.id);
    params.push(new Date().toISOString());
    params.push(page.id);

    db.prepare(`UPDATE pages SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    // Log activity
    db.prepare(`
      INSERT INTO activities (id, workspace_id, user_id, action, entity_type, entity_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), page.workspace_id, req.user.id, 'updated', 'page', page.id, new Date().toISOString());
  }

  const updatedPage = db.prepare('SELECT * FROM pages WHERE id = ?').get(page.id);
  res.json({ page: updatedPage });
}));

// Delete page
router.delete('/:pageId', asyncHandler(async (req, res) => {
  const db = getDatabase();

  const page = db.prepare('SELECT * FROM pages WHERE id = ?').get(req.params.pageId);
  if (!page) {
    throw new NotFoundError('Page not found');
  }

  const membership = db.prepare('SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?')
    .get(page.workspace_id, req.user.id);

  if (!membership || !['owner', 'admin', 'member'].includes(membership.role)) {
    throw new ForbiddenError('Insufficient permissions');
  }

  // Soft delete - mark as archived
  db.prepare('UPDATE pages SET is_archived = 1, updated_at = ? WHERE id = ?')
    .run(new Date().toISOString(), page.id);

  db.prepare(`
    INSERT INTO activities (id, workspace_id, user_id, action, entity_type, entity_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(uuidv4(), page.workspace_id, req.user.id, 'deleted', 'page', page.id, new Date().toISOString());

  res.json({ message: 'Page archived' });
}));

// Restore page
router.post('/:pageId/restore', asyncHandler(async (req, res) => {
  const db = getDatabase();

  const page = db.prepare('SELECT * FROM pages WHERE id = ?').get(req.params.pageId);
  if (!page) {
    throw new NotFoundError('Page not found');
  }

  if (!page.is_archived) {
    throw new ValidationError('Page is not archived');
  }

  const membership = db.prepare('SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?')
    .get(page.workspace_id, req.user.id);

  if (!membership) {
    throw new ForbiddenError('Not a member of this workspace');
  }

  db.prepare('UPDATE pages SET is_archived = 0, updated_at = ? WHERE id = ?')
    .run(new Date().toISOString(), page.id);

  res.json({ message: 'Page restored' });
}));

// Get page versions
router.get('/:pageId/versions', asyncHandler(async (req, res) => {
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

  const versions = db.prepare(`
    SELECT pv.*, u.username, u.display_name
    FROM page_versions pv
    JOIN users u ON pv.created_by = u.id
    WHERE pv.page_id = ?
    ORDER BY pv.created_at DESC
    LIMIT 50
  `).all(req.params.pageId);

  res.json({ versions });
}));

// Restore version
router.post('/:pageId/versions/:versionId/restore', asyncHandler(async (req, res) => {
  const db = getDatabase();

  const page = db.prepare('SELECT * FROM pages WHERE id = ?').get(req.params.pageId);
  if (!page) {
    throw new NotFoundError('Page not found');
  }

  const version = db.prepare('SELECT * FROM page_versions WHERE id = ? AND page_id = ?')
    .get(req.params.versionId, req.params.pageId);

  if (!version) {
    throw new NotFoundError('Version not found');
  }

  const membership = db.prepare('SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?')
    .get(page.workspace_id, req.user.id);

  if (!membership || !['owner', 'admin', 'member'].includes(membership.role)) {
    throw new ForbiddenError('Insufficient permissions');
  }

  // Create current version before restoring
  db.prepare(`
    INSERT INTO page_versions (id, page_id, content, title, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(uuidv4(), page.id, page.content, page.title, req.user.id, new Date().toISOString());

  // Restore
  db.prepare('UPDATE pages SET content = ?, title = ?, updated_at = ?, last_edited_by = ?, last_edited_at = ? WHERE id = ?')
    .run(version.content, version.title, new Date().toISOString(), req.user.id, new Date().toISOString(), page.id);

  res.json({ message: 'Version restored' });
}));

// Duplicate page
router.post('/:pageId/duplicate', asyncHandler(async (req, res) => {
  const db = getDatabase();

  const page = db.prepare('SELECT * FROM pages WHERE id = ?').get(req.params.pageId);
  if (!page) {
    throw new NotFoundError('Page not found');
  }

  const membership = db.prepare('SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?')
    .get(page.workspace_id, req.user.id);

  if (!membership) {
    throw new ForbiddenError('Not a member of this workspace');
  }

  const newPageId = uuidv4();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO pages (id, workspace_id, parent_id, title, icon, cover_url, content, properties, is_template, created_by, created_at, updated_at, last_edited_by, last_edited_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(newPageId, page.workspace_id, page.parent_id, `${page.title} (copy)`, page.icon, page.cover_url, page.content, page.properties, 0, req.user.id, now, now, req.user.id, now);

  // Copy tags
  const tags = db.prepare('SELECT tag_id FROM page_tags WHERE page_id = ?').all(page.id);
  for (const tag of tags) {
    db.prepare('INSERT OR IGNORE INTO page_tags (page_id, tag_id) VALUES (?, ?)').run(newPageId, tag.tag_id);
  }

  const newPage = db.prepare('SELECT * FROM pages WHERE id = ?').get(newPageId);
  res.status(201).json({ page: newPage });
}));

// Reorder pages
router.post('/reorder', asyncHandler(async (req, res) => {
  const data = reorderPagesSchema.parse(req.body);
  const db = getDatabase();

  // Verify all pages belong to same workspace and user has access
  if (data.pageIds.length > 0) {
    const firstPage = db.prepare('SELECT workspace_id FROM pages WHERE id = ?').get(data.pageIds[0]);
    if (!firstPage) {
      throw new NotFoundError('Page not found');
    }

    const membership = db.prepare('SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?')
      .get(firstPage.workspace_id, req.user.id);

    if (!membership) {
      throw new ForbiddenError('Not a member of this workspace');
    }
  }

  // Update positions
  const stmt = db.prepare('UPDATE pages SET position = ?, updated_at = ? WHERE id = ?');
  const now = new Date().toISOString();

  for (let i = 0; i < data.pageIds.length; i++) {
    stmt.run(i, now, data.pageIds[i]);
  }

  res.json({ message: 'Pages reordered' });
}));

// Publish/Unpublish page
router.post('/:pageId/publish', asyncHandler(async (req, res) => {
  const db = getDatabase();

  const page = db.prepare('SELECT * FROM pages WHERE id = ?').get(req.params.pageId);
  if (!page) {
    throw new NotFoundError('Page not found');
  }

  const membership = db.prepare('SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?')
    .get(page.workspace_id, req.user.id);

  if (!membership || !['owner', 'admin', 'member'].includes(membership.role)) {
    throw new ForbiddenError('Insufficient permissions');
  }

  const publishedUrl = page.is_published
    ? null
    : `wrath-${req.params.pageId.slice(0, 8)}`;

  if (publishedUrl) {
    // Check uniqueness
    const existing = db.prepare('SELECT id FROM pages WHERE published_url = ?').get(publishedUrl);
    if (existing) {
      throw new ValidationError('Published URL conflict, try again');
    }
  }

  db.prepare('UPDATE pages SET is_published = ?, published_url = ?, updated_at = ? WHERE id = ?')
    .run(page.is_published ? 0 : 1, publishedUrl, new Date().toISOString(), page.id);

  res.json({
    message: page.is_published ? 'Page unpublished' : 'Page published',
    publishedUrl: publishedUrl ? `${process.env.FRONTEND_URL}/p/${publishedUrl}` : null
  });
}));

export default router;