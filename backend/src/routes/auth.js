import express from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { getDatabase } from '../db/init.js';
import { generateToken, createSession, revokeSession, revokeAllSessions } from '../middleware/auth.js';
import { asyncHandler, ValidationError, UnauthorizedError, ConflictError } from '../middleware/errorHandler.js';

const router = express.Router();

// Validation schemas
const registerSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_-]+$/),
  email: z.string().email().optional().or(z.literal('')),
  password: z.string().min(8).max(100),
  displayName: z.string().max(50).optional()
});

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(100)
});

// Register
router.post('/register', asyncHandler(async (req, res) => {
  const data = registerSchema.parse(req.body);
  const db = getDatabase();

  // Check if username exists
  const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(data.username);
  if (existingUser) {
    throw new ConflictError('Username already taken');
  }

  // Check if email exists (if provided)
  if (data.email) {
    const existingEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(data.email);
    if (existingEmail) {
      throw new ConflictError('Email already registered');
    }
  }

  const userId = uuidv4();
  const passwordHash = await bcrypt.hash(data.password, 10);
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO users (id, username, email, password_hash, display_name, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(userId, data.username, data.email || null, passwordHash, data.displayName || data.username, now);

  // Create personal workspace
  const workspaceId = uuidv4();
  db.prepare(`
    INSERT INTO workspaces (id, name, description, icon, owner_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(workspaceId, `${data.username}'s Workspace`, 'Personal workspace', '🏠', userId, now);

  db.prepare(`
    INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(uuidv4(), workspaceId, userId, 'owner', now);

  // Generate token and create session
  const user = { id: userId, username: data.username };
  const token = generateToken(user);
  createSession(userId, token);

  // Set cookie
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  res.status(201).json({
    user: {
      id: userId,
      username: data.username,
      email: data.email || null,
      displayName: data.displayName || data.username
    },
    token
  });
}));

// Login
router.post('/login', asyncHandler(async (req, res) => {
  const data = loginSchema.parse(req.body);
  const db = getDatabase();

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(data.username);

  if (!user) {
    throw new UnauthorizedError('Invalid username or password');
  }

  const validPassword = await bcrypt.compare(data.password, user.password_hash);
  if (!validPassword) {
    throw new UnauthorizedError('Invalid username or password');
  }

  // Update last login
  db.prepare('UPDATE users SET last_login = ? WHERE id = ?').run(new Date().toISOString(), user.id);

  const token = generateToken({ id: user.id, username: user.username });
  createSession(user.id, token);

  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  res.json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.display_name,
      avatarUrl: user.avatar_url
    },
    token
  });
}));

// Logout
router.post('/logout', asyncHandler(async (req, res) => {
  if (req.token) {
    revokeSession(req.user.id, req.token);
  }

  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  });

  res.json({ message: 'Logged out successfully' });
}));

// Logout all sessions
router.post('/logout-all', asyncHandler(async (req, res) => {
  revokeAllSessions(req.user.id);

  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  });

  res.json({ message: 'Logged out from all sessions' });
}));

// Get current user
router.get('/me', asyncHandler(async (req, res) => {
  const db = getDatabase();
  const user = db.prepare('SELECT id, username, email, display_name, avatar_url, created_at FROM users WHERE id = ?').get(req.user.id);

  if (!user) {
    throw new UnauthorizedError('User not found');
  }

  res.json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
      createdAt: user.created_at
    }
  });
}));

// Change password
router.post('/change-password', asyncHandler(async (req, res) => {
  const data = changePasswordSchema.parse(req.body);
  const db = getDatabase();

  const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
  const validPassword = await bcrypt.compare(data.currentPassword, user.password_hash);

  if (!validPassword) {
    throw new UnauthorizedError('Current password is incorrect');
  }

  const newPasswordHash = await bcrypt.hash(data.newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?')
    .run(newPasswordHash, new Date().toISOString(), req.user.id);

  // Revoke all other sessions
  revokeAllSessions(req.user.id);

  // Create new session with current token
  createSession(req.user.id, req.token);

  res.json({ message: 'Password changed successfully' });
}));

// Update profile
const updateProfileSchema = z.object({
  displayName: z.string().max(50).optional(),
  email: z.string().email().optional().or(z.literal(''))
});

router.patch('/profile', asyncHandler(async (req, res) => {
  const data = updateProfileSchema.parse(req.body);
  const db = getDatabase();

  const updates = [];
  const params = [];

  if (data.displayName !== undefined) {
    updates.push('display_name = ?');
    params.push(data.displayName);
  }
  if (data.email !== undefined) {
    // Check if email is taken
    if (data.email) {
      const existing = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(data.email, req.user.id);
      if (existing) {
        throw new ConflictError('Email already in use');
      }
    }
    updates.push('email = ?');
    params.push(data.email || null);
  }

  if (updates.length > 0) {
    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(req.user.id);

    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }

  const user = db.prepare('SELECT id, username, email, display_name, avatar_url FROM users WHERE id = ?').get(req.user.id);
  res.json({ user });
}));

export default router;