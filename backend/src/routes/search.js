import express from 'express';
import { z } from 'zod';
import { getDatabase } from '../db/init.js';
import { asyncHandler, ForbiddenError, ValidationError } from '../middleware/errorHandler.js';

const router = express.Router();

// Search pages
router.get('/', asyncHandler(async (req, res) => {
  const { q, workspaceId, tags, limit = '20', offset = '0' } = req.query;
  const db = getDatabase();

  if (!q || q.trim().length < 2) {
    throw new ValidationError('Query must be at least 2 characters');
  }

  if (!workspaceId) {
    throw new ValidationError('workspaceId query parameter required');
  }

  const membership = db.prepare('SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?')
    .get(workspaceId, req.user.id);

  if (!membership) {
    throw new ForbiddenError('Not a member of this workspace');
  }

  const searchTerm = `%${q.trim()}%`;
  const limitNum = Math.min(parseInt(limit) || 20, 100);
  const offsetNum = parseInt(offset) || 0;

  let tagFilter = '';
  const params = [searchTerm, searchTerm, workspaceId, limitNum, offsetNum];

  if (tags) {
    const tagIds = tags.split(',').filter(Boolean);
    if (tagIds.length > 0) {
      const placeholders = tagIds.map(() => '?').join(',');
      tagFilter = `AND p.id IN (SELECT page_id FROM page_tags WHERE tag_id IN (${placeholders}))`;
      params.splice(3, 0, ...tagIds);
    }
  }

  const query = `
    SELECT p.*, u.username as created_by_username, u.display_name as created_by_display_name,
           w.name as workspace_name,
           (SELECT GROUP_CONCAT(t.name || ':' || t.color) FROM tags t
            JOIN page_tags pt ON t.id = pt.tag_id
            WHERE pt.page_id = p.id) as tags
    FROM pages p
    JOIN workspaces w ON p.workspace_id = w.id
    LEFT JOIN users u ON p.created_by = u.id
    WHERE p.workspace_id = ?
      AND p.is_archived = 0
      AND (p.title LIKE ? OR p.content LIKE ?)
      ${tagFilter}
    ORDER BY
      CASE WHEN p.title LIKE ? THEN 0 ELSE 1 END,
      p.updated_at DESC
    LIMIT ? OFFSET ?
  `;

  // Add title search term again for ordering
  params.splice(3, 0, searchTerm);

  const results = db.prepare(query).all(...params);

  // Parse content for snippet
  const resultsWithSnippet = results.map(page => {
    let snippet = '';
    try {
      const blocks = JSON.parse(page.content || '[]');
      for (const block of blocks) {
        if (block.content?.text && block.content.text.toLowerCase().includes(q.trim().toLowerCase())) {
          snippet = block.content.text.substring(0, 200);
          break;
        }
        if (Array.isArray(block.content?.items)) {
          for (const item of block.content.items) {
            if (item.text && item.text.toLowerCase().includes(q.trim().toLowerCase())) {
              snippet = item.text.substring(0, 200);
              break;
            }
          }
        }
        if (snippet) break;
      }
    } catch {
      // Ignore parse errors
    }

    return {
      ...page,
      tags: page.tags ? page.tags.split(',').map(t => {
        const [name, color] = t.split(':');
        return { name, color };
      }) : [],
      snippet
    };
  });

  // Get total count
  const countQuery = `
    SELECT COUNT(*) as total
    FROM pages p
    WHERE p.workspace_id = ?
      AND p.is_archived = 0
      AND (p.title LIKE ? OR p.content LIKE ?)
      ${tagFilter}
  `;
  const countParams = [workspaceId, searchTerm, searchTerm];
  if (tags) {
    const tagIds = tags.split(',').filter(Boolean);
    countParams.push(...tagIds);
  }

  const { total } = db.prepare(countQuery).get(...countParams);

  res.json({
    results: resultsWithSnippet,
    total,
    limit: limitNum,
    offset: offsetNum
  });
}));

// Quick search (for command palette)
router.get('/quick', asyncHandler(async (req, res) => {
  const { q, workspaceId, limit = '10' } = req.query;
  const db = getDatabase();

  if (!q || q.trim().length < 1) {
    return res.json({ results: [] });
  }

  if (!workspaceId) {
    throw new ValidationError('workspaceId query parameter required');
  }

  const membership = db.prepare('SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?')
    .get(workspaceId, req.user.id);

  if (!membership) {
    throw new ForbiddenError('Not a member of this workspace');
  }

  const searchTerm = `%${q.trim()}%`;
  const limitNum = Math.min(parseInt(limit) || 10, 20);

  const results = db.prepare(`
    SELECT id, title, icon, updated_at, parent_id
    FROM pages
    WHERE workspace_id = ?
      AND is_archived = 0
      AND title LIKE ?
    ORDER BY updated_at DESC
    LIMIT ?
  `).all(workspaceId, searchTerm, limitNum);

  res.json({ results });
}));

// Search in page content (for find in page)
router.get('/page/:pageId', asyncHandler(async (req, res) => {
  const { q } = req.query;
  const db = getDatabase();

  if (!q || q.trim().length < 1) {
    return res.json({ matches: [] });
  }

  const page = db.prepare('SELECT workspace_id, content FROM pages WHERE id = ?').get(req.params.pageId);
  if (!page) {
    throw new NotFoundError('Page not found');
  }

  const membership = db.prepare('SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?')
    .get(page.workspace_id, req.user.id);

  if (!membership) {
    throw new ForbiddenError('Not a member of this workspace');
  }

  try {
    const blocks = JSON.parse(page.content || '[]');
    const matches = [];
    const searchLower = q.trim().toLowerCase();

    function searchBlocks(blocks, parentId = null) {
      for (const block of blocks) {
        let text = '';
        if (block.content?.text) {
          text = block.content.text;
        } else if (Array.isArray(block.content?.items)) {
          text = block.content.items.map(i => i.text || '').join(' ');
        } else if (block.content?.code) {
          text = block.content.code;
        }

        if (text.toLowerCase().includes(searchLower)) {
          // Find all occurrences
          let index = text.toLowerCase().indexOf(searchLower);
          while (index !== -1) {
            const start = Math.max(0, index - 50);
            const end = Math.min(text.length, index + q.length + 50);
            matches.push({
              blockId: block.id,
              blockType: block.type,
              context: text.substring(start, end),
              matchIndex: index
            });
            index = text.toLowerCase().indexOf(searchLower, index + 1);
          }
        }

        if (block.content?.children) {
          searchBlocks(block.content.children, block.id);
        }
      }
    }

    searchBlocks(blocks);
    res.json({ matches: matches.slice(0, 50) });
  } catch {
    res.json({ matches: [] });
  }
}));

export default router;