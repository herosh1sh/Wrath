import express from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import Database from 'better-sqlite3';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken, generateToken, JWT_SECRET } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = express.Router();
const DATA_DIR = join(process.cwd(), 'data');
const dbPath = join(DATA_DIR, 'notion-clone.db');
const db = new Database(dbPath);

const registerSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(8),
  name: z.string().min(1).max(100),
});

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string(),
});

// Register
router.post('/register', async (req, res, next) => {
  try {
    const { username, password, name } = registerSchema.parse(req.body);

    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) {
      throw new AppError('Это имя пользователя уже занято', 409);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    const now = Date.now();

    db.prepare(`
      INSERT INTO users (id, username, password_hash, name, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, username, passwordHash, name, now, now);

    // Create default workspace
    const workspaceId = uuidv4();
    db.prepare(`
      INSERT INTO workspaces (id, name, icon, icon_color, owner_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(workspaceId, `${name}'s Workspace`, '⚔️', '#DC2626', userId, now, now);

    db.prepare(`
      INSERT INTO workspace_members (id, workspace_id, user_id, role, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(uuidv4(), workspaceId, userId, 'owner', now);

    const token = generateToken(userId);

    res.status(201).json({
      user: { id: userId, username, name },
      token,
      workspace: { id: workspaceId, name: `${name}'s Workspace` },
    });
  } catch (err) {
    next(err);
  }
});

// Login
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = loginSchema.parse(req.body);

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user) {
      throw new AppError('Неверное имя пользователя или пароль', 401);
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      throw new AppError('Неверное имя пользователя или пароль', 401);
    }

    const token = generateToken(user.id);

    res.json({
      user: { id: user.id, username: user.username, name: user.name, avatar_url: user.avatar_url },
      token,
    });
  } catch (err) {
    next(err);
  }
});

// Get current user
router.get('/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// Refresh token
router.post('/refresh', authenticateToken, (req, res) => {
  const token = generateToken(req.user.id);
  res.json({ token });
});

// Update profile
router.patch('/profile', authenticateToken, (req, res, next) => {
  try {
    const schema = z.object({
      name: z.string().min(1).max(100).optional(),
      avatar_url: z.string().url().optional().nullable(),
    });
    const data = schema.parse(req.body);

    const updates = [];
    const params = [];
    if (data.name !== undefined) {
      updates.push('name = ?');
      params.push(data.name);
    }
    if (data.avatar_url !== undefined) {
      updates.push('avatar_url = ?');
      params.push(data.avatar_url);
    }
    if (updates.length === 0) {
      return res.json({ user: req.user });
    }

    updates.push('updated_at = ?');
    params.push(Date.now());
    params.push(req.user.id);

    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    const user = db.prepare('SELECT id, username, name, avatar_url FROM users WHERE id = ?').get(req.user.id);
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

// Change password
router.post('/change-password', authenticateToken, async (req, res, next) => {
  try {
    const schema = z.object({
      currentPassword: z.string(),
      newPassword: z.string().min(8),
    });
    const { currentPassword, newPassword } = schema.parse(req.body);

    const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) {
      throw new AppError('Текущий пароль неверен', 401);
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?')
      .run(newHash, Date.now(), req.user.id);

    res.json({ message: 'Пароль успешно обновлён' });
  } catch (err) {
    next(err);
  }
});

export default router;