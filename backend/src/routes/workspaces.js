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

// Get user's workspaces
router.get('/', (req, res) => {
  const workspaces = db.prepare(`
    SELECT w.*, wm.role
    FROM workspaces w
    JOIN workspace_members wm ON w.id = wm.workspace_id
    WHERE wm.user_id = ?
    ORDER BY w.updated_at DESC
  `).all(req.user.id);

  res.json({ workspaces });
});

// Get single workspace
router.get('/:id', (req, res, next) => {
  try {
    const workspace = db.prepare(`
      SELECT w.*, wm.role
      FROM workspaces w
      JOIN workspace_members wm ON w.id = wm.workspace_id
      WHERE w.id = ? AND wm.user_id = ?
    `).get(req.params.id, req.user.id);

    if (!workspace) {
      throw new AppError('Workspace not found', 404);
    }

    // Get member count
    const memberCount = db.prepare('SELECT COUNT(*) as count FROM workspace_members WHERE workspace_id = ?')
      .get(req.params.id);

    res.json({ workspace: { ...workspace, memberCount: memberCount.count } });
  } catch (err) {
    next(err);
  }
});

// Create workspace
router.post('/', (req, res, next) => {
  try {
    const schema = z.object({
      name: z.string().min(1).max(100),
      icon: z.string().max(10).optional(),
      iconColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    });
    const { name, icon = '📝', iconColor = '#0891B2' } = schema.parse(req.body);

    const workspaceId = uuidv4();
    const now = Date.now();

    db.prepare(`
      INSERT INTO workspaces (id, name, icon, icon_color, owner_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(workspaceId, name, icon, iconColor, req.user.id, now, now);

    db.prepare(`
      INSERT INTO workspace_members (id, workspace_id, user_id, role, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(uuidv4(), workspaceId, req.user.id, 'owner', now);

    const workspace = db.prepare('SELECT * FROM workspaces WHERE id = ?').get(workspaceId);
    res.status(201).json({ workspace });
  } catch (err) {
    next(err);
  }
});

// Update workspace
router.patch('/:id', (req, res, next) => {
  try {
    const schema = z.object({
      name: z.string().min(1).max(100).optional(),
      icon: z.string().max(10).optional(),
      iconColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    });
    const data = schema.parse(req.body);

    // Check ownership
    const membership = db.prepare('SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?')
      .get(req.params.id, req.user.id);

    if (!membership || membership.role !== 'owner') {
      throw new AppError('Only workspace owner can update', 403);
    }

    const updates = [];
    const params = [];
    if (data.name !== undefined) {
      updates.push('name = ?');
      params.push(data.name);
    }
    if (data.icon !== undefined) {
      updates.push('icon = ?');
      params.push(data.icon);
    }
    if (data.iconColor !== undefined) {
      updates.push('icon_color = ?');
      params.push(data.iconColor);
    }
    if (updates.length === 0) {
      const workspace = db.prepare('SELECT * FROM workspaces WHERE id = ?').get(req.params.id);
      return res.json({ workspace });
    }

    updates.push('updated_at = ?');
    params.push(Date.now());
    params.push(req.params.id);

    db.prepare(`UPDATE workspaces SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    const workspace = db.prepare('SELECT * FROM workspaces WHERE id = ?').get(req.params.id);
    res.json({ workspace });
  } catch (err) {
    next(err);
  }
});

// Delete workspace
router.delete('/:id', (req, res, next) => {
  try {
    // Check ownership
    const membership = db.prepare('SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?')
      .get(req.params.id, req.user.id);

    if (!membership || membership.role !== 'owner') {
      throw new AppError('Only workspace owner can delete', 403);
    }

    db.prepare('DELETE FROM workspaces WHERE id = ?').run(req.params.id);
    res.json({ message: 'Workspace deleted' });
  } catch (err) {
    next(err);
  }
});

// Get workspace members
router.get('/:id/members', (req, res, next) => {
  try {
    const members = db.prepare(`
      SELECT wm.*, u.email, u.name, u.avatar_url
      FROM workspace_members wm
      JOIN users u ON wm.user_id = u.id
      WHERE wm.workspace_id = ?
      ORDER BY wm.created_at
    `).all(req.params.id);

    res.json({ members });
  } catch (err) {
    next(err);
  }
});

// Invite member
router.post('/:id/members', (req, res, next) => {
  try {
    const schema = z.object({
      email: z.string().email(),
      role: z.enum(['admin', 'member']).default('member'),
    });
    const { email, role } = schema.parse(req.body);

    // Check permission
    const membership = db.prepare('SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?')
      .get(req.params.id, req.user.id);

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      throw new AppError('Insufficient permissions', 403);
    }

    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Check if already member
    const existing = db.prepare('SELECT id FROM workspace_members WHERE workspace_id = ? AND user_id = ?')
      .get(req.params.id, user.id);

    if (existing) {
      throw new AppError('User is already a member', 409);
    }

    db.prepare(`
      INSERT INTO workspace_members (id, workspace_id, user_id, role, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(uuidv4(), req.params.id, user.id, role, Date.now());

    const member = db.prepare(`
      SELECT wm.*, u.email, u.name, u.avatar_url
      FROM workspace_members wm
      JOIN users u ON wm.user_id = u.id
      WHERE wm.workspace_id = ? AND wm.user_id = ?
    `).get(req.params.id, user.id);

    res.status(201).json({ member });
  } catch (err) {
    next(err);
  }
});

// Update member role
router.patch('/:id/members/:userId', (req, res, next) => {
  try {
    const schema = z.object({
      role: z.enum(['admin', 'member']),
    });
    const { role } = schema.parse(req.body);

    // Check permission
    const membership = db.prepare('SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?')
      .get(req.params.id, req.user.id);

    if (!membership || membership.role !== 'owner') {
      throw new AppError('Only workspace owner can change roles', 403);
    }

    // Can't change owner's role
    const targetMembership = db.prepare('SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?')
      .get(req.params.id, req.params.userId);

    if (!targetMembership) {
      throw new AppError('Member not found', 404);
    }

    if (targetMembership.role === 'owner') {
      throw new AppError('Cannot change owner role', 400);
    }

    db.prepare('UPDATE workspace_members SET role = ? WHERE workspace_id = ? AND user_id = ?')
      .run(role, req.params.id, req.params.userId);

    const member = db.prepare(`
      SELECT wm.*, u.email, u.name, u.avatar_url
      FROM workspace_members wm
      JOIN users u ON wm.user_id = u.id
      WHERE wm.workspace_id = ? AND wm.user_id = ?
    `).get(req.params.id, req.params.userId);

    res.json({ member });
  } catch (err) {
    next(err);
  }
});

// Remove member
router.delete('/:id/members/:userId', (req, res, next) => {
  try {
    // Check permission
    const membership = db.prepare('SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?')
      .get(req.params.id, req.user.id);

    const targetMembership = db.prepare('SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?')
      .get(req.params.id, req.params.userId);

    if (!targetMembership) {
      throw new AppError('Member not found', 404);
    }

    // Can't remove owner
    if (targetMembership.role === 'owner') {
      throw new AppError('Cannot remove workspace owner', 400);
    }

    // Only owner/admin can remove, or user can remove themselves
    const canRemove = membership.role === 'owner' ||
      (membership.role === 'admin' && targetMembership.role === 'member') ||
      req.user.id === req.params.userId;

    if (!canRemove) {
      throw new AppError('Insufficient permissions', 403);
    }

    db.prepare('DELETE FROM workspace_members WHERE workspace_id = ? AND user_id = ?')
      .run(req.params.id, req.params.userId);

    res.json({ message: 'Member removed' });
  } catch (err) {
    next(err);
  }
});

export default router;