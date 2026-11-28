import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { getDatabase } from '../db/init.js';
import { asyncHandler, NotFoundError, ForbiddenError, ValidationError } from '../middleware/errorHandler.js';

const router = express.Router();

const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  icon: z.string().max(10).optional()
});

const updateWorkspaceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  icon: z.string().max(10).optional(),
  coverUrl: z.string().url().optional().or(z.literal(''))
});

const inviteMemberSchema = z.object({
  username: z.string().min(3).max(30),
  role: z.enum(['viewer', 'member', 'admin']).default('member')
});

const updateMemberSchema = z.object({
  role: z.enum(['viewer', 'member', 'admin'])
});

// Get all workspaces for current user
router.get('/', asyncHandler(async (req, res) => {
  const db = getDatabase();

  const workspaces = db.prepare(`
    SELECT w.*, wm.role,
           (SELECT COUNT(*) FROM workspace_members WHERE workspace_id = w.id) as member_count
    FROM workspaces w
    JOIN workspace_members wm ON w.id = wm.workspace_id
    WHERE wm.user_id = ?
    ORDER BY w.updated_at DESC
  `).all(req.user.id);

  res.json({ workspaces });
}));

// Create workspace
router.post('/', asyncHandler(async (req, res) => {
  const data = createWorkspaceSchema.parse(req.body);
  const db = getDatabase();

  const workspaceId = uuidv4();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO workspaces (id, name, description, icon, owner_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(workspaceId, data.name, data.description || '', data.icon || '📁', req.user.id, now, now);

  db.prepare(`
    INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(uuidv4(), workspaceId, req.user.id, 'owner', now);

  // Create default "Getting Started" page
  const pageId = uuidv4();
  const content = JSON.stringify([
    { id: uuidv4(), type: 'heading1', content: { text: `Welcome to ${data.name}` } },
    { id: uuidv4(), type: 'paragraph', content: { text: 'Start organizing your thoughts and projects here.' } }
  ]);

  db.prepare(`
    INSERT INTO pages (id, workspace_id, title, content, icon, created_by, created_at, updated_at, last_edited_by, last_edited_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(pageId, workspaceId, 'Getting Started', content, '📝', req.user.id, now, now, req.user.id, now);

  const workspace = db.prepare('SELECT * FROM workspaces WHERE id = ?').get(workspaceId);
  res.status(201).json({ workspace });
}));

// Get workspace details
router.get('/:workspaceId', asyncHandler(async (req, res) => {
  const db = getDatabase();

  const workspace = db.prepare(`
    SELECT w.*, u.username as owner_username, u.display_name as owner_display_name
    FROM workspaces w
    JOIN users u ON w.owner_id = u.id
    WHERE w.id = ?
  `).get(req.params.workspaceId);

  if (!workspace) {
    throw new NotFoundError('Workspace not found');
  }

  // Check membership
  const membership = db.prepare('SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?')
    .get(req.params.workspaceId, req.user.id);

  if (!membership) {
    throw new ForbiddenError('Not a member of this workspace');
  }

  const members = db.prepare(`
    SELECT wm.*, u.username, u.display_name, u.avatar_url, u.email
    FROM workspace_members wm
    JOIN users u ON wm.user_id = u.id
    WHERE wm.workspace_id = ?
    ORDER BY wm.joined_at
  `).all(req.params.workspaceId);

  res.json({ workspace: { ...workspace, role: membership.role }, members });
}));

// Update workspace
router.patch('/:workspaceId', asyncHandler(async (req, res) => {
  const data = updateWorkspaceSchema.parse(req.body);
  const db = getDatabase();

  const membership = db.prepare('SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?')
    .get(req.params.workspaceId, req.user.id);

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    throw new ForbiddenError('Insufficient permissions');
  }

  const updates = [];
  const params = [];

  if (data.name !== undefined) { updates.push('name = ?'); params.push(data.name); }
  if (data.description !== undefined) { updates.push('description = ?'); params.push(data.description); }
  if (data.icon !== undefined) { updates.push('icon = ?'); params.push(data.icon); }
  if (data.coverUrl !== undefined) { updates.push('cover_url = ?'); params.push(data.coverUrl || null); }

  if (updates.length > 0) {
    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(req.params.workspaceId);

    db.prepare(`UPDATE workspaces SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }

  const workspace = db.prepare('SELECT * FROM workspaces WHERE id = ?').get(req.params.workspaceId);
  res.json({ workspace });
}));

// Delete workspace
router.delete('/:workspaceId', asyncHandler(async (req, res) => {
  const db = getDatabase();

  const workspace = db.prepare('SELECT owner_id FROM workspaces WHERE id = ?').get(req.params.workspaceId);
  if (!workspace) {
    throw new NotFoundError('Workspace not found');
  }

  if (workspace.owner_id !== req.user.id) {
    throw new ForbiddenError('Only the owner can delete the workspace');
  }

  db.prepare('DELETE FROM workspaces WHERE id = ?').run(req.params.workspaceId);
  res.json({ message: 'Workspace deleted' });
}));

// Invite member
router.post('/:workspaceId/members', asyncHandler(async (req, res) => {
  const data = inviteMemberSchema.parse(req.body);
  const db = getDatabase();

  const membership = db.prepare('SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?')
    .get(req.params.workspaceId, req.user.id);

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    throw new ForbiddenError('Insufficient permissions');
  }

  const user = db.prepare('SELECT id FROM users WHERE username = ?').get(data.username);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  const existing = db.prepare('SELECT id FROM workspace_members WHERE workspace_id = ? AND user_id = ?')
    .get(req.params.workspaceId, user.id);

  if (existing) {
    throw new ValidationError('User is already a member');
  }

  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(uuidv4(), req.params.workspaceId, user.id, data.role, now);

  const member = db.prepare(`
    SELECT wm.*, u.username, u.display_name, u.avatar_url, u.email
    FROM workspace_members wm
    JOIN users u ON wm.user_id = u.id
    WHERE wm.workspace_id = ? AND wm.user_id = ?
  `).get(req.params.workspaceId, user.id);

  res.status(201).json({ member });
}));

// Update member role
router.patch('/:workspaceId/members/:userId', asyncHandler(async (req, res) => {
  const data = updateMemberSchema.parse(req.body);
  const db = getDatabase();

  const membership = db.prepare('SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?')
    .get(req.params.workspaceId, req.user.id);

  if (!membership || membership.role !== 'owner') {
    throw new ForbiddenError('Only owner can change roles');
  }

  const targetMember = db.prepare('SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?')
    .get(req.params.workspaceId, req.params.userId);

  if (!targetMember) {
    throw new NotFoundError('Member not found');
  }

  if (targetMember.role === 'owner') {
    throw new ForbiddenError('Cannot change owner role');
  }

  db.prepare('UPDATE workspace_members SET role = ? WHERE workspace_id = ? AND user_id = ?')
    .run(data.role, req.params.workspaceId, req.params.userId);

  const member = db.prepare(`
    SELECT wm.*, u.username, u.display_name, u.avatar_url, u.email
    FROM workspace_members wm
    JOIN users u ON wm.user_id = u.id
    WHERE wm.workspace_id = ? AND wm.user_id = ?
  `).get(req.params.workspaceId, req.params.userId);

  res.json({ member });
}));

// Remove member
router.delete('/:workspaceId/members/:userId', asyncHandler(async (req, res) => {
  const db = getDatabase();

  const membership = db.prepare('SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?')
    .get(req.params.workspaceId, req.user.id);

  const targetMember = db.prepare('SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?')
    .get(req.params.workspaceId, req.params.userId);

  if (!targetMember) {
    throw new NotFoundError('Member not found');
  }

  // Users can remove themselves, owners/admins can remove others
  const isSelf = req.params.userId === req.user.id;
  const canManage = membership && ['owner', 'admin'].includes(membership.role);

  if (!isSelf && !canManage) {
    throw new ForbiddenError('Insufficient permissions');
  }

  if (targetMember.role === 'owner') {
    throw new ForbiddenError('Cannot remove owner');
  }

  db.prepare('DELETE FROM workspace_members WHERE workspace_id = ? AND user_id = ?')
    .run(req.params.workspaceId, req.params.userId);

  res.json({ message: 'Member removed' });
}));

// Leave workspace
router.post('/:workspaceId/leave', asyncHandler(async (req, res) => {
  const db = getDatabase();

  const membership = db.prepare('SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?')
    .get(req.params.workspaceId, req.user.id);

  if (!membership) {
    throw new NotFoundError('Not a member of this workspace');
  }

  if (membership.role === 'owner') {
    throw new ForbiddenError('Owner cannot leave. Transfer ownership or delete workspace.');
  }

  db.prepare('DELETE FROM workspace_members WHERE workspace_id = ? AND user_id = ?')
    .run(req.params.workspaceId, req.user.id);

  res.json({ message: 'Left workspace' });
}));

export default router;