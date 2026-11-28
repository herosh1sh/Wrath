import jwt from 'jsonwebtoken';
import { getDatabase } from '../db/init.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

export async function authMiddleware(req, res, next) {
  try {
    // Try to get token from cookie first, then Authorization header
    let token = req.cookies?.token;

    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.substring(7);
    }

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Check if session exists and not revoked
    const db = getDatabase();
    const session = db.prepare('SELECT id FROM sessions WHERE user_id = ? AND token_hash = ? AND expires_at > datetime("now")')
      .get(decoded.id, hashToken(token));

    if (!session) {
      return res.status(401).json({ error: 'Session expired or revoked' });
    }

    // Get user
    const user = db.prepare('SELECT id, username, email, display_name, avatar_url FROM users WHERE id = ?').get(decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Authentication error' });
  }
}

export function optionalAuth(req, res, next) {
  try {
    let token = req.cookies?.token;
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.substring(7);
    }

    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        const db = getDatabase();
        const session = db.prepare('SELECT id FROM sessions WHERE user_id = ? AND token_hash = ? AND expires_at > datetime("now")')
          .get(decoded.id, hashToken(token));

        if (session) {
          const user = db.prepare('SELECT id, username, email, display_name, avatar_url FROM users WHERE id = ?').get(decoded.id);
          if (user) {
            req.user = user;
            req.token = token;
          }
        }
      }
    }
    next();
  } catch (error) {
    // Ignore errors for optional auth
    next();
  }
}

export function requireWorkspaceAccess(requiredRole = 'member') {
  return async (req, res, next) => {
    try {
      const workspaceId = req.params.workspaceId || req.body.workspace_id || req.query.workspace_id;

      if (!workspaceId) {
        return res.status(400).json({ error: 'Workspace ID required' });
      }

      const db = getDatabase();
      const membership = db.prepare(`
        SELECT role FROM workspace_members
        WHERE workspace_id = ? AND user_id = ?
      `).get(workspaceId, req.user.id);

      if (!membership) {
        return res.status(403).json({ error: 'Not a member of this workspace' });
      }

      const roleHierarchy = { viewer: 1, member: 2, admin: 3, owner: 4 };
      const userRoleLevel = roleHierarchy[membership.role] || 0;
      const requiredLevel = roleHierarchy[requiredRole] || 0;

      if (userRoleLevel < requiredLevel) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      req.workspaceRole = membership.role;
      req.workspaceId = workspaceId;
      next();
    } catch (error) {
      console.error('Workspace access check error:', error);
      return res.status(500).json({ error: 'Access check failed' });
    }
  };
}

function hashToken(token) {
  // Simple hash for token storage (in production, use crypto.createHash)
  let hash = 0;
  for (let i = 0; i < token.length; i++) {
    const char = token.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

export function createSession(userId, token) {
  const db = getDatabase();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days
  const sessionId = crypto.randomUUID();

  db.prepare(`
    INSERT INTO sessions (id, user_id, token_hash, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(sessionId, userId, hashToken(token), expiresAt);

  return sessionId;
}

export function revokeSession(userId, token) {
  const db = getDatabase();
  db.prepare('DELETE FROM sessions WHERE user_id = ? AND token_hash = ?')
    .run(userId, hashToken(token));
}

export function revokeAllSessions(userId) {
  const db = getDatabase();
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
}

export function cleanExpiredSessions() {
  const db = getDatabase();
  db.prepare('DELETE FROM sessions WHERE expires_at < datetime("now")').run();
}